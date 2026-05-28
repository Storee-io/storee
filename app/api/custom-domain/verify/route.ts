import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const VERCEL_API = 'https://api.vercel.com';

/**
 * GET /api/custom-domain/verify?domain=mystore.com
 *
 * Checks whether the domain has been verified by Vercel (i.e. DNS is correctly
 * pointing at Vercel's servers).  Returns:
 *   { verified: boolean, cname: string, aRecord: string }
 */
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'Missing domain param' }, { status: 400 });
  }

  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  // If Vercel isn't wired up, we can't verify — return a helpful response
  if (!token || !projectId) {
    return NextResponse.json({
      verified: false,
      cname: 'cname.vercel-dns.com',
      aRecord: '76.76.21.21',
      note: 'VERCEL_TOKEN not configured — add domain manually in Vercel dashboard',
    });
  }

  const teamId = process.env.VERCEL_TEAM_ID;
  const url =
    `${VERCEL_API}/v10/projects/${projectId}/domains/${domain}` +
    (teamId ? `?teamId=${teamId}` : '');

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ verified: false, cname: 'cname.vercel-dns.com', aRecord: '76.76.21.21' });
    }

    const data = await res.json();

    return NextResponse.json({
      verified: data.verified ?? false,
      cname: data.cname ?? 'cname.vercel-dns.com',
      aRecord: '76.76.21.21',
    });
  } catch {
    return NextResponse.json({ verified: false, cname: 'cname.vercel-dns.com', aRecord: '76.76.21.21' });
  }
}
