// Option C: pure design-token architecture — no template dependency.
// Visual design comes entirely from layoutStyle + primaryColor/accentColor
// via getCommerceTheme(). Product images come from a curated Unsplash pool.

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

// ── Design System tokens (Claude-as-Designer) ────────────────────────────────
export interface DesignSystem {
  /** Google Fonts pairing key — must be one of the curated list */
  fontPair: 'playfair-lato' | 'montserrat-opensans' | 'space-inter' | 'fraunces-dm'
           | 'bebas-barlow' | 'cormorant-jost' | 'syne-nunito' | 'anton-roboto'
           | 'josefin' | 'raleway-source';
  /** Overall page colour palette */
  colorScheme: 'light' | 'dark' | 'cream' | 'slate' | 'warm';
  /** Hero section layout variant */
  heroLayout: 'centered' | 'split' | 'fullscreen' | 'minimal';
  /** CTA / primary button shape */
  buttonStyle: 'pill' | 'rounded' | 'square';
  /** Product listing variant */
  productGrid: 'standard' | 'magazine' | 'list';
  /** Page section rendering order */
  sectionOrder: Array<'hero' | 'trust' | 'collections' | 'products' | 'features'
                     | 'testimonials' | 'stats' | 'brandStory' | 'faq' | 'newsletter'>;
}

export interface StoreDesign {
  layoutStyle: 'minimal' | 'bold' | 'elegant' | 'modern' | 'playful';
  /** When present, drives the TokenLayout renderer (takes priority over layoutStyle) */
  designSystem?: DesignSystem;
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
  designSystem?: DesignSystem;
}

/** template is optional — AI-generated stores no longer require one */
export interface GeneratedStoreConfig {
  storeName: string;
  template?: import('../data/templates').Template;
  primaryColor: string;
  design: StoreDesign;
}

import { getProductImage } from './productImages';

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
    image: getProductImage(p.name, p.category),
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
    ...(parsed.brandStory    ? { brandStory:   parsed.brandStory    } : {}),
    ...(parsed.designSystem  ? { designSystem: parsed.designSystem  } : {}),
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
