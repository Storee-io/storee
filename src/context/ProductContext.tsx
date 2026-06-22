'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '@/src/lib/supabase';

interface ProductContextType {
  products: Product[];
  isLoadingProducts: boolean;
  loadProducts: (storeId: string) => Promise<void>;
  addProduct: (storeId: string, product: Omit<Product, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>) => Promise<Product | null>;
  updateProduct: (storeId: string, product: Omit<Product, 'storeId' | 'createdAt' | 'updatedAt'>) => Promise<Product | null>;
  deleteProduct: (productId: string) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | null>(null);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const loadProducts = useCallback(async (storeId: string) => {
    setIsLoadingProducts(true);
    try {
      const response = await fetch(`/api/stores/${storeId}/products`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const { products } = await response.json();
      setProducts(products || []);
    } catch (error) {
      console.error('[ProductContext] loadProducts:', error);
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  const addProduct = useCallback(async (storeId: string, product: Omit<Product, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>): Promise<Product | null> => {
    try {
      const payload = {
        id: `prod_${Date.now()}`,
        ...product,
      };

      const response = await fetch(`/api/stores/${storeId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to create product');
      const { product: created } = await response.json();
      setProducts(prev => [...prev, created]);
      return created;
    } catch (error) {
      console.error('[ProductContext] addProduct:', error);
      return null;
    }
  }, []);

  const updateProduct = useCallback(async (storeId: string, product: Omit<Product, 'storeId' | 'createdAt' | 'updatedAt'>): Promise<Product | null> => {
    try {
      const response = await fetch(`/api/stores/${storeId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });

      if (!response.ok) throw new Error('Failed to update product');
      const { product: updated } = await response.json();
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      return updated;
    } catch (error) {
      console.error('[ProductContext] updateProduct:', error);
      return null;
    }
  }, []);

  const deleteProduct = useCallback(async (productId: string) => {
    try {
      await fetch(`/api/stores/products/${productId}`, {
        method: 'DELETE',
      });
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('[ProductContext] deleteProduct:', error);
    }
  }, []);

  return (
    <ProductContext.Provider value={{ products, isLoadingProducts, loadProducts, addProduct, updateProduct, deleteProduct }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within ProductProvider');
  }
  return context;
}
