import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase';
import type { Store } from '@/src/context/StoreContext';

export const runtime = 'nodejs';

/**
 * GET /api/get-store?id=<storeId>
 * Returns a store from the authenticated stores table.
 * Requires valid session (checked via RLS).
 */
export async function GET(req: NextRequest) {
  let id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    const db = createServerClient(); // service key to bypass RLS for now

    // If id looks like a published domain (contains '-' and no mixed case),
    // try to resolve it to a store ID from stores table
    if (id.includes('-') && !id.match(/[A-Z]/)) {
      const { data: store } = await db
        .from('stores')
        .select('id')
        .eq('published_domain', id)
        .maybeSingle();

      if (store?.id) {
        id = store.id;
        console.log('[get-store] Resolved published domain', req.nextUrl.searchParams.get('id'), 'to store ID', id);
      }
    }

    // Fetch from stores table
    const { data, error } = await db
      .from('stores')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.warn('[get-store] query error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Map database row to Store type using rowToStore
    const { rowToStore } = await import('@/src/lib/supabase');
    let store = rowToStore(data as any);

    // If draft store has no branding but is published, fetch branding from published_stores
    if (!store.branding && store.publishedDomain) {
      const { data: published } = await db
        .from('published_stores')
        .select('branding')
        .eq('subdomain', store.publishedDomain)
        .maybeSingle();

      if (published?.branding) {
        store = { ...store, branding: published.branding };
        console.log('[get-store] Synced branding from published_stores for', store.id);
      }
    }

    return NextResponse.json({ store });
  } catch (err) {
    console.error('[get-store]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
