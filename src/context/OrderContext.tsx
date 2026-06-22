'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Order, OrderItem } from '@/src/lib/supabase';
import { useCart } from './CartContext';

interface OrderContextType {
  orders: Order[];
  isLoadingOrders: boolean;
  currentOrder: Order | null;
  loadOrders: (storeId: string) => Promise<void>;
  submitOrder: (storeId: string, order: Omit<Order, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>, items: Omit<OrderItem, 'id' | 'orderId' | 'createdAt'>[]) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  setCurrentOrder: (order: Order | null) => void;
}

const OrderContext = createContext<OrderContextType | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  const loadOrders = useCallback(async (storeId: string) => {
    setIsLoadingOrders(true);
    try {
      const response = await fetch(`/api/stores/${storeId}/orders`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      const { orders } = await response.json();
      setOrders(orders || []);
    } catch (error) {
      console.error('[OrderContext] loadOrders:', error);
      setOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  const submitOrder = useCallback(async (
    storeId: string,
    order: Omit<Order, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>,
    items: Omit<OrderItem, 'id' | 'orderId' | 'createdAt'>[]
  ): Promise<Order | null> => {
    try {
      const response = await fetch(`/api/stores/${storeId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order, items }),
      });

      if (!response.ok) throw new Error('Failed to create order');
      const { order: created } = await response.json();
      setOrders(prev => [created, ...prev]);
      setCurrentOrder(created);
      return created;
    } catch (error) {
      console.error('[OrderContext] submitOrder:', error);
      return null;
    }
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, status: Order['status']) => {
    try {
      const response = await fetch(`/api/stores/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update order');

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      if (currentOrder?.id === orderId) {
        setCurrentOrder({ ...currentOrder, status });
      }
    } catch (error) {
      console.error('[OrderContext] updateOrderStatus:', error);
    }
  }, [currentOrder]);

  return (
    <OrderContext.Provider value={{ orders, isLoadingOrders, currentOrder, loadOrders, submitOrder, updateOrderStatus, setCurrentOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }
  return context;
}
