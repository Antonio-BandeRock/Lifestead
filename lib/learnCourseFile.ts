// The course file, the one format behind every course in Learn (2026-11-05).
// A course is a Deck sheet and a Cards sheet in a workbook, or the same thing
// as JSON (assets/courses/course.schema.json). Nothing in here knows about any
// one language or subject: the Deck sheet says what the course teaches and
// from which language, in its codes.
//
// Pure, so scripts/build_course_files.js and the in-app import read a file the
// same way and scripts/test_learn_courses.js can check it without a phone.

import { looksLikeZip, readXlsx, type XlsxSheets } from './xlsxRead';

export const COURSE_SCHEMA_VERSION = 1;
export const COURSE_CARD_LIMIT = 20000;

/** The kinds of card a course names today. A kind not listed still draws, as a plain card. */
export const COURSE_CARD_TYPES = ['Rule', 'Word', 'Phrase', 'Set', 'Contrast pair', 'Verb'] as const;
export const COURSE_CARD_STATUSES = ['Core', 'Recognize'] as const;
export type CourseCardStatus = (typeof COURSE_CARD_STATUSES)[number];

export type CourseDeck = {
  id: string;
  name: string;
  subject: string;
  courseType: string;
  targetLanguage: string;
  targetCode: string;
  nativeLanguage: string;
  nativeCode: string;
  level: string;
  voice: string;
  description: string;
  cardCount: number;
  unitCount: number;
};

export type CourseCard = {
  id: string;
  seq: number;
  unit: number;
  unitName: string;
  group: string;
  type: string;
  status: CourseCardStatus;
  source: string;
  target: string;
  native: string;
  exampleTarget: string;
  exampleNative: string;
  remember: string;
};

export type Course = { schema: number; deck: CourseDeck; cards: CourseCard[] };

/** A course that ships with the app. Its Deck sheet is always at hand, and its cards load only when it opens. */
export type BundledCourse = { deck: CourseDeck; fingerprint: string; load: () => Course };

export type CourseRead = {
  /** Null when a problem stopped the file being read. */
  course: Course | null;
  /** What has to change before this file can be a course. */
  problems: string[];
  /** Worth saying, and no reason to refuse the file. */
  notes: string[];
};

type Translate = (text: string, values?: Record<string, string | number>) => string;
const plain: Translate = (text, values) => (values ? text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? '')) : text);

/** A row's problems are listed up to this many, then counted. */
const PROBLEMS_NAMED = 8;

const DECK_FIELDS: Record<string, keyof CourseDeck> = {
  'deck id': 'id',
  'deck name': 'name',
  subject: 'subject',
  'course type': 'courseType',
  'target language': 'targetLanguage',
  'target language code': 'targetCode',
  'native language': 'nativeLanguage',
  'native language code': 'nativeCode',
  level: 'level',
  'text-to-speech voice': 'voice',
  description: 'description',
  'card count': 'cardCount',
  'unit count': 'unitCount',
};

const CARD_COLUMNS: Record<string, keyof CourseCard> = {
  'target (front)': 'target',
  'native (back)': 'native',
  'example (target)': 'exampleTarget',
  'example (native)': 'exampleNative',
  remember: 'remember',
  group: 'group',
  'card type': 'type',
  'unit #': 'unit',
  unit: 'unitName',
  seq: 'seq',
  source: 'source',
  status: 'status',
  'card id': 'id',
};

function wholeNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isInteger(n) ? n : null;
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : typeof value === 'number' ? String(value) : '';
}

export function isLanguageCourse(deck: Pick<CourseDeck, 'courseType'>): boolean {
  return deck.courseType.toLowerCase().includes('language');
}

/** A language code in the shape BCP 47 uses: es, es-MX, zh-Hant-TW. */
export function isLanguageCode(code: string): boolean {
  return /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(code);
}

/**
 * Checks a course and settles its fields. Used for a workbook and for JSON
 * alike, so a file cannot get past one door and not the other. Cards come back
 * in Seq order.
 */
