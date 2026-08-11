/**
 * Google Maps API wrapper untuk address search (Places API)
 * Digunakan sebagai fallback ketika local DB tidak menemukan hasil yang cukup
 *
 * Setup:
 * 1. Buat API key di Google Cloud Console
 * 2. Enable "Places API" (Autocomplete, Place Details)
 * 3. Set GOOGLE_MAPS_API_KEY di environment variables
 *
 * Cost: $0.50 per 1000 autocomplete requests (30% lebih murah dari Search API)
 */

export interface GooglePlacePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

export interface GooglePlaceDetails {
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  formatted_address: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface GoogleSearchResult {
  type: 'street_address' | 'poi' | 'city';
  name: string;
  description: string;
  province: string;
  regency: string;
  district: string;
  village: string;
  postal: string;
  confidence: number; // 0.5-0.9 (Google results biasanya lower confidence)
  source: 'google_maps';
  lat?: number;
  lng?: number;
}

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

/**
 * Search menggunakan Google Places Autocomplete API
 * Lebih murah ($0.50/1K) dibanding Search API ($3.65/1K)
 * Cocok untuk address suggestions
 */
export async function searchGoogleMaps(
  query: string,
  limit: number = 10
): Promise<GoogleSearchResult[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('⚠️  GOOGLE_MAPS_API_KEY not set, skipping Google fallback');
    return [];
  }

  try {
    // Use Autocomplete API (cheaper than Search API)
    const predictions = await getPlaceAutocomplete(query);

    if (!predictions.length) {
      console.log('🔴 Google Autocomplete returned no results for:', query);
      return [];
    }

    // Fetch details untuk top 5 predictions
    const results: GoogleSearchResult[] = [];

    for (const pred of predictions.slice(0, 5)) {
      try {
        const details = await getPlaceDetails(pred.place_id);

        const result = parseGooglePlaceDetails(details, pred.description);
        if (result) {
          results.push(result);
        }
      } catch (err) {
        console.error(`Failed to fetch details for ${pred.place_id}:`, err);
        // Continue dengan prediction lain
      }
    }

    console.log(`✅ Google Maps returned ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Google Maps API error:', error);
    return []; // Graceful fallback
  }
}

/**
 * Get autocomplete predictions dari Google
 * Lebih murah dibanding Search API
 */
async function getPlaceAutocomplete(query: string): Promise<GooglePlacePrediction[]> {
  const url = new URL(`${GOOGLE_PLACES_API_BASE}/autocomplete/json`);
  url.searchParams.set('input', query);
  url.searchParams.set('components', 'country:id'); // Hanya Indonesia
  url.searchParams.set('language', 'id');
  url.searchParams.set('key', GOOGLE_MAPS_API_KEY!);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Google Autocomplete failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status !== 'OK') {
    console.warn(`Google Autocomplete status: ${data.status}`);
    return [];
  }

  return data.predictions || [];
}

/**
 * Get details dari Google Place
 */
async function getPlaceDetails(placeId: string): Promise<GooglePlaceDetails> {
  const url = new URL(`${GOOGLE_PLACES_API_BASE}/details/json`);
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('language', 'id');
  url.searchParams.set('key', GOOGLE_MAPS_API_KEY!);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Google Place Details failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Google Place Details status: ${data.status}`);
  }

  return data.result;
}

/**
 * Parse Google Place Details ke format lokal
 */
function parseGooglePlaceDetails(
  details: GooglePlaceDetails,
  description: string
): GoogleSearchResult | null {
  try {
    const components = details.address_components || [];

    // Extract components
    const province = findComponent(components, ['administrative_area_level_1']) || '';
    const regency = findComponent(components, ['administrative_area_level_2']) || '';
    const district = findComponent(components, ['administrative_area_level_3']) || '';
    const postal = findComponent(components, ['postal_code']) || '';
    const village =
      findComponent(components, ['locality']) ||
      findComponent(components, ['administrative_area_level_4']) ||
      '';

    // Confidence lebih rendah karena ini dari Google, tidak dari official DB
    return {
      type: 'street_address',
      name: details.formatted_address,
      description,
      province,
      regency,
      district,
      village,
      postal,
      confidence: 0.7, // Google results lebih "fuzzy"
      source: 'google_maps',
      lat: details.geometry?.location?.lat,
      lng: details.geometry?.location?.lng
    };
  } catch (error) {
    console.error('Error parsing Google place details:', error);
    return null;
  }
}

/**
 * Helper: find address component by type
 */
function findComponent(
  components: GooglePlaceDetails['address_components'],
  types: string[]
): string {
  const component = components.find(c => types.some(t => c.types.includes(t)));
  return component?.long_name || '';
}

/**
 * Estimasi cost per query
 * Autocomplete: $0.50 / 1000 queries = $0.0005 per query
 * Place Details: $0.20 / 1000 queries = $0.0002 per query
 */
export const GOOGLE_COST_ESTIMATE = {
  AUTOCOMPLETE_COST: 0.0005, // per query
  DETAILS_COST: 0.0002, // per query
  TOTAL_PER_QUERY: 0.0007, // Roughly $0.70 per 1000 queries
};
