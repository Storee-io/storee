'use client';

import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Template } from '../data/templates';
import { templates } from '../data/templates';
import { generateStoreData } from '../data/storeDataGenerator';
import type { StoreData } from '../data/storeDataGenerator';
import type { StoreDesign } from '../lib/claudeApi';

export type { StoreData };
export type { StoreDesign };

// -- Helper: reads (but does NOT delete) the pending store from sessionStorage --
// The item is deleted in a useEffect after all useState initializers have run.
// This is safe to call multiple times -- each call returns the same value.
function readPendingStore(): Store | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('storee_pending_store');
    return raw ? (JSON.parse(raw) as Store) : null;
  } catch {
    return null;
  }
}

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
}

export interface ShippingSettings {
  methods: ShippingMethod[];
  freeShippingThreshold?: number;
}

export const DEFAULT_SHIPPING_METHODS: ShippingMethod[] = [
  { id: 'jne-reg',  name: 'JNE REG',             price: 15000, estimatedDays: '2–3 hari', enabled: true,  icon: '📦' },
  { id: 'jne-yes',  name: 'JNE YES (Express)',    price: 35000, estimatedDays: '1 hari',   enabled: true,  icon: '⚡' },
  { id: 'jnt-reg',  name: 'J&T Express',          price: 12000, estimatedDays: '2–4 hari', enabled: true,  icon: '📫' },
  { id: 'sicepat',  name: 'SiCepat REG',          price: 10000, estimatedDays: '2–3 hari', enabled: false, icon: '🚀' },
  { id: 'gosend',   name: 'GoSend Same Day',       price: 25000, estimatedDays: 'Hari ini', enabled: false, icon: '🛵' },
  { id: 'free',     name: 'Gratis Ongkir',         price: 0,     estimatedDays: '3–5 hari', enabled: false, icon: '🎁' },
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

export interface PaymentSettings {
  methods: PaymentMethod[];
  confirmationWhatsapp?: string;
  paymentNote?: string;
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
  addStore: (store: Store) => void;
  updateActiveStore: (patch: Partial<Store>) => void;
  generatedStore: Store | null;
  setGeneratedStore: (store: Store | null) => void;
  storeData: StoreData;
  generationState: GenerationState | null;
  setGenerationState: (state: GenerationState | null) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

const defaultStores: Store[] = [
  {
    id: 'store-1',
    name: 'Luxe Fashion',
    domain: 'luxe-fashion.storee.io',
    status: 'Published',
    primaryColor: '#ec4899',
    createdAt: '2024-01-15',
    category: 'Fashion',
    revenue: 12840,
    orders: 142,
    template: templates.find(t => t.id === 'fashion-luxe'),
  },
  {
    id: 'store-2',
    name: 'Coffee Artisan',
    domain: 'coffee-artisan.storee.io',
    status: 'Published',
    primaryColor: '#d97706',
    createdAt: '2024-02-20',
    category: 'Coffee',
    revenue: 5420,
    orders: 89,
    template: templates.find(t => t.id === 'coffee-artisan'),
  },
];

export function StoreProvider({ children }: { children: ReactNode }) {
  // Start with default values (safe for SSR — no sessionStorage access during render).
  // Pending store from sessionStorage is loaded in useEffect after hydration to
  // avoid the "server/client mismatch" hydration error.
  const [stores, setStores] = useState<Store[]>(defaultStores);
  const [activeStore, setActiveStore] = useState<Store>(defaultStores[0]);
  const [generatedStore, setGeneratedStore] = useState<Store | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState | null>(null);

  // After hydration: load any pending store from sessionStorage, then clear it.
  useEffect(() => {
    const pending = readPendingStore();
    if (pending) {
      setStores(prev => prev.find(s => s.id === pending.id) ? prev : [...prev, pending]);
      setActiveStore(pending);
      setGeneratedStore(pending);
    }
    sessionStorage.removeItem('storee_pending_store');
  }, []);

  const addStore = (store: Store) => {
    setStores(prev => [...prev, store]);
    setActiveStore(store);
  };

  const updateActiveStore = (patch: Partial<Store>) => {
    setActiveStore(prev => prev ? { ...prev, ...patch } : prev);
    setStores(prev => prev.map(s => s.id === activeStore?.id ? { ...s, ...patch } : s));
  };

  const storeData = useMemo(
    () => generateStoreData(activeStore),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeStore?.id, activeStore?.revenue, activeStore?.orders, activeStore?.template?.id]
  );

  return (
    <StoreContext.Provider value={{ stores, activeStore, setActiveStore, addStore, updateActiveStore, generatedStore, setGeneratedStore, storeData, generationState, setGenerationState }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}