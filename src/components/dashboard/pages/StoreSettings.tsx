'use client';

import { useState, useEffect } from 'react';
import {
  Store, Globe, CreditCard, Truck, Check, DollarSign, Languages, ArrowRight,
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

      {/* Domain — redirect to dedicated page */}
      <Link href="/dashboard/domain" className="bg-white rounded-2xl p-6 border border-slate-200 flex items-center justify-between hover:border-emerald-300 hover:shadow-sm transition-all group">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Globe className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Domain</h3>
            <p className="text-xs text-slate-400 mt-0.5">Storee URL & custom domain settings</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
      </Link>

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
