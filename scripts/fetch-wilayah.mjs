// One-time fetch of full Indonesia wilayah hierarchy (province -> regency -> district -> village)
// from rizuku-v2 wilayah-indonesia-api, flattened into a single local JSON file for fast server-side search.
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const BASE = 'https://rizuku-v2.github.io/wilayah-indonesia-api/api';
const CONCURRENCY = 30;

async function fetchJson(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      if (attempt === 2) { console.error('FAILED', url, e.message); return []; }
    }
  }
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

const toTitleCase = (s) => {
  const ABBR = new Set(['DKI', 'DI', 'DIY', 'NTB', 'NTT']);
  return s.split(' ').map(w => ABBR.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

async function main() {
  console.log('Fetching provinces...');
  const provinces = await fetchJson(`${BASE}/provinces.json`);
  console.log(`  ${provinces.length} provinces`);

  console.log('Fetching regencies...');
  const regenciesByProvince = await mapPool(provinces, CONCURRENCY, async (p) =>
    fetchJson(`${BASE}/regencies/${p.code}.json`)
  );
  const allRegencies = regenciesByProvince.flat();
  console.log(`  ${allRegencies.length} regencies`);

  console.log('Fetching districts...');
  const districtsByRegency = await mapPool(allRegencies, CONCURRENCY, async (r) =>
    fetchJson(`${BASE}/districts/${r.code}.json`)
  );
  const allDistricts = districtsByRegency.flat();
  console.log(`  ${allDistricts.length} districts`);

  console.log('Fetching villages... (this is the big one)');
  let done = 0;
  const villagesByDistrict = await mapPool(allDistricts, CONCURRENCY, async (d) => {
    const v = await fetchJson(`${BASE}/villages/${d.code}.json`);
    done++;
    if (done % 200 === 0) console.log(`  ${done}/${allDistricts.length} districts done`);
    return v;
  });
  const allVillages = villagesByDistrict.flat();
  console.log(`  ${allVillages.length} villages`);

  const provinceByCode = new Map(provinces.map(p => [p.code, toTitleCase(p.name)]));
  const regencyByCode = new Map(allRegencies.map(r => [r.code, { name: toTitleCase(r.name), provinceCode: r.province_code }]));
  const districtByCode = new Map(allDistricts.map(d => [d.code, { name: toTitleCase(d.name), regencyCode: d.regency_code }]));

  const flat = allVillages.map(v => {
    const district = districtByCode.get(v.district_code);
    const regency = district ? regencyByCode.get(district.regencyCode) : undefined;
    const province = regency ? provinceByCode.get(regency.provinceCode) : undefined;
    return {
      code: v.code,
      village: toTitleCase(v.name),
      district: district?.name ?? '',
      regency: regency?.name ?? '',
      province: province ?? '',
      postal: v.postal_code ?? '',
    };
  });

  const outDir = path.join(process.cwd(), 'public', 'data');
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'wilayah-full.json');
  writeFileSync(outPath, JSON.stringify(flat));
  console.log(`Wrote ${flat.length} villages to ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
