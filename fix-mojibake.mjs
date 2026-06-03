// Fix mojibake in StorePreview.tsx
// The file has UTF-8 text that was misread as Windows-1252 and re-saved as UTF-8.
// Reverse: convert each "bad" Unicode char back to its Windows-1252 byte, then re-decode as UTF-8.

import { readFileSync, writeFileSync } from 'fs';

// Windows-1252 byte -> Unicode codepoint map for the 0x80-0x9F range
// (the range where Windows-1252 differs from ISO-8859-1)
const w1252 = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
  0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
  0x9E: 0x017E, 0x9F: 0x0178,
  // Undefined in Windows-1252 — map to their raw byte value (control chars)
  0x81: 0x0081, 0x8D: 0x008D, 0x8F: 0x008F, 0x90: 0x0090, 0x9D: 0x009D,
};

// Reverse map: Unicode codepoint -> Windows-1252 byte
const reverseW1252 = {};
for (const [byte, cp] of Object.entries(w1252)) {
  reverseW1252[cp] = parseInt(byte);
}
// Add standard Latin-1 range 0xA0-0xFF (same in Windows-1252 and ISO-8859-1)
for (let b = 0xA0; b <= 0xFF; b++) {
  reverseW1252[b] = b;
}
// Add ASCII 0x00-0x7F
for (let b = 0; b <= 0x7F; b++) {
  reverseW1252[b] = b;
}

function fixMojibake(text) {
  // Walk through the string. For each character, try to collect a sequence of
  // "Windows-1252-originating" chars and decode them as UTF-8.
  const result = [];
  let i = 0;
  while (i < text.length) {
    const cp = text.codePointAt(i);
    const charLen = cp > 0xFFFF ? 2 : 1;

    // Check if this character could be a Windows-1252 byte representation
    const byte = reverseW1252[cp];
    if (byte !== undefined && byte > 0x7F) {
      // Try to collect a sequence of bytes that form valid UTF-8
      const bytes = [byte];
      let j = i + charLen;

      // Determine how many more bytes we need based on the leading byte
      let needed = 0;
      if ((byte & 0xE0) === 0xC0) needed = 1;
      else if ((byte & 0xF0) === 0xE0) needed = 2;
      else if ((byte & 0xF8) === 0xF0) needed = 3;

      if (needed > 0) {
        let valid = true;
        for (let k = 0; k < needed; k++) {
          if (j >= text.length) { valid = false; break; }
          const nextCp = text.codePointAt(j);
          const nextByte = reverseW1252[nextCp];
          if (nextByte === undefined || (nextByte & 0xC0) !== 0x80) { valid = false; break; }
          bytes.push(nextByte);
          j += nextCp > 0xFFFF ? 2 : 1;
        }

        if (valid && bytes.length === 1 + needed) {
          // Try to decode as UTF-8
          try {
            const decoded = Buffer.from(bytes).toString('utf8');
            // Check it decoded to a valid, non-replacement character
            if (!decoded.includes('�')) {
              result.push(decoded);
              i = j;
              continue;
            }
          } catch {}
        }
      }
    }

    // No mojibake — keep as-is
    result.push(String.fromCodePoint(cp));
    i += charLen;
  }
  return result.join('');
}

const file = 'src/components/preview/StorePreview.tsx';
const original = readFileSync(file, 'utf8');
const fixed = fixMojibake(original);

const before = original.length;
const after = fixed.length;
const changes = before - after;
console.log(`Original length: ${before}, Fixed length: ${after}, Diff: ${changes}`);

// Spot check
const checks = ['2–4 business days', '·', '©', '→', '✓', '🔒', '🎉'];
for (const c of checks) {
  const found = fixed.includes(c);
  console.log(`  ${found ? '✓' : '✗'} "${c}"`);
}

writeFileSync(file, fixed, 'utf8');
console.log('Done!');
