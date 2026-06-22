'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Order, OrderItem } from '@/src/lib/supabase';
import { useCart } from './CartContext';
import { supabase } from '@/src/lib/supabase';

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

// Convert DB row to Order type
function rowToOrder(row: any): Order {
  return {
    id: row.id,
    storeId: row.store_id,
    customerId: row.customer_id,
    orderNumber: row.order_number,
    status: row.status,
    paymentMethod: row.payment_method,
    shippingMethod: row.shipping_method,
    subtotal: row.subtotal,
    shippingCost: row.shipping_cost,
    discount: row.discount,
    total: row.total,
    notes: row.notes,
    items: (row.order_items || []).map((item: any) => ({
      id: item.id,
      orderId: item.order_id,
      productId: item.product_id,
      productName: item.product_name,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
      createdAt: item.created_at,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const subscriptionRef = useRef<any>(null);

  const loadOrders = useCallback(async (storeId: string) => {
    setIsLoadingOrders(true);
    try {
      const response = await fetch(`/api/stores/${storeId}/orders`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      const { orders } = await response.json();
      setOrders(orders || []);

      // Setup realtime subscription for this store's orders
      subscriptionRef.current = supabase
        .channel(`orders:${storeId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `store_id=eq.${storeId}`,
          },
          (payload) => {
            console.log('[OrderContext] Realtime update:', payload);
            if (payload.eventType === 'INSERT') {
              // New order placed
              const newOrder = rowToOrder(payload.new);
              setOrders(prev => [newOrder, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              // Order updated (status change, etc)
              const updatedOrder = rowToOrder(payload.new);
              setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
              if (currentOrder?.id === updatedOrder.id) {
                setCurrentOrder(updatedOrder);
              }
            } else if (payload.eventType === 'DELETE') {
              // Order deleted
              setOrders(prev => prev.filter(o => o.id !== payload.old.id));
            }
          }
        )
        .subscribe();
    } catch (error) {
      console.error('[OrderContext] loadOrders:', error);
      setOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [currentOrder?.id]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
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
