import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { SYSTEM_PROMPT } from '@/src/lib/claudePrompt';
import { createServerClient } from '@/src/lib/supabase';

export const runtime = 'nodejs';

// ── Live config from Supabase (falls back to hardcoded defaults) ──────────────
async function getLiveConfig(): Promise<{ prompt: string; model: string; maxTokens: number }> {
  try {
    const sb = createServerClient();
    const { data } = await sb.from('system_config').select('key, value');

    const map: Record<string, string> = {};
    (data ?? []).forEach((row: { key: string; value: string }) => {
      map[row.key] = row.value;
    });

    return {
      prompt:    map['system_prompt'] ?? SYSTEM_PROMPT,
      model:     map['model']         ?? 'claude-sonnet-4-6',
      maxTokens: parseInt(map['max_tokens'] ?? '4096', 10),
    };
  } catch {
    return { prompt: SYSTEM_PROMPT, model: 'claude-sonnet-4-6', maxTokens: 4096 };
  }
}

export async function POST(req: NextRequest) {
  const { prompt, currency, language, advanced } = await req.json();

  if (!prompt || typeof prompt !== 'string') {
    return new Response('Missing prompt', { status: 400 });
  }

  const extras: string[] = [];
  if (currency) extras.push(`Currency: ${currency.label} (${currency.code}, symbol: ${currency.symbol}). Use realistic ${currency.code} pricing for all products.`);
  if (language) extras.push(`Generate ALL text content (storeName, tagline, heroTitle, heroSubtitle, ctaText, navLinks, product names, descriptions, features, testimonials, FAQ, newsletter, promoBar, brandStory, trustBadges, collections, stats) in ${language}. Only exception: keep category value in English.`);

  if (advanced) {
    // Theme colors
    if (advanced.themeColors) {
      const tc = advanced.themeColors;
      const colorMap: Record<string, string> = {
        primary: 'primaryColor', secondary: 'accentColor', accent: 'accent',
        background: 'background', surface: 'surface', textPrimary: 'text primary',
        textSecondary: 'text secondary', border: 'border', success: 'success', danger: 'danger/error',
      };
      const setColors = Object.entries(tc).filter(([, v]) => typeof v === 'string' && v.trim());
      if (setColors.length > 0) {
        const colorStr = setColors.map(([k, v]) => `${colorMap[k] ?? k}: ${v}`).join(', ');
        extras.push(`Use these exact theme colors in your design: ${colorStr}. Set primaryColor to the primary value if provided.`);
      }
    }
    if (advanced.mood) extras.push(`Store mood/tone: ${advanced.mood}. Reflect this in all copywriting, product descriptions, and design choices.`);
    if (advanced.audience) extras.push(`Target audience: ${advanced.audience}. Tailor the product catalog, language, and aesthetic to this audience.`);
    if (advanced.productCount === 'few') extras.push(`Generate exactly 5–6 products in the catalog.`);
    else if (advanced.productCount === 'medium') extras.push(`Generate exactly 10–12 products in the catalog.`);
    else if (advanced.productCount === 'many') extras.push(`Generate exactly 16–20 products in the catalog.`);
    const featureMap: Record<string, string> = {
      reviews: 'product reviews/ratings section',
      wishlist: 'wishlist/favorites feature',
      newsletter: 'newsletter signup section',
      promoBar: 'promotional announcement bar',
      faq: 'FAQ section',
      testimonials: 'customer testimonials section',
      brandStory: 'brand story/about section',
      trustBadges: 'trust badges (secure payment, fast shipping, etc.)',
    };
    const on = Object.entries(advanced.features ?? {}).filter(([, v]) => v).map(([k]) => featureMap[k] ?? k);
    const off = Object.entries(advanced.features ?? {}).filter(([, v]) => !v).map(([k]) => featureMap[k] ?? k);
    if (on.length > 0) extras.push(`Definitely include these features: ${on.join(', ')}.`);
    if (off.length > 0) extras.push(`Do NOT include: ${off.join(', ')}.`);
  }

  const userMessage = extras.length > 0 ? `${prompt}\n\n${extras.join('\n')}` : prompt;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('API key not configured', { status: 500 });
  }

  // Read live config (edited via /sysconfig)
  const config = await getLiveConfig();

  const client = new Anthropic({ apiKey });

  const stream = await client.messages.stream({
    model:      config.model,
    max_tokens: config.maxTokens,
    system: [
      {
        type: 'text',
        text: config.prompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
