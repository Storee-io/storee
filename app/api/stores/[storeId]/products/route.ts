import { NextRequest, NextResponse } from 'next/server';
import { fetchStoreProducts, upsertProduct, deleteProduct } from '@/src/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const products = await fetchStoreProducts(storeId);
    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error('[API] GET /products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const body = await request.json();
    const product = await upsertProduct(storeId, body);
    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    console.error('[API] POST /products:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
