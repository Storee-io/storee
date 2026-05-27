'use client';

import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Template } from '../data/templates';
import { templates } from '../data/templates';
import { generateStoreData } from '../data/storeDataGenerator';
import type { StoreData } from '../data/storeDataGenerator';
import type { StoreDesign } from '../lib/claudeApi';
import { supabase, fetchUserStores, upsertStore } from '../lib/supabase';

export type { StoreData };
export type { StoreDesign };

export interface StoreCurrency {
  code: string;
  symbol: string;
  label: string;
}

// ── Shipping ──────────────────────────────────────────────────────────────────
export interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  estimatedDays: string;
  enabled: boolean;
  icon?: string;
  // Distance-based pricing (Kurir Penjual)
  useDistancePricing?: boolean;
  ratePerKm?: number;      // cost per km (e.g. 3000 → Rp3.000/km)
  minFee?: number;         // minimum ongkir charged (e.g. 10000)
  maxKm?: number;          // maximum coverage distance in km (e.g. 15)
  // Pick Up
  isPickup?: boolean;
  pickupAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
}

export interface ShippingSettings {
  methods: ShippingMethod[];
  freeShippingThreshold?: number;
}

export const DEFAULT_SHIPPING_METHODS: ShippingMethod[] = [
  { id: 'jne-reg',        name: 'JNE REG',              price: 15000, estimatedDays: '2–3 days', enabled: true,  icon: '📦' },
  { id: 'jne-yes',        name: 'JNE YES (Express)',     price: 35000, estimatedDays: '1 day',    enabled: true,  icon: '⚡' },
  { id: 'jnt-reg',        name: 'J&T Express',           price: 12000, estimatedDays: '2–4 days', enabled: true,  icon: '📫' },
  { id: 'sicepat',        name: 'SiCepat REG',           price: 10000, estimatedDays: '2–3 days', enabled: false, icon: '🚀' },
  { id: 'gosend',         name: 'GoSend Same Day',        price: 25000, estimatedDays: 'Today',    enabled: false, icon: '🛵' },
  { id: 'free',           name: 'Free Shipping',          price: 0,     estimatedDays: '3–5 days', enabled: false, icon: '🎁' },
  { id: 'seller-courier', name: 'Seller Delivery',        price: 0,     estimatedDays: 'Today',    enabled: false, icon: '🏍️', useDistancePricing: true, ratePerKm: 3000, minFee: 10000, maxKm: 15 },
  { id: 'pickup',         name: 'In-Store Pick Up',       price: 0,     estimatedDays: '-',        enabled: false, icon: '🏪', isPickup: true, pickupAddress: '' },
];

// ── Payment ───────────────────────────────────────────────────────────────────
export interface PaymentMethod {
  id: string;
  name: string;
  type: 'bank_transfer' | 'qris' | 'cod' | 'ewallet';
  enabled: boolean;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  qrisCode?: string;
  ewalletNumber?: string;
  instructions?: string;
}

export type AutoPaymentProvider = 'xendit' | 'midtrans' | 'stripe';

export interface AutoPaymentConfig {
  enabled: boolean;
  provider: AutoPaymentProvider | null;
  xendit?: {
    apiKey: string;
    webhookToken: string;
    environment: 'sandbox' | 'production';
  };
  midtrans?: {
    serverKey: string;
    clientKey: string;
    environment: 'sandbox' | 'production';
  };
  stripe?: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
    environment: 'test' | 'live';
  };
}

export interface PaymentSettings {
  methods: PaymentMethod[];
  confirmationWhatsapp?: string;
  paymentNote?: string;
  autoPayment?: AutoPaymentConfig;
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'bca',      name: 'Transfer BCA',         type: 'bank_transfer', enabled: true,  bankName: 'BCA',     accountNumber: '1234567890', accountHolder: 'Nama Toko Anda', instructions: 'Transfer ke rekening di atas dan kirim bukti pembayaran via WhatsApp.' },
  { id: 'mandiri',  name: 'Transfer Mandiri',      type: 'bank_transfer', enabled: false, bankName: 'Mandiri', accountNumber: '0987654321', accountHolder: 'Nama Toko Anda' },
  { id: 'bni',      name: 'Transfer BNI',          type: 'bank_transfer', enabled: false, bankName: 'BNI',     accountNumber: '1122334455', accountHolder: 'Nama Toko Anda' },
  { id: 'qris',     name: 'QRIS',                  type: 'qris',          enabled: true,  instructions: 'Scan QR code dengan aplikasi e-wallet atau mobile banking apapun.' },
  { id: 'cod',      name: 'Bayar di Tempat (COD)', type: 'cod',           enabled: false, instructions: 'Siapkan uang pas saat kurir tiba. Berlaku untuk area tertentu.' },
  { id: 'gopay',    name: 'GoPay',                 type: 'ewallet',       enabled: false, ewalletNumber: '08123456789' },
  { id: 'ovo',      name: 'OVO',                   type: 'ewallet',       enabled: false, ewalletNumber: '08123456789' },
  { id: 'dana',     name: 'Dana',                  type: 'ewallet',       enabled: false, ewalletNumber: '08123456789' },
];

// ── Store ─────────────────────────────────────────────────────────────────────
export interface Store {
  id: string;
  name: string;
  domain: string;
  status: 'Draft' | 'Published';
  template?: Template;
  primaryColor: string;
  createdAt: string;
  category: string;
  revenue: number;
  orders: number;
  design?: StoreDesign;
  currency?: StoreCurrency;
  language?: string;
  shippingSettings?: ShippingSettings;
  paymentSettings?: PaymentSettings;
  publishedDomain?: string; // set once on first publish; used to lock URL on republish
  // Appearance preferences
  font?: string;
  mood?: string;
  audience?: string;
  // Original generation prompt — used by Regenerate flow
  prompt?: string;
  // Variation preset ID used for this generation — excluded on next regenerate for diversity
  variationId?: number;
}

