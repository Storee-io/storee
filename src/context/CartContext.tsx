'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { RichProduct } from '@/src/lib/claudeApi';

export interface CartItem {
  product: RichProduct;
  qty: number;
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: RichProduct, sourceRect?: DOMRect) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, delta: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children, storeId }: { children: React.ReactNode; storeId?: string }) {
  const cartKey = storeId ? `storee_cart_${storeId}` : null;

  const [cart, setCart] = useState<CartItem[]>(() => {
    if (!cartKey || typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(cartKey) ?? '[]'); } catch { return []; }
  });

  // Persist cart to localStorage
  useEffect(() => {
    if (!cartKey) return;
    try { localStorage.setItem(cartKey, JSON.stringify(cart)); } catch {}
  }, [cart, cartKey]);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  const addToCart = useCallback((product: RichProduct) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i => i.product.id === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
        .filter(i => i.qty > 0)
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  return (
    <CartContext.Provider value={{ cart, cartCount, cartTotal, addToCart, removeFromCart, updateQty, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
