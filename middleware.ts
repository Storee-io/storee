import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Domains that belong to Storee itself — skip custom-domain lookup for these
const MAIN_DOMAIN_SUFFIXES = [
  'storee.io',
  'vercel.app',
  'localhost',
  '127.0.0.1',
];

function isMainDomain(hostname: string): boolean {
  return MAIN_DOMAIN_SUFFIXES.some(
    suffix => hostname === suffix || hostname.endsWith(`.${suffix}`)
  );
}

/**
 * Middleware — custom domain routing
 *
 * When a request arrives on a non-Storee hostname (e.g. mystore.com),
 * look up the matching store in published_stores by custom_domain and
 * rewrite the request to /store/[subdomain].
 *
 * This lets store owners point their own domain at Storee and have it
 * serve their storefront seamlessly.
 */
export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  // Strip port for local dev (e.g. localhost:3000 → localhost)
  const hostname = host.split(':')[0].toLowerCase();
  // Normalise: strip leading www. so mystore.com and www.mystore.com both match
  const apex = hostname.replace(/^www\./, '');

  // Skip lookup for Storee's own domains
  if (isMainDomain(apex) || isMainDomain(hostname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return NextResponse.next();

  // Query Supabase REST API directly (no SDK — keeps middleware bundle tiny)
  // We check both apex and www variants so either form of the domain works.
  try {
    const params = new URLSearchParams({
      select: 'subdomain',
      limit: '1',
      or: `custom_domain.eq.${apex},custom_domain.eq.www.${apex}`,
    });

    const res = await fetch(
      `${supabaseUrl}/rest/v1/published_stores?${params}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json',
        },
      }
    );

    if (res.ok) {
      const stores: Array<{ subdomain: string }> = await res.json();
      if (stores.length > 0 && stores[0].subdomain) {
        const slug = stores[0].subdomain;
        // Preserve path after root so sub-pages still work
        const url = req.nextUrl.clone();
        const originalPath = url.pathname;
        url.pathname =
          `/store/${slug}` + (originalPath === '/' ? '' : originalPath);
        return NextResponse.rewrite(url);
      }
    }
  } catch {
    // If Supabase is unreachable, fall through to normal routing
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
