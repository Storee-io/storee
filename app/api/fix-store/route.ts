import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase';
import { generateSubdomain } from '@/src/lib/subdomainGenerator';
import type { Store } from '@/src/context/StoreContext';

export const runtime = 'nodejs';

/**
 * Temporary fix endpoint to correct corrupted store domains
 * POST /api/fix-store
 * Body: { storeId: string }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { storeId } = body;

  if (!storeId) {
    return NextResponse.json({ error: 'Missing storeId' }, { status: 400 });
  }

  try {
    const db = createServerClient();

    // Fetch the store
    const { data: storeRow, error: fetchError } = await db
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .maybeSingle();

    if (fetchError || !storeRow) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Generate correct subdomain from store name
    const correctSubdomain = generateSubdomain(storeRow.name, 0);
    const correctDomain = `${correctSubdomain}.storee.io`;

    // Update the store with corrected domain
    const { error: updateError } = await db
      .from('stores')
      .update({
        domain: correctDomain,
        published_domain: correctSubdomain,
      })
      .eq('id', storeId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      storeId,
      oldDomain: storeRow.domain,
      newDomain: correctDomain,
      oldPublishedDomain: storeRow.published_domain,
      newPublishedDomain: correctSubdomain,
    });
  } catch (err) {
    console.error('[fix-store]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
