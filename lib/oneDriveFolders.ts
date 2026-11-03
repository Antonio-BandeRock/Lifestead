// The one folder somebody chooses, and the shape the app keeps inside it.
//
// THE CORRECTION THIS FILE EXISTS FOR. An earlier pass asked for two folders to
// be chosen separately, one for the mailbox and one for backups, which put the
// person in charge of a layout the app should be keeping itself. The right shape
// was stated plainly: one Shared Folder, made when the app is first opened
// whether or not anybody is ever added as a partner, with everything the app
// keeps in OneDrive living under it.
//
//   Shared Folder            what the person picks, once
//   |- Mailbox               where every person's mailbox lives
//   |- Backups               where backups are written
//   |- Photos                every photo, encrypted, one file each
//   |- Recordings            audio somebody brought in, one file each
//   |- Files                 files attached to a record, encrypted, one each
//   |- Videos                held for video, made only when the first is kept
//
// EACH KIND OF FILE HAS A FOLDER OF ITS OWN (2026-09-30, by direct
// instruction: "keep each file type grouped accordingly"). The shared
// folder is where photos and recordings live; a device keeps thumbnails and
// a cache of what was opened lately (lib/media.ts), so neither device fills
// up. Photos sat inside Backups before 1.0.57.23, and a pass moves them.
//
// MAILBOX IS A CONTAINER FOR EVERYBODY'S MAIL, not one person's inbox. Files in
// it are already named for who they are addressed to and who they came from, so
// a partner and, later, a child all use the same folder without seeing each
// other's mail: lib/syncInbox.ts's own incomingFilesFor drops anything not
// addressed to this device before a byte is downloaded.
//
// BACKUPS SITS UNDER THE SHARED FOLDER TOO, by direct decision. That has a
// consequence worth being straight about rather than burying: whoever the Shared
// Folder is shared with in OneDrive can see the Backups folder inside it, and a
// backup is the whole record. The app says so on the screen where the folder is
// chosen rather than leaving somebody to work it out.
//
// LOOKED UP BY NAME, NOT REMEMBERED BY ID. Somebody can delete or recreate
// either child in OneDrive, and an id remembered from months ago would point at
// nothing while the folder they can plainly see sits there unused.
//
// ONE FOLDER, CHOSEN ON EITHER KIND OF DEVICE. A phone stores the folder's
// Graph address; a computer stores its path on the disk (driveId 'disk',
// lib/desktop/cloudFolder.ts). A backup restored across the two carries the
// other kind's address, so getSharedFolder reads the stored folder's path
// sentence ("OneDrive / Apps / Lifestead") back into a folder on this
// computer when it can, and says plainly where the folder was chosen when it
// cannot, rather than reporting a Graph error about an id that means nothing
// here or a disk path that means nothing on a phone.

import { getOneDriveFolder, setMailboxFolderName, setOneDriveFolder, type StoredOneDriveFolder } from './db';
import { isDesktopApp } from './desktop/bridge';
import { folderFromPhonePath, isDiskFolder } from './desktop/cloudFolder';
import { FILES_FOLDER_NAME } from './attachments';
import { PHOTOS_FOLDER_NAME, RECORDINGS_FOLDER_NAME } from './media';
import { isSignedIn } from './oneDriveAuth';
import { findOrMakeLifesteadFolder, isGoogleFolder } from './googleDrive';
import { isGoogleSignedIn } from './googleDriveAuth';
import { isPhoneFolder } from './phoneFolder';
import {
  checkFolder,
  ensureChildFolder,
  folderFromComputerPath,
  getMyDriveId,
  listMyRootFolders,
  type DriveItemRef,
  type GraphResult,
} from './oneDriveGraph';

/** What the two children are called. Fixed, because the app owns them. */
export const MAILBOX_FOLDER_NAME = 'Mailbox';
export const BACKUPS_FOLDER_NAME = 'Backups';

/** Every folder the app keeps under the shared folder. */
export type ChildFolder = 'mailbox' | 'backups' | 'photos' | 'recordings' | 'files';

/**
 * Resolved children, kept only for the life of this app run.
 *
 * Resolving costs a listing of the shared folder, and sending, checking and
 * backing up would each pay it. Not persisted: a folder deleted in OneDrive
 * between runs should be found missing and made again, which is exactly what
 * starting from nothing each run gives.
 */
