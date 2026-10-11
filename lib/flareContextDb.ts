// The records behind lib/flareContext.ts (2026-10-11): what the person
// marked about themselves in Profile, how often each symptom and each
// contributor has been marked on flares and reactions, and the person's own
// contributors as an open list (add, rename, remove; removing one a flare
// used retires it so the flare keeps its name).
import {
  NOT_SURE_CONTRIBUTOR,
  OWN_CONTRIBUTOR_PREFIX,
  setOwnContributors,
  type PersonMarks,
} from './flareContext';
import { getDatabase, getUserConditions, listNeuroProfile, readOwnContributors } from './db';

async function reload(): Promise<void> {
  const db = await getDatabase();
  setOwnContributors(await readOwnContributors(db));
}

/** The conditions picked in Profile and the autism, ADHD or dyslexia
 *  entries. Never the curious-about list. */
export async function readPersonMarks(): Promise<PersonMarks> {
  const [conditions, neuro] = await Promise.all([getUserConditions(), listNeuroProfile()]);
  return { conditions, neuro };
}

/** How many flares and reactions each symptom has been marked on. */
export async function symptomUseCounts(): Promise<Map<string, number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ tag_code: string; n: number }>(
    `SELECT t.tag_code, COUNT(*) AS n
       FROM checkin_tags t
       JOIN wellbeing_checkins c ON c.id = t.checkin_id
      WHERE c.valence = 'negative' AND (t.severity IS NULL OR t.severity > 0)
      GROUP BY t.tag_code`,
  );
  return new Map(rows.map((row) => [row.tag_code, row.n]));
}

/** How many flares each contributor has been marked on, Not sure left out. */
export async function contributorUseCounts(): Promise<Map<string, number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ contributor_code: string; n: number }>(
    'SELECT contributor_code, COUNT(*) AS n FROM checkin_contributors WHERE contributor_code != ? GROUP BY contributor_code',
    NOT_SURE_CONTRIBUTOR,
  );
  return new Map(rows.map((row) => [row.contributor_code, row.n]));
}

/** Adds a contributor and returns its code, or the code of an existing one
 *  with the same name (brought back if it had been removed). */
export async function addOwnContributor(label: string): Promise<string | null> {
  const name = label.trim();
  if (!name) return null;
  const db = await getDatabase();
  const now = new Date().toISOString();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM custom_flare_contributors WHERE lower(label) = lower(?)',
    name,
  );
  if (existing) {
    await db.runAsync('UPDATE custom_flare_contributors SET retired_at = NULL, updated_at = ? WHERE id = ?', now, existing.id);
    await reload();
    return OWN_CONTRIBUTOR_PREFIX + existing.id;
  }
  const id = `contributor_${Date.now()}`;
  await db.runAsync(
    'INSERT INTO custom_flare_contributors (id, label, created_at, updated_at) VALUES (?, ?, ?, ?)',
    id,
    name,
    now,
    now,
  );
  await reload();
  return OWN_CONTRIBUTOR_PREFIX + id;
}

export async function renameOwnContributor(code: string, label: string): Promise<void> {
  const name = label.trim();
  if (!name || !code.startsWith(OWN_CONTRIBUTOR_PREFIX)) return;
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE custom_flare_contributors SET label = ?, updated_at = ? WHERE id = ?',
    name,
    new Date().toISOString(),
    code.slice(OWN_CONTRIBUTOR_PREFIX.length),
  );
  await reload();
}

/** 'retired' when a flare used it, 'deleted' when nothing did. */
export async function removeOwnContributor(code: string): Promise<'retired' | 'deleted' | null> {
  if (!code.startsWith(OWN_CONTRIBUTOR_PREFIX)) return null;
  const db = await getDatabase();
  const id = code.slice(OWN_CONTRIBUTOR_PREFIX.length);
  const used = await db.getFirstAsync<{ n: number }>(
    '/* vault:tool */ SELECT COUNT(*) AS n FROM checkin_contributors WHERE contributor_code = ?',
    code,
  );
  if ((used?.n ?? 0) > 0) {
    const now = new Date().toISOString();
    await db.runAsync('UPDATE custom_flare_contributors SET retired_at = ?, updated_at = ? WHERE id = ?', now, now, id);
    await reload();
    return 'retired';
  }
  await db.runAsync('DELETE FROM custom_flare_contributors WHERE id = ?', id);
  await reload();
  return 'deleted';
}

/** Adds one contributor to a saved flare, from the lock-screen question.
 *  Safe to run twice; Not sure replaces anything else and anything else
 *  replaces Not sure. */
export async function addFlareContributor(flareId: string, code: string): Promise<void> {
  const db = await getDatabase();
  const flare = await db.getFirstAsync<{ id: string }>('SELECT id FROM wellbeing_checkins WHERE id = ?', flareId);
  if (!flare) return;
  if (code === NOT_SURE_CONTRIBUTOR) {
    await db.runAsync('DELETE FROM checkin_contributors WHERE checkin_id = ?', flareId);
  } else {
    await db.runAsync('DELETE FROM checkin_contributors WHERE checkin_id = ? AND contributor_code = ?', flareId, NOT_SURE_CONTRIBUTOR);
  }
  await db.runAsync(
    'INSERT OR IGNORE INTO checkin_contributors (id, checkin_id, contributor_code) VALUES (?, ?, ?)',
    `${flareId}:${code}`,
    flareId,
    code,
  );
}
