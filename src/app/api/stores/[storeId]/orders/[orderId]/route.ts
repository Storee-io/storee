import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatus } from '@/src/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { storeId: string; orderId: string } }
) {
  try {
    const body = await request.json();
    const { status } = body;

    await updateOrderStatus(params.orderId, status);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API] PATCH /orders/[orderId]:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
