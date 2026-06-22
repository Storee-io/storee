import { NextRequest, NextResponse } from 'next/server';
import { fetchStoreCustomers, upsertCustomer } from '@/src/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const customers = await fetchStoreCustomers(params.storeId);
    return NextResponse.json({ customers }, { status: 200 });
  } catch (error) {
    console.error('[API] GET /customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const body = await request.json();
    const customer = await upsertCustomer(params.storeId, body);
    return NextResponse.json({ customer }, { status: 200 });
  } catch (error) {
    console.error('[API] POST /customers:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
