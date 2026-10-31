// Reading and writing interests (2026-10-30). What an interest says about
// itself is decided in lib/interests.ts with no database; this carries out
// the changes. See interests and interest_stage_changes in lib/db.ts.

import { getDatabase } from './db';
import {
  cleanInterestText,
  INTEREST_STAGES,
  localDayOf,
  stageChangesBetween,
  type Interest,
  type InterestStage,
  type InterestStageChange,
} from './interests';
import { readPracticeDays, writePracticeDays } from './interestSessions';

type InterestRow = {
  id: string;
  name: string;
  kind: string | null;
  about: string | null;
  following: number;
  practising: number;
  sharing: number;
  earning: number;
  startedOn: string | null;
  leftOff: string | null;
  leftOffAt: string | null;
  retiredAt: string | null;
  practiceDays: string | null;
  practiceTime: string | null;
  createdAt: string;
};

type ChangeRow = {
  id: string;
  interestId: string;
  stage: string;
  turnedOn: number;
  changedOn: string;
};

const COLUMNS = `id, name, kind, about, following, practising, sharing, earning, started_on AS startedOn,
  left_off AS leftOff, left_off_at AS leftOffAt, retired_at AS retiredAt, practice_days AS practiceDays, practice_time AS practiceTime,
  created_at AS createdAt`;

function fromRow(row: InterestRow): Interest {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    about: row.about,
    stages: {
      following: row.following === 1,
      practising: row.practising === 1,
      sharing: row.sharing === 1,
      earning: row.earning === 1,
    },
    startedOn: row.startedOn,
    leftOff: row.leftOff,
    leftOffAt: row.leftOffAt,
    retiredAt: row.retiredAt,
    practiceDays: readPracticeDays(row.practiceDays),
    practiceTime: row.practiceTime,
    createdAt: row.createdAt,
  };
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanOrNull(text: string | null | undefined): string | null {
  const cleaned = text ? cleanInterestText(text) : '';
  return cleaned ? cleaned : null;
}

export async function listInterests(): Promise<Interest[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<InterestRow>(`SELECT ${COLUMNS} FROM interests ORDER BY name COLLATE NOCASE ASC`);
  return rows.map(fromRow);
}

export async function getInterest(id: string): Promise<Interest | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<InterestRow>(`SELECT ${COLUMNS} FROM interests WHERE id = ?`, id);
  return row ? fromRow(row) : null;
}

export async function listInterestStageChanges(interestId?: string): Promise<InterestStageChange[]> {
  const db = await getDatabase();
  const columns = `id, interest_id AS interestId, stage, turned_on AS turnedOn, changed_on AS changedOn`;
  const rows = interestId
    ? await db.getAllAsync<ChangeRow>(
        `SELECT ${columns} FROM interest_stage_changes WHERE interest_id = ? ORDER BY changed_on DESC, created_at DESC`,
        interestId,
      )
    : await db.getAllAsync<ChangeRow>(`SELECT ${columns} FROM interest_stage_changes ORDER BY changed_on DESC, created_at DESC`);
  return rows
    .filter((row) => INTEREST_STAGES.includes(row.stage as InterestStage))
    .map((row) => ({
      id: row.id,
      interestId: row.interestId,
      stage: row.stage as InterestStage,
      turnedOn: row.turnedOn === 1,
      changedOn: row.changedOn,
    }));
}

export type InterestInput = {
  name: string;
  kind: string | null;
  about: string | null;
  stages: Record<InterestStage, boolean>;
  startedOn: string | null;
};

