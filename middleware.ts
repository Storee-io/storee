import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'storee.io';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? '';

  // Strip port for comparison (e.g. localhost:3000 → localhost)
  const host = hostname.split(':')[0];
  const rootHost = ROOT_DOMAIN.split(':')[0];

  const isRootDomain = host === rootHost || host === `www.${rootHost}`;
  const isSubdomain = !isRootDomain && host.endsWith(`.${rootHost}`);

  if (isSubdomain) {
    const subdomain = host.replace(`.${rootHost}`, '');
    const url = request.nextUrl.clone();
    const pathname = request.nextUrl.pathname;
    url.pathname = `/store/${subdomain}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
