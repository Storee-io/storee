'use client';

import { useState, useEffect } from 'react';
import { Store, Globe, CreditCard, Truck, Check } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';

export default function StoreSettings() {
  const { activeStore } = useStore();
  const [saved, setSaved] = useState(false);
  const [storeName, setStoreName] = useState(activeStore?.name || '');
  const [storeDesc, setStoreDesc] = useState('Premium quality products for your lifestyle');

  useEffect(() => {
    setStoreName(activeStore?.name || '');
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
          <p className="text-slate-500 text-sm mt-1">Configure your store's basic settings</p>
        </div>
        <button
          onClick={save}
          className="flex items-center gap-2 px-5 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90"
        >
          {saved ? <><Check className="w-4 h-4" />Saved!</> : 'Save Changes'}
        </button>
      </div>

      {/* General */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
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

      {/* Domain */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
            <Globe className="w-4 h-4 text-slate-600" />
          </div>
          <h3 className="font-bold text-slate-900">Domain</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Storee Subdomain</label>
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
              <input defaultValue={activeStore?.domain?.split('.')[0] || 'my-store'} className="flex-1 px-4 py-2.5 text-sm outline-none" />
              <span className="px-4 py-2.5 bg-slate-50 text-sm text-slate-500 border-l border-slate-200">.storee.co</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Custom Domain</label>
            <input placeholder="yourstore.com" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
            <p className="text-xs text-slate-400 mt-1.5">Available on Starter plan and above</p>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-slate-600" />
          </div>
          <h3 className="font-bold text-slate-900">Payment Methods</h3>
        </div>
        <div className="space-y-3">
          {['Credit/Debit Card', 'Bank Transfer', 'GoPay', 'OVO', 'Dana', 'QRIS'].map(method => (
            <label key={method} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
              <span className="text-sm font-medium text-slate-700">{method}</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-emerald-500" />
            </label>
          ))}
        </div>
      </div>

      {/* Shipping */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
            <Truck className="w-4 h-4 text-slate-600" />
          </div>
          <h3 className="font-bold text-slate-900">Shipping</h3>
        </div>
        <div className="space-y-3">
          {['JNE', 'J&T Express', 'SiCepat', 'AnterAja', 'GoSend', 'GrabExpress'].map(courier => (
            <label key={courier} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
              <span className="text-sm font-medium text-slate-700">{courier}</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-emerald-500" />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
