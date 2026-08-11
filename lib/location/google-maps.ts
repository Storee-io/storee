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
    // Use Autocomplete Sessions API (cheaper & already has structured format)
    const predictions = await getPlaceAutocompleteV1(query);

    if (!predictions.length) {
      console.log('🔴 Google Autocomplete returned no results for:', query);
      return [];
    }

    // Convert predictions directly to results (autocomplete already has all info needed)
    const results: GoogleSearchResult[] = predictions
      .slice(0, 10)
      .map(pred => parseGoogleAutocompletePrediction(pred))
      .filter((r): r is GoogleSearchResult => r !== null);

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
 * Parse Google Autocomplete Prediction ke format lokal
 * (Autocomplete sudah return semua info yang perlu - tidak perlu Details call)
 */
function parseGoogleAutocompletePrediction(
  pred: GooglePlacePrediction
): GoogleSearchResult | null {
  try {
    const text = `${pred.mainText}${pred.secondaryText ? ', ' + pred.secondaryText : ''}`;

    // Parse address components dari mainText dan secondaryText
    // Secondary text biasanya: "City, District, Province, Country"
    const parts = (pred.secondaryText || '').split(',').map(p => p.trim());

    return {
      type: 'street_address',
      name: text,
      description: pred.secondaryText || pred.mainText,
      province: parts[2] || '', // Typically province
      regency: parts[1] || '', // Typically city/regency
      district: parts[0] || '', // Typically district
      village: pred.mainText || '',
      postal: '', // Not provided by autocomplete
      confidence: 0.75,
      source: 'google_maps'
    };
  } catch (error) {
    console.error('Error parsing Google autocomplete prediction:', error);
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
 * Estimasi cost per query (Places API v1 - Autocomplete Only)
 * Autocomplete Session: $0.004 per session
 * Total: ~$0.004 per query (SUPER CHEAP!)
 *
 * Note: Tidak ada Details API call - autocomplete sudah return structured format.
 * Session tokens bisa turun 50% lebih lagi ($0.002/query)
 */
export const GOOGLE_COST_ESTIMATE = {
  AUTOCOMPLETE_COST: 0.004, // per autocomplete session
  DETAILS_COST: 0, // Not needed - autocomplete has all info
  TOTAL_PER_QUERY: 0.004, // Roughly $4 per 1000 queries (SUPER CHEAP!)
};
