import {
  searchLocalDB,
  LocalSearchResult,
  VillageRecord
} from './wilayah-db';
import { LocationCache, CACHE_CONFIG } from './cache';
import {
  searchGoogleMaps,
  GoogleSearchResult,
  GOOGLE_COST_ESTIMATE
} from './google-maps';

export interface HybridSearchResult {
  query: string;
  results: (LocalSearchResult | GoogleSearchResult)[];
  source: 'local_db' | 'google_maps' | 'cache';
  stats: {
    totalResults: number;
    cacheHit: boolean;
    localDbResults: number;
    googleResults: number;
    costEstimate: number; // USD
    responseTimeMs: number;
  };
}

/**
 * 3-Layer Hybrid Search Strategy:
 *
 * Layer 1: Cache (0ms, FREE)
 *   └─ Check Redis/memory cache first
 *
 * Layer 2: Local DB (5-10ms, FREE)
 *   ├─ Province search
 *   ├─ Regency/City search
 *   ├─ District search
 *   ├─ Village search
 *   └─ Postal code search
 *   └─ Handle: 80% of typical queries
 *
 * Layer 3: Google Maps API v1 (500-1000ms, $0.005/query or $5/1K)
 *   ├─ Street-level address
 *   ├─ POI/Business search
 *   └─ Fuzzy matching
 *   └─ Handle: Remaining 15-20% + fallback
 *
 * Result: ~99% cost savings vs Google-only approach (with new API v1!)
 */

export async function hybridSearch(
  query: string,
  options: {
    limit?: number;
    includeGoogle?: boolean;
    cacheOnly?: boolean;
  } = {}
): Promise<HybridSearchResult> {
  const startTime = Date.now();
  const limit = options.limit || 20;
  const includeGoogle = options.includeGoogle !== false;
  const cacheOnly = options.cacheOnly || false;

  const cacheKey = LocationCache.getCacheKey(query);
  let costEstimate = 0;
  let source: 'local_db' | 'google_maps' | 'cache' = 'local_db';

  try {
    // ===== LAYER 1: Check Cache =====
    const cached = await LocationCache.get<HybridSearchResult>(cacheKey);
    if (cached) {
      const responseTime = Date.now() - startTime;
      return {
        ...cached,
        stats: {
          ...cached.stats,
          cacheHit: true,
          responseTimeMs: responseTime
        }
      };
    }

    // ===== LAYER 2: Local DB Search =====
    const localResults = await searchLocalDB(query, limit);

    // Check if query looks like a specific place (e.g., "villa rizki", "restaurant", "jalan")
    // vs administrative boundary (e.g., "jakarta", "bandung")
    const isSpecificPlace = /\b(villa|rumah|jalan|jl|restoran|restaurant|kantor|toko|mall|hotel|resort|kafe|cafe)\b/i.test(query);

    // If cache-only mode atau sudah punya results dari local DB AND not a specific place search
    if (cacheOnly || (localResults.length >= 5 && !isSpecificPlace)) {
      console.log(`✅ Local DB sufficient: ${localResults.length} results`);

      const result: HybridSearchResult = {
        query,
        results: localResults,
        source: 'local_db',
        stats: {
          totalResults: localResults.length,
          cacheHit: false,
          localDbResults: localResults.length,
          googleResults: 0,
          costEstimate: 0, // Local DB is FREE
          responseTimeMs: Date.now() - startTime
        }
      };

      // Cache result
      await LocationCache.set(cacheKey, result, CACHE_CONFIG.SEARCH_TTL);
      return result;
    }

    // ===== LAYER 3: Google Maps Fallback =====
    if (!includeGoogle || localResults.length >= limit) {
      console.log(
        `ℹ️ No Google fallback: includeGoogle=${includeGoogle}, localResults=${localResults.length}`
      );

      const result: HybridSearchResult = {
        query,
        results: localResults,
        source: 'local_db',
        stats: {
          totalResults: localResults.length,
          cacheHit: false,
          localDbResults: localResults.length,
          googleResults: 0,
          costEstimate: 0,
          responseTimeMs: Date.now() - startTime
        }
      };

      await LocationCache.set(cacheKey, result, CACHE_CONFIG.SEARCH_TTL);
      return result;
    }

    console.log(
      `⚠️  Local DB insufficient (${localResults.length}), querying Google Maps...`
    );

    const googleResults = await searchGoogleMaps(query, limit - localResults.length);
    costEstimate = googleResults.length * GOOGLE_COST_ESTIMATE.TOTAL_PER_QUERY;

    const combinedResults = [...localResults, ...googleResults];

    const result: HybridSearchResult = {
      query,
      results: combinedResults.slice(0, limit),
      source: 'google_maps',
      stats: {
        totalResults: combinedResults.length,
        cacheHit: false,
        localDbResults: localResults.length,
        googleResults: googleResults.length,
        costEstimate,
        responseTimeMs: Date.now() - startTime
      }
    };

    // Cache result
    await LocationCache.set(cacheKey, result, CACHE_CONFIG.SEARCH_TTL);
    return result;
  } catch (error) {
    console.error('Hybrid search error:', error);

    // Fallback ke local DB results jika error
    const localResults = await searchLocalDB(query, limit);
    return {
      query,
      results: localResults,
      source: 'local_db',
      stats: {
        totalResults: localResults.length,
        cacheHit: false,
        localDbResults: localResults.length,
        googleResults: 0,
        costEstimate: 0,
        responseTimeMs: Date.now() - startTime
      }
    };
  }
}

/**
 * Get cache statistics untuk monitoring
 */
export function getCacheStats() {
  return LocationCache.getStats();
}

/**
 * Clear cache (testing/admin only)
 */
export async function clearCache() {
  await LocationCache.clear();
}

/**
 * Cost estimator untuk budget planning
 */
export function estimateMonthlyCost(
  queriesPerDay: number,
  daysPerMonth: number = 30
): {
  totalQueries: number;
  localDbQueries: number;
  googleQueries: number;
  estimatedCost: number;
  savingsVsFullGoogle: number;
} {
  const totalQueries = queriesPerDay * daysPerMonth;
  const localDbPercentage = 0.8; // 80% dari queries handled oleh local DB
  const googlePercentage = 0.15; // 15% fallback ke Google
  const cachePercentage = 0.05; // 5% dari cache

  const localDbQueries = Math.floor(totalQueries * localDbPercentage);
  const googleQueries = Math.floor(totalQueries * googlePercentage);
  const cacheQueries = Math.floor(totalQueries * cachePercentage);

  const hybridCost =
    googleQueries * (GOOGLE_COST_ESTIMATE.TOTAL_PER_QUERY / 1000);

  // Google Search API: $3.65/1K queries
  const fullGoogleCost = totalQueries * (3.65 / 1000);

  return {
    totalQueries,
    localDbQueries,
    googleQueries,
    estimatedCost: hybridCost,
    savingsVsFullGoogle: fullGoogleCost - hybridCost
  };
}
