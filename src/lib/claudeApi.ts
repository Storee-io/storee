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

// ── Design Tokens — Claude-as-Designer (v2: raw CSS values) ─────────────────
// Claude generates exact color hex codes, font names, and pixel values.
// No preset color-scheme buckets — every store gets a fully unique palette.
export interface DesignTokens {
  // ── Color palette (Claude generates exact hex / rgba values) ──────────────
  /** Page / body background */
  pageBg: string;
  /** Card & panel background */
  surfaceBg: string;
  /** Card / panel border */
  surfaceBorder: string;
  /** Sticky header background (may match pageBg or be slightly different) */
  headerBg: string;
  /** Header bottom border */
  headerBorder: string;
  /** Primary text — headings and important copy */
  textPrimary: string;
  /** Secondary text — body paragraphs */
  textSecondary: string;
  /** Muted text — labels, captions, meta */
  textMuted: string;
  /** Thin divider lines between sections */
  divider: string;

  // ── Typography — from approved Google Fonts list ───────────────────────────
  /** Heading / display font name, e.g. "Playfair Display" */
  headingFont: string;
  /** Body / paragraph font name, e.g. "Inter" */
  bodyFont: string;

  // ── Shape ─────────────────────────────────────────────────────────────────
  /** Card border-radius e.g. "16px" or "0px" */
  cardRadius: string;
  /** Button border-radius e.g. "999px" (pill) | "8px" | "4px" */
  btnRadius: string;
  /** Input field border-radius */
  inputRadius: string;

  // ── Layout structure ──────────────────────────────────────────────────────
  heroStyle: 'centered' | 'split' | 'fullscreen' | 'minimal' | 'editorial' | 'video' | 'stacked' | 'asymmetrical';
  productGrid: 'standard' | 'magazine' | 'list' | 'carousel' | 'spotlight';

  /**
   * Unified sections array — replaces sectionOrder + sectionVariants.
   * Each entry carries both the section type and its visual variant.
   * Example: [{ "type": "hero", "variant": "asymmetrical" }, ...]
   */
  sections: Array<{
    type: 'hero' | 'trust' | 'collections' | 'products' | 'features'
        | 'testimonials' | 'stats' | 'brandStory' | 'faq' | 'newsletter'
        | 'scrollingBanner' | 'instagramFeed';
    variant?: string;
  }>;

  /** @deprecated use sections[].variant instead */
  sectionOrder?: Array<'hero' | 'trust' | 'collections' | 'products' | 'features'
                      | 'testimonials' | 'stats' | 'brandStory' | 'faq' | 'newsletter'
                      | 'scrollingBanner' | 'instagramFeed'>;

  // ── Phase 1: Layout engine + personality tokens ───────────────────────────
  /**
   * Structural layout type.
   * standard   → default token-driven layout (existing behaviour)
   * app-like   → mobile-app skeleton: fixed bottom nav, story circles, list rows
   * editorial  → magazine skeleton: asymmetric grid, big typography, lots of air
   * masonry    → pinterest-style columns, varied card heights, visual-first
   * fullscreen → immersive viewport sections with scroll snap, one hero product at a time
   */
  layoutType?: 'standard' | 'app-like' | 'editorial' | 'masonry' | 'fullscreen';
  /** Spacing scale applied across padding/margin/gap */
  spacing?: 'compact' | 'comfortable' | 'spacious';
  /** Content density — how much info is packed per screen */
  density?: 'dense' | 'normal' | 'airy';
  /** Shadow/depth level of surfaces */
  elevation?: 'flat' | 'subtle' | 'raised' | 'floating';
  /** Animation intensity */
  motion?: 'none' | 'subtle' | 'smooth' | 'expressive';
  /** Free-text personality hint Claude used, e.g. "whatsapp-like" */
  personality?: string;
  /** @deprecated use sections[].variant instead */
  sectionVariants?: {
    features?:     'icons' | 'alternating' | 'bento';
    testimonials?: 'cards' | 'carousel' | 'wall';
    stats?:        'numbers' | 'cards';
    brandStory?:   'quote' | 'split' | 'timeline';
    faq?:          'accordion' | 'grid';
    newsletter?:   'centered' | 'banner';
  };
}

/** @deprecated use DesignTokens instead — kept for stores generated before v2 */
export interface DesignSystem {
  fontPair: string;
  colorScheme: 'light' | 'dark' | 'cream' | 'slate' | 'warm';
  heroLayout: 'centered' | 'split' | 'fullscreen' | 'minimal';
  buttonStyle: 'pill' | 'rounded' | 'square';
  productGrid: 'standard' | 'magazine' | 'list' | 'carousel' | 'spotlight';
  sectionOrder: Array<'hero' | 'trust' | 'collections' | 'products' | 'features'
                     | 'testimonials' | 'stats' | 'brandStory' | 'faq' | 'newsletter'
                     | 'scrollingBanner' | 'instagramFeed'>;
}

export interface StoreDesign {
  layoutStyle: 'minimal' | 'bold' | 'elegant' | 'modern' | 'playful';
  /** v2 designer tokens — raw CSS values, highest priority */
  designTokens?: DesignTokens;
  /** v1 bucket tokens — kept for backward compat */
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
  /** Scrolling marquee banner — array of short phrases / product names */
  scrollingItems?: string[];
  /** Instagram-feed section caption overrides (optional, uses products if absent) */
  instagramPosts?: Array<{ caption: string; likes: number; comments: number }>;
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
  scrollingItems?: string[];
  instagramPosts?: Array<{ caption: string; likes: number; comments: number }>;
  designSystem?: DesignSystem;
  designTokens?: DesignTokens;
}

/** template is optional — AI-generated stores no longer require one */
export interface GeneratedStoreConfig {
  storeName: string;
  template?: import('../data/templates').Template;
  primaryColor: string;
  design: StoreDesign;
  /** Store-level category from Claude (e.g. "Coffee", "Furniture") — used for Pexels image search */
  storeCategory?: string;
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
    image: getProductImage(p.name, p.category, parsed.category ?? ''),
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
    ...(parsed.brandStory      ? { brandStory:      parsed.brandStory      } : {}),
    ...(parsed.scrollingItems  ? { scrollingItems:  parsed.scrollingItems  } : {}),
    ...(parsed.instagramPosts  ? { instagramPosts:  parsed.instagramPosts  } : {}),
    ...(parsed.designSystem    ? { designSystem:    parsed.designSystem    } : {}),
    ...(parsed.designTokens    ? { designTokens:    parsed.designTokens    } : {}),
  };

  return {
    storeName:     parsed.storeName,
    primaryColor:  parsed.primaryColor,
    storeCategory: parsed.category ?? '',
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
