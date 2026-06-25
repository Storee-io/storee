import { createClient } from '@supabase/supabase-js';
import type { Store } from '../context/StoreContext';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey, {
  auth: {
    // Don't schedule background token-refresh timers — they cause
    // "Failed to fetch" noise when the project is paused or offline.
    // Sessions are still read on mount via getSession().
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ── Dev-only: silence transient Supabase "Failed to fetch" console noise ───────
// In Next.js/Turbopack dev, in-flight auth requests get aborted on HMR remounts
// (and React StrictMode double-mount). Supabase's internal `retryable` logic logs
// each aborted attempt via console.error — one abort balloons into ~10 lines that
// clutter the dev overlay. The session itself is unaffected (refresh returns 200).
// Filter ONLY this specific GoTrue fetch-failure noise, in dev, in the browser.
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const isSupabaseFetchNoise = args.some(a => {
      const msg = a instanceof Error ? `${a.message}\n${a.stack ?? ''}` : String(a);
      return (
        msg.includes('Failed to fetch') &&
        (msg.includes('SupabaseAuthClient') ||
          msg.includes('_callRefreshToken') ||
          msg.includes('_refreshAccessToken') ||
          msg.includes('_handleRequest') ||
          msg.includes('_request'))
      );
    });
    if (isSupabaseFetchNoise) return; // drop only this known, non-critical noise
    origError(...args);
  };
}

export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? anonKey;
  return createClient(url, serviceKey);
}

// ── DB row ↔ Store shape ───────────────────────────────────────────────────────

interface StoreRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  email: string | null;
  domain: string;
  status: string;
  primary_color: string;
  category: string;
  revenue: number;
  orders: number;
  template_id: string | null;
  design: Store['design'] | null;
  currency: Store['currency'] | null;
  language: string | null;
  font: string | null;
  mood: string | null;
  audience: string | null;
  shipping_settings: Store['shippingSettings'] | null;
  payment_settings: Store['paymentSettings'] | null;
  checkout_settings: Store['checkoutSettings'] | null;
  custom_domain: string | null;
  published_domain: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

import { templates } from '../data/templates';

export function rowToStore(row: StoreRow): Store {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    email: row.email ?? undefined,
    domain: row.domain,
    status: row.status as Store['status'],
    primaryColor: row.primary_color,
    category: row.category,
    revenue: row.revenue,
    orders: row.orders,
    createdAt: row.created_at,
    template: row.template_id ? templates.find(t => t.id === row.template_id) : undefined,
    design: row.design ?? undefined,
    currency: row.currency ?? undefined,
    language: row.language ?? undefined,
    font: row.font ?? undefined,
    mood: row.mood ?? undefined,
    audience: row.audience ?? undefined,
    shippingSettings: row.shipping_settings ?? undefined,
    paymentSettings: row.payment_settings ?? undefined,
    checkoutSettings: row.checkout_settings ?? undefined,
    customDomain: row.custom_domain ?? undefined,
    publishedDomain: row.published_domain ?? undefined,
    lastUsedAt: row.last_used_at ?? undefined,
  };
}

export function storeToRow(store: Store, userId: string): Omit<StoreRow, 'updated_at'> {
  return {
    id: store.id,
    user_id: userId,
    name: store.name,
    description: store.description ?? null,
    email: store.email ?? null,
    domain: store.domain,
    status: store.status,
    primary_color: store.primaryColor,
    category: store.category,
    revenue: store.revenue,
    orders: store.orders,
    template_id: store.template?.id ?? null,
    design: store.design ?? null,
    currency: store.currency ?? null,
    language: store.language ?? null,
    font: store.font ?? null,
    mood: store.mood ?? null,
    audience: store.audience ?? null,
    shipping_settings: store.shippingSettings ?? null,
    payment_settings: store.paymentSettings ?? null,
    checkout_settings: store.checkoutSettings ?? null,
    custom_domain: store.customDomain ?? null,
    published_domain: store.publishedDomain ?? null,
    created_at: store.createdAt,
    last_used_at: store.lastUsedAt ?? null,
  };
}

// ── Store CRUD ────────────────────────────────────────────────────────────────

export async function fetchUserStores(userId: string): Promise<Store[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[supabase] fetchUserStores:', error.message);
    return [];
  }
  return (data as StoreRow[]).map(rowToStore);
}

export async function touchStoreLastUsed(storeId: string): Promise<void> {
  await supabase
    .from('stores')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', storeId);
}

export async function upsertStore(store: Store, userId: string): Promise<void> {
  const row = storeToRow(store, userId);
  const { error } = await supabase
    .from('stores')
    .upsert(row, { onConflict: 'id' });

  if (error) console.warn('[supabase] upsertStore:', error.message);
}

export async function deleteStoreById(storeId: string): Promise<void> {
  const { error } = await supabase
    .from('stores')
    .delete()
    .eq('id', storeId);

  if (error) console.warn('[supabase] deleteStore:', error.message);
}

