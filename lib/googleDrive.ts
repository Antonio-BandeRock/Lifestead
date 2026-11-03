// The shared folder in Google Drive, answering what lib/oneDriveGraph.ts asks
// of Microsoft Graph.
//
// THE SAME ADDRESS SHAPE, ONE DRIVE ID. A folder here has driveId
// GOOGLE_DRIVE_ID and its itemId is Google's file id for the folder, so
// everything above lib/oneDriveGraph.ts keeps passing DriveItemRefs and
// never knows which service holds them.
//
// WHAT drive.file MEANS FOR THIS FILE. The app sees only what it made
// (lib/googleDriveAuth.ts says why that permission was chosen). So the
// shared folder is always "Google Drive / Lifestead", made here the first
// time, and found again by name in the top of the Drive after that. A folder
// the person made by hand with the same name is not visible to the app, and
// a second Lifestead folder beside it is what they would see.
//
// GOOGLE ALLOWS TWO FILES OF ONE NAME IN A FOLDER, and every reader of the
// shared folder expects one. So a write replaces the first file of that name
// and removes any others, a read takes the newest, and a move removes what
// already had the name where it is going.
//
// WHERE REQUESTS GO FROM. On a phone, from here with the token Play services
// hands out. On a computer, through desktop/googleDrive.js, which attaches
// the token there so it never reaches the window.

import type { DriveFileRef, DriveItemRef, GraphResult } from './oneDriveGraph';
import { desktopBridge, isDesktopApp } from './desktop/bridge';
import { FileInWords, fileInWords } from './fileInWords';
import { forgetGoogleAccessToken, getGoogleAccessToken } from './googleDriveAuth';

/** The driveId of every folder addressed in Google Drive. */
export const GOOGLE_DRIVE_ID = 'gdrive';

export function isGoogleFolder(folder: { driveId: string } | null | undefined): boolean {
  return folder?.driveId === GOOGLE_DRIVE_ID;
}

/** The one folder the app makes at the top of the Drive. */
export const GOOGLE_FOLDER_NAME = 'Lifestead';

const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_TYPE = 'application/vnd.google-apps.folder';
const PLAIN_BYTES = 'application/octet-stream';

/** Past this a file goes up in pieces. Google asks for pieces in multiples of 256 KiB. */
const SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024;
const UPLOAD_PIECE = 256 * 1024 * 40;

type Reply = { status: number; location: string | null; body: Uint8Array };
type Sent = { ok: true; reply: Reply } | { ok: false; reason: string };

const UNREACHABLE = 'Google Drive could not be reached. Check the connection and try again.';

/** What to say about a refused request, from Google's own message when it has one. */
export function googleErrorSentence(status: number, message: string | null): string {
  if (status === 401) {
    return 'Google Drive did not accept the sign-in. Sign in to Google Drive again on the Shared Folder screen.';
  }
  if (status === 403 && message && /storage|quota/i.test(message)) {
    return 'Google Drive is full. Make room in it, or choose another shared folder.';
  }
  if (status === 404) return 'Google Drive no longer has that. It may have been removed or put in the bin.';
  if (status === 408 || status === 429 || status >= 500) {
    return 'Google Drive is busy right now (' + status + '). Try again in a few minutes.';
  }
  return 'Google Drive refused that (' + status + (message ? ', ' + message : '') + '). Try again in a few minutes.';
}

