import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    id, storeId, storeSubdomain,
    customerName, customerEmail, customerWhatsapp,
    shippingAddress, shippingCity, shippingProvince, shippingPostal,
    shippingMethod, shippingCost,
    paymentMethod,
    subtotal, total,
    items,
    status = 'Processing',
    buyerUserId,
  } = body;

  if (!id || !storeId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Use service-role client to bypass RLS for the insert
  const db = createServerClient();

  const { error } = await db.from('orders').insert({
    id,
    store_id: storeId,
    store_subdomain: storeSubdomain ?? null,
    customer_name: customerName ?? null,
    customer_email: customerEmail ?? null,
    customer_whatsapp: customerWhatsapp ?? null,
    shipping_address: shippingAddress ?? null,
    shipping_city: shippingCity ?? null,
    shipping_province: shippingProvince ?? null,
    shipping_postal: shippingPostal ?? null,
    shipping_method: shippingMethod ?? null,
    shipping_cost: shippingCost ?? 0,
    payment_method: paymentMethod ?? null,
    subtotal: subtotal ?? 0,
    total: total ?? 0,
    items: items ?? [],
    status,
    buyer_user_id: buyerUserId ?? null,
  });

  if (error) {
    console.error('[orders] insert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, orderId: id });
}

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId');
  const buyerUserId = req.nextUrl.searchParams.get('buyerUserId');

  if (!storeId && !buyerUserId) {
    return NextResponse.json({ error: 'Missing storeId or buyerUserId' }, { status: 400 });
  }

  try {
    const db = createServerClient();
    let query = db.from('orders').select('*').order('created_at', { ascending: false });

    if (storeId) query = query.eq('store_id', storeId);
    if (buyerUserId) query = query.eq('buyer_user_id', buyerUserId);

    const { data, error } = await query;
    if (error) {
      console.error('[GET /api/orders] Supabase error:', error.message, error.code);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ orders: data || [] });
  } catch (err) {
    console.error('[GET /api/orders] Exception:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });

  const db = createServerClient();
  const { error } = await db
    .from('orders')
    .update({ status })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
