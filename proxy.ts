import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'storee.io';

// Domains that belong to Vercel infrastructure — skip custom-domain lookup
const SKIP_SUFFIXES = ['vercel.app', 'localhost', '127.0.0.1'];

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') ?? '';

  // Strip port for comparison (e.g. localhost:3000 → localhost)
  const host = hostname.split(':')[0].toLowerCase();
  const rootHost = ROOT_DOMAIN.split(':')[0];

  const isRootDomain = host === rootHost || host === `www.${rootHost}`;
  const isSubdomain = !isRootDomain && host.endsWith(`.${rootHost}`);
  const isVercelDomain = SKIP_SUFFIXES.some(s => host === s || host.endsWith(`.${s}`));

  // ── Storee subdomain routing (e.g. mystore.storee.io) ──────────────────────
  if (isSubdomain) {
    const subdomain = host.replace(`.${rootHost}`, '');
    const url = request.nextUrl.clone();
    const pathname = request.nextUrl.pathname;
    url.pathname = `/store/${subdomain}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  // ── Skip root domain and Vercel infra domains ───────────────────────────────
  if (isRootDomain || isVercelDomain) {
    return NextResponse.next();
  }

  // ── Custom domain routing (e.g. mystore.com) ───────────────────────────────
  // Normalise: strip leading www. so both apex and www variants match
  const apex = host.replace(/^www\./, '');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Debug header so we can see where the proxy stopped
  const debugInfo: Record<string, string> = {
    apex,
    hasUrl: String(!!supabaseUrl),
    hasKey: String(!!supabaseKey),
  };

  if (supabaseUrl && supabaseKey) {
    try {
      const qs = `select=subdomain&limit=1&custom_domain=eq.${encodeURIComponent(apex)}`;
      const queryUrl = `${supabaseUrl}/rest/v1/published_stores?${qs}`;

      const res = await fetch(queryUrl, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json',
        },
      });

      debugInfo.supabaseStatus = String(res.status);
      const body = await res.text();
      debugInfo.supabaseBody = body.slice(0, 200);

      if (res.ok) {
        const stores: Array<{ subdomain: string }> = JSON.parse(body);
        if (stores.length > 0 && stores[0].subdomain) {
          const slug = stores[0].subdomain;
          const url = request.nextUrl.clone();
          const originalPath = url.pathname;
          url.pathname = `/store/${slug}` + (originalPath === '/' ? '' : originalPath);
          const rewriteRes = NextResponse.rewrite(url);
          rewriteRes.headers.set('x-proxy-debug', JSON.stringify({ ...debugInfo, rewrite: slug }));
          return rewriteRes;
        }
      }
    } catch (err) {
      debugInfo.error = String(err);
    }
  }

  const nextRes = NextResponse.next();
  nextRes.headers.set('x-proxy-debug', JSON.stringify(debugInfo));
  return nextRes;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)'],
};
