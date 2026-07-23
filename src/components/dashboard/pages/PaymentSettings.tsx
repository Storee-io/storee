'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Image from 'next/image';
import {
  CreditCard, Check, Info, ChevronDown, Zap,
  Eye, EyeOff, ExternalLink, ShieldCheck,
  Landmark, Wallet, MessageCircle, FileText,
  QrCode, Banknote, Building2, Loader2,
  Upload, X, AlertTriangle,
} from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { DEFAULT_PAYMENT_METHODS } from '../../../context/StoreContext';
import type { PaymentMethod, AutoPaymentConfig, AutoPaymentProvider, AutoPaymentChannels } from '../../../context/StoreContext';

const BANK_OPTIONS = ['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 'Permata', 'Danamon', 'Jenius', 'Jago', 'SeaBank', 'Blu by BCA Digital', 'Neobank', 'Allo Bank', 'Superbank', 'Krom', 'Bank Saqu', 'Aladin'];

// ── QRIS image upload helpers ─────────────────────────────────────────────────
// Compresses the uploaded QR code to a reasonably small square data URL so it
// stays cheap to store/sync (localStorage + Supabase) without visible quality loss.
const QRIS_TARGET_BYTES = 800 * 1024;

function compressQrisImage(file: File): Promise<string> {
  const preserveAlpha = file.type !== 'image/jpeg' && file.type !== 'image/jpg';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const render = (side: number, q: number): string => {
          const canvas = document.createElement('canvas');
          canvas.width = side;
          canvas.height = side;
          const ctx = canvas.getContext('2d');
          if (!ctx) return e.target?.result as string;
          const srcSide = Math.min(img.width, img.height);
          const sx = (img.width - srcSide) / 2;
          const sy = (img.height - srcSide) / 2;
          if (!preserveAlpha) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, side, side);
          }
          ctx.drawImage(img, sx, sy, srcSide, srcSide, 0, 0, side, side);
          return canvas.toDataURL(preserveAlpha ? 'image/png' : 'image/jpeg', q);
        };
        let side = Math.min(img.width, img.height, 800);
        let quality = 0.85;
        let out = render(side, quality);
        while (out.length > QRIS_TARGET_BYTES * 1.37 && (side > 200 || quality > 0.4)) {
          if (!preserveAlpha && quality > 0.4) quality -= 0.1;
          else side = Math.round(side * 0.85);
          out = render(side, quality);
        }
        resolve(out);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Payment method icon map ───────────────────────────────────────────────────

const METHOD_ICONS: Record<string, { Icon: React.ElementType; bg: string; color: string }> = {
  bca:     { Icon: Building2, bg: 'bg-blue-50',    color: 'text-blue-600'    },
  mandiri: { Icon: Building2, bg: 'bg-amber-50',   color: 'text-amber-600'   },
  bni:     { Icon: Building2, bg: 'bg-orange-50',  color: 'text-orange-600'  },
  qris:    { Icon: QrCode,    bg: 'bg-indigo-50',  color: 'text-indigo-600'  },
  cod:     { Icon: Banknote,  bg: 'bg-green-50',   color: 'text-green-600'   },
  gopay:   { Icon: Wallet,    bg: 'bg-green-50',   color: 'text-green-600'   },
  ovo:     { Icon: Wallet,    bg: 'bg-purple-50',  color: 'text-purple-600'  },
  dana:    { Icon: Wallet,    bg: 'bg-blue-50',    color: 'text-blue-500'    },
  shopeepay: { Icon: Wallet, bg: 'bg-orange-50',  color: 'text-orange-600'  },
};

// Real e-wallet app icons (full-bleed square), shown instead of the generic lucide icon when available.
export const METHOD_LOGOS: Record<string, string> = {
  gopay:     '/logos/gopay.jpg',
  ovo:       '/logos/ovo.png',
  dana:      '/logos/dana.png',
  shopeepay: '/logos/shopeepay.jpg',
};

