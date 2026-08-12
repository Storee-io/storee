import { LocationCache, CACHE_CONFIG } from './cache';
import {
  searchGoogleMaps,
  GoogleSearchResult,
  GOOGLE_COST_ESTIMATE
} from './google-maps';
import {
  searchNominatim,
  NominatimSearchResult
} from './nominatim';

export interface HybridSearchResult {
  query: string;
  results: (NominatimSearchResult | GoogleSearchResult)[];
  source: 'nominatim' | 'google_maps' | 'cache' | 'hybrid';
  stats: {
    totalResults: number;
    cacheHit: boolean;
    nominatimResults: number;
    googleResults: number;
    costEstimate: number; // USD
    responseTimeMs: number;
  };
}

/**
 * 2-Layer Hybrid Search Strategy (NEW):
 *
 * Layer 1: Cache (0ms, FREE)
 *   └─ Check Redis/memory cache first (1 hour TTL)
 *
 * Layer 2: PARALLEL fetch (500-1000ms, MOSTLY FREE)
 *   ├─ Nominatim (OpenStreetMap) - FREE, ACTUAL coordinates
 *   │   ├─ Administrative boundaries search
 *   │   ├─ Street-level addresses
 *   │   └─ Returns REAL lat/lng immediately
 *   │
 *   └─ Google Autocomplete v1 - $0.004 per search
 *       ├─ POI/Business specific locations
 *       ├─ "Villa Rizki", "Restaurant X", etc
 *       └─ Returns placeId for Details API later
 *
 * When user selects:
 *   - Nominatim result → Use coordinates directly (FREE)
 *   - Google result → Call Details API ($0.015) to get actual coordinates
 *
 * Result: Hybrid data sources, accurate coordinates for both, cost-efficient
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

    if (cacheOnly) {
      return {
        query,
        results: [],
        source: 'cache',
        stats: {
          totalResults: 0,
          cacheHit: false,
          nominatimResults: 0,
          googleResults: 0,
          costEstimate: 0,
          responseTimeMs: Date.now() - startTime
        }
      };
    }

    // ===== LAYER 2: PARALLEL fetch Nominatim + Google =====
    console.log(`🔄 Searching Nominatim + Google in parallel for: "${query}"`);

    const [nominatimResults, googleResults] = await Promise.all([
      searchNominatim(query, limit),
      includeGoogle ? searchGoogleMaps(query, limit) : Promise.resolve([])
    ]);

    // Cost: Only pay for Google searches (Nominatim is FREE)
    costEstimate = googleResults.length * GOOGLE_COST_ESTIMATE.AUTOCOMPLETE_COST;

    // Combine results: Nominatim first (actual coords), then Google (specific places)
    const combinedResults = [...nominatimResults, ...googleResults];

    // Sort by confidence (higher first)
    combinedResults.sort((a, b) => b.confidence - a.confidence);

    const result: HybridSearchResult = {
      query,
      results: combinedResults.slice(0, limit),
      source: 'hybrid',
      stats: {
        totalResults: combinedResults.length,
        cacheHit: false,
        nominatimResults: nominatimResults.length,
        googleResults: googleResults.length,
        costEstimate,
        responseTimeMs: Date.now() - startTime
      }
    };

    console.log(
      `✅ Hybrid search complete: ${nominatimResults.length} Nominatim + ${googleResults.length} Google results`
    );

    // Cache result
    await LocationCache.set(cacheKey, result, CACHE_CONFIG.SEARCH_TTL);
    return result;
  } catch (error) {
    console.error('Hybrid search error:', error);

    // Fallback: Try Nominatim only
    try {
      const nominatimResults = await searchNominatim(query, limit);
      return {
        query,
        results: nominatimResults,
        source: 'nominatim',
        stats: {
          totalResults: nominatimResults.length,
          cacheHit: false,
          nominatimResults: nominatimResults.length,
          googleResults: 0,
          costEstimate: 0,
          responseTimeMs: Date.now() - startTime
        }
      };
    } catch (fallbackError) {
      console.error('Fallback Nominatim search also failed:', fallbackError);
      return {
        query,
        results: [],
        source: 'nominatim',
        stats: {
          totalResults: 0,
          cacheHit: false,
          nominatimResults: 0,
          googleResults: 0,
          costEstimate: 0,
          responseTimeMs: Date.now() - startTime
        }
      };
    }
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
  nominatimQueries: number;
  googleQueries: number;
  googleSelectionsEstimate: number;
  estimatedSearchCost: number;
  estimatedDetailsCost: number;
  estimatedTotalCost: number;
  savingsVsFullGoogle: number;
} {
  const totalQueries = queriesPerDay * daysPerMonth;
  const nominatimPercentage = 1.0; // 100% queries get Nominatim (FREE)
  const googlePercentage = 1.0; // 100% also get Google (concurrent)
  const cachePercentage = 0.05; // 5% dari cache
  const userSelectionRate = 0.3; // 30% of users select a result and trigger Details API

  const nominatimQueries = Math.floor(totalQueries * nominatimPercentage);
  const googleQueries = Math.floor(totalQueries * googlePercentage);
  const cacheQueries = Math.floor(totalQueries * cachePercentage);
  const googleSelections = Math.floor(googleQueries * userSelectionRate);

  // Cost breakdown:
  // - Nominatim: FREE
  // - Google Autocomplete: $0.004 per search
  // - Google Details API: $0.015 per selection (only when user selects Google result)
  const searchCost = googleQueries * (GOOGLE_COST_ESTIMATE.AUTOCOMPLETE_COST / 1000);
  const detailsCost = googleSelections * (GOOGLE_COST_ESTIMATE.DETAILS_COST / 1000);
  const hybridTotalCost = searchCost + detailsCost;

  // Full Google Search API: $3.65/1K queries (if we didn't have Nominatim)
  const fullGoogleCost = totalQueries * (3.65 / 1000);

  return {
    totalQueries,
    nominatimQueries,
    googleQueries,
    googleSelectionsEstimate: googleSelections,
    estimatedSearchCost: searchCost,
    estimatedDetailsCost: detailsCost,
    estimatedTotalCost: hybridTotalCost,
    savingsVsFullGoogle: fullGoogleCost - hybridTotalCost
  };
}
