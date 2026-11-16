// The app's day-by-day record of which lenses were opened on this device
// (2026-11-15, lens_use_days in lib/db.ts). Direct instruction: the app
// "will keep an internal track record of it, which it should do for
// historical use of the app for someone anyway". Read by the tester's
// review (lib/testerReview.ts), written in every version.
//
// One row per lens per local day, so a lens opened fifty times on a day is
// one row. Nothing here counts opens or times anything, and nothing is
// shown that grades how much the app is used. Device-local: it never
// travels through sync and never marks the device as having changes.
import { getDatabase } from './db';
import { localDay, type LensUseRow } from './testerReview';

// What has been written this run, so a lens opened again today costs nothing.
const noted = new Set<string>();

/** Notes that a lens (or, with an empty key, a screen of its own such as
 *  Profile) was opened today. Never throws: a record that cannot be written
 *  is only a missing day. */
export function noteLensUsed(tab: string, lens: string): void {
  const day = localDay(Date.now());
  const key = `${tab}#${lens}#${day}`;
  if (noted.has(key)) return;
  noted.add(key);
  void (async () => {
    try {
      const db = await getDatabase();
      await db.runAsync(
        'INSERT OR IGNORE INTO lens_use_days (tab, lens, day, first_at) VALUES (?, ?, ?, ?)',
        tab,
        lens,
        day,
        new Date().toISOString(),
      );
    } catch (error) {
      noted.delete(key);
      console.warn('[lensUse] could not note a lens opened', error);
    }
  })();
}

/** Every day recorded, oldest first. */
export async function listLensUse(): Promise<LensUseRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<LensUseRow>('SELECT tab, lens, day FROM lens_use_days ORDER BY day');
}
