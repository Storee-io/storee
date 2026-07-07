import { readFileSync, writeFileSync } from 'fs';

const rows = readFileSync('rizma_mismatches.csv', 'utf-8').trim().split('\n');
const header = rows[0];
const filtered = rows.slice(1).filter(r => r.includes('"district+village"'));
writeFileSync('mismatch_district_village_only.csv', [header, ...filtered].join('\n'));
console.log(`Written mismatch_district_village_only.csv (${filtered.length} rows)`);
