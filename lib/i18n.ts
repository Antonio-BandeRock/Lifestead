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
//  2. Every TextInput's placeholder and every Alert, the same way
//     (components/TranslatedTextInput.tsx, lib/translateAlerts.ts).
//  3. t() by hand, for words that reach the screen some other way:
//     notifications, the PDF report, voice.
//
// SENTENCES WITH A VALUE IN THEM. A table entry may hold {name}s: "Logged
// {count} meals" matches "Logged 3 meals" whether it was built with t(), a
// template literal, or JSX pieces, and each value is itself looked up, so
// "{name} is due" turns "Levothyroxine is due" round with the medicine's
// name left as the person typed it. Patterns are indexed by their first and
// last literal word, so a lookup tries a handful of them, never the table.
//
// WHEN NOTHING MATCHES WHOLE, the words are cut where a language never
// reorders them, at a line break, at " · ", and between sentences, and
// each piece is looked up on its own. A label's trailing colon or ellipsis
// is put back after the words are found.
//
// A TEXT WITH ANOTHER TEXT INSIDE IT ("Tap <Bold>Save</Bold> to keep it")
// is looked up as "Tap <0>Save</0> to keep it", the way i18next's Trans
// writes it, so a translation can move the bold word to where Spanish puts
// it. An element with no words of its own (an icon) is <0/>.
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { getLanguage, type AppLanguage } from './language';
import { ES, ES_FOODS, ES_READING } from './translations/es';
import { readingKey } from './readingKey';
import { setReadingTranslator } from './digest/searchLanguage';
import { ES_DATES, type DateWords } from './translations/esDates';

type Table = Readonly<Record<string, string>>;

const TABLES: Record<Exclude<AppLanguage, 'en'>, Table> = {
  es: ES,
};

// FOOD NAMES from the reference database ("Apple, raw, with skin") are
// translated by the parts between their commas, the way Mexico's food
// tables write a name too ("Manzana, cruda, con cáscara"), so one table of
// parts reaches every screen a food's name is shown on. A name is turned
// round only when every part of it is found.
const FOODS: Record<Exclude<AppLanguage, 'en'>, Table> = {
  es: ES_FOODS,
};

// THE READING (the conditions, Health Literacy, Earth Matters, Horticulture
// and the recipes) is filed by a fingerprint of each piece's English
// rather than by the English, since it runs to nearly three million
// characters (lib/readingKey.ts). A piece is looked up there once the
// table of the app's words has missed it.
const READING: Record<Exclude<AppLanguage, 'en'>, Table> = {
  es: ES_READING,
};

// DATES written in English by the app ("Oct 26", "Mon 26 Oct", "October
// 2026", "Oct 26, 7:45 AM") are recognised and written again the way the
// language writes them, so the fifty or so places that build a date from an
// English list of months never needed changing (lib/translations/esDates.ts).
const DATES: Record<Exclude<AppLanguage, 'en'>, DateWords> = {
  es: ES_DATES,
};

type Pattern = {
  regex: RegExp;
  names: string[];
  target: string;
  /** Letters that are not a {name}, so the most specific pattern wins. */
  literal: number;
  /** The longest piece of fixed text, which a loose pattern needs to see first. */
  needle: string;
  /** Per value, whether it is an ending glued to a word ("Flare{value}"). */
  glued: boolean[];
};

type Compiled = {
  words: Table;
  foods: Table;
  reading: Table;
  byFirst: Map<string, Pattern[]>;
  byLast: Map<string, Pattern[]>;
  /** Patterns with no whole word at either end: "{n} could not be opened. {why}". */
  loose: Pattern[];
  dates: DateWords;
  memo: Map<string, string>;
};

const compiled = new Map<AppLanguage, Compiled>();
const MEMO_LIMIT = 8000;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function firstWord(text: string): string {
  const match = /^\s*([^\s{]+)/.exec(text);
  return match ? match[1].toLowerCase() : '';
}

function lastWord(text: string): string {
  const match = /([^\s}]+)\s*$/.exec(text);
  return match ? match[1].toLowerCase() : '';
}

