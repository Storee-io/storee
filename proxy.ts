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

  if (supabaseUrl && supabaseKey) {
    try {
      const qs = `select=subdomain&limit=1&custom_domain=eq.${encodeURIComponent(apex)}`;
      const res = await fetch(`${supabaseUrl}/rest/v1/published_stores?${qs}`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const stores: Array<{ subdomain: string }> = await res.json();
        if (stores.length > 0 && stores[0].subdomain) {
          const slug = stores[0].subdomain;
          const url = request.nextUrl.clone();
          const originalPath = url.pathname;
          url.pathname = `/store/${slug}` + (originalPath === '/' ? '' : originalPath);
          return NextResponse.rewrite(url);
        }
      }
    } catch {
      // Supabase unreachable — fall through to normal routing
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)'],
};
