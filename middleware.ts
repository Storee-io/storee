import { NextRequest, NextResponse } from 'next/server';

const STOREE_DOMAINS = new Set([
  'storee.io',
  'www.storee.io',
  'storee.vercel.app',
]);

/**
 * Middleware: custom-domain → /store/[slug] rewrite
 *
 * When a request arrives on a custom domain (e.g. convee.site), look up
 * which store's subdomain maps to that domain in published_stores, then
 * rewrite the request to /store/[subdomain] so the existing storefront
 * page renders — without changing the URL visible to the visitor.
 */
export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') ?? '';
  const apex = hostname.replace(/^www\./, '').split(':')[0];

  // Pass through requests on storee's own domains
  if (
    STOREE_DOMAINS.has(hostname) ||
    hostname.endsWith('.storee.io') ||
    hostname.endsWith('.vercel.app') ||
    hostname === 'localhost'
  ) {
    return NextResponse.next();
  }

  // Custom domain detected — look up the subdomain via Supabase REST
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return NextResponse.next();

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/published_stores?custom_domain=eq.${encodeURIComponent(apex)}&select=subdomain,status&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) return NextResponse.next();

    const rows = (await res.json()) as { subdomain: string; status: string }[];
    if (!rows.length) return NextResponse.next();

    const { subdomain } = rows[0];
    const url = req.nextUrl.clone();

    // Rewrite root and all paths to /store/[subdomain]
    // Preserve any path after the domain (e.g. /products) if needed later
    url.pathname = `/store/${subdomain}`;
    return NextResponse.rewrite(url);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, robots.txt, sitemap.xml
     * - /api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/).*)',
  ],
};
