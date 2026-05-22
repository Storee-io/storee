// Option C: pure design-token architecture — no template dependency.
// Visual design comes entirely from layoutStyle + primaryColor/accentColor
// via getCommerceTheme(). Product images are sourced from Unsplash by keyword.

// ── Types ────────────────────────────────────────────────────────────────────

export interface RichProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  badge?: string;
  description: string;
}

export interface StoreDesign {
  layoutStyle: 'minimal' | 'bold' | 'elegant' | 'modern' | 'playful';
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  accentColor: string;
  navLinks: string[];
  collections: Array<{ name: string; emoji: string }>;
  products: RichProduct[];
  features: Array<{ icon: string; title: string; description: string }>;
  testimonials: Array<{ text: string; author: string; role: string; rating: number }>;
  faq?: Array<{ q: string; a: string }>;
  stats?: Array<{ value: string; label: string }>;
  promoBar?: string;
  newsletter?: { headline: string; subtext: string };
  trustBadges?: Array<{ icon: string; text: string }>;
  brandStory?: string;
}

export interface ClaudeStoreResponse {
  storeName: string;
  tagline: string;
  category: string;
  primaryColor: string;
  accentColor: string;
  layoutStyle: 'minimal' | 'bold' | 'elegant' | 'modern' | 'playful';
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  navLinks: string[];
  collections: Array<{ name: string; emoji: string }>;
  products: Array<{
    name: string;
    price: number;
    originalPrice?: number;
    category: string;
    badge?: string;
    description: string;
  }>;
  features: Array<{ icon: string; title: string; description: string }>;
  testimonials: Array<{ text: string; author: string; role: string; rating: number }>;
  faq?: Array<{ q: string; a: string }>;
  stats?: Array<{ value: string; label: string }>;
  promoBar?: string;
  newsletter?: { headline: string; subtext: string };
  trustBadges?: Array<{ icon: string; text: string }>;
  brandStory?: string;
}

/** template is optional — AI-generated stores no longer require one */
export interface GeneratedStoreConfig {
  storeName: string;
  template?: import('../data/templates').Template;
  primaryColor: string;
  design: StoreDesign;
}

// ── Product image via Unsplash Source ─────────────────────────────────────────
// Builds a stable, keyword-relevant Unsplash URL from product name + category.
// The `sig` param is a deterministic hash so the same product always returns
// the same photo (Unsplash Source caches by full URL in the browser).
function productImageUrl(name: string, category: string): string {
  const keyword = encodeURIComponent(
    `${category} ${name}`
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40),
  );
  // Simple deterministic hash → stable image per product across renders
  const sig = name
    .split('')
    .reduce((acc, c) => ((acc * 31 + c.charCodeAt(0)) & 0xffff), 0);
  return `https://source.unsplash.com/400x400/?${keyword}&sig=${sig}`;
}

// ── Valid layout styles ───────────────────────────────────────────────────────
const VALID_LAYOUTS = ['minimal', 'bold', 'elegant', 'modern', 'playful'] as const;
type LayoutStyle = typeof VALID_LAYOUTS[number];

// ── Build store config from parsed Claude response ────────────────────────────

export function buildStoreConfig(parsed: ClaudeStoreResponse): GeneratedStoreConfig | null {
  // Normalise layoutStyle — it drives the entire visual design
  const layoutStyle: LayoutStyle = VALID_LAYOUTS.includes(parsed.layoutStyle as LayoutStyle)
    ? (parsed.layoutStyle as LayoutStyle)
    : 'modern';

  // Build rich products with Unsplash images derived from each product's name + category
  const richProducts: RichProduct[] = parsed.products.slice(0, 20).map((p, i) => ({
    id: `p${i + 1}`,
    name: p.name,
    price: p.price,
    ...(p.originalPrice ? { originalPrice: p.originalPrice } : {}),
    image: productImageUrl(p.name, p.category),
    category: p.category,
    ...(p.badge ? { badge: p.badge } : {}),
    description: p.description,
  }));

  const design: StoreDesign = {
    layoutStyle,
    tagline:      parsed.tagline,
    heroTitle:    parsed.heroTitle,
    heroSubtitle: parsed.heroSubtitle,
    ctaText:      parsed.ctaText,
    accentColor:  parsed.accentColor,
    navLinks:     parsed.navLinks,
    collections:  parsed.collections,
    products:     richProducts,
    features:     parsed.features,
    testimonials: parsed.testimonials,
    ...(parsed.faq         ? { faq:         parsed.faq         } : {}),
    ...(parsed.stats       ? { stats:        parsed.stats       } : {}),
    ...(parsed.promoBar    ? { promoBar:     parsed.promoBar    } : {}),
    ...(parsed.newsletter  ? { newsletter:   parsed.newsletter  } : {}),
    ...(parsed.trustBadges ? { trustBadges:  parsed.trustBadges } : {}),
    ...(parsed.brandStory  ? { brandStory:   parsed.brandStory  } : {}),
  };

  return {
    storeName:    parsed.storeName,
    primaryColor: parsed.primaryColor,
    // template intentionally omitted — design tokens handle all visuals
    design,
  };
}

// ── Parse raw JSON text from API response ─────────────────────────────────────

export function parseStoreResponse(raw: string): GeneratedStoreConfig | null {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '');

    const parsed: ClaudeStoreResponse = JSON.parse(cleaned);

    if (
      !parsed.storeName ||
      !parsed.primaryColor ||
      !parsed.layoutStyle ||
      !Array.isArray(parsed.products) ||
      parsed.products.length === 0
    ) {
      return null;
    }

    // Normalise layoutStyle in case Claude produces an unexpected value
    if (!VALID_LAYOUTS.includes(parsed.layoutStyle as LayoutStyle)) {
      parsed.layoutStyle = 'modern';
    }

    return buildStoreConfig(parsed);
  } catch {
    return null;
  }
}
