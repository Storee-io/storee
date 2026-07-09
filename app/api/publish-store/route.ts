import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { subdomain, name, primaryColor, category, templateId, design, currency, language, font, mood, audience, branding } = body;

  if (!subdomain || !name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const db = createServerClient();

  const { error } = await db
    .from('published_stores')
    .upsert(
      {
        subdomain,
        name,
        primary_color: primaryColor ?? '#10b981',
        category: category ?? 'Other',
        template_id: templateId ?? null,
        design: design ?? null,
        currency: currency ?? null,
        language: language ?? null,
        font: font ?? null,
        mood: mood ?? null,
        audience: audience ?? null,
        branding: branding ?? {},
        status: 'active',
      },
      { onConflict: 'subdomain' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url: `https://${subdomain}.storee.io` });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { subdomain } = body;

  if (!subdomain) {
    return NextResponse.json({ error: 'Missing subdomain' }, { status: 400 });
  }

  const db = createServerClient();
  const { error } = await db
    .from('published_stores')
    .update({ status: 'inactive' })
    .eq('subdomain', subdomain);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get('subdomain');
  if (!subdomain) return NextResponse.json({ error: 'Missing subdomain' }, { status: 400 });

  const db = createServerClient();
  const { data } = await db
    .from('published_stores')
    .select('subdomain')
    .eq('subdomain', subdomain)
    .maybeSingle();

  return NextResponse.json({ available: !data });
}
