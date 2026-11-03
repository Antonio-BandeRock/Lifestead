// The shared folder as a folder on this phone, answering what
// lib/oneDriveGraph.ts asks of Microsoft Graph.
//
// WHY THIS EXISTS. OneDrive is reached through Graph and Google Drive will be
// reached through its own interface, but a person may keep their files with
// any service at all: Dropbox, Box, MEGA, pCloud, a Nextcloud at home. Those
// services charge nothing to be used this way, and building each one in would
// still mean a sign-in, a set of rules and a way of failing per service. So
// the third way in is a folder on the phone that another app keeps in step
// with wherever the person stores things (Syncthing, FolderSync, Autosync and
// the like). Lifestead reads and writes the folder; the other app carries the
// bytes. The computer already works this way: lib/desktop/cloudFolder.ts.
//
// THE SAME ADDRESS SHAPE, ONE DRIVE ID. Everything above this file keeps
// passing DriveItemRefs. A folder here has driveId PHONE_DRIVE_ID and its
// itemId is the address Android's folder picker handed back (a content://
// tree or document address), which is the only address that folder has.
// Android keeps the permission for that one folder and everything under it,
// and nothing else on the phone can be reached through it.
//
// WHAT ANDROID'S FOLDER ACCESS CANNOT DO, AND WHAT IS DONE INSTEAD.
//   - There is no rename and no move, so a move is read, write, then remove.
//   - Writing over a file is not reliably a clean replace (some phones keep
//     the old tail past the new end), so a file is removed and written fresh.
//     That leaves a moment where the old copy is gone and the new one is not
//     finished; every reader of the shared folder already checks what it reads
//     (sync compares a fingerprint, a sealed file fails to open), so a half
//     file is read as not there yet rather than as records.
//   - A file is named by the provider, not by its address, and some providers
//     give addresses that say nothing about the name. The name is read from
//     the address when the address carries a path, and from the folder's own
//     list of names when it does not.
//
// WHAT THE OTHER APP DECIDES. When the folder is carried to the cloud and
// back is up to whatever keeps it in step, so a change can take as long to
// reach the other device as that app takes. The shared folder screen says so.

import type { DriveFileRef, DriveItemRef, GraphResult } from './oneDriveGraph';
import { FileInWords } from './fileInWords';

/** The driveId of every folder addressed on this phone. */
export const PHONE_DRIVE_ID = 'phone';

export function isPhoneFolder(folder: { driveId: string } | null | undefined): boolean {
  return folder?.driveId === PHONE_DRIVE_ID;
}

/** Written as application/octet-stream so no provider adds an extension of its own. */
const PLAIN_BYTES = 'application/octet-stream';

async function attempt<T>(work: () => Promise<T> | T, fallback: string): Promise<GraphResult<T>> {
  try {
    return { ok: true, value: await work() };
  } catch {
    return { ok: false, reason: fallback };
  }
}

/**
 * What an address says about the name, when it says anything.
 *
 * A folder on the phone's own storage has a document id like
 * "primary:Sync/Lifestead/Backups", so the last part after a slash or colon
 * is the name. An id with neither is a provider's own number, which names
 * nothing, and null says so.
 */
export function nameFromAddress(uri: string): string | null {
  const trimmed = uri.replace(/\/+$/, '');
  const last = trimmed.slice(trimmed.lastIndexOf('/') + 1);
  let id: string;
  try {
    id = decodeURIComponent(last);
  } catch {
    return null;
  }
  const cut = Math.max(id.lastIndexOf('/'), id.lastIndexOf(':'));
  if (cut < 0) return null;
  const name = id.slice(cut + 1);
  return name.length > 0 ? name : null;
}

/**
 * Where a folder sits, in words, for a person to read.
 *
 * On the phone's own storage that is "This phone / Sync / Lifestead". In a
 * folder another app offers, the address carries no path worth showing, so
 * the folder's name alone is honest.
 */
