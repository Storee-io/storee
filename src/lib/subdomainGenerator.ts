/**
 * Auto-generates a 3-word subdomain from a store name.
 * Format: [word1]-[word2]-[word3]  (all lowercase, a-z 0-9 only)
 *
 * If the store name has ≥3 words, the first 3 are used directly.
 * Otherwise, a random word from THIRD_WORDS is appended.
 * On repeated attempts (retries), the random word changes each time.
 */

const THIRD_WORDS = [
  'shop', 'hub', 'co', 'store', 'market', 'space', 'place', 'spot',
  'lab', 'zone', 'bay', 'nest', 'loft', 'vault', 'studio', 'house',
  'world', 'club', 'depot', 'craft', 'goods', 'finds', 'drops',
  'edge', 'wave', 'flow', 'spark', 'bloom', 'grove', 'works', 'cove',
  'peak', 'base', 'hive', 'den', 'realm', 'curve', 'core', 'supply',
  'collective', 'society', 'emporium', 'gallery', 'boutique', 'avenue',
];

function slugWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSubdomain(storeName: string, attempt = 0): string {
  const words = storeName
    .split(/[\s\-_]+/)
    .map(slugWord)
    .filter(w => w.length > 0);

  // Shuffle the third-word pool differently on each attempt
  const pool = attempt === 0
    ? THIRD_WORDS
    : [...THIRD_WORDS].sort(() => Math.random() - 0.5);

  if (words.length >= 3) {
    if (attempt === 0) return words.slice(0, 3).join('-');
    // Retry: replace 3rd word with a random one
    return `${words[0]}-${words[1]}-${randomFrom(pool)}`;
  }

  if (words.length === 2) {
    return `${words[0]}-${words[1]}-${randomFrom(pool)}`;
  }

  if (words.length === 1) {
    const w1 = randomFrom(pool);
    const w2 = randomFrom(pool.filter(w => w !== w1));
    return `${words[0]}-${w1}-${w2}`;
  }

  // Fallback: fully random
  return `store-${randomFrom(pool)}-${randomFrom(pool)}`;
}

/**
 * Keeps generating subdomain variants until an available one is found.
 * Checks each via GET /api/publish-store?subdomain=...
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
      // If API unreachable, use this attempt anyway
      return sub;
    }
  }

  // Last resort: base + short random suffix
  const base = generateSubdomain(storeName, 0).split('-').slice(0, 2).join('-');
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
