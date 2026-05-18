import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { SYSTEM_PROMPT } from '@/src/lib/claudePrompt';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { prompt, currency, language } = await req.json();

  if (!prompt || typeof prompt !== 'string') {
    return new Response('Missing prompt', { status: 400 });
  }

  const extras: string[] = [];
  if (currency) extras.push(`Currency: ${currency.label} (${currency.code}, symbol: ${currency.symbol}). Use realistic ${currency.code} pricing for all products.`);
  if (language) extras.push(`Generate ALL text content (storeName, tagline, heroTitle, heroSubtitle, ctaText, navLinks, product names, descriptions, features, testimonials, FAQ, newsletter, promoBar, brandStory, trustBadges, collections, stats) in ${language}. Only exception: keep category value in English.`);

  const userMessage = extras.length > 0 ? `${prompt}\n\n${extras.join('\n')}` : prompt;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('API key not configured', { status: 500 });
  }

  const client = new Anthropic({ apiKey });

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
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