export function describePhoneAddress(uri: string, name: string): string {
  const trimmed = uri.replace(/\/+$/, '');
  const last = trimmed.slice(trimmed.lastIndexOf('/') + 1);
  try {
    const id = decodeURIComponent(last);
    if (uri.includes('com.android.externalstorage.documents') && id.includes(':')) {
      const [volume, inside] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)];
      const parts = inside.split('/').filter((part) => part.length > 0);
      const where = volume === 'primary' ? 'This phone' : 'Memory card';
      return [where, ...parts].join(' / ');
    }
  } catch {
    // Falls through to the name.
  }
  return 'On this phone: ' + name;
}

type Entry = { uri: string; name: string; isDirectory: boolean };

/** Everything directly inside a folder, each with its name. */
async function entriesOf(folderUri: string): Promise<Entry[]> {
  const { Directory } = await import('expo-file-system');
  const directory = new Directory(folderUri);
  const listed = directory.list();
  const fromAddress = listed.map((entry) => nameFromAddress(entry.uri));
  let fromList: string[] | null = null;
  if (fromAddress.some((name) => name === null)) {
    // Only asked for when an address says nothing, because the folder's
    // list of names also adds up the size of everything under it.
    const names = directory.info().files ?? [];
    fromList = names.length === listed.length ? names : null;
  }
  const entries: Entry[] = [];
  listed.forEach((entry, index) => {
    const name = fromAddress[index] ?? fromList?.[index] ?? null;
    if (!name) return;
    entries.push({ uri: entry.uri, name, isDirectory: entry instanceof Directory });
  });
  return entries;
}

async function filesNamed(folderUri: string, fileName: string): Promise<Entry[]> {
  const entries = await entriesOf(folderUri);
  return entries.filter((entry) => !entry.isDirectory && entry.name === fileName);
}

async function refFor(uri: string, name: string): Promise<DriveItemRef> {
  return { driveId: PHONE_DRIVE_ID, itemId: uri, name, path: describePhoneAddress(uri, name) };
}

/**
 * Android's own folder picker. Null when it was closed without a choice.
 *
 * A cancel and a failure look the same from here, so both come back as no
 * choice rather than an alarming message about a folder nobody chose.
 */
export async function pickFolder(): Promise<GraphResult<DriveItemRef | null>> {
  try {
    const { Directory } = await import('expo-file-system');
    const picked = await Directory.pickDirectoryAsync();
    const uri = picked?.uri?.trim();
    if (!uri) return { ok: true, value: null };
    const name = nameFromAddress(uri) ?? 'Your folder';
    return { ok: true, value: await refFor(uri, name) };
  } catch {
    return { ok: true, value: null };
  }
}

export async function listChildFolders(parent: DriveItemRef): Promise<GraphResult<DriveItemRef[]>> {
  return attempt(async () => {
    const entries = await entriesOf(parent.itemId);
    const refs: DriveItemRef[] = [];
    for (const entry of entries) {
      if (entry.isDirectory) refs.push(await refFor(entry.uri, entry.name));
    }
    return refs;
  }, parent.name + ' could not be read on this phone.');
}

export async function createFolder(parent: DriveItemRef, name: string): Promise<GraphResult<DriveItemRef>> {
  return attempt(async () => {
    const { Directory } = await import('expo-file-system');
    const made = new Directory(parent.itemId).createDirectory(name);
    return refFor(made.uri, name);
  }, 'The folder could not be made on this phone.');
}

export async function listFiles(folder: DriveItemRef): Promise<GraphResult<DriveFileRef[]>> {
  return attempt(async () => {
    const entries = await entriesOf(folder.itemId);
    return entries.filter((entry) => !entry.isDirectory).map((entry) => ({ itemId: entry.uri, name: entry.name }));
  }, folder.name + ' could not be read on this phone.');
}

export async function listFileNames(folder: DriveItemRef): Promise<GraphResult<string[]>> {
  const listed = await listFiles(folder);
  return listed.ok ? { ok: true, value: listed.value.map((file) => file.name) } : listed;
}

