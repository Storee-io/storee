'use client';

import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Template } from '../data/templates';
import { templates } from '../data/templates';
import { generateStoreData } from '../data/storeDataGenerator';
import type { StoreData } from '../data/storeDataGenerator';
import type { StoreDesign } from '../lib/claudeApi';
import type { AdvancedOptions } from '../lib/claudeApiClient';
import { supabase, fetchUserStores, upsertStore, touchStoreLastUsed } from '../lib/supabase';

export type { StoreData };
export type { StoreDesign };
export type { AdvancedOptions };

export interface CheckoutSettings {
  contactFields: 'whatsapp' | 'email' | 'both'; // Which contact fields to show on checkout
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
  lastUsedAt?: string;
  category: string;
  revenue: number;
  orders: number;
  design?: StoreDesign;
  currency?: StoreCurrency;
  language?: string;
  shippingSettings?: ShippingSettings;
  paymentSettings?: PaymentSettings;
  checkoutSettings?: CheckoutSettings; // Customize checkout form (contact fields, etc.)
  publishedDomain?: string; // set once on first publish; used to lock URL on republish
  // Appearance preferences
  font?: string;
  mood?: string;
  audience?: string;
  // Original generation prompt — used by Regenerate flow
  prompt?: string;
  // Advanced options used during generation (mood, audience, themeColors, etc.)
  advancedOptions?: AdvancedOptions;
  // All variation preset IDs used so far — excluded on future regenerates so the same
  // design is never repeated (until all 17 have been used, then the pool resets).
  usedVariationIds?: number[];
  // Custom domain connected by the user (e.g. "mystore.com")
  customDomain?: string;
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

// ── Guest ID tracking ──────────────────────────────────────────────────────────
const GUEST_ID_KEY = 'storee_guest_id';

function getOrCreateGuestId(): string {
  try {
    let guestId = localStorage.getItem(GUEST_ID_KEY);
    if (!guestId) {
      guestId = `guest_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
      localStorage.setItem(GUEST_ID_KEY, guestId);
    }
    return guestId;
  } catch {
    return `guest_${Math.random().toString(36).substring(2, 15)}`;
  }
}

// ── Last-used tracking ────────────────────────────────────────────────────────
const LAST_USED_KEY = 'storee_last_used';
const ACTIVE_STORE_KEY = 'storee_active_store';

function readLastUsed(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LAST_USED_KEY) ?? '{}'); }
  catch { return {}; }
}

function writeLastUsed(storeId: string) {
  try {
    const map = readLastUsed();
    map[storeId] = new Date().toISOString();
    localStorage.setItem(LAST_USED_KEY, JSON.stringify(map));
  } catch { /* quota */ }
}

function getStoredActiveStore(): Store | null {
  try {
    const stored = localStorage.getItem(ACTIVE_STORE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveActiveStore(store: Store) {
  try {
    localStorage.setItem(ACTIVE_STORE_KEY, JSON.stringify(store));
  } catch { /* quota */ }
  writeActiveStoreCookie(store);
}

/**
 * Mirror the active store into a cookie so the server can render the correct
 * store name/status/domain during SSR — eliminating the "Dashboard" placeholder
 * flash on refresh. Only a slim subset is stored to stay well under the 4KB
 * cookie limit (the full store, incl. design, loads from Supabase after mount).
 */
function slimStoreForCookie(s: Store): Partial<Store> {
  return {
    id: s.id,
    name: s.name,
    domain: s.domain,
    status: s.status,
    primaryColor: s.primaryColor,
    createdAt: s.createdAt,
    category: s.category,
    revenue: s.revenue,
    orders: s.orders,
    currency: s.currency,
    publishedDomain: s.publishedDomain,
  };
}

function writeActiveStoreCookie(store: Store) {
  try {
    const val = encodeURIComponent(JSON.stringify(slimStoreForCookie(store)));
    // 1-year lifetime; Lax so it rides along on top-level navigations/refreshes.
    document.cookie = `${ACTIVE_STORE_KEY}=${val}; path=/; max-age=31536000; SameSite=Lax`;
  } catch { /* document unavailable / serialization error */ }
}

function sortByLastUsed(stores: Store[]): Store[] {
  const lastUsed = readLastUsed();
  return [...stores].sort((a, b) => {
    const ta = lastUsed[a.id] ?? a.createdAt ?? '1970-01-01';
    const tb = lastUsed[b.id] ?? b.createdAt ?? '1970-01-01';
    const timeA = new Date(ta).getTime();
    const timeB = new Date(tb).getTime();
    // Fallback if dates are invalid (NaN comparison always false, so equal order)
    if (isNaN(timeA) || isNaN(timeB)) return 0;
    return timeB - timeA;
  });
}

/**
 * Decide which store should be active after loading the store list.
 * The saved active store (ACTIVE_STORE_KEY) is the single source of truth — it
 * tracks the store the user last accessed (dashboard, preview, or editor).
 * Only fall back to most-recently-used when no valid saved store exists in the list.
 */
function pickActiveStore(stores: Store[]): Store | undefined {
  const saved = getStoredActiveStore();
  if (saved?.id) {
    const match = stores.find(s => s.id === saved.id);
    if (match) return match;
  }
  return sortByLastUsed(stores)[0];
}

function initializeActiveStore(): Store {
  // Try to restore from localStorage; fallback to DEMO_STORES[0]
  try {
    const stored = localStorage.getItem(ACTIVE_STORE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.id && parsed?.name) return parsed;
    }
  } catch {
    // localStorage unavailable or parse error
  }
  return DEMO_STORES[0];
}

/**
 * Merge a fresh store list from Supabase into the current list.
 * Preserves existing object references for stores whose display fields
 * (name, status, domain) haven't changed — so React sees no diff for
 * sidebar items that are visually identical, preventing unnecessary re-renders.
 */
function mergeStores(prev: Store[], next: Store[]): Store[] {
  const prevMap = new Map(prev.map(s => [s.id, s]));
  let changed = next.length !== prev.length;
  const merged = next.map(s => {
    const ex = prevMap.get(s.id);
    if (ex && ex.name === s.name && ex.status === s.status && ex.domain === s.domain) return ex;
    changed = true;
    return s;
  });
  return changed ? merged : prev; // same reference = no re-render
}

/**
 * Merge a fresh active store from Supabase into the current active store.
 * If the same store is already active (same ID), only update `design` —
 * identity fields (name, status, domain) from the cookie are already correct,
 * and replacing them would cause a sidebar re-render with no visual benefit.
 */
function mergeActiveStore(prev: Store | null, next: Store): Store {
  if (!prev || prev.id !== next.id) return next;      // different store — full replace
  if (prev.design === next.design) return prev;        // nothing changed — same reference
  return { ...prev, design: next.design };             // same store — only update design
}

function initializeStores(): Store[] {
  // Read all persisted stores from localStorage so the sidebar shows real stores
  // on first render instead of DEMO_STORES, eliminating the sidebar reload flash.
  try {
    if (typeof localStorage === 'undefined') return DEMO_STORES;
    const stores: Store[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('storee_store_')) continue;
      try {
        const s = JSON.parse(localStorage.getItem(key)!) as Store;
        if (s?.id && s?.name) stores.push(s);
      } catch { /* skip malformed */ }
    }
    // Also include active store if not already in list
    try {
      const active = localStorage.getItem(ACTIVE_STORE_KEY);
      if (active) {
        const s = JSON.parse(active) as Store;
        if (s?.id && s?.name && !stores.find(x => x.id === s.id)) stores.push(s);
      }
    } catch { /* skip */ }
    return stores.length > 0 ? sortByLastUsed(stores) : DEMO_STORES;
  } catch {
    return DEMO_STORES;
  }
}

export function StoreProvider({ children, initialActiveStore }: { children: ReactNode; initialActiveStore?: Store }) {
  const [stores, setStores] = useState<Store[]>(() => initializeStores());
  // SSR passes the active store from a cookie so server and client agree on the
  // first render (no hydration mismatch, no placeholder flash). When absent
  // (first visit), fall back to localStorage on the client / DEMO on the server.
  const [activeStore, setActiveStoreState] = useState<Store>(() => initialActiveStore ?? initializeActiveStore());
  const [prevStoreId, setPrevStoreId] = useState<string | null>(null);
  // If we have a store from the SSR cookie (initialActiveStore) or from localStorage,
  // start with false so static + data elements render immediately on refresh without
  // any skeleton flash. Only show skeleton when genuinely waiting for first-load data.
  const [isLoadingActiveStore, setIsLoadingActiveStore] = useState(!initialActiveStore);
  const [generatedStore, setGeneratedStore] = useState<Store | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState | null>(null);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // If we have a real store in localStorage (and no cookie was provided), stop skeleton immediately
  useEffect(() => {
    if (initialActiveStore) return; // already false from cookie
    try {
      const stored = localStorage.getItem(ACTIVE_STORE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id && parsed?.name) {
          setIsLoadingActiveStore(false);
        }
      }
    } catch {
      // localStorage error, keep skeleton loading
    }
  }, [initialActiveStore]);

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

  async function loadGuestStores() {
    try {
      const guestStores: Store[] = [];

      // 1. Load from localStorage (always available)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith('storee_store_')) continue;
        try {
          const s = JSON.parse(localStorage.getItem(key)!) as Store;
          if (s?.id && s?.name) guestStores.push(s);
        } catch { /* skip malformed */ }
      }

      // Also check active store key — it's the "currently editing" store that may not have storee_store_* yet
      try {
        const active = localStorage.getItem(ACTIVE_STORE_KEY);
        if (active) {
          const s = JSON.parse(active) as Store;
          if (s?.id && s?.name && !guestStores.find(x => x.id === s.id)) {
            guestStores.push(s);
          }
        }
      } catch { /* skip malformed */ }

      // 2. Load from Supabase using guest_id (for cloud persistence)
      try {
        const guestId = getOrCreateGuestId();
        const response = await fetch(`/api/get-guest-stores?guestId=${encodeURIComponent(guestId)}`);
        if (response.ok) {
          const { stores: supabaseStores } = await response.json();
          // Merge: Supabase stores + localStorage stores (Supabase as source of truth)
          for (const store of supabaseStores) {
            if (!guestStores.find(s => s.id === store.id)) {
              guestStores.push(store);
            }
          }
        }
      } catch (err) {
        console.warn('[loadGuestStores] Failed to fetch from Supabase:', err);
        // Fallback to localStorage only
      }

      if (guestStores.length > 0) {
        const sorted = sortByLastUsed(guestStores);
        setStores(prev => mergeStores(prev, sorted));
        // Honor the store the user last accessed (ACTIVE_STORE_KEY); only fall
        // back to most-recently-used when that store isn't in the list.
        const active = pickActiveStore(sorted) ?? sorted[0];
        setActiveStoreState(prev => mergeActiveStore(prev, active));
        setPrevStoreId(active.id);
        saveActiveStore(active);
        writeLastUsed(active.id);  // Dashboard view counts as accessing the store
        // Store loaded — hide skeleton
        setIsLoadingActiveStore(false);
      } else {
        setStores(DEMO_STORES);
        setActiveStoreState(DEMO_STORES[0]);
        setPrevStoreId(DEMO_STORES[0]?.id ?? null);
        saveActiveStore(DEMO_STORES[0]);
        writeLastUsed(DEMO_STORES[0].id);
        // Store loaded — hide skeleton
        setIsLoadingActiveStore(false);
      }
    } catch (err) {
      console.error('[loadGuestStores] error:', err);
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
        const sorted = sortByLastUsed(userStores);
        setStores(prev => mergeStores(prev, sorted));
        // Honor the store the user last accessed; fall back to most-recently-used.
        const active = pickActiveStore(sorted) ?? sorted[0];
        setActiveStoreState(prev => mergeActiveStore(prev, active));
        setPrevStoreId(active.id);
        saveActiveStore(active);
        setIsLoadingActiveStore(false);
      } else {
        setStores([]);
        setActiveStoreState(DEMO_STORES[0]);
        setPrevStoreId(DEMO_STORES[0]?.id ?? null);
        saveActiveStore(DEMO_STORES[0]);
        setIsLoadingActiveStore(false);
      }
    } catch {
      // Supabase unavailable — fall back to guest stores
      loadGuestStores();
    }
    setIsLoadingStores(false);
  }

  const setActiveStore = useCallback((store: Store) => {
    // Show skeleton only if switching to a different store
    if (store.id !== prevStoreId) {
      setIsLoadingActiveStore(true);
      setPrevStoreId(store.id);
    }
    // Update last_used_at — Supabase for logged-in users, localStorage for guests
    if (userId) {
      touchStoreLastUsed(store.id).catch(() => {}); // fire-and-forget
    } else {
      writeLastUsed(store.id);
    }
    setActiveStoreState(store);
    saveActiveStore(store);
    setStores(prev => sortByLastUsed(prev));
  }, [userId, prevStoreId]);

  const addStore = useCallback(async (store: Store) => {
    // Optimistic update — mark as just used so it sorts to top
    writeLastUsed(store.id);
    setStores(prev => sortByLastUsed(prev.find(s => s.id === store.id) ? prev : [...prev, store]));
    setActiveStoreState(store);
    saveActiveStore(store);

    // Persist to localStorage (for all users)
    try { localStorage.setItem(`storee_store_${store.id}`, JSON.stringify(store)); } catch { /* quota */ }

    // Persist to Supabase
    if (userId) {
      // Authenticated user
      await upsertStore(store, userId);
    } else {
      // Guest user - save to Supabase with guest_id
      const guestId = getOrCreateGuestId();
      try {
        await fetch('/api/save-guest-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ store, guestId }),
        });
      } catch (err) {
        console.warn('[StoreContext] Failed to save guest store to Supabase:', err);
        // Don't block - localStorage fallback is already saved
      }
    }

    // Auto-save products for all users
    try {
      const storeData = generateStoreData(store);
      if (storeData.products && storeData.products.length > 0) {
        for (const product of storeData.products) {
          await fetch(`/api/stores/${store.id}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: product.id,
              name: product.name,
              price: product.price,
              originalPrice: product.originalPrice,
              description: product.description,
              category: product.category,
              badge: product.badge,
              image: product.image,
              imageFallback: product.imageFallback,
              collectionId: product.collectionId,
              stock: 50,
            }),
          });
        }
      }
    } catch (err) {
      console.warn('[StoreContext] Failed to auto-save products:', err);
      // Don't block store creation if product save fails
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
      // Save to ACTIVE_STORE_KEY for persistence across page reloads
      saveActiveStore(updated);
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
    // Include design — when the SSR-provided slim store (no design) is replaced
    // by the full store loaded from Supabase, design.products becomes available
    // and the dashboard data must recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeStore?.id, activeStore?.revenue, activeStore?.orders, activeStore?.template?.id, activeStore?.design]
  );

  // Turn off loading skeleton once data is ready
  useEffect(() => {
    if (isLoadingActiveStore) {
      setIsLoadingActiveStore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeData]);

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
      isLoadingActiveStore,
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
