'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '@/src/lib/supabase';
import { supabase } from '@/src/lib/supabase';

interface ProductContextType {
  products: Product[];
  isLoadingProducts: boolean;
  loadProducts: (storeId: string) => Promise<void>;
  addProduct: (storeId: string, product: Omit<Product, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>) => Promise<Product | null>;
  updateProduct: (storeId: string, product: Omit<Product, 'storeId' | 'createdAt' | 'updatedAt'>) => Promise<Product | null>;
  deleteProduct: (productId: string) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | null>(null);

// Convert DB row to Product type
function rowToProduct(row: any): Product {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    price: row.price,
    originalPrice: row.original_price,
    description: row.description,
    category: row.category,
    badge: row.badge,
    image: row.image,
    imageFallback: row.image_fallback,
    collectionId: row.collection_id,
    nameHtml: row.name_html,
    categoryHtml: row.category_html,
    descriptionHtml: row.description_html,
    badgeHtml: row.badge_html,
    priceHtml: row.price_html,
    stock: row.stock,
    sku: row.sku,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const subscriptionRef = useRef<any>(null);

  const loadProducts = useCallback(async (storeId: string) => {
    setIsLoadingProducts(true);
    try {
      const response = await fetch(`/api/stores/${storeId}/products`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const { products } = await response.json();
      setProducts(products || []);

      // Setup realtime subscription for this store
      subscriptionRef.current = supabase
        .channel(`products:${storeId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products',
            filter: `store_id=eq.${storeId}`,
          },
          (payload) => {
            console.log('[ProductContext] Realtime update:', payload);
            if (payload.eventType === 'INSERT') {
              const newProduct = rowToProduct(payload.new);
              setProducts(prev => [...prev, newProduct]);
            } else if (payload.eventType === 'UPDATE') {
              const updatedProduct = rowToProduct(payload.new);
              setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
            } else if (payload.eventType === 'DELETE') {
              setProducts(prev => prev.filter(p => p.id !== payload.old.id));
            }
          }
        )
        .subscribe();
    } catch (error) {
      console.error('[ProductContext] loadProducts:', error);
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
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
