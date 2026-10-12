// The day somebody started with Lifestead, for the first-week lines (P1,
// lib/firstWeek.ts). One app_meta row, written once and never moved. It
// travels with sync on purpose: a computer set up a month later is not the
// person's first day.
//
// A database that predates the row takes the day the first-launch agreement
// was made, when that is earlier, so an install already weeks old is not
// greeted as new.
import { getAgreement } from './agreementDb';
import { getDatabase } from './db';
import { localDayStamp } from './firstWeek';

const FIRST_DAY_META_KEY = 'first_day';

export async function getFirstDay(): Promise<string> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', FIRST_DAY_META_KEY);
  if (row?.value) return row.value;
  let first = localDayStamp(Date.now());
  const agreement = await getAgreement();
  const agreedMs = agreement ? Date.parse(agreement.agreedAt) : NaN;
  if (!Number.isNaN(agreedMs)) {
    const agreed = localDayStamp(agreedMs);
    if (agreed < first) first = agreed;
  }
  await db.runAsync(
    `INSERT OR IGNORE INTO app_meta (key, value, updated_at) VALUES (?, ?, ?)`,
    FIRST_DAY_META_KEY,
    first,
    new Date().toISOString(),
  );
  return first;
}