function compile(language: AppLanguage): Compiled | null {
  if (language === 'en') return null;
  const existing = compiled.get(language);
  if (existing) return existing;
  const words = TABLES[language];
  const byFirst = new Map<string, Pattern[]>();
  const byLast = new Map<string, Pattern[]>();
  const loose: Pattern[] = [];
  for (const [english, target] of Object.entries(words)) {
    if (!english.includes('{')) continue;
    const parts = english.split(/\{(\w+)\}/);
    const names: string[] = [];
    const glues: boolean[] = [];
    let source = '^';
    let literal = 0;
    parts.forEach((part, index) => {
      if (index % 2 === 1) {
        names.push(part);
        // A value glued to the word before it ("day{value}", "Result{value}")
        // is a suffix that may be nothing: "1 day" and "3 days" are one entry.
        // So is a value straight after another value ("{date}{value}").
        const glued = /\S$/.test(parts[index - 1]) || (index > 1 && parts[index - 1] === '');
        glues.push(/[A-Za-z]$/.test(parts[index - 1]));
        source += glued ? '(.*?)' : '(.+?)';
      } else {
        source += escapeRegex(part);
        literal += part.replace(/\s/g, '').length;
      }
    });
    if (literal === 0) continue;
    const fixed = parts.filter((_, at) => at % 2 === 0);
    const needle = fixed.reduce((longest, part) => (part.trim().length > longest.length ? part.trim() : longest), '');
    const pattern: Pattern = { regex: new RegExp(`${source}$`, 's'), names, target, literal, needle, glued: glues };
    // A first word is only a key when a space ends it: in "Result{value}" or
    // "\"{name}\"" the words shown run straight into the value.
    const first = parts[0];
    const last = parts[parts.length - 1];
    const head = /^\s*[^\s{]+\s/.test(first) ? firstWord(first) : '';
    const tail = last.trim() ? lastWord(last) : '';
    // A pattern whose first word is a word sits under it; one that starts
    // with a value sits under its last word.
    // One that ends "{value}." sits under its last mark, and needs words.
    const marksOnly = !head && !!tail && !/[a-z0-9]/i.test(tail);
    if (!/[A-Za-z]/.test(fixed.join(''))) continue;
    const tailKey = marksOnly ? tail.slice(-1) : /\s\S+\s*$/.test(last) ? tail : '';
    // Anything else ("{n} could not be opened. {why}", "Result{value}")
    // is tried only when its longest piece of fixed text is in the words,
    // and only when that piece says something: "{spent} of {limit}" would
    // otherwise turn the "of" in any sentence into "de".
    if (!head && !tailKey) {
      if ((needle.match(/[A-Za-z]/g) ?? []).length >= 4) loose.push(pattern);
      continue;
    }
    const [index, key] = head ? [byFirst, head] : [byLast, tailKey];
    const list = index.get(key);
    if (list) list.push(pattern);
    else index.set(key, [pattern]);
  }
  for (const list of [...byFirst.values(), ...byLast.values(), loose]) list.sort((a, b) => b.literal - a.literal);
  const made: Compiled = { words, foods: FOODS[language], reading: READING[language], byFirst, byLast, loose, dates: DATES[language], memo: new Map() };
  compiled.set(language, made);
  return made;
}

function exact(words: Table, english: string): string | undefined {
  const found = words[english];
  if (found !== undefined) return found;
  // Keep the spaces round a piece of a sentence, which a table never holds.
  const trimmed = english.trim();
  if (trimmed !== english && trimmed) {
    const inner = words[trimmed];
    if (inner !== undefined) return english.replace(trimmed, () => inner);
  }
  return undefined;
}

const SEPARATED = /\n|\s[·•|]\s/;
// Nor across the end of a sentence: a string of several sentences is looked
// up a sentence at a time (byPieces) rather than as one loose pattern.
const ACROSS_SENTENCES = /[.!?;]\s+[A-Z0-9"“(¿¡]/;

// The full stop in a title before a name ("Dr. Ruiz") ends no sentence.
const TITLE_STOP = /\b(Dr|Dra|Mr|Mrs|Ms|St|Jr|Sr)\.(?=\s)/g;
const ENDS_IN_TITLE = /\b(Dr|Dra|Mr|Mrs|Ms|St|Jr|Sr)\.$/;

function acrossSentences(value: string): boolean {
  return ACROSS_SENTENCES.test(value.replace(TITLE_STOP, (_, title: string) => title));
}

// "a las 7:45 a. m." ends a sentence with the full stop it already has.
function oneStop(words: string): string {
  return words.replace(/(\b[ap]\. m\.)\./g, (_, clock: string) => clock);
}

// A pattern is a sentence with gaps for values, and a value that stayed in
// English is right when it is a number or somebody's name for a thing, and
// wrong when it is the rest of an English sentence the pattern happened to
// fit: "Pick up prescription" is not "Cosechar up prescription", and
// "Retirement match" is not "Retirement resultado". Such a fit is refused,
// so the words stay whole in English, where the list of what is left
// (lib/untranslatedLog.ts) finds them, rather than half in each language.
const COUNT_NAMES = new Set(['count', 'n', 'days', 'hours', 'minutes', 'weeks', 'months', 'total', 'm', 'h', 'low', 'high', 'hour', 'clock', 'percent', 'amount', 'number', 'shown', 'done']);
const SPANISH_WORDS = /[áéíóúñü¿¡]|\b(el|la|los|las|del|que|con|para|por|una|un|y|de)\b/i;
const SENTENCE_WORDS = /\b(the|an|and|or|of|to|up|over|for|with|in|on|at|from|after|before|about|your|my|is|are|was|it|this|that|be|by|into|out|off|still|not)\b/i;

/** A count holds a number, perhaps with its unit, or nothing that reads as words. */
function countLike(value: string): boolean {
  return /\d/.test(value) || !/[A-Za-z]{2}/.test(value);
}

function leftoverEnglish(value: string, glued: boolean): boolean {
  const words = value.trim();
  if (!/[A-Za-z]{2}/.test(words)) return false;
  // "Flare{value}" holds an ending ("s"), never "s and check-ins".
  if (glued) return words.length > 3 || /\s/.test(value);
  // A name holds whatever somebody called a thing, which starts with a
  // capital or a digit far more often than the middle of a sentence does,
  // and is seldom a run of words joined by "to", "the" and "with".
  // Words somebody typed in Spanish are never taken for English left over.
  if (SPANISH_WORDS.test(words)) return false;
  const several = words.split(/\s+/).length;
  return (/^[a-z]/.test(words) && several >= 2) || (several >= 3 && SENTENCE_WORDS.test(words));
}

function byPattern(table: Compiled, english: string, depth: number): string | undefined {
  const trimmed = english.trim();
  if (!trimmed) return undefined;
  const candidates = [
    ...(table.byFirst.get(firstWord(trimmed)) ?? []),
    ...(table.byLast.get(lastWord(trimmed)) ?? []),
    ...(/[^\w\s]/.test(trimmed.slice(-1)) && trimmed.slice(-1) !== lastWord(trimmed) ? table.byLast.get(trimmed.slice(-1)) ?? [] : []),
    ...table.loose.filter((pattern) => trimmed.includes(pattern.needle)),
  ].sort((a, b) => b.literal - a.literal);
  for (const pattern of candidates) {
    const match = pattern.regex.exec(trimmed);
    // A value never runs across a line or a middle dot: those are pieces.
    if (!match || match.slice(1).some((value) => SEPARATED.test(value) || acrossSentences(value))) continue;
    const values: Record<string, string> = {};
    let leftover = false;
    pattern.names.forEach((name, index) => {
      const value = match[index + 1];
      const found = depth < 3 ? lookup(table, value, depth + 1) : undefined;
      if (COUNT_NAMES.has(name) ? !countLike(value) : found === undefined && leftoverEnglish(value, pattern.glued[index])) leftover = true;
      values[name] = found ?? value;
    });
    if (leftover) continue;
    const filled = pattern.target.replace(/\{(\w+)\}/g, (whole, name: string) => values[name] ?? whole);
    return english.replace(trimmed, () => oneStop(filled));
  }
  return undefined;
}

const TRAILING = /^(.*?)(\s*[:…?!.]+|\.\.\.)$/s;
const COUNTED = /^(.*?)(\s*\(\d[\d,.]*\))$/s;

function byPieces(table: Compiled, english: string, depth: number): string | undefined {
  // A line break, a middle dot or a bullet is never moved by a translation.
  for (const separator of [/(\n+)/, /(\s+[·•|]\s+)/]) {
    const pieces = english.split(separator);
    if (pieces.length < 3) continue;
    let changed = false;
    const out = pieces.map((piece, index) => {
      if (index % 2 === 1 || !piece.trim()) return piece;
      const found = lookup(table, piece, depth + 1);
      if (found === undefined) return piece;
      changed = true;
      return found;
    });
    return changed ? out.join('') : undefined;
  }
  // A shelf's count, "Soil and Compost (12)", says the same in any language.
  const counted = COUNTED.exec(english);
  if (counted && counted[1].trim()) {
    const found = lookup(table, counted[1], depth + 1);
    if (found !== undefined) return found + counted[2];
  }
  // A label's colon, an ellipsis or a question mark.
  const trailing = TRAILING.exec(english);
  if (trailing && trailing[1].trim()) {
    const found = exact(table.words, trailing[1]) ?? byPattern(table, trailing[1], depth);
    // "7:45 AM." is "7:45 a. m.", with one full stop rather than two.
    if (found !== undefined) return trailing[2] === '.' && found.endsWith('.') ? found : found + trailing[2];
  }
  // A list, "3 meals, 2 doses and 1 routine", only when every item has words
  // of its own, so a list is never left half in one language.
  if (/ and /.test(english) && !/[.!?:;\n]/.test(english)) {
    const items = english.split(/, | and /);
    const join = exact(table.words, 'and');
    const found = items.map((item) => lookup(table, item, depth + 1));
    if (join !== undefined && items.length >= 2 && found.every((item) => item !== undefined)) {
      const done = found as string[];
      return done.length === 2 ? `${done[0]} ${join} ${done[1]}` : `${done.slice(0, -1).join(', ')} ${join} ${done[done.length - 1]}`;
    }
  }
  // Between sentences.
  const sentences = english.split(/(?<=[.!?])(\s+)(?=[A-Z0-9"“(¿¡])/);
  // Put back together what a title's full stop split apart.
  for (let at = sentences.length - 2; at >= 1; at -= 2) {
    if (ENDS_IN_TITLE.test(sentences[at - 1])) {
      sentences.splice(at - 1, 3, sentences[at - 1] + sentences[at] + sentences[at + 1]);
    }
  }
  if (sentences.length >= 3) {
    let changed = false;
    const out = sentences.map((piece, index) => {
      if (index % 2 === 1 || !piece.trim()) return piece;
      const found = lookup(table, piece, depth + 1);
      if (found === undefined) return piece;
      changed = true;
      return found;
    });
    return changed ? out.join('') : undefined;
  }
  return undefined;
}

function foodName(table: Compiled, english: string): string | undefined {
  const whole = exact(table.foods, english);
  if (whole !== undefined) return whole;
  const trimmed = english.trim();
  if (!trimmed.includes(', ')) return undefined;
  const out: string[] = [];
  for (const part of trimmed.split(', ')) {
    if (!/[A-Za-z]/.test(part)) {
      out.push(part);
      continue;
    }
    const found = table.foods[part] ?? table.words[part];
    if (found === undefined) return undefined;
    out.push(found);
  }
  return english.replace(trimmed, () => out.join(', '));
}

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTH_WORD = '(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const WEEKDAY_WORD = '(Sun(?:day)?|Mon(?:day)?|Tue(?:s|sday)?|Wed(?:nesday)?|Thu(?:r|rs|rsday)?|Fri(?:day)?|Sat(?:urday)?)';
// [weekday] month day | day month, [year], [", 7:45 AM" or " at 7:45 AM"].
const DATE_SHAPE = new RegExp(
  `^(?:${WEEKDAY_WORD},?\\s+)?(?:${MONTH_WORD}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?|(\\d{1,2})\\s+${MONTH_WORD}\\.?)(?:,?\\s+(\\d{4}))?(?:(,\\s+|\\s+at\\s+)(\\d{1,2}(?::\\d{2})?(?:\\s*[AaPp]\\.?\\s?[Mm]\\.?)?))?$`,
);
const MONTH_YEAR_SHAPE = new RegExp(`^${MONTH_WORD}\\s+(\\d{4})$`);
const WEEKDAY_DAY_SHAPE = new RegExp(`^${WEEKDAY_WORD}\\s+(\\d{1,2})$`);
const LONG_MONTH = /^(January|February|March|April|June|July|August|September|October|November|December)$/;

function dateIn(table: Compiled, english: string, depth: number): string | undefined {
  const trimmed = english.trim();
  if (!/\d/.test(trimmed) || trimmed.length > 40) return undefined;
  const words = table.dates;
  const weekday = (name: string) => {
    const at = WEEKDAY_KEYS.indexOf(name.slice(0, 3).toLowerCase());
    return name.length > 4 ? words.weekdaysLong[at] : words.weekdaysShort[at];
  };
  let out: string | undefined;
  const date = DATE_SHAPE.exec(trimmed);
  if (date) {
    const [, day7, monthFirst, dayAfter, dayFirst, monthAfter, year, joint, time] = date;
    const month = monthFirst ?? monthAfter;
    const long = LONG_MONTH.test(month);
    const at = MONTH_KEYS.indexOf(month.slice(0, 3).toLowerCase());
    out = `${dayAfter ?? dayFirst} ${long ? `de ${words.monthsLong[at]}` : words.monthsShort[at]}`;
    if (year) out += long ? ` de ${year}` : ` ${year}`;
    if (day7) out = `${weekday(day7)} ${out}`;
    if (time) {
      const clock = lookup(table, time, depth + 1) ?? time;
      out += joint.trim() === 'at' ? ` ${/^1(?::|\s|$)/.test(time) ? 'a la' : 'a las'} ${clock}` : `, ${clock}`;
    }
  } else {
    const monthYear = MONTH_YEAR_SHAPE.exec(trimmed);
    const weekdayDay = WEEKDAY_DAY_SHAPE.exec(trimmed);
    if (monthYear) {
      const at = MONTH_KEYS.indexOf(monthYear[1].slice(0, 3).toLowerCase());
      out = LONG_MONTH.test(monthYear[1]) ? `${words.monthsLong[at]} de ${monthYear[2]}` : `${words.monthsShort[at]} ${monthYear[2]}`;
    } else if (weekdayDay) {
      out = `${weekday(weekdayDay[1])} ${weekdayDay[2]}`;
    }
  }
  if (out === undefined) return undefined;
  // A date standing on its own starts with a capital, as a label does.
  if (depth === 0) out = out.charAt(0).toUpperCase() + out.slice(1);
  return english.replace(trimmed, () => out);
}

function lookup(table: Compiled, english: string, depth: number): string | undefined {
  if (!english || !/[A-Za-z]/.test(english)) return undefined;
  const found = exact(table.words, english) ?? table.reading[readingKey(english)] ?? foodName(table, english) ?? dateIn(table, english, depth);
  if (found !== undefined) return found;
  if (depth > 4) return undefined;
  // A label the table holds whole, with a count after it, before any pattern
  // gets the chance to split it: "This Morning (1)" read through "This
  // {here}" came out "Este Mañana (1)".
  const counted = COUNTED.exec(english);
  if (counted && counted[1].trim()) {
    const whole = exact(table.words, counted[1]);
    if (whole !== undefined) return whole + counted[2];
  }
  return byPattern(table, english, depth) ?? byPieces(table, english, depth);
}

// Words that reached the screen with nothing in the table, handed to
// lib/untranslatedLog.ts while Developer Tools has Tell Claude on, so a
// walk through the app in Spanish lists exactly what is still English.
// A listener rather than an import, so this file stays free of the file
// and screen code and the test scripts can still load it on their own.
let missListener: ((english: string) => void) | null = null;

export function setMissListener(listener: ((english: string) => void) | null): void {
  missListener = listener;
}

/** The words in `language`, or the English itself when the table has none. */
export function translateIn(language: AppLanguage, english: string): string {
  const table = compile(language);
  if (!table || typeof english !== 'string') return english;
  const remembered = table.memo.get(english);
  if (remembered !== undefined) return remembered;
  const looked = lookup(table, english, 0);
  if (looked === undefined && missListener) missListener(english);
  const found = looked ?? english;
  if (table.memo.size >= MEMO_LIMIT) table.memo.clear();
  table.memo.set(english, found);
  return found;
}

// Search Reading also searches the words on screen, so a search typed in
// Spanish finds the Spanish (lib/digest/searchLanguage.ts). Only whole
// pieces are handed over, the words table and then the reading table,
// since the search reads every entry once and the memo above is kept for
// what is drawn.
setReadingTranslator({
  language: () => getLanguage(),
  translate: (english) => {
    const table = compile(getLanguage());
    if (!table) return undefined;
    return exact(table.words, english) ?? table.reading[readingKey(english)];
  },
});

/** Whether `language` has these words, for the coverage script and tests. */
export function hasTranslation(language: AppLanguage, english: string): boolean {
  const table = compile(language);
  return !table || lookup(table, english, 0) !== undefined;
}

/**
 * The words in the app's language, with {name} filled from `values`.
 * Call it at the moment the words are shown, never once at module load,
 * or the words stay in whichever language was on when the file was read.
 */
export function t(english: string, values?: Readonly<Record<string, string | number>>): string {
  const words = translateIn(getLanguage(), english);
  if (!values) return words;
  return oneStop(
    words.replace(/\{(\w+)\}/g, (whole, name: string) =>
      Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : whole,
    ),
  );
}

/** A value of the app's own (a unit, a label from a list) in the app's language. */
export function tl(english: string | null | undefined): string {
  return english ? translateIn(getLanguage(), english) : (english ?? '');
}

type WithChildren = ReactElement<{ children?: ReactNode }>;

function wordsOf(element: WithChildren): string | null {
  const inner = element.props?.children;
  if (typeof inner === 'string') return inner;
  if (typeof inner === 'number') return String(inner);
  if (Array.isArray(inner) && inner.length > 0 && inner.every((c) => typeof c === 'string' || typeof c === 'number')) {
    return inner.join('');
  }
  return null;
}

/** "Tap <0>Save</0> to keep it." rebuilt into children, or null. */
function composite(children: unknown[], language: AppLanguage): unknown[] | null {
  let key = '';
  const elements: WithChildren[] = [];
  for (const child of children) {
    if (child === null || child === undefined || typeof child === 'boolean') continue;
    if (typeof child === 'string' || typeof child === 'number') {
      key += String(child);
    } else if (isValidElement(child)) {
      const index = elements.length;
      elements.push(child as WithChildren);
      const words = wordsOf(child as WithChildren);
      key += words === null ? `<${index}/>` : `<${index}>${words}</${index}>`;
    } else {
      return null;
    }
  }
  if (!/[A-Za-z]/.test(key.replace(/<\/?\d+\/?>/g, ''))) return null;
  // A table entry written around a value that changes, such as a tab's name
  // in its colour, marks the inner Text <n/>; the inner Text then translates
  // its own words when it is drawn.
  const bare = key.replace(/<(\d+)>[\s\S]*?<\/\1>/g, '<$1/>');
  const found = translateIn(language, bare !== key && !hasTranslation(language, key) && hasTranslation(language, bare) ? bare : key);
  if (found === key || found === bare) return null;
  const out: unknown[] = [];
  const tag = /<(\d+)\/>|<(\d+)>([\s\S]*?)<\/\2>/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let n = 0;
  while ((match = tag.exec(found)) !== null) {
    if (match.index > last) out.push(found.slice(last, match.index));
    const index = Number(match[1] ?? match[2]);
    const element = elements[index];
    if (element) {
      out.push(
        match[1] !== undefined
          ? cloneElement(element, { key: `t${n}` })
          : cloneElement(element, { key: `t${n}` }, match[3]),
      );
    }
    n += 1;
    last = tag.lastIndex;
  }
  if (last < found.length) out.push(found.slice(last));
  return out;
}

/**
 * A Text's children in `language`. A plain string, or children that are all
 * strings and numbers (JSX splits `Save{' '}Now` that way), is looked up
 * whole; children with a Text inside are looked up as one sentence with the
 * inner Text marked <0>...</0>; failing both, each string piece is looked up
 * on its own and anything else is left as it is.
 */
export function translateChildren<T>(children: T, language: AppLanguage): T {
  if (language === 'en') return children;
  if (typeof children === 'string') return translateIn(language, children) as T;
  if (!Array.isArray(children)) return children;
  if (children.every((child) => typeof child === 'string' || typeof child === 'number')) {
    const whole = children.join('');
    const found = translateIn(language, whole);
    if (found !== whole) return found as T;
  } else {
    const rebuilt = composite(children, language);
    if (rebuilt) return rebuilt as T;
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
