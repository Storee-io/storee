import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase';

const SESSION_TOKEN = 'sysconfig_authed_v1';

function isAuthed(req: NextRequest): boolean {
  return req.cookies.get('__sysconfig')?.value === SESSION_TOKEN;
}

// ── GET: list history entries (newest first) ──────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url   = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);

  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('system_config_history')
      .select('id, system_prompt, model, max_tokens, note, saved_at')
      .order('saved_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json({ history: data ?? [] });
  } catch (err) {
    console.error('[sysconfig/history] GET failed:', err);
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
  }
}

// ── DELETE: remove a specific history entry ───────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const sb = createServerClient();
    await sb.from('system_config_history').delete().eq('id', id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[sysconfig/history] DELETE failed:', err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
