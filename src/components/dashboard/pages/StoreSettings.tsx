'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Globe, CreditCard, Truck, Check, DollarSign, Languages, ArrowRight, Link2,
  CloudOff, Trash2, AlertTriangle, X, MessageSquare, Mail,
} from 'lucide-react';
import Link from 'next/link';
import { useStore } from '../../../context/StoreContext';
import UnpublishModal from '../../preview/UnpublishModal';

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
  const { activeStore, updateActiveStore, deleteStore } = useStore();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [storeName, setStoreName] = useState(activeStore?.name || '');
  const [storeDesc, setStoreDesc] = useState('Premium quality products for your lifestyle');
  const [selectedCurrency, setSelectedCurrency] = useState(
    activeStore?.currency ?? currencies[0]
  );
  const [selectedLanguage, setSelectedLanguage] = useState(
    languages.find(l => l.label === activeStore?.language) ?? languages[0]
  );
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contactFields, setContactFields] = useState<'whatsapp' | 'email' | 'both'>(
    activeStore?.checkoutSettings?.contactFields ?? 'both'
  );

  useEffect(() => {
    setStoreName(activeStore?.name || '');
    setSelectedCurrency(activeStore?.currency ?? currencies[0]);
    setSelectedLanguage(languages.find(l => l.label === activeStore?.language) ?? languages[0]);
    setContactFields(activeStore?.checkoutSettings?.contactFields ?? 'both');
  }, [activeStore?.id]);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleUnpublish = async () => {
    if (!activeStore?.domain) return;
    const subdomain = activeStore.domain.replace('.storee.io', '');
    try {
      await fetch('/api/publish-store', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain }),
      });
      updateActiveStore({ status: 'Draft' });
      setShowUnpublishConfirm(false);
    } catch (error) {
      console.error('Failed to unpublish:', error);
    }
  };

  const handleDelete = async () => {
    if (!activeStore?.id) return;
    await deleteStore(activeStore.id);
    setShowDeleteConfirm(false);
    router.push('/stores');
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

      {/* Checkout Settings */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Checkout Contact Fields</h3>
            <p className="text-xs text-slate-400 mt-0.5">Choose which contact method(s) to display</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => { setContactFields('whatsapp'); updateActiveStore({ checkoutSettings: { contactFields: 'whatsapp' } }); save(); }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-left transition-all ${
              contactFields === 'whatsapp'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white text-slate-700'
            }`}
          >
            <MessageSquare className={`w-4 h-4 flex-shrink-0 ${contactFields === 'whatsapp' ? 'text-emerald-600' : 'text-slate-500'}`} />
            <span className="text-sm font-medium">WhatsApp Only</span>
            {contactFields === 'whatsapp' && (
              <Check className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />
            )}
          </button>
          <button
            onClick={() => { setContactFields('email'); updateActiveStore({ checkoutSettings: { contactFields: 'email' } }); save(); }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-left transition-all ${
              contactFields === 'email'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white text-slate-700'
            }`}
          >
            <Mail className={`w-4 h-4 flex-shrink-0 ${contactFields === 'email' ? 'text-emerald-600' : 'text-slate-500'}`} />
            <span className="text-sm font-medium">Email Only</span>
            {contactFields === 'email' && (
              <Check className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />
            )}
          </button>
          <button
            onClick={() => { setContactFields('both'); updateActiveStore({ checkoutSettings: { contactFields: 'both' } }); save(); }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-left transition-all ${
              contactFields === 'both'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white text-slate-700'
            }`}
          >
            <div className="flex gap-0.5 flex-shrink-0">
              <MessageSquare className={`w-4 h-4 ${contactFields === 'both' ? 'text-emerald-600' : 'text-slate-500'}`} />
              <Mail className={`w-4 h-4 ${contactFields === 'both' ? 'text-emerald-600' : 'text-slate-500'}`} />
            </div>
            <span className="text-sm font-medium">Both</span>
            {contactFields === 'both' && (
              <Check className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* Domain — redirect to dedicated page */}
      <Link href="/dashboard/domain" className="bg-white rounded-2xl p-6 border border-slate-200 flex items-center justify-between hover:border-emerald-300 hover:shadow-sm transition-all group">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Link2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Domain</h3>
            <p className="text-xs text-slate-400 mt-0.5">Storee URL & custom domain</p>
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
            <h3 className="font-bold text-slate-900">Payment</h3>
            <p className="text-xs text-slate-400 mt-0.5">Metode pembayaran & gateway</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
      </Link>

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

      {/* Unpublish Store (reversible) */}
      {activeStore?.status === 'Published' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center">
              <CloudOff className="w-4 h-4 text-orange-500" />
            </div>
            <h3 className="font-bold text-slate-900">Unpublish Store</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Take store offline</p>
              <p className="text-xs text-slate-400">Remove from public access (can be republished)</p>
            </div>
            <button
              onClick={() => setShowUnpublishConfirm(true)}
              className="px-4 py-2 text-sm font-semibold text-orange-600 border border-orange-200 rounded-xl hover:bg-orange-50 transition-colors"
            >
              Unpublish
            </button>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border border-red-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-red-500" />
          </div>
          <h3 className="font-bold text-slate-900">Danger Zone</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800">Delete Store</p>
            <p className="text-xs text-slate-400">Permanently delete store and all data</p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Unpublish Confirmation Modal */}
      <AnimatePresence>
        {showUnpublishConfirm && activeStore && (
          <UnpublishModal
            store={activeStore}
            onConfirm={handleUnpublish}
            onClose={() => setShowUnpublishConfirm(false)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && activeStore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Delete Store?</h2>
                      <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-slate-500 mb-6">
                  Your store <span className="font-semibold text-slate-700">{activeStore.name}</span> will be permanently deleted along with all data. This cannot be reversed.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
