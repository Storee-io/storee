import { NextRequest, NextResponse } from 'next/server';
import { fetchStoreOrders, createOrder } from '@/src/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const orders = await fetchStoreOrders(params.storeId);
    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    console.error('[API] GET /orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const body = await request.json();
    const { order, items } = body;

    const createdOrder = await createOrder(params.storeId, order, items);
    return NextResponse.json({ order: createdOrder }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /orders:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
