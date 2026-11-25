// Reading and writing the Diary. The rules are in lib/diary.ts; the tables
// are described beside their CREATE statements in lib/db.ts. Every read goes
// through readOrClosed, so a closed vault reads as nothing rather than as an
// error.
import { getDatabase, listCheckins } from './db';
import { localStampOf } from './dailyScales';
import { parseDraft, type Diary, type DiaryDraft, type DiaryEntry, type DiaryLink, type DiaryLinkKind, type HealthLine } from './diary';
import { readOrClosed } from './vaultReads';

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Made before an entry is saved, so a photo can be added while writing. */
export function newDiaryEntryId(): string {
  return newId('diaryentry');
}

type DiaryRowDb = { id: string; name: string; showHealth: number; retiredAt: string | null };

export async function listDiaries(): Promise<Diary[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DiaryRowDb>(
    'SELECT id, name, show_health AS showHealth, retired_at AS retiredAt FROM diaries ORDER BY created_at, name',
  );
  return rows.map((row) => ({ ...row, showHealth: row.showHealth === 1 }));
}

export async function addDiary(name: string): Promise<string> {
  const db = await getDatabase();
  const id = newId('diary');
  const now = new Date().toISOString();
  await db.runAsync('INSERT INTO diaries (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', id, name.trim(), now, now);
  return id;
}

export async function renameDiary(id: string, name: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE diaries SET name = ?, updated_at = ? WHERE id = ?', name.trim(), new Date().toISOString(), id);
}

export async function setDiaryShowsHealth(id: string, on: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE diaries SET show_health = ?, updated_at = ? WHERE id = ?', on ? 1 : 0, new Date().toISOString(), id);
}

export async function setDiaryRetired(id: string, retired: boolean): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE diaries SET retired_at = ?, updated_at = ? WHERE id = ?', retired ? now : null, now, id);
}

/** Only an empty diary is deleted, and the count is taken again here. */
export async function deleteEmptyDiary(id: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM diary_entries WHERE diary_id = ?', id);
  if (!row || row.n > 0) return false;
  await db.runAsync('DELETE FROM diaries WHERE id = ?', id);
  return true;
}

type EntryRowDb = { id: string; diaryId: string; happenedAt: string; body: string; isLifeEvent: number; lifeEventLabel: string | null };

const ENTRY_COLUMNS =
  'id, diary_id AS diaryId, happened_at AS happenedAt, body, is_life_event AS isLifeEvent, life_event_label AS lifeEventLabel';

function entryFromRow(row: EntryRowDb): DiaryEntry {
  return { ...row, isLifeEvent: row.isLifeEvent === 1 };
}

export async function listDiaryEntries(): Promise<DiaryEntry[]> {
  const db = await getDatabase();
  const rows = await readOrClosed(
    () => db.getAllAsync<EntryRowDb>(`SELECT ${ENTRY_COLUMNS} FROM diary_entries ORDER BY happened_at DESC`),
    [],
  );
  return rows.map(entryFromRow);
}

/** Entries from `startDay` to `endDay`, both local dates, oldest first. */
export async function listDiaryEntriesBetween(startDay: string, endDay: string): Promise<DiaryEntry[]> {
  const db = await getDatabase();
  const rows = await readOrClosed(
    () =>
      db.getAllAsync<EntryRowDb>(
        `SELECT ${ENTRY_COLUMNS} FROM diary_entries WHERE happened_at >= ? AND happened_at < ? ORDER BY happened_at ASC`,
        startDay,
        `${endDay}T99`,
      ),
    [],
  );
  return rows.map(entryFromRow);
}

/** Every entry marked as a life event, oldest first. */
export async function listDiaryLifeEvents(): Promise<DiaryEntry[]> {
  const db = await getDatabase();
  const rows = await readOrClosed(
    () => db.getAllAsync<EntryRowDb>(`SELECT ${ENTRY_COLUMNS} FROM diary_entries WHERE is_life_event = 1 ORDER BY happened_at ASC`),
    [],
  );
  return rows.map(entryFromRow);
}

/** Every link, or one entry's. */
export async function listDiaryLinks(): Promise<DiaryLink[]> {
  const db = await getDatabase();
  return readOrClosed(
    () =>
      db.getAllAsync<DiaryLink>(
        'SELECT id, entry_id AS entryId, target_kind AS kind, target_id AS targetId, target_label AS label FROM diary_links ORDER BY created_at',
      ),
    [],
  );
}

