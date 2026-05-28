'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Store, Globe, CreditCard, Truck, Check, DollarSign, Languages, ArrowRight,
  Copy, ExternalLink, AlertCircle, CheckCircle2, Loader2, X, Link2,
} from 'lucide-react';
import Link from 'next/link';
import { useStore } from '../../../context/StoreContext';

const currencies = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'IDR', symbol: 'Rp', label: 'Indonesian Rupiah' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'MYR', symbol: 'RM', label: 'Malaysian Ringgit' },
];

const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

// ── Custom Domain Panel ───────────────────────────────────────────────────────

type VerifyStatus = 'idle' | 'checking' | 'verified' | 'pending';

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  note?: string;
}

function CustomDomainPanel() {
  const { activeStore, updateActiveStore } = useStore();

  const existingDomain = activeStore?.customDomain ?? '';
  const subdomain = activeStore?.domain?.split('.')[0] ?? '';

  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [copied, setCopied] = useState<string | null>(null);
  const verifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // DNS records users need to set at their registrar
  const dnsRecords: DnsRecord[] = existingDomain
    ? [
        {
          type: 'CNAME',
          name: 'www',
          value: 'cname.vercel-dns.com',
          note: 'For www.domain.com',
        },
        {
          type: 'A',
          name: '@',
          value: '76.76.21.21',
          note: 'For root domain (apex)',
        },
      ]
    : [];

  const handleConnect = async () => {
    if (!activeStore) return;
    setError('');
    setSaving(true);

    const res = await fetch('/api/custom-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: activeStore.id,
        subdomain,
        domain: input,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? 'Failed to connect domain');
      return;
    }

    // Update local store state
    updateActiveStore({ customDomain: data.domain });
    setInput('');
    setVerifyStatus('idle');
  };

  const handleRemove = async () => {
    if (!activeStore || !existingDomain) return;
    setRemoving(true);
    setError('');

    const res = await fetch('/api/custom-domain', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: activeStore.id,
        subdomain,
        domain: existingDomain,
      }),
    });

    setRemoving(false);

    if (res.ok) {
      updateActiveStore({ customDomain: undefined });
      setVerifyStatus('idle');
    } else {
      const data = await res.json();
      setError(data.error ?? 'Failed to remove domain');
    }
  };

  const checkVerification = async () => {
    if (!existingDomain) return;
    setVerifyStatus('checking');

    const res = await fetch(`/api/custom-domain/verify?domain=${encodeURIComponent(existingDomain)}`);
    const data = await res.json();
    setVerifyStatus(data.verified ? 'verified' : 'pending');
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
    verifyTimerRef.current = setTimeout(() => setCopied(null), 2000);
  };

  // Auto-check verification when a domain is connected
  useEffect(() => {
    if (existingDomain && verifyStatus === 'idle') {
      checkVerification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingDomain]);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
          <Globe className="w-4 h-4 text-slate-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Domain</h3>
          <p className="text-xs text-slate-400 mt-0.5">Connect your store to a custom domain</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Storee subdomain (read-only info) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Storee URL</label>
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <span className="px-4 py-2.5 text-sm text-slate-500 select-none">storee.io/store/</span>
            <span className="py-2.5 text-sm font-medium text-slate-800">{subdomain || 'your-store'}</span>
            <a
              href={`/store/${subdomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto px-3 text-slate-400 hover:text-emerald-500 transition-colors"
              title="Open store"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Custom domain section */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Custom Domain</label>

          {existingDomain ? (
            /* ── Connected state ── */
            <div className="space-y-3">
              {/* Domain pill */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50">
                <Link2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-emerald-800 flex-1 truncate">
                  {existingDomain}
                </span>

                {/* Verification badge */}
                {verifyStatus === 'checking' && (
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin flex-shrink-0" />
                )}
                {verifyStatus === 'verified' && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    Active
                  </span>
                )}
                {verifyStatus === 'pending' && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0">
                    <AlertCircle className="w-3 h-3" />
                    Pending DNS
                  </span>
                )}

                {/* Remove button */}
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                  title="Remove domain"
                >
                  {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                </button>
              </div>

              {/* DNS instructions */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-600">
                    Point your domain to Storee — add these DNS records at your registrar:
                  </p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-2 text-left font-semibold text-slate-500 w-16">Type</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-500 w-12">Name</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-500">Value</th>
                      <th className="px-3 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {dnsRecords.map((rec, i) => (
                      <tr key={i} className={i < dnsRecords.length - 1 ? 'border-b border-slate-100' : ''}>
                        <td className="px-4 py-2.5">
                          <span className="font-mono font-bold text-violet-600">{rec.type}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-slate-700">{rec.name}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-slate-700 break-all">{rec.value}</span>
                          {rec.note && <span className="block text-slate-400 mt-0.5">{rec.note}</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => copyToClipboard(rec.value, `${i}`)}
                            className="p-1 rounded text-slate-400 hover:text-emerald-500 transition-colors"
                            title="Copy"
                          >
                            {copied === `${i}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Verify button */}
              {verifyStatus !== 'verified' && (
                <button
                  onClick={checkVerification}
                  disabled={verifyStatus === 'checking'}
                  className="flex items-center gap-2 text-sm text-emerald-600 font-semibold hover:text-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {verifyStatus === 'checking' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {verifyStatus === 'checking' ? 'Checking...' : 'Check Verification'}
                </button>
              )}

              {verifyStatus === 'verified' && (
                <p className="text-xs text-emerald-600">
                  ✓ Your domain is active. Visitors to <strong>{existingDomain}</strong> will see your store.
                </p>
              )}
              {verifyStatus === 'pending' && (
                <p className="text-xs text-amber-600">
                  DNS changes can take up to 48 hours to propagate. Add the records above, then click &quot;Check Verification&quot;.
                </p>
              )}
            </div>
          ) : (
            /* ── Not connected state ── */
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => { setInput(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && !saving && input.trim() && handleConnect()}
                  placeholder="mystore.com"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
                <button
                  onClick={handleConnect}
                  disabled={saving || !input.trim()}
                  className="px-5 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'Connecting...' : 'Connect'}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Enter your domain without http:// — e.g. <span className="font-mono">mystore.com</span>
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function StoreSettings() {
  const { activeStore, updateActiveStore } = useStore();
  const [saved, setSaved] = useState(false);
  const [storeName, setStoreName] = useState(activeStore?.name || '');
  const [storeDesc, setStoreDesc] = useState('Premium quality products for your lifestyle');
  const [selectedCurrency, setSelectedCurrency] = useState(
    activeStore?.currency ?? currencies[0]
  );
  const [selectedLanguage, setSelectedLanguage] = useState(
    languages.find(l => l.label === activeStore?.language) ?? languages[0]
  );

  useEffect(() => {
    setStoreName(activeStore?.name || '');
    setSelectedCurrency(activeStore?.currency ?? currencies[0]);
    setSelectedLanguage(languages.find(l => l.label === activeStore?.language) ?? languages[0]);
  }, [activeStore?.id]);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Store Settings</h2>
          <p className="text-slate-500 text-sm mt-1">Configure your store&apos;s basic settings</p>
        </div>
        <button
          onClick={save}
          className="flex items-center gap-2 px-5 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90"
        >
          {saved ? <><Check className="w-4 h-4" />Saved!</> : 'Save Changes'}
        </button>
      </div>

      {/* General */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
            <Store className="w-4 h-4 text-slate-600" />
          </div>
          <h3 className="font-bold text-slate-900">General</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Store Name</label>
            <input value={storeName} onChange={e => setStoreName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Store Description</label>
            <textarea value={storeDesc} onChange={e => setStoreDesc(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Store Email</label>
            <input type="email" defaultValue="hello@mystore.com" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
          </div>
        </div>
      </div>

      {/* Domain — full custom domain panel */}
      <CustomDomainPanel />

      {/* Payment — redirect to dedicated page */}
      <Link href="/dashboard/payment" className="bg-white rounded-2xl p-6 border border-slate-200 flex items-center justify-between hover:border-emerald-300 hover:shadow-sm transition-all group">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Payment Methods</h3>
            <p className="text-xs text-slate-400 mt-0.5">Bank transfer, QRIS, COD, e-wallet</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
      </Link>

      {/* Currency */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Currency</h3>
            <p className="text-xs text-slate-400 mt-0.5">Set based on your store&apos;s target market</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {currencies.map(curr => (
            <button
              key={curr.code}
              onClick={() => { setSelectedCurrency(curr); updateActiveStore({ currency: curr }); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                selectedCurrency.code === curr.code
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white text-slate-700'
              }`}
            >
              <span className={`text-base font-bold w-6 text-center flex-shrink-0 ${selectedCurrency.code === curr.code ? 'text-emerald-600' : 'text-slate-500'}`}>
                {curr.symbol}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{curr.code}</p>
                <p className="text-xs text-slate-400 truncate">{curr.label}</p>
              </div>
              {selectedCurrency.code === curr.code && (
                <Check className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
            <Languages className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Site Language</h3>
            <p className="text-xs text-slate-400 mt-0.5">Language used across your storefront</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setSelectedLanguage(lang); updateActiveStore({ language: lang.label }); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                selectedLanguage.code === lang.code
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white text-slate-700'
              }`}
            >
              <span className="text-base flex-shrink-0">{lang.flag}</span>
              <span className="text-sm font-medium truncate">{lang.label}</span>
              {selectedLanguage.code === lang.code && (
                <Check className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Shipping — redirect to dedicated page */}
      <Link href="/dashboard/shipping" className="bg-white rounded-2xl p-6 border border-slate-200 flex items-center justify-between hover:border-emerald-300 hover:shadow-sm transition-all group">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Truck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Shipping</h3>
            <p className="text-xs text-slate-400 mt-0.5">Kurir, tarif, dan gratis ongkir</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
      </Link>
    </div>
  );
}
