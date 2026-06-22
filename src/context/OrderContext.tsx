'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Order, OrderItem } from '@/src/lib/supabase';
import { useStore } from './StoreContext';

interface OrderContextType {
  orders: Order[];
  isLoadingOrders: boolean;
  currentOrder: Order | null;
  loadOrders: (storeId: string) => Promise<void>;
  submitOrder: (storeId: string, order: Omit<Order, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>, items: Omit<OrderItem, 'id' | 'orderId' | 'createdAt'>[]) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
  setCurrentOrder: (order: Order | null) => void;
}

const OrderContext = createContext<OrderContextType | null>(null);

// Convert DB row to Order type
function rowToOrder(row: any): Order {
  return {
    id: row.id,
    storeId: row.store_id,
    customerId: row.customer_id ?? null,
    orderNumber: row.order_number ?? row.id,
    status: row.status,
    paymentMethod: row.payment_method,
    shippingMethod: row.shipping_method,
    subtotal: row.subtotal ?? 0,
    shippingCost: row.shipping_cost ?? 0,
    discount: row.discount ?? 0,
    total: row.total ?? 0,
    notes: row.notes ?? null,
    items: Array.isArray(row.items) ? row.items.map((item: any) => ({
      id: item.id,
      orderId: item.order_id ?? row.id,
      productId: item.product_id,
      productName: item.product_name ?? item.name,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
      createdAt: item.created_at,
    })) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const { activeStore } = useStore();

  const loadOrders = useCallback(async (storeId: string) => {
    setIsLoadingOrders(true);
    try {
      const response = await fetch(`/api/orders?storeId=${encodeURIComponent(storeId)}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      const { orders: rows } = await response.json();
      // Map raw DB rows to Order type
      setOrders((rows || []).map(rowToOrder));
    } catch (error) {
      console.error('[OrderContext] loadOrders:', error);
      setOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  // Auto-load orders when active store changes
  useEffect(() => {
    if (activeStore?.id) {
      loadOrders(activeStore.id);
    }
  }, [activeStore?.id, loadOrders]);

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
      const mapped = rowToOrder(created);
      setOrders(prev => [mapped, ...prev]);
      setCurrentOrder(mapped);
      return mapped;
    } catch (error) {
      console.error('[OrderContext] submitOrder:', error);
      return null;
    }
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, status: string) => {
    try {
      const response = await fetch(`/api/orders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status }),
      });

      if (!response.ok) throw new Error('Failed to update order');

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: status as Order['status'] } : o));
      if (currentOrder?.id === orderId) {
        setCurrentOrder({ ...currentOrder, status: status as Order['status'] });
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
