import { createServerClient } from '@/src/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import type { Store, AutoPaymentConfig, AutoPaymentProvider } from '@/src/context/StoreContext';

type Channel = 'qris' | 'ewallet' | 'virtualAccount' | 'card';

interface CreatePaymentBody {
  storeId: string;
  provider: AutoPaymentProvider;
  channel: Channel;
  orderId: string;
  amount: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
}

interface AutoPaymentResult {
  type: 'qris' | 'va' | 'redirect';
  qrImageUrl?: string;
  qrString?: string;
  bankCode?: string;
  accountNumber?: string;
  redirectUrl?: string;
  // True when generated with a sandbox/test API key — QR codes and VA numbers
  // in this mode are dummy data and cannot be paid via a real banking app.
  sandbox?: boolean;
}

// Payment gateways sit behind Cloudflare/edge infra that occasionally resets
// a connection mid-request (transient network blip, not an API error) — retry
// once on network-level failures only. HTTP error responses (4xx/5xx) are
// real API errors and are returned as-is, not retried.
async function fetchWithRetry(url: string, init: RequestInit, retries = 1): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise(r => setTimeout(r, 300));
    return fetchWithRetry(url, init, retries - 1);
  }
}

// Gateways return the useful detail in different shapes — pull out whatever
// field-level info is present so failures are actually diagnosable instead of
// just "Failed to validate the request, N errors occurred."
function extractGatewayErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const d = data as Record<string, unknown>;
  const base = typeof d.message === 'string' ? d.message : (typeof d.status_message === 'string' ? d.status_message : fallback);
  const errors = d.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const details = errors.map(e => {
      if (typeof e === 'string') return e;
      if (e && typeof e === 'object') {
        const eo = e as Record<string, unknown>;
        const path = Array.isArray(eo.path) ? eo.path.join('.') : eo.path;
        const msg = eo.message ?? JSON.stringify(eo);
        return path ? `${path}: ${msg}` : String(msg);
      }
      return String(e);
    }).join('; ');
    return `${base} (${details})`;
  }
  if (typeof d.error_code === 'string' && base === fallback) return `${base} [${d.error_code}]`;
  return base;
}

// Xendit and Midtrans settle exclusively in IDR (Indonesian domestic rails —
// QRIS and Virtual Account in particular). A store priced in another
// currency still needs to charge the right rupiah amount, so convert using a
// live rate; if the rate lookup fails, fall back to a fixed approximate rate
// rather than blocking the payment entirely.
const FALLBACK_IDR_RATES: Record<string, number> = {
  USD: 16300, EUR: 17700, GBP: 20700, JPY: 108, SGD: 12100, IDR: 1,
};

