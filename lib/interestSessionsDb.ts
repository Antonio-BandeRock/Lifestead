// Reading and writing sessions on an interest (2026-10-30). What a session
// says about itself is decided in lib/interestSessions.ts with no database;
// this carries out the changes. See interest_sessions in lib/db.ts.

import { getDatabase } from './db';
import { cleanInterestText, localDayOf } from './interests';
import { setInterestLeftOff } from './interestsDb';
import { timerMinutes, type InterestSession } from './interestSessions';

type SessionRow = {
  id: string;
  interestId: string;
  projectId: string | null;
  doneOn: string;
  startedAt: string | null;
  minutes: number | null;
  note: string | null;
  leftOff: string | null;
  running: number;
  createdAt: string;
};

const COLUMNS = `id, interest_id AS interestId, project_id AS projectId, done_on AS doneOn, started_at AS startedAt,
  minutes, note, left_off AS leftOff, running, created_at AS createdAt`;

function fromRow(row: SessionRow): InterestSession {
  return {
    id: row.id,
    interestId: row.interestId,
    projectId: row.projectId,
    doneOn: row.doneOn,
    startedAt: row.startedAt,
    minutes: row.minutes === null ? null : Number(row.minutes),
    note: row.note,
    leftOff: row.leftOff,
    running: row.running === 1,
    createdAt: row.createdAt,
  };
}

function newId(): string {
  return `interest_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanOrNull(text: string | null | undefined): string | null {
  const cleaned = text ? cleanInterestText(text) : '';
  return cleaned ? cleaned : null;
}

/** Every session, the running timer included, newest first. */
export async function listInterestSessions(interestId?: string): Promise<InterestSession[]> {
  const db = await getDatabase();
  const rows = interestId
    ? await db.getAllAsync<SessionRow>(
        `SELECT ${COLUMNS} FROM interest_sessions WHERE interest_id = ? ORDER BY done_on DESC, created_at DESC`,
        interestId,
      )
    : await db.getAllAsync<SessionRow>(`SELECT ${COLUMNS} FROM interest_sessions ORDER BY done_on DESC, created_at DESC`);
  return rows.map(fromRow);
}

/** Finished sessions on one local day, for the practice reminder's Done. */
export async function listInterestSessionsOn(day: string): Promise<InterestSession[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SessionRow>(`SELECT ${COLUMNS} FROM interest_sessions WHERE done_on = ? AND running = 0`, day);
  return rows.map(fromRow);
}

export type SessionInput = {
  interestId: string;
  projectId: string | null;
  doneOn: string;
  minutes: number | null;
  note: string | null;
  leftOff: string | null;
};

/** Where it was left off on a session is also the interest's own note, so it is read first next time. */
async function carryLeftOff(input: SessionInput): Promise<void> {
  const leftOff = cleanOrNull(input.leftOff);
  if (leftOff) await setInterestLeftOff(input.interestId, leftOff);
}

export async function addInterestSession(input: SessionInput): Promise<string> {
  const db = await getDatabase();
  const id = newId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO interest_sessions (id, interest_id, project_id, done_on, minutes, note, left_off, running, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    id,
    input.interestId,
    input.projectId,
    input.doneOn,
    input.minutes,
    cleanOrNull(input.note),
    cleanOrNull(input.leftOff),
    now,
    now,
  );
  await carryLeftOff(input);
  return id;
}

export async function updateInterestSession(id: string, input: SessionInput): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE interest_sessions SET interest_id = ?, project_id = ?, done_on = ?, minutes = ?, note = ?, left_off = ?,
       updated_at = ? WHERE id = ?`,
    input.interestId,
    input.projectId,
    input.doneOn,
    input.minutes,
    cleanOrNull(input.note),
    cleanOrNull(input.leftOff),
    new Date().toISOString(),
    id,
  );
  await carryLeftOff(input);
}

export async function deleteInterestSession(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM interest_sessions WHERE id = ?', id);
}

/** The timer still going, if there is one. Only one runs at a time. */
export async function getRunningSession(): Promise<InterestSession | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SessionRow>(
    `SELECT ${COLUMNS} FROM interest_sessions WHERE running = 1 ORDER BY started_at DESC LIMIT 1`,
  );
  return row ? fromRow(row) : null;
}

export async function startInterestTimer(interestId: string, projectId: string | null): Promise<string> {
  const db = await getDatabase();
  const id = newId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO interest_sessions (id, interest_id, project_id, done_on, started_at, running, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    id,
    interestId,
    projectId,
    localDayOf(now),
    now,
    now,
    now,
  );
  return id;
}

/** Stops the timer into a finished session, dated the day it started. */
export async function stopInterestTimer(id: string, extra: { note: string | null; leftOff: string | null }): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SessionRow>(`SELECT ${COLUMNS} FROM interest_sessions WHERE id = ?`, id);
  if (!row) return 0;
  const minutes = timerMinutes(row.startedAt ?? row.createdAt, new Date());
  await db.runAsync(
    'UPDATE interest_sessions SET minutes = ?, note = ?, left_off = ?, running = 0, updated_at = ? WHERE id = ?',
    minutes,
    cleanOrNull(extra.note),
    cleanOrNull(extra.leftOff),
    new Date().toISOString(),
    id,
  );
  await carryLeftOff({ interestId: row.interestId, projectId: row.projectId, doneOn: row.doneOn, minutes, note: extra.note, leftOff: extra.leftOff });
  return minutes;
}

/** Throws a timer away without keeping anything. */
export async function discardInterestTimer(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM interest_sessions WHERE id = ? AND running = 1', id);
}
