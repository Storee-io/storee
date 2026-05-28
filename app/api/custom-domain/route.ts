import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase';

export const runtime = 'nodejs';

const VERCEL_API = 'https://api.vercel.com';

// ── Vercel domain helpers ─────────────────────────────────────────────────────

function vercelHeaders() {
  return {
    Authorization: `Bearer ${process.env.VERCEL_TOKEN ?? ''}`,
    'Content-Type': 'application/json',
  };
}

function vercelProjectUrl(path = '') {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  const base = `${VERCEL_API}/v10/projects/${projectId}/domains${path}`;
  return teamId ? `${base}${path.includes('?') ? '&' : '?'}teamId=${teamId}` : base;
}

async function addDomainToVercel(domain: string): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_PROJECT_ID) {
    // No Vercel token — domain saved in DB but not registered with Vercel.
    // User will need to add it manually in their Vercel dashboard.
    return { ok: false, error: 'VERCEL_TOKEN not configured' };
  }

  const res = await fetch(vercelProjectUrl(), {
    method: 'POST',
    headers: vercelHeaders(),
    body: JSON.stringify({ name: domain }),
  });

  // 409 = domain already registered — treat as success
  if (res.ok || res.status === 409) return { ok: true };

  const body = await res.json().catch(() => ({}));
  return { ok: false, error: body?.error?.message ?? `Vercel API ${res.status}` };
}

async function removeDomainFromVercel(domain: string): Promise<void> {
  if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_PROJECT_ID) return;

  await fetch(vercelProjectUrl(`/${domain}`), {
    method: 'DELETE',
    headers: vercelHeaders(),
  });
}

// ── POST — connect a custom domain ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { storeId, subdomain, domain } = body as {
    storeId: string;
    subdomain: string;
    domain: string;
  };

  if (!storeId || !subdomain || !domain) {
    return NextResponse.json({ error: 'Missing storeId, subdomain or domain' }, { status: 400 });
  }

  // Sanitise: strip protocol, trailing slash, leading www
  const clean = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/^www\./, '');

  // Basic validation
  const domainRe = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  if (!domainRe.test(clean)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  const db = createServerClient();

  // Check domain not already used by a different store
  const { data: conflict } = await db
    .from('published_stores')
    .select('subdomain')
    .eq('custom_domain', clean)
    .neq('subdomain', subdomain)
    .maybeSingle();

  if (conflict) {
    return NextResponse.json(
      { error: 'This domain is already connected to another store' },
      { status: 409 }
    );
  }

  // Persist to published_stores (serves the storefront)
  const { error: pubErr } = await db
    .from('published_stores')
    .update({ custom_domain: clean })
    .eq('subdomain', subdomain);

  if (pubErr) {
    return NextResponse.json({ error: pubErr.message }, { status: 500 });
  }

  // Persist to stores (shows in dashboard settings)
  await db.from('stores').update({ custom_domain: clean }).eq('id', storeId);

  // Register domain with Vercel so it routes traffic
  const vercel = await addDomainToVercel(clean);
  // Also register www. variant
  await addDomainToVercel(`www.${clean}`);

  return NextResponse.json({
    ok: true,
    domain: clean,
    vercelRegistered: vercel.ok,
    vercelError: vercel.error,
  });
}

// ── DELETE — disconnect a custom domain ──────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { storeId, subdomain, domain } = body as {
    storeId: string;
    subdomain: string;
    domain: string;
  };

  if (!storeId || !subdomain || !domain) {
    return NextResponse.json({ error: 'Missing storeId, subdomain or domain' }, { status: 400 });
  }

  const db = createServerClient();

  await db
    .from('published_stores')
    .update({ custom_domain: null })
    .eq('subdomain', subdomain);

  await db
    .from('stores')
    .update({ custom_domain: null })
    .eq('id', storeId);

  await removeDomainFromVercel(domain);
  await removeDomainFromVercel(`www.${domain}`);

  return NextResponse.json({ ok: true });
}
