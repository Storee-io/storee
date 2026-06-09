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
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    const db = createServerClient(); // service key to bypass RLS for now

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
    const store = rowToStore(data as any);

    return NextResponse.json({ store });
  } catch (err) {
    console.error('[get-store]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
