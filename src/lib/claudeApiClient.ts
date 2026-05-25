import { parseStoreResponse } from './claudeApi';
import type { GeneratedStoreConfig } from './claudeApi';

export type { GeneratedStoreConfig };

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  success: string;
  danger: string;
}

export interface AdvancedOptions {
  themeColors: ThemeColors;
  mood: '' | 'luxury' | 'casual' | 'energetic' | 'professional' | 'romantic';
  audience: string;
  productCount: '' | 'few' | 'medium' | 'many';
  features: {
    reviews: boolean;
    wishlist: boolean;
    newsletter: boolean;
    promoBar: boolean;
    faq: boolean;
    testimonials: boolean;
    brandStory: boolean;
    trustBadges: boolean;
  };
}

// ── Design variation presets ──────────────────────────────────────────────────
// Each preset defines a distinct visual direction. One is randomly chosen per
// generation so repeated generates of the same prompt produce different looks.
// Personality keywords in the user prompt (WhatsApp-like, Spotify-like, etc.)
// always take precedence — the variation directive explicitly allows this.
export interface DesignVariation {
  id: number;
  name: string;
  layoutType: string;
  heroStyle: string;
  productGrid: string;
  spacing: string;
  density: string;
  motion: string;
  elevation: string;
  cardStyle: string;
  hoverStyle: string;
  compositionStyle?: string;
  paletteHint: string;
  typographyHint: string;
}

export const DESIGN_VARIATIONS: DesignVariation[] = [
  {
    id: 1, name: 'Editorial Magazine',
    layoutType: 'editorial', heroStyle: 'split', productGrid: 'magazine',
    spacing: 'spacious', density: 'airy', motion: 'smooth', elevation: 'subtle',
    cardStyle: 'ghost', hoverStyle: 'lift', compositionStyle: 'asymmetric',
    paletteHint: 'light background, one bold accent color, high contrast headings',
    typographyHint: 'serif heading font (e.g. Cormorant Garamond or Playfair Display), clean sans-serif body',
  },
  {
    id: 2, name: 'Bold Spotlight',
    layoutType: 'standard', heroStyle: 'asymmetrical', productGrid: 'spotlight',
    spacing: 'comfortable', density: 'normal', motion: 'smooth', elevation: 'raised',
    cardStyle: 'floating', hoverStyle: 'lift', compositionStyle: 'staggered',
    paletteHint: 'bold primary color, white or very light background, strong contrast',
    typographyHint: 'bold sans-serif heading (e.g. Montserrat or Syne), readable body',
  },
  {
    id: 3, name: 'Minimal Gallery',
    layoutType: 'editorial', heroStyle: 'minimal', productGrid: 'list',
    spacing: 'spacious', density: 'airy', motion: 'none', elevation: 'flat',
    cardStyle: 'ghost', hoverStyle: 'none', compositionStyle: 'standard',
    paletteHint: 'near-white or very pale background, dark text, single muted accent',
    typographyHint: 'thin elegant heading (e.g. Italiana or Cormorant Garamond weight 300), light body',
  },
  {
    id: 4, name: 'Visual Masonry',
    layoutType: 'masonry', heroStyle: 'centered', productGrid: 'magazine',
    spacing: 'comfortable', density: 'dense', motion: 'smooth', elevation: 'subtle',
    cardStyle: 'filled', hoverStyle: 'scale', compositionStyle: 'standard',
    paletteHint: 'warm neutral background (cream, beige, or off-white), natural earthy tones',
    typographyHint: 'friendly rounded heading (e.g. DM Serif Display or Fraunces), approachable body',
  },
  {
    id: 5, name: 'Cinematic Fullscreen',
    layoutType: 'fullscreen', heroStyle: 'cinematic', productGrid: 'carousel',
    spacing: 'spacious', density: 'airy', motion: 'smooth', elevation: 'flat',
    cardStyle: 'ghost', hoverStyle: 'lift', compositionStyle: 'overlapping',
    paletteHint: 'dark dramatic background (#0a0a0a or deep color), white text, gold/silver accent',
    typographyHint: 'cinematic serif or display font, wide letter-spacing, headingScale 1.3+',
  },
  {
    id: 6, name: 'App Commerce',
    layoutType: 'app-like', heroStyle: 'stacked', productGrid: 'list',
    spacing: 'compact', density: 'dense', motion: 'subtle', elevation: 'flat',
    cardStyle: 'filled', hoverStyle: 'scale', compositionStyle: 'standard',
    paletteHint: 'clean white or very light surface, primary brand color for key actions',
    typographyHint: 'modern sans-serif (e.g. Inter or Plus Jakarta Sans), compact and readable',
  },
  {
    id: 7, name: 'Standard Warm',
    layoutType: 'standard', heroStyle: 'split', productGrid: 'standard',
    spacing: 'comfortable', density: 'normal', motion: 'smooth', elevation: 'subtle',
    cardStyle: 'bordered', hoverStyle: 'lift', compositionStyle: 'standard',
    paletteHint: 'warm off-white or sand background, terracotta or amber primary, earthy tones',
    typographyHint: 'mix of serif heading and sans-serif body, warm and approachable feel',
  },
  {
    id: 8, name: 'Grid Carousel',
    layoutType: 'standard', heroStyle: 'stacked', productGrid: 'carousel',
    spacing: 'compact', density: 'dense', motion: 'expressive', elevation: 'raised',
    cardStyle: 'floating', hoverStyle: 'glow', compositionStyle: 'staggered',
    paletteHint: 'dark or rich background, vibrant neon or metallic accent, high energy',
    typographyHint: 'bold display sans-serif (e.g. Syne or Space Grotesk), strong headingScale',
  },
  {
    id: 9, name: 'Cool Editorial',
    layoutType: 'editorial', heroStyle: 'editorial', productGrid: 'staggered',
    spacing: 'comfortable', density: 'normal', motion: 'smooth', elevation: 'subtle',
    cardStyle: 'ghost', hoverStyle: 'lift', compositionStyle: 'overlapping',
    paletteHint: 'cool palette: slate, navy, or deep blue-green primary; pale blue-gray background',
    typographyHint: 'editorial sans-serif (e.g. DM Sans or Outfit), tight letterSpacing',
  },
  {
    id: 10, name: 'Magazine Split',
    layoutType: 'masonry', heroStyle: 'asymmetrical', productGrid: 'spotlight',
    spacing: 'comfortable', density: 'normal', motion: 'smooth', elevation: 'subtle',
    cardStyle: 'filled', hoverStyle: 'scale', compositionStyle: 'asymmetric',
    paletteHint: 'punchy brand color, white cards on light background, strong visual hierarchy',
    typographyHint: 'condensed or bold heading (e.g. Montserrat or Raleway bold), good contrast',
  },
];

