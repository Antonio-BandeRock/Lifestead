// Telling the person an update is ready (2026-10-11). Direct report: "the
// app doesn't update after a couple of closes and opens. It only updates
// when I go into the profile and look for an update... there should be a
// notification that happens to let the user know there is an update so
// they are immediately aware."
//
// Expo checks once at launch and applies what it downloaded only at the
// next launch, and on Android closing the app usually leaves it running, so
// a launch seldom comes. lib/appUpdateWatcher.ts checks whenever the app
// comes back to the front as well, downloads quietly, and posts one
// notification per update. Its tap opens Profile on App Updates, which asks
// before restarting; swiping it away is enough, since a downloaded update
// goes in by itself the next time the app starts from closed.
//
// Pure, so scripts/test_app_update.js checks it without a phone.

/** The shortest gap between two checks, so coming and going costs nothing. */
export const UPDATE_CHECK_EVERY_MS = 10 * 60 * 1000;

export const APP_UPDATE_NOTIFICATION_ID = 'inside-story-app-update';

export function shouldCheckForUpdate(lastCheckedAt: number | null, now: number): boolean {
  return lastCheckedAt === null || now - lastCheckedAt >= UPDATE_CHECK_EVERY_MS;
}

/** The version an update manifest carries, or null when it carries none. */
export function versionOfManifest(manifest: unknown): string | null {
  if (!manifest || typeof manifest !== 'object') return null;
  const m = manifest as { extra?: { expoClient?: { version?: unknown } }; version?: unknown };
  const version = m.extra?.expoClient?.version ?? m.version;
  return typeof version === 'string' && version.trim() ? version.trim() : null;
}

export function updateReadyText(version: string | null, current: string): { title: string; body: string } {
  const which = version && version !== current ? `Version ${version} is downloaded` : 'A newer version is downloaded';
  return {
    title: 'A Lifestead update is ready',
    body: `${which} (you have ${current}). Tap to restart into it now, or it goes in the next time Lifestead starts from closed.`,
  };
}
