import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = searchParams.get('limit') || '20';

  if (!query || !query.trim()) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  try {
    const baseUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=id`;
    const url = `${baseUrl}&q=${encodeURIComponent(query)}&limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'id,en',
        'User-Agent': 'Storee-Location-Search/1.0'
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Nominatim returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Location search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}
