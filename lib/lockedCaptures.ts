// Notes and photos taken over the phone's lock screen (1.0.62.1).
//
// Direct request, 2026-10-05: "You'd pull down the tile or tap a button on a
// notification you keep in the shade, enter your Lifestead code, speak,
// and it saves. The phone stays locked the whole time." And for the camera:
// "Taken while the phone is locked, it would be sealed the same way, so the
// photo can't be looked at until you unlock."
//
// The capture screen over the lock screen (components/LockedCaptureScreen.tsx)
// cannot open the database and asks for no code (2026-10-07: one step, never
// unlocking the phone or the app). What was said or photographed is
// sealed to the same public key reminder presses use (lib/lockedAnswers.ts)
// and kept as one file per capture in a folder beside the lock file. The
// locked app can add files and cannot read them back. The next time Inside
// Story is open and unlocked, every file is opened, written into Capture as a
// spoken or photo note with the time it was taken, and deleted.
//
// Nothing readable sits outside the encryption: the folder holds only sealed
// files, named by when they were taken, and the photo's plain copies the
// camera and the shrinking made are deleted before the screen says Saved.
//
// Commands said over the lock screen (voice step 3, 1.0.66.21). "Remind me
// to call the pharmacy tomorrow at 10" and "count down 2 hours" are read
// there by lib/spokenCommand.ts. A reminder or a timer is queued with the
// phone at once, counted from when it was said, since waiting for an unlock
// could make it late; the words and time go into the sealed file like any
// note, so the notification is the only thing outside it, worded as the
// lock's reminder setting says. At unlock the command is written as the
// reminder or counter itself, and a card lists what was done, each with
// Undo (components/UnlockSummaryHost.tsx). Anything not definite (no clock
// time, "this evening") is kept as a plain note: nothing is guessed.

import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { openSealedForUnlock, sealForUnlock } from './appLock';
import { heldDataKey, readLockStateSync } from './appLockSession';
import { base64ToBytesFast, bytesToBase64Fast } from './localSeal';
import type { RepeatConfig } from './repeatRule';
import { describeDuration, describeTimerEnd, readSpokenCommand, timerEndsAt, type SpokenCommand } from './spokenCommand';

const FOLDER_NAME = 'locked-captures';
const SEALED_SUFFIX = '.sealed';
// Turning the lock off opens every sealed capture into one of these, since
// the key that opens them is thrown away with the lock (the same reasoning
// as lockedAnswers.ts's UNSEALED_FILE_NAME).
const OPENED_SUFFIX = '.opened.json';

// Set while the capture screen over the lock screen is up. It runs in the
// same JavaScript as the app, so the app sees itself become active when that
// screen opens; the lock gate reads this so it does not take that for the
// person coming back (components/AppLockGate.tsx).
let captureScreenShowing = false;

export function setLockedCaptureShowing(showing: boolean): void {
  captureScreenShowing = showing;
}

export function isLockedCaptureShowing(): boolean {
  return captureScreenShowing;
}


/** What a spoken capture asked for, read when it was said. The ids are made
 *  then, so the reminder queued over the lock screen and the row written at
 *  unlock are the same reminder. */
export type LockedCommand =
  | { kind: 'reminder'; id: string; title: string; scheduledFor: string; repeat: RepeatConfig; label: string }
  | { kind: 'timer'; id: string; title: string; minutes: number; endsAt: string }
  | { kind: 'days'; id: string; title: string; days: number };

export type LockedCapture = {
  kind: 'spoken' | 'photo';
  text: string;
  takenAt: string;
  /** JPEG bytes in base64, for a photo. */
  photo: string | null;
  width: number;
  height: number;
  /** Set on a spoken capture that asked for a reminder or a counter. */
  command?: LockedCommand | null;
};

function folder(): Directory {
  return new Directory(Paths.document, FOLDER_NAME);
}

async function randomBytes(count: number): Promise<Uint8Array> {
  const Crypto = await import('expo-crypto');
  return Crypto.getRandomBytesAsync(count);
}

/** Whether a capture can be sealed now: the lock is on and its file has the key to seal to. */
export function canSealCaptures(): boolean {
  const state = readLockStateSync();
  const publicKey = state?.answerBoxPublicKey ? base64ToBytesFast(state.answerBoxPublicKey) : null;
  return publicKey !== null && publicKey.length === 32;
}

/** Seals one capture for the next unlock. False when there is no key to seal to. */
export async function keepCaptureForUnlock(capture: LockedCapture): Promise<boolean> {
  const state = readLockStateSync();
  const publicKey = state?.answerBoxPublicKey ? base64ToBytesFast(state.answerBoxPublicKey) : null;
  if (!publicKey || publicKey.length !== 32) return false;
  const sealed = sealForUnlock(JSON.stringify(capture), publicKey, await randomBytes(32), await randomBytes(24));
  const dir = folder();
  dir.create({ intermediates: true, idempotent: true });
  const name = `${Date.parse(capture.takenAt) || Date.now()}-${bytesToBase64Fast(await randomBytes(6)).replace(/[^A-Za-z0-9]/g, '')}`;
  new File(dir, `${name}${SEALED_SUFFIX}`).write(sealed);
  return true;
}

