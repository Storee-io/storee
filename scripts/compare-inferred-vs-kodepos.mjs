// Compare inferred postal codes vs kodepos.vercel.app
// Finds villages where inferred postal != kodepos.vercel.app postal
import { readFileSync, writeFileSync } from 'fs';

const CONCURRENCY = 20;

const normStr = s => s.toLowerCase().replace(/[\s\-_.]/g, '');

function parseCsv(text) {
  return text.trim().split('\n').slice(1).map(line => {
    const cols = line.match(/"([^"]*)"/g)?.map(s => s.slice(1, -1)) ?? [];
    return { province: cols[0], regency: cols[1], district: cols[2], village: cols[3], postal: cols[4] };
  });
}

async function queryKodepos(village) {
  try {
    const url = `https://kodepos.vercel.app/search/?q=${encodeURIComponent(village)}&limit=10`;
    const res = await fetch(url);
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch { return []; }
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

const inferred = parseCsv(readFileSync('inferred_all.csv', 'utf-8'));
console.log(`Loaded ${inferred.length} inferred rows`);

let done = 0;
const mismatches = [];
const matched = [];
const notFound = [];

await mapPool(inferred, CONCURRENCY, async (row) => {
  const results = await queryKodepos(row.village);
  done++;
  if (done % 500 === 0) console.log(`  ${done}/${inferred.length} done, mismatches so far: ${mismatches.length}`);

  // Find result matching same village + district
  const normVil = normStr(row.village);
  const normDist = normStr(row.district);
  const hit = results.find(r =>
    normStr(r.village) === normVil && normStr(r.district) === normDist
  ) ?? results.find(r => normStr(r.village) === normVil);

  if (!hit) {
    notFound.push(row);
    return;
  }

  const apiPostal = String(hit.code);
  if (apiPostal !== String(row.postal)) {
    mismatches.push({ ...row, kodepos_api: apiPostal, kodepos_village: hit.village, kodepos_district: hit.district });
  } else {
    matched.push(row);
  }
});

console.log(`\nResults:`);
console.log(`  Matched (same postal): ${matched.length}`);
console.log(`  Mismatch (different postal): ${mismatches.length}`);
console.log(`  Not found in kodepos API: ${notFound.length}`);

const rows = ['province,regency,district,village,inferred_postal,kodepos_api_postal,kodepos_district'];
for (const m of mismatches) {
  rows.push([m.province, m.regency, m.district, m.village, m.postal, m.kodepos_api, m.kodepos_district]
    .map(f => `"${f}"`).join(','));
}
writeFileSync('inferred_mismatches.csv', rows.join('\n'));
console.log(`Written inferred_mismatches.csv (${mismatches.length} rows)`);
