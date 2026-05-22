'use client';

import { useState } from 'react';

function safeClipboardWrite(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => execCommandCopy(text));
  } else {
    execCommandCopy(text);
  }
}
function execCommandCopy(text: string) {
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  } catch { /* silent */ }
}
import { Plus, Copy, Trash2, Check, X, Tag, BarChart2, Zap } from 'lucide-react';
import { promotions as INITIAL_PROMOS } from '../../../data/dummyData';
import { useStore } from '../../../context/StoreContext';
import { makePriceFmt } from '../../../lib/formatCurrency';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Promo {
  id: string;
  code: string;
  discount: string;
  type: 'Percentage' | 'Fixed';
  uses: number;
  limit: number;
  expires: string;
  status: 'Active' | 'Expired';
}

const INITIAL: Promo[] = INITIAL_PROMOS as Promo[];

// ── Create Modal ──────────────────────────────────────────────────────────────

interface CreateModalProps {
  currency: string;
  onClose: () => void;
  onSave: (p: Promo) => void;
}

function CreatePromoModal({ currency, onClose, onSave }: CreateModalProps) {
  const [code, setCode]           = useState('');
  const [type, setType]           = useState<'Percentage' | 'Fixed'>('Percentage');
  const [value, setValue]         = useState('');
  const [limit, setLimit]         = useState('100');
  const [expires, setExpires]     = useState('');
  const [error, setError]         = useState('');

  function handleSave() {
    const trimCode = code.trim().toUpperCase();
    if (!trimCode)          { setError('Promo code is required.'); return; }
    if (!value || Number(value) <= 0) { setError('Enter a valid discount value.'); return; }
    if (!expires)           { setError('Expiry date is required.'); return; }

    const discount = type === 'Percentage' ? `${value}%` : `${currency}${value}`;
    const expiryLabel = new Date(expires).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    onSave({
      id: `PROMO${Date.now()}`,
      code: trimCode,
      discount,
      type,
      uses: 0,
      limit: Math.max(1, Number(limit) || 100),
      expires: expiryLabel,
      status: 'Active',
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Panel */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 gradient-bg rounded-xl flex items-center justify-center">
              <Tag className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Create Promotion</h3>
              <p className="text-xs text-slate-400">New discount code</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">

          {/* Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Promo Code</label>
            <input
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
              placeholder="e.g. SUMMER20"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors uppercase"
            />
          </div>

          {/* Type + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Discount Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as 'Percentage' | 'Fixed')}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors bg-white"
              >
                <option value="Percentage">Percentage (%)</option>
                <option value="Fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                {type === 'Percentage' ? 'Percentage (%)' : 'Amount'}
              </label>
              <input
                type="number"
                min="0"
                max={type === 'Percentage' ? 100 : undefined}
                value={value}
                onChange={e => { setValue(e.target.value); setError(''); }}
                placeholder={type === 'Percentage' ? '20' : '10'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
              />
            </div>
          </div>

          {/* Limit + Expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Usage Limit</label>
              <input
                type="number"
                min="1"
                value={limit}
                onChange={e => setLimit(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Expiry Date</label>
              <input
                type="date"
                value={expires}
                onChange={e => { setExpires(e.target.value); setError(''); }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white gradient-bg hover:opacity-90 transition-opacity shadow-sm"
          >
            Create Promotion
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Promotions() {
  const { activeStore } = useStore();
  const fmtPrice = makePriceFmt(activeStore?.currency?.code ?? 'USD');
  const currencySymbol = activeStore?.currency?.symbol ?? '$';

  const [promos, setPromos]         = useState<Promo[]>(INITIAL);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  function copyCode(code: string) {
    safeClipboardWrite(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function addPromo(p: Promo) {
    setPromos(prev => [p, ...prev]);
    setShowCreate(false);
  }

  function deletePromo(id: string) {
    setPromos(prev => prev.filter(p => p.id !== id));
    setDeleteTarget(null);
  }

  const activeCount = promos.filter(p => p.status === 'Active').length;
  const totalUses   = promos.reduce((sum, p) => sum + p.uses, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Promotions</h2>
          <p className="text-slate-500 text-sm mt-1">Manage discount codes and promotions</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 shadow-sm"
        >
          <Plus className="w-4 h-4" />Create Promotion
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active Promotions', value: String(activeCount),    icon: Zap,      color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Uses',        value: String(totalUses),      icon: BarChart2, color: 'text-blue-600',    bg: 'bg-blue-50'    },
          { label: 'Revenue Impact',    value: fmtPrice(1240),         icon: Tag,       color: 'text-purple-600',  bg: 'bg-purple-50'  },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      {promos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
          <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No promotions yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {promos.map(promo => (
            <div
              key={promo.id}
              className={`bg-white rounded-2xl p-5 border ${promo.status === 'Expired' ? 'border-slate-200 opacity-60' : 'border-slate-200 hover:border-emerald-200'} transition-all`}
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-900 text-white font-mono font-bold px-4 py-2 rounded-xl text-sm tracking-wider">
                    {promo.code}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
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
                  {/* Usage bar */}
                  <div className="w-32 bg-slate-100 rounded-full h-2">
                    <div
                      className="h-2 gradient-bg rounded-full transition-all"
                      style={{ width: `${Math.min(100, (promo.uses / promo.limit) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-8 text-right">
                    {Math.round((promo.uses / promo.limit) * 100)}%
                  </span>

                  <button
                    onClick={() => copyCode(promo.code)}
                    title="Copy code"
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {copiedCode === promo.code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(promo.id)}
                    title="Delete"
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreatePromoModal
          currency={currencySymbol}
          onClose={() => setShowCreate(false)}
          onSave={addPromo}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setDeleteTarget(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">Delete Promotion?</h3>
            <p className="text-sm text-slate-500 text-center mb-5">
              Code <span className="font-mono font-bold text-slate-800">{promos.find(p => p.id === deleteTarget)?.code}</span> will be permanently removed.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={() => deletePromo(deleteTarget)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
