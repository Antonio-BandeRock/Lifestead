// The key a piece of the reading is filed under in a language's reading
// table (2026-10-26, Spanish first): a 53-bit fingerprint of the exact
// English, written in base 36. The reading runs to nearly three million
// characters, so its table is filed by fingerprint rather than by the
// English itself, which would carry the whole reading a second time. When
// an entry's English changes, its fingerprint changes with it, so the old
// translation simply stops matching and the English shows until the new
// one is written, never a translation of words that are no longer there.
//
// Pure and import-free, so scripts/i18n_batch.js computes the same key.

export function readingKey(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
