'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface WishlistContextType {
  wishlist: Set<string>;
  toggleWishlist: (productId: string) => void;
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const addToWishlist = useCallback((productId: string) => {
    setWishlist(prev => new Set(prev).add(productId));
  }, []);

  const removeFromWishlist = useCallback((productId: string) => {
    setWishlist(prev => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  }, []);

  const clearWishlist = useCallback(() => {
    setWishlist(new Set());
  }, []);

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, addToWishlist, removeFromWishlist, clearWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
}