async function convertToIDR(amount: number, fromCurrency?: string): Promise<number> {
  const cur = (fromCurrency || 'IDR').toUpperCase();
  if (cur === 'IDR') return Math.round(amount);
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${cur}`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.IDR;
      if (typeof rate === 'number' && rate > 0) return Math.round(amount * rate);
    }
  } catch (err) {
    console.warn('[auto-payment] FX rate lookup failed, using fallback rate:', err);
  }
  const fallback = FALLBACK_IDR_RATES[cur] ?? FALLBACK_IDR_RATES.USD;
  return Math.round(amount * fallback);
}

// Looks up a store's autoPayment credentials server-side (never sent to the
// client) by checking the logged-in-user `stores` table first, then the
// `guest_stores` table (stores created without an account).
async function fetchAutoPaymentConfig(storeId: string): Promise<AutoPaymentConfig | null> {
  const supabase = createServerClient();

  const { data: storeRow } = await supabase
    .from('stores')
    .select('payment_settings')
    .eq('id', storeId)
    .maybeSingle();
  if (storeRow?.payment_settings?.autoPayment) return storeRow.payment_settings.autoPayment;

  const { data: guestRow } = await supabase
    .from('guest_stores')
    .select('store_data')
    .eq('store_data->>id', storeId)
    .maybeSingle();
  const guestStore = guestRow?.store_data as Store | undefined;
  return guestStore?.paymentSettings?.autoPayment ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CreatePaymentBody;
    const { storeId, provider, channel, orderId, amount, currency, customerName, customerEmail } = body;

    if (!storeId || !provider || !channel || !orderId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const autoPayment = await fetchAutoPaymentConfig(storeId);
    if (!autoPayment?.enabled || autoPayment.provider !== provider) {
      return NextResponse.json({ error: 'Auto payment is not configured for this store' }, { status: 400 });
    }

    let result: AutoPaymentResult;
    if (provider === 'xendit') {
      const amountIDR = await convertToIDR(amount, currency);
      result = await createXenditPayment(autoPayment, channel, orderId, amountIDR, customerName, customerEmail);
    } else if (provider === 'midtrans') {
      const amountIDR = await convertToIDR(amount, currency);
      result = await createMidtransPayment(autoPayment, channel, orderId, amountIDR, customerName, customerEmail);
    } else if (provider === 'stripe') {
      result = await createStripePayment(autoPayment, orderId, amount, currency, customerEmail);
    } else {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[auto-payment/create] Exception:', error);
    const message = error instanceof Error ? error.message : 'Failed to create payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Xendit ───────────────────────────────────────────────────────────────────
async function createXenditPayment(
  config: AutoPaymentConfig, channel: Channel, orderId: string, amount: number,
  customerName?: string, customerEmail?: string
): Promise<AutoPaymentResult> {
  const apiKey = config.xendit?.apiKey;
  if (!apiKey) throw new Error('Xendit API key is not configured');
  const auth = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
  const amountInt = Math.round(amount); // IDR has no minor unit — Xendit rejects non-integer amounts
  const sandbox = config.xendit?.environment !== 'production';

  if (channel === 'qris') {
    // The api-version header opts into the v2 QR Codes schema (reference_id/
    // currency). Without it, Xendit validates against the legacy v1 schema
    // (external_id/callback_url) and rejects these v2-shaped fields.
    const res = await fetchWithRetry('https://api.xendit.co/qr_codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth, 'api-version': '2022-07-31' },
      body: JSON.stringify({ reference_id: orderId, type: 'DYNAMIC', currency: 'IDR', amount: amountInt }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[auto-payment/xendit] QRIS error:', JSON.stringify(data));
      throw new Error(extractGatewayErrorMessage(data, 'Xendit QRIS request failed'));
    }
    return { type: 'qris', qrString: data.qr_string, sandbox };
  }

  if (channel === 'virtualAccount') {
    const res = await fetchWithRetry('https://api.xendit.co/callback_virtual_accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({
        external_id: orderId,
        bank_code: 'BCA',
        name: customerName || 'Customer',
        expected_amount: amountInt,
        is_closed: true,
        is_single_use: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[auto-payment/xendit] VA error:', JSON.stringify(data));
      throw new Error(extractGatewayErrorMessage(data, 'Xendit Virtual Account request failed'));
    }
    return { type: 'va', bankCode: data.bank_code, accountNumber: data.account_number, sandbox };
  }

  // ewallet & card: use Xendit's hosted Invoice page, which itself presents
  // whichever payment methods are enabled on the merchant's Xendit dashboard.
  const res = await fetchWithRetry('https://api.xendit.co/v2/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({
      external_id: orderId,
      amount: amountInt,
      currency: 'IDR',
      customer: { given_names: customerName || 'Customer', email: customerEmail || undefined },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[auto-payment/xendit] Invoice error:', JSON.stringify(data));
    throw new Error(extractGatewayErrorMessage(data, 'Xendit Invoice request failed'));
  }
  return { type: 'redirect', redirectUrl: data.invoice_url, sandbox };
}

// ── Midtrans ─────────────────────────────────────────────────────────────────
async function createMidtransPayment(
  config: AutoPaymentConfig, channel: Channel, orderId: string, amount: number,
  customerName?: string, customerEmail?: string
): Promise<AutoPaymentResult> {
  const serverKey = config.midtrans?.serverKey;
  if (!serverKey) throw new Error('Midtrans server key is not configured');
  const env = config.midtrans?.environment === 'production' ? '' : 'sandbox.';
  const auth = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
  const grossAmount = Math.round(amount);
  const sandbox = config.midtrans?.environment !== 'production';

  if (channel === 'qris') {
    const res = await fetchWithRetry(`https://api.${env}midtrans.com/v2/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({
        payment_type: 'qris',
        transaction_details: { order_id: orderId, gross_amount: grossAmount },
        qris: { acquirer: 'gopay' },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[auto-payment/midtrans] QRIS error:', JSON.stringify(data));
      throw new Error(extractGatewayErrorMessage(data, 'Midtrans QRIS request failed'));
    }
    const qrAction = (data.actions as { name: string; url: string }[] | undefined)?.find(a => a.name === 'generate-qr-code');
    return { type: 'qris', qrImageUrl: qrAction?.url, sandbox };
  }

  if (channel === 'virtualAccount') {
    const res = await fetchWithRetry(`https://api.${env}midtrans.com/v2/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({
        payment_type: 'bank_transfer',
        transaction_details: { order_id: orderId, gross_amount: grossAmount },
        bank_transfer: { bank: 'bca' },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[auto-payment/midtrans] VA error:', JSON.stringify(data));
      throw new Error(extractGatewayErrorMessage(data, 'Midtrans Virtual Account request failed'));
    }
    const va = (data.va_numbers as { bank: string; va_number: string }[] | undefined)?.[0];
    return { type: 'va', bankCode: va?.bank?.toUpperCase(), accountNumber: va?.va_number, sandbox };
  }

  // ewallet & card: Snap hosted redirect page
  const enabledPayments = channel === 'card' ? ['credit_card'] : ['gopay', 'shopeepay'];
  const res = await fetchWithRetry(`https://app.${env}midtrans.com/snap/v1/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: grossAmount },
      customer_details: { first_name: customerName || 'Customer', email: customerEmail || undefined },
      enabled_payments: enabledPayments,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[auto-payment/midtrans] Snap error:', JSON.stringify(data));
    throw new Error(extractGatewayErrorMessage(data, 'Midtrans Snap request failed'));
  }
  return { type: 'redirect', redirectUrl: data.redirect_url, sandbox };
}

