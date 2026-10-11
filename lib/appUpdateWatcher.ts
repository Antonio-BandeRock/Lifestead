// Checks for an update when the app starts and whenever it comes back to
// the front, downloads it quietly, and posts one notification when it is
// ready (2026-10-11). The reasons are in lib/appUpdate.ts.
//
// Phone only: Expo Go, a development build and the computer have no update
// channel, and the computer gets a new installer instead. Nothing here
// reads the database, so it runs while App Lock is closed too.

import { AppState, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { shouldCheckForUpdate, versionOfManifest } from './appUpdate';
import { presentAppUpdateReady } from './reminderNotifications';

const DOWNLOAD_ATTEMPTS = 3;
const RETRY_MS = 3000;

let lastCheckedAt: number | null = null;
let busy = false;
// One notification per update, for as long as this run of the app lasts.
// A new run starts on the update, so there is nothing to remember past it.
const announced = new Set<string>();

async function checkNow(): Promise<void> {
  if (busy || !shouldCheckForUpdate(lastCheckedAt, Date.now())) return;
  busy = true;
  lastCheckedAt = Date.now();
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return;
    for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt += 1) {
      try {
        const fetched = await Updates.fetchUpdateAsync();
        const manifest = fetched.manifest ?? result.manifest;
        const key = (manifest as { id?: string } | undefined)?.id ?? 'update';
        if (announced.has(key)) return;
        announced.add(key);
        await presentAppUpdateReady(versionOfManifest(manifest));
        return;
      } catch (error) {
        if (attempt === DOWNLOAD_ATTEMPTS) throw error;
        await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
      }
    }
  } catch (error) {
    // No connection, or Expo busy with its own launch check: the next return
    // to the front tries again.
    console.warn('[appUpdateWatcher] check did not finish', error);
    lastCheckedAt = null;
  } finally {
    busy = false;
  }
}

export function watchForAppUpdates(): () => void {
  if (Platform.OS === 'web' || __DEV__ || !Updates.isEnabled) return () => {};
  void checkNow();
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') void checkNow();
  });
  return () => subscription.remove();
}
