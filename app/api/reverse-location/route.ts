import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const CONFIDENCE_THRESHOLD = 0.40; // Minimum confidence score for Nominatim result (40% = fair address)

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

    // If Google also has no results, fallback to Nominatim (better than 500 error)
    if (!googleResult) {
      console.log(`⚠️ Google returned no results, using Nominatim fallback (confidence: ${(confidence * 100).toFixed(1)}%)`);
      return NextResponse.json({
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        display_name: nominatimResult.display_name || '',
        address: nominatimResult.address || {},
        source: 'nominatim_fallback',
        confidence: confidence,
        warning: 'Low confidence - Google returned no results'
      });
    }

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
 * Returns null if no results found (fallback to Nominatim)
 */
async function reverseGeocodeGoogle(lat: string, lon: string) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${process.env.GOOGLE_MAPS_API_KEY}&language=id`
    );

    if (!response.ok) {
      console.warn(`⚠️ Google Geocoding API error: ${response.status}`);
      return null; // Return null instead of throwing, will fallback to Nominatim
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      console.log(`✅ Google Geocoding found result`);
      return data.results[0]; // Return best match
    }

    console.log(`⚠️ Google Geocoding returned no results for (${lat}, ${lon})`);
    return null; // Return null instead of throwing, will fallback to Nominatim
  } catch (error) {
    console.error(`🔴 Google Geocoding API error:`, error);
    return null; // Return null on any error, will fallback to Nominatim
  }
}

/**
 * Calculate confidence score for Nominatim result
 * Scoring system (0.0 - 1.0):
 *   0.9-1.0: Excellent - street address with number + street name + area details
 *   0.7-0.9: Good - complete district/village info with some specificity
 *   0.5-0.7: Fair - administrative boundaries present but generic
 *   0.3-0.5: Poor - incomplete or very generic
 *   0.0-0.3: Very Poor - placeholder or unusable
 */
function calculateConfidence(result: any): number {
  const addr = result.address || {};
  const displayName = (result.display_name || '').toLowerCase();
  const osm_type = result.osm_type || ''; // node, way, relation from Nominatim
  const type = result.type || ''; // amenity, building, highway, etc

  let score = 0;
  const weights = {
    // Street-level components (highest priority)
    house_number: { points: 0.25, weight: 2 },
    building_name: { points: 0.2, weight: 1.8 },
    road: { points: 0.22, weight: 1.9 },
    street: { points: 0.20, weight: 1.8 },

    // Block/area components (Indonesia-specific)
    city_block: { points: 0.18, weight: 1.5 }, // RW/block info
    suburb: { points: 0.15, weight: 1.2 },
    neighbourhood: { points: 0.12, weight: 1.0 },

    // Administrative components
    village: { points: 0.16, weight: 1.3 },
    hamlet: { points: 0.14, weight: 1.1 },
    district: { points: 0.12, weight: 1.0 },
    city: { points: 0.1, weight: 0.8 },
    county: { points: 0.08, weight: 0.6 },
    state: { points: 0.06, weight: 0.4 },

    // Postal/location info
    postcode: { points: 0.05, weight: 0.5 }
  };

  // ===== SCORING LOGIC =====

  // 1. Base score from hierarchical address completeness
  const addressFields = Object.keys(weights);
  let fieldsPresent = 0;
  let fieldScore = 0;

  for (const field of addressFields) {
    if (addr[field]) {
      fieldsPresent++;
      fieldScore += weights[field as keyof typeof weights].points;
    }
  }

  // Calculate address completeness
  const addressCompleteness = Math.min(fieldScore, 1.0);

  // 1. Base score from hierarchical address completeness
  // Emphasis on having administrative hierarchy (village/district/city at minimum)
  const hasMinimalHierarchy = !!(addr.city || addr.district || addr.village);
  const baseFactor = hasMinimalHierarchy ? 0.70 : 0.50; // If has minimal hierarchy, boost base score

  score += addressCompleteness * baseFactor; // Address completeness = primary score

  // 2. Type quality scoring (based on OSM classification)
  const typeScore = getTypeQuality(osm_type, type);
  score += typeScore * 0.12; // Type quality = 12% of score

  // 3. Detail level scoring (specific address vs generic)
  const detailScore = getDetailScore(addr);
  score += detailScore * 0.12; // Detail level = 12% of score

  // 4. Generic content detection (reduce score for placeholder addresses)
  const genericityPenalty = detectGenericity(displayName, addr);
  score -= genericityPenalty; // Apply penalty

  // 5. Completeness bonus (reward addresses with many fields)
  if (fieldsPresent >= 6) score += 0.12; // Excellent completeness
  else if (fieldsPresent >= 5) score += 0.08; // Very good
  else if (fieldsPresent >= 4) score += 0.06; // Good completeness
  else if (fieldsPresent >= 3) score += 0.04; // Fair

  // 6. Structure quality (hierarchical depth)
  const hierarchyScore = getHierarchyScore(addr);
  score += hierarchyScore * 0.06; // Hierarchy = 6% of score

  // ===== RESULT =====
  return Math.min(1.0, Math.max(0.0, score));
}

/**
 * Score based on OSM type and feature type
 * Street addresses and buildings are most reliable
 */
function getTypeQuality(osm_type: string, type: string): number {
  const typeStr = `${osm_type}:${type}`.toLowerCase();

  // Excellent types - very specific locations
  if (typeStr.includes('building') || typeStr.includes('house') || typeStr.includes('shop')) {
    return 0.95;
  }
  if (typeStr.includes('way:highway') || typeStr.includes('street') || typeStr.includes('road')) {
    return 0.90;
  }

  // Good types - specific areas/amenities
  if (
    typeStr.includes('amenity') ||
    typeStr.includes('place:neighbourhood') ||
    typeStr.includes('place:suburb')
  ) {
    return 0.80;
  }

  // Fair types - administrative divisions
  if (
    typeStr.includes('place:village') ||
    typeStr.includes('place:hamlet') ||
    typeStr.includes('place:town')
  ) {
    return 0.70;
  }

  // Generic types
  if (typeStr.includes('place:county') || typeStr.includes('administrative')) {
    return 0.50;
  }

  // Unknown or very generic
  return 0.40;
}

/**
 * Score detail level - prefer specific street-level over generic boundaries
 */
function getDetailScore(addr: any): number {
  let score = 0;

  // Highest priority: street-level detail
  if (addr.house_number) score += 0.35;
  if (addr.road || addr.street) score += 0.30;
  if (addr.building_name) score += 0.25;

  // Medium priority: area-level detail (Indonesia-specific)
  if (addr.city_block || addr.neighbourhood) score += 0.20; // RW info
  if (addr.suburb) score += 0.15;

  // Lower priority: administrative detail
  if (addr.village || addr.hamlet) score += 0.10;
  if (addr.district) score += 0.08;

  // Lowest priority: high-level administrative
  if (addr.postcode) score += 0.05;
  if (addr.city) score += 0.03;

  return Math.min(1.0, score);
}

/**
 * Detect generic/placeholder addresses that should trigger Google fallback
 * Returns penalty score (0.0 - 1.0) to subtract from confidence
 */
function detectGenericity(displayName: string, addr: any): number {
  const dn = displayName.toLowerCase();
  let penalty = 0;

  // Red flags: generic keywords
  const genericKeywords = [
    'unnamed',
    'unknown',
    'road',
    'street',
    'no name',
    'no description',
    'temporary',
    'placeholder',
    'null'
  ];

  for (const keyword of genericKeywords) {
    if (dn.includes(keyword)) {
      penalty += 0.15;
    }
  }

  // Yellow flags: missing street/building but has general area
  if (!addr.house_number && !addr.road && !addr.building_name) {
    if (addr.village || addr.city) {
      penalty += 0.05; // Slight penalty for area-only results
    } else {
      penalty += 0.20; // Major penalty if only country/state level
    }
  }

  // Red flag: only country/state level (extremely generic)
  if (!addr.village && !addr.city && !addr.district) {
    penalty += 0.25;
  }

  // Yellow flag: duplicate names (e.g. "Jakarta, Jakarta")
  const nameParts = displayName.split(',').map(p => p.trim().toLowerCase());
  if (nameParts.length > 1) {
    const uniqueParts = new Set(nameParts);
    if (uniqueParts.size < nameParts.length * 0.8) {
      penalty += 0.10; // Redundant/duplicate info
    }
  }

  return Math.min(0.5, penalty); // Cap penalty at 0.5
}

/**
 * Score hierarchical completeness
 * Good hierarchy = country → state → city → district → village → street
 */
function getHierarchyScore(addr: any): number {
  let hierarchyLevel = 0;

  // Count hierarchical depth
  if (addr.country) hierarchyLevel++;
  if (addr.state || addr.province) hierarchyLevel++;
  if (addr.city || addr.county) hierarchyLevel++;
  if (addr.district) hierarchyLevel++;
  if (addr.village || addr.hamlet || addr.neighbourhood) hierarchyLevel++;
  if (addr.road || addr.street) hierarchyLevel++;
  if (addr.house_number) hierarchyLevel++;

  // Score based on depth
  if (hierarchyLevel >= 6) return 0.95; // Excellent depth
  if (hierarchyLevel >= 5) return 0.85; // Very good
  if (hierarchyLevel >= 4) return 0.70; // Good
  if (hierarchyLevel >= 3) return 0.50; // Fair
  if (hierarchyLevel >= 2) return 0.30; // Poor
  return 0.10; // Very poor
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
