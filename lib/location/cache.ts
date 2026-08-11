/**
 * Redis cache wrapper untuk location search results
 * Stores results untuk 1 jam (3600 detik)
 *
 * In production, gunakan Redis cloud (Upstash, Redis Cloud, dll)
 * Untuk development, bisa cache in-memory dulu
 */

// Cache in-memory (development only)
// TODO: Ganti dengan Redis saat production
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export class LocationCache {
  private static CACHE_TTL_SECONDS = 3600; // 1 hour

  /**
   * Generate cache key dari query
   */
  static getCacheKey(query: string, type: 'search' | 'reverse' = 'search'): string {
    const normalized = query.toLowerCase().trim();
    return `location:${type}:${normalized}`;
  }

  /**
   * Get dari cache
   */
  static async get<T>(key: string): Promise<T | null> {
    const entry = memoryCache.get(key);

    if (!entry) {
      console.log(`❌ Cache MISS: ${key}`);
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      console.log(`⏰ Cache EXPIRED: ${key}`);
      return null;
    }

    console.log(`✅ Cache HIT: ${key}`);
    return entry.data as T;
  }

  /**
   * Set ke cache
   */
  static async set<T>(key: string, data: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.CACHE_TTL_SECONDS;
    const expiresAt = Date.now() + ttl * 1000;

    memoryCache.set(key, { data, expiresAt });
    console.log(`💾 Cached: ${key} (expires in ${ttl}s)`);
  }

  /**
   * Delete cache entry
   */
  static async delete(key: string): Promise<void> {
    memoryCache.delete(key);
    console.log(`🗑️  Deleted: ${key}`);
  }

  /**
   * Clear all cache (testing only)
   */
  static async clear(): Promise<void> {
    memoryCache.clear();
    console.log(`🗑️  Cache cleared`);
  }

  /**
   * Get cache stats
   */
  static getStats() {
    const total = memoryCache.size;
    const now = Date.now();
    let valid = 0;

    for (const entry of memoryCache.values()) {
      if (now <= entry.expiresAt) valid++;
    }

    return {
      total,
      valid,
      expired: total - valid,
      memoryUsageMB: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
    };
  }
}

/**
 * Redis Setup (untuk production)
 *
 * Install:
 * npm install redis
 *
 * Gunakan:
 * const redis = new Redis({
 *   host: process.env.REDIS_HOST,
 *   port: parseInt(process.env.REDIS_PORT || '6379'),
 *   password: process.env.REDIS_PASSWORD
 * });
 */

export const CACHE_CONFIG = {
  SEARCH_TTL: 3600, // 1 hour - search results (common queries cached longer)
  REVERSE_TTL: 1800, // 30 minutes - reverse geocoding (less repetitive)
  ERROR_TTL: 600, // 10 minutes - cache errors shorter
};
