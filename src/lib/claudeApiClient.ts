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
  {
    id: 11, name: 'Korean Minimal',
    layoutType: 'editorial', heroStyle: 'fashion', productGrid: 'standard',
    spacing: 'spacious', density: 'airy', motion: 'smooth', elevation: 'subtle',
    cardStyle: 'ghost', hoverStyle: 'lift', compositionStyle: 'staggered',
    paletteHint: 'soft blush pink (#f9e8e8), ivory white, dusty rose accent — monochrome with soft warmth',
    typographyHint: 'thin elegant heading (e.g. Cormorant Garamond weight 300 or Italiana), light body (Karla or Jost)',
  },
  {
    id: 12, name: 'Streetwear Drop',
    layoutType: 'standard', heroStyle: 'cinematic', productGrid: 'magazine',
    spacing: 'compact', density: 'dense', motion: 'expressive', elevation: 'raised',
    cardStyle: 'floating', hoverStyle: 'glow', compositionStyle: 'overlapping',
    paletteHint: 'very dark near-black (#080808), with electric neon accent (neon green #39ff14 or cyan #00f5ff)',
    typographyHint: 'ultra-bold condensed heading (Anton or Bebas Neue or Unbounded), mono or geometric body (Space Mono or DM Sans)',
  },
  {
    id: 13, name: 'Luxury Couture',
    layoutType: 'fullscreen', heroStyle: 'asymmetrical', productGrid: 'spotlight',
    spacing: 'spacious', density: 'airy', motion: 'smooth', elevation: 'flat',
    cardStyle: 'ghost', hoverStyle: 'lift', compositionStyle: 'asymmetric',
    paletteHint: 'cream/champagne background (#f6f1e8), gold accent (#c9a84c or #b8952a), minimal and refined',
    typographyHint: 'thin serif heading (Cormorant Garamond weight 300 or Playfair Display), wide letterSpacing 0.14em, light body (Karla)',
  },
  {
    id: 14, name: 'Sustainable Earth',
    layoutType: 'masonry', heroStyle: 'split', productGrid: 'magazine',
    spacing: 'comfortable', density: 'normal', motion: 'smooth', elevation: 'subtle',
    cardStyle: 'bordered', hoverStyle: 'lift', compositionStyle: 'staggered',
    paletteHint: 'earthy warm palette: terracotta (#c17b5c), sage green (#7a9e7e), warm off-white (#faf6ef)',
    typographyHint: 'organic serif heading (Fraunces or DM Serif Display), warm approachable body (Nunito Sans or Karla)',
  },
  {
    id: 15, name: 'Fast Fashion Pop',
    layoutType: 'app-like', heroStyle: 'stacked', productGrid: 'carousel',
    spacing: 'compact', density: 'dense', motion: 'expressive', elevation: 'raised',
    cardStyle: 'floating', hoverStyle: 'scale', compositionStyle: 'grid',
    paletteHint: 'vibrant saturated primary color, clean white background, bold punchy accents — high energy',
    typographyHint: 'bold rounded sans-serif heading (Syne or Josefin Sans), clean readable body (Open Sans or Outfit)',
  },
  {
    id: 16, name: 'Vintage Thrift',
    layoutType: 'editorial', heroStyle: 'editorial', productGrid: 'list',
    spacing: 'comfortable', density: 'normal', motion: 'subtle', elevation: 'flat',
    cardStyle: 'bordered', hoverStyle: 'none', compositionStyle: 'asymmetric',
    paletteHint: 'muted sepia tones: warm beige (#e8d5b7), rust (#b5541c), aged cream background (#f5edd8)',
    typographyHint: 'slab serif heading (Libre Baskerville or Fraunces), slightly worn feel, body in Source Sans 3 or Lato',
  },
  {
    id: 17, name: 'Activewear Tech',
    layoutType: 'standard', heroStyle: 'split', productGrid: 'standard',
    spacing: 'comfortable', density: 'normal', motion: 'smooth', elevation: 'raised',
    cardStyle: 'filled', hoverStyle: 'glow', compositionStyle: 'grid',
    paletteHint: 'deep navy (#0d1b2a) or dark slate base, electric accent (cobalt #1a6cf5 or lime #aaff00), performance feel',
    typographyHint: 'geometric bold sans-serif heading (Raleway or Montserrat 800), condensed body (Barlow or DM Sans)',
  },
];