export function PaymentMethodIcon({ id, type }: { id: string; type: string }) {
  const logo = METHOD_LOGOS[id];
  if (logo) {
    return (
      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 relative">
        <Image src={logo} alt={id} fill unoptimized className="object-cover" />
      </div>
    );
  }

  const entry = METHOD_ICONS[id] ?? (
    type === 'bank_transfer' ? { Icon: Landmark, bg: 'bg-slate-100', color: 'text-slate-500' } :
    type === 'ewallet'       ? { Icon: Wallet,   bg: 'bg-slate-100', color: 'text-slate-500' } :
    { Icon: CreditCard, bg: 'bg-slate-100', color: 'text-slate-500' }
  );
  const { Icon, bg, color } = entry;
  return (
    <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
  );
}

// ── Auto-payment providers ────────────────────────────────────────────────────

const AUTO_PROVIDERS: {
  id: AutoPaymentProvider;
  name: string;
  logo: string;
  color: string;
  desc: string;
  docsUrl: string;
}[] = [
  {
    id: 'xendit',
    name: 'Xendit',
    logo: '/logos/xendit.svg',
    color: 'border-blue-300 bg-blue-50',
    desc: 'Virtual account, QRIS, e-wallet & cards — popular in Indonesia',
    docsUrl: 'https://dashboard.xendit.co/settings/developers',
  },
  {
    id: 'midtrans',
    name: 'Midtrans',
    logo: '/logos/midtrans.svg',
    color: 'border-cyan-300 bg-cyan-50',
    desc: "Gojek's payment gateway — bank transfer, cards & e-wallets",
    docsUrl: 'https://dashboard.midtrans.com/settings/config_info',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    logo: '/logos/stripe.svg',
    color: 'border-violet-300 bg-violet-50',
    desc: 'International payments — credit cards, Apple Pay, Google Pay',
    docsUrl: 'https://dashboard.stripe.com/apikeys',
  },
];

// Which channels each provider actually supports — Stripe only ever creates
// a card Checkout Session, so QRIS/E-Wallet/Virtual Account (Indonesia-only
// rails) aren't meaningful choices under it.
const PROVIDER_CHANNELS: Record<AutoPaymentProvider, (keyof AutoPaymentChannels)[]> = {
  xendit: ['qris', 'ewallet', 'virtualAccount', 'card'],
  midtrans: ['qris', 'ewallet', 'virtualAccount', 'card'],
  stripe: ['card'],
};

const DEFAULT_AUTO_CHANNELS: AutoPaymentChannels = {
  qris: true,
  ewallet: true,
  virtualAccount: true,
  card: false,
};

const DEFAULT_AUTO: AutoPaymentConfig = {
  enabled: false,
  provider: null,
  channels: DEFAULT_AUTO_CHANNELS,
  xendit:   { apiKey: '', webhookToken: '', environment: 'sandbox' },
  midtrans: { serverKey: '', clientKey: '', environment: 'sandbox' },
  stripe:   { publishableKey: '', secretKey: '', webhookSecret: '', environment: 'test' },
};

const AUTO_CHANNELS: { id: keyof AutoPaymentChannels; label: string; desc: string; Icon: React.ElementType }[] = [
  { id: 'qris',           label: 'QR',              desc: 'Scan-to-pay with any e-wallet or mobile banking app', Icon: QrCode },
  { id: 'ewallet',        label: 'E-Wallet',        desc: 'GoPay, OVO, Dana, ShopeePay & more',                  Icon: Wallet },
  { id: 'virtualAccount', label: 'Virtual Account', desc: 'Bank transfer via a dedicated VA number',              Icon: Landmark },
  { id: 'card',           label: 'Card',            desc: 'Credit & debit card payments',                        Icon: CreditCard },
];

type Tab = 'manual' | 'auto';

// ── Main component ────────────────────────────────────────────────────────────

