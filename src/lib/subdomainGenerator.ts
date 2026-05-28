/**
 * Generates a 3-word subdomain from a store name + random word pool.
 * Format: [word1]-[word2]-[word3]
 */

const WORD_POOL = [
  'shop', 'hub', 'co', 'store', 'market', 'space', 'place', 'spot',
  'lab', 'zone', 'bay', 'nest', 'loft', 'vault', 'studio', 'house',
  'world', 'club', 'depot', 'craft', 'goods', 'finds', 'drops',
  'edge', 'wave', 'flow', 'spark', 'bloom', 'grove', 'works', 'cove',
  'peak', 'base', 'hive', 'den', 'realm', 'curve', 'core', 'supply',
  'collective', 'society', 'gallery', 'boutique', 'avenue', 'emporium',
  'fresh', 'prime', 'pure', 'bold', 'bright', 'swift', 'smart', 'best',
  'daily', 'local', 'urban', 'wild', 'calm', 'cool', 'warm', 'rare',
];

function slugWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function randomWord(exclude: string[] = []): string {
  const pool = WORD_POOL.filter(w => !exclude.includes(w));
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Generates a 3-word subdomain candidate from the store name.
 * Each call (with a different `attempt`) produces a different result.
 */
export function generateSubdomain(storeName: string, attempt = 0): string {
  const words = storeName
    .split(/[\s\-_]+/)
    .map(slugWord)
    .filter(Boolean);

  if (words.length >= 3) {
    // First attempt: use first 3 words of the name
    if (attempt === 0) return words.slice(0, 3).join('-');
    // Retry: swap 3rd word with a random one
    return `${words[0]}-${words[1]}-${randomWord([words[2]])}`;
  }

  if (words.length === 2) {
    return `${words[0]}-${words[1]}-${randomWord([words[0], words[1]])}`;
  }

  if (words.length === 1) {
    const w2 = randomWord([words[0]]);
    const w3 = randomWord([words[0], w2]);
    return `${words[0]}-${w2}-${w3}`;
  }

  // Fallback: 3 random words
  const w1 = randomWord();
  const w2 = randomWord([w1]);
  const w3 = randomWord([w1, w2]);
  return `${w1}-${w2}-${w3}`;
}

/**
 * Tries variants until an available subdomain is found.
 * Resolves with the first available slug.
 */
export async function findAvailableSubdomain(
  storeName: string,
  maxAttempts = 8,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const sub = generateSubdomain(storeName, i);
    try {
      const res = await fetch(`/api/publish-store?subdomain=${encodeURIComponent(sub)}`);
      if (res.ok) {
        const { available } = (await res.json()) as { available: boolean };
        if (available) return sub;
      }
    } catch {
      return sub; // If API unreachable, just use this
    }
  }
  // Last resort: base + short random suffix
  const base = generateSubdomain(storeName, 0).split('-').slice(0, 2).join('-');
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