// ── Products ──────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  storeId: string;
  name: string;
  price: number;
  originalPrice?: number;
  description?: string;
  category?: string;
  badge?: string;
  image?: string;
  imageFallback?: string;
  collectionId?: string;
  nameHtml?: string;
  categoryHtml?: string;
  descriptionHtml?: string;
  badgeHtml?: string;
  priceHtml?: string;
  stock?: number;
  sku?: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchStoreProducts(storeId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId);

  if (error) {
    console.warn('[supabase] fetchStoreProducts:', error.message);
    return [];
  }

  return (data || []).map(row => ({
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
  }));
}

export async function upsertProduct(storeId: string, product: Omit<Product, 'storeId' | 'createdAt' | 'updatedAt'>): Promise<Product | null> {
  const row = {
    id: product.id,
    store_id: storeId,
    name: product.name,
    price: product.price,
    original_price: product.originalPrice,
    description: product.description,
    category: product.category,
    badge: product.badge,
    image: product.image,
    image_fallback: product.imageFallback,
    collection_id: product.collectionId,
    name_html: product.nameHtml,
    category_html: product.categoryHtml,
    description_html: product.descriptionHtml,
    badge_html: product.badgeHtml,
    price_html: product.priceHtml,
    stock: product.stock,
    sku: product.sku,
  };

  const { data, error } = await supabase
    .from('products')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.warn('[supabase] upsertProduct:', error.message);
    return null;
  }

  return data ? {
    id: data.id,
    storeId: data.store_id,
    name: data.name,
    price: data.price,
    originalPrice: data.original_price,
    description: data.description,
    category: data.category,
    badge: data.badge,
    image: data.image,
    imageFallback: data.image_fallback,
    collectionId: data.collection_id,
    nameHtml: data.name_html,
    categoryHtml: data.category_html,
    descriptionHtml: data.description_html,
    badgeHtml: data.badge_html,
    priceHtml: data.price_html,
    stock: data.stock,
    sku: data.sku,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } : null;
}

export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) console.warn('[supabase] deleteProduct:', error.message);
}

// ── Customers ─────────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  storeId: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchStoreCustomers(storeId: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[supabase] fetchStoreCustomers:', error.message);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    storeId: row.store_id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    address: row.address,
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    country: row.country,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function upsertCustomer(storeId: string, customer: Omit<Customer, 'storeId' | 'createdAt' | 'updatedAt'>): Promise<Customer | null> {
  const row = {
    id: customer.id,
    store_id: storeId,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    province: customer.province,
    postal_code: customer.postalCode,
    country: customer.country,
    notes: customer.notes,
  };

  const { data, error } = await supabase
    .from('customers')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.warn('[supabase] upsertCustomer:', error.message);
    return null;
  }

  return data ? {
    id: data.id,
    storeId: data.store_id,
    email: data.email,
    name: data.name,
    phone: data.phone,
    address: data.address,
    city: data.city,
    province: data.province,
    postalCode: data.postal_code,
    country: data.country,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } : null;
}

// ── Orders ────────────────────────────────────────────────────────────────────
export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
  createdAt: string;
}

export interface Order {
  id: string;
  storeId: string;
  customerId?: string;
  orderNumber: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod?: string;
  shippingMethod?: string;
  subtotal: number;
  shippingCost?: number;
  discount?: number;
  total: number;
  notes?: string;
  items?: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export async function fetchStoreOrders(storeId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (*)
    `)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[supabase] fetchStoreOrders:', error.message);
    return [];
  }

  return (data || []).map(row => ({
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
  }));
}

export async function createOrder(storeId: string, order: Omit<Order, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>, items: Omit<OrderItem, 'id' | 'orderId' | 'createdAt'>[]): Promise<Order | null> {
  // Create order
  const orderRow = {
    store_id: storeId,
    customer_id: order.customerId,
    order_number: order.orderNumber,
    status: order.status,
    payment_method: order.paymentMethod,
    shipping_method: order.shippingMethod,
    subtotal: order.subtotal,
    shipping_cost: order.shippingCost,
    discount: order.discount,
    total: order.total,
    notes: order.notes,
  };

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert([orderRow])
    .select()
    .single();

  if (orderError) {
    console.warn('[supabase] createOrder:', orderError.message);
    return null;
  }

  // Create order items
  const itemRows = items.map(item => ({
    order_id: orderData.id,
    product_id: item.productId,
    product_name: item.productName,
    price: item.price,
    quantity: item.quantity,
    subtotal: item.subtotal,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemRows);

  if (itemsError) {
    console.warn('[supabase] createOrder items:', itemsError.message);
  }

  // Return full order with items
  return {
    id: orderData.id,
    storeId: orderData.store_id,
    customerId: orderData.customer_id,
    orderNumber: orderData.order_number,
    status: orderData.status,
    paymentMethod: orderData.payment_method,
    shippingMethod: orderData.shipping_method,
    subtotal: orderData.subtotal,
    shippingCost: orderData.shipping_cost,
    discount: orderData.discount,
    total: orderData.total,
    notes: orderData.notes,
    items: itemRows.map((item, i) => ({
      id: `temp-${i}`,
      orderId: orderData.id,
      productId: item.product_id,
      productName: item.product_name,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
      createdAt: new Date().toISOString(),
    })),
    createdAt: orderData.created_at,
    updatedAt: orderData.updated_at,
  };
}

export async function updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) console.warn('[supabase] updateOrderStatus:', error.message);
}
