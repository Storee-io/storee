import { NextRequest, NextResponse } from 'next/server';
import { fetchPexelsImages } from '@/src/lib/pexels';

export const runtime = 'nodejs';

/**
 * POST /api/product-images
 * Body: { products: Array<{ name: string; category: string }>, storeCategory: string }
 * Returns: { images: Array<{ name: string; url: string | null }> }
 *
 * Server-side only — PEXELS_API_KEY is never exposed to the browser.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const products: Array<{ name: string; category: string }> = body.products ?? [];
    const storeCategory: string = body.storeCategory ?? '';

    if (!products.length) {
      return NextResponse.json({ images: [] });
    }

    const images = await fetchPexelsImages(products, storeCategory);
    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] }, { status: 500 });
  }
}
