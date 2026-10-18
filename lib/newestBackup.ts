// Which backup "Restore Most Recent Backup" opens (1.0.70.2).
//
// Direct request: "Have it check the shared backups folder too." Until then
// the button read only the copies this device had exported itself, so a
// backup made on the computer and saved to the shared Backups folder was
// answered with "No local backups yet" and had to be found through Restore
// from a File. Now the newest backup on this device and the newest in the
// shared folder are both looked at, and the later of the two is opened.
//
// Newest by the moment in the name, not by a file date: the name carries
// when the backup was taken, while a file date changes when a file is copied
// or moved, and a backup copied onto this device from the computer would
// otherwise win against a later one made here. A name with no readable
// moment falls back to the file date, and loses to any name that has one.
//
// No I/O here, so scripts/test_newest_backup.js can check it without a phone.

export type BackupPlace = 'device' | 'shared';

export interface BackupCandidate {
  place: BackupPlace;
  name: string;
  /** The file date, when the place reports one. */
  modifiedMs?: number | null;
}

// Backups made before the 1.0.66 rename start inside-story-backup-.
const BACKUP_NAME = /^(lifestead|inside-story)-backup-(.+)\.json$/;

export function isBackupFileName(name: string): boolean {
  return BACKUP_NAME.test(name);
}

/**
 * The moment a backup was taken, from its name. Export writes the ISO time
 * with ':' and '.' turned into '-', so 2026-10-18T20-01-21-290Z is
 * 2026-10-18T20:01:21.290Z.
 */
export function backupTakenAt(name: string): number | null {
  const hit = BACKUP_NAME.exec(name);
  if (!hit) return null;
  const parts = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/.exec(hit[2]);
  if (!parts) return null;
  const ms = Date.parse(`${parts[1]}T${parts[2]}:${parts[3]}:${parts[4]}.${parts[5]}Z`);
  return Number.isNaN(ms) ? null : ms;
}

function sortKey(candidate: BackupCandidate): [number, number] {
  const taken = backupTakenAt(candidate.name);
  if (taken !== null) return [1, taken];
  return [0, candidate.modifiedMs ?? 0];
}

/**
 * The newest backup across both places, or null when neither holds one.
 * A tie (the same file on both) goes to this device, which needs no
 * download.
 */
export function pickNewestBackup(candidates: readonly BackupCandidate[]): BackupCandidate | null {
  let best: BackupCandidate | null = null;
  for (const candidate of candidates) {
    if (!isBackupFileName(candidate.name)) continue;
    if (!best) {
      best = candidate;
      continue;
    }
    const [aHas, aAt] = sortKey(candidate);
    const [bHas, bAt] = sortKey(best);
    if (aHas > bHas || (aHas === bHas && aAt > bAt) || (aHas === bHas && aAt === bAt && candidate.place === 'device')) {
      best = candidate;
    }
  }
  return best;
}
