// Reading and writing Interests > Library and People & Places (2026-10-30).
// What an entry says about itself is decided in lib/interestLibrary.ts with
// no database; this carries out the changes. See interest_library and
// interest_people in lib/db.ts.

import { getDatabase } from './db';
import { cleanInterestText, localDayOf } from './interests';
import { readLibraryStatus, type InterestPerson, type LibraryEntry, type LibraryStatus } from './interestLibrary';

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanOrNull(text: string | null | undefined): string | null {
  const cleaned = text ? cleanInterestText(text) : '';
  return cleaned ? cleaned : null;
}

// --- Library -------------------------------------------------------------------

type LibraryRow = Omit<LibraryEntry, 'status'> & { status: string };

const LIBRARY_COLUMNS = `id, interest_id AS interestId, kind, title, by_whom AS byWhom, link, status, left_off AS leftOff, about,
  published, done_on AS doneOn, from_note_id AS fromNoteId, retired_at AS retiredAt, created_at AS createdAt`;

export async function listLibrary(): Promise<LibraryEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<LibraryRow>(`SELECT ${LIBRARY_COLUMNS} FROM interest_library ORDER BY title COLLATE NOCASE`);
  return rows.map((row) => ({ ...row, status: readLibraryStatus(row.status) }));
}

export type LibraryInput = {
  interestId: string;
  kind: string | null;
  title: string;
  byWhom: string | null;
  link: string | null;
  status: LibraryStatus;
  leftOff: string | null;
  about: string | null;
  published: string | null;
  fromNoteId?: string | null;
};

export async function addLibraryEntry(input: LibraryInput): Promise<string> {
  const db = await getDatabase();
  const id = newId('interest_library');
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO interest_library (id, interest_id, kind, title, by_whom, link, status, left_off, about, published, done_on,
       from_note_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.interestId,
    cleanOrNull(input.kind),
    cleanInterestText(input.title),
    cleanOrNull(input.byWhom),
    input.link ? input.link.trim() : null,
    input.status,
    cleanOrNull(input.leftOff),
    cleanOrNull(input.about),
    input.published,
    input.status === 'done' ? localDayOf(now) : null,
    input.fromNoteId ?? null,
    now,
    now,
  );
  return id;
}

/** Changing an entry keeps the day it was finished unless its status moves off Finished, or onto it. */
export async function updateLibraryEntry(id: string, input: LibraryInput): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE interest_library SET interest_id = ?, kind = ?, title = ?, by_whom = ?, link = ?,
       done_on = CASE WHEN ? = 'done' THEN COALESCE(CASE WHEN status = 'done' THEN done_on END, ?) ELSE NULL END,
       status = ?, left_off = ?, about = ?, published = ?, updated_at = ? WHERE id = ?`,
    input.interestId,
    cleanOrNull(input.kind),
    cleanInterestText(input.title),
    cleanOrNull(input.byWhom),
    input.link ? input.link.trim() : null,
    input.status,
    localDayOf(now),
    input.status,
    cleanOrNull(input.leftOff),
    cleanOrNull(input.about),
    input.published,
    now,
    id,
  );
}

export async function setLibraryStatus(id: string, status: LibraryStatus): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE interest_library SET done_on = CASE WHEN ? = 'done' THEN ? ELSE NULL END, status = ?, updated_at = ? WHERE id = ?`,
    status,
    localDayOf(now),
    status,
    now,
    id,
  );
}

export async function setLibraryLeftOff(id: string, leftOff: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE interest_library SET left_off = ?, updated_at = ? WHERE id = ?', cleanOrNull(leftOff), new Date().toISOString(), id);
}

export async function setLibraryRetired(id: string, retired: boolean): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE interest_library SET retired_at = ?, updated_at = ? WHERE id = ?', retired ? now : null, now, id);
}

export async function deleteLibraryEntry(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM interest_library WHERE id = ?', id);
}

// --- People & Places -------------------------------------------------------------

const PEOPLE_COLUMNS = `id, interest_id AS interestId, kind, name, reach, place, about, retired_at AS retiredAt, created_at AS createdAt`;

export async function listInterestPeople(): Promise<InterestPerson[]> {
  const db = await getDatabase();
  return db.getAllAsync<InterestPerson>(`SELECT ${PEOPLE_COLUMNS} FROM interest_people ORDER BY name COLLATE NOCASE`);
}

export type PersonInput = {
  interestId: string;
  kind: string | null;
  name: string;
  reach: string | null;
  place: string | null;
  about: string | null;
};

export async function addInterestPerson(input: PersonInput): Promise<string> {
  const db = await getDatabase();
  const id = newId('interest_person');
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO interest_people (id, interest_id, kind, name, reach, place, about, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.interestId,
    cleanOrNull(input.kind),
    cleanInterestText(input.name),
    cleanOrNull(input.reach),
    cleanOrNull(input.place),
    cleanOrNull(input.about),
    now,
    now,
  );
  return id;
}

export async function updateInterestPerson(id: string, input: PersonInput): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE interest_people SET interest_id = ?, kind = ?, name = ?, reach = ?, place = ?, about = ?, updated_at = ? WHERE id = ?',
    input.interestId,
    cleanOrNull(input.kind),
    cleanInterestText(input.name),
    cleanOrNull(input.reach),
    cleanOrNull(input.place),
    cleanOrNull(input.about),
    new Date().toISOString(),
    id,
  );
}

export async function setInterestPersonRetired(id: string, retired: boolean): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE interest_people SET retired_at = ?, updated_at = ? WHERE id = ?', retired ? now : null, now, id);
}

export async function deleteInterestPerson(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM interest_people WHERE id = ?', id);
}

/** Counts for the My Items hub: what is still part of an interest. */
export async function countLibraryAndPeople(): Promise<{ library: number; people: number }> {
  const db = await getDatabase();
  const library = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM interest_library WHERE retired_at IS NULL');
  const people = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM interest_people WHERE retired_at IS NULL');
  return { library: Number(library?.n ?? 0), people: Number(people?.n ?? 0) };
}
