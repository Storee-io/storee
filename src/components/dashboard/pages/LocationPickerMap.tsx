'use client';

/**
 * LocationPickerMap
 * Center-pin style map picker (pin stays fixed, map moves beneath it).
 * Leaflet + OpenStreetMap — no API key required.
 */

import { useEffect, useRef, useState } from 'react';
import { X, MapPin, Navigation, Search, Check, Loader2 } from 'lucide-react';

// ── Leaflet CSS (once) ────────────────────────────────────────────────────────
let leafletCssLoaded = false;
function ensureLeafletCss() {
  if (leafletCssLoaded || typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
  leafletCssLoaded = true;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PickedLocation {
  lat: number;
  lng: number;
  address: string;
}

interface SearchResult {
  lat: number;
  lng: number;
  display: string;
}

interface Props {
  initialLat?:  number;
  initialLng?:  number;
  initialAddr?: string;
  onConfirm: (loc: PickedLocation) => void;
  onClose:   () => void;
}

// ── Nominatim ─────────────────────────────────────────────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'id' } }
    );
    const data = await res.json() as { display_name?: string; address?: Record<string, string> };
    console.log('[Nominatim] Full address object', data);
    console.log('[Nominatim] display_name', data.display_name);
    if (data.address) {
      console.log('[Nominatim] address.village:', data.address.village);
      console.log('[Nominatim] address.suburb:', data.address.suburb);
      console.log('[Nominatim] address.city:', data.address.city);
      console.log('[Nominatim] address.postcode:', data.address.postcode);
      console.log('[Nominatim] address.country:', data.address.country);
    }
    console.log('[Nominatim] Full JSON response:', JSON.stringify(data, null, 2));
    return data.display_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

async function searchAddress(query: string): Promise<SearchResult[]> {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=id`,
      { headers: { 'Accept-Language': 'id' } }
    );
    const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;
    return data.map(r => ({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), display: r.display_name }));
  } catch {
    return [];
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LocationPickerMap({ initialLat, initialLng, initialAddr, onConfirm, onClose }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef    = useRef<any>(null);

  const initLat = initialLat ?? -6.2088;
  const initLng = initialLng ?? 106.8456;

  const [lat,       setLat]       = useState(initLat);
  const [lng,       setLng]       = useState(initLng);
  const [address,   setAddress]   = useState(initialAddr ?? '');
  const [geocoding, setGeocoding] = useState(false);
  const [moving,    setMoving]    = useState(false);   // map is being dragged

  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState<SearchResult[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Init Leaflet ─────────────────────────────────────────────────────────────
  useEffect(() => {
    ensureLeafletCss();
    let cancelled = false;

    import('leaflet').then(L => {
      if (cancelled || !mapDivRef.current || mapRef.current) return;

      const map = L.map(mapDivRef.current!, {
        zoomControl:       true,
        attributionControl: true,
        // Disable click-to-place; we use center-pin instead
      }).setView([initLat, initLng], 15);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Reverse-geocode initial center if no address given
      if (!initialAddr) {
        setGeocoding(true);
        reverseGeocode(initLat, initLng).then(addr => {
          if (!cancelled) { setAddress(addr); setGeocoding(false); }
        });
      }

      // While dragging — show "moving" state on pin
      map.on('movestart', () => { if (!cancelled) setMoving(true); });

      // On drag/zoom end — read center, reverse geocode
      map.on('moveend', () => {
        if (cancelled) return;
        setMoving(false);
        const center = map.getCenter();
        setLat(center.lat);
        setLng(center.lng);
        setGeocoding(true);
        reverseGeocode(center.lat, center.lng).then(addr => {
          if (!cancelled) { setAddress(addr); setGeocoding(false); }
        });
      });
    });

    return () => {
      cancelled = true;
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── GPS ───────────────────────────────────────────────────────────────────────
  function handleGPS() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 17);
    });
  }

  // ── Search ────────────────────────────────────────────────────────────────────
  async function runSearch(q: string) {
    if (!q.trim()) return;
    setSearching(true);
    setShowResults(true);
    const res = await searchAddress(q);
    setResults(res);
    setSearching(false);
  }

  function handleQueryChange(val: string) {
    setQuery(val);
    if (!val.trim()) { setResults([]); setShowResults(false); return; }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => runSearch(val), 600);
  }

  function handleSearch() {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    runSearch(query);
  }

  function selectResult(r: SearchResult) {
    setQuery('');
    setResults([]);
    setShowResults(false);
    mapRef.current?.setView([r.lat, r.lng], 17);
    // moveend will update lat/lng/address automatically
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999]" onClick={onClose} />

      {/* Modal */}
      <div
        className="fixed z-[1000] bg-white rounded-2xl shadow-2xl"
        style={{
          width: '640px',
          maxWidth: 'calc(100vw - 32px)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          overflow: 'visible',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 rounded-t-2xl bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Set Pick Up Location</p>
              <p className="text-xs text-slate-400">Drag the map to position the pin at the center</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar — high z-index stacking context so dropdown clears Leaflet layers */}
        <div
          className="px-4 py-3 border-b border-slate-100 bg-white"
          style={{ position: 'relative', zIndex: 500 }}
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                placeholder="Search address or place name..."
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Search
            </button>
            {/* GPS — icon only */}
            <button
              onClick={handleGPS}
              title="Use current GPS location"
              className="w-10 h-10 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors border border-emerald-200 flex-shrink-0"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>

          {/* Dropdown */}
          {showResults && (
            <div
              className="absolute left-4 right-4 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
              style={{ top: '100%', zIndex: 9999 }}
            >
              {searching ? (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />Searching...
                </div>
              ) : results.length === 0 ? (
                <div className="py-4 text-center text-sm text-slate-400">
                  No results for &quot;{query}&quot;
                </div>
              ) : (
                results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => selectResult(r)}
                    className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-slate-50 last:border-0 transition-colors"
                  >
                    <p className="text-sm font-medium text-slate-800 line-clamp-1">{r.display.split(',')[0]}</p>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{r.display.split(',').slice(1, 4).join(',')}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Map + fixed center pin */}
        <div style={{ height: '340px', position: 'relative', zIndex: 1 }}>
          {/* Leaflet map */}
          <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />

          {/* Fixed center pin — stays centered, map moves beneath */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -100%)',
              zIndex: 800,
              pointerEvents: 'none',
            }}
          >
            {/* Pin teardrop */}
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50% 50% 50% 0',
              background: moving ? '#94a3b8' : 'linear-gradient(135deg,#ef4444,#dc2626)',
              border: '3px solid #fff',
              boxShadow: moving ? '0 8px 24px rgba(0,0,0,.3)' : '0 3px 12px rgba(239,68,68,.5)',
              transform: moving ? 'rotate(-45deg) translateY(-6px) scale(1.15)' : 'rotate(-45deg)',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: '10px', height: '10px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.85)',
              }} />
            </div>
            {/* Ground shadow */}
            <div style={{
              width: '8px', height: '4px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.2)',
              margin: '2px auto 0',
              transform: moving ? 'scaleX(1.6)' : 'scaleX(1)',
              transition: 'all 0.15s ease',
            }} />
          </div>

          {/* Coordinate badge */}
          <div
            className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow border border-slate-200"
            style={{ zIndex: 800, pointerEvents: 'none' }}
          >
            <span className="text-[10px] font-mono text-slate-500">
              {lat.toFixed(6)},&nbsp;{lng.toFixed(6)}
            </span>
          </div>

          {/* Hint */}
          <div
            className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow border border-slate-200"
            style={{ zIndex: 800, pointerEvents: 'none' }}
          >
            <span className="text-[10px] text-slate-500">Drag the map to select a point</span>
          </div>
        </div>

        {/* Address preview + confirm */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
          <div className="flex items-start gap-2.5 mb-3 min-h-[36px]">
            <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            {geocoding || moving ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {moving ? 'Moving map...' : 'Loading address...'}
              </div>
            ) : (
              <p className="text-xs text-slate-700 leading-relaxed">
                {address || <span className="italic text-slate-400">Drag the map to select a location</span>}
              </p>
            )}
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm({ lat, lng, address })}
              disabled={geocoding || moving || !address}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white gradient-bg hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
