import { readFile } from 'fs/promises';
import path from 'path';

export interface VillageRecord {
  code: string;
  village: string;
  district: string;
  regency: string;
  province: string;
  postal: string;
}

export interface LocalSearchResult {
  type: 'province' | 'regency' | 'district' | 'village';
  name: string;
  province: string;
  regency: string;
  district: string;
  village: string;
  postal: string;
  confidence: number; // 0.6-1.0 (60-100%)
  source: 'local_db';
  lat?: number; // Estimated from city center if available
  lng?: number; // Estimated from city center if available
}

// In-memory cache untuk wilayah data
let wilayahCache: VillageRecord[] | null = null;
let loadingPromise: Promise<VillageRecord[]> | null = null;

async function loadWilayahData(): Promise<VillageRecord[]> {
  if (wilayahCache) return wilayahCache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = readFile(
    path.join(process.cwd(), 'public', 'data', 'wilayah-full.json'),
    'utf-8'
  ).then(text => {
    wilayahCache = JSON.parse(text);
    return wilayahCache!;
  });

  return loadingPromise;
}

/**
 * Search local DB (wilayah-full.json)
 * Handles: postal code, city/district exact match, village search
 * Returns: Up to 20 results with confidence scoring
 */
export async function searchLocalDB(
  query: string,
  limit: number = 20
): Promise<LocalSearchResult[]> {
  const data = await loadWilayahData();
  const q = query.toLowerCase().trim();

  if (!q) return [];

  const results: LocalSearchResult[] = [];
  const seen = new Set<string>();

  // Priority 1: Exact postal code match (HIGH confidence)
  for (const record of data) {
    if (record.postal === q) {
      const key = `village-${record.village}-${record.district}`;
      if (!seen.has(key) && results.length < limit) {
        seen.add(key);
        results.push({
          type: 'village',
          name: record.village,
          province: record.province,
          regency: record.regency,
          district: record.district,
          village: record.village,
          postal: record.postal,
          confidence: 1.0, // Exact match
          source: 'local_db'
        });
      }
    }
  }

  // Priority 2: Postal code prefix match (HIGH confidence)
  if (results.length < limit) {
    for (const record of data) {
      if (record.postal.startsWith(q) && record.postal !== q) {
        const key = `postal-${record.postal}`;
        if (!seen.has(key) && results.length < limit) {
          seen.add(key);
          results.push({
            type: 'village',
            name: `${record.village} (${record.postal})`,
            province: record.province,
            regency: record.regency,
            district: record.district,
            village: record.village,
            postal: record.postal,
            confidence: 0.95,
            source: 'local_db'
          });
        }
      }
    }
  }

  // Priority 3: City/Regency exact match (HIGH confidence)
  if (results.length < limit) {
    for (const record of data) {
      const regencyNormalized = normalizeText(record.regency);
      if (regencyNormalized === q) {
        const key = `regency-${record.regency}`;
        if (!seen.has(key) && results.length < limit) {
          seen.add(key);
          results.push({
            type: 'regency',
            name: record.regency,
            province: record.province,
            regency: record.regency,
            district: record.district,
            village: record.village,
            postal: record.postal,
            confidence: 0.9,
            source: 'local_db'
          });
          break; // Only one result per regency
        }
      }
    }
  }

  // Priority 4: District exact match (MEDIUM-HIGH confidence)
  if (results.length < limit) {
    for (const record of data) {
      const districtNormalized = normalizeText(record.district);
      if (districtNormalized === q) {
        const key = `district-${record.district}`;
        if (!seen.has(key) && results.length < limit) {
          seen.add(key);
          results.push({
            type: 'district',
            name: record.district,
            province: record.province,
            regency: record.regency,
            district: record.district,
            village: record.village,
            postal: record.postal,
            confidence: 0.85,
            source: 'local_db'
          });
          break;
        }
      }
    }
  }

  // Priority 5: Village name substring match (MEDIUM confidence)
  if (results.length < limit) {
    for (const record of data) {
      if (record.village.toLowerCase().includes(q)) {
        const key = `village-substring-${record.village}`;
        if (!seen.has(key) && results.length < limit) {
          seen.add(key);
          results.push({
            type: 'village',
            name: record.village,
            province: record.province,
            regency: record.regency,
            district: record.district,
            village: record.village,
            postal: record.postal,
            confidence: 0.7,
            source: 'local_db'
          });
        }
      }
    }
  }

  // Priority 6: Regency/City substring match (MEDIUM confidence)
  if (results.length < limit) {
    for (const record of data) {
      if (record.regency.toLowerCase().includes(q)) {
        const key = `regency-substring-${record.regency}`;
        if (!seen.has(key) && results.length < limit) {
          seen.add(key);
          results.push({
            type: 'regency',
            name: record.regency,
            province: record.province,
            regency: record.regency,
            district: record.district,
            village: record.village,
            postal: record.postal,
            confidence: 0.75,
            source: 'local_db'
          });
        }
      }
    }
  }

  // Priority 7: District substring match (MEDIUM confidence)
  if (results.length < limit) {
    for (const record of data) {
      if (record.district.toLowerCase().includes(q)) {
        const key = `district-substring-${record.district}`;
        if (!seen.has(key) && results.length < limit) {
          seen.add(key);
          results.push({
            type: 'district',
            name: record.district,
            province: record.province,
            regency: record.regency,
            district: record.district,
            village: record.village,
            postal: record.postal,
            confidence: 0.7,
            source: 'local_db'
          });
        }
      }
    }
  }

  // Add coordinates to all results based on city/regency
  const resultsWithCoords = results.slice(0, limit).map(result => {
    const coords = estimateCoordinatesForCity(result.regency);
    return {
      ...result,
      ...(coords && { lat: coords.lat, lng: coords.lng })
    };
  });

  return resultsWithCoords;
}

/**
 * Normalize text untuk matching:
 * - lowercase
 * - remove "Kabupaten", "Kota", "Administrasi" prefixes
 * - trim
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/^(kabupaten|kota|administrasi)\s+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Estimate coordinates for Indonesian cities/regencies
 * Uses city center coordinates for common Indonesian cities
 */
function estimateCoordinatesForCity(cityName: string): { lat: number; lng: number } | null {
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

  // Try exact match first
  let coords = cityCoordinates[normalized];
  if (coords) {
    return { lat: coords[0], lng: coords[1] };
  }

  // Try partial match - check if normalized text starts with or contains any known city
  for (const [city, coord] of Object.entries(cityCoordinates)) {
    if (normalized.startsWith(city) || normalized.includes(` ${city}`) || normalized.includes(`${city} `)) {
      return { lat: coord[0], lng: coord[1] };
    }
  }

  return null; // No coordinates found
}

/**
 * Match exact wilayah combination (province + regency + district + village)
 * Used for validation/standardization
 */
export async function matchWilayah(
  province: string,
  regency: string,
  district: string,
  village?: string,
  postal?: string
): Promise<VillageRecord | null> {
  const data = await loadWilayahData();
  const normProv = normalizeText(province);
  const normReg = normalizeText(regency);
  const normDist = normalizeText(district);
  const normVil = village ? normalizeText(village) : '';

  return (
    data.find(v => {
      const match =
        normalizeText(v.province) === normProv &&
        normalizeText(v.regency) === normReg &&
        normalizeText(v.district) === normDist;

      if (!match) return false;

      // If village provided, must match
      if (normVil && normalizeText(v.village) !== normVil) return false;

      // If postal provided, must match
      if (postal && v.postal !== postal) return false;

      return true;
    }) || null
  );
}
