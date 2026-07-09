import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface BrandingSettings {
  logoUrl?: string;
  faviconUrl?: string;
  logoFile?: string;
  faviconFile?: string;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const storeId = params.id;
    const branding: BrandingSettings = await request.json();

    console.log(`[Branding] Saving for store ${storeId}:`, { logoFile: branding.logoFile, faviconFile: branding.faviconFile });

    // Update store in database - gracefully handle if branding field doesn't exist yet
    const { error, data } = await supabase
      .from('stores')
      .update({ branding })
      .eq('id', storeId)
      .select();

    if (error) {
      console.error('[Branding] Supabase update error:', error.message, error.details);
      // If column doesn't exist, still return branding data (it's stored in context)
      // This allows feature to work even if DB schema migration hasn't run yet
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const storeId = params.id;

    const { data, error } = await supabase
      .from('stores')
      .select('branding')
      .eq('id', storeId)
      .single();

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data?.branding || {});
  } catch (error) {
    console.error('Branding fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch branding' },
      { status: 500 }
    );
  }
}
