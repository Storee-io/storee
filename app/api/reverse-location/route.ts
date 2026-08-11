import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const CONFIDENCE_THRESHOLD = 0.5; // Minimum confidence score for Nominatim result

/**
 * Hybrid reverse geocoding API
 * Convert lat/lon coordinates to address
 *
 * Strategy:
 * Layer 1: Nominatim (FREE) - try first
 * Layer 2: Google Geocoding API (PAID) - fallback if Nominatim insufficient
 *
 * Cost: $0-5/month (mostly free, fallback only when needed)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const useGoogle = searchParams.get('google') !== 'false'; // Allow forcing Nominatim-only

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'lat and lon parameters required' },
      { status: 400 }
    );
  }

  try {
    // ===== LAYER 1: Try Nominatim (FREE) =====
    console.log(`🔍 Reverse geocoding: lat=${lat}, lon=${lon}`);

    const nominatimResult = await reverseGeocodeNominatim(lat, lon);

    // Check if Nominatim result is good enough
    const confidence = calculateConfidence(nominatimResult);
    console.log(`📍 Nominatim confidence: ${(confidence * 100).toFixed(1)}%`);

    if (confidence >= CONFIDENCE_THRESHOLD) {
      console.log(`✅ Using Nominatim result (confidence: ${confidence})`);
      return NextResponse.json({
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        display_name: nominatimResult.display_name || '',
        address: nominatimResult.address || {},
        source: 'nominatim',
        confidence: confidence
      });
    }

    // ===== LAYER 2: Fallback to Google (PAID) =====
    if (!useGoogle || !GOOGLE_MAPS_API_KEY) {
      console.warn(`⚠️ Nominatim confidence low (${confidence}) but Google fallback disabled`);
      return NextResponse.json({
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        display_name: nominatimResult.display_name || '',
        address: nominatimResult.address || {},
        source: 'nominatim',
        confidence: confidence,
        warning: 'Low confidence - no Google fallback available'
      });
    }

    console.log(`📡 Nominatim insufficient, falling back to Google Geocoding API...`);
    const googleResult = await reverseGeocodeGoogle(lat, lon);

    return NextResponse.json({
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      display_name: googleResult.formatted_address || '',
      address: googleResult.address_components ? parseGoogleAddress(googleResult.address_components) : {},
      source: 'google',
      cost_estimate: 0.005 // Google Geocoding API cost
    });
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Reverse geocoding failed',
        lat: parseFloat(lat),
        lon: parseFloat(lon)
      },
      { status: 500 }
    );
  }
}

/**
 * Reverse geocode using Nominatim (FREE)
 */
async function reverseGeocodeNominatim(lat: string, lon: string) {
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

  return await response.json();
}

/**
 * Reverse geocode using Google Geocoding API (PAID - $5 per 1000 calls)
 */
async function reverseGeocodeGoogle(lat: string, lon: string) {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${process.env.GOOGLE_MAPS_API_KEY}&language=id`
  );

  if (!response.ok) {
    throw new Error(`Google Geocoding API failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.results && data.results.length > 0) {
    return data.results[0]; // Return best match
  }

  throw new Error('No results from Google Geocoding API');
}

/**
 * Calculate confidence score for Nominatim result
 * High confidence = detailed address with street/building info
 * Low confidence = generic administrative boundary
 */
function calculateConfidence(result: any): number {
  const addr = result.address || {};
  const displayName = (result.display_name || '').toLowerCase();

  let confidence = 0.5; // Base confidence

  // Boost for street-level details
  if (addr.house_number) confidence += 0.2; // Has street number
  if (addr.road || addr.street) confidence += 0.15; // Has street name
  if (addr.city_block) confidence += 0.1; // Has block/RW info

  // Reduce for generic results
  if (displayName.includes('unnamed') || displayName.includes('unknown')) confidence -= 0.2;
  if (!addr.village && !addr.city) confidence -= 0.1; // No city/village info

  return Math.min(1, Math.max(0, confidence));
}

/**
 * Parse Google Geocoding API address components
 */
function parseGoogleAddress(components: any[]): any {
  const result: any = {};

  for (const component of components) {
    const types = component.types || [];

    if (types.includes('street_number')) result.house_number = component.long_name;
    if (types.includes('route')) result.road = component.long_name;
    if (types.includes('administrative_area_level_3')) result.district = component.long_name;
    if (types.includes('administrative_area_level_2')) result.city = component.long_name;
    if (types.includes('administrative_area_level_1')) result.state = component.long_name;
    if (types.includes('postal_code')) result.postcode = component.long_name;
    if (types.includes('country')) result.country = component.long_name;
  }

  return result;
}
