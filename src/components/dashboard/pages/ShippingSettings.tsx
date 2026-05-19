'use client';

import { useState, useEffect } from 'react';
import { Truck, Check, Info } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { DEFAULT_SHIPPING_METHODS } from '../../../context/StoreContext';
import type { ShippingMethod } from '../../../context/StoreContext';

export default function ShippingSettings() {
  const { activeStore, updateActiveStore } = useStore();

  const [methods, setMethods] = useState<ShippingMethod[]>(
    activeStore?.shippingSettings?.methods ?? DEFAULT_SHIPPING_METHODS
  );
  const [freeThreshold, setFreeThreshold] = useState(
    String(activeStore?.shippingSettings?.freeShippingThreshold ?? '')
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMethods(activeStore?.shippingSettings?.methods ?? DEFAULT_SHIPPING_METHODS);
    setFreeThreshold(String(activeStore?.shippingSettings?.freeShippingThreshold ?? ''));
  }, [activeStore?.id]);

  const updateMethod = (id: string, patch: Partial<ShippingMethod>) =>
    setMethods(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));

  const save = () => {
    updateActiveStore({
      shippingSettings: {
        methods,
        freeShippingThreshold: freeThreshold ? Number(freeThreshold) : undefined,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const currencySymbol = activeStore?.currency?.symbol ?? 'Rp';

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Shipping</h2>
          <p className="text-slate-500 text-sm mt-1">Atur metode pengiriman yang tersedia di toko kamu</p>
        </div>
        <button
          onClick={save}
          className="flex items-center gap-2 px-5 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          {saved ? <><Check className="w-4 h-4" />Tersimpan!</> : 'Simpan Perubahan'}
        </button>
      </div>

      {/* Free shipping threshold */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
            <span className="text-base">🎁</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Gratis Ongkir Otomatis</h3>
            <p className="text-xs text-slate-400">Ongkos kirim digratiskan jika total belanja mencapai nominal ini</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">{currencySymbol}</span>
          <input
            type="number"
            value={freeThreshold}
            onChange={e => setFreeThreshold(e.target.value)}
            placeholder="Contoh: 300000"
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        {freeThreshold && (
          <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            Gratis ongkir untuk pesanan di atas {currencySymbol}{Number(freeThreshold).toLocaleString('id-ID')}
          </p>
        )}
      </div>

      {/* Shipping methods */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
            <Truck className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Metode Pengiriman</h3>
            <p className="text-xs text-slate-400">Aktifkan kurir yang kamu gunakan dan sesuaikan tarifnya</p>
          </div>
        </div>
        <div className="space-y-3">
          {methods.map(method => (
            <div
              key={method.id}
              className={`rounded-xl border p-4 transition-all ${
                method.enabled
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-slate-200 bg-slate-50 opacity-70'
              }`}
            >
              {/* Top row: icon + name + toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{method.icon}</span>
                  <span className="text-sm font-semibold text-slate-800">{method.name}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={method.enabled}
                    onChange={e => updateMethod(method.id, { enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>

              {/* Editable fields — only shown when enabled */}
              {method.enabled && (
                <div className="mt-3 pt-3 border-t border-emerald-100 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Ongkos Kirim ({currencySymbol})</label>
                    <input
                      type="number"
                      value={method.price}
                      onChange={e => updateMethod(method.id, { price: Number(e.target.value) })}
                      disabled={method.id === 'free'}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Estimasi Tiba</label>
                    <input
                      type="text"
                      value={method.estimatedDays}
                      onChange={e => updateMethod(method.id, { estimatedDays: e.target.value })}
                      placeholder="2–3 hari"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-600 leading-relaxed">
          Pengaturan ini akan ditampilkan saat pembeli memilih pengiriman di halaman cart.
          Aktifkan minimal satu metode agar proses checkout berjalan.
        </p>
      </div>
    </div>
  );
}
