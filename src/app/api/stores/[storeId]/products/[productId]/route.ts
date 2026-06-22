import { NextRequest, NextResponse } from 'next/server';
import { deleteProduct } from '@/src/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { storeId: string; productId: string } }
) {
  try {
    await deleteProduct(params.productId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API] DELETE /products/[productId]:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