export interface GenerationState {
  active: boolean;
  step: number;
  prompt: string;
}

interface StoreContextType {
  stores: Store[];
  activeStore: Store | null;
  setActiveStore: (store: Store) => void;
  addStore: (store: Store) => Promise<void>;
  updateActiveStore: (patch: Partial<Store>) => void;
  deleteStore: (storeId: string) => Promise<void>;
  generatedStore: Store | null;
  setGeneratedStore: (store: Store | null) => void;
  storeData: StoreData;
  generationState: GenerationState | null;
  setGenerationState: (state: GenerationState | null) => void;
  isLoadingStores: boolean;
}

const StoreContext = createContext<StoreContextType | null>(null);

// Demo stores for unauthenticated users
const DEMO_STORES: Store[] = [
  {
    id: 'store-1',
    name: 'Noir Atelier',
    domain: 'noir-atelier.storee.io',
    status: 'Published',
    primaryColor: '#e5e5e5',
    createdAt: '2024-01-15',
    category: 'Fashion',
    revenue: 12840,
    orders: 142,
    template: templates.find(t => t.id === 'noir-atelier'),
  },
  {
    id: 'store-2',
    name: 'Black Roast Co.',
    domain: 'black-roast.storee.io',
    status: 'Published',
    primaryColor: '#c47a2b',
    createdAt: '2024-02-20',
    category: 'Coffee',
    revenue: 5420,
    orders: 89,
    template: templates.find(t => t.id === 'black-roast'),
  },
];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<Store[]>(DEMO_STORES);
  const [activeStore, setActiveStoreState] = useState<Store>(DEMO_STORES[0]);
  const [generatedStore, setGeneratedStore] = useState<Store | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState | null>(null);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Listen to Supabase auth — load stores when user signs in, clear when signs out
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          loadStores(session.user.id);
        } else {
          loadGuestStores();
        }
      })
      .catch(() => {
        // Supabase unreachable (network error / project paused) — treat as guest
        loadGuestStores();
      });

    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          loadStores(session.user.id);
        } else {
          setUserId(null);
          loadGuestStores();
        }
      });
      subscription = data.subscription;
    } catch {
      // Auth listener setup failed — already in guest mode from getSession catch
    }

    return () => subscription?.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadGuestStores() {
    try {
      const guestStores: Store[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith('storee_store_')) continue;
        try {
          const s = JSON.parse(localStorage.getItem(key)!) as Store;
          if (s?.id && s?.name) guestStores.push(s);
        } catch { /* skip malformed */ }
      }
      if (guestStores.length > 0) {
        // Sort newest first (createdAt desc)
        guestStores.sort((a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        );
        setStores(guestStores);
        setActiveStoreState(guestStores[0]);
      } else {
        setStores(DEMO_STORES);
        setActiveStoreState(DEMO_STORES[0]);
      }
    } catch {
      // localStorage not available (SSR edge case)
      setStores(DEMO_STORES);
      setActiveStoreState(DEMO_STORES[0]);
    }
  }

  async function loadStores(uid: string) {
    setIsLoadingStores(true);
    setUserId(uid);
    try {
      const userStores = await fetchUserStores(uid);
      if (userStores.length > 0) {
        setStores(userStores);
        setActiveStoreState(userStores[0]);
      } else {
        setStores([]);
        setActiveStoreState(DEMO_STORES[0]);
      }
    } catch {
      // Supabase unavailable — fall back to guest stores
      loadGuestStores();
    }
    setIsLoadingStores(false);
  }

  const setActiveStore = useCallback((store: Store) => {
    setActiveStoreState(store);
  }, []);

  const addStore = useCallback(async (store: Store) => {
    // Optimistic update
    setStores(prev => prev.find(s => s.id === store.id) ? prev : [...prev, store]);
    setActiveStoreState(store);
    // Persist to Supabase if logged in
    if (userId) {
      await upsertStore(store, userId);
    } else {
      // Fallback: localStorage for unauthenticated preview
      try { localStorage.setItem(`storee_store_${store.id}`, JSON.stringify(store)); } catch { /* quota */ }
    }
  }, [userId]);

  const updateActiveStore = useCallback((patch: Partial<Store>) => {
    setActiveStoreState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      // Persist asynchronously
      if (userId) {
        upsertStore(updated, userId).catch(console.error);
      } else {
        // Guest: keep localStorage in sync so reload/navigate preserves state
        try {
          localStorage.setItem(`storee_store_${updated.id}`, JSON.stringify(updated));
        } catch { /* quota */ }
      }
      return updated;
    });
    setStores(prev => prev.map(s =>
      s.id === activeStore?.id ? { ...s, ...patch } : s
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activeStore?.id]);

  const deleteStore = useCallback(async (storeId: string) => {
    setStores(prev => prev.filter(s => s.id !== storeId));
    if (activeStore?.id === storeId) {
      setActiveStoreState(stores.find(s => s.id !== storeId) ?? DEMO_STORES[0]);
    }
    if (userId) {
      const { deleteStoreById } = await import('../lib/supabase');
      await deleteStoreById(storeId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activeStore?.id, stores]);

  const storeData = useMemo(
    () => generateStoreData(activeStore),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeStore?.id, activeStore?.revenue, activeStore?.orders, activeStore?.template?.id]
  );

  return (
    <StoreContext.Provider value={{
      stores,
      activeStore,
      setActiveStore,
      addStore,
      updateActiveStore,
      deleteStore,
      generatedStore,
      setGeneratedStore,
      storeData,
      generationState,
      setGenerationState,
      isLoadingStores,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
