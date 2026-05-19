'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Check, Info, ChevronDown } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { DEFAULT_PAYMENT_METHODS } from '../../../context/StoreContext';
import type { PaymentMethod } from '../../../context/StoreContext';

const BANK_OPTIONS = ['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 'Permata', 'Danamon'];

const PAYMENT_TYPE_ICON: Record<string, string> = {
  bank_transfer: '🏦',
  qris: '📱',
  cod: '💵',
  ewallet: '👛',
};

const EWALLET_ICON: Record<string, string> = {
  gopay: '🟢',
  ovo: '🟣',
  dana: '🔵',
};

export default function PaymentSettings() {
  const { activeStore, updateActiveStore } = useStore();

  const [methods, setMethods] = useState<PaymentMethod[]>(
    activeStore?.paymentSettings?.methods ?? DEFAULT_PAYMENT_METHODS
  );
  const [confirmationWa, setConfirmationWa] = useState(
    activeStore?.paymentSettings?.confirmationWhatsapp ?? ''
  );
  const [paymentNote, setPaymentNote] = useState(
    activeStore?.paymentSettings?.paymentNote ?? ''
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMethods(activeStore?.paymentSettings?.methods ?? DEFAULT_PAYMENT_METHODS);
    setConfirmationWa(activeStore?.paymentSettings?.confirmationWhatsapp ?? '');
    setPaymentNote(activeStore?.paymentSettings?.paymentNote ?? '');
  }, [activeStore?.id]);

  const updateMethod = (id: string, patch: Partial<PaymentMethod>) =>
    setMethods(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));

  const save = () => {
    updateActiveStore({
      paymentSettings: {
        methods,
        confirmationWhatsapp: confirmationWa || undefined,
        paymentNote: paymentNote || undefined,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const bankTransferMethods = methods.filter(m => m.type === 'bank_transfer');
  const otherMethods = methods.filter(m => m.type !== 'bank_transfer');

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payment</h2>
          <p className="text-slate-500 text-sm mt-1">Atur metode pembayaran yang bisa digunakan pembeli</p>
        </div>
        <button
          onClick={save}
          className="flex items-center gap-2 px-5 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          {saved ? <><Check className="w-4 h-4" />Tersimpan!</> : 'Simpan Perubahan'}
        </button>
      </div>

      {/* Bank Transfer methods */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-base">🏦</div>
          <div>
            <h3 className="font-bold text-slate-900">Transfer Bank</h3>
            <p className="text-xs text-slate-400">Aktifkan rekening yang kamu gunakan untuk menerima pembayaran</p>
          </div>
        </div>
        <div className="space-y-3">
          {bankTransferMethods.map(method => (
            <BankTransferCard
              key={method.id}
              method={method}
              onUpdate={patch => updateMethod(method.id, patch)}
            />
          ))}
        </div>
      </div>

      {/* QRIS, COD, E-wallets */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Metode Lainnya</h3>
            <p className="text-xs text-slate-400">QRIS, COD, dan e-wallet</p>
          </div>
        </div>
        <div className="space-y-3">
          {otherMethods.map(method => (
            <OtherPaymentCard
              key={method.id}
              method={method}
              onUpdate={patch => updateMethod(method.id, patch)}
            />
          ))}
        </div>
      </div>

      {/* WhatsApp confirmation */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center text-base">💬</div>
          <div>
            <h3 className="font-bold text-slate-900">WhatsApp Konfirmasi</h3>
            <p className="text-xs text-slate-400">Pembeli bisa langsung kirim bukti bayar via WhatsApp</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nomor WhatsApp</label>
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
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
            <p className="text-xs text-emerald-600 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Link: wa.me/{confirmationWa}
            </p>
          )}
        </div>
      </div>

      {/* Payment note */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
            <Info className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Catatan Pembayaran</h3>
            <p className="text-xs text-slate-400">Ditampilkan di bawah pilihan pembayaran saat checkout</p>
          </div>
        </div>
        <textarea
          value={paymentNote}
          onChange={e => setPaymentNote(e.target.value)}
          rows={3}
          placeholder="Contoh: Pembayaran akan dikonfirmasi dalam 1×24 jam. Pesanan akan diproses setelah pembayaran terverifikasi."
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
        />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BankTransferCard({ method, onUpdate }: { method: PaymentMethod; onUpdate: (patch: Partial<PaymentMethod>) => void }) {
  return (
    <div className={`rounded-xl border p-4 transition-all ${method.enabled ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">🏦</span>
          <span className="text-sm font-semibold text-slate-800">{method.name}</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={method.enabled} onChange={e => onUpdate({ enabled: e.target.checked })} className="sr-only peer" />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
        </label>
      </div>

      {method.enabled && (
        <div className="mt-3 pt-3 border-t border-emerald-100 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Bank</label>
            <div className="relative">
              <select
                value={method.bankName ?? ''}
                onChange={e => onUpdate({ bankName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 appearance-none bg-white pr-8"
              >
                <option value="">Pilih bank...</option>
                {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Nomor Rekening</label>
            <input
              type="text"
              value={method.accountNumber ?? ''}
              onChange={e => onUpdate({ accountNumber: e.target.value })}
              placeholder="1234567890"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Atas Nama</label>
            <input
              type="text"
              value={method.accountHolder ?? ''}
              onChange={e => onUpdate({ accountHolder: e.target.value })}
              placeholder="Nama pemilik rekening"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Instruksi (opsional)</label>
            <textarea
              value={method.instructions ?? ''}
              onChange={e => onUpdate({ instructions: e.target.value })}
              rows={2}
              placeholder="Transfer ke rekening di atas dan kirim bukti pembayaran."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function OtherPaymentCard({ method, onUpdate }: { method: PaymentMethod; onUpdate: (patch: Partial<PaymentMethod>) => void }) {
  const icon = method.type === 'qris' ? '📱' : method.type === 'cod' ? '💵' : (EWALLET_ICON[method.id] ?? '👛');

  return (
    <div className={`rounded-xl border p-4 transition-all ${method.enabled ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-semibold text-slate-800">{method.name}</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={method.enabled} onChange={e => onUpdate({ enabled: e.target.checked })} className="sr-only peer" />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
        </label>
      </div>

      {method.enabled && (
        <div className="mt-3 pt-3 border-t border-emerald-100 space-y-3">
          {method.type === 'ewallet' && (
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Nomor {method.name}</label>
              <input
                type="tel"
                value={method.ewalletNumber ?? ''}
                onChange={e => onUpdate({ ewalletNumber: e.target.value })}
                placeholder="08123456789"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
              />
            </div>
          )}
          {(method.type === 'qris' || method.type === 'cod') && (
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Instruksi untuk pembeli</label>
              <textarea
                value={method.instructions ?? ''}
                onChange={e => onUpdate({ instructions: e.target.value })}
                rows={2}
                placeholder={method.type === 'qris' ? 'Scan QR code dengan aplikasi apapun.' : 'Siapkan uang pas saat kurir tiba.'}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 resize-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
