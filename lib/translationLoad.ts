// Reads a language's words from their data files (2026-11-20, Tony: "move
// the translations out of the app code so an update downloads only the
// files that changed. Plan ahead to make sure that also happens for
// translations of other languages").
//
// The words live in assets/translations/<code>/ as one asset per file
// (lib/translations/languages.ts lists them), so an update carries only the
// files whose words changed. They are read when the app opens, in two steps:
//   1. The app's words and the parts of food names, before the first draw
//      (app/_layout.tsx keeps the splash screen up until they are in), so a
//      screen never flashes in English first.
//   2. The reading, which is half the size and only shown once somebody
//      opens a piece of it, straight after, without holding anything up.
//      Screens redraw when it arrives (lib/language.ts noteWordsArrived).
// A language picked later in Profile is read the moment it is picked; until
// its words arrive its screens show English. A file that cannot be read is
// left out and the rest still arrive, so a missing file costs only its own
// words.
//
// On the phone an asset is a file (downloadAsync gives its path); on the
// computer it is an address the window serves, read with fetch.
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { installTranslations } from './i18n';
import { getLanguage, noteWordsArrived, subscribeLanguage, type AppLanguage } from './language';
import { LANGUAGE_PACKS } from './translations/languages';

type Table = Record<string, string>;
type Code = Exclude<AppLanguage, 'en'>;

/** Files read at once; more gains little and holds memory. */
const AT_ONCE = 8;

async function readText(module: number): Promise<string> {
  const asset = Asset.fromModule(module);
  if (Platform.OS === 'web') {
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error(`${asset.uri}: ${response.status}`);
    return response.text();
  }
  await asset.downloadAsync();
  return new File(asset.localUri ?? asset.uri).text();
}

/** A file edited by hand may end its last entry with a comma; forgiven. */
function parseWords(text: string): Table {
  try {
    return JSON.parse(text) as Table;
  } catch {
    return JSON.parse(text.replace(/,(\s*)\}\s*$/, '$1}')) as Table;
  }
}

/** Reads every file into one table, later files over earlier ones. */
async function readAll(modules: readonly number[]): Promise<Table> {
  const tables: (Table | null)[] = new Array(modules.length).fill(null);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < modules.length) {
      const index = next;
      next += 1;
      try {
        tables[index] = parseWords(await readText(modules[index]));
      } catch (error) {
        console.warn('A file of words could not be read', error);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(AT_ONCE, modules.length) }, worker));
  const merged: Table = {};
  for (const table of tables) if (table) Object.assign(merged, table);
  return merged;
}

const loading = new Map<Code, Promise<void>>();
const settled = new Set<Code>();
const listeners = new Set<() => void>();

function settle(language: Code): void {
  settled.add(language);
  listeners.forEach((listener) => listener());
}

/**
 * Reads a language's words, once. The promise ends when the app's words and
 * the food names are in; the reading follows on its own.
 */
export function loadTranslations(language: AppLanguage): Promise<void> {
  if (language === 'en') return Promise.resolve();
  const started = loading.get(language);
  if (started) return started;
  const pack = LANGUAGE_PACKS[language];
  const run = (async () => {
    try {
      const [words, foods] = await Promise.all([readAll(pack.files.words), readAll(pack.files.foods)]);
      installTranslations(language, { words: { ...words, ...pack.byHand }, foods, dates: pack.dates });
      noteWordsArrived();
    } catch (error) {
      console.warn(`The ${language} words could not be read`, error);
    } finally {
      settle(language);
    }
    readAll(pack.files.reading)
      .then((reading) => {
        installTranslations(language, { reading });
        noteWordsArrived();
      })
      .catch((error) => console.warn(`The ${language} reading could not be read`, error));
  })();
  loading.set(language, run);
  return run;
}

// The language the app opens in starts reading as soon as this file loads,
// and a language picked later is read the moment it is picked.
const OPENING_LANGUAGE = getLanguage();
void loadTranslations(OPENING_LANGUAGE);
subscribeLanguage(() => {
  void loadTranslations(getLanguage());
});

// Only the first draw waits, and only for the language the app opened in:
// once the app is on screen it never goes blank again, and a language
// picked later shows English for the moment its words take to arrive.
function readySnapshot(): boolean {
  return OPENING_LANGUAGE === 'en' || settled.has(OPENING_LANGUAGE);
}

function subscribeReady(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * True once the app's words in the language it opened in have been read (or
 * could not be), so the first draw can wait for them. English is always ready.
 */
export function useTranslationsReady(): boolean {
  return useSyncExternalStore(subscribeReady, readySnapshot, readySnapshot);
}
