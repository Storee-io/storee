/**
 * Server-side Pexels image fetcher.
 * IMPORTANT: this module uses PEXELS_API_KEY — never import it from client code.
 *
 * Strategy:
 *  1. Build a concise search query from product name + category
 *  2. Fetch from Pexels API (unlimited free tier)
 *  3. Cache results in-memory for 24 h to avoid duplicate API calls
 *  4. Fall back gracefully — never throws, returns null on any error
 */

// ── In-memory cache (survives across requests in the same server process) ─────
const cache = new Map<string, { url: string; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Pool-specific base queries (mirrors productImages.ts pool names) ──────────
const POOL_BASE_QUERIES: Record<string, string> = {
  lighting:   'pendant lamp light fixture interior',
  textiles:   'wool blanket throw pillow fabric',
  seating:    'modern sofa armchair furniture',
  storage:    'wooden bookshelf cabinet shelf',
  tables:     'wooden dining table furniture minimal',
  decor:      'home decor candle vase interior',
  furniture:  'modern furniture interior home',
  coffee:     'specialty coffee beans espresso',
  tea:        'tea cup herbal loose leaf',
  fashion:    'clothing fashion apparel outfit',
  beauty:     'skincare beauty product cosmetic',
  electronics:'tech gadget electronics device',
  food:       'fresh food organic ingredients',
  fitness:    'gym fitness workout equipment',
  jewelry:    'jewelry necklace ring accessories',
  books:      'books stationery reading',
  toys:       'children toy play kids',
  pets:       'pet dog cat animal',
  art:        'art craft handmade painting',
  gaming:     'gaming setup controller console',
};

// ── Keyword → pool name (simplified mirror of productImages.ts) ───────────────
const KEYWORD_POOLS: [string[], string][] = [
  [['light', 'lighting', 'lamp', 'pendant', 'chandelier', 'lantern', 'sconce', 'bulb', 'led', 'fixture'], 'lighting'],
  [['textile', 'fabric', 'blanket', 'throw', 'quilt', 'pillow', 'cushion', 'rug', 'carpet', 'linen', 'wool', 'cotton', 'cashmere', 'velvet', 'bedding', 'curtain', 'drape'], 'textiles'],
  [['sofa', 'couch', 'chair', 'armchair', 'stool', 'bench', 'ottoman', 'recliner', 'lounge', 'seating'], 'seating'],
  [['shelf', 'shelve', 'shelving', 'bookshelf', 'bookcase', 'cabinet', 'drawer', 'wardrobe', 'rack', 'organizer', 'storage', 'sideboard', 'dresser', 'chest'], 'storage'],
  [['table', 'dining', 'coffee table', 'desk', 'nightstand', 'console', 'countertop'], 'tables'],
  [['decor', 'candle', 'vase', 'pot', 'planter', 'plant', 'mirror', 'frame', 'clock', 'sculpture', 'ceramic', 'tray', 'basket', 'wall art'], 'decor'],
  [['coffee', 'cafe', 'espresso', 'latte', 'bean', 'beans', 'roast', 'brew', 'barista', 'grinder', 'v60', 'pour over', 'aeropress', 'chemex', 'origin', 'washed', 'natural process', 'arabica'], 'coffee'],
  [['tea', 'matcha', 'oolong', 'chamomile', 'chai', 'kombucha', 'infusion', 'teapot'], 'tea'],
  [['fashion', 'cloth', 'apparel', 'dress', 'shirt', 'pants', 'jacket', 'sneaker', 'shoe', 'bag', 'streetwear'], 'fashion'],
  [['beauty', 'skincare', 'serum', 'moisturizer', 'cosmetic', 'makeup', 'perfume', 'fragrance'], 'beauty'],
  [['electronic', 'tech', 'gadget', 'laptop', 'phone', 'headphone', 'speaker', 'watch', 'camera', 'keyboard'], 'electronics'],
  [['food', 'grocery', 'organic', 'snack', 'honey', 'spice', 'sauce', 'bread', 'chocolate', 'cheese'], 'food'],
  [['fitness', 'gym', 'workout', 'yoga', 'dumbbell', 'protein', 'athletic', 'running', 'sport'], 'fitness'],
  [['jewelry', 'jewellery', 'ring', 'necklace', 'bracelet', 'earring', 'gem', 'diamond', 'gold', 'silver'], 'jewelry'],
  [['furniture', 'interior', 'home', 'living', 'bedroom', 'oak', 'walnut', 'wood', 'nordic', 'scandinavian'], 'furniture'],
  [['book', 'novel', 'stationery', 'pen', 'notebook', 'journal', 'planner'], 'books'],
  [['toy', 'kids', 'children', 'puzzle', 'lego', 'plush', 'doll', 'game'], 'toys'],
  [['pet', 'dog', 'cat', 'puppy', 'kitten', 'bird', 'fish'], 'pets'],
  [['gaming', 'gamer', 'console', 'controller', 'esport', 'rgb', 'playstation', 'xbox'], 'gaming'],
  [['art', 'craft', 'paint', 'canvas', 'ceramic', 'pottery', 'handmade', 'artisan'], 'art'],
];

function resolvePoolName(name: string, category: string, storeCategory: string): string {
  const text = `${storeCategory} ${category} ${name}`.toLowerCase();
  for (const [kws, pool] of KEYWORD_POOLS) {
    if (kws.some(kw => text.includes(kw))) return pool;
  }
  return 'default';
}

/** Deterministic hash → number (same string always gives same number) */
function hashStr(s: string): number {
  let h = 0;
  for (const c of s) h = ((h * 31 + c.charCodeAt(0)) & 0xffff);
  return h;
}

/**
 * Build a concise Pexels search query from product info.
 * Strips numbers, units, model codes; takes 2-3 descriptive words + pool base.
 */
export function buildPexelsQuery(
  name: string,
  category: string,
  storeCategory: string,
): string {
  const pool   = resolvePoolName(name, category, storeCategory);
  const base   = POOL_BASE_QUERIES[pool] ?? category;

  // Strip quantities (250g, 700ml, 1.5L…), model codes (V60, C40, MK4), symbols
  const cleaned = name
    .replace(/\d+(\.\d+)?\s*(g|kg|ml|l|oz|lb|cm|mm|m|")?/gi, '')
    .replace(/\b[A-Z]{1,2}\d{1,4}[A-Z0-9]*\b/g, '')
    .replace(/[—–\-–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Take 2 meaningful descriptive words from cleaned name
  const words = cleaned
    .split(' ')
    .filter(w => w.length > 3)
    .slice(0, 2)
    .join(' ');

  return words ? `${words} ${base}` : base;
}

/** Resize a Pexels photo URL to a square crop at given width */
function resizePexelsUrl(rawUrl: string, size = 400): string {
  const base = rawUrl.split('?')[0];
  return `${base}?auto=compress&cs=tinysrgb&w=${size}&h=${size}&dpr=1&fit=crop`;
}

/**
 * Fetch a single product image URL from Pexels.
 * Returns null if the API is unavailable or returns no results.
 */
export async function fetchPexelsImage(
  query: string,
  deterministicSeed: string,
): Promise<string | null> {
  const cacheKey = query.toLowerCase();

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.url;

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&orientation=square`,
      {
        headers: { Authorization: apiKey },
        // Next.js: revalidate cached responses after 24 h
        next: { revalidate: 86400 },
      } as RequestInit,
    );

    if (!res.ok) return null;

    const data = await res.json() as { photos: Array<{ src: { medium: string } }> };
    if (!data.photos?.length) return null;

    // Deterministically pick a photo so the same product always gets the same image
    const idx = hashStr(deterministicSeed) % data.photos.length;
    const url = resizePexelsUrl(data.photos[idx].src.medium);

    cache.set(cacheKey, { url, ts: Date.now() });
    return url;
  } catch {
    return null;
  }
}

/**
 * Fetch images for a batch of products in parallel.
 * Falls back gracefully (returns null per product) — never throws.
 */
export async function fetchPexelsImages(
  products: Array<{ name: string; category: string }>,
  storeCategory: string,
): Promise<Array<{ name: string; url: string | null }>> {
  return Promise.all(
    products.map(async p => {
      const query = buildPexelsQuery(p.name, p.category, storeCategory);
      const url   = await fetchPexelsImage(query, p.name);
      return { name: p.name, url };
    }),
  );
}
