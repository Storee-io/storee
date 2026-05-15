import { parseStoreResponse } from './claudeApi';
import type { GeneratedStoreConfig } from './claudeApi';

export type { GeneratedStoreConfig };

export async function generateStoreWithClaude(
  prompt: string
): Promise<GeneratedStoreConfig | null> {
  try {
    const res = await fetch('/api/generate-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return parseStoreResponse(text);
  } catch {
    return null;
  }
}
