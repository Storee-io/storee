/**
 * Nominatim API wrapper untuk address search (OpenStreetMap)
 * Free dan unlimited, tapi dengan rate limiting (~1 req/sec recommended)
 * Menggunakan Nominatim untuk forward geocoding (search by address)
 *
 * Keuntungan:
 * - FREE (no API key needed)
 * - Returns ACTUAL coordinates directly
 * - No monthly quota limits
 * - Open source data
 *
 * Drawback:
 * - Rate limited (~1 req/sec)
 * - Less precise untuk specific locations/POIs
 */

export interface NominatimSearchResult {
  type: 'street_address' | 'poi' | 'city';
  name: string;
  description: string;
  province: string;
  regency: string;
  district: string;
  village: string;
  postal: string;
  confidence: number;
  source: 'nominatim';
  lat: number;  // ACTUAL coordinates from Nominatim
  lng: number;
  osmId?: string;
}

const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';

/**
 * Search menggunakan Nominatim (OpenStreetMap)
 * Returns results dengan ACTUAL coordinates
 * FREE, no API key needed
 */
export async function searchNominatim(
  query: string,
  limit: number = 10
): Promise<NominatimSearchResult[]> {
  if (!query || !query.trim()) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: String(limit),
      countrycodes: 'id', // Limit to Indonesia
      addressdetails: '1',
      'accept-language': 'id'
    });

    const response = await fetch(`${NOMINATIM_API}?${params.toString()}`, {
      headers: {
        'User-Agent': 'Storee-Location-Search/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Nominatim error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.log('🔴 Nominatim returned no results for:', query);
      return [];
    }

    // Convert Nominatim results to our format
    const results: NominatimSearchResult[] = data
      .slice(0, limit)
      .map(result => parseNominatimResult(result))
      .filter((r): r is NominatimSearchResult => r !== null);

    console.log(`✅ Nominatim returned ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Nominatim API error:', error);
    return [];
  }
}

/**
 * Parse Nominatim result ke format lokal
 */
function parseNominatimResult(data: any): NominatimSearchResult | null {
  try {
    const address = data.address || {};

    // Determine type berdasarkan OSM type
    let type: 'street_address' | 'poi' | 'city' = 'street_address';
    if (data.osm_type === 'node' && data.importance < 0.3) {
      type = 'poi';
    } else if (address.city || address.town || address.municipality) {
      type = 'city';
    }

    // Extract address components
    const name = data.name || data.display_name || '';
    const displayName = data.display_name || '';

    // Nominatim address components
    const province = address.state || '';
    const regency = address.city || address.town || address.municipality || '';
    const district = address.suburb || address.neighbourhood || '';
    const village = address.village || '';
    const postal = address.postcode || '';

    // Confidence based on importance (Nominatim's relevance score)
    // Higher importance = more relevant result
    const confidence = Math.min(
      0.95,
      Math.max(0.5, (data.importance || 0.5) + 0.3)
    );

    return {
      type,
      name,
      description: displayName,
      province,
      regency,
      district,
      village,
      postal,
      confidence,
      source: 'nominatim',
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
      osmId: data.osm_id
    };
  } catch (error) {
    console.error('Error parsing Nominatim result:', error);
    return null;
  }
}
