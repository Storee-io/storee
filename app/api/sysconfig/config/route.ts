import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase';
import { SYSTEM_PROMPT } from '@/src/lib/claudePrompt';

const SESSION_TOKEN = 'sysconfig_authed_v1';

function isAuthed(req: NextRequest): boolean {
  return req.cookies.get('__sysconfig')?.value === SESSION_TOKEN;
}

// ── GET: return current config ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServerClient();
    const { data } = await sb
      .from('system_config')
      .select('key, value, updated_at');

    const map: Record<string, { value: string; updated_at: string }> = {};
    (data ?? []).forEach((row: { key: string; value: string; updated_at: string }) => {
      map[row.key] = { value: row.value, updated_at: row.updated_at };
    });

    return NextResponse.json({
      systemPrompt: map['system_prompt']?.value  ?? SYSTEM_PROMPT,
      model:        map['model']?.value           ?? 'claude-sonnet-4-6',
      maxTokens:    parseInt(map['max_tokens']?.value ?? '4096', 10),
      isDefault:    !map['system_prompt'],
      savedAt:      map['system_prompt']?.updated_at ?? null,
    });
  } catch {
    return NextResponse.json({
      systemPrompt: SYSTEM_PROMPT,
      model:        'claude-sonnet-4-6',
      maxTokens:    4096,
      isDefault:    true,
      savedAt:      null,
    });
  }
}

// ── POST: save config ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { systemPrompt, model, maxTokens } = await req.json();

  if (!systemPrompt || typeof systemPrompt !== 'string') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const sb  = createServerClient();
    const now = new Date().toISOString();

    await sb.from('system_config').upsert([
      { key: 'system_prompt', value: systemPrompt,     updated_at: now },
      { key: 'model',         value: model,             updated_at: now },
      { key: 'max_tokens',    value: String(maxTokens), updated_at: now },
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[sysconfig] save failed:', err);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}
