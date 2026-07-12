'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard, Check, Info, ChevronDown, Zap,
  Eye, EyeOff, ExternalLink, ShieldCheck,
  Landmark, Wallet, MessageCircle, FileText,
  QrCode, Banknote, Building2,
} from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { DEFAULT_PAYMENT_METHODS } from '../../../context/StoreContext';
import type { PaymentMethod, AutoPaymentConfig, AutoPaymentProvider } from '../../../context/StoreContext';

const BANK_OPTIONS = ['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 'Permata', 'Danamon', 'Jenius', 'Jago', 'SeaBank', 'Blu by BCA Digital', 'Neobank', 'Allo Bank', 'Superbank', 'Krom', 'Bank Saqu', 'Aladin'];

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
};

function PaymentMethodIcon({ id, type }: { id: string; type: string }) {
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
  initial: string;
  initialBg: string;
  color: string;
  desc: string;
  docsUrl: string;
}[] = [
  {
    id: 'xendit',
    name: 'Xendit',
    initial: 'X',
    initialBg: 'bg-blue-500',
    color: 'border-blue-300 bg-blue-50',
    desc: 'Virtual account, QRIS, e-wallet & cards — popular in Indonesia',
    docsUrl: 'https://dashboard.xendit.co/settings/developers',
  },
  {
    id: 'midtrans',
    name: 'Midtrans',
    initial: 'M',
    initialBg: 'bg-orange-500',
    color: 'border-orange-300 bg-orange-50',
    desc: "Gojek's payment gateway — bank transfer, cards & e-wallets",
    docsUrl: 'https://dashboard.midtrans.com/settings/config_info',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    initial: 'S',
    initialBg: 'bg-violet-600',
    color: 'border-violet-300 bg-violet-50',
    desc: 'International payments — credit cards, Apple Pay, Google Pay',
    docsUrl: 'https://dashboard.stripe.com/apikeys',
  },
];

const DEFAULT_AUTO: AutoPaymentConfig = {
  enabled: false,
  provider: null,
  xendit:   { apiKey: '', webhookToken: '', environment: 'sandbox' },
  midtrans: { serverKey: '', clientKey: '', environment: 'sandbox' },
  stripe:   { publishableKey: '', secretKey: '', webhookSecret: '', environment: 'test' },
};

type Tab = 'manual' | 'auto';

// ── Main component ────────────────────────────────────────────────────────────

export default function PaymentSettings() {
  const { activeStore, updateActiveStore } = useStore();

  const [tab, setTab]             = useState<Tab>('manual');
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
  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);

  useEffect(() => {
    setMethods(activeStore?.paymentSettings?.methods ?? DEFAULT_PAYMENT_METHODS);
    setConfirmationWa(activeStore?.paymentSettings?.confirmationWhatsapp ?? '');
    setPaymentNote(activeStore?.paymentSettings?.paymentNote ?? '');
    setAutoPayment(activeStore?.paymentSettings?.autoPayment ?? DEFAULT_AUTO);
  }, [activeStore?.id]);

  const updateMethod = (id: string, patch: Partial<PaymentMethod>) =>
    setMethods(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));

  const save = () => {
    updateActiveStore({
      paymentSettings: {
        methods,
        confirmationWhatsapp: confirmationWa || undefined,
        paymentNote: paymentNote || undefined,
        autoPayment,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const patchAuto     = (patch: Partial<AutoPaymentConfig>) =>
    setAutoPayment(prev => ({ ...prev, ...patch }));
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
    { id: 'manual', label: 'Manual Payment', icon: CreditCard, desc: 'Bank transfer, QRIS, COD, e-wallet' },
    { id: 'auto',   label: 'Auto Payment',   icon: Zap,        desc: 'Payment gateway API integration'   },
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
          className="flex items-center gap-2 px-5 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
        >
          {saved ? <><Check className="w-4 h-4" />Saved!</> : 'Save Changes'}
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
                  <p className="text-xs text-slate-400">GoPay, OVO, Dana</p>
                </div>
              </div>
              <div className="space-y-3">
                {ewalletMethods.map(m => (
                  <OtherPaymentCard key={m.id} method={m} onUpdate={p => updateMethod(m.id, p)} />
                ))}
              </div>
            </div>
          )}

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
                <p className="text-sm font-bold text-slate-900">Enable Auto Payment</p>
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
              <p className="text-sm font-semibold text-slate-500 mb-1">Auto payment not active</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Enable the toggle above, then select a provider to configure your payment gateway.
              </p>
            </div>
          ) : (
            <>
              {/* Provider selector */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Select Provider</p>
                <div className="grid grid-cols-3 gap-3">
                  {AUTO_PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => patchAuto({ provider: autoPayment.provider === p.id ? null : p.id })}
                      className={`relative flex flex-col items-start gap-2 p-3.5 rounded-xl border-2 text-left transition-all ${
                        autoPayment.provider === p.id ? p.color : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      {autoPayment.provider === p.id && (
                        <span className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                      {/* Provider initial badge */}
                      <div className={`w-8 h-8 ${p.initialBg} rounded-lg flex items-center justify-center`}>
                        <span className="text-white text-sm font-black">{p.initial}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{p.name}</span>
                      <span className="text-[10px] text-slate-500 leading-tight">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Credentials */}
              {autoPayment.provider && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {AUTO_PROVIDERS.find(p => p.id === autoPayment.provider)?.name} Credentials
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
    <div className={`rounded-lg border transition-all ${isExpanded ? 'border-slate-200 bg-white shadow-xs overflow-hidden' : 'border-slate-200 bg-slate-50/50'}`}>
      {/* Row Header */}
      <div className={`flex items-center justify-between p-4 transition-all ${isExpanded ? 'border-b border-slate-100 bg-white' : 'rounded-lg bg-slate-50/50 hover:bg-slate-50'}`}>
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
  return (
    <div className={`rounded-lg border transition-all ${method.enabled ? 'border-slate-200 bg-white shadow-xs' : 'border-slate-200 bg-slate-50/50'}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1">
          <PaymentMethodIcon id={method.id} type={method.type} />
          <span className={`text-sm font-medium ${method.enabled ? 'text-slate-900' : 'text-slate-500'}`}>{method.name}</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
          <input type="checkbox" checked={method.enabled} onChange={e => onUpdate({ enabled: e.target.checked })} className="sr-only peer" />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
        </label>
      </div>

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
