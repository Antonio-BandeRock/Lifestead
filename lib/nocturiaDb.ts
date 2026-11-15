// Nights: reading and writing nocturia_nights (lib/db.ts), 1.0.52.7.
// Signals > Nocturia writes here; Trends > Nights reads it beside the
// evening's drinks (lib/trendsMore.ts, lib/trendsMoreDb.ts).
import { getDatabase } from './db';
import { readOrClosed } from './vaultReads';

export type NocturiaNight = {
  id: string;
  nightOf: string;
  times: number;
  firstWake: string | null;
  notes: string | null;
};

const COLUMNS = 'id, night_of AS nightOf, times, first_wake AS firstWake, notes';

export async function listNocturiaNights(limit = -1): Promise<NocturiaNight[]> {
  const db = await getDatabase();
  return readOrClosed(() => db.getAllAsync<NocturiaNight>(
    `SELECT ${COLUMNS} FROM nocturia_nights ORDER BY night_of DESC, created_at DESC LIMIT ?`,
    limit,
  ), []);
}

export async function listNocturiaNightsBetween(start: string, end: string): Promise<NocturiaNight[]> {
  const db = await getDatabase();
  return readOrClosed(() => db.getAllAsync<NocturiaNight>(
    `SELECT ${COLUMNS} FROM nocturia_nights WHERE night_of >= ? AND night_of <= ? ORDER BY night_of ASC`,
    start,
    end,
  ), []);
}

/** One night is one row: logging the same night again replaces what was
 *  written for it rather than adding a second count. */
export async function saveNocturiaNight(input: {
  nightOf: string;
  times: number;
  firstWake: string | null;
  notes: string | null;
}): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const existing = await db.getFirstAsync<{ id: string }>('/* vault:tool */ SELECT id FROM nocturia_nights WHERE night_of = ?', input.nightOf);
  const notes = input.notes && input.notes.trim() ? input.notes.trim() : null;
  if (existing) {
    await db.runAsync(
      'UPDATE nocturia_nights SET times = ?, first_wake = ?, notes = ?, updated_at = ? WHERE id = ?',
      input.times,
      input.firstWake,
      notes,
      now,
      existing.id,
    );
    return;
  }
  await db.runAsync(
    `INSERT INTO nocturia_nights (id, night_of, times, first_wake, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    `night_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    input.nightOf,
    input.times,
    input.firstWake,
    notes,
    now,
    now,
  );
}

/** Corrects a logged night from Edit in Signals > Nights. Moving it onto a
 *  night that already has its own entry is refused with 'taken', so two
 *  records never quietly become one. */
export async function updateNocturiaNight(
  id: string,
  input: { nightOf: string; times: number; firstWake: string | null; notes: string | null },
): Promise<'saved' | 'taken'> {
  const db = await getDatabase();
  const other = await db.getFirstAsync<{ id: string }>(
    '/* vault:tool */ SELECT id FROM nocturia_nights WHERE night_of = ? AND id <> ?',
    input.nightOf,
    id,
  );
  if (other) return 'taken';
  const notes = input.notes && input.notes.trim() ? input.notes.trim() : null;
  await db.runAsync(
    'UPDATE nocturia_nights SET night_of = ?, times = ?, first_wake = ?, notes = ?, updated_at = ? WHERE id = ?',
    input.nightOf,
    input.times,
    input.firstWake,
    notes,
    new Date().toISOString(),
    id,
  );
  return 'saved';
}

export async function deleteNocturiaNight(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM nocturia_nights WHERE id = ?', id);
}
