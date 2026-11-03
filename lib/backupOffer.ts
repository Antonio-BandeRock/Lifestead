// The reminder to back up (direct request, 2026-11-02: "can we automate the
// backup to happen automatically, or at the very least to remind them every
// few days to backup their data. Automated would be best if possible").
//
// Automatic Sync (Profile > Backup & Restore) is the automated half: it
// saves a fresh copy to the shared folder a few minutes after writing stops.
// This is the other half. While Automatic Sync is off and no backup has been
// saved from this device for BACKUP_OFFER_EVERY_DAYS, a reconcile in
// lib/reminderNotifications.ts shows one notification with three buttons:
// Set It Up (Profile on Backup & Restore the next time Lifestead is open),
// Not Now (asked again in a few days) and Stop Asking. None opens the app
// (1.0.67.1), so all three work on the locked phone.
//
// What the offer remembers is a plain file beside the vault's, kept on this
// device and never in the database: a press on the locked phone has no
// database to write to, and a backup saved on the computer says nothing
// about whether this phone has one.

import { File, Paths } from 'expo-file-system';

export const BACKUP_OFFER_NOTIFICATION_ID = 'inside-story-backup-offer';
export const BACKUP_OFFER_FILE_NAME = 'backup-offer.json';
export const BACKUP_OFFER_EVERY_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export type BackupOfferState = {
  /** When the offer was last shown or put off; null before the first look. */
  offeredAt: number | null;
  stopped: boolean;
  /** Set It Up was pressed, so Profile opens on Backup & Restore next time. */
  setUpWaiting: boolean;
};

export const EMPTY_BACKUP_OFFER_STATE: BackupOfferState = { offeredAt: null, stopped: false, setUpWaiting: false };

export type BackupOfferFacts = {
  automaticSyncOn: boolean;
  /** The newest backup saved from this device, by hand or by sync, or null. */
  lastBackupAt: number | null;
  state: BackupOfferState;
  now: Date;
};

/**
 * Whether the offer shows now. Never while Automatic Sync is on, never
 * after Stop Asking, only between 10:00 and 20:00, and only once a backup
 * is BACKUP_OFFER_EVERY_DAYS old (or there is none) and the last offer is
 * as old. The first look only starts the clock, so a phone set up today
 * is not asked today.
 */
export function backupOfferDue(facts: BackupOfferFacts): boolean {
  const { automaticSyncOn, lastBackupAt, state, now } = facts;
  if (automaticSyncOn || state.stopped) return false;
  const hour = now.getHours();
  if (hour < 10 || hour >= 20) return false;
  const gap = BACKUP_OFFER_EVERY_DAYS * DAY_MS;
  const at = now.getTime();
  if (lastBackupAt !== null && at - lastBackupAt < gap) return false;
  if (state.offeredAt === null) return false;
  return at - state.offeredAt >= gap;
}

/** The first look at a phone that has never been offered: start the clock. */
export function backupOfferClockStarts(state: BackupOfferState): boolean {
  return state.offeredAt === null && !state.stopped;
}

/** The words, which say nothing about what the records are. */
export function backupOfferText(lastBackupAt: number | null, now: Date): { title: string; body: string } {
  if (lastBackupAt === null) {
    return {
      title: 'Nothing on this phone is backed up yet',
      body: 'If this phone is lost or reset, your records go with it. Set It Up opens Backup & Restore the next time you open Lifestead, where Automatic Sync keeps a copy in your cloud folder by itself.',
    };
  }
  const days = Math.max(1, Math.floor((now.getTime() - lastBackupAt) / DAY_MS));
  return {
    title: 'Time for a backup',
    body: `The last backup from this phone was ${days} days ago. Set It Up opens Backup & Restore the next time you open Lifestead, where Automatic Sync keeps a copy in your cloud folder by itself.`,
  };
}

export function parseBackupOfferState(text: string): BackupOfferState | null {
  try {
    const parsed = JSON.parse(text) as Partial<BackupOfferState>;
    return {
      offeredAt: typeof parsed.offeredAt === 'number' ? parsed.offeredAt : null,
      stopped: parsed.stopped === true,
      setUpWaiting: parsed.setUpWaiting === true,
    };
  } catch {
    return null;
  }
}

export function readBackupOfferState(): BackupOfferState {
  try {
    const file = new File(Paths.document, BACKUP_OFFER_FILE_NAME);
    if (file.exists) return parseBackupOfferState(file.textSync()) ?? { ...EMPTY_BACKUP_OFFER_STATE };
  } catch (error) {
    console.error('[backupOffer] the offer file could not be read', error);
  }
  return { ...EMPTY_BACKUP_OFFER_STATE };
}

export function writeBackupOfferState(state: BackupOfferState): void {
  try {
    const file = new File(Paths.document, BACKUP_OFFER_FILE_NAME);
    if (!file.exists) file.create();
    file.write(JSON.stringify(state));
  } catch (error) {
    console.error('[backupOffer] the offer file could not be written', error);
  }
}

export function markBackupOffered(now: number = Date.now()): void {
  writeBackupOfferState({ ...readBackupOfferState(), offeredAt: now });
}

/** Set It Up asks again in a few days like Not Now, and opens Profile next time; Stop Asking never asks again. */
export function answerBackupOffer(actionIdentifier: string, now: number = Date.now()): void {
  const state = readBackupOfferState();
  if (actionIdentifier === 'backupSetUp') writeBackupOfferState({ ...state, offeredAt: now, setUpWaiting: true });
  else if (actionIdentifier === 'backupNotNow') writeBackupOfferState({ ...state, offeredAt: now });
  else if (actionIdentifier === 'backupStop') writeBackupOfferState({ ...state, stopped: true });
}

/** True once when Set It Up is waiting, and clears it. */
export function takeBackupSetUpWaiting(): boolean {
  const state = readBackupOfferState();
  if (!state.setUpWaiting) return false;
  writeBackupOfferState({ ...state, setUpWaiting: false });
  return true;
}