/** Removes every file of that name, since a provider may have made "name (1)" beside it. */
async function removeNamed(folderUri: string, fileName: string): Promise<void> {
  const { File } = await import('expo-file-system');
  for (const entry of await filesNamed(folderUri, fileName)) {
    new File(entry.uri).delete();
  }
}

async function writeBytes(folderUri: string, fileName: string, bytes: Uint8Array | string): Promise<void> {
  await removeNamed(folderUri, fileName);
  const { Directory } = await import('expo-file-system');
  const file = new Directory(folderUri).createFile(fileName, PLAIN_BYTES);
  file.write(bytes);
}

async function readEntry(folderUri: string, fileName: string): Promise<Entry> {
  const found = await filesNamed(folderUri, fileName);
  if (found.length === 0) throw new Error('missing');
  return found[0];
}

export async function moveFile(from: DriveItemRef, file: DriveFileRef, into: DriveItemRef): Promise<GraphResult<null>> {
  return attempt(async () => {
    const { File } = await import('expo-file-system');
    const source = new File(file.itemId);
    const bytes = await source.bytes();
    await writeBytes(into.itemId, file.name, bytes);
    source.delete();
    return null;
  }, FileInWords(file.name) + ' could not be moved.');
}

export async function uploadText(folder: DriveItemRef, fileName: string, text: string): Promise<GraphResult<null>> {
  return attempt(async () => {
    await writeBytes(folder.itemId, fileName, text);
    return null;
  }, FileInWords(fileName) + ' could not be written into ' + folder.name + '.');
}

export async function downloadText(folder: DriveItemRef, fileName: string): Promise<GraphResult<string>> {
  return attempt(async () => {
    const { File } = await import('expo-file-system');
    const entry = await readEntry(folder.itemId, fileName);
    return new File(entry.uri).text();
  }, FileInWords(fileName) + ' could not be read.');
}

/** Copies a file kept by the app into the folder, whole. */
export async function uploadFile(folder: DriveItemRef, fileName: string, localUri: string): Promise<GraphResult<null>> {
  return attempt(async () => {
    const { File } = await import('expo-file-system');
    const bytes = await new File(localUri).bytes();
    await writeBytes(folder.itemId, fileName, bytes);
    return null;
  }, FileInWords(fileName) + ' could not be copied into ' + folder.name + '.');
}

/** Copies a file out of the folder to destUri, replacing anything there. */
export async function downloadToFile(folder: DriveItemRef, fileName: string, destUri: string): Promise<GraphResult<null>> {
  return attempt(async () => {
    const { File } = await import('expo-file-system');
    const entry = await readEntry(folder.itemId, fileName);
    const bytes = await new File(entry.uri).bytes();
    const dest = new File(destUri);
    if (dest.exists) dest.delete();
    dest.create();
    dest.write(bytes);
    return null;
  }, FileInWords(fileName) + ' could not be fetched from ' + folder.name + '.');
}

export async function deleteFile(folder: DriveItemRef, fileName: string): Promise<GraphResult<null>> {
  return attempt(async () => {
    await removeNamed(folder.itemId, fileName);
    return null;
  }, FileInWords(fileName) + ' could not be removed.');
}

export async function checkFolder(folder: DriveItemRef): Promise<GraphResult<{ name: string; path?: string }>> {
  try {
    const { Directory } = await import('expo-file-system');
    const directory = new Directory(folder.itemId);
    if (!directory.exists) {
      return {
        ok: false,
        reason:
          'This phone can no longer open ' +
          folder.name +
          '. It may have been moved or removed, or the app that keeps it may have been uninstalled. Choose it again on the Shared Folder screen.',
      };
    }
    // Listing is the honest test: a folder the permission was taken back from
    // still answers that it exists.
    directory.list();
    return { ok: true, value: { name: folder.name, path: folder.path ?? describePhoneAddress(folder.itemId, folder.name) } };
  } catch {
    return {
      ok: false,
      reason: 'This phone is no longer letting Lifestead into ' + folder.name + '. Choose it again on the Shared Folder screen.',
    };
  }
}
