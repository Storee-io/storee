import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase';

const SESSION_TOKEN = 'sysconfig_authed_v1';

function isAuthed(req: NextRequest): boolean {
  return req.cookies.get('__sysconfig')?.value === SESSION_TOKEN;
}

// ── POST: revert live config to a specific history entry ──────────────────────
// Body: { id: number }
// Before reverting, the current live config is archived to history first.
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const sb = createServerClient();

  try {
    // 1. Fetch the target history entry
    const { data: target, error: fetchErr } = await sb
      .from('system_config_history')
      .select('system_prompt, model, max_tokens')
      .eq('id', id)
      .single();

    if (fetchErr || !target) {
      return NextResponse.json({ error: 'History entry not found' }, { status: 404 });
    }

    // 2. Archive the current live config before overwriting
    const { data: current } = await sb
      .from('system_config')
      .select('key, value');

    if (current && current.length > 0) {
      const map: Record<string, string> = {};
      current.forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });

      if (map['system_prompt']) {
        await sb.from('system_config_history').insert({
          system_prompt: map['system_prompt'],
          model:         map['model']      ?? 'claude-sonnet-4-6',
          max_tokens:    parseInt(map['max_tokens'] ?? '4096', 10),
          note:          'Auto-archived before revert',
        });
      }
    }

    // 3. Overwrite live config with the reverted values
    const now = new Date().toISOString();
    await sb.from('system_config').upsert([
      { key: 'system_prompt', value: target.system_prompt,       updated_at: now },
      { key: 'model',         value: target.model,               updated_at: now },
      { key: 'max_tokens',    value: String(target.max_tokens),  updated_at: now },
    ]);

    return NextResponse.json({
      success: true,
      restored: {
        systemPrompt: target.system_prompt,
        model:        target.model,
        maxTokens:    target.max_tokens,
      },
    });
  } catch (err) {
    console.error('[sysconfig/revert] failed:', err);
    return NextResponse.json({ error: 'Revert failed' }, { status: 500 });
  }
}
