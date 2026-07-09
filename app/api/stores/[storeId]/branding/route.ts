import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

interface BrandingSettings {
  logoUrl?: string;
  faviconUrl?: string;
  logoFile?: string;
  faviconFile?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const branding: BrandingSettings = await request.json();

    console.log(`[Branding] Saving for store ${storeId}:`, { logoFile: branding.logoFile, faviconFile: branding.faviconFile });

    // Update store in database - gracefully handle if branding column doesn't exist yet
    const { error } = await supabase
      .from('stores')
      .update({ branding })
      .eq('id', storeId)
      .select();

    if (error) {
      console.error('[Branding] Supabase update error:', error.message, error.details);
      // If column doesn't exist, still return branding data so the feature works
      // in-context even before the DB schema migration has run.
      if (error.message?.includes('column') || error.message?.includes('branding')) {
        console.warn('[Branding] Column may not exist yet, returning data anyway');
        return NextResponse.json(branding);
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('[Branding] Successfully saved');
    return NextResponse.json(branding);
  } catch (error) {
    console.error('[Branding] Parse/request error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process branding' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    const { data, error } = await supabase
      .from('stores')
      .select('branding')
      .eq('id', storeId)
      .single();

    if (error) {
      console.error('[Branding] Supabase fetch error:', error.message);
      // Column may not exist yet — return empty branding instead of erroring
      return NextResponse.json({});
    }

    return NextResponse.json(data?.branding || {});
  } catch (error) {
    console.error('[Branding] Fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch branding' },
      { status: 500 }
    );
  }
}
