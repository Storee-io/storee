import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Reverse geocoding API
 * Convert lat/lon coordinates to address
 * Uses Nominatim (OpenStreetMap) for free reverse geocoding
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'lat and lon parameters required' },
      { status: 400 }
    );
  }

  try {
    // Use Nominatim reverse geocoding (free, no API key needed)
    // Documentation: https://nominatim.org/release-docs/latest/api/Reverse/
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=id`,
      {
        headers: {
          'User-Agent': 'Storee Location Service (https://storee.io)'
        }
      }
    );

    if (!response.ok) {
      console.error(`Nominatim error: ${response.status}`);
      throw new Error(`Nominatim reverse geocoding failed: ${response.status}`);
    }

    const data = await response.json();

    // Transform Nominatim response to our format
    return NextResponse.json({
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      display_name: data.display_name || '',
      address: data.address || {}
    });
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Reverse geocoding failed',
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        display_name: '',
        address: {}
      },
      { status: 500 }
    );
  }
}
