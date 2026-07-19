import { createServerClient } from '@/src/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { storeId, subdomain } = await req.json();

  if (!storeId && !subdomain) {
    return NextResponse.json({ error: 'Missing storeId or subdomain' }, { status: 400 });
  }

  const db = createServerClient();

  try {
    // Get store data from stores table - try both ID and subdomain
    let store;
    let fetchError;

    if (storeId) {
      const result = await db
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .maybeSingle();
      store = result.data;
      fetchError = result.error;
    } else if (subdomain) {
      const result = await db
        .from('stores')
        .select('*')
        .eq('subdomain', subdomain)
        .maybeSingle();
      store = result.data;
      fetchError = result.error;
    }

    if (!store || fetchError) {
      return NextResponse.json({ error: 'Store not found', details: fetchError?.message }, { status: 404 });
    }

    // Update published_stores with latest data
    const { error: updateError } = await db
      .from('published_stores')
      .update({
        name: store.name,
        primary_color: store.primary_color,
        category: store.category,
        design: store.design,
        currency: store.currency,
        language: store.language,
        font: store.font,
        mood: store.mood,
        audience: store.audience,
        branding: store.branding,
        payment_settings: store.payment_settings,
        shipping_settings: store.shipping_settings,
        checkout_settings: store.checkout_settings,
      })
      .eq('subdomain', store.subdomain);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Revalidate published store pages
    const { revalidatePath } = await import('next/cache');
    if (store.subdomain) {
      revalidatePath(`/store/${store.subdomain}`);
      revalidatePath(`/store/${store.subdomain}/[...path]`);
    }

    return NextResponse.json({ ok: true, message: 'Store synced to published' });
  } catch (err) {
    console.error('[sync-to-published] Error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
