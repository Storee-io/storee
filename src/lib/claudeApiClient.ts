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

export async function generateStoreWithClaude(
  prompt: string,
  currency?: { code: string; symbol: string; label: string },
  language?: string,
  advanced?: AdvancedOptions,
): Promise<GeneratedStoreConfig | null> {
  try {
    // 1. Generate store design + content from Claude
    const res = await fetch('/api/generate-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, currency, language, advanced }),
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
        config.design.products = config.design.products.map(p => {
          const found = images.find(img => img.name === p.name);
          return found?.url ? { ...p, image: found.url } : p;
        });
      }
    } catch {
      // Silently fall back to static pool images — store still works
    }

    return config;
  } catch {
    return null;
  }
}
