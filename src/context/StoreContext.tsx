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
    domain: 'luxe-fashion.storee.co',
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
    domain: 'coffee-artisan.storee.co',
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
  // If a store was AI-generated on the home page (saved to sessionStorage),
  // initialize all three states from it so the dashboard shows the correct data.
  // readPendingStore() is idempotent (does not delete), so calling it 3x is safe.
  // The item is removed after mount via useEffect below.
  const [stores, setStores] = useState<Store[]>(() => {
    const pending = readPendingStore();
    return pending ? [...defaultStores, pending] : defaultStores;
  });
  const [activeStore, setActiveStore] = useState<Store>(() =>
    readPendingStore() ?? defaultStores[0]
  );
  const [generatedStore, setGeneratedStore] = useState<Store | null>(() =>
    readPendingStore()
  );
  const [generationState, setGenerationState] = useState<GenerationState | null>(null);

  // Clean up sessionStorage after states are initialized (runs once per mount).
  // This ensures a fresh read on the next StoreProvider mount (e.g. user goes back
  // to home, generates a new store, then navigates to /preview again).
  useEffect(() => {
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