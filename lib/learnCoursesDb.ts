// Reading and writing Learn's courses (2026-11-05). Every decision is in the pure
// lib/learnCourse*.ts modules; this keeps what they read.
//
// A bundled course has no stored cards: they come from the app, so a card a later
// version drops is one with answers and no card, which simply stops being offered,
// and bringing it back brings its history with it. An imported course cannot be
// fetched again, so its cards and the ones a later import dropped are stored in
// learn_courses and travel in sync and backup. An imported course with the same
// Deck ID as a bundled one stands in front of it until it is removed.
//
// Answers go in learn_reviews with kind 'course', under the Card ID, so nothing
// here can touch them: importing, removing and restoring a course all leave them.

import { getDatabase } from './db';
import { addLearnReview } from './learnDb';
import type { Course, CourseCard, CourseDeck } from './learnCourseFile';
import { courseFingerprint } from './learnCourseFile';
import type { CourseDirection } from './learnCourseCard';
import { mergeCourseCards, type CourseMerge } from './learnCourseMerge';
import { DEFAULT_DAILY_NEW } from './learnCoursePath';
import { bundledCourse, bundledCourses } from './learnCoursesBundled';
import { readLearnGrade, type LearnGrade, type LearnReview } from './learnSchedule';

export type CourseSettings = {
  /** Being studied, which keeps it with the courses listed first whatever language the app is in. */
  active: boolean;
  direction: CourseDirection;
  dailyNewLimit: number;
  openedUnits: number[];
  typeAnswer: boolean;
};

const DEFAULT_SETTINGS: CourseSettings = { active: false, direction: 'targetFirst', dailyNewLimit: DEFAULT_DAILY_NEW, openedUnits: [], typeAnswer: false };

export type CourseEntry = { deck: CourseDeck; imported: boolean; hasBundled: boolean; seen: number; settings: CourseSettings };

export type OpenedCourse = { deck: CourseDeck; cards: CourseCard[]; fingerprint: string; imported: boolean; hasBundled: boolean };

type StateRow = { id: string; active: number; direction: string; daily_new_limit: number; opened_units: string; type_answer: number };

function parseJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function settingsOf(row: StateRow | null | undefined): CourseSettings {
  if (!row) return { ...DEFAULT_SETTINGS };
  const opened = parseJson<unknown>(row.opened_units, []);
  return {
    active: row.active === 1,
    direction: row.direction === 'nativeFirst' ? 'nativeFirst' : 'targetFirst',
    dailyNewLimit: row.daily_new_limit > 0 ? row.daily_new_limit : DEFAULT_DAILY_NEW,
    openedUnits: Array.isArray(opened) ? opened.filter((unit): unit is number => typeof unit === 'number') : [],
    typeAnswer: row.type_answer === 1,
  };
}

/** Every course, bundled and imported, without reading a single card. */
export async function listCourses(): Promise<CourseEntry[]> {
  const db = await getDatabase();
  const [imported, states, seenRows] = await Promise.all([
    db.getAllAsync<{ id: string; deck_json: string }>('SELECT id, deck_json FROM learn_courses WHERE retired_at IS NULL'),
    db.getAllAsync<StateRow>('SELECT id, active, direction, daily_new_limit, opened_units, type_answer FROM learn_course_state'),
    db.getAllAsync<{ id: string; seen: number }>("SELECT deck_id AS id, COUNT(DISTINCT card_id) AS seen FROM learn_reviews WHERE kind = 'course' GROUP BY deck_id"),
  ]);
  const stateById = new Map(states.map((row) => [row.id, row]));
  const seenById = new Map(seenRows.map((row) => [row.id, row.seen]));
  const entries = new Map<string, CourseEntry>();
  const entry = (deck: CourseDeck, isImported: boolean, hasBundled: boolean): CourseEntry => ({
    deck,
    imported: isImported,
    hasBundled,
    seen: seenById.get(deck.id) ?? 0,
    settings: settingsOf(stateById.get(deck.id)),
  });
  for (const course of bundledCourses()) entries.set(course.deck.id, entry(course.deck, false, true));
  for (const row of imported) {
    const deck = parseJson<CourseDeck | null>(row.deck_json, null);
    if (deck) entries.set(row.id, entry({ ...deck, id: row.id }, true, entries.has(row.id)));
  }
  return [...entries.values()];
}

/** A course with its cards, read only when it opens. Null when it is no longer here. */
export async function loadCourse(id: string): Promise<OpenedCourse | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ deck_json: string; cards_json: string; fingerprint: string }>(
    'SELECT deck_json, cards_json, fingerprint FROM learn_courses WHERE id = ? AND retired_at IS NULL',
    id,
  );
  const bundled = bundledCourse(id);
  if (row) {
    const deck = parseJson<CourseDeck | null>(row.deck_json, null);
    const cards = parseJson<CourseCard[]>(row.cards_json, []);
    if (deck) return { deck: { ...deck, id }, cards, fingerprint: row.fingerprint, imported: true, hasBundled: !!bundled };
  }
  if (!bundled) return null;
  return { deck: bundled.deck, cards: bundled.load().cards, fingerprint: bundled.fingerprint, imported: false, hasBundled: true };
}

