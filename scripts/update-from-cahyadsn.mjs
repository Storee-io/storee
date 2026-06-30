// Update wilayah-full.json: for mismatched villages, apply cahyadsn postal code + village name
import { readFileSync, writeFileSync } from 'fs';

const WILAYAH_ABBR = new Set(['DKI', 'DI', 'DIY', 'NTB', 'NTT']);
const toTitleCase = s => s.split(' ').map(w =>
  WILAYAH_ABBR.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
).join(' ');

console.log('Loading wilayah-full.json...');
const wilayah = JSON.parse(readFileSync('public/data/wilayah-full.json', 'utf-8'));

console.log('Parsing wilayah_kodepos.sql (postal codes)...');
const sqlPostal = readFileSync('scripts/wilayah_kodepos.sql', 'utf-8');
const postalMap = new Map();
for (const m of sqlPostal.matchAll(/\('([\d.]+)',\s*'(\d+)'\)/g)) {
  postalMap.set(m[1].replace(/\./g, ''), m[2]);
}
console.log(`  ${postalMap.size} postal entries`);

console.log('Parsing wilayah_cahyadsn.sql (village names)...');
const sqlNames = readFileSync('scripts/wilayah_cahyadsn.sql', 'utf-8');
const nameMap = new Map();
// Only capture 10-digit codes (village level: X.XX.XX.XXXX → 10 digits without dots)
for (const m of sqlNames.matchAll(/\('(\d{2}\.\d{2}\.\d{2}\.\d{4})','([^']+)'\)/g)) {
  nameMap.set(m[1].replace(/\./g, ''), toTitleCase(m[2].replace(/''/g, "'")));
}
console.log(`  ${nameMap.size} village name entries`);

let updatedPostal = 0;
let updatedName = 0;
let skipped = 0;

for (const v of wilayah) {
  const cahyadsnPostal = postalMap.get(v.code);
  const cahyadsnName   = nameMap.get(v.code);

  // Update postal if different
  if (cahyadsnPostal && cahyadsnPostal !== String(v.postal)) {
    v.postal = cahyadsnPostal;
    updatedPostal++;
  }

  // Update village name if cahyadsn has one
  if (cahyadsnName && cahyadsnName !== v.village) {
    v.village = cahyadsnName;
    updatedName++;
  }

  if (!cahyadsnPostal && !cahyadsnName) skipped++;
}

console.log(`\nUpdated postal codes: ${updatedPostal}`);
console.log(`Updated village names: ${updatedName}`);
console.log(`Skipped (not in cahyadsn): ${skipped}`);

writeFileSync('public/data/wilayah-full.json', JSON.stringify(wilayah));
console.log('wilayah-full.json updated.');
