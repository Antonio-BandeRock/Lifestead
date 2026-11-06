// Reading and writing the Languages lens (2026-11-05). Every decision is in the pure
// lib/languageBasics.ts; this keeps what it reads.
//
// A set of basics has no stored cards: they come from the app, so a card a later
// version drops is one with answers and no card, which simply stops being offered,
// and bringing it back brings its history with it.
//
// Answers go in learn_reviews with kind 'course', under the Card ID, as they did when
// this began as part of Learn. Settings stay in learn_course_state: opened_units holds
// the units turned on for Home, all off to begin with. learn_courses is no longer
// written or read, and stays because the database only grows.

import { getDatabase } from './db';
import { DEFAULT_DAILY_NEW, type LanguageOutline } from './languageBasics';
import { addLearnReview } from './learnDb';
import type { CourseCard, CourseDeck } from './learnCourseFile';
import type { CourseDirection } from './learnCourseCard';
import { bundledCourse, bundledCourses } from './learnCoursesBundled';
import { readLearnGrade, type LearnGrade, type LearnReview } from './learnSchedule';

export type CourseSettings = {
  /** A column from the earlier version, carried unchanged so a save never alters it. */
  active: boolean;
  direction: CourseDirection;
  dailyNewLimit: number;
  /** The units turned on for Home. */
  openedUnits: number[];
  typeAnswer: boolean;
};

const DEFAULT_SETTINGS: CourseSettings = { active: false, direction: 'targetFirst', dailyNewLimit: DEFAULT_DAILY_NEW, openedUnits: [], typeAnswer: false };

export type CourseEntry = { deck: CourseDeck; seen: number; settings: CourseSettings; loadOutline: () => LanguageOutline };

export type OpenedCourse = { deck: CourseDeck; cards: CourseCard[]; outline: LanguageOutline };

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

/** Every set in this build, without reading a single card. */
export async function listCourses(): Promise<CourseEntry[]> {
  const db = await getDatabase();
  const [states, seenRows] = await Promise.all([
    db.getAllAsync<StateRow>('SELECT id, active, direction, daily_new_limit, opened_units, type_answer FROM learn_course_state'),
    db.getAllAsync<{ id: string; seen: number }>("SELECT deck_id AS id, COUNT(DISTINCT card_id) AS seen FROM learn_reviews WHERE kind = 'course' GROUP BY deck_id"),
  ]);
  const stateById = new Map(states.map((row) => [row.id, row]));
  const seenById = new Map(seenRows.map((row) => [row.id, row.seen]));
  return bundledCourses().map((course) => ({
    deck: course.deck,
    seen: seenById.get(course.deck.id) ?? 0,
    settings: settingsOf(stateById.get(course.deck.id)),
    loadOutline: course.loadOutline,
  }));
}

/** A set with its cards and outline, read only when it opens. Null when this build does not carry it. */
export function loadCourse(id: string): OpenedCourse | null {
  const bundled = bundledCourse(id);
  if (!bundled) return null;
  return { deck: bundled.deck, cards: bundled.load().cards, outline: bundled.loadOutline() };
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