export async function getCourseSettings(id: string): Promise<CourseSettings> {
  const db = await getDatabase();
  return settingsOf(
    await db.getFirstAsync<StateRow>('SELECT id, active, direction, daily_new_limit, opened_units, type_answer FROM learn_course_state WHERE id = ?', id),
  );
}

export async function saveCourseSettings(id: string, patch: Partial<CourseSettings>): Promise<CourseSettings> {
  const db = await getDatabase();
  const next = { ...(await getCourseSettings(id)), ...patch };
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO learn_course_state (id, active, direction, daily_new_limit, opened_units, type_answer, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET active = excluded.active, direction = excluded.direction, daily_new_limit = excluded.daily_new_limit,
       opened_units = excluded.opened_units, type_answer = excluded.type_answer, updated_at = excluded.updated_at`,
    id,
    next.active ? 1 : 0,
    next.direction,
    next.dailyNewLimit,
    JSON.stringify(next.openedUnits),
    next.typeAnswer ? 1 : 0,
    now,
    now,
  );
  return next;
}

type StoredCourse = { cards: CourseCard[]; archived: CourseCard[]; fingerprint: string; retired: boolean } | null;

async function storedCourse(id: string): Promise<StoredCourse> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ cards_json: string; archived_json: string; fingerprint: string; retired_at: string | null }>(
    'SELECT cards_json, archived_json, fingerprint, retired_at FROM learn_courses WHERE id = ?',
    id,
  );
  if (!row) return null;
  return { cards: parseJson(row.cards_json, []), archived: parseJson(row.archived_json, []), fingerprint: row.fingerprint, retired: !!row.retired_at };
}

export type CourseImportPreview = { merge: CourseMerge; isNew: boolean; nothingChanged: boolean };

/** What importing this file would do, with nothing written, so it can be said before it happens. */
export async function previewCourseImport(course: Course): Promise<CourseImportPreview> {
  const stored = await storedCourse(course.deck.id);
  const bundled = bundledCourse(course.deck.id);
  const fingerprint = courseFingerprint(course);
  const current = stored ? (stored.retired ? [] : stored.cards) : bundled ? bundled.load().cards : [];
  const archived = stored ? (stored.retired ? [...stored.archived, ...stored.cards] : stored.archived) : [];
  const merge = mergeCourseCards(current, archived, course.cards);
  const live = stored ? !stored.retired && stored.fingerprint === fingerprint : !!bundled && bundled.fingerprint === fingerprint;
  return { merge, isNew: !stored && !bundled, nothingChanged: live };
}

/** Keeps the file. Answers are never touched, so everything studied under a Card ID stays with it. */
export async function keepCourseImport(course: Course): Promise<CourseMerge> {
  const { merge } = await previewCourseImport(course);
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO learn_courses (id, source, deck_json, cards_json, archived_json, fingerprint, retired_at, created_at, updated_at)
     VALUES (?, 'import', ?, ?, ?, ?, NULL, ?, ?)
     ON CONFLICT(id) DO UPDATE SET deck_json = excluded.deck_json, cards_json = excluded.cards_json, archived_json = excluded.archived_json,
       fingerprint = excluded.fingerprint, retired_at = NULL, updated_at = excluded.updated_at`,
    course.deck.id,
    JSON.stringify(course.deck),
    JSON.stringify(merge.cards),
    JSON.stringify(merge.archived),
    courseFingerprint(course),
    now,
    now,
  );
  return merge;
}

/** Takes an imported course off the list. With answers kept under it the row is retired, so importing it again finds what was archived; with none it goes. */
export async function removeImportedCourse(id: string): Promise<void> {
  const db = await getDatabase();
  const answered = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM learn_reviews WHERE deck_id = ? AND kind = 'course'", id);
  if ((answered?.n ?? 0) > 0) {
    const now = new Date().toISOString();
    await db.runAsync('UPDATE learn_courses SET retired_at = ?, updated_at = ? WHERE id = ?', now, now, id);
  } else {
    await db.runAsync('DELETE FROM learn_courses WHERE id = ?', id);
  }
}

/** Every answer kept in one course, in the order given, which is what its schedule is replayed from. */
export async function listCourseReviews(id: string): Promise<LearnReview[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ cardId: string; day: string; grade: string; answeredAt: string }>(
    "SELECT card_id AS cardId, day, grade, answered_at AS answeredAt FROM learn_reviews WHERE deck_id = ? AND kind = 'course' ORDER BY answered_at",
    id,
  );
  return rows.map((row) => ({ ...row, grade: readLearnGrade(row.grade) }));
}

export async function addCourseAnswer(courseId: string, cardId: string, grade: LearnGrade, matched: boolean | null): Promise<LearnReview> {
  return addLearnReview(courseId, cardId, grade, 'course', matched);
}

const VOICE_TOLD_KEY = 'learn_voice_told';

/** Whether this device has already said a language has no voice. Kept per device, since a voice is installed on a device. */
export async function voiceAlreadyTold(code: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', VOICE_TOLD_KEY);
  return parseJson<string[]>(row?.value, []).includes(code);
}

export async function markVoiceTold(code: string): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', VOICE_TOLD_KEY);
  const told = new Set(parseJson<string[]>(row?.value, []));
  told.add(code);
  await db.runAsync(
    'INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    VOICE_TOLD_KEY,
    JSON.stringify([...told]),
    new Date().toISOString(),
  );
}