/** Pick a pseudorandom variation from the list, avoiding the previous one. */
function pickVariation(exclude?: number): DesignVariation {
  const pool = exclude != null
    ? DESIGN_VARIATIONS.filter(v => v.id !== exclude)
    : DESIGN_VARIATIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Detects the subcategory/aesthetic from the user's prompt and returns an
 * injected style seed string. This is appended to the prompt so Claude picks
 * more on-point typography, color, and layout without requiring the user to
 * know design vocabulary.
 */
function detectStyleSeed(prompt: string): string {
  const p = prompt.toLowerCase();

  // ── Fashion subcategories ───────────────────────────────────────────────
  if (p.match(/streetwear|urban|hype|drop|sneaker|hypebeast|graffiti/))
    return 'streetwear urban culture — raw energy, limited drops, bold typography, dark palette or neon accent';

  if (p.match(/luxury|couture|haute|bespoke|maison|atelier|exclusiv/))
    return 'luxury couture — extreme exclusivity, editorial restraint, serif typography, cream or dark cinematic palette';

  if (p.match(/korea|kpop|k-fashion|korean|seoul|oppa|hanbok/))
    return 'Korean fashion aesthetic — soft minimal, blush and ivory palette, delicate thin typography, clean editorial spacing';

  if (p.match(/vintage|thrift|retro|second.hand|secondhand|pre.loved|preloved|antik|jadul/))
    return 'vintage thrift aesthetic — nostalgic warmth, muted sepia tones, slab serif typography, worn editorial feel';

  if (p.match(/sport|gym|athletic|fitness|active|lari|olahraga|workout|performance/))
    return 'activewear performance — technical energy, bold geometric sans, dark or cool palette with electric accent';

  if (p.match(/sustainable|eco|green|organic|ethical|slow.fashion|ramah lingkungan/))
    return 'sustainable earth-tone fashion — natural earthy palette, warm organic serif, conscious and calm visual energy';

  if (p.match(/fast.fashion|trendy|affordable|masa kini|kekinian|murah|koleksi baru|new.arrival/))
    return 'fast fashion pop — high energy, vibrant saturated palette, bold rounded sans, dense product grid';

  if (p.match(/bohemian|boho|festival|hippie|tribal|ethnic|tenun|batik/))
    return 'bohemian artisan fashion — warm earthy rich palette, textured serif, artisanal editorial layout';

  if (p.match(/minimalist|minimalis|clean|simple|basic|capsule wardrobe/))
    return 'minimalist fashion — ultra-clean palette, thin elegant typography, maximal whitespace, ghost cards';

  if (p.match(/lingerie|intimate|bra|pakaian dalam|underwear|sleepwear/))
    return 'intimate fashion — soft blush and cream palette, delicate serif typography, editorial split hero, sensual but tasteful';

  if (p.match(/hijab|modest|muslimah|syar.i|abaya|kaftan/))
    return 'modest fashion — elegant warm palette (dusty rose, ivory, sage), refined serif heading, editorial and airy layout';

  if (p.match(/kids|anak|children|baby|bayi|toddler/))
    return 'kids fashion — playful bright palette, rounded sans typography, high energy, friendly card style';

  // ── Non-fashion but specific ────────────────────────────────────────────
  if (p.match(/jewelry|perhiasan|emas|gold|silver|perak|diamond|berlian|cincin/))
    return 'fine jewelry — luxury cream palette with gold accent, ultra-thin serif, floating cards, cinematic hero';

  if (p.match(/beauty|skincare|makeup|kosmetik|serum|moisturizer|perawatan/))
    return 'beauty and skincare — clean soft palette, minimal elegant typography, lifestyle editorial imagery';

  if (p.match(/coffee|kopi|cafe|specialty|roast|beans/))
    return 'specialty coffee — warm dark roast palette (espresso brown, cream), artisan serif, cozy editorial layout';

  if (p.match(/food|makanan|culinary|snack|catering|restaurant|bakery|roti|kue/))
    return 'food and culinary — warm appetizing palette, approachable rounded typography, lifestyle imagery focus';

  // ── Default: no seed ────────────────────────────────────────────────────
  return '';
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

  // Inject a style seed based on detected subcategory keywords.
  // This helps Claude pick on-point tokens without requiring design vocabulary from the user.
  const styleSeed = detectStyleSeed(prompt);
  const enrichedPrompt = styleSeed
    ? `${prompt}\n\n[Style direction: ${styleSeed}]`
    : prompt;

  try {
    // 1. Generate store design + content from Claude
    const res = await fetch('/api/generate-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: enrichedPrompt, currency, language, advanced, variationSeed: variation }),
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
