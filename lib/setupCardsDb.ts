// What a lens's What fills this in row reads (1.0.75.1, lib/setupCards.ts):
// the Your Story view, the first day each kind of record appeared, and the
// cards marked Not for me. Lighter than loadYourStoryEverything, and it
// marks nothing as seen, since opening a lens is not reading Your Story.
import { getDatabase } from './db';
import { FEEDS_HIDDEN_META_KEY, parseHiddenFeeders, withHiddenFeeder } from './setupCards';
import { buildYourStory, type YourStoryView } from './yourStory';
import { loadYourStoryFacts, lookForGuideRecords } from './yourStoryDb';
import type { GuideRecords } from './yourStoryGuides';

export type LensFeederData = { view: YourStoryView; records: GuideRecords; hidden: string[] };

async function readHidden(): Promise<string[]> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', FEEDS_HIDDEN_META_KEY);
  return parseHiddenFeeders(row?.value ?? null);
}

export async function loadLensFeederData(): Promise<LensFeederData> {
  const db = await getDatabase();
  const [facts, records, hidden] = await Promise.all([loadYourStoryFacts(), lookForGuideRecords(db), readHidden()]);
  return { view: buildYourStory(facts), records, hidden };
}

export async function hideFeederCard(key: string): Promise<string[]> {
  const db = await getDatabase();
  const next = withHiddenFeeder(await readHidden(), key);
  await db.runAsync(
    `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    FEEDS_HIDDEN_META_KEY,
    JSON.stringify(next),
    new Date().toISOString(),
  );
  return next;
}
