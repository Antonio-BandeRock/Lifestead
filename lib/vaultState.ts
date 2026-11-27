// The vault, what is in it and whether it is open right now. Kept apart
// from lib/vaultSession.ts, which opens it with a code or fingerprint, so
// lib/databaseActivity.ts can ask on every read without pulling in secure
// store or the prompt. The rules themselves are in lib/vault.ts.
//
// Open lives only in this module's memory, like the App Lock key: a restart
// closes it, and so does coming back after the app was away for the chosen
// time (lib/vaultSession.ts).

import { readLockStateSync } from './appLockSession';
import {
  firstRecordOfferFor,
  vaultGuarding,
  vaultKey,
  vaultRefusal,
  type VaultCategory,
  type VaultClosedError,
  type VaultGroup,
  type VaultKey,
  type VaultSettings,
} from './vault';
import { readVaultSettingsSync, writeVaultSettingsSync } from './vaultSettings';

type Snapshot = { settings: VaultSettings; appLockOn: boolean; guarding: boolean; key: VaultKey };

let snapshot: Snapshot | null = null;
let vaultOpen = false;
let bypassDepth = 0;
const listeners = new Set<() => void>();

/**
 * The settings and whether App Lock is on, read from the two files once and
 * then remembered, since this is asked before every SELECT. refreshVault()
 * reads them again after either changes.
 */
function current(): Snapshot {
  if (snapshot === null) {
    const lock = readLockStateSync();
    const appLockOn = lock !== null && lock.phase === 'on';
    const settings = readVaultSettingsSync();
    snapshot = { settings, appLockOn, guarding: vaultGuarding(appLockOn, settings), key: vaultKey(appLockOn, settings) };
  }
  return snapshot;
}

export function getVaultSettings(): VaultSettings {
  return current().settings;
}

/** Writes the settings and redraws everything watching the vault. */
export function saveVaultSettings(settings: VaultSettings): void {
  writeVaultSettingsSync(settings);
  refreshVault();
}

/** True when the vault is closing something: categories are chosen and a code opens it. */
export function isVaultOn(): boolean {
  return current().guarding;
}

/** What opens it: the App Lock code, its own code, or nothing yet. */
export function currentVaultKey(): VaultKey {
  return current().key;
}

export function isAppLockOnForVault(): boolean {
  return current().appLockOn;
}

/** The categories the person put in the vault, guarded or not. */
export function chosenVaultCategories(): VaultCategory[] {
  return current().settings.categories;
}

export function refreshVault(): void {
  const wasGuarding = snapshot === null ? null : snapshot.guarding;
  snapshot = null;
  if (!current().guarding) vaultOpen = false;
  // Just set up, by the person, in the open app (setup's security question,
  // the offer at a first record, Profile, or App Lock switched on): the vault
  // starts open and closes after time away like any other opening
  // (lib/vaultSession.ts). Closing it at
  // once hid what they had just entered (Tony, 2026-11-18: Autism and ADHD
  // looked unaccepted in setup, and two new supplements were missing from
  // My Meds).
  else if (wasGuarding === false) vaultOpen = true;
  notify();
}

/** Kept for lib/appLockDevice.ts, which calls it after the lock file changes. */
export const refreshVaultOn = refreshVault;

export function isVaultOpen(): boolean {
  return vaultOpen;
}

/** True when the vault is guarding and closed, so its records cannot be read. */
export function isVaultClosed(): boolean {
  return isVaultOn() && !vaultOpen;
}

/** True when this one category is in the vault, guarded, and closed. */
export function isCategoryClosed(category: VaultCategory): boolean {
  return isVaultClosed() && current().settings.categories.includes(category);
}

export function setVaultOpen(open: boolean): void {
  if (vaultOpen === open) return;
  vaultOpen = open;
  notify();
}

/**
 * Work the app does on its own at startup that reads past the vault, such
 * as building and upgrading the database, which nobody can be asked to open
 * the vault for. Never for anything a screen draws.
 */
export async function withVaultBypass<T>(work: () => Promise<T>): Promise<T> {
  bypassDepth += 1;
  try {
    return await work();
  } finally {
    bypassDepth -= 1;
  }
}

/** The refusal for a statement about to run, or null when it may run. */
export function vaultRefusalNow(sql: string): VaultClosedError | null {
  if (vaultOpen || bypassDepth > 0) return null;
  const now = current();
  return vaultRefusal(sql, now.guarding, vaultOpen, now.settings.categories);
}

// The offer at the first protected record. lib/databaseActivity.ts calls
// noteVaultRecordWritten after every write that went through; the first one
// adding a health or money row holds the offer here
// until components/VaultFirstRecordOfferHost.tsx shows it.

let pendingOffer: VaultGroup | null = null;
const offerListeners = new Set<() => void>();

export function noteVaultRecordWritten(sql: string): void {
  if (bypassDepth > 0 || pendingOffer !== null) return;
  let group: VaultGroup | null;
  try {
    const now = current();
    group = firstRecordOfferFor(sql, now.appLockOn, now.settings);
  } catch {
    return;
  }
  if (group === null) return;
  pendingOffer = group;
  for (const listener of offerListeners) {
    try {
      listener();
    } catch (error) {
      console.error('[vault] an offer listener failed', error);
    }
  }
}

export function getPendingVaultOffer(): VaultGroup | null {
  return pendingOffer;
}

export function subscribeVaultOffer(listener: () => void): () => void {
  offerListeners.add(listener);
  return () => {
    offerListeners.delete(listener);
  };
}

/** Records the answer, so the offer for that group never comes back (or none ever does). */
export function answerFirstRecordOffer(group: VaultGroup, answer: 'setUp' | 'notNow' | 'stop'): void {
  const settings = current().settings;
  const next: VaultSettings =
    answer === 'stop'
      ? { ...settings, stopOffering: true, firstOffered: { ...settings.firstOffered, [group]: true } }
      : { ...settings, firstOffered: { ...settings.firstOffered, [group]: true } };
  pendingOffer = null;
  saveVaultSettings(next);
  for (const listener of offerListeners) {
    try {
      listener();
    } catch (error) {
      console.error('[vault] an offer listener failed', error);
    }
  }
}

export function subscribeVault(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.error('[vault] a listener failed', error);
    }
  }
}