/** Pick a pseudorandom variation from the list, avoiding the previous one. */
function pickVariation(exclude?: number): DesignVariation {
  const pool = exclude != null
    ? DESIGN_VARIATIONS.filter(v => v.id !== exclude)
    : DESIGN_VARIATIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function generateStoreWithClaude(
  prompt: string,
  currency?: { code: string; symbol: string; label: string },
  language?: string,
  advanced?: AdvancedOptions,
  excludeVariationId?: number,
): Promise<GeneratedStoreConfig | null> {
  // Pick a random design variation for visual diversity
  const variation = pickVariation(excludeVariationId);

  try {
    // 1. Generate store design + content from Claude
    const res = await fetch('/api/generate-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, currency, language, advanced, variationSeed: variation }),
    });
    if (!res.ok) return null;
    const text = await res.text();
    const config = parseStoreResponse(text);
    if (!config) return null;

    // 2. Upgrade product images via Pexels (server-side, API key stays hidden)
    try {
      const imgRes = await fetch('/api/product-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: config.design.products.map(p => ({ name: p.name, category: p.category })),
          storeCategory: config.storeCategory ?? '',
        }),
      });

      if (imgRes.ok) {
        const { images } = await imgRes.json() as {
          images: Array<{ name: string; url: string | null }>;
        };

        // Replace static pool URLs with Pexels URLs (skip if Pexels returned null)
        // Keep the original Unsplash URL as imageFallback so ProductImg can
        // retry it if the Pexels URL fails (deleted photo, CDN issue, etc.)
        config.design.products = config.design.products.map(p => {
          const found = images.find(img => img.name === p.name);
          return found?.url
            ? { ...p, image: found.url, imageFallback: p.image }
            : p;
        });
      }
    } catch {
      // Silently fall back to static pool images — store still works
    }

    // Attach variation ID so callers can exclude it on the next regenerate
    (config as GeneratedStoreConfig & { variationId?: number }).variationId = variation.id;

    return config;
  } catch {
    return null;
  }
}
