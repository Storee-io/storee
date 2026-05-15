'use client';

import { createContext, useContext, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Template } from '../data/templates';
import { templates } from '../data/templates';
import { generateStoreData } from '../data/storeDataGenerator';
import type { StoreData } from '../data/storeDataGenerator';
import type { StoreDesign } from '../lib/claudeApi';

export type { StoreData };
export type { StoreDesign };

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
}

interface StoreContextType {
  stores: Store[];
  activeStore: Store | null;
  setActiveStore: (store: Store) => void;
  addStore: (store: Store) => void;
  generatedStore: Store | null;
  setGeneratedStore: (store: Store | null) => void;
  storeData: StoreData;
}

const StoreContext = createContext<StoreContextType | null>(null);

const defaultStores: Store[] = [
  {
    id: 'store-1',
    name: 'Luxe Fashion',
    domain: 'luxe-fashion.storee.app',
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
    domain: 'coffee-artisan.storee.app',
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
  const [stores, setStores] = useState<Store[]>(defaultStores);
  const [activeStore, setActiveStore] = useState<Store>(defaultStores[0]);
  const [generatedStore, setGeneratedStore] = useState<Store | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const pending = sessionStorage.getItem('storee_pending_store');
      if (!pending) return null;
      sessionStorage.removeItem('storee_pending_store');
      return JSON.parse(pending) as Store;
    } catch {
      return null;
    }
  });

  const addStore = (store: Store) => {
    setStores(prev => [...prev, store]);
    setActiveStore(store);
  };

  const storeData = useMemo(
    () => generateStoreData(activeStore),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeStore?.id, activeStore?.revenue, activeStore?.orders]
  );

  return (
    <StoreContext.Provider value={{ stores, activeStore, setActiveStore, addStore, generatedStore, setGeneratedStore, storeData }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
