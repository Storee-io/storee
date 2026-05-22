'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import {
  Truck, Check, Info, MapPin, Navigation, ExternalLink,
  Package, Zap, Bike, Gift, Store, Tag,
} from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { DEFAULT_SHIPPING_METHODS } from '../../../context/StoreContext';
import { makePriceFmt } from '../../../lib/formatCurrency';
import type { ShippingMethod } from '../../../context/StoreContext';
import type { PickedLocation } from './LocationPickerMap';

const LocationPickerMap = lazy(() => import('./LocationPickerMap'));

// ── Icon map ──────────────────────────────────────────────────────────────────

const METHOD_ICONS: Record<string, { Icon: React.ElementType; bg: string; color: string }> = {
  'jne-reg':        { Icon: Package, bg: 'bg-slate-100',   color: 'text-slate-600'  },
  'jne-yes':        { Icon: Zap,     bg: 'bg-amber-50',    color: 'text-amber-500'  },
  'jnt-reg':        { Icon: Package, bg: 'bg-blue-50',     color: 'text-blue-500'   },
  'sicepat':        { Icon: Zap,     bg: 'bg-red-50',      color: 'text-red-500'    },
  'gosend':         { Icon: Bike,    bg: 'bg-green-50',    color: 'text-green-600'  },
  'free':           { Icon: Gift,    bg: 'bg-emerald-50',  color: 'text-emerald-600'},
  'seller-courier': { Icon: Bike,    bg: 'bg-orange-50',   color: 'text-orange-500' },
  'pickup':         { Icon: Store,   bg: 'bg-purple-50',   color: 'text-purple-600' },
};

