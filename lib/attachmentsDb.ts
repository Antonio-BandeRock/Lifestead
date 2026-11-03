// Files kept with a record (1.0.80.2): reading and writing the attachments
// table, the files under Paths.document/attachments, and their encrypted
// copies in the Files folder under the shared folder. Every rule and
// sentence is lib/attachments.ts.
//
// The copies are sealed the way photos are (lib/mediaSyncDevice.ts), with
// the sync password and the salt sync already holds a key for, so a pass
// runs only while automatic sync is on with a password. With sync off a
// file simply stays on the device it was attached on.
//
// expo-file-system is reached through a dynamic import inside each
// function, as everywhere else in the app.

import {
  attachmentCopyName,
  attachmentDisplayName,
  attachmentExtension,
  attachmentFileName,
  attachmentMimeType,
  attachmentProblem,
  attachmentTypeProblem,
  ATTACHMENT_NO_VIEWER,
  ATTACHMENT_ON_THE_WAY,
  extensionForType,
  newAttachmentId,
  openingFileName,
  orphanedAttachmentFiles,
  planAttachmentSync,
  sortAttachments,
  type Attachment,
  type AttachmentOwnerKind,
} from './attachments';
import { decryptBackupPayload, encryptBackupPayload, isEncryptedBackupWire } from './backupEncryption';
import { getDesktopBridge, isDesktopApp } from './desktop/bridge';
import { base64ToBytes } from './deviceIdentity';
import { getDatabase } from './db';
import { t } from './i18n';
import { shareFileIfAvailable } from './nativeSharing';
import { deleteFile, downloadText, listFileNames, uploadText, type DriveItemRef } from './oneDriveGraph';
import { getFilesFolder } from './oneDriveFolders';
import { syncKeyMemory } from './syncKeyMemory';

const ATTACHMENTS_DIR = 'attachments';
const OPENING_DIR = 'opened-attachments';

const COLUMNS = `id, owner_kind AS ownerKind, owner_id AS ownerId, name, file_name AS fileName,
  mime_type AS mimeType, size_bytes AS sizeBytes, created_at AS createdAt`;

type AttachmentCopy = { v: 1; id: string; base64: string };

export async function listAttachmentsOf(ownerKind: AttachmentOwnerKind, ownerId: string): Promise<Attachment[]> {
  const db = await getDatabase();
  return sortAttachments(
    await db.getAllAsync<Attachment>(`SELECT ${COLUMNS} FROM attachments WHERE owner_kind = ? AND owner_id = ?`, ownerKind, ownerId),
  );
}

/** How many files each owner has, for a list that shows a count per row. */
export async function countAttachmentsByOwner(ownerKind: AttachmentOwnerKind): Promise<Map<string, number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ ownerId: string; n: number }>(
    `SELECT owner_id AS ownerId, COUNT(*) AS n FROM attachments WHERE owner_kind = ? GROUP BY owner_id`,
    ownerKind,
  );
  return new Map(rows.map((row) => [row.ownerId, row.n]));
}

async function listAllAttachments(): Promise<Attachment[]> {
  const db = await getDatabase();
  return db.getAllAsync<Attachment>(`SELECT ${COLUMNS} FROM attachments`);
}