export function checkCourse(input: unknown, t: Translate = plain): CourseRead {
  const problems: string[] = [];
  const notes: string[] = [];
  const raw = input && typeof input === 'object' ? (input as { deck?: unknown; cards?: unknown }) : {};
  const rawDeck = raw.deck && typeof raw.deck === 'object' ? (raw.deck as Record<string, unknown>) : null;
  if (!rawDeck || !Array.isArray(raw.cards)) {
    return { course: null, problems: [t('This file is not a course. It needs a Deck sheet and a Cards sheet.')], notes };
  }

  const deck: CourseDeck = {
    id: cleanText(rawDeck.id),
    name: cleanText(rawDeck.name),
    subject: cleanText(rawDeck.subject),
    courseType: cleanText(rawDeck.courseType),
    targetLanguage: cleanText(rawDeck.targetLanguage),
    targetCode: cleanText(rawDeck.targetCode),
    nativeLanguage: cleanText(rawDeck.nativeLanguage),
    nativeCode: cleanText(rawDeck.nativeCode),
    level: cleanText(rawDeck.level),
    voice: cleanText(rawDeck.voice),
    description: cleanText(rawDeck.description),
    cardCount: 0,
    unitCount: 0,
  };
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(deck.id)) problems.push(t('The Deck sheet needs a Deck ID made of letters, numbers and hyphens.'));
  if (!deck.name) problems.push(t('The Deck sheet needs a Deck name.'));
  if (!deck.subject) problems.push(t('The Deck sheet needs a Subject.'));
  if (isLanguageCourse(deck)) {
    if (!isLanguageCode(deck.targetCode)) problems.push(t('A language course needs a Target language code, like es-MX.'));
    if (!isLanguageCode(deck.nativeCode)) problems.push(t('A language course needs a Native language code, like en-US.'));
  }

  const rawCards = raw.cards as unknown[];
  if (rawCards.length === 0) problems.push(t('The Cards sheet has no cards.'));
  if (rawCards.length > COURSE_CARD_LIMIT) problems.push(t('This course has {n} cards, and one course can hold {limit}.', { n: rawCards.length, limit: COURSE_CARD_LIMIT }));

  const rowProblems: string[] = [];
  const cards: CourseCard[] = [];
  const ids = new Set<string>();
  const seqs = new Set<number>();
  const unitNames = new Map<number, string>();
  rawCards.forEach((rawCard, index) => {
    const row = index + 2;
    const c = rawCard && typeof rawCard === 'object' ? (rawCard as Record<string, unknown>) : {};
    const id = cleanText(c.id);
    const seq = wholeNumber(c.seq);
    const unit = wholeNumber(c.unit);
    const status = cleanText(c.status);
    const target = cleanText(c.target);
    const native = cleanText(c.native);
    if (!id) rowProblems.push(t('Row {row} has no Card ID.', { row }));
    else if (ids.has(id)) rowProblems.push(t('Row {row} repeats the Card ID {id}.', { row, id }));
    else if (deck.id && !id.startsWith(`${deck.id}-`)) rowProblems.push(t('Row {row}: the Card ID {id} has to start with {prefix}.', { row, id, prefix: `${deck.id}-` }));
    if (seq === null || seq < 1) rowProblems.push(t('Row {row} needs a whole number in Seq.', { row }));
    else if (seqs.has(seq)) rowProblems.push(t('Row {row} repeats Seq {seq}.', { row, seq }));
    if (unit === null || unit < 1) rowProblems.push(t('Row {row} needs a whole number in Unit #.', { row }));
    if (!(COURSE_CARD_STATUSES as readonly string[]).includes(status)) rowProblems.push(t('Row {row}: Status has to be Core or Recognize.', { row }));
    if (!target) rowProblems.push(t('Row {row} has nothing on the front.', { row }));
    if (!native) rowProblems.push(t('Row {row} has nothing on the back.', { row }));
    const unitName = cleanText(c.unitName);
    if (unit !== null) {
      const named = unitNames.get(unit);
      if (named === undefined) unitNames.set(unit, unitName);
      else if (named !== unitName) rowProblems.push(t('Row {row}: unit {unit} goes by two names.', { row, unit }));
    }
    if (id) ids.add(id);
    if (seq !== null) seqs.add(seq);
    cards.push({
      id,
      seq: seq ?? 0,
      unit: unit ?? 0,
      unitName,
      group: cleanText(c.group),
      type: cleanText(c.type),
      status: status as CourseCardStatus,
      source: cleanText(c.source),
      target,
      native,
      exampleTarget: cleanText(c.exampleTarget),
      exampleNative: cleanText(c.exampleNative),
      remember: cleanText(c.remember),
    });
  });
  problems.push(...rowProblems.slice(0, PROBLEMS_NAMED));
  if (rowProblems.length > PROBLEMS_NAMED) problems.push(t('And {n} more like these.', { n: rowProblems.length - PROBLEMS_NAMED }));

  cards.sort((a, b) => a.seq - b.seq);
  if (rowProblems.length === 0 && cards.some((card, index) => card.seq !== index + 1)) {
    const gap = cards.findIndex((card, index) => card.seq !== index + 1) + 1;
    problems.push(t('Seq has to run from 1 with no gaps, and {seq} is missing.', { seq: gap }));
  }
  if (problems.length > 0) return { course: null, problems, notes };

  deck.cardCount = cards.length;
  deck.unitCount = unitNames.size;
  const saidCards = wholeNumber(rawDeck.cardCount);
  const saidUnits = wholeNumber(rawDeck.unitCount);
  if (saidCards !== null && saidCards !== cards.length) notes.push(t('The Deck sheet says {said} cards, and the Cards sheet holds {n}.', { said: saidCards, n: cards.length }));
  if (saidUnits !== null && saidUnits !== unitNames.size) notes.push(t('The Deck sheet says {said} units, and the Cards sheet holds {n}.', { said: saidUnits, n: unitNames.size }));
  return { course: { schema: COURSE_SCHEMA_VERSION, deck, cards }, problems, notes };
}

