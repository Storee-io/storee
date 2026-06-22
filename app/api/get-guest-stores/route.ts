import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const guestId = req.nextUrl.searchParams.get('guestId');

    if (!guestId) {
      return NextResponse.json({ error: 'Missing guestId' }, { status: 400 });
    }

    const db = createServerClient();

    // Fetch stores by guest_id
    const { data, error } = await db
      .from('published_stores')
      .select('*')
      .eq('guest_id', guestId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[get-guest-stores] error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Convert to Store format
    const stores = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      domain: row.subdomain ? `${row.subdomain}.storee.io` : '',
      status: 'Published',
      primaryColor: row.primary_color,
      createdAt: row.created_at,
      category: row.category,
      revenue: 0,
      orders: 0,
      template: null,
      design: row.design,
      currency: row.currency,
      language: row.language,
      font: row.font,
      mood: row.mood,
      audience: row.audience,
      shippingSettings: row.shipping_settings,
      paymentSettings: row.payment_settings,
      customDomain: row.custom_domain,
      publishedDomain: row.published_domain,
    }));

    return NextResponse.json({ stores });
  } catch (error) {
    console.error('[get-guest-stores] error:', error);
    return NextResponse.json({ error: 'Failed to fetch guest stores' }, { status: 500 });
  }
}
