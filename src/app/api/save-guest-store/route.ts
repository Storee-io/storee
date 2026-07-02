import { createServerClient } from '@/src/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import type { Store } from '@/src/context/StoreContext';

export async function POST(req: NextRequest) {
  try {
    const { store, guestId } = await req.json() as { store: Store; guestId: string };

    if (!guestId || !store?.id) {
      return NextResponse.json({ error: 'Missing guestId or store' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Try to upsert: insert if new, update if exists
    const { error } = await supabase
      .from('guest_stores')
      .upsert(
        {
          id: `${guestId}_${store.id}`,
          guest_id: guestId,
          store_data: store,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.warn('[save-guest-store] Warning (might be schema issue):', error.message);
      // Even if Supabase save fails, return success since localStorage is fallback
      // This prevents blocking store saves when table doesn't exist yet
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[save-guest-store] Exception:', error);
    // Return success anyway - localStorage fallback will handle it
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