let cache: { rootItemId: string; children: Partial<Record<ChildFolder, DriveItemRef>> } | null = null;

export type SharedFolderState =
  | { state: 'notSignedIn'; service?: 'google' }
  | { state: 'notSetUp' }
  | { state: 'unreachable'; name: string; reason: string }
  | { state: 'ready'; folder: DriveItemRef };

/**
 * The Shared Folder, confirmed to still be there.
 *
 * Re-checked rather than trusted, because a folder can be renamed, moved or
 * deleted long after it was picked, and finding that out when somebody taps Send
 * is worse than finding it out on the screen that shows it. A rename or a move
 * is not a problem; the stored copy is brought back in line and used.
 */
export async function getSharedFolder(): Promise<SharedFolderState> {
  let stored = await getOneDriveFolder();
  // A folder on this phone needs no sign-in: the app that keeps it in step
  // is signed in to its own service.
  // A folder in Google Drive answers to the Google sign-in, and its address
  // is the same on a phone and a computer, so neither repair below applies.
  if (isGoogleFolder(stored)) {
    if (!(await isGoogleSignedIn())) return { state: 'notSignedIn', service: 'google' };
  } else if (!isPhoneFolder(stored) && !(await isSignedIn())) {
    return { state: 'notSignedIn' };
  }
  if (!stored) return { state: 'notSetUp' };

  if (isDesktopApp() && !isDiskFolder(stored) && !isGoogleFolder(stored)) {
    // Chosen on a phone. Its path sentence names the same folder under
    // OneDrive on this computer, if that folder is here.
    const adopted = await folderFromPhonePath(stored.path);
    if (!adopted) {
      return {
        state: 'unreachable',
        name: stored.name,
        reason:
          'That folder was chosen on a phone' +
          (stored.path ? ' (' + stored.path + ')' : '') +
          ', and no folder at that place was found in OneDrive on this computer. Choose it again on the Shared Folder screen.',
      };
    }
    stored = { ...adopted };
    await setOneDriveFolder(stored);
    return { state: 'ready', folder: stored };
  }

  if (!isDesktopApp() && isDiskFolder(stored) && !isGoogleFolder(stored)) {
    // Chosen on a computer, and the sentence it stored names the same
    // folder in this OneDrive. Both directions repair themselves now: a
    // phone that loaded a snapshot saved on a computer used to be left
    // holding a Windows path, which read as no shared folder at all
    // (1.0.42.30). Device-local rows stay out of a snapshot from that
    // build on, so this is for phones already in that state and for a
    // folder restored from an older backup.
    const adopted = await folderFromComputerPath(stored.path);
    if (adopted) {
      stored = { ...adopted };
      await setOneDriveFolder(stored);
      return { state: 'ready', folder: stored };
    }
    return {
      state: 'unreachable',
      name: stored.name,
      reason:
        'That folder was chosen on a computer' +
        (stored.path ? ' (' + stored.path + ')' : '') +
        ', and no folder at that place was found in OneDrive on this phone. Choose it again on the Shared Folder screen.',
    };
  }

  const checked = await checkFolder(stored);
  if (!checked.ok) {
    return { state: 'unreachable', name: stored.name, reason: checked.reason };
  }

  if (checked.value.name !== stored.name || checked.value.path !== stored.path) {
    const refreshed: StoredOneDriveFolder = {
      ...stored,
      name: checked.value.name,
      path: checked.value.path,
    };
    await setOneDriveFolder(refreshed);
    return { state: 'ready', folder: refreshed };
  }

  return { state: 'ready', folder: stored };
}

/**
 * Whether this device can reach a shared folder at all: signed in to
 * OneDrive or Google Drive, or using a folder on this phone, which needs no
 * sign-in.
 */
export async function isSharedFolderConnected(): Promise<boolean> {
  const stored = await getOneDriveFolder();
  if (isPhoneFolder(stored)) return true;
  if (isGoogleFolder(stored)) return isGoogleSignedIn();
  return isSignedIn();
}

