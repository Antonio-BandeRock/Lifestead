// The bladder diary's reads and writes (Q23, 1.0.91.9): bladder_diaries
// and bladder_entries (lib/db.ts). Signals > Bladder writes here; Home's
// Bladder Diary band, the For Your Doctor report and Signals read it.
// What the entries add up to is worked out in lib/bladderDiary.ts.
import { getDatabase } from './db';
import { readOrClosed } from './vaultReads';
import { volumeToMl } from './unitConversion';
import {
  DIARY_DAYS,
  addDays,
  drinkMl,
  isBladderKind,
  isLeakSize,
  lastMorning,
  type BladderDiary,
  type BladderEntry,
  type BladderKind,
  type DiaryDrink,
  type LeakSize,
} from './bladderDiary';

const DIARY_COLUMNS = 'id, started_on AS startedOn, days, ended_on AS endedOn';
const ENTRY_COLUMNS = 'id, diary_id AS diaryId, at, kind, volume_ml AS volumeMl, urgency, leak, note';

type EntryRow = Omit<BladderEntry, 'kind' | 'leak'> & { kind: string; leak: string | null };

function toEntry(row: EntryRow): BladderEntry | null {
  if (!isBladderKind(row.kind)) return null;
  return { ...row, kind: row.kind, leak: isLeakSize(row.leak) ? row.leak : null };
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Every diary, newest first. */
export async function listBladderDiaries(): Promise<BladderDiary[]> {
  const db = await getDatabase();
  return readOrClosed(() => db.getAllAsync<BladderDiary>(
    `SELECT ${DIARY_COLUMNS} FROM bladder_diaries ORDER BY started_on DESC, created_at DESC LIMIT -1`,
  ), []);
}

/** The newest diary, finished or not, or null when none was ever started. */
export async function getLatestBladderDiary(): Promise<BladderDiary | null> {
  const db = await getDatabase();
  return readOrClosed(async () => (await db.getFirstAsync<BladderDiary>(
    `SELECT ${DIARY_COLUMNS} FROM bladder_diaries ORDER BY started_on DESC, created_at DESC LIMIT 1`,
  )) ?? null, null);
}

/** Diaries that overlap a stretch of dates, for the report. */
export async function listBladderDiariesBetween(start: string, end: string): Promise<BladderDiary[]> {
  const diaries = await listBladderDiaries();
  return diaries.filter((d) => d.startedOn <= end && lastMorning(d) >= start).reverse();
}

export async function startBladderDiary(startedOn: string, days = DIARY_DAYS): Promise<string> {
  const db = await getDatabase();
  const id = newId('bladder_diary');
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO bladder_diaries (id, started_on, days, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    id, startedOn, days, now, now,
  );
  return id;
}

/** Finishes a diary, or stops it before its days are up. Its entries stay. */
export async function endBladderDiary(id: string, endedOn: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE bladder_diaries SET ended_on = ?, updated_at = ? WHERE id = ?', endedOn, new Date().toISOString(), id);
}

/** Removes a diary and every entry in it, after the person has confirmed. */
export async function deleteBladderDiary(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM bladder_entries WHERE diary_id = ?', id);
  await db.runAsync('DELETE FROM bladder_diaries WHERE id = ?', id);
}

export async function listBladderEntries(diaryId: string): Promise<BladderEntry[]> {
  const db = await getDatabase();
  const rows = await readOrClosed(() => db.getAllAsync<EntryRow>(
    `SELECT ${ENTRY_COLUMNS} FROM bladder_entries WHERE diary_id = ? ORDER BY at ASC, created_at ASC LIMIT -1`,
    diaryId,
  ), []);
  return rows.map(toEntry).filter((e): e is BladderEntry => e !== null);
}

export type BladderEntryInput = {
  at: string;
  kind: BladderKind;
  volumeMl: number | null;
  urgency: number | null;
  leak: LeakSize | null;
  note: string | null;
};

function cleanNote(note: string | null): string | null {
  return note && note.trim() ? note.trim() : null;
}

export async function addBladderEntry(diaryId: string, input: BladderEntryInput): Promise<string> {
  const db = await getDatabase();
  const id = newId('bladder');
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO bladder_entries (id, diary_id, at, kind, volume_ml, urgency, leak, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, diaryId, input.at, input.kind, input.volumeMl, input.urgency, input.leak, cleanNote(input.note), now, now,
  );
  return id;
}

export async function updateBladderEntry(id: string, input: BladderEntryInput): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE bladder_entries SET at = ?, kind = ?, volume_ml = ?, urgency = ?, leak = ?, note = ?, updated_at = ? WHERE id = ?',
    input.at, input.kind, input.volumeMl, input.urgency, input.leak, cleanNote(input.note), new Date().toISOString(), id,
  );
}

export async function deleteBladderEntry(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM bladder_entries WHERE id = ?', id);
}

/** The drinks logged across a diary's days and its last morning, each in
 *  mL when every part of it was logged by volume. A drink logged by weight
 *  or with no amount still counts as a drink, with no amount. */
export async function listDiaryDrinks(diary: BladderDiary): Promise<DiaryDrink[]> {
  const db = await getDatabase();
  const start = `${diary.startedOn}T00:00`;
  const end = `${addDays(lastMorning(diary), 1)}T00:00`;
  const rows = await readOrClosed(() => db.getAllAsync<{
    id: string; name: string; at: string;
    servingSize: number | null; servingUnit: string | null; yourSharePercent: number | null; dishServings: number | null;
  }>(
    `SELECT m.id, m.name, m.eaten_at AS at,
            mi.serving_size AS servingSize, mi.serving_unit AS servingUnit,
            mi.your_share_percent AS yourSharePercent, mi.dish_servings AS dishServings
       FROM meals m LEFT JOIN meal_items mi ON mi.meal_id = m.id
      WHERE m.meal_type = 'beverage' AND m.eaten_at >= ? AND m.eaten_at < ?
      ORDER BY m.eaten_at ASC LIMIT -1`,
    start, end,
  ), []);
  const byMeal = new Map<string, { name: string; at: string; items: typeof rows }>();
  for (const row of rows) {
    const meal = byMeal.get(row.id) ?? { name: row.name, at: row.at.slice(0, 16), items: [] };
    if (row.servingSize != null || row.servingUnit != null) meal.items.push(row);
    byMeal.set(row.id, meal);
  }
  return [...byMeal.values()].map((meal) => ({
    at: meal.at,
    name: meal.name,
    ml: drinkMl(meal.items, volumeToMl),
  }));
}
