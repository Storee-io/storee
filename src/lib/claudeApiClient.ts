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
    const res = await fetch('/api/generate-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, currency, language, advanced }),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return parseStoreResponse(text);
  } catch {
    return null;
  }
}
