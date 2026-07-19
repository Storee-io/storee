import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { storeId, subdomain } = await req.json();

  if (!storeId || !subdomain) {
    return NextResponse.json({ error: 'Missing storeId or subdomain' }, { status: 400 });
  }

  try {
    // Revalidate all paths for this store
    revalidatePath(`/store/${subdomain}`);
    revalidatePath(`/store/${subdomain}/[...path]`);

    return NextResponse.json({ ok: true, message: 'Store cache revalidated' });
  } catch (err) {
    console.error('[revalidate-store] Error:', err);
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 });
  }
}
