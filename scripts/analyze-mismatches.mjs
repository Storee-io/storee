import { readFileSync } from 'fs';

const rows = readFileSync('rizma_mismatches.csv', 'utf-8').trim().split('\n').slice(1);
const parsed = rows.map(r => {
  const c = r.match(/"([^"]*)"/g).map(s => s.slice(1, -1));
  return { province: c[0], district: c[2], village: c[3], ours: c[4], rizma: c[5] };
});

const sameZone  = parsed.filter(m => m.ours.slice(0, 3) === m.rizma.slice(0, 3)).length;
const samePref2 = parsed.filter(m => m.ours.slice(0, 2) === m.rizma.slice(0, 2)).length;

console.log('Total mismatches:', parsed.length);
console.log('Same 3-digit zone (minor diff):', sameZone, `(${(sameZone/parsed.length*100).toFixed(1)}%)`);
console.log('Same 2-digit province prefix:', samePref2, `(${(samePref2/parsed.length*100).toFixed(1)}%)`);
console.log('Completely different area:', parsed.length - samePref2);

const byProv = {};
parsed.forEach(m => { byProv[m.province] = (byProv[m.province] || 0) + 1; });
console.log('\nTop provinces with mismatches:');
Object.entries(byProv).sort((a, b) => b[1] - a[1]).slice(0, 10)
  .forEach(([p, c]) => console.log(String(c).padStart(6), p));
