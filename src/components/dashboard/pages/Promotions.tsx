'use client';

import { useState } from 'react';
import { Plus, Copy, Trash2, Check } from 'lucide-react';
import { promotions } from '../../../data/dummyData';
import { useStore } from '../../../context/StoreContext';

export default function Promotions() {
  const { activeStore } = useStore();
  const currencySymbol = activeStore?.currency?.symbol ?? '$';
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Promotions</h2>
          <p className="text-slate-500 text-sm mt-1">Manage discount codes and promotions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 shadow-sm">
          <Plus className="w-4 h-4" />Create Promotion
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active Promotions', value: '3', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Uses', value: '254', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Revenue Impact', value: `${currencySymbol}1,240`, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-2xl p-5 border border-slate-200`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4">
        {promotions.map(promo => (
          <div key={promo.id} className={`bg-white rounded-2xl p-5 border ${promo.status === 'Expired' ? 'border-slate-200 opacity-60' : 'border-slate-200 hover:border-emerald-200'} transition-all`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 text-white font-mono font-bold px-4 py-2 rounded-xl text-sm tracking-wider">
                  {promo.code}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{promo.discount} off</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-sm text-slate-500">{promo.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${promo.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {promo.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {promo.uses}/{promo.limit} uses · Expires {promo.expires}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 gradient-bg rounded-full"
                    style={{ width: `${(promo.uses / promo.limit) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">{Math.round((promo.uses / promo.limit) * 100)}%</span>
                <button
                  onClick={() => copyCode(promo.code)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {copiedCode === promo.code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
                {promo.status === 'Expired' && (
                  <button className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