export default function PaymentSettings() {
  const { activeStore, updateActiveStore } = useStore();

  const [tab, setTab]             = useState<Tab>('auto');
  const [methods, setMethods]     = useState<PaymentMethod[]>(
    activeStore?.paymentSettings?.methods ?? DEFAULT_PAYMENT_METHODS
  );
  const [confirmationWa, setConfirmationWa] = useState(
    activeStore?.paymentSettings?.confirmationWhatsapp ?? ''
  );
  const [paymentNote, setPaymentNote] = useState(
    activeStore?.paymentSettings?.paymentNote ?? ''
  );
  const [autoPayment, setAutoPayment] = useState<AutoPaymentConfig>(
    activeStore?.paymentSettings?.autoPayment ?? DEFAULT_AUTO
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);

  useEffect(() => {
    setMethods(activeStore?.paymentSettings?.methods ?? DEFAULT_PAYMENT_METHODS);
    setConfirmationWa(activeStore?.paymentSettings?.confirmationWhatsapp ?? '');
    setPaymentNote(activeStore?.paymentSettings?.paymentNote ?? '');
    setAutoPayment(activeStore?.paymentSettings?.autoPayment ?? DEFAULT_AUTO);
  }, [activeStore?.id, activeStore?.paymentSettings]);

  const updateMethod = (id: string, patch: Partial<PaymentMethod>) =>
    setMethods(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));

  const save = async () => {
    // Validation: QR - must have image uploaded
    const qrisMissingImage = methods.find(m => m.type === 'qris' && m.enabled && !m.qrisImageUrl);
    if (qrisMissingImage) {
      toast.error('Upload a QRIS code image before enabling QRIS payment');
      return;
    }

    // Validation: E-Wallet - must have number filled in
    const ewalletMissingNumber = methods.find(m => m.type === 'ewallet' && m.enabled && !m.ewalletNumber?.trim());
    if (ewalletMissingNumber) {
      toast.error('Fill in the e-wallet account number before enabling e-wallet payment');
      return;
    }

    // Validation: Bank Transfer - must have all mandatory fields
    const bankMissingFields = methods.find(m =>
      m.type === 'bank_transfer' && m.enabled &&
      (!m.bankName?.trim() || !m.accountNumber?.trim() || !m.accountHolder?.trim())
    );
    if (bankMissingFields) {
      toast.error('Fill in all mandatory fields (Bank, Account Number, Account Holder) before enabling bank transfer');
      return;
    }

    setSaving(true);
    try {
      const newPaymentSettings = {
        methods,
        confirmationWhatsapp: confirmationWa || undefined,
        paymentNote: paymentNote || undefined,
        autoPayment,
      };
      updateActiveStore({ paymentSettings: newPaymentSettings });

      // Store is already live — push the updated settings to the published
      // site too, otherwise checkout keeps showing stale payment methods
      // until the next full re-publish.
      if (activeStore && activeStore.status === 'Published') {
        const subdomain = (activeStore.publishedDomain ?? activeStore.domain).replace('.storee.io', '');
        fetch('/api/publish-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subdomain,
            name: activeStore.name,
            primaryColor: activeStore.primaryColor,
            category: activeStore.category,
            templateId: activeStore.template?.id,
            design: activeStore.design,
            currency: activeStore.currency,
            language: activeStore.language,
            font: activeStore.font,
            mood: activeStore.mood,
            audience: activeStore.audience,
            branding: activeStore.branding,
            paymentSettings: newPaymentSettings,
            shippingSettings: activeStore.shippingSettings,
            checkoutSettings: activeStore.checkoutSettings,
          }),
        }).catch(console.error);
      }

      // Sync payment changes to published store (for real-time updates)
      if (activeStore?.status === 'Published' && activeStore?.id) {
        fetch('/api/sync-to-published', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeId: activeStore.id }),
        }).catch(err => console.error('[sync] payment sync failed:', err));
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Payment settings saved');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  const patchAuto     = (patch: Partial<AutoPaymentConfig>) =>
    setAutoPayment(prev => ({ ...prev, ...patch }));
  const patchChannel  = (id: keyof AutoPaymentChannels, value: boolean) =>
    setAutoPayment(prev => ({ ...prev, channels: { ...DEFAULT_AUTO_CHANNELS, ...prev.channels, [id]: value } }));
  // Switching provider resets channels to that provider's supported set (all
  // on) — carrying over e.g. QRIS/VA toggles from Xendit into Stripe would
  // show checkout options Stripe can't actually fulfill.
  const selectProvider = (id: AutoPaymentProvider) => {
    const next = autoPayment.provider === id ? null : id;
    setAutoPayment(prev => ({
      ...prev,
      provider: next,
      channels: next
        ? { qris: false, ewallet: false, virtualAccount: false, card: false, ...Object.fromEntries(PROVIDER_CHANNELS[next].map(c => [c, true])) }
        : prev.channels,
    }));
  };
  const patchXendit   = (patch: Partial<NonNullable<AutoPaymentConfig['xendit']>>) =>
    setAutoPayment(prev => ({ ...prev, xendit:   { ...DEFAULT_AUTO.xendit!,   ...prev.xendit,   ...patch } }));
  const patchMidtrans = (patch: Partial<NonNullable<AutoPaymentConfig['midtrans']>>) =>
    setAutoPayment(prev => ({ ...prev, midtrans: { ...DEFAULT_AUTO.midtrans!, ...prev.midtrans, ...patch } }));
  const patchStripe   = (patch: Partial<NonNullable<AutoPaymentConfig['stripe']>>) =>
    setAutoPayment(prev => ({ ...prev, stripe:   { ...DEFAULT_AUTO.stripe!,   ...prev.stripe,   ...patch } }));

  const bankMethods  = methods.filter(m => m.type === 'bank_transfer');
  const ewalletMethods = methods.filter(m => m.type === 'ewallet');
  const qrisMethod = methods.find(m => m.id === 'qris');
  const codMethod = methods.find(m => m.id === 'cod');

  const tabs: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'auto',   label: 'Online Payment',   icon: Zap,        desc: 'Payment gateway API integration'   },
    { id: 'manual', label: 'Manual Payment', icon: CreditCard, desc: 'Bank transfer, QRIS, Cash, e-wallet' },
  ];

  return (
    <div className="p-6 max-w-2xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payment</h2>
          <p className="text-slate-500 text-sm mt-0.5">Manage payment methods available to customers</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
          ) : saved ? (
            <><Check className="w-4 h-4" />Saved!</>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-3">
        {tabs.map(t => {
          const Icon   = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                active ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-emerald-500' : 'bg-slate-100'}`}>
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-500'}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-bold truncate ${active ? 'text-emerald-800' : 'text-slate-800'}`}>{t.label}</p>
                <p className={`text-xs truncate mt-0.5 ${active ? 'text-emerald-600' : 'text-slate-400'}`}>{t.desc}</p>
              </div>
              {active && <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 ml-auto" />}
            </button>
          );
        })}
      </div>

      {/* ── Manual tab ── */}
      {tab === 'manual' && (
        <>
          {/* QR Code */}
          {qrisMethod && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">QR Code</h3>
                  <p className="text-xs text-slate-400">QRIS</p>
                </div>
              </div>
              <div className="space-y-3">
                <OtherPaymentCard key={qrisMethod.id} method={qrisMethod} onUpdate={p => updateMethod(qrisMethod.id, p)} />
              </div>
            </div>
          )}

          {/* E-Wallets */}
          {ewalletMethods.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">E-Wallets</h3>
                  <p className="text-xs text-slate-400">GoPay, OVO, Dana, ShopeePay</p>
                </div>
              </div>
              <div className="space-y-3">
                {ewalletMethods.map(m => (
                  <OtherPaymentCard key={m.id} method={m} onUpdate={p => updateMethod(m.id, p)} />
                ))}
              </div>
            </div>
          )}

          {/* Bank Transfer */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Landmark className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Bank Transfer</h3>
                  <p className="text-xs text-slate-400">Add and manage bank accounts</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const newId = `bank-${Date.now()}`;
                  setMethods([...methods, { id: newId, name: `Transfer Bank`, type: 'bank_transfer', enabled: false }]);
                  setExpandedBankId(newId);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors flex-shrink-0"
              >
                + Add Account
              </button>
            </div>
            <div className="space-y-3">
              {bankMethods.length > 0 ? (
                bankMethods.map(m => (
                  <BankTransferAccountRow
                    key={m.id}
                    method={m}
                    onUpdate={p => updateMethod(m.id, p)}
                    onDelete={() => setMethods(methods.filter(x => x.id !== m.id))}
                    isExpanded={expandedBankId === m.id}
                    onToggleExpand={(expanded) => setExpandedBankId(expanded ? m.id : null)}
                  />
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500">No bank accounts added yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Cash Payment */}
          {codMethod && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
                  <Banknote className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Cash Payment</h3>
                  <p className="text-xs text-slate-400">Cash</p>
                </div>
              </div>
              <div className="space-y-3">
                <OtherPaymentCard key={codMethod.id} method={codMethod} onUpdate={p => updateMethod(codMethod.id, p)} />
              </div>
            </div>
          )}

          {/* Additional Settings */}
          <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Additional Settings</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            </div>

            <div className="space-y-5">
              {/* WhatsApp Confirmation */}
              <div className="bg-green-50/40 rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">WhatsApp Confirmation</h3>
                    <p className="text-xs text-slate-400">Customers send payment proof via WhatsApp</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">WhatsApp Number</label>
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-100">
                      <span className="px-4 py-2.5 bg-slate-50 text-sm text-slate-500 border-r border-slate-200">+62</span>
                      <input
                        type="tel"
                        value={confirmationWa.replace(/^62/, '')}
                        onChange={e => setConfirmationWa('62' + e.target.value.replace(/^0/, ''))}
                        placeholder="81234567890"
                        className="flex-1 px-4 py-2.5 text-sm outline-none bg-white"
                      />
                    </div>
                  </div>
                  {confirmationWa && (
                    <p className="text-xs text-green-600 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      Link: wa.me/{confirmationWa}
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Notes */}
              <div className="bg-green-50/40 rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Payment Notes</h3>
                    <p className="text-xs text-slate-400">Shown below payment options at checkout</p>
                  </div>
                </div>
                <textarea
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Payments confirmed within 24 hrs. Orders processed after verification."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 resize-none"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Auto tab ── */}
      {tab === 'auto' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">

          {/* Toggle */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Enable Online Payment</p>
                <p className="text-xs text-slate-400">Payment confirmation processed automatically via API gateway</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={autoPayment.enabled}
                onChange={e => patchAuto({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
            </label>
          </div>

          {!autoPayment.enabled ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-500 mb-1">Online payment not active</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Enable the toggle above, then select a provider to configure your payment gateway.
              </p>
            </div>
          ) : (
            <>
              {/* Provider selector — choose this first so only the channels it
                  actually supports are offered below */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">1. Select Provider</p>
                <div className="grid grid-cols-3 gap-3">
                  {AUTO_PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectProvider(p.id)}
                      className={`relative flex flex-col items-start gap-2 p-3.5 rounded-xl border-2 text-left transition-all ${
                        autoPayment.provider === p.id ? p.color : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      {autoPayment.provider === p.id && (
                        <span className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                      {/* Provider logo */}
                      <div className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center p-1.5 overflow-hidden">
                        <Image src={p.logo} alt={p.name} width={28} height={28} unoptimized className="w-full h-full object-contain" />
                      </div>
                      <span className="text-sm font-bold text-slate-800">{p.name}</span>
                      <span className="text-[10px] text-slate-500 leading-tight">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Channels — only the ones the selected provider supports */}
              {autoPayment.provider && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">2. Payment Channels</p>
                  <div className="space-y-2.5">
                    {AUTO_CHANNELS.filter(c => PROVIDER_CHANNELS[autoPayment.provider!].includes(c.id)).map(c => {
                      const on = autoPayment.channels?.[c.id] ?? DEFAULT_AUTO_CHANNELS[c.id];
                      return (
                        <div
                          key={c.id}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${on ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${on ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                              <c.Icon className={`w-4 h-4 ${on ? 'text-emerald-600' : 'text-slate-400'}`} />
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${on ? 'text-slate-900' : 'text-slate-500'}`}>{c.label}</p>
                              <p className="text-xs text-slate-400">{c.desc}</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input type="checkbox" checked={on} onChange={e => patchChannel(c.id, e.target.checked)} className="sr-only peer" />
                            <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Credentials */}
              {autoPayment.provider && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      3. {AUTO_PROVIDERS.find(p => p.id === autoPayment.provider)?.name} Credentials
                    </p>
                    <a
                      href={AUTO_PROVIDERS.find(p => p.id === autoPayment.provider)?.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                      Get API Key <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                    {autoPayment.provider === 'xendit' && (
                      <>
                        <CredentialField label="API Key (Secret Key)" value={autoPayment.xendit?.apiKey ?? ''} onChange={v => patchXendit({ apiKey: v })} placeholder="xnd_production_xxxxxxxx..." secret />
                        <CredentialField label="Webhook Verification Token" value={autoPayment.xendit?.webhookToken ?? ''} onChange={v => patchXendit({ webhookToken: v })} placeholder="Token from Xendit dashboard" secret />
                        <EnvToggle value={autoPayment.xendit?.environment ?? 'sandbox'} options={[{ value: 'sandbox', label: 'Sandbox' }, { value: 'production', label: 'Production' }]} onChange={v => patchXendit({ environment: v as 'sandbox' | 'production' })} />
                      </>
                    )}
                    {autoPayment.provider === 'midtrans' && (
                      <>
                        <CredentialField label="Server Key" value={autoPayment.midtrans?.serverKey ?? ''} onChange={v => patchMidtrans({ serverKey: v })} placeholder="SB-Mid-server-xxxxxxxx" secret />
                        <CredentialField label="Client Key" value={autoPayment.midtrans?.clientKey ?? ''} onChange={v => patchMidtrans({ clientKey: v })} placeholder="SB-Mid-client-xxxxxxxx" />
                        <EnvToggle value={autoPayment.midtrans?.environment ?? 'sandbox'} options={[{ value: 'sandbox', label: 'Sandbox' }, { value: 'production', label: 'Production' }]} onChange={v => patchMidtrans({ environment: v as 'sandbox' | 'production' })} />
                      </>
                    )}
                    {autoPayment.provider === 'stripe' && (
                      <>
                        <CredentialField label="Publishable Key" value={autoPayment.stripe?.publishableKey ?? ''} onChange={v => patchStripe({ publishableKey: v })} placeholder="pk_test_xxxxxxxx" />
                        <CredentialField label="Secret Key" value={autoPayment.stripe?.secretKey ?? ''} onChange={v => patchStripe({ secretKey: v })} placeholder="sk_test_xxxxxxxx" secret />
                        <CredentialField label="Webhook Secret (optional)" value={autoPayment.stripe?.webhookSecret ?? ''} onChange={v => patchStripe({ webhookSecret: v })} placeholder="whsec_xxxxxxxx" secret />
                        <EnvToggle value={autoPayment.stripe?.environment ?? 'test'} options={[{ value: 'test', label: 'Test' }, { value: 'live', label: 'Live' }]} onChange={v => patchStripe({ environment: v as 'test' | 'live' })} />
                      </>
                    )}
                  </div>

                  <div className="flex items-start gap-2.5 px-3.5 py-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      Credentials are stored securely and used only for transactions in this store. Never share your Secret Key with anyone.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CredentialField({
  label, value, onChange, placeholder, secret = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; secret?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1.5 block">{label}</label>
      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
        <input
          type={secret && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="flex-1 px-3.5 py-2.5 text-sm font-mono text-slate-800 outline-none bg-transparent placeholder:text-slate-300 placeholder:font-sans"
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="px-3 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function EnvToggle({ value, options, onChange }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1.5 block">Environment</label>
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              value === opt.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BankTransferAccountRow({ method, onUpdate, onDelete, isExpanded, onToggleExpand }: { method: PaymentMethod; onUpdate: (patch: Partial<PaymentMethod>) => void; onDelete: () => void; isExpanded: boolean; onToggleExpand: (expanded: boolean) => void }) {
  const displayName = method.bankName ? `${method.bankName}` : 'No bank selected';

  return (
    <div className={`rounded-lg border transition-all ${method.enabled ? 'border-emerald-200 bg-emerald-50/40 overflow-hidden' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100 overflow-hidden'}`}>
      {/* Row Header */}
      <div className={`flex items-center justify-between p-4 transition-all ${isExpanded ? 'border-b' : ''} ${method.enabled ? 'border-emerald-200' : 'border-slate-100'}`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => onToggleExpand(!isExpanded)}
            className="p-1 hover:bg-slate-200 rounded transition-colors flex-shrink-0"
          >
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          <PaymentMethodIcon id={method.bankName?.toLowerCase() ?? method.id} type={method.type} />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium truncate ${isExpanded ? 'text-slate-900' : 'text-slate-700'}`}>{displayName}</p>
            {method.accountNumber && <p className="text-xs text-slate-400 truncate">{method.accountNumber}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={method.enabled} onChange={e => onUpdate({ enabled: e.target.checked })} className="sr-only peer" />
            <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
          </label>
          <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-600 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="bg-slate-50/40 px-4 py-3 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block uppercase tracking-wide">Bank</label>
            <div className="relative">
              <select
                value={method.bankName ?? ''}
                onChange={e => onUpdate({ bankName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 appearance-none bg-white pr-8"
              >
                <option value="">Select bank...</option>
                {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block uppercase tracking-wide">Account Number</label>
            <input
              type="text"
              value={method.accountNumber ?? ''}
              onChange={e => onUpdate({ accountNumber: e.target.value })}
              placeholder="1234567890"
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block uppercase tracking-wide">Account Holder</label>
            <input
              type="text"
              value={method.accountHolder ?? ''}
              onChange={e => onUpdate({ accountHolder: e.target.value })}
              placeholder="Account owner name"
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block uppercase tracking-wide">Instructions (optional)</label>
            <textarea
              value={method.instructions ?? ''}
              onChange={e => onUpdate({ instructions: e.target.value })}
              rows={2}
              placeholder="Transfer to the account above and send payment proof."
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 resize-none transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function OtherPaymentCard({ method, onUpdate }: { method: PaymentMethod; onUpdate: (patch: Partial<PaymentMethod>) => void }) {
  const [uploading, setUploading] = useState(false);
  const isQris = method.type === 'qris';
  const qrisReady = !isQris || !!method.qrisImageUrl;

  const handleQrisUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await compressQrisImage(file);
      onUpdate({ qrisImageUrl: dataUrl });
    } catch {
      toast.error('Failed to process image, please try another file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`rounded-xl border transition-all ${method.enabled ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100'}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1">
          <PaymentMethodIcon id={method.id} type={method.type} />
          <span className={`text-sm font-medium ${method.enabled ? 'text-slate-900' : 'text-slate-500'}`}>{method.name}</span>
        </div>
        <label className={`relative inline-flex items-center flex-shrink-0 ${qrisReady ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
          <input
            type="checkbox"
            checked={method.enabled}
            onChange={e => {
              if (e.target.checked && !qrisReady) {
                toast.error('Upload a QRIS code image first to enable this payment method');
                return;
              }
              onUpdate({ enabled: e.target.checked });
            }}
            className="sr-only peer"
          />
          <div className={`w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 ${qrisReady ? 'peer-focus:outline-none' : ''}`} />
        </label>
      </div>

      {isQris && (
        <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3 space-y-3">
          <label className="text-xs font-semibold text-slate-700 block uppercase tracking-wide">
            QR Code Image <span className="text-red-500 normal-case font-medium">(required to enable)</span>
          </label>

          {method.qrisImageUrl && (
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-lg border border-slate-200 flex-shrink-0 overflow-hidden bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={method.qrisImageUrl} alt="QRIS code" className="w-full h-full object-cover" />
                </div>
                <p className="text-sm font-medium text-slate-700 truncate">QR code uploaded</p>
              </div>
              <button
                type="button"
                onClick={() => onUpdate({ qrisImageUrl: undefined, enabled: false })}
                disabled={uploading}
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <label className="flex flex-col items-center justify-center gap-1.5 px-4 py-5 rounded-xl border-2 border-dashed border-slate-300 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors">
            <Upload className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">
              {uploading ? 'Processing...' : method.qrisImageUrl ? 'Click to replace image' : 'Click to upload QRIS code'}
            </span>
            <span className="text-xs text-slate-400">PNG, JPG up to 5MB</span>
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => handleQrisUpload(e.target.files?.[0])} />
          </label>

          {!method.qrisImageUrl && (
            <p className="flex items-center gap-1.5 text-xs text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> Upload the store's QRIS code to activate this payment method.
            </p>
          )}
        </div>
      )}

      {method.enabled && (
        <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3 space-y-3">
          {method.type === 'ewallet' && (
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-2 block uppercase tracking-wide">{method.name} Number</label>
              <input
                type="tel"
                value={method.ewalletNumber ?? ''}
                onChange={e => onUpdate({ ewalletNumber: e.target.value })}
                placeholder="08123456789"
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-colors"
              />
            </div>
          )}
          {(method.type === 'qris' || method.type === 'cod') && (
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-2 block uppercase tracking-wide">Instructions for customers</label>
              <textarea
                value={method.instructions ?? ''}
                onChange={e => onUpdate({ instructions: e.target.value })}
                rows={2}
                placeholder={method.type === 'qris' ? 'Scan QR code with any payment app.' : 'Have exact change ready when courier arrives.'}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 resize-none transition-colors"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
