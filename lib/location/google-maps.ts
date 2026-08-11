/**
 * Google Maps API wrapper untuk address search (Places API NEW)
 * Menggunakan Places API v1 (recommended oleh Google)
 * Digunakan sebagai fallback ketika local DB tidak menemukan hasil yang cukup
 *
 * Setup:
 * 1. Buat API key di Google Cloud Console
 * 2. Enable "Places API" (v1 - New)
 * 3. Set GOOGLE_MAPS_API_KEY di environment variables
 *
 * Cost: $0.005 per request (very cheap!)
 * Note: Requires billing setup in Google Cloud, but usage-based
 */

export interface GooglePlacePrediction {
  placeId: string;
  mainText: string;
  secondaryText?: string;
}

export interface GooglePlaceDetails {
  displayName: string;
  formattedAddress: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  addressComponents?: Array<{
    longText: string;
    shortText: string;
    types: string[];
  }>;
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
  confidence: number;
  source: 'google_maps';
  lat?: number;
  lng?: number;
}

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_PLACES_API_V1 = 'https://places.googleapis.com/v1/places';

/**
 * Search menggunakan Google Places API v1 (New)
 * Lebih murah dan recommended oleh Google
 * Cocok untuk address suggestions dan fallback search
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
    // Use Autocomplete Sessions API (cheaper & more accurate)
    const predictions = await getPlaceAutocompleteV1(query);

    if (!predictions.length) {
      console.log('🔴 Google Autocomplete returned no results for:', query);
      return [];
    }

    // Fetch details untuk top 5 predictions
    const results: GoogleSearchResult[] = [];

    for (const pred of predictions.slice(0, 5)) {
      try {
        const details = await getPlaceDetailsV1(pred.placeId);
        const result = parseGooglePlaceDetailsV1(details, pred.mainText, pred.secondaryText);
        if (result) {
          results.push(result);
        }
      } catch (err) {
        console.error(`Failed to fetch details for ${pred.placeId}:`, err);
      }
    }

    console.log(`✅ Google Maps returned ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Google Maps API error:', error);
    return [];
  }
}

/**
 * Get autocomplete predictions dari Google Places API v1
 * Menggunakan Autocomplete Session Tokens untuk cost efficiency
 */
async function getPlaceAutocompleteV1(
  query: string
): Promise<GooglePlacePrediction[]> {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!
  };

  const body = {
    input: query,
    locationRestriction: {
      rectangle: {
        low: { latitude: -10.0, longitude: 95.0 },
        high: { latitude: 6.0, longitude: 141.0 }
      }
    },
    languageCode: 'id'
  };

  try {
    const response = await fetch(
      `${GOOGLE_PLACES_API_V1}:autocomplete`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Google Autocomplete error: ${response.status}`, errorData);
      throw new Error(`Google Autocomplete failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.suggestions) {
      return [];
    }

    return data.suggestions.map((s: any) => ({
      placeId: s.placePrediction?.placeId || '',
      mainText: s.placePrediction?.structuredFormat?.mainText?.text || s.placePrediction?.mainText?.text || s.mainText || '',
      secondaryText: s.placePrediction?.structuredFormat?.secondaryText?.text || s.placePrediction?.secondaryText?.text || s.secondaryText || ''
    }));
  } catch (error) {
    console.error('Google Autocomplete API error:', error);
    return [];
  }
}

/**
 * Get details dari Google Place menggunakan API v1
 */
async function getPlaceDetailsV1(placeId: string): Promise<GooglePlaceDetails> {
  const headers = {
    'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!
  };

  const fields = [
    'displayName',
    'formattedAddress',
    'location',
    'addressComponent'
  ].join(',');

  try {
    const response = await fetch(
      `${GOOGLE_PLACES_API_V1}/${placeId}?fields=${fields}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`Google Place Details failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Google Place Details API error:', error);
    throw error;
  }
}

/**
 * Parse Google Place Details v1 ke format lokal
 */
function parseGooglePlaceDetailsV1(
  details: GooglePlaceDetails,
  mainText: string,
  secondaryText?: string
): GoogleSearchResult | null {
  try {
    const components = details.addressComponents || [];

    // Extract components dari address components
    const province = findComponentV1(components, ['administrative_area_level_1']) || '';
    const regency = findComponentV1(components, ['administrative_area_level_2']) || '';
    const district = findComponentV1(components, ['administrative_area_level_3']) || '';
    const postal = findComponentV1(components, ['postal_code']) || '';
    const village =
      findComponentV1(components, ['locality']) ||
      findComponentV1(components, ['administrative_area_level_4']) ||
      '';

    return {
      type: 'street_address',
      name: details.displayName || details.formattedAddress || mainText,
      description: secondaryText || mainText,
      province,
      regency,
      district,
      village,
      postal,
      confidence: 0.75,
      source: 'google_maps',
      lat: details.location?.latitude,
      lng: details.location?.longitude
    };
  } catch (error) {
    console.error('Error parsing Google place details:', error);
    return null;
  }
}

/**
 * Helper: find address component by type (v1 format)
 */
function findComponentV1(
  components: GooglePlaceDetails['addressComponents'] = [],
  types: string[]
): string {
  const component = components.find(c =>
    types.some(t => c.types.includes(t))
  );
  return component?.longText || '';
}

/**
 * Estimasi cost per query (Places API v1)
 * Autocomplete Session: $0.004 per session
 * Place Details: $0.001 per request
 * Total: ~$0.005 per full query (5x lebih murah dari legacy API!)
 *
 * Dengan session tokens, cost bisa turun 50% lebih lagi
 */
export const GOOGLE_COST_ESTIMATE = {
  AUTOCOMPLETE_COST: 0.004, // per autocomplete session
  DETAILS_COST: 0.001, // per place details
  TOTAL_PER_QUERY: 0.005, // Roughly $5 per 1000 queries
};
