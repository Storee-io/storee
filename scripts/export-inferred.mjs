import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const normStr = s => s.toLowerCase().replace(/[\s\-_.]/g, '');

const data = JSON.parse(readFileSync('public/data/wilayah-full.json', 'utf-8'));

const csvText = readFileSync('public/data/kodepos.csv', 'utf-8');
const lines = csvText.split('\n');
const byDistVil = new Set();
const byRegVil = new Set();
const byVil = new Set();
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (cols.length < 5) continue;
  const regency = cols[1].trim(), district = cols[2].trim(), village = cols[3].trim(), postal = cols[4].trim();
  if (!postal) continue;
  byDistVil.add(normStr(district) + '|' + normStr(village));
  byRegVil.add(normStr(regency) + '|' + normStr(village));
  byVil.add(normStr(village));
}

const inferred = data.filter(v => {
  if (!v.postal) return false;
  const dk = normStr(v.district) + '|' + normStr(v.village);
  const rk = normStr(v.regency) + '|' + normStr(v.village);
  const vk = normStr(v.village);
  return !byDistVil.has(dk) && !byRegVil.has(rk) && !byVil.has(vk);
});

console.log('Total inferred:', inferred.length);

const rows = ['province,regency,district,village,postal'];
for (const v of inferred) {
  rows.push([v.province, v.regency, v.district, v.village, v.postal].map(f => `"${f}"`).join(','));
}
writeFileSync('inferred_all.csv', rows.join('\n'));
console.log(`Written inferred_all.csv (${inferred.length} rows)`);