function MethodIcon({ id }: { id: string }) {
  const { Icon, bg, color } = METHOD_ICONS[id] ?? { Icon: Package, bg: 'bg-slate-100', color: 'text-slate-500' };
  return (
    <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Old Indonesian estimatedDays strings → English equivalents
const DAYS_MIGRATION: Record<string, string> = {
  'hari ini': 'Today',
  '1 hari':   '1 day',
  '2–3 hari': '2–3 days',
  '2–4 hari': '2–4 days',
  '3–5 hari': '3–5 days',
};

function mergeWithDefaults(stored: ShippingMethod[]): ShippingMethod[] {
  const defaultMap = new Map(DEFAULT_SHIPPING_METHODS.map(m => [m.id, m]));
  // Patch name + migrate old Indonesian estimatedDays strings
  const patched = stored.map(m => {
    const def = defaultMap.get(m.id);
    const migratedDays = DAYS_MIGRATION[m.estimatedDays.toLowerCase()] ?? m.estimatedDays;
    return def ? { ...m, name: def.name, estimatedDays: migratedDays } : { ...m, estimatedDays: migratedDays };
  });
  const ids = new Set(patched.map(m => m.id));
  const missing = DEFAULT_SHIPPING_METHODS.filter(m => !ids.has(m.id));
  return [...patched, ...missing];
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface CardProps {
  method: ShippingMethod;
  onUpdate: (patch: Partial<ShippingMethod>) => void;
  currencySymbol: string;
  fmtPrice: (amount: number) => string;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
    </label>
  );
}

/** Standard courier card */
function CourierCard({ method, onUpdate, currencySymbol }: CardProps) {
  return (
    <div className={`rounded-xl border p-4 transition-all ${method.enabled ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MethodIcon id={method.id} />
          <span className="text-sm font-semibold text-slate-800">{method.name}</span>
        </div>
        <Toggle checked={method.enabled} onChange={v => onUpdate({ enabled: v })} />
      </div>

      {method.enabled && (
        <div className="mt-3 pt-3 border-t border-emerald-100 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Shipping Cost ({currencySymbol})</label>
            <input
              type="number"
              value={method.price}
              onChange={e => onUpdate({ price: Number(e.target.value) })}
              disabled={method.id === 'free'}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Est. Delivery</label>
            <input
              type="text"
              value={method.estimatedDays}
              onChange={e => onUpdate({ estimatedDays: e.target.value })}
              placeholder="2–3 days"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Seller Delivery — distance-based pricing */
function SellerCourierCard({ method, onUpdate, currencySymbol, fmtPrice }: CardProps) {
  const ratePerKm  = method.ratePerKm ?? 3000;
  const minFee     = method.minFee    ?? 10000;
  const maxKm      = method.maxKm     ?? 15;
  const exampleKm  = 5;
  const exampleFee = Math.max(minFee, exampleKm * ratePerKm);

  return (
    <div className={`rounded-xl border p-4 transition-all ${method.enabled ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MethodIcon id={method.id} />
          <div>
            <p className="text-sm font-semibold text-slate-800">{method.name}</p>
            <p className="text-[11px] text-slate-400">Distance-based pricing</p>
          </div>
        </div>
        <Toggle checked={method.enabled} onChange={v => onUpdate({ enabled: v })} />
      </div>

      {method.enabled && (
        <div className="mt-3 pt-3 border-t border-emerald-100 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Rate / km ({currencySymbol})</label>
              <input
                type="number"
                value={ratePerKm}
                min={0}
                onChange={e => onUpdate({ ratePerKm: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Min. Fee ({currencySymbol})</label>
              <input
                type="number"
                value={minFee}
                min={0}
                onChange={e => onUpdate({ minFee: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Max Distance (km)</label>
              <input
                type="number"
                value={maxKm}
                min={1}
                onChange={e => onUpdate({ maxKm: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Est. Delivery</label>
            <input
              type="text"
              value={method.estimatedDays}
              onChange={e => onUpdate({ estimatedDays: e.target.value })}
              placeholder="Today / 1–2 hrs"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
            />
          </div>

          <div className="flex items-start gap-2.5 px-3.5 py-3 bg-blue-50 rounded-xl border border-blue-100">
            <Navigation className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 leading-relaxed space-y-0.5">
              <p className="font-semibold">Formula: max(Min Fee, Distance × Rate/km)</p>
              <p>
                Example {exampleKm} km →{' '}
                max({fmtPrice(minFee)},{' '}
                {exampleKm} × {fmtPrice(ratePerKm)}) ={' '}
                <span className="font-bold">{fmtPrice(exampleFee)}</span>
              </p>
              <p className="text-blue-500">Covers up to {maxKm} km from your store location.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Pick Up card */
function PickUpCard({ method, onUpdate }: CardProps) {
  const [showMap, setShowMap] = useState(false);
  const hasLocation = method.pickupLat != null && method.pickupLng != null;
  const mapsUrl = hasLocation ? `https://www.google.com/maps?q=${method.pickupLat},${method.pickupLng}` : null;

  function handleConfirm(loc: PickedLocation) {
    onUpdate({ pickupLat: loc.lat, pickupLng: loc.lng, pickupAddress: loc.address });
    setShowMap(false);
  }

  return (
    <>
      <div className={`rounded-xl border p-4 transition-all ${method.enabled ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MethodIcon id={method.id} />
            <div>
              <p className="text-sm font-semibold text-slate-800">{method.name}</p>
              <p className="text-[11px] text-slate-400">Customer collects in person</p>
            </div>
          </div>
          <Toggle checked={method.enabled} onChange={v => onUpdate({ enabled: v })} />
        </div>

        {method.enabled && (
          <div className="mt-3 pt-3 border-t border-emerald-100 space-y-3">

            {/* Location */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />Pickup Location
              </label>

              {hasLocation ? (
                <button
                  onClick={() => setShowMap(true)}
                  className="w-full rounded-xl overflow-hidden border border-emerald-200 hover:border-emerald-400 hover:shadow-md transition-all group text-left"
                >
                  <div className="relative h-36 overflow-hidden bg-slate-100">
                    <iframe
                      title="Pickup location map"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${(method.pickupLng! - 0.004)},${(method.pickupLat! - 0.004)},${(method.pickupLng! + 0.004)},${(method.pickupLat! + 0.004)}&layer=mapnik&marker=${method.pickupLat},${method.pickupLng}`}
                      width="100%" height="100%"
                      style={{ border: 'none', pointerEvents: 'none' }}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="flex flex-col items-center" style={{ transform: 'translateY(-50%)' }}>
                        <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow-lg ring-4 ring-red-200/60" />
                        <div className="w-1.5 h-3 bg-red-500 rounded-b-full -mt-0.5" />
                        <div className="w-2 h-1 bg-black/20 rounded-full mt-0.5 blur-[1px]" />
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />Change Location
                      </span>
                    </div>
                  </div>
                  <div className="px-3 py-2.5 bg-white group-hover:bg-emerald-50/60 transition-colors flex items-center justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-slate-400 mb-0.5">
                          {method.pickupLat?.toFixed(6)}, {method.pickupLng?.toFixed(6)}
                        </p>
                        <p className="text-xs text-slate-700 leading-snug line-clamp-2">
                          {method.pickupAddress || '—'}
                        </p>
                      </div>
                    </div>
                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors flex-shrink-0"
                        title="Open in Google Maps"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setShowMap(true)}
                  className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all text-slate-400 hover:text-emerald-600 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">Set Location on Map</p>
                    <p className="text-xs mt-0.5">Click to open map and pin your pickup point</p>
                  </div>
                </button>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Address Description</label>
              <textarea
                rows={2}
                value={method.pickupAddress ?? ''}
                onChange={e => onUpdate({ pickupAddress: e.target.value })}
                placeholder="e.g. 12 Sudirman St, Central Jakarta (open 9AM–9PM)"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">Auto-filled from map. Editable.</p>
            </div>

            {/* Ready time */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Est. Ready Time</label>
              <input
                type="text"
                value={method.estimatedDays}
                onChange={e => onUpdate({ estimatedDays: e.target.value })}
                placeholder="1–2 hrs / Same day"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
              />
            </div>
          </div>
        )}
      </div>

      {showMap && (
        <Suspense fallback={null}>
          <LocationPickerMap
            initialLat={method.pickupLat}
            initialLng={method.pickupLng}
            initialAddr={method.pickupAddress}
            onConfirm={handleConfirm}
            onClose={() => setShowMap(false)}
          />
        </Suspense>
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ShippingSettings() {
  const { activeStore, updateActiveStore } = useStore();

  const [methods, setMethods] = useState<ShippingMethod[]>(
    mergeWithDefaults(activeStore?.shippingSettings?.methods ?? DEFAULT_SHIPPING_METHODS)
  );
  const [freeThreshold, setFreeThreshold] = useState(
    String(activeStore?.shippingSettings?.freeShippingThreshold ?? '')
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMethods(mergeWithDefaults(activeStore?.shippingSettings?.methods ?? DEFAULT_SHIPPING_METHODS));
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

  const [shippingTab, setShippingTab] = useState<'courier' | 'manual'>('courier');

  const currencySymbol = activeStore?.currency?.symbol ?? 'Rp';
  const fmtPrice       = makePriceFmt(activeStore?.currency?.code ?? 'IDR');
  const courierMethods = methods.filter(m => !m.useDistancePricing && !m.isPickup);
  const sellerCourier  = methods.find(m => m.useDistancePricing);
  const pickupMethod   = methods.find(m => m.isPickup);
  const cardProps      = (m: ShippingMethod) => ({ method: m, onUpdate: (p: Partial<ShippingMethod>) => updateMethod(m.id, p), currencySymbol, fmtPrice });

  const tabs: { id: 'courier' | 'manual'; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'courier', label: 'Courier Delivery', icon: Truck, desc: 'JNE, J&T, SiCepat, GoSend & more' },
    { id: 'manual',  label: 'Manual Delivery',  icon: Bike,  desc: 'Seller delivery & store pickup'   },
  ];

  return (
    <div className="p-6 max-w-2xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Shipping</h2>
          <p className="text-slate-500 text-sm mt-0.5">Configure shipping options available in your store</p>
        </div>
        <button
          onClick={save}
          className="flex items-center gap-2 px-5 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          {saved ? <><Check className="w-4 h-4" />Saved!</> : 'Save Changes'}
        </button>
      </div>

      {/* Category tabs */}
      <div className="grid grid-cols-2 gap-3">
        {tabs.map(t => {
          const Icon   = t.icon;
          const active = shippingTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setShippingTab(t.id)}
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

      {/* ── Courier Delivery tab ── */}
      {shippingTab === 'courier' && (
        <>
          {/* Free Shipping Threshold */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Tag className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Free Shipping Threshold</h3>
                <p className="text-xs text-slate-400">Orders above this amount qualify for free shipping</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">{currencySymbol}</span>
              <input
                type="number"
                value={freeThreshold}
                onChange={e => setFreeThreshold(e.target.value)}
                placeholder="e.g. 300000"
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            {freeThreshold && (
              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Free shipping on orders above {fmtPrice(Number(freeThreshold))}
              </p>
            )}
          </div>

          {/* Courier Services */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                <Truck className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Courier Services</h3>
                <p className="text-xs text-slate-400">JNE, J&T, SiCepat, GoSend, and more</p>
              </div>
            </div>
            <div className="space-y-3">
              {courierMethods.map(m => <CourierCard key={m.id} {...cardProps(m)} />)}
            </div>
          </div>
        </>
      )}

      {/* ── Manual Delivery tab ── */}
      {shippingTab === 'manual' && (
        <>
          {/* Seller Delivery */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center">
                <Bike className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Seller Delivery</h3>
                <p className="text-xs text-slate-400">Deliver yourself — distance-based pricing</p>
              </div>
            </div>
            {sellerCourier && <SellerCourierCard {...cardProps(sellerCourier)} />}
          </div>

          {/* Pick Up */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center">
                <Store className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Pick Up</h3>
                <p className="text-xs text-slate-400">Customer picks up in person — no shipping fee</p>
              </div>
            </div>
            {pickupMethod && <PickUpCard {...cardProps(pickupMethod)} />}
          </div>
        </>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-600 leading-relaxed">
          These settings appear when customers select shipping at checkout. Enable at least one method to allow orders.
        </p>
      </div>
    </div>
  );
}
