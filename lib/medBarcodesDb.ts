// A bottle's barcode kept with a med (2026-11-18), so scanning the same
// bottle again on the medicine label screen names the med it is. The code
// is spelled as codeKey in lib/medicineLabel.ts spells it, so a scan and a
// typed code meet. One code names one med; keeping it with another moves it.

import { getDatabase } from './db';

export async function rememberMedCode(code: string, treatmentId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO med_barcodes (code, treatment_id, added_at) VALUES (?, ?, ?)
     ON CONFLICT(code) DO UPDATE SET treatment_id = excluded.treatment_id, added_at = excluded.added_at`,
    code,
    treatmentId,
    new Date().toISOString(),
  );
}

export async function findMedByCode(code: string): Promise<{ treatmentId: string; name: string } | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: string; name: string }>(
    `SELECT t.id AS id, t.name AS name
       FROM med_barcodes b JOIN treatments t ON t.id = b.treatment_id
      WHERE b.code = ?`,
    code,
  );
  return row ? { treatmentId: row.id, name: row.name } : null;
}

export async function forgetMedCode(code: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM med_barcodes WHERE code = ?', code);
}
