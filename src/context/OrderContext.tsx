'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Order, OrderItem } from '@/src/lib/supabase';
import { useStore } from './StoreContext';

interface OrderContextType {
  orders: OrderRow[];
  isLoadingOrders: boolean;
  currentOrder: OrderRow | null;
  loadOrders: (storeId: string) => Promise<void>;
  submitOrder: (storeId: string, order: Omit<Order, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>, items: Omit<OrderItem, 'id' | 'orderId' | 'createdAt'>[]) => Promise<OrderRow | null>;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
  setCurrentOrder: (order: OrderRow | null) => void;
}

const OrderContext = createContext<OrderContextType | null>(null);

// Extended order type that carries customer/shipping fields from DB rows
export interface OrderRow extends Order {
  customerName?: string;
  customerEmail?: string;
  customerWhatsapp?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingProvince?: string;
  shippingPostal?: string;
}

// Convert DB row to OrderRow (superset of Order type)
function rowToOrder(row: any): OrderRow {
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
    customerName: row.customer_name ?? undefined,
    customerEmail: row.customer_email ?? undefined,
    customerWhatsapp: row.customer_whatsapp ?? undefined,
    shippingAddress: row.shipping_address ?? undefined,
    shippingCity: row.shipping_city ?? undefined,
    shippingProvince: row.shipping_province ?? undefined,
    shippingPostal: row.shipping_postal ?? undefined,
    items: Array.isArray(row.items) ? row.items.map((item: any) => ({
      id: item.id ?? item.product_id,
      orderId: row.id,
      productId: item.product_id ?? item.id,
      productName: item.product_name ?? item.name ?? 'Product',
      price: item.price ?? 0,
      quantity: item.quantity ?? item.qty ?? 1,
      subtotal: item.subtotal ?? ((item.price ?? 0) * (item.quantity ?? item.qty ?? 1)),
      createdAt: item.created_at ?? row.created_at,
    })) : [],
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  };
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderRow | null>(null);
  const { activeStore } = useStore();

  const loadOrders = useCallback(async (storeId: string) => {
    setIsLoadingOrders(true);
    try {
      const response = await fetch(`/api/orders?storeId=${encodeURIComponent(storeId)}`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API ${response.status}: ${text}`);
      }
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