async function sendOnce(method: string, url: string, headers: Record<string, string>, body?: string | Uint8Array): Promise<Sent> {
  if (isDesktopApp()) {
    const bridge = desktopBridge()?.googleDrive;
    if (!bridge) return { ok: false, reason: 'Google Drive needs the newest Lifestead installer on this computer.' };
    try {
      return { ok: true, reply: await bridge.request({ method, url, headers, body }) };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : UNREACHABLE };
    }
  }
  const token = await getGoogleAccessToken();
  if (!token.ok) return { ok: false, reason: token.reason };
  try {
    // expo/fetch, which sends bytes as they are.
    const { fetch: expoFetch } = await import('expo/fetch');
    const response = await expoFetch(url, {
      method,
      headers: { ...headers, Authorization: 'Bearer ' + token.token },
      body: body as unknown as ArrayBuffer | undefined,
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { ok: true, reply: { status: response.status, location: response.headers.get('location'), body: bytes } };
  } catch {
    return { ok: false, reason: UNREACHABLE };
  }
}

/** Sends a request, asking for a fresh token once when Google refuses this one. */
async function send(method: string, url: string, headers: Record<string, string> = {}, body?: string | Uint8Array): Promise<Sent> {
  let sent = await sendOnce(method, url, headers, body);
  if (sent.ok && sent.reply.status === 401 && !isDesktopApp()) {
    forgetGoogleAccessToken();
    sent = await sendOnce(method, url, headers, body);
  }
  return sent;
}

function text(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function refusal(reply: Reply): { ok: false; reason: string } {
  let message: string | null = null;
  try {
    const parsed = JSON.parse(text(reply.body)) as { error?: { message?: string } };
    message = parsed.error?.message ?? null;
  } catch {
    // A body that is not JSON leaves the status sentence.
  }
  return { ok: false, reason: googleErrorSentence(reply.status, message) };
}

/** A request whose answer is JSON. */
async function call<T>(method: string, url: string, init?: { json?: unknown }): Promise<GraphResult<T>> {
  const sent = await send(
    method,
    url,
    init?.json !== undefined ? { 'Content-Type': 'application/json; charset=UTF-8' } : {},
    init?.json !== undefined ? JSON.stringify(init.json) : undefined,
  );
  if (!sent.ok) return sent;
  if (sent.reply.status >= 300) return refusal(sent.reply);
  if (sent.reply.body.length === 0) return { ok: true, value: null as T };
  try {
    return { ok: true, value: JSON.parse(text(sent.reply.body)) as T };
  } catch {
    return { ok: false, reason: 'Google Drive sent back something this app could not read.' };
  }
}

/** Quotes a value for a Drive search. */
function quoted(value: string): string {
  return "'" + value.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

type DriveEntry = { id: string; name: string; mimeType?: string; modifiedTime?: string };

/** Everything matching a search, every page of it. */
async function search(query: string): Promise<GraphResult<DriveEntry[]>> {
  const found: DriveEntry[] = [];
  let pageToken: string | null = null;
  do {
    const params = new URLSearchParams({
      q: query,
      fields: 'nextPageToken,files(id,name,mimeType,modifiedTime)',
      pageSize: '1000',
      orderBy: 'modifiedTime desc',
      spaces: 'drive',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const page: GraphResult<{ files?: DriveEntry[]; nextPageToken?: string }> = await call('GET', API + '?' + params.toString());
    if (!page.ok) return page;
    found.push(...(page.value?.files ?? []));
    pageToken = page.value?.nextPageToken ?? null;
  } while (pageToken);
  return { ok: true, value: found };
}

function folderRef(entry: DriveEntry, parentPath: string): DriveItemRef {
  return { driveId: GOOGLE_DRIVE_ID, itemId: entry.id, name: entry.name, path: parentPath + ' / ' + entry.name };
}

function pathOf(folder: DriveItemRef): string {
  return folder.path ?? 'Google Drive / ' + folder.name;
}

/** Files of this name in a folder, newest first. */
async function filesNamed(folder: DriveItemRef, fileName: string): Promise<GraphResult<DriveEntry[]>> {
  return search(quoted(folder.itemId) + ' in parents and name = ' + quoted(fileName) + ' and mimeType != ' + quoted(FOLDER_TYPE) + ' and trashed = false');
}

/**
 * "Google Drive / Lifestead", found or made. The only folder the app chooses
 * on its own, since drive.file shows it nothing else to choose from.
 */
export async function findOrMakeLifesteadFolder(): Promise<GraphResult<DriveItemRef>> {
  const top: DriveItemRef = { driveId: GOOGLE_DRIVE_ID, itemId: 'root', name: 'Google Drive', path: 'Google Drive' };
  const found = await search("'root' in parents and name = " + quoted(GOOGLE_FOLDER_NAME) + ' and mimeType = ' + quoted(FOLDER_TYPE) + ' and trashed = false');
  if (!found.ok) return found;
  if (found.value.length > 0) {
    // The oldest one, so two devices setting up close together settle on the same folder.
    const oldest = found.value[found.value.length - 1];
    return { ok: true, value: folderRef(oldest, 'Google Drive') };
  }
  return createFolder(top, GOOGLE_FOLDER_NAME);
}

export async function listChildFolders(parent: DriveItemRef): Promise<GraphResult<DriveItemRef[]>> {
  const found = await search(quoted(parent.itemId) + ' in parents and mimeType = ' + quoted(FOLDER_TYPE) + ' and trashed = false');
  if (!found.ok) return found;
  // Oldest first, so ensureChildFolder settles on the first one made.
  return { ok: true, value: [...found.value].reverse().map((entry) => folderRef(entry, pathOf(parent))) };
}

export async function createFolder(parent: DriveItemRef, name: string): Promise<GraphResult<DriveItemRef>> {
  const made = await call<DriveEntry>('POST', API + '?fields=id,name', {
    json: { name, mimeType: FOLDER_TYPE, parents: [parent.itemId] },
  });
  if (!made.ok) return made;
  if (!made.value?.id) return { ok: false, reason: 'The folder was made but Google Drive did not say where.' };
  return { ok: true, value: folderRef(made.value, pathOf(parent)) };
}

export async function listFiles(folder: DriveItemRef): Promise<GraphResult<DriveFileRef[]>> {
  const found = await search(quoted(folder.itemId) + ' in parents and mimeType != ' + quoted(FOLDER_TYPE) + ' and trashed = false');
  if (!found.ok) return found;
  // One name once, the newest, since the readers above expect one file per name.
  const seen = new Set<string>();
  const files: DriveFileRef[] = [];
  for (const entry of found.value) {
    if (seen.has(entry.name)) continue;
    seen.add(entry.name);
    files.push({ itemId: entry.id, name: entry.name });
  }
  return { ok: true, value: files };
}

export async function listFileNames(folder: DriveItemRef): Promise<GraphResult<string[]>> {
  const listed = await listFiles(folder);
  return listed.ok ? { ok: true, value: listed.value.map((file) => file.name) } : listed;
}

async function removeEntries(entries: DriveEntry[]): Promise<GraphResult<null>> {
  for (const entry of entries) {
    const removed = await call('DELETE', API + '/' + encodeURIComponent(entry.id));
    if (!removed.ok && !/no longer has/.test(removed.reason)) return removed;
  }
  return { ok: true, value: null };
}

/** The id of the file of this name, made empty when there is none, with any extra copies removed. */
async function fileToWrite(folder: DriveItemRef, fileName: string, mimeType: string): Promise<GraphResult<string>> {
  const existing = await filesNamed(folder, fileName);
  if (!existing.ok) return existing;
  if (existing.value.length > 0) {
    const [keep, ...extra] = existing.value;
    const cleared = await removeEntries(extra);
    if (!cleared.ok) return cleared;
    return { ok: true, value: keep.id };
  }
  const made = await call<DriveEntry>('POST', API + '?fields=id,name', {
    json: { name: fileName, parents: [folder.itemId], mimeType },
  });
  if (!made.ok) return made;
  if (!made.value?.id) return { ok: false, reason: 'Google Drive did not say where ' + fileInWords(fileName) + ' went.' };
  return { ok: true, value: made.value.id };
}

/** Puts bytes into a file Google already has, whole or in pieces. */
async function writeInto(fileId: string, bytes: Uint8Array | string, mimeType: string, fileName: string): Promise<GraphResult<null>> {
  const size = typeof bytes === 'string' ? new TextEncoder().encode(bytes).length : bytes.length;
  if (size <= SIMPLE_UPLOAD_LIMIT) {
    const sent = await send('PATCH', UPLOAD + '/' + encodeURIComponent(fileId) + '?uploadType=media', { 'Content-Type': mimeType }, bytes);
    if (!sent.ok) return sent;
    return sent.reply.status >= 300 ? refusal(sent.reply) : { ok: true, value: null };
  }
  const whole = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  const opened = await send(
    'PATCH',
    UPLOAD + '/' + encodeURIComponent(fileId) + '?uploadType=resumable',
    { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mimeType, 'X-Upload-Content-Length': String(size) },
    '{}',
  );
  if (!opened.ok) return opened;
  if (opened.reply.status >= 300) return refusal(opened.reply);
  const address = opened.reply.location;
  if (!address) return { ok: false, reason: 'Google Drive did not say where to send ' + fileInWords(fileName) + '.' };
  let start = 0;
  while (start < size) {
    const piece = whole.subarray(start, Math.min(size, start + UPLOAD_PIECE));
    const sent = await send('PUT', address, { 'Content-Range': 'bytes ' + start + '-' + (start + piece.length - 1) + '/' + size }, piece);
    if (!sent.ok) return sent;
    // 308 means keep going; anything else in the 300s or above is a refusal.
    if (sent.reply.status !== 308 && sent.reply.status >= 300) return refusal(sent.reply);
    start += piece.length;
  }
  return { ok: true, value: null };
}

async function writeNamed(folder: DriveItemRef, fileName: string, bytes: Uint8Array | string, mimeType: string): Promise<GraphResult<null>> {
  const target = await fileToWrite(folder, fileName, mimeType);
  if (!target.ok) return target;
  return writeInto(target.value, bytes, mimeType, fileName);
}

/** A file's bytes, the newest of that name. */
export async function readFileBytes(folder: DriveItemRef, fileName: string): Promise<GraphResult<Uint8Array>> {
  const found = await filesNamed(folder, fileName);
  if (!found.ok) return found;
  if (found.value.length === 0) return { ok: false, reason: FileInWords(fileName) + ' is not in ' + folder.name + '.' };
  const sent = await send('GET', API + '/' + encodeURIComponent(found.value[0].id) + '?alt=media');
  if (!sent.ok) return sent;
  if (sent.reply.status >= 300) return refusal(sent.reply);
  return { ok: true, value: sent.reply.body };
}

export async function moveFile(from: DriveItemRef, file: DriveFileRef, into: DriveItemRef): Promise<GraphResult<null>> {
  const already = await filesNamed(into, file.name);
  if (!already.ok) return already;
  const cleared = await removeEntries(already.value.filter((entry) => entry.id !== file.itemId));
  if (!cleared.ok) return cleared;
  const moved = await call(
    'PATCH',
    API + '/' + encodeURIComponent(file.itemId) + '?addParents=' + encodeURIComponent(into.itemId) + '&removeParents=' + encodeURIComponent(from.itemId),
    { json: {} },
  );
  return moved.ok ? { ok: true, value: null } : moved;
}

export async function uploadText(folder: DriveItemRef, fileName: string, body: string): Promise<GraphResult<null>> {
  const written = await writeNamed(folder, fileName, body, PLAIN_BYTES);
  return written.ok ? written : { ok: false, reason: written.reason };
}

export async function downloadText(folder: DriveItemRef, fileName: string): Promise<GraphResult<string>> {
  const read = await readFileBytes(folder, fileName);
  return read.ok ? { ok: true, value: text(read.value) } : read;
}

/** Copies a file kept by the app into the folder, replacing one of the same name. */
export async function uploadFile(folder: DriveItemRef, fileName: string, localUri: string, mimeType: string): Promise<GraphResult<null>> {
  let bytes: Uint8Array;
  try {
    const { File } = await import('expo-file-system');
    const file = new File(localUri);
    if (!file.exists) return { ok: false, reason: FileInWords(fileName) + ' is not on this device.' };
    bytes = await file.bytes();
  } catch {
    return { ok: false, reason: FileInWords(fileName) + ' could not be read on this device.' };
  }
  return writeNamed(folder, fileName, bytes, mimeType || PLAIN_BYTES);
}

/** Copies a file out of the folder to destUri, replacing anything there. */
export async function downloadToFile(folder: DriveItemRef, fileName: string, destUri: string): Promise<GraphResult<null>> {
  const read = await readFileBytes(folder, fileName);
  if (!read.ok) return read;
  try {
    const { File } = await import('expo-file-system');
    const dest = new File(destUri);
    if (dest.exists) dest.delete();
    dest.create();
    dest.write(read.value);
    return { ok: true, value: null };
  } catch {
    return { ok: false, reason: FileInWords(fileName) + ' could not be saved on this device.' };
  }
}

export async function deleteFile(folder: DriveItemRef, fileName: string): Promise<GraphResult<null>> {
  const found = await filesNamed(folder, fileName);
  if (!found.ok) return found;
  return removeEntries(found.value);
}

export async function checkFolder(folder: DriveItemRef): Promise<GraphResult<{ name: string; path?: string }>> {
  const read = await call<{ id?: string; name?: string; mimeType?: string; trashed?: boolean }>(
    'GET',
    API + '/' + encodeURIComponent(folder.itemId) + '?fields=id,name,mimeType,trashed',
  );
  if (!read.ok) return read;
  if (read.value?.trashed) {
    return { ok: false, reason: folder.name + ' is in the Google Drive bin. Take it out of the bin, or tap Use Google Drive to make a new one.' };
  }
  if (read.value?.mimeType !== FOLDER_TYPE) return { ok: false, reason: 'That is no longer a folder in Google Drive.' };
  const name = read.value.name ?? folder.name;
  return { ok: true, value: { name, path: folder.path ?? 'Google Drive / ' + name } };
}