/** A workbook's Deck and Cards sheets, in the same shape as the JSON. The Guide sheet is never read. */
export function courseShapeFromSheets(sheets: XlsxSheets): unknown {
  const deckRows = sheets.Deck;
  const cardRows = sheets.Cards;
  if (!deckRows || !cardRows) return null;
  const deck: Record<string, string> = {};
  for (const row of deckRows.slice(1)) {
    const field = DECK_FIELDS[(row[0] ?? '').trim().toLowerCase()];
    if (field) deck[field] = row[1] ?? '';
  }
  const header = (cardRows[0] ?? []).map((cell) => CARD_COLUMNS[(cell ?? '').trim().toLowerCase()]);
  const cards = cardRows
    .slice(1)
    .filter((row) => row.some((cell) => (cell ?? '').trim() !== ''))
    .map((row) => {
      const card: Record<string, string> = {};
      header.forEach((field, column) => {
        if (field) card[field] = row[column] ?? '';
      });
      return card;
    });
  return { deck, cards };
}

/** Reads a picked file, a workbook or JSON, by what its bytes are rather than what it is called. */
export function readCourseBytes(bytes: Uint8Array, t: Translate = plain): CourseRead {
  if (looksLikeZip(bytes)) {
    let sheets: XlsxSheets;
    try {
      sheets = readXlsx(bytes);
    } catch {
      return { course: null, problems: [t('This workbook could not be opened.')], notes: [] };
    }
    return checkCourse(courseShapeFromSheets(sheets), t);
  }
  try {
    return checkCourse(JSON.parse(utf8Text(bytes)), t);
  } catch {
    return { course: null, problems: [t('This file is not a course. Open an .xlsx workbook or a .json course file.')], notes: [] };
  }
}

function utf8Text(bytes: Uint8Array): string {
  const start = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  let out = '';
  let i = start;
  while (i < bytes.length) {
    const b = bytes[i++];
    let code = b;
    if (b >= 0xf0) code = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    else if (b >= 0xe0) code = ((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    else if (b >= 0xc0) code = ((b & 31) << 6) | (bytes[i++] & 63);
    out += String.fromCodePoint(code);
  }
  return out;
}

/** A short mark of a course's content, so a course that has not changed is known not to have. */
export function courseFingerprint(course: Pick<Course, 'deck' | 'cards'>): string {
  const text = JSON.stringify([course.deck, course.cards]);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${text.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}
