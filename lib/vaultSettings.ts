// The vault's settings file, vault.json beside the lock file: which
// categories are in the vault, its own code when App Lock is off, and the
// offer to set it up later. The rules for reading it are in lib/vault.ts;
// this file only reads and writes it. Kept on this device and never in the
// database or a snapshot, since the rule deciding whether a read may run
// cannot itself be a read.

import { File, Paths } from 'expo-file-system';
import { readLockStateSync } from './appLockSession';
import {
  EMPTY_VAULT_SETTINGS,
  parseVaultOpenMark,
  parseVaultSettings,
  serializeVaultSettings,
  vaultSettingsFromPhaseOne,
  type VaultOpenMark,
  type VaultSettings,
} from './vault';

export const VAULT_FILE_NAME = 'vault.json';

/**
 * The settings on disk. With no file, a phone that switched the vault on in
 * phase 1 (the lock file's vault flag) reads as the nine phase 1 categories,
 * and every other phone as an empty vault.
 */
export function readVaultSettingsSync(): VaultSettings {
  try {
    const file = new File(Paths.document, VAULT_FILE_NAME);
    if (file.exists) {
      const parsed = parseVaultSettings(file.textSync());
      if (parsed) return parsed;
    }
  } catch (error) {
    console.error('[vault] the vault file could not be read', error);
  }
  const lock = readLockStateSync();
  return lock?.vault ? vaultSettingsFromPhaseOne() : { ...EMPTY_VAULT_SETTINGS };
}

export function writeVaultSettingsSync(settings: VaultSettings): void {
  const file = new File(Paths.document, VAULT_FILE_NAME);
  if (!file.exists) file.create();
  file.write(serializeVaultSettings(settings));
}

// The open mark (VaultOpenMark in lib/vault.ts), beside the settings: there
// only while the vault is open, so a restart the app makes itself finds it.
export const VAULT_OPEN_FILE_NAME = 'vault-open.json';

export function readVaultOpenMarkSync(): VaultOpenMark | null {
  try {
    const file = new File(Paths.document, VAULT_OPEN_FILE_NAME);
    return file.exists ? parseVaultOpenMark(file.textSync()) : null;
  } catch (error) {
    console.error('[vault] the open mark could not be read', error);
    return null;
  }
}

export function writeVaultOpenMarkSync(mark: VaultOpenMark | null): void {
  try {
    const file = new File(Paths.document, VAULT_OPEN_FILE_NAME);
    if (mark === null) {
      if (file.exists) file.delete();
      return;
    }
    if (!file.exists) file.create();
    file.write(JSON.stringify(mark));
  } catch (error) {
    console.error('[vault] the open mark could not be written', error);
  }
}
