import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const VERCEL_API = 'https://api.vercel.com';

const VERCEL_A_RECORD = '76.76.21.21';
const VERCEL_CNAME = 'cname.vercel-dns.com';

/**
 * GET /api/custom-domain/verify?domain=mystore.com
 *
 * Performs a real DNS lookup (via Google DNS-over-HTTPS) to check whether
 * the domain's A record points to Vercel (76.76.21.21) or www CNAME points
 * to cname.vercel-dns.com.  Does NOT rely on Vercel's `verified` flag, which
 * can return true for domains already present in the project regardless of DNS.
 *
 * Returns: { verified: boolean, cname: string, aRecord: string }
 */
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'Missing domain param' }, { status: 400 });
  }

  // Strip www. for apex lookup
  const apex = domain.replace(/^www\./, '');

  try {
    // Check apex A record AND www CNAME in parallel
    const [aRes, cnameRes] = await Promise.all([
      fetch(`https://dns.google/resolve?name=${encodeURIComponent(apex)}&type=A`),
      fetch(`https://dns.google/resolve?name=www.${encodeURIComponent(apex)}&type=CNAME`),
    ]);

    const [aData, cnameData] = await Promise.all([
      aRes.json() as Promise<{ Answer?: { data: string }[] }>,
      cnameRes.json() as Promise<{ Answer?: { data: string }[] }>,
    ]);

    const aRecords: string[] = (aData.Answer ?? []).map((r) => r.data.trim());
    const cnameRecords: string[] = (cnameData.Answer ?? []).map((r) =>
      r.data.replace(/\.$/, '').trim()
    );

    const aOk = aRecords.includes(VERCEL_A_RECORD);
    const cnameOk = cnameRecords.some((c) => c === VERCEL_CNAME);
    const verified = aOk || cnameOk;

    return NextResponse.json({
      verified,
      cname: VERCEL_CNAME,
      aRecord: VERCEL_A_RECORD,
      _debug: { aRecords, cnameRecords },
    });
  } catch {
    return NextResponse.json({
      verified: false,
      cname: VERCEL_CNAME,
      aRecord: VERCEL_A_RECORD,
    });
  }
}
