import { templates } from '../data/templates';
import type { Template } from '../data/templates';

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

export interface GeneratedStoreConfig {
  storeName: string;
  template: Template;
  primaryColor: string;
  design: StoreDesign;
}

// ── layoutStyle → template (for product image pool) ──────────────────────────
// Templates are only used as an image source — the visual design comes entirely
// from layoutStyle + primaryColor via getCommerceTheme(). Mapping by layoutStyle
// means we always get a valid template (never null) and image tone matches brand.
const LAYOUT_TEMPLATE_MAP: Record<string, string> = {
  minimal:  'fashion-luxe',   // editorial, neutral-tone photos
  bold:     'tech-hub',       // dramatic, high-contrast photos
  elegant:  'beauty-glow',    // soft, warm-tone photos
  modern:   'home-living',    // clean, Scandinavian photos
  playful:  'food-market',    // bright, colourful photos
};

// ── Build store config from parsed Claude response ────────────────────────────

export function buildStoreConfig(parsed: ClaudeStoreResponse): GeneratedStoreConfig | null {
  // Resolve template by layoutStyle — always valid, never blocks generation.
  // category is kept as free-form metadata (label only, no longer gates anything).
  const templateId = LAYOUT_TEMPLATE_MAP[parsed.layoutStyle] ?? 'fashion-luxe';
  const matchedTemplate = templates.find(t => t.id === templateId) ?? templates[0];
  if (!matchedTemplate) return null;

  const originalImages = matchedTemplate.demoProducts.map(p => p.image);

  const richProducts: RichProduct[] = parsed.products.slice(0, 6).map((p, i) => ({
    id: `p${i + 1}`,
    name: p.name,
    price: p.price,
    ...(p.originalPrice ? { originalPrice: p.originalPrice } : {}),
    image: originalImages[i % originalImages.length],
    category: p.category,
    ...(p.badge ? { badge: p.badge } : {}),
    description: p.description,
  }));

  const templateProducts = richProducts.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    image: p.image,
    category: p.category,
    ...(p.badge ? { badge: p.badge } : {}),
  }));

  const design: StoreDesign = {
    layoutStyle: parsed.layoutStyle,
    tagline: parsed.tagline,
    heroTitle: parsed.heroTitle,
    heroSubtitle: parsed.heroSubtitle,
    ctaText: parsed.ctaText,
    accentColor: parsed.accentColor,
    navLinks: parsed.navLinks,
    collections: parsed.collections,
    products: richProducts,
    features: parsed.features,
    testimonials: parsed.testimonials,
    ...(parsed.faq ? { faq: parsed.faq } : {}),
    ...(parsed.stats ? { stats: parsed.stats } : {}),
    ...(parsed.promoBar ? { promoBar: parsed.promoBar } : {}),
    ...(parsed.newsletter ? { newsletter: parsed.newsletter } : {}),
    ...(parsed.trustBadges ? { trustBadges: parsed.trustBadges } : {}),
    ...(parsed.brandStory ? { brandStory: parsed.brandStory } : {}),
  };

  return {
    storeName: parsed.storeName,
    primaryColor: parsed.primaryColor,
    template: { ...matchedTemplate, demoProducts: templateProducts },
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

    // category is now free-form metadata — only truly required fields are checked
    if (
      !parsed.storeName ||
      !parsed.primaryColor ||
      !parsed.layoutStyle ||
      !Array.isArray(parsed.products) ||
      parsed.products.length === 0
    ) {
      return null;
    }

    // Normalise layoutStyle in case Claude produces an unexpected casing/value
    const validLayouts = ['minimal', 'bold', 'elegant', 'modern', 'playful'];
    if (!validLayouts.includes(parsed.layoutStyle)) {
      parsed.layoutStyle = 'modern'; // safe fallback
    }

    return buildStoreConfig(parsed);
  } catch {
    return null;
  }
}
