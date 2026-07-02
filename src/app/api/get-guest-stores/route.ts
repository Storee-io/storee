import { createServerClient } from '@/src/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import type { Store } from '@/src/context/StoreContext';

interface GuestStoreRow {
  id: string;
  guest_id: string;
  store_data: Store;
  created_at: string;
}

export async function GET(req: NextRequest) {
  try {
    const guestId = req.nextUrl.searchParams.get('guestId');

    if (!guestId) {
      return NextResponse.json({ stores: [] }, { status: 200 });
    }

    const supabase = createServerClient();

    // Try to fetch from guest_stores table
    const { data, error } = await supabase
      .from('guest_stores')
      .select('store_data')
      .eq('guest_id', guestId);

    if (error) {
      console.warn('[get-guest-stores] Table might not exist:', error.message);
      // Fallback: return empty array (stores will load from localStorage)
      return NextResponse.json({ stores: [] }, { status: 200 });
    }

    const stores = (data as GuestStoreRow[] | null)?.map(row => row.store_data) ?? [];
    return NextResponse.json({ stores }, { status: 200 });
  } catch (error) {
    console.error('[get-guest-stores] Exception:', error);
    return NextResponse.json({ stores: [] }, { status: 200 });
  }
}
