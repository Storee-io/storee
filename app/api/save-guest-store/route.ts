import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { store, guestId } = await req.json();

    if (!store || !guestId) {
      return NextResponse.json({ error: 'Missing store or guestId' }, { status: 400 });
    }

    const db = createServerClient();

    // Save to published_stores table with guest_id
    const { error } = await db.from('published_stores').upsert({
      id: store.id,
      subdomain: store.domain.replace('.storee.io', ''),
      name: store.name,
      primary_color: store.primaryColor,
      category: store.category,
      template_id: store.template?.id || null,
      design: store.design || null,
      currency: store.currency || null,
      language: store.language || null,
      font: store.font || null,
      mood: store.mood || null,
      audience: store.audience || null,
      shipping_settings: store.shippingSettings || null,
      payment_settings: store.paymentSettings || null,
      custom_domain: store.customDomain || null,
      published_domain: store.publishedDomain || null,
      guest_id: guestId,
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
