import { NextRequest, NextResponse } from 'next/server';
import { hybridSearch, getCacheStats, clearCache } from '@/lib/location/hybrid-search';
import { estimateMonthlyCost } from '@/lib/location/hybrid-search';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '20');
  const includeGoogle = searchParams.get('google') !== 'false'; // Default: true
  const cacheOnly = searchParams.get('cache') === 'true'; // Default: false
  const debug = searchParams.get('debug') === 'true';

  if (!query || !query.trim()) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  try {
    // Run hybrid search (3-layer approach)
    const result = await hybridSearch(query, {
      limit,
      includeGoogle,
      cacheOnly
    });

    if (debug) {
      // Include statistics untuk debugging
      return NextResponse.json({
        success: true,
        query: result.query,
        results: result.results,
        source: result.source,
        stats: result.stats,
        cacheStatus: getCacheStats()
      });
    }

    // Format untuk kompatibilitas dengan UI lama (Nominatim format)
    // PENTING: Return coordinates sebagai string agar kompatibel dengan frontend yang menggunakan parseFloat()
    const formatted = result.results.map(r => ({
      address: formatAddress(r),
      display_name: formatDisplayName(r),
      lat: r.lat ? String(r.lat) : r.lat || '0',  // Use actual coords if available, else placeholder
      lon: r.lng ? String(r.lng) : r.lng || '0',  // Google API uses lng, convert to string
      address_components: {
        province: r.province,
        regency: r.regency,
        district: r.district,
        village: r.village,
        postal: r.postal
      },
      metadata: {
        confidence: r.confidence,
        source: r.source,
        type: r.type
      }
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Hybrid location search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}

/**
 * Format address untuk display
 */
function formatAddress(result: any): string {
  const parts = [];
  if (result.village) parts.push(result.village);
  if (result.district) parts.push(result.district);
  if (result.regency) parts.push(result.regency);
  if (result.postal) parts.push(result.postal);
  return parts.join(', ');
}

/**
 * Format display_name (Nominatim compatibility)
 */
function formatDisplayName(result: any): string {
  const parts = [];
  if (result.name && result.name !== result.village) parts.push(result.name);
  if (result.village) parts.push(result.village);
  if (result.district) parts.push(result.district);
  if (result.regency) parts.push(result.regency);
  if (result.province) parts.push(result.province);
  if (result.postal) parts.push(result.postal);
  return parts.join(', ');
}

/**
 * Admin endpoint untuk cache management
 */
export async function POST(request: NextRequest) {
  const { action } = await request.json();

  // TODO: Add authentication check untuk admin only

  if (action === 'clear-cache') {
    await clearCache();
    return NextResponse.json({ success: true, message: 'Cache cleared' });
  }

  if (action === 'cache-stats') {
    return NextResponse.json(getCacheStats());
  }

  if (action === 'cost-estimate') {
    const { queriesPerDay } = await request.json();
    const estimate = estimateMonthlyCost(queriesPerDay);
    return NextResponse.json(estimate);
  }

  return NextResponse.json(
    { error: 'Unknown action' },
    { status: 400 }
  );
}
