import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { store, guestId } = await req.json();

    if (!store || !guestId) {
      return NextResponse.json({ error: 'Missing store or guestId' }, { status: 400 });
    }

    const db = createServerClient();

    // Save to guest_stores table (store data for unauthenticated users)
    // Guest stores expire after 30 days of inactivity
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await db.from('guest_stores').upsert({
      id: store.id,
      guest_id: guestId,
      store_data: store,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    });

    if (error) {
      console.error('[save-guest-store] error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, storeId: store.id });
  } catch (error) {
    console.error('[save-guest-store] error:', error);
    return NextResponse.json({ error: 'Failed to save guest store' }, { status: 500 });
  }
}
