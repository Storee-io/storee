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

    // Update store in database
    const { error } = await supabase
      .from('stores')
      .update({ branding })
      .eq('id', storeId);

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(branding);
  } catch (error) {
    console.error('Branding API error:', error);
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
