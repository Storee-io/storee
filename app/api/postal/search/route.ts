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
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '20');
  if (!q) return NextResponse.json({ provinces: [], regencies: [], districts: [], villages: [] });

  const data = await loadData();
  const key = q.toLowerCase();

  const provinceSeen = new Map<string, { id: string; name: string }>();
  const regencySeen = new Map<string, { id: string; name: string; province: string }>();
  const districtSeen = new Map<string, { id: string; name: string; regency: string; province: string }>();
  const villages: Array<{ code: number | null; village: string; district: string; regency: string; province: string }> = [];

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
      villages.push({ code: v.postal ? Number(v.postal) : null, village: v.village, district: v.district, regency: v.regency, province: v.province });
  }

  return NextResponse.json({
    provinces: [...provinceSeen.values()],
    regencies: [...regencySeen.values()],
    districts: [...districtSeen.values()],
    villages,
  });
}
