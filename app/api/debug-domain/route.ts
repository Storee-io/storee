import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get('host') ?? req.headers.get('host') ?? '';
  const apex = host.replace(/^www\./, '').split(':')[0];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing env vars', supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
  }

  const qs = `select=subdomain,custom_domain&limit=5&custom_domain=eq.${encodeURIComponent(apex)}`;
  const url = `${supabaseUrl}/rest/v1/published_stores?${qs}`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json',
      },
    });

    const body = await res.text();
    return NextResponse.json({
      apex,
      queryUrl: url,
      status: res.status,
      body: JSON.parse(body),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