/** Wording for a shared folder that is not usable, said the same way everywhere. */
export function describeSharedFolderProblem(state: SharedFolderState): string {
  switch (state.state) {
    case 'notSignedIn':
      return state.service === 'google'
        ? 'Sign in to Google Drive first, on the Shared Folder screen.'
        : 'Sign in to OneDrive first, on the Shared Folder screen.';
    case 'notSetUp':
      return 'No shared folder set up yet. Set one up on the Shared Folder screen.';
    case 'unreachable':
      return state.name + ' could not be opened. ' + state.reason;
    case 'ready':
      return state.folder.path ?? state.folder.name;
  }
}

async function resolveChild(
  which: ChildFolder,
  name: string,
): Promise<GraphResult<DriveItemRef> | { ok: false; reason: string }> {
  const shared = await getSharedFolder();
  if (shared.state !== 'ready') {
    return { ok: false, reason: describeSharedFolderProblem(shared) };
  }

  if (cache && cache.rootItemId === shared.folder.itemId) {
    const hit = cache.children[which];
    if (hit) return { ok: true, value: hit };
  } else {
    // A different shared folder means every remembered child belongs to the old
    // one and none of it applies.
    cache = { rootItemId: shared.folder.itemId, children: {} };
  }

  const made = await ensureChildFolder(shared.folder, name);
  if (!made.ok) return made;
  const rootItemId = shared.folder.itemId;
  const kept = cache && cache.rootItemId === rootItemId ? cache.children : {};
  cache = { rootItemId, children: { ...kept, [which]: made.value } };
  return made;
}

/** Where every mailbox lives, made inside the shared folder if it is missing. */
export async function getMailboxFolder(): Promise<GraphResult<DriveItemRef>> {
  return resolveChild('mailbox', MAILBOX_FOLDER_NAME) as Promise<GraphResult<DriveItemRef>>;
}

/** Where backups are written, made inside the shared folder if it is missing. */
export async function getBackupsFolder(): Promise<GraphResult<DriveItemRef>> {
  return resolveChild('backups', BACKUPS_FOLDER_NAME) as Promise<GraphResult<DriveItemRef>>;
}

/** Where every photo's encrypted copy lives, made if it is missing. */
export async function getPhotosFolder(): Promise<GraphResult<DriveItemRef>> {
  return resolveChild('photos', PHOTOS_FOLDER_NAME) as Promise<GraphResult<DriveItemRef>>;
}

/** Where recordings live, made if it is missing. */
export async function getRecordingsFolder(): Promise<GraphResult<DriveItemRef>> {
  return resolveChild('recordings', RECORDINGS_FOLDER_NAME) as Promise<GraphResult<DriveItemRef>>;
}

/** Where every attached file's encrypted copy lives, made if it is missing. */
export async function getFilesFolder(): Promise<GraphResult<DriveItemRef>> {
  return resolveChild('files', FILES_FOLDER_NAME) as Promise<GraphResult<DriveItemRef>>;
}

/**
 * Makes both children now, rather than on first use.
 *
 * Called when a shared folder is chosen, so somebody can open OneDrive straight
 * afterwards and see the shape they were told about. Finding an empty folder
 * where the app said Mailbox and Backups would be is the kind of small
 * discrepancy that makes people stop trusting the rest of it.
 */
export async function prepareSharedFolder(): Promise<{ ok: boolean; reason?: string }> {
  cache = null;
  // Every folder the app keeps, so the shape described on the screen is the
  // shape somebody finds. Videos waits for the first video.
  for (const make of [getMailboxFolder, getBackupsFolder, getPhotosFolder, getRecordingsFolder, getFilesFolder]) {
    const made = await make();
    if (!made.ok) return { ok: false, reason: made.reason };
  }
  return { ok: true };
}

/** Where the app makes its folder when nobody has chosen one. */
export const DEFAULT_FOLDER_PARENT = 'Apps';
export const DEFAULT_FOLDER_NAME = 'Lifestead';
export const DEFAULT_FOLDER_SENTENCE = 'OneDrive / ' + DEFAULT_FOLDER_PARENT + ' / ' + DEFAULT_FOLDER_NAME;

/**
 * Apps / Lifestead in this OneDrive, found if it is there and made if it is
 * not (1.0.80.2, by direct instruction: "if we can automate the creation of
 * their Lifestead folder structure, we should").
 *
 * Found before made, so a second device signing in to the same account lands
 * on the folder the first one made rather than a Lifestead 1 beside it. A
 * computer with two OneDrive folders (a personal account and a work one) is
 * not guessed between: it returns null and the person chooses.
 */
