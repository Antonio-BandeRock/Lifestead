// Keeping Could This Pay? worksheets (2026-10-30). The arithmetic and every
// sentence are in lib/couldThisPay.ts with no database; this keeps what was
// typed. See interest_pay_worksheets in lib/db.ts.

import { getDatabase } from './db';
import { readPayWords, worksheetKey, type PayWords } from './couldThisPay';

export async function getPayWorksheet(interestIds: readonly string[]): Promise<PayWords> {
  if (interestIds.length === 0) return {};
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ words: string }>('SELECT words FROM interest_pay_worksheets WHERE id = ?', worksheetKey(interestIds));
  return readPayWords(row?.words);
}

export async function savePayWorksheet(interestIds: readonly string[], words: PayWords): Promise<void> {
  if (interestIds.length === 0) return;
  const db = await getDatabase();
  const key = worksheetKey(interestIds);
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO interest_pay_worksheets (id, interest_ids, words, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET words = excluded.words, updated_at = excluded.updated_at`,
    key,
    key,
    JSON.stringify(words),
    now,
    now,
  );
}

/** The interests most recently worked out together, so the worksheet opens on them. */
export async function lastPayWorksheetInterests(): Promise<string[]> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ interest_ids: string }>('SELECT interest_ids FROM interest_pay_worksheets ORDER BY updated_at DESC LIMIT 1');
  return row?.interest_ids ? row.interest_ids.split(',').filter(Boolean) : [];
}
