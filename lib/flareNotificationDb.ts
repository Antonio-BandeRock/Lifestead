// The records behind the flare questions on a notification (1.0.67.1). Yes
// saves the flare at once through recordCheckin with an id the later
// answers carry; each answer after it fills in that same flare. Every
// answer can arrive after the app was locked, so each write here is safe to
// run twice and does nothing when the flare is gone.
import { getCheckinTagDefinition, setCustomCheckinTags } from './checkinTags';
import { getDatabase, readCustomCheckinTags } from './db';

export async function setFlareSeverity(flareId: string, severity: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE wellbeing_checkins SET severity = ?, updated_at = ? WHERE id = ? AND checkin_type = 'flare'",
    severity,
    new Date().toISOString(),
    flareId,
  );
}

export async function addFlareTag(flareId: string, tagCode: string): Promise<void> {
  const db = await getDatabase();
  const flare = await db.getFirstAsync<{ id: string }>('SELECT id FROM wellbeing_checkins WHERE id = ?', flareId);
  if (!flare) return;
  const already = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM checkin_tags WHERE checkin_id = ? AND tag_code = ?',
    flareId,
    tagCode,
  );
  if (already) return;
  await db.runAsync(
    'INSERT INTO checkin_tags (id, checkin_id, tag_code, severity) VALUES (?, ?, ?, ?)',
    `checkin_tag_${Date.now()}_n`,
    flareId,
    tagCode,
    null,
  );
}

// Words added to a flare from the screen over the lock screen. Each piece
// goes on a line of its own after any notes already there.
export async function addFlareNote(flareId: string, words: string): Promise<void> {
  const text = words.trim();
  if (!text) return;
  const db = await getDatabase();
  const flare = await db.getFirstAsync<{ notes: string | null }>(
    "SELECT notes FROM wellbeing_checkins WHERE id = ? AND checkin_type = 'flare'",
    flareId,
  );
  if (!flare) return;
  const before = (flare.notes ?? '').trim();
  if (before.split('\n').includes(text)) return;
  await db.runAsync(
    'UPDATE wellbeing_checkins SET notes = ?, updated_at = ? WHERE id = ?',
    before ? `${before}\n${text}` : text,
    new Date().toISOString(),
    flareId,
  );
}

/** The symptoms logged with flares most often, at most `limit`, skipping
 *  any the person has removed. Empty when no flare has carried a symptom. */
export async function mostLoggedFlareTags(limit: number): Promise<{ code: string; label: string }[]> {
  const db = await getDatabase();
  setCustomCheckinTags(await readCustomCheckinTags(db));
  const rows = await db.getAllAsync<{ tag_code: string; n: number }>(
    `SELECT t.tag_code, COUNT(*) AS n
       FROM checkin_tags t
       JOIN wellbeing_checkins c ON c.id = t.checkin_id
      WHERE c.checkin_type = 'flare'
      GROUP BY t.tag_code
      ORDER BY n DESC, t.tag_code`,
  );
  const picked: { code: string; label: string }[] = [];
  for (const row of rows) {
    const tag = getCheckinTagDefinition(row.tag_code);
    if (!tag || tag.retired) continue;
    picked.push({ code: tag.code, label: tag.label });
    if (picked.length >= limit) break;
  }
  return picked;
}
