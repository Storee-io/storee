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
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '30');
  if (!q) return NextResponse.json({ data: [] });

  const data = await loadData();
  const key = q.toLowerCase();
  const results: VillageRecord[] = [];
  for (const v of data) {
    if (
      v.village.toLowerCase().includes(key) ||
      v.district.toLowerCase().includes(key) ||
      v.regency.toLowerCase().includes(key) ||
      v.postal.includes(key)
    ) {
      results.push(v);
      if (results.length >= limit) break;
    }
  }

  return NextResponse.json({
    data: results.map(r => ({
      code: r.postal ? Number(r.postal) : null,
      village: r.village,
      district: r.district,
      regency: r.regency,
      province: r.province,
    })),
  });
}
