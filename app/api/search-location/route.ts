import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// MapBox Geocoding API requires access token
const MAPBOX_TOKEN = process.env.MAPBOX_PUBLIC_TOKEN;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = searchParams.get('limit') || '20';

  if (!query || !query.trim()) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  if (!MAPBOX_TOKEN) {
    console.error('❌ MAPBOX_PUBLIC_TOKEN not set');
    return NextResponse.json(
      { error: 'Geocoding service not configured' },
      { status: 500 }
    );
  }

  try {
    // MapBox Geocoding API: https://docs.mapbox.com/api/search/geocoding/
    // Returns results in Nominatim-compatible format for easy migration
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      country: 'id', // Indonesia
      limit: String(Math.min(parseInt(limit), 10)), // MapBox max 10 per request
      language: 'id,en',
      // Proximity bias to Tangerang/Jakarta area (central Indonesia hub)
      proximity: '106.62,-6.17' // Tangerang coordinates for Indonesia location bias
    });

    const fullUrl = `${url}?${params}`;

    const response = await fetch(fullUrl);

    // Success - return immediately
    if (response.ok) {
      const data = await response.json();
      // Transform MapBox format to Nominatim-compatible format
      const results = transformMapBoxToNominatim(data);
      return NextResponse.json(results);
    }

    // Error handling
    return NextResponse.json(
      { error: `MapBox returned ${response.status}` },
      { status: response.status }
    );
  } catch (error) {
    console.error('❌ Location search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}

// Transform MapBox Geocoding response to Nominatim-compatible format
function transformMapBoxToNominatim(mapboxData: any) {
  if (!mapboxData.features || !Array.isArray(mapboxData.features)) {
    return [];
  }

  return mapboxData.features.map((feature: any) => ({
    display_name: feature.place_name || '',
    lat: feature.center?.[1],
    lon: feature.center?.[0],
    address: {
      house_number: feature.properties?.address || '',
      street: feature.text || '',
      postcode: feature.postcode || '',
      city: feature.context?.find((c: any) => c.id.startsWith('place.'))?.text || '',
      state: feature.context?.find((c: any) => c.id.startsWith('region.'))?.text || '',
      country: feature.context?.find((c: any) => c.id.startsWith('country.'))?.text || 'Indonesia'
    }
  }));
}
