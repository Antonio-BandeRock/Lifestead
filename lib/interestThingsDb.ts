// Reading and writing the things that belong to an interest (2026-10-30).
// What a thing says about itself is decided in lib/interestThings.ts with
// no database; this carries out the changes. See interest_things in
// lib/db.ts.

import { getDatabase } from './db';
import { cleanInterestText, localDayOf } from './interests';
import type { InterestThing, ThingKind } from './interestThings';

type ThingRow = {
  id: string;
  interestId: string;
  kind: string;
  name: string;
  about: string | null;
  amount: string | null;
  place: string | null;
  cost: number | null;
  source: string | null;
  cameBy: string | null;
  gotOn: string | null;
  setName: string | null;
  wishedOn: string | null;
  retiredAt: string | null;
  createdAt: string;
};

const COLUMNS = `id, interest_id AS interestId, kind, name, about, amount, place, cost, source, came_by AS cameBy,
  got_on AS gotOn, set_name AS setName, wished_on AS wishedOn, retired_at AS retiredAt, created_at AS createdAt`;

function readKind(kind: string): ThingKind {
  return kind === 'collection' || kind === 'wish' ? kind : 'supply';
}

function fromRow(row: ThingRow): InterestThing {
  return {
    ...row,
    kind: readKind(row.kind),
    cost: row.cost === null ? null : Number(row.cost),
  };
}

function newId(): string {
  return `interest_thing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanOrNull(text: string | null | undefined): string | null {
  const cleaned = text ? cleanInterestText(text) : '';
  return cleaned ? cleaned : null;
}

/** Every thing on every interest, of every kind. */
export async function listInterestThings(): Promise<InterestThing[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ThingRow>(`SELECT ${COLUMNS} FROM interest_things ORDER BY name COLLATE NOCASE`);
  return rows.map(fromRow);
}

export type ThingInput = {
  interestId: string;
  kind: ThingKind;
  name: string;
  about: string | null;
  amount: string | null;
  place: string | null;
  cost: number | null;
  source: string | null;
  cameBy: string | null;
  gotOn: string | null;
  setName: string | null;
};

export async function addInterestThing(input: ThingInput): Promise<string> {
  const db = await getDatabase();
  const id = newId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO interest_things (id, interest_id, kind, name, about, amount, place, cost, source, came_by, got_on, set_name,
       wished_on, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.interestId,
    input.kind,
    cleanInterestText(input.name),
    cleanOrNull(input.about),
    cleanOrNull(input.amount),
    input.kind === 'wish' ? null : cleanOrNull(input.place),
    input.cost,
    cleanOrNull(input.source),
    input.kind === 'wish' ? null : cleanOrNull(input.cameBy),
    input.kind === 'wish' ? null : input.gotOn,
    input.kind === 'collection' ? cleanOrNull(input.setName) : null,
    input.kind === 'wish' ? localDayOf(now) : null,
    now,
    now,
  );
  return id;
}

export async function updateInterestThing(id: string, input: ThingInput): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE interest_things SET interest_id = ?, name = ?, about = ?, amount = ?, place = ?, cost = ?, source = ?, came_by = ?,
       got_on = ?, set_name = ?, updated_at = ? WHERE id = ?`,
    input.interestId,
    cleanInterestText(input.name),
    cleanOrNull(input.about),
    cleanOrNull(input.amount),
    input.kind === 'wish' ? null : cleanOrNull(input.place),
    input.cost,
    cleanOrNull(input.source),
    input.kind === 'wish' ? null : cleanOrNull(input.cameBy),
    input.kind === 'wish' ? null : input.gotOn,
    input.kind === 'collection' ? cleanOrNull(input.setName) : null,
    new Date().toISOString(),
    id,
  );
}

/** A wish that was got becomes a supply or part of a collection, dated today, keeping wished_on. */
export async function gotWish(id: string, to: 'supply' | 'collection'): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE interest_things SET kind = ?, got_on = ?, updated_at = ?
     WHERE id = ? AND kind = 'wish'`,
    to,
    localDayOf(now),
    now,
    id,
  );
}

/** No longer had, or had again. Everything is kept either way. */
export async function setInterestThingRetired(id: string, retired: boolean): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE interest_things SET retired_at = ?, updated_at = ? WHERE id = ?', retired ? now : null, now, id);
}

export async function deleteInterestThing(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM interest_things WHERE id = ?', id);
}

/** Counts for the My Items hub. */
export async function countInterestThings(): Promise<Record<ThingKind, number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ kind: string; n: number }>(
    'SELECT kind, COUNT(*) AS n FROM interest_things WHERE retired_at IS NULL GROUP BY kind',
  );
  const counts: Record<ThingKind, number> = { supply: 0, collection: 0, wish: 0 };
  for (const row of rows) counts[readKind(row.kind)] += Number(row.n);
  return counts;
}