/** What the capture screen says once spoken words are kept. */
export type SpokenKept = {
  /** The heading: "Reminder set", "Timer started", "Counter kept", "Note kept". */
  heading: string;
  /** One line saying what was set and when, or null for a plain note. */
  line: string | null;
  /** Why a reminder was asked for and not set, or null. */
  notSet: string | null;
};

function newId(prefix: string, suffix = ''): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${suffix}`;
}

function plural(count: number, one: string): string {
  return `${count} ${count === 1 ? one : `${one}s`}`;
}

/**
 * Seals spoken words for the next unlock, reading them for a command first.
 * A definite reminder or a timer is queued with the phone now. Answers what
 * was done, or null when there is no key to seal to (and then nothing was
 * queued either).
 */
export async function keepSpokenForUnlock(text: string, takenAt: Date): Promise<SpokenKept | null> {
  if (!canSealCaptures()) return null;
  const read = readSpokenCommand(text, takenAt);
  const { command, kept } = commandFromSpoken(read, takenAt);
  if (read.kind === 'reminderAsk') {
    kept.notSet = `${read.unclear} It is kept as a note, and a time can be picked for it in Capture.`;
  }
  const notifications = command && command.kind !== 'days' ? await import('./reminderNotifications') : null;
  if (notifications && command?.kind === 'reminder') {
    await notifications.queueReminderNow({ id: command.id, title: command.title, scheduledFor: command.scheduledFor });
  } else if (notifications && command?.kind === 'timer') {
    await notifications.queueTimerEndNow({
      id: command.id,
      name: command.title,
      startedAt: takenAt.toISOString(),
      endsAt: command.endsAt,
    });
  }
  const sealed = await keepCaptureForUnlock({
    kind: 'spoken',
    text,
    takenAt: takenAt.toISOString(),
    photo: null,
    width: 0,
    height: 0,
    command,
  });
  if (!sealed) {
    if (notifications && command && command.kind !== 'days') await notifications.cancelQueuedNow(command.kind, command.id);
    return null;
  }
  return kept;
}

/** What spoken words ask to be made, with the line that says so. A plain
 *  note, or a reminder with no clear time, makes nothing. Shared by the
 *  capture over the lock screen and the quick voice note in the app. */
export function commandFromSpoken(read: SpokenCommand, saidAt: Date): { command: LockedCommand | null; kept: SpokenKept } {
  let command: LockedCommand | null = null;
  let kept: SpokenKept = { heading: 'Note kept', line: null, notSet: null };
  if (read.kind === 'reminder') {
    command = {
      kind: 'reminder',
      id: newId('schedule_item', '_0'),
      title: read.title,
      scheduledFor: read.when.scheduledFor,
      repeat: read.repeat,
      label: read.when.label,
    };
    kept = { heading: 'Reminder set', line: `${read.title}, ${read.when.label}`, notSet: null };
  } else if (read.kind === 'timer') {
    const endsAt = timerEndsAt(saidAt, read.minutes);
    const title = read.title ?? `${describeDuration(read.minutes)} timer`;
    command = { kind: 'timer', id: newId('freecount'), title, minutes: read.minutes, endsAt };
    kept = {
      heading: 'Timer started',
      line: `${title}: ${describeDuration(read.minutes)}, ending ${describeTimerEnd(endsAt, saidAt)}`,
      notSet: null,
    };
  } else if (read.kind === 'days') {
    const title = read.title ?? plural(read.days, 'day');
    command = { kind: 'days', id: newId('freecount'), title, days: read.days };
    kept = { heading: 'Counter kept', line: `${title}: ${plural(read.days, 'day')} from today`, notSet: null };
  }
  return { command, kept };
}

// --- What was done at unlock ------------------------------------------------

/** One thing a command said over the lock screen made, for the card at unlock. */
export type UnlockDone = {
  kind: 'reminder' | 'timer' | 'days';
  id: string;
  /** "Reminder: Call the pharmacy, Tomorrow at 10:00 AM". */
  line: string;
  /** The words as said, kept as a note if this is undone. */
  text: string;
  takenAt: string;
};

let unlockDone: UnlockDone[] = [];
const unlockListeners = new Set<(items: UnlockDone[]) => void>();

function announceUnlockDone(): void {
  for (const listener of unlockListeners) listener(unlockDone);
}

/** Listens for what was done at unlock. Called at once with what is waiting. */
export function subscribeUnlockDone(listener: (items: UnlockDone[]) => void): () => void {
  unlockListeners.add(listener);
  listener(unlockDone);
  return () => {
    unlockListeners.delete(listener);
  };
}

/** Clears the card. */
export function dismissUnlockDone(): void {
  unlockDone = [];
  announceUnlockDone();
}

/** Takes back one thing a spoken command made, keeping the words as a note
 *  in Capture with the time they were said, so a wrong reading loses
 *  nothing. */
export async function undoUnlockDone(item: UnlockDone): Promise<void> {
  await undoSpokenCommand(item);
  unlockDone = unlockDone.filter((done) => done.id !== item.id);
  announceUnlockDone();
}

/** Takes back what writeSpokenCommand made and keeps the words as a spoken
 *  note in Capture, with the time they were said. */
export async function undoSpokenCommand(item: UnlockDone): Promise<void> {
  const [{ removeReminder }, { deleteCountdown }, { createCaptureNote }, { syncReminderNotifications }] = await Promise.all([
    import('./db'),
    import('./countdownDb'),
    import('./captureNotesDb'),
    import('./reminderNotifications'),
  ]);
  if (item.kind === 'reminder') await removeReminder(item.id);
  else await deleteCountdown(item.id);
  await createCaptureNote(item.text, 'spoken', new Date(item.takenAt));
  void syncReminderNotifications();
}

/** Reads a photo the capture screen made into base64, ready to seal. */
export function photoFileToBase64(uri: string): string {
  return bytesToBase64Fast(new File(uri).bytesSync());
}

function parseCommand(raw: unknown): LockedCommand | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== 'string' || typeof c.title !== 'string') return null;
  if (c.kind === 'reminder' && typeof c.scheduledFor === 'string' && c.repeat && typeof c.repeat === 'object') {
    return {
      kind: 'reminder',
      id: c.id,
      title: c.title,
      scheduledFor: c.scheduledFor,
      repeat: c.repeat as RepeatConfig,
      label: typeof c.label === 'string' ? c.label : c.scheduledFor,
    };
  }
  if (c.kind === 'timer' && typeof c.minutes === 'number' && typeof c.endsAt === 'string') {
    return { kind: 'timer', id: c.id, title: c.title, minutes: c.minutes, endsAt: c.endsAt };
  }
  if (c.kind === 'days' && typeof c.days === 'number') return { kind: 'days', id: c.id, title: c.title, days: c.days };
  return null;
}

function parseCapture(text: string): LockedCapture | null {
  try {
    const raw = JSON.parse(text) as Partial<LockedCapture>;
    if (raw.kind !== 'spoken' && raw.kind !== 'photo') return null;
    if (typeof raw.text !== 'string') return null;
    if (typeof raw.takenAt !== 'string' || Number.isNaN(Date.parse(raw.takenAt))) return null;
    return {
      kind: raw.kind,
      text: raw.text,
      takenAt: raw.takenAt,
      photo: typeof raw.photo === 'string' ? raw.photo : null,
      width: typeof raw.width === 'number' ? raw.width : 0,
      height: typeof raw.height === 'number' ? raw.height : 0,
      command: raw.kind === 'spoken' ? parseCommand(raw.command) : null,
    };
  } catch {
    return null;
  }
}

function captureFiles(suffix: string): File[] {
  const dir = folder();
  if (!dir.exists) return [];
  return dir
    .list()
    .filter((entry): entry is File => entry instanceof File && entry.name.endsWith(suffix))
    .sort((a, b) => a.name.localeCompare(b.name));
}

type Opened = { capture: LockedCapture; file: File };

/**
 * With the key held, or with the lock turned off since: every capture kept
 * while locked, oldest first. A file is deleted only once its capture is
 * written (writeLockedCaptures), so a failure leaves it for next time.
 */
function openWaitingCaptures(): Opened[] {
  const state = readLockStateSync();
  const key = heldDataKey();
  const out: Opened[] = [];
  if (state && key) {
    for (const file of captureFiles(SEALED_SUFFIX)) {
      try {
        const opened = openSealedForUnlock(file.textSync(), key);
        const capture = opened ? parseCapture(opened) : null;
        if (capture) out.push({ capture, file });
        // A file sealed to a lock since replaced can never be opened; it
        // goes rather than being tried on every start.
        else file.delete();
      } catch (error) {
        console.error('[lockedCaptures] a kept capture could not be read', error);
      }
    }
  }
  if (!state) {
    for (const file of captureFiles(OPENED_SUFFIX)) {
      try {
        const capture = parseCapture(file.textSync());
        if (capture) out.push({ capture, file });
        else file.delete();
      } catch (error) {
        console.error('[lockedCaptures] an opened capture could not be read', error);
      }
    }
  }
  return out.sort((a, b) => a.capture.takenAt.localeCompare(b.capture.takenAt));
}

let writing: Promise<number> | null = null;

/**
 * Writes every waiting capture into the Capture inbox. Safe to call on every
 * start and every return to the app: with nothing waiting it reads one
 * folder listing. Answers how many were written.
 */
export function writeLockedCaptures(): Promise<number> {
  if (!writing) {
    writing = writeNow().finally(() => {
      writing = null;
    });
  }
  return writing;
}

async function writeNow(): Promise<number> {
  // Only an Android phone has a lock screen to capture over.
  if (Platform.OS !== 'android') return 0;
  const waiting = openWaitingCaptures();
  if (waiting.length === 0) return 0;
  const [{ createCaptureNote, deleteCaptureNote }, { keepPhoto }, { withSessionGuardLifted }, { localDayOf }] = await Promise.all([
    import('./captureNotesDb'),
    import('./mediaDb'),
    import('./databaseActivity'),
    import('./dayTimeline'),
  ]);
  let written = 0;
  const made: UnlockDone[] = [];
  for (const { capture, file } of waiting) {
    try {
      const takenAt = new Date(capture.takenAt);
      await withSessionGuardLifted(async () => {
        if (capture.command) {
          made.push(await writeSpokenCommand(capture.command, capture.text, takenAt));
          return;
        }
        const id = await createCaptureNote(capture.text, capture.kind, takenAt);
        if (id && capture.kind === 'photo' && capture.photo) {
          const bytes = base64ToBytesFast(capture.photo);
          if (bytes) {
            const plain = new File(Paths.cache, `locked-capture-${id}.jpg`);
            plain.write(bytes);
            const kept = await keepPhoto(plain.uri, capture.width, capture.height, { kind: 'capture_note', id }, {
              takenOn: localDayOf(takenAt.getTime()),
              deleteSource: true,
            });
            if (plain.exists) plain.delete();
            // A note without its photo would be the words "A photo" and
            // nothing else: take the note back and leave the sealed file
            // for the next start to try again.
            if (kept.status !== 'added') {
              await deleteCaptureNote(id);
              throw new Error(kept.status === 'error' ? kept.message : `the photo was ${kept.status}`);
            }
          }
        }
      });
      file.delete();
      written += 1;
    } catch (error) {
      console.error('[lockedCaptures] a kept capture could not be written', error);
    }
  }
  if (made.length > 0) {
    unlockDone = [...unlockDone, ...made];
    announceUnlockDone();
    const { syncReminderNotifications } = await import('./reminderNotifications');
    void syncReminderNotifications();
  }
  return written;
}

/** Writes what a spoken command asked for, under the id it was given when it
 *  was said, and answers the line that says what was done. */
export async function writeSpokenCommand(command: LockedCommand, text: string, takenAt: Date): Promise<UnlockDone> {
  const base = { id: command.id, text, takenAt: takenAt.toISOString() };
  if (command.kind === 'reminder') {
    const { scheduleReminder } = await import('./db');
    await scheduleReminder({ id: command.id, title: command.title, scheduledFor: command.scheduledFor, repeat: command.repeat });
    return { ...base, kind: 'reminder', line: `Reminder: ${command.title}, ${command.label}` };
  }
  const { addCountdown, addTimedCountdown } = await import('./countdownDb');
  if (command.kind === 'timer') {
    await addTimedCountdown({ id: command.id, name: command.title, startedAt: takenAt.toISOString(), minutes: command.minutes });
    const ended = Date.parse(command.endsAt) <= Date.now();
    return {
      ...base,
      kind: 'timer',
      line: `Timer: ${command.title}, ${describeDuration(command.minutes)}, ${ended ? 'ended' : 'ending'} ${describeTimerEnd(command.endsAt, new Date())}`,
    };
  }
  const startedOn = `${takenAt.getFullYear()}-${String(takenAt.getMonth() + 1).padStart(2, '0')}-${String(takenAt.getDate()).padStart(2, '0')}`;
  await addCountdown({ id: command.id, name: command.title, about: null, startedOn, days: command.days });
  return { ...base, kind: 'days', line: `Days Until: ${command.title}, ${plural(command.days, 'day')}` };
}

/**
 * Turning the lock off: every sealed capture opened with the key and kept as
 * a plain file for the next start, which writes them as an unlock would.
 */
export function unsealLockedCapturesForTurnOff(key: Uint8Array): void {
  for (const file of captureFiles(SEALED_SUFFIX)) {
    try {
      const opened = openSealedForUnlock(file.textSync(), key);
      if (opened && parseCapture(opened)) {
        new File(folder(), file.name.replace(SEALED_SUFFIX, OPENED_SUFFIX)).write(opened);
      }
      file.delete();
    } catch (error) {
      console.error('[lockedCaptures] a kept capture could not be opened for turning the lock off', error);
    }
  }
}
