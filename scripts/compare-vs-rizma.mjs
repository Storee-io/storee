// Compare wilayah-full.json postal codes vs rizmaprawira/kodepos_indonesia CSV
import { readFileSync, writeFileSync } from 'fs';

const normStr = s => s.toLowerCase().replace(/[\s\-_.,']/g, '');
// Strip kabupaten/kab./kota/kota adm. prefixes before comparing regency names
const normRegency = s => s.toLowerCase()
  .replace(/\bkabupaten\b/g, '')
  .replace(/\bkota adm\.?\b/g, '')
  .replace(/\bkota\b/g, '')
  .replace(/\bkab\.?\b/g, '')
  .replace(/[\s\-_.,']/g, '')
  .trim();

console.log('Loading wilayah-full.json...');
const wilayah = JSON.parse(readFileSync('public/data/wilayah-full.json', 'utf-8'));

console.log('Loading kodepos_rizma.csv...');
const csvText = readFileSync('scripts/kodepos_rizma.csv', 'utf-8');
const lines = csvText.trim().split('\n');

// Build lookup with 3 levels of precision:
// primary:  regency+district+village → postal (most accurate)
// secondary: district+village → postal (fallback if regency name differs)
const byRegDistVil = new Map();
const byDistVil    = new Map();

for (let i = 1; i < lines.length; i++) {
  // CSV: Kodepos,Desa / Kelurahan,Kecamatan,Kota / Kabupaten,Provinsi
  const cols = lines[i].split(',');
  if (cols.length < 5) continue;
  const postal   = cols[0].trim();
  const village  = cols[1].trim();
  const district = cols[2].trim();
  const regency  = cols[3].trim();
  if (!postal || !village) continue;

  const rdk = normRegency(regency) + '|' + normStr(district) + '|' + normStr(village);
  const dk  = normStr(district)    + '|' + normStr(village);
  if (!byRegDistVil.has(rdk)) byRegDistVil.set(rdk, postal);
  if (!byDistVil.has(dk))     byDistVil.set(dk, postal);
}

console.log(`Rizma index: ${byRegDistVil.size} regency+district+village keys`);

const diffs = [];
let matched = 0;

for (const v of wilayah) {
  if (!v.postal) continue;

  const rdk = normRegency(v.regency) + '|' + normStr(v.district) + '|' + normStr(v.village);
  const dk  = normStr(v.district)    + '|' + normStr(v.village);

  // Try most specific match first, fallback to district+village
  const rizmaPostal = byRegDistVil.get(rdk) ?? byDistVil.get(dk);
  const matchLevel  = byRegDistVil.has(rdk) ? 'regency+district+village' : byDistVil.has(dk) ? 'district+village' : null;

  if (!rizmaPostal) {
    diffs.push({ ...v, rizma_postal: '', match_level: 'not_found', status: 'not_found_in_rizma' });
  } else if (rizmaPostal !== String(v.postal)) {
    diffs.push({ ...v, rizma_postal: rizmaPostal, match_level: matchLevel, status: 'mismatch' });
  } else {
    matched++;
  }
}

const mismatches = diffs.filter(d => d.status === 'mismatch');
const notFound   = diffs.filter(d => d.status === 'not_found_in_rizma');

console.log(`\nResults:`);
console.log(`  Matched (same postal): ${matched}`);
console.log(`  Mismatch (different postal): ${mismatches.length}`);
console.log(`  Not found in rizma data: ${notFound.length}`);
console.log(`  Total differences: ${diffs.length}`);

const rows = ['province,regency,district,village,rizuku_postal,rizma_postal,match_level,status'];
for (const d of diffs) {
  rows.push([d.province, d.regency, d.district, d.village, d.postal, d.rizma_postal, d.match_level ?? '', d.status]
    .map(f => `"${f}"`).join(','));
}
writeFileSync('rizma_mismatches.csv', rows.join('\n'));
console.log(`Written rizma_mismatches.csv (${diffs.length} rows)`);
