import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    console.log(`[Branding] Saving for store ${storeId}:`, {
      logoFile: branding.logoFile,
      faviconFile: branding.faviconFile,
      logoUrlLength: branding.logoUrl?.length || 0,
      faviconUrlLength: branding.faviconUrl?.length || 0
    });

    // Use SERVICE ROLE key for server-side operations (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    // Update store in database
    const { data, error } = await supabaseAdmin
      .from('stores')
      .update({ branding })
      .eq('id', storeId)
      .select();

    if (error) {
      console.error('[Branding] Supabase update error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({
        error: `Failed to save branding: ${error.message}`,
        details: error.details,
        code: error.code
      }, { status: 400 });
    }

    console.log('[Branding] Successfully saved. Data:', data);

    // If this store is already published, push branding straight to
    // published_stores too — logo/favicon should reflect on the live
    // site immediately, not only after the next full Publish.
    const publishedDomain = data?.[0]?.published_domain;
    if (publishedDomain) {
      const { error: publishedError } = await supabaseAdmin
        .from('published_stores')
        .update({ branding })
        .eq('subdomain', publishedDomain);

      if (publishedError) {
        console.error('[Branding] Failed to sync to published_stores:', publishedError.message);
      }
    }

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

    // Use SERVICE ROLE key for server-side operations (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    const { data, error } = await supabaseAdmin
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
