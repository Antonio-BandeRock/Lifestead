// Every language the app has words for, and where each one's words are
// (2026-11-20, Tony: "move the translations out of the app code so an update
// downloads only the files that changed. Plan ahead to make sure that also
// happens for translations of other languages").
//
// A language is three things:
//   1. Its data files, assets/translations/<code>/part-NNN.words (the app's
//      words), foods-NNN.words (the parts of food names) and
//      reading-NNN.words (the reading, by lib/readingKey.ts's fingerprint),
//      listed in lib/translations/<code>/files.ts, which
//      scripts/i18n_batch.js writes. Each file is its own asset, so an
//      update downloads only the files that changed and the app code stays
//      the same size whatever the number of languages.
//   2. Its hand-written entries in code (lib/translations/<code>.ts), which
//      win over a file.
//   3. How it writes a date (lib/translations/<code>Dates.ts).
// Adding one is a folder, those two files and one line below, plus the code
// in lib/language.ts's AppLanguage.
import type { AppLanguage } from '../language';
import { ES_BY_HAND } from './es';
import { ES_DATES, type DateWords } from './esDates';
import { ES_FILES } from './es/files';

/** Asset modules (require() of a .words file), read by lib/translationLoad.ts. */
export type TranslationFiles = { words: number[]; foods: number[]; reading: number[] };

export type LanguagePack = {
  files: TranslationFiles;
  byHand: Readonly<Record<string, string>>;
  dates: DateWords;
};

export const LANGUAGE_PACKS: Record<Exclude<AppLanguage, 'en'>, LanguagePack> = {
  es: { files: ES_FILES, byHand: ES_BY_HAND, dates: ES_DATES },
};