// ── Stripe ───────────────────────────────────────────────────────────────────
async function createStripePayment(
  config: AutoPaymentConfig, orderId: string, amount: number, currency?: string, customerEmail?: string
): Promise<AutoPaymentResult> {
  const secretKey = config.stripe?.secretKey;
  if (!secretKey) throw new Error('Stripe secret key is not configured');
  const sandbox = !secretKey.startsWith('sk_live_');

  // Stripe expects the smallest currency unit (e.g. cents); IDR is a
  // zero-decimal currency for Stripe, most others (usd, eur, ...) use 2 decimals.
  const zeroDecimal = new Set(['idr', 'jpy', 'krw', 'vnd']);
  const cur = (currency || 'usd').toLowerCase();
  const unitAmount = zeroDecimal.has(cur) ? Math.round(amount) : Math.round(amount * 100);

  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}');
  params.set('cancel_url', 'https://example.com/cancel');
  params.set('line_items[0][price_data][currency]', cur);
  params.set('line_items[0][price_data][product_data][name]', `Order ${orderId}`);
  params.set('line_items[0][price_data][unit_amount]', String(unitAmount));
  params.set('line_items[0][quantity]', '1');
  if (customerEmail) params.set('customer_email', customerEmail);

  const res = await fetchWithRetry('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${secretKey}`,
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[auto-payment/stripe] Checkout Session error:', JSON.stringify(data));
    throw new Error(data?.error?.message ?? 'Stripe Checkout Session request failed');
  }
  return { type: 'redirect', redirectUrl: data.url, sandbox };
}
