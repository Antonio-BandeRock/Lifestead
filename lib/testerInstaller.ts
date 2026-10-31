// Whether a newer installer is waiting for a tester (tester plan T6,
// 2026-10-31).
//
// An update over the air carries the app's words and screens, but not a
// change to its native parts: those come only in a new installer. So the
// tester version reads one small file, /tester/latest.json on the app's own
// site, saying which installer is newest, and the For Testers band says when
// the one on this device is behind and where the new one is. The file holds
// nothing about anybody and nothing is sent to read it.
//
// Pure, with no I/O, so scripts/test_tester_installer.js can check it.
import { compareAppVersions } from '../constants/releaseNotes';

export const TESTER_LATEST_URL = 'https://lifestead.ghostead.com/tester/latest.json';

export type TesterLatest = {
  android?: { version?: string; runtime?: string | null; downloadUrl?: string | null } | null;
  windows?: { version?: string; downloadUrl?: string | null } | null;
};

export type TesterDevice =
  | { kind: 'android'; runtime: string | null }
  | { kind: 'windows'; version: string }
  | { kind: 'other' };

export type InstallerWaiting = { version: string; downloadUrl: string };

/** The installer waiting for this device, or null when it already has the newest. */
export function installerWaiting(latest: unknown, device: TesterDevice): InstallerWaiting | null {
  if (!latest || typeof latest !== 'object') return null;
  const file = latest as TesterLatest;
  if (device.kind === 'android') {
    const entry = file.android;
    // The fingerprint names the native build: a different one means updates
    // over the air can no longer reach this phone, whatever the version says.
    if (!entry || !entry.runtime || !entry.downloadUrl || !entry.version || !device.runtime) return null;
    if (entry.runtime === device.runtime) return null;
    return { version: entry.version, downloadUrl: entry.downloadUrl };
  }
  if (device.kind === 'windows') {
    const entry = file.windows;
    if (!entry || !entry.version || !entry.downloadUrl) return null;
    if (compareAppVersions(entry.version, device.version) <= 0) return null;
    return { version: entry.version, downloadUrl: entry.downloadUrl };
  }
  return null;
}
