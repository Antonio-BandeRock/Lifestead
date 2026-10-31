// Which language the app speaks (2026-10-26). Direct request: "Let's start
// with Spanish." The words themselves live in lib/i18n.ts and the tables
// under lib/translations/; this file only holds the choice.
//
// The choice belongs to the device, the way the navigation hand does
// (lib/navigationHand.ts): a plain file in Paths.document, never in the
// database, so it never travels through sync, two people sharing records can
// read them in different languages, and it is read synchronously before the
// first draw so a screen never flashes in the wrong language.
//
// Three answers. 'en' and 'es' are fixed; 'phone' follows the phone's own
// language setting and falls back to English for any language the app does
// not have yet. Missing or unreadable reads as 'phone' since the Spanish
// tables were finished (2026-10-31, 1.0.78.17): a phone set to Spanish opens in
// Spanish, and any other phone opens in English as before.
import { File, Paths } from 'expo-file-system';
import * as Localization from 'expo-localization';
import { useSyncExternalStore } from 'react';

/** A language the app has words for. English is the source every table is keyed by. */
export type AppLanguage = 'en' | 'es';

/** What the person picked. */
export type LanguageChoice = AppLanguage | 'phone';

const CHOICE_FILE_NAME = 'language.txt';

function choiceFile(): File {
  return new File(Paths.document, CHOICE_FILE_NAME);
}

function readChoice(): LanguageChoice {
  try {
    const file = choiceFile();
    if (file.exists) {
      const text = file.textSync().trim();
      if (text === 'es' || text === 'phone' || text === 'en') return text;
    }
  } catch {
    // Falls back to the default below.
  }
  return 'phone';
}

/** The phone's language, when it is one the app has words for. */
export function phoneLanguage(): AppLanguage {
  try {
    const code = Localization.getLocales()[0]?.languageCode;
    if (code === 'es') return 'es';
  } catch {
    // Falls back to English.
  }
  return 'en';
}

let choice: LanguageChoice | null = null;
let resolved: AppLanguage | null = null;
const listeners = new Set<() => void>();

export function getLanguageChoice(): LanguageChoice {
  if (choice === null) choice = readChoice();
  return choice;
}

/** The language words are shown in right now. Safe to call during render. */
export function getLanguage(): AppLanguage {
  if (resolved === null) {
    const picked = getLanguageChoice();
    resolved = picked === 'phone' ? phoneLanguage() : picked;
    globalThis.lifesteadDateLocale = localeFor(resolved);
  }
  return resolved;
}

declare global {
  /**
   * The locale dates are written in, kept on the global so the pure modules
   * that write sentences (lib/countdown.ts, lib/monthGrid.ts and the rest)
   * can read it without importing this file, which their node tests could
   * not load. Undefined means the phone's own way of writing a date.
   */
  var lifesteadDateLocale: string | undefined;
}

/**
 * The locale dates are written in. Spanish is always Mexican Spanish. English
 * keeps the phone's own way of writing a date (as it did before 2026-10-26),
 * except on a phone set to Spanish, where it is US English so an English
 * screen does not carry Spanish month names.
 */
export function appLocale(): string | undefined {
  return localeFor(getLanguage());
}

function localeFor(language: AppLanguage): string | undefined {
  if (language === 'es') return 'es-MX';
  return phoneLanguage() === 'es' ? 'en-US' : undefined;
}

export function setLanguageChoice(next: LanguageChoice): void {
  if (getLanguageChoice() === next) return;
  choice = next;
  resolved = null;
  getLanguage();
  try {
    choiceFile().write(next);
  } catch {
    // Holds for this run; the next launch falls back to the default.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Redraws the caller when the language changes. */
export function useLanguage(): AppLanguage {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}

export function useLanguageChoice(): LanguageChoice {
  return useSyncExternalStore(subscribe, getLanguageChoice, getLanguageChoice);
}
