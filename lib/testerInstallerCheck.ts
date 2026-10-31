// Reads /tester/latest.json for the tester version (tester plan T6). Kept
// apart from lib/testerInstaller.ts so that file stays pure.
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';
import { APP_VERSION } from '../constants/version';
import { isTesterBuild } from './appVariant';
import { isDesktopApp } from './desktop/bridge';
import { installerWaiting, TESTER_LATEST_URL, type InstallerWaiting, type TesterDevice } from './testerInstaller';

function thisDevice(): TesterDevice {
  if (isDesktopApp()) return { kind: 'windows', version: APP_VERSION };
  if (Platform.OS === 'android') return { kind: 'android', runtime: Updates.runtimeVersion ?? null };
  return { kind: 'other' };
}

/** Null when nothing is waiting, when this is not the tester version, or when the site cannot be reached. */
export async function checkTesterInstaller(): Promise<InstallerWaiting | null> {
  if (!isTesterBuild()) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(TESTER_LATEST_URL, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) return null;
    return installerWaiting(await response.json(), thisDevice());
  } catch {
    // No connection is not news a tester needs; the band simply says nothing.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
