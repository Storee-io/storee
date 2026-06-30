// Compare wilayah-full.json vs cahyadsn/wilayah_kodepos (matched by exact region code)
import { readFileSync, writeFileSync } from 'fs';

console.log('Loading wilayah-full.json...');
const wilayah = JSON.parse(readFileSync('public/data/wilayah-full.json', 'utf-8'));

console.log('Parsing wilayah_kodepos.sql...');
const sql = readFileSync('scripts/wilayah_kodepos.sql', 'utf-8');

// Extract ('11.01.01.2001', '23773') pairs
const cahyadsnMap = new Map();
for (const match of sql.matchAll(/\('([\d.]+)',\s*'(\d+)'\)/g)) {
  const code   = match[1].replace(/\./g, '');  // strip dots → 1101012001
  const postal = match[2];
  cahyadsnMap.set(code, postal);
}
console.log(`Parsed ${cahyadsnMap.size} entries from SQL`);

const matched   = [];
const mismatch  = [];
const notFound  = [];
const noPostal  = [];

for (const v of wilayah) {
  if (!v.postal) { noPostal.push(v); continue; }

  const cahyadsn = cahyadsnMap.get(v.code);
  if (!cahyadsn) {
    notFound.push(v);
  } else if (cahyadsn !== String(v.postal)) {
    mismatch.push({ ...v, cahyadsn_postal: cahyadsn });
  } else {
    matched.push(v);
  }
}

console.log(`\nResults:`);
console.log(`  Matched (same postal):          ${matched.length}`);
console.log(`  Mismatch (different postal):    ${mismatch.length}`);
console.log(`  Not found in cahyadsn:          ${notFound.length}`);
console.log(`  No postal in our data:          ${noPostal.length}`);
console.log(`  Total differences:              ${mismatch.length + notFound.length}`);

// --- mismatch CSV ---
const mismatchRows = ['province,regency,district,village,code,rizuku_postal,cahyadsn_postal'];
for (const d of mismatch) {
  mismatchRows.push([d.province, d.regency, d.district, d.village, d.code, d.postal, d.cahyadsn_postal]
    .map(f => `"${f}"`).join(','));
}
writeFileSync('cahyadsn_mismatch.csv', mismatchRows.join('\n'));
console.log(`\nWritten cahyadsn_mismatch.csv (${mismatch.length} rows)`);

// --- not found CSV ---
const nfRows = ['province,regency,district,village,code,rizuku_postal'];
for (const d of notFound) {
  nfRows.push([d.province, d.regency, d.district, d.village, d.code, d.postal]
    .map(f => `"${f}"`).join(','));
}
writeFileSync('cahyadsn_not_found.csv', nfRows.join('\n'));
console.log(`Written cahyadsn_not_found.csv (${notFound.length} rows)`);

// --- province breakdown for mismatches ---
const byProv = {};
mismatch.forEach(m => { byProv[m.province] = (byProv[m.province] || 0) + 1; });
console.log('\nTop 10 provinces with mismatch:');
Object.entries(byProv).sort((a, b) => b[1] - a[1]).slice(0, 10)
  .forEach(([p, c]) => console.log(String(c).padStart(6), p));
