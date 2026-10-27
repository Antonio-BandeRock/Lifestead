// What Search Reading also searches when the app is not in English
// (2026-10-26, Spanish first). The reading is written in English and shown
// through the language's reading table, so someone reading it in Spanish
// types Spanish words into the search box; those words have to be found in
// the Spanish that is on screen, not only in the English underneath it.
//
// lib/i18n.ts hands its lookup in here once it loads, rather than this
// module importing it, so the reading stays loadable by the scripts that
// walk it without the whole words table coming along. Until a lookup is
// handed in, or while the app is in English, the search reads the English
// only, which is how it always worked.

export type ReadingTranslator = {
  // Which language the words below are in, so a search built while the app
  // was in one language is rebuilt once it changes.
  language: () => string;
  // The translation of a whole piece of the reading, or undefined when
  // nobody has written one yet.
  translate: (english: string) => string | undefined;
};

let translator: ReadingTranslator | null = null;

export function setReadingTranslator(next: ReadingTranslator | null): void {
  translator = next;
}

export function readingTranslator(): ReadingTranslator | null {
  return translator;
}
