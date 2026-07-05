import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

interface VillageRecord {
  code: string;
  village: string;
  district: string;
  regency: string;
  province: string;
  postal: string;
}

let cache: VillageRecord[] | null = null;
let loading: Promise<VillageRecord[]> | null = null;

async function loadData(): Promise<VillageRecord[]> {
  if (cache) return cache;
  if (loading) return loading;
  loading = readFile(path.join(process.cwd(), 'public', 'data', 'wilayah-full.json'), 'utf-8')
    .then(text => { cache = JSON.parse(text); return cache!; });
  return loading;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const province = request.nextUrl.searchParams.get('province')?.trim().toLowerCase() ?? '';
  const regency = request.nextUrl.searchParams.get('regency')?.trim().toLowerCase() ?? '';
  const district = request.nextUrl.searchParams.get('district')?.trim().toLowerCase() ?? '';
  const village = request.nextUrl.searchParams.get('village')?.trim().toLowerCase() ?? '';
  const postal = request.nextUrl.searchParams.get('postal')?.trim() ?? '';
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '20');
  const level = request.nextUrl.searchParams.get('level') ?? '';
  const parentId = request.nextUrl.searchParams.get('parentId') ?? '';

  const data = await loadData();

  // Browse mode: list the next level down (province → regency → district → village)
  // by administrative code prefix. Backs the picker's tap-through hierarchy locally,
  // since wilayah-full.json is bundled with the app (no external API dependency).
  if (level) {
    if (level === 'province') {
      const seen = new Map<string, { id: string; name: string }>();
      for (const v of data) {
        const id = v.code.slice(0, 2);
        if (!seen.has(id)) seen.set(id, { id, name: v.province });
      }
      return NextResponse.json({ items: [...seen.values()] });
    }
    if (level === 'regency' && parentId) {
      const seen = new Map<string, { id: string; name: string }>();
      for (const v of data) {
        if (!v.code.startsWith(parentId)) continue;
        const id = v.code.slice(0, 4);
        if (!seen.has(id)) seen.set(id, { id, name: v.regency });
      }
      return NextResponse.json({ items: [...seen.values()] });
    }
    if (level === 'district' && parentId) {
      const seen = new Map<string, { id: string; name: string }>();
      for (const v of data) {
        if (!v.code.startsWith(parentId)) continue;
        const id = v.code.slice(0, 6);
        if (!seen.has(id)) seen.set(id, { id, name: v.district });
      }
      return NextResponse.json({ items: [...seen.values()] });
    }
    if (level === 'village' && parentId) {
      const items = data
        .filter(v => v.code.startsWith(parentId))
        .map(v => ({ id: v.code, name: v.village, postal: v.postal }));
      return NextResponse.json({ items });
    }
    return NextResponse.json({ items: [] });
  }

  // Hierarchical matching: from widest (province) to narrowest (postal)
  // Only match records that satisfy ALL provided filters.
  // `useProvince` lets us retry without the province filter: caller-supplied province names are
  // often short/aliased (e.g. "DKI Jakarta") and won't substring-match the canonical database
  // name ("Daerah Khusus Ibukota Jakarta"). Regency + district is unique enough on its own.
  const filterMatches = (useProvince: boolean) => data.filter(v => {
    if (useProvince && province && !v.province.toLowerCase().includes(province)) return false;
    if (regency && !v.regency.toLowerCase().includes(regency)) return false;
    if (district && !v.district.toLowerCase().includes(district)) return false;
    if (village && !v.village.toLowerCase().includes(village)) return false;
    if (postal && !v.postal.startsWith(postal)) return false;
    if (q && !v.village.toLowerCase().includes(q) && !v.postal.startsWith(q)) return false;
    return true;
  });
  // Prefer the province-constrained match; fall back to province-agnostic if it eliminates all.
  let matches = filterMatches(true);
  if (matches.length === 0 && province && (regency || district)) matches = filterMatches(false);

  // If we have hierarchical filters, return the first match (standardized data)
  if (province || regency || district || village || postal) {
    const result = matches.slice(0, 1)[0];
    if (result) {
      return NextResponse.json({
        match: {
          code: result.code,
          village: result.village,
          district: result.district,
          regency: result.regency,
          province: result.province,
          postal: result.postal
        }
      });
    }
    return NextResponse.json({ match: null });
  }

  // Fallback: original search behavior for plain text query
  const key = q.toLowerCase();
  const provinceSeen = new Map<string, { id: string; name: string }>();
  const regencySeen = new Map<string, { id: string; name: string; province: string }>();
  const districtSeen = new Map<string, { id: string; name: string; regency: string; province: string }>();
  const villages: Array<{ code: number | null; wilayahCode: string; village: string; district: string; regency: string; province: string }> = [];

  for (const v of data) {
    const provinceId = v.code.slice(0, 2);
    const regencyId = v.code.slice(0, 4);
    const districtId = v.code.slice(0, 6);

    if (provinceSeen.size < 5 && v.province.toLowerCase().includes(key) && !provinceSeen.has(provinceId))
      provinceSeen.set(provinceId, { id: provinceId, name: v.province });

    if (regencySeen.size < 8 && v.regency.toLowerCase().includes(key) && !regencySeen.has(regencyId))
      regencySeen.set(regencyId, { id: regencyId, name: v.regency, province: v.province });

    if (districtSeen.size < 10 && v.district.toLowerCase().includes(key) && !districtSeen.has(districtId))
      districtSeen.set(districtId, { id: districtId, name: v.district, regency: v.regency, province: v.province });

    if (villages.length < limit && (v.village.toLowerCase().includes(key) || v.postal.startsWith(key)))
      villages.push({ code: v.postal ? Number(v.postal) : null, wilayahCode: v.code, village: v.village, district: v.district, regency: v.regency, province: v.province });
  }

  return NextResponse.json({
    provinces: [...provinceSeen.values()],
    regencies: [...regencySeen.values()],
    districts: [...districtSeen.values()],
    villages,
  });
}
