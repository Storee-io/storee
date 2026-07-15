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
      result = await createXenditPayment(autoPayment, channel, orderId, amount, customerName, customerEmail);
    } else if (provider === 'midtrans') {
      result = await createMidtransPayment(autoPayment, channel, orderId, amount, customerName, customerEmail);
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

  if (channel === 'qris') {
    const res = await fetch('https://api.xendit.co/qr_codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ reference_id: orderId, type: 'DYNAMIC', currency: 'IDR', amount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message ?? 'Xendit QRIS request failed');
    return { type: 'qris', qrString: data.qr_string };
  }

  if (channel === 'virtualAccount') {
    const res = await fetch('https://api.xendit.co/callback_virtual_accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({
        external_id: orderId,
        bank_code: 'BCA',
        name: customerName || 'Customer',
        expected_amount: amount,
        is_closed: true,
        is_single_use: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message ?? 'Xendit Virtual Account request failed');
    return { type: 'va', bankCode: data.bank_code, accountNumber: data.account_number };
  }

  // ewallet & card: use Xendit's hosted Invoice page, which itself presents
  // whichever payment methods are enabled on the merchant's Xendit dashboard.
  const res = await fetch('https://api.xendit.co/v2/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({
      external_id: orderId,
      amount,
      currency: 'IDR',
      customer: { given_names: customerName || 'Customer', email: customerEmail || undefined },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? 'Xendit Invoice request failed');
  return { type: 'redirect', redirectUrl: data.invoice_url };
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

  if (channel === 'qris') {
    const res = await fetch(`https://api.${env}midtrans.com/v2/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({
        payment_type: 'qris',
        transaction_details: { order_id: orderId, gross_amount: amount },
        qris: { acquirer: 'gopay' },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.status_message ?? 'Midtrans QRIS request failed');
    const qrAction = (data.actions as { name: string; url: string }[] | undefined)?.find(a => a.name === 'generate-qr-code');
    return { type: 'qris', qrImageUrl: qrAction?.url };
  }

  if (channel === 'virtualAccount') {
    const res = await fetch(`https://api.${env}midtrans.com/v2/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({
        payment_type: 'bank_transfer',
        transaction_details: { order_id: orderId, gross_amount: amount },
        bank_transfer: { bank: 'bca' },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.status_message ?? 'Midtrans Virtual Account request failed');
    const va = (data.va_numbers as { bank: string; va_number: string }[] | undefined)?.[0];
    return { type: 'va', bankCode: va?.bank?.toUpperCase(), accountNumber: va?.va_number };
  }

  // ewallet & card: Snap hosted redirect page
  const enabledPayments = channel === 'card' ? ['credit_card'] : ['gopay', 'shopeepay'];
  const res = await fetch(`https://app.${env}midtrans.com/snap/v1/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details: { first_name: customerName || 'Customer', email: customerEmail || undefined },
      enabled_payments: enabledPayments,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.status_message ?? 'Midtrans Snap request failed');
  return { type: 'redirect', redirectUrl: data.redirect_url };
}

// ── Stripe ───────────────────────────────────────────────────────────────────
async function createStripePayment(
  config: AutoPaymentConfig, orderId: string, amount: number, currency?: string, customerEmail?: string
): Promise<AutoPaymentResult> {
  const secretKey = config.stripe?.secretKey;
  if (!secretKey) throw new Error('Stripe secret key is not configured');

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

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${secretKey}`,
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Stripe Checkout Session request failed');
  return { type: 'redirect', redirectUrl: data.url };
}
