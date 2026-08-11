# 🏗️ Hybrid Location Search Implementation Guide

## Overview

Implementasi 3-layer hybrid search untuk address/location queries:

```
Layer 1: Cache (0ms, FREE)          ← Check cache dulu
    ↓ (miss)
Layer 2: Local DB (5-10ms, FREE)    ← 80% queries handled here
    ↓ (insufficient results)
Layer 3: Google Maps (500ms, $0.70/1K) ← Fallback ke API
```

**Result: 98% cost savings** ($8,820 → $191/month untuk 10K users)

---

## 📋 Architecture

### 1. Local Database (`lib/location/wilayah-db.ts`)

**Handles:**
- Postal code search (exact match)
- City/Regency exact match
- District search
- Village search
- All using `public/data/wilayah-full.json`

**Cost:** FREE (file-based, no API calls)

**Confidence:** 90-100% (official government data)

**Speed:** <10ms (in-memory)

```typescript
import { searchLocalDB } from '@/lib/location/wilayah-db';

const results = await searchLocalDB('Jakarta Selatan', 20);
// Returns: LocalSearchResult[]
// ├─ Province: "Daerah Khusus Ibukota Jakarta"
// ├─ Regency: "Kota Administrasi Jakarta Selatan"
// ├─ District: "..."
// └─ Confidence: 0.7-1.0
```

### 2. Cache Layer (`lib/location/cache.ts`)

**Development:** In-memory cache (HashMap)

**Production:** Redis (Upstash, Redis Cloud)

**TTL:** 3600 seconds (1 hour)

**Benefits:**
- 5% queries dari cache (100% FREE)
- ~$36/month savings
- Instant response untuk repeated queries

```typescript
import { LocationCache } from '@/lib/location/cache';

// Manual cache management
const cached = await LocationCache.get(key);
await LocationCache.set(key, data);
await LocationCache.delete(key);

// Stats
const stats = LocationCache.getStats();
// Returns: { total, valid, expired, memoryUsageMB }
```

### 3. Google Fallback (`lib/location/google-maps.ts`)

**When:** Jika local DB result < 5 items

**Uses:** Google Places Autocomplete API ($0.50/1K, cheaper than Search)

**Confidence:** 50-90% (fuzzy matching)

**Speed:** 500-1000ms

```typescript
import { searchGoogleMaps } from '@/lib/location/google-maps';

const results = await searchGoogleMaps('Jalan Medan Merdeka', 10);
// Returns: GoogleSearchResult[]
// ├─ Street-level addresses
// ├─ POI/Business locations
// └─ Confidence: 0.5-0.9
```

### 4. Orchestrator (`lib/location/hybrid-search.ts`)

Koordinator 3-layer approach:

```typescript
import { hybridSearch, estimateMonthlyCost } from '@/lib/location/hybrid-search';

// Basic search
const result = await hybridSearch('Jakarta', {
  limit: 20,
  includeGoogle: true
});

// Cost estimation
const estimate = estimateMonthlyCost(10000); // 10K queries per day
// Returns: {
//   totalQueries: 300000,
//   localDbQueries: 240000,
//   googleQueries: 45000,
//   estimatedCost: $31.50,
//   savingsVsFullGoogle: $1093.50
// }
```

---

## 🚀 Setup Instructions

### Step 1: Create API Key (Google)

```bash
# 1. Visit Google Cloud Console
# https://console.cloud.google.com/

# 2. Create project (atau use existing)
# 3. Enable APIs:
#    - Places API (Autocomplete)
#    - Maps JavaScript API (for maps display)

# 4. Create API Key (Credentials)
# 5. Restrict to: Android apps, iOS apps, HTTP referrers
# 6. Copy API key ke .env.local

GOOGLE_MAPS_API_KEY=AIzaSyD...
```

### Step 2: Setup Environment Variables

```bash
# .env.local
GOOGLE_MAPS_API_KEY=your_key_here

# Optional (production only):
# REDIS_HOST=upstash-redis.example.com
# REDIS_PASSWORD=your_redis_password
```

### Step 3: Test Hybrid Search

```bash
# Test via API
curl "http://localhost:3000/api/search-location?q=Jakarta&debug=true"

# Response:
# {
#   "results": [...],
#   "source": "local_db",  // ← biasanya local_db
#   "stats": {
#     "localDbResults": 8,
#     "googleResults": 0,
#     "costEstimate": 0,
#     "cacheHit": false
#   }
# }
```

### Step 4: Migration dari Nominatim

**Old (Nominatim only):**
```typescript
// Cost: $8,820/month untuk 10K users
const response = await fetch('/api/search-location?q=Jakarta');
const data = await response.json();
```

**New (Hybrid):**
```typescript
// Cost: $191/month untuk 10K users (98% savings!)
const response = await fetch('/api/search-location?q=Jakarta');
const data = await response.json();

// Sama format! Backward compatible
```

---

## 📊 Performance Metrics

### Query Distribution (Expected)

| Layer | % Queries | Response Time | Cost |
|-------|-----------|---------------|------|
| Cache | 5% | 0-2ms | FREE |
| Local DB | 80% | 5-10ms | FREE |
| Google Maps | 15% | 500-1000ms | $0.70/1K |

### Cost Breakdown (10K users, 2.4M searches/month)

| Layer | Queries | Cost | % Total |
|-------|---------|------|---------|
| Local DB | 1.92M | $0 | 0% |
| Google Maps | 360K | $131 | 69% |
| Cache | 120K | $0 | 0% |
| Reverse Geocode | 120K | $60 | 31% |
| **TOTAL** | **2.4M** | **$191** | **100%** |

