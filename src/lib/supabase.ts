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
  },
});

export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? anonKey;
  return createClient(url, serviceKey);
}

// ── DB row ↔ Store shape ───────────────────────────────────────────────────────

interface StoreRow {
  id: string;
  user_id: string;
  name: string;
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
  shipping_settings: Store['shippingSettings'] | null;
  payment_settings: Store['paymentSettings'] | null;
  created_at: string;
  updated_at: string;
}

import { templates } from '../data/templates';

export function rowToStore(row: StoreRow): Store {
  return {
    id: row.id,
    name: row.name,
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
    shippingSettings: row.shipping_settings ?? undefined,
    paymentSettings: row.payment_settings ?? undefined,
  };
}

export function storeToRow(store: Store, userId: string): Omit<StoreRow, 'updated_at'> {
  return {
    id: store.id,
    user_id: userId,
    name: store.name,
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
    shipping_settings: store.shippingSettings ?? null,
    payment_settings: store.paymentSettings ?? null,
    created_at: store.createdAt,
  };
}

// ── Store CRUD ────────────────────────────────────────────────────────────────

export async function fetchUserStores(userId: string): Promise<Store[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[supabase] fetchUserStores:', error.message);
    return [];
  }
  return (data as StoreRow[]).map(rowToStore);
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