export async function findOrMakeDefaultFolder(): Promise<GraphResult<DriveItemRef | null>> {
  let top: DriveItemRef;
  if (isDesktopApp()) {
    const existing = await folderFromPhonePath(DEFAULT_FOLDER_SENTENCE);
    if (existing) return { ok: true, value: existing };
    const roots = await listMyRootFolders();
    if (!roots.ok) return roots;
    if (roots.value.length !== 1) return { ok: true, value: null };
    top = roots.value[0];
  } else {
    if (!(await isSignedIn())) return { ok: true, value: null };
    const drive = await getMyDriveId();
    if (!drive.ok) return drive;
    // Graph reads "root" as the top of the drive.
    top = { driveId: drive.value, itemId: 'root', name: 'OneDrive', path: 'OneDrive' };
  }
  const apps = await ensureChildFolder(top, DEFAULT_FOLDER_PARENT);
  if (!apps.ok) return apps;
  const lifestead = await ensureChildFolder(apps.value, DEFAULT_FOLDER_NAME);
  if (!lifestead.ok) return lifestead;
  return { ok: true, value: { ...lifestead.value, path: lifestead.value.path ?? DEFAULT_FOLDER_SENTENCE } };
}

/** The folders made inside the shared folder, named the way the screen says them. */
export const SHARED_FOLDER_CHILDREN_SENTENCE =
  MAILBOX_FOLDER_NAME + ', ' + BACKUPS_FOLDER_NAME + ', Photos, Recordings and Files';

/**
 * Sets up Apps / Lifestead as the shared folder when none has been chosen,
 * with every folder inside it, and says what was done. Null when a folder is
 * already chosen or this device cannot make one without being asked which.
 */
export async function adoptDefaultFolderIfNone(): Promise<{ folder: DriveItemRef; note: string } | null> {
  if (await getOneDriveFolder()) return null;
  const found = await findOrMakeDefaultFolder();
  if (!found.ok || !found.value) return null;
  await setOneDriveFolder(found.value);
  await setMailboxFolderName(found.value.name);
  forgetResolvedFolders();
  const prepared = await prepareSharedFolder();
  const shared = await getSharedFolder();
  const folder = shared.state === 'ready' ? shared.folder : found.value;
  const where = folder.path ?? DEFAULT_FOLDER_SENTENCE;
  return {
    folder,
    note: prepared.ok
      ? 'Your shared folder is ' + where + ', with ' + SHARED_FOLDER_CHILDREN_SENTENCE + ' inside it. Choose a different folder below if you would rather.'
      : 'Your shared folder is ' + where + ', but its folders could not all be made yet. ' + (prepared.reason ?? ''),
  };
}

/** The folder Google Drive keeps, named the way the screen says it. */
export const GOOGLE_FOLDER_SENTENCE = 'Google Drive / Lifestead';

/**
 * Google Drive / Lifestead as the shared folder, with every folder inside it.
 * The only Google folder there is to choose, since the app sees only what it
 * made (lib/googleDrive.ts).
 */
export async function chooseGoogleFolder(): Promise<{ ok: true; folder: DriveItemRef; note: string } | { ok: false; reason: string }> {
  const found = await findOrMakeLifesteadFolder();
  if (!found.ok) return found;
  await setOneDriveFolder(found.value);
  await setMailboxFolderName(found.value.name);
  forgetResolvedFolders();
  const prepared = await prepareSharedFolder();
  const where = found.value.path ?? GOOGLE_FOLDER_SENTENCE;
  return {
    ok: true,
    folder: found.value,
    note: prepared.ok
      ? 'Your shared folder is ' + where + ', with ' + SHARED_FOLDER_CHILDREN_SENTENCE + ' inside it. Sign in to the same Google account on your other device and tap Use Google Drive there too.'
      : 'Your shared folder is ' + where + ', but its folders could not all be made yet. ' + (prepared.reason ?? ''),
  };
}

/** Drops what was resolved, for a sign-out or a change of folder. */
export function forgetResolvedFolders(): void {
  cache = null;
}
