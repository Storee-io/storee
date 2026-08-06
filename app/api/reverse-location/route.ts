import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Latitude and longitude required' }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;

    // Retry logic with exponential backoff for rate limiting (429 errors)
    let lastResponse;
    for (let attempt = 0; attempt < 3; attempt++) {
      lastResponse = await fetch(url, {
        headers: {
          'Accept-Language': 'id,en',
          'User-Agent': 'Storee-Location-Reverse/1.0'
        }
      });

      // Success - return immediately
      if (lastResponse.ok) {
        const data = await lastResponse.json();
        return NextResponse.json(data);
      }

      // Not rate limited - return error
      if (lastResponse.status !== 429) {
        return NextResponse.json(
          { error: `Nominatim returned ${lastResponse.status}` },
          { status: lastResponse.status }
        );
      }

      // Rate limited (429) - retry with exponential backoff
      if (attempt < 2) {
        const retryAfter = lastResponse.headers.get('Retry-After');
        const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : 0;
        // Use exponential backoff (4s, 8s) if Retry-After is missing or <= 0
        const delayMs = retryAfterMs > 0 ? retryAfterMs : Math.pow(2, attempt + 2) * 1000;

        console.log(`⏳ Rate limited (429), retrying after ${delayMs}ms (attempt ${attempt + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // All retries exhausted
    return NextResponse.json(
      { error: `Nominatim returned ${lastResponse?.status || 429}` },
      { status: lastResponse?.status || 429 }
    );
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reverse geocoding failed' },
      { status: 500 }
    );
  }
}