async function attachmentsDirectory() {
  const { Directory, Paths } = await import('expo-file-system');
  const dir = new Directory(Paths.document, ATTACHMENTS_DIR);
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

async function attachmentFile(fileName: string) {
  const { File } = await import('expo-file-system');
  return new File(await attachmentsDirectory(), fileName);
}

async function listLocalAttachmentFileNames(): Promise<string[]> {
  const dir = await attachmentsDirectory();
  const { File } = await import('expo-file-system');
  return dir
    .list()
    .filter((entry) => entry instanceof File)
    .map((entry) => entry.name);
}

/** Which of these files are on this device now, for the caption under each. */
export async function attachmentsHere(items: readonly Attachment[]): Promise<Set<string>> {
  const local = new Set(await listLocalAttachmentFileNames().catch(() => [] as string[]));
  return new Set(items.filter((item) => local.has(item.fileName)).map((item) => item.id));
}

export type AddAttachmentResult =
  | { status: 'added'; item: Attachment }
  | { status: 'canceled' }
  | { status: 'problem'; message: string };

/** Brings in one file of any kind chosen in the system's file picker. */
export async function addAttachmentFromPicker(ownerKind: AttachmentOwnerKind, ownerId: string): Promise<AddAttachmentResult> {
  let picked;
  try {
    const { File } = await import('expo-file-system');
    const chosen = await File.pickFileAsync();
    picked = Array.isArray(chosen) ? chosen[0] : chosen;
  } catch {
    return { status: 'canceled' };
  }
  if (!picked) return { status: 'canceled' };
  return addAttachmentFromFile(ownerKind, ownerId, {
    uri: picked.uri,
    name: (picked as { name?: string }).name ?? null,
    mimeType: picked.type ?? null,
    sizeBytes: typeof picked.size === 'number' ? picked.size : null,
  });
}

/**
 * Keeps a copy of one file with a record. The source can be a file the
 * picker chose or one another app handed over; it is copied, never moved,
 * so the original stays where it was.
 */
export async function addAttachmentFromFile(
  ownerKind: AttachmentOwnerKind,
  ownerId: string,
  source: { uri: string; name: string | null; mimeType: string | null; sizeBytes: number | null },
): Promise<AddAttachmentResult> {
  try {
    const problem = attachmentProblem(source.sizeBytes);
    if (problem) return { status: 'problem', message: problem };

    const { File } = await import('expo-file-system');
    const original = new File(source.uri);
    const ext = attachmentExtension(source.name ?? '') ?? extensionForType(source.mimeType);
    const name = attachmentDisplayName(source.name, ext);
    const mimeType = attachmentMimeType(name, source.mimeType);
    const unsuited = attachmentTypeProblem(ownerKind, { mimeType, fileName: name }, t);
    if (unsuited) return { status: 'problem', message: unsuited };
    const id = newAttachmentId(Date.now(), Math.random().toString(36).slice(2));
    const fileName = attachmentFileName(id, ext);

    const destination = await attachmentFile(fileName);
    if (destination.exists) destination.delete();
    try {
      original.copy(destination);
    } catch {
      // A file handed over by another app may refuse a copy; reading it
      // whole works for anything under the size limit.
      destination.write(await original.bytes());
    }
    let size = source.sizeBytes;
    if (size === null) {
      try {
        size = destination.size ?? 0;
      } catch {
        size = 0;
      }
      const late = attachmentProblem(size);
      if (late) {
        destination.delete();
        return { status: 'problem', message: late };
      }
    }

    const now = new Date().toISOString();
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO attachments (id, owner_kind, owner_id, name, file_name, mime_type, size_bytes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      ownerKind,
      ownerId,
      name,
      fileName,
      mimeType,
      size ?? 0,
      now,
      now,
    );
    void syncAttachments({ afterSave: false });
    return {
      status: 'added',
      item: { id, ownerKind, ownerId, name, fileName, mimeType, sizeBytes: size ?? 0, createdAt: now },
    };
  } catch (error) {
    return { status: 'problem', message: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Removes one attached file: the row, the file here and the copy in the
 * folder. A folder copy that could not be removed now is cleared by a
 * later pass, once this device has saved last.
 */
export async function removeAttachment(item: Pick<Attachment, 'id' | 'fileName'>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM attachments WHERE id = ?', item.id);
  try {
    const file = await attachmentFile(item.fileName);
    if (file.exists) file.delete();
  } catch {
    // Cleared by the next pass, which removes files no row names.
  }
  try {
    const folder = await getFilesFolder();
    if (folder.ok) await deleteFile(folder.value, attachmentCopyName(item.id));
  } catch {
    // See above.
  }
}

/** Every file attached to one record, for when the record itself goes. */
export async function removeAttachmentsOf(ownerKind: AttachmentOwnerKind, ownerId: string): Promise<void> {
  for (const item of await listAttachmentsOf(ownerKind, ownerId)) await removeAttachment(item);
}

/**
 * Opens a file in an app that reads its kind: the share sheet's list of
 * apps on the phone, the program the computer uses for it on the desktop.
 * The copy handed over carries the person's name for the file, so the
 * viewer's title reads that way. Null when it opened, otherwise what to say.
 */
export async function openAttachment(item: Attachment): Promise<string | null> {
  try {
    const file = await attachmentFile(item.fileName);
    if (!file.exists) {
      const fetched = await fetchAttachmentFromFolder(item);
      if (!fetched) return ATTACHMENT_ON_THE_WAY;
    }
    const { Directory, File, Paths } = await import('expo-file-system');
    const openingDir = new Directory(Paths.cache, OPENING_DIR);
    openingDir.create({ intermediates: true, idempotent: true });
    const opening = new File(openingDir, openingFileName(item.name, item.fileName));
    if (opening.exists) opening.delete();
    file.copy(opening);

    if (isDesktopApp()) {
      const files = getDesktopBridge().files;
      if (!files.open) return 'Opening a file needs the newest version of Lifestead for this computer.';
      const failed = await files.open(opening.uri);
      return failed ? failed : null;
    }
    const shared = await shareFileIfAvailable(opening.uri, { mimeType: item.mimeType, dialogTitle: item.name });
    return shared ? null : ATTACHMENT_NO_VIEWER;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

let running: Promise<void> | null = null;

/**
 * One pass: send the files the folder lacks, fetch the ones this device
 * lacks, clear folder copies nobody refers to (only straight after this
 * device saved last) and remove local files no row names. A second call
 * while a pass runs waits for that pass.
 */
export function syncAttachments(options: { afterSave: boolean }): Promise<void> {
  if (running) return running;
  running = runPass(options.afterSave)
    .catch(() => undefined)
    .finally(() => {
      running = null;
    });
  return running;
}

async function runPass(afterSave: boolean): Promise<void> {
  const rows = await listAllAttachments();
  const localNames = await listLocalAttachmentFileNames();
  for (const name of orphanedAttachmentFiles(rows.map((row) => row.fileName), localNames)) {
    try {
      (await attachmentFile(name)).delete();
    } catch {
      // Tried again on the next pass.
    }
  }
  const { readSyncState } = await import('./snapshotSyncDevice');
  const state = await readSyncState();
  if (!state.enabled || !state.password) return;
  if (rows.length === 0 && !afterSave) return;
  const folder = await getFilesFolder();
  if (!folder.ok) return;
  const names = await listFileNames(folder.value);
  if (!names.ok) return;
  let mayClearFolder = false;
  if (afterSave) {
    const { savedLastFromHere } = await import('./mediaSyncDevice');
    mayClearFolder = await savedLastFromHere();
  }
  const plan = planAttachmentSync({ rows, localFileNames: localNames, folderNames: names.value, mayClearFolder });
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const id of plan.upload) {
    const row = byId.get(id);
    if (!row) continue;
    try {
      const copy: AttachmentCopy = { v: 1, id, base64: await (await attachmentFile(row.fileName)).base64() };
      const wire = await encryptBackupPayload(JSON.stringify(copy), state.password, null, syncKeyMemory);
      await uploadText(folder.value, attachmentCopyName(id), JSON.stringify(wire));
    } catch {
      // Sent on the next pass.
    }
  }
  for (const id of plan.download) {
    const row = byId.get(id);
    if (!row) continue;
    await fetchInto(folder.value, row, state.password).catch(() => 'failed');
  }
  for (const id of plan.clearFromFolder) await deleteFile(folder.value, attachmentCopyName(id));
}

/** Reads one file's encrypted copy and writes it here. Null when it
 *  worked, otherwise what went wrong. */
async function fetchInto(folder: DriveItemRef, row: Pick<Attachment, 'id' | 'fileName'>, password: string): Promise<string | null> {
  const text = await downloadText(folder, attachmentCopyName(row.id));
  if (!text.ok) return text.reason;
  const wire: unknown = JSON.parse(text.value);
  if (!isEncryptedBackupWire(wire)) return 'A file copy in the shared folder could not be read.';
  const plain = await decryptBackupPayload(wire, password, syncKeyMemory);
  if (plain === null) return 'A file copy did not open with this password.';
  const copy = JSON.parse(plain) as Partial<AttachmentCopy>;
  if (copy.id !== row.id || typeof copy.base64 !== 'string') return 'A file copy did not match its name.';
  (await attachmentFile(row.fileName)).write(base64ToBytes(copy.base64));
  return null;
}

/** Brings one file across from the Files folder now, for a file opened
 *  before a pass fetched it. */
async function fetchAttachmentFromFolder(item: Pick<Attachment, 'id' | 'fileName'>): Promise<boolean> {
  try {
    const { readSyncState } = await import('./snapshotSyncDevice');
    const state = await readSyncState();
    if (!state.enabled || !state.password) return false;
    const folder = await getFilesFolder();
    if (!folder.ok) return false;
    return (await fetchInto(folder.value, item, state.password)) === null;
  } catch {
    return false;
  }
}