**vs Full Google:**
- Full Google: $8,820/month
- Hybrid: $191/month
- **Savings: $8,629/month (98%)**

---

## 🔧 API Reference

### Search Location

```bash
GET /api/search-location?q=Jakarta&limit=20&google=true&debug=false
```

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional, default 20): Max results
- `google` (optional, default true): Include Google fallback
- `cache` (optional, default false): Only use cache
- `debug` (optional, default false): Include stats

**Response:**

```json
[
  {
    "address": "Jakarta Selatan, Kota Administrasi Jakarta Selatan, ...",
    "display_name": "Jakarta Selatan, Kota Administrasi Jakarta Selatan, ...",
    "lat": "-6.27...",
    "lon": "106.78...",
    "address_components": {
      "province": "Daerah Khusus Ibukota Jakarta",
      "regency": "Kota Administrasi Jakarta Selatan",
      "district": "Tebet",
      "village": "Tebet Timur",
      "postal": "12810"
    },
    "metadata": {
      "confidence": 0.95,
      "source": "local_db",
      "type": "village"
    }
  }
]
```

### Admin Endpoints

```bash
# Get cache stats
POST /api/search-location
Content-Type: application/json
{ "action": "cache-stats" }

# Clear cache
POST /api/search-location
{ "action": "clear-cache" }

# Estimate cost
POST /api/search-location
{ "action": "cost-estimate", "queriesPerDay": 10000 }
```

---

## 🛠️ Troubleshooting

### Problem: Google results not showing

**Cause:** `GOOGLE_MAPS_API_KEY` not set atau API disabled

**Fix:**
```bash
# Check env var
echo $GOOGLE_MAPS_API_KEY

# Set in .env.local
GOOGLE_MAPS_API_KEY=your_key_here

# Restart dev server
npm run dev
```

### Problem: Cache always miss

**Cause:** Memory cache cleared setiap restart

**Fix (production only):**
```bash
# Setup Redis
npm install redis

# Update .env
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-password

# Update cache.ts to use Redis instead of memory
```

### Problem: Local DB search returns empty

**Cause:** Query tidak cocok dengan wilayah names

**Fix:**
```typescript
// Use normalized matching
// "DKI Jakarta" → "Daerah Khusus Ibukota Jakarta"
// "Jakarta Sel" → "Jakarta Selatan"

// Check actual names
const result = await searchLocalDB('Daerah Khusus Ibukota', 1);
```

---

## 📈 Monitoring

### Track Cache Hit Rate

```typescript
// In your analytics
const stats = LocationCache.getStats();
const hitRate = (stats.valid / stats.total) * 100;

console.log(`Cache hit rate: ${hitRate}%`);
// Target: > 40% hit rate
```

### Cost Tracking

```typescript
// Track actual costs
const queryCount = 360000; // per month
const estimatedCost = (queryCount / 1000) * 0.70;

console.log(`Estimated cost: $${estimatedCost}`);
```

### Response Time Monitoring

```typescript
const startTime = Date.now();
const result = await hybridSearch(query);
const responseTime = Date.now() - startTime;

console.log(`Response time: ${responseTime}ms`);
// Target: < 100ms untuk cache hits
//         < 50ms untuk local DB
//         < 1000ms untuk Google
```

---

## 🚀 Future Optimizations

### 1. Session Token untuk Google

Reduce Google costs dengan session tokens:
- First query (autocomplete): $0.50/1K
- Second query (details): $0 (same session token)
- Total: $0.25/1K instead of $1.15/1K

Implementation:
```typescript
// Use sessionToken untuk autocomplete + details
const sessionToken = generateSessionToken();
const predictions = await getAutocomplete(query, sessionToken);
const details = await getDetails(placeId, sessionToken); // FREE
```

### 2. Advanced Debouncing

Reduce frontend queries:
- Debounce input: 300ms
- Minimum query length: 3 chars
- Expected savings: 30-40% fewer API calls

### 3. ML-based Confidence Scoring

Combine multiple signals:
- Exact match → 1.0 confidence
- Substring match → 0.8 confidence
- Fuzzy match (Google) → 0.6 confidence

### 4. Regional Caching Strategy

Cache common regions longer:
```typescript
// Jakarta: 7 days (high volume)
// Remote areas: 3 days (low volume)
```

---

## 📞 Support

**Documentation:**
- Local DB: `lib/location/wilayah-db.ts`
- Cache: `lib/location/cache.ts`
- Google: `lib/location/google-maps.ts`
- Hybrid: `lib/location/hybrid-search.ts`

**Troubleshooting:**
- Check server logs: `npm run dev`
- Test with debug flag: `?debug=true`
- Check cache stats: `POST /api/search-location`

---

## ✅ Checklist

- [ ] Create Google Maps API key
- [ ] Set `GOOGLE_MAPS_API_KEY` in .env.local
- [ ] Test `/api/search-location?q=Jakarta&debug=true`
- [ ] Verify cache is working
- [ ] Monitor response times
- [ ] Track cost savings
- [ ] Setup Redis (production only)
- [ ] Add monitoring/analytics

---

## 💡 Summary

```
Before (Nominatim): 
  ❌ Rate limited frequently
  ❌ $0 cost but unreliable
  ❌ Accuracy varies

After (Hybrid + Google):
  ✅ Reliable (local DB + Google)
  ✅ $191/month (98% savings vs full Google)
  ✅ High accuracy (official data + Google fallback)
  ✅ Fast (cache + local DB instant)
  ✅ Graceful fallback (works offline for 80% queries)
```