async function writeStageChanges(
  interestId: string,
  before: Record<InterestStage, boolean> | null,
  after: Record<InterestStage, boolean>,
  now: string,
): Promise<void> {
  const db = await getDatabase();
  const day = localDayOf(now);
  for (const change of stageChangesBetween(before, after)) {
    await db.runAsync(
      `INSERT INTO interest_stage_changes (id, interest_id, stage, turned_on, changed_on, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      newId('interest_stage'),
      interestId,
      change.stage,
      change.turnedOn ? 1 : 0,
      day,
      now,
      now,
    );
  }
}

export async function addInterest(input: InterestInput): Promise<string> {
  const db = await getDatabase();
  const id = newId('interest');
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO interests (id, name, kind, about, following, practising, sharing, earning, started_on, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    cleanInterestText(input.name),
    cleanOrNull(input.kind),
    cleanOrNull(input.about),
    input.stages.following ? 1 : 0,
    input.stages.practising ? 1 : 0,
    input.stages.sharing ? 1 : 0,
    input.stages.earning ? 1 : 0,
    input.startedOn,
    now,
    now,
  );
  await writeStageChanges(id, null, input.stages, now);
  return id;
}

export async function updateInterest(id: string, input: InterestInput): Promise<void> {
  const before = await getInterest(id);
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE interests SET name = ?, kind = ?, about = ?, following = ?, practising = ?, sharing = ?, earning = ?,
       started_on = ?, updated_at = ? WHERE id = ?`,
    cleanInterestText(input.name),
    cleanOrNull(input.kind),
    cleanOrNull(input.about),
    input.stages.following ? 1 : 0,
    input.stages.practising ? 1 : 0,
    input.stages.sharing ? 1 : 0,
    input.stages.earning ? 1 : 0,
    input.startedOn,
    now,
    id,
  );
  if (before) await writeStageChanges(id, before.stages, input.stages, now);
}

/** Turns one stage on or off straight from the list. */
export async function setInterestStage(id: string, stage: InterestStage, on: boolean): Promise<void> {
  const before = await getInterest(id);
  if (!before || before.stages[stage] === on) return;
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(`UPDATE interests SET ${stage} = ?, updated_at = ? WHERE id = ?`, on ? 1 : 0, now, id);
  await writeStageChanges(id, before.stages, { ...before.stages, [stage]: on }, now);
}

/** Where it was left off. An empty note clears it. */
export async function setInterestLeftOff(id: string, note: string): Promise<void> {
  const db = await getDatabase();
  const cleaned = cleanOrNull(note);
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE interests SET left_off = ?, left_off_at = ?, updated_at = ? WHERE id = ?',
    cleaned,
    cleaned ? now : null,
    now,
    id,
  );
}

/** Stepping back keeps everything; coming back clears only the moment. */
export async function setInterestRetired(id: string, retired: boolean): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE interests SET retired_at = ?, updated_at = ? WHERE id = ?', retired ? now : null, now, id);
}

/** The practice reminder. No days or no time turns it off. */
export async function setInterestPractice(id: string, days: readonly number[], time: string | null): Promise<void> {
  const db = await getDatabase();
  const stored = writePracticeDays(days);
  await db.runAsync(
    'UPDATE interests SET practice_days = ?, practice_time = ?, updated_at = ? WHERE id = ?',
    stored,
    stored ? time : null,
    new Date().toISOString(),
    id,
  );
}

/** Renames a kind the person named, on every interest that carries it. */
export async function renameInterestKind(from: string, to: string): Promise<void> {
  const cleaned = cleanOrNull(to);
  if (!cleaned || cleaned === from) return;
  const db = await getDatabase();
  await db.runAsync('UPDATE interests SET kind = ?, updated_at = ? WHERE kind = ?', cleaned, new Date().toISOString(), from);
}

/**
 * What else refers to an interest. Deleting is only offered when nothing
 * does, so a project never ends up naming an interest that is gone and a
 * session is never left belonging to nothing.
 */
export async function countInterestReferences(
  id: string,
): Promise<{ projects: number; sessions: number; things: number; library: number; people: number; money: number; countdowns: number }> {
  const db = await getDatabase();
  const projects = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM projects WHERE link_kind = 'interest' AND link_id = ?`,
    id,
  );
  const sessions = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM interest_sessions WHERE interest_id = ? AND running = 0', id);
  const things = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM interest_things WHERE interest_id = ?', id);
  const library = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM interest_library WHERE interest_id = ?', id);
  const people = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM interest_people WHERE interest_id = ?', id);
  const money = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM interest_money WHERE interest_id = ?', id);
  const countdowns = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM countdowns WHERE interest_id = ?', id);
  return {
    money: Number(money?.n ?? 0),
    countdowns: Number(countdowns?.n ?? 0),
    projects: Number(projects?.n ?? 0),
    sessions: Number(sessions?.n ?? 0),
    things: Number(things?.n ?? 0),
    library: Number(library?.n ?? 0),
    people: Number(people?.n ?? 0),
  };
}

/** Removes an interest and its own stage history, and nothing else. */
export async function deleteInterest(id: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM interest_stage_changes WHERE interest_id = ?', id);
    // Only a timer left going can remain, since a finished session blocks removing.
    await db.runAsync('DELETE FROM interest_sessions WHERE interest_id = ?', id);
    await db.runAsync('DELETE FROM interests WHERE id = ?', id);
  });
}
