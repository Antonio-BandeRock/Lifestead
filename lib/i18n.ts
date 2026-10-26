// The app's words in another language (2026-10-26, Spanish first).
//
// HOW IT WORKS. The English stays in the source, where it always was, and
// each language is a table from that exact English to its translation
// (lib/translations/es.ts). Anything missing from a table shows in English, so a
// screen is never blank and the work can go one screen at a time.
//
// Keyed by the English rather than by made-up ids for three reasons, each
// specific to this codebase: the audits (audit_ai_isms.js and the rest) keep
// reading the English where it is written; Tell Claude's Edit wording notes
// find the source by its English text, which still works; and roughly a
// million words of reading never had to be renamed to be translatable.
//
// WHERE TRANSLATION HAPPENS.
//  1. Every Text in the app, without its file changing. components/
//     EditableText.tsx already stands in for React Native's Text everywhere
//     (metro.config.js), and it hands its words through translateChildren
//     below. That covers words written in JSX and words that reach a Text
//     from a constant, such as a tab's title or a lens label.
//  2. t() by hand, for words that never pass through a Text: Alert titles
//     and messages, placeholders, notifications, the PDF report, and any
//     sentence built with a value inside it (t('{count} meals', { count })).
//
// A sentence assembled from pieces in JSX (`Logged {count} meals`) reaches a
// Text as several children and is not matched until it is written as one
// t() call, since word order differs between languages.
import { getLanguage, type AppLanguage } from './language';
import { ES } from './translations/es';

const TABLES: Record<Exclude<AppLanguage, 'en'>, Readonly<Record<string, string>>> = {
  es: ES,
};

function table(language: AppLanguage): Readonly<Record<string, string>> | null {
  return language === 'en' ? null : TABLES[language];
}

/** The words in `language`, or the English itself when the table has none. */
export function translateIn(language: AppLanguage, english: string): string {
  const words = table(language);
  if (!words) return english;
  const found = words[english];
  if (found !== undefined) return found;
  // Keep the spaces round a piece of a sentence, which a table never holds.
  const trimmed = english.trim();
  if (trimmed !== english && trimmed) {
    const inner = words[trimmed];
    if (inner !== undefined) return english.replace(trimmed, inner);
  }
  return english;
}

/** Whether `language` has these words, for the coverage script and tests. */
export function hasTranslation(language: AppLanguage, english: string): boolean {
  const words = table(language);
  return !words || words[english] !== undefined || words[english.trim()] !== undefined;
}

/**
 * The words in the app's language, with {name} filled from `values`.
 * Call it at the moment the words are shown, never once at module load,
 * or the words stay in whichever language was on when the file was read.
 */
export function t(english: string, values?: Readonly<Record<string, string | number>>): string {
  const words = translateIn(getLanguage(), english);
  if (!values) return words;
  return words.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : whole,
  );
}

/**
 * A Text's children in `language`. A plain string, or children that are all
 * strings and numbers (JSX splits `Save{' '}Now` that way), is looked up
 * whole; otherwise each string piece is looked up on its own and anything
 * else, a nested Text or an icon, is left as it is.
 */
export function translateChildren<T>(children: T, language: AppLanguage): T {
  if (language === 'en') return children;
  if (typeof children === 'string') return translateIn(language, children) as T;
  if (!Array.isArray(children)) return children;
  if (children.every((child) => typeof child === 'string' || typeof child === 'number')) {
    const whole = children.join('');
    const found = translateIn(language, whole);
    if (found !== whole) return found as T;
  }
  let changed = false;
  const out = children.map((child: unknown) => {
    if (typeof child !== 'string') return child;
    const found = translateIn(language, child);
    if (found !== child) changed = true;
    return found;
  });
  return (changed ? out : children) as T;
}
