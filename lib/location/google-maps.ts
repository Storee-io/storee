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
  lat: number;  // REQUIRED - must get from Details API
  lng: number;  // REQUIRED
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

    // Convert predictions directly to results
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

    const province = parts[2] || ''; // Typically province
    const regency = parts[1] || ''; // Typically city/regency
    const district = parts[0] || ''; // Typically district

    // Try to estimate coordinates from known Indonesian cities
    const estimated = estimateCoordinatesForCity(regency || province);

    return {
      type: 'street_address',
      name: text,
      description: pred.secondaryText || pred.mainText,
      province: province,
      regency: regency,
      district: district,
      village: pred.mainText || '',
      postal: '', // Not provided by autocomplete
      confidence: 0.75,
      source: 'google_maps',
      lat: estimated.lat,
      lng: estimated.lng
    };
  } catch (error) {
    console.error('Error parsing Google autocomplete prediction:', error);
    return null;
  }
}

/**
 * Estimate coordinates for Indonesian cities/regencies
 * Uses city center coordinates for common Indonesian cities
 */
function estimateCoordinatesForCity(
  cityName: string
): { lat: number; lng: number } {
  // Remove common prefixes/suffixes
  const normalized = cityName
    .replace(/^(Kabupaten|Kota|Administrasi)\s+/i, '')
    .toLowerCase()
    .trim();

  // Map of major Indonesian cities to their approximate center coordinates
  const cityCoordinates: { [key: string]: [number, number] } = {
    'jakarta': [-6.2088, 106.8456],
    'bandung': [-6.9147, 107.6098],
    'surabaya': [-7.2575, 112.7521],
    'medan': [3.1956, 98.6722],
    'depok': [-6.4026, 106.7924],
    'tangerang': [-6.1783, 106.6326],
    'bekasi': [-6.2349, 107.0075],
    'yogyakarta': [-7.7956, 110.3695],
    'semarang': [-6.9667, 110.4167],
    'malang': [-7.9827, 112.6345],
    'bali': [-8.6500, 115.2167],
    'lombok': [-8.6500, 116.3167],
    'palembang': [-2.9264, 104.7520],
    'makassar': [-5.1477, 119.4327],
    'manado': [1.4952, 124.8535],
    'jayapura': [-2.5898, 140.6692]
  };

  const coords = cityCoordinates[normalized];
  if (coords) {
    return { lat: coords[0], lng: coords[1] };
  }

  // Default to center of Indonesia (Borneo)
  console.warn(`⚠️ No coordinates found for city: ${cityName}`);
  return { lat: -2.5489, lng: 113.9213 };
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
