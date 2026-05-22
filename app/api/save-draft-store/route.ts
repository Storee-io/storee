import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase';

export const runtime = 'nodejs';

/** POST /api/save-draft-store
 *  Body: { guestId: string, store: Store }
 *  Upserts the generated store into guest_stores (service-key, bypasses RLS).
 */
export async function POST(req: NextRequest) {
  try {
    const { guestId, store } = await req.json();

    if (!guestId || typeof guestId !== 'string') {
      return NextResponse.json({ error: 'Missing guestId' }, { status: 400 });
    }
    if (!store?.id) {
      return NextResponse.json({ error: 'Missing store' }, { status: 400 });
    }

    const db = createServerClient(); // service key — bypasses RLS
    const { error } = await db.from('guest_stores').upsert(
      {
        id: store.id,
        guest_id: guestId,
        store_data: store,
        // reset expiry on every save so recently-used stores stay alive
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'id' },
    );

    if (error) {
      console.warn('[save-draft-store] upsert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[save-draft-store]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** GET /api/save-draft-store?id=<storeId>
 *  Returns the store_data for a single guest store by ID.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const db = createServerClient();
  const { data, error } = await db
    .from('guest_stores')
    .select('store_data, expires_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Treat expired rows as not found
  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Expired' }, { status: 404 });
  }

  return NextResponse.json({ store: data.store_data });
}