export async function saveDiaryEntry(draft: DiaryDraft): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const event = draft.isLifeEvent ? draft.lifeEventLabel.trim() || null : null;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO diary_entries (id, diary_id, happened_at, body, is_life_event, life_event_label, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET diary_id = excluded.diary_id, happened_at = excluded.happened_at, body = excluded.body,
         is_life_event = excluded.is_life_event, life_event_label = excluded.life_event_label, updated_at = excluded.updated_at`,
      draft.entryId,
      draft.diaryId,
      draft.happenedAt,
      draft.body.trim(),
      draft.isLifeEvent ? 1 : 0,
      event,
      now,
      now,
    );
    await db.runAsync('DELETE FROM diary_links WHERE entry_id = ?', draft.entryId);
    for (const link of draft.links) {
      await db.runAsync(
        'INSERT INTO diary_links (id, entry_id, target_kind, target_id, target_label, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        newId('diarylink'),
        draft.entryId,
        link.kind,
        link.targetId,
        link.label,
        now,
      );
    }
    await db.runAsync('DELETE FROM diary_drafts WHERE entry_id = ?', draft.entryId);
  });
}

/** A quick entry in Daily, from Capture or a spoken command. */
export async function addDiaryEntry(body: string, happenedAt: string, diaryId: string): Promise<string> {
  const entryId = newDiaryEntryId();
  await saveDiaryEntry({ entryId, isNew: true, diaryId, happenedAt, body, isLifeEvent: false, lifeEventLabel: '', links: [] });
  return entryId;
}

/** The diary a quick entry goes into: Daily while it is in use, else the first. */
export async function quickEntryDiary(): Promise<Diary | null> {
  const inUse = (await listDiaries()).filter((diary) => !diary.retiredAt);
  return inUse.find((diary) => diary.id === 'diary_daily') ?? inUse[0] ?? null;
}

/** One entry and everything attached to it. */
export async function deleteDiaryEntry(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM diary_links WHERE entry_id = ?', id);
  await db.runAsync('DELETE FROM diary_drafts WHERE entry_id = ?', id);
  await db.runAsync('DELETE FROM diary_entries WHERE id = ?', id);
  // Its photos and recordings go with it.
  await (await import('./mediaDb')).removePhotosOf('diary_entry', id);
}

// --- Drafts ----------------------------------------------------------------

export async function keepDiaryDraft(draft: DiaryDraft): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO diary_drafts (entry_id, payload, updated_at) VALUES (?, ?, ?)',
    draft.entryId,
    JSON.stringify(draft),
    new Date().toISOString(),
  );
}

/** The newest unfinished entry on this device. */
export async function readDiaryDraft(): Promise<DiaryDraft | null> {
  const db = await getDatabase();
  const row = await readOrClosed(
    () => db.getFirstAsync<{ payload: string }>('SELECT payload FROM diary_drafts ORDER BY updated_at DESC LIMIT 1'),
    null,
  );
  return row ? parseDraft(row.payload) : null;
}

export async function dropDiaryDraft(entryId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM diary_drafts WHERE entry_id = ?', entryId);
}

// --- What an entry can point at ---------------------------------------------

/** The Health Journal, read from the one place it is kept. */
export async function listHealthLines(): Promise<HealthLine[]> {
  const notes = await listCheckins({ checkinType: 'general' });
  return notes
    .filter((note) => (note.notes ?? '').trim())
    .map((note) => ({ id: note.id, loggedAt: localStampOf(note.loggedAt), words: (note.notes ?? '').trim() }));
}

export type DiaryLinkChoice = { kind: DiaryLinkKind; targetId: string; label: string };

/** Everything an entry can be about, by kind. */
export async function listDiaryLinkChoices(): Promise<DiaryLinkChoice[]> {
  const { getFamilyMembers, getUserConditions, listAllConditions, listGardenPlots } = await import('./db');
  const [{ listInterests }, { listProjects }] = await Promise.all([import('./interestsDb'), import('./projectsDb')]);
  const none = <T,>(work: Promise<T[]>) => readOrClosed(() => work, [] as T[]);
  const [family, interests, plots, mine, conditions, projects] = await Promise.all([
    none(getFamilyMembers()),
    none(listInterests()),
    none(listGardenPlots()),
    none(getUserConditions()),
    none(listAllConditions()),
    none(listProjects('everything')),
  ]);
  return [
    ...family.map((row): DiaryLinkChoice => ({ kind: 'person', targetId: row.id, label: row.name })),
    ...interests.map((row): DiaryLinkChoice => ({ kind: 'interest', targetId: row.id, label: row.name })),
    ...plots.map((row): DiaryLinkChoice => ({ kind: 'garden', targetId: row.id, label: row.name })),
    ...conditions.filter((row) => mine.includes(row.code)).map((row): DiaryLinkChoice => ({ kind: 'condition', targetId: row.code, label: row.name })),
    ...projects.map((row): DiaryLinkChoice => ({ kind: 'project', targetId: row.id, label: row.name })),
  ];
}
