// Signing in to Google Drive, so the shared folder can live there.
//
// ONE PERMISSION, THE NARROWEST GOOGLE OFFERS. The app asks for drive.file,
// which reaches only the files and folders Lifestead itself made. It cannot
// see anything else in the person's Drive, and Google marks the permission
// as not sensitive, so no review of the app was needed to ask for it. The
// cost is that there is nothing to browse: the app makes "Google Drive /
// Lifestead" and works inside it, and a folder somebody else shared cannot
// be reached (partners go through the relay instead).
//
// ON A PHONE, GOOGLE PLAY SERVICES SIGNS IN. The native module
// GoogleDriveAuth (modules/google-drive-auth) asks Android's
// AuthorizationClient, which shows Google's own account and consent sheet
// and hands back an access token. Android matches the app to its Google
// client by package name and signing certificate, so no client id or
// secret is in the app. There is no refresh token on a phone: asking again
// once the hour is up is answered quietly by Play services. The module is
// looked up with requireOptionalNativeModule, so this ships over the air
// and says plainly that the next install is needed until the module is
// there.
//
// ON A COMPUTER, THE BROWSER SIGNS IN. desktop/googleDrive.js opens Google's
// page in the default browser, catches the answer on a one-time address on
// this computer, and keeps the refresh token encrypted with the Windows
// account's key. Every Drive request is sent from there with the token
// attached, so the token never reaches the window.

import { requireOptionalNativeModule } from 'expo';
import * as SecureStore from 'expo-secure-store';

import { desktopBridge, isDesktopApp } from './desktop/bridge';

type AuthorizeAnswer = { accessToken: string; email?: string | null } | null;

type GoogleDriveAuthModule = {
  /** interactive false answers null rather than showing a sheet. */
  authorize(interactive: boolean): Promise<AuthorizeAnswer>;
  /** Clears the token Play services cached for this app. */
  clearToken(token: string): Promise<void>;
};

const nativeAuth = requireOptionalNativeModule<GoogleDriveAuthModule>('GoogleDriveAuth');

/** Kept so the phone knows a sign-in happened; Play services holds the grant itself. */
const SIGNED_IN_KEY = 'gdrive.signedIn';

let cachedAccessToken: { token: string; expiresAt: number } | null = null;
let inFlight: Promise<{ ok: true; token: string } | { ok: false; reason: string }> | null = null;

/** Play services gives no expiry with the token; Google's tokens last an hour. */
const TOKEN_LIFETIME_MS = 50 * 60 * 1000;

export const GOOGLE_NOT_YET_ON_PHONE =
  'Google Drive needs the next version of Lifestead installed on this phone. Until then, use OneDrive or a folder on this phone.';
export const GOOGLE_NOT_YET_ON_COMPUTER =
  'Google Drive needs the newest Lifestead installer on this computer. Until then, use the OneDrive folder on this computer.';

/** Whether this install can reach Google Drive at all. */
export function isGoogleDriveAvailable(): boolean {
  if (isDesktopApp()) return Boolean(desktopBridge()?.googleDrive);
  return nativeAuth !== null;
}

/** Why Google Drive cannot be used here, for explainNotYet. */
export function googleDriveUnavailableReason(): string {
  return isDesktopApp() ? GOOGLE_NOT_YET_ON_COMPUTER : GOOGLE_NOT_YET_ON_PHONE;
}

export async function isGoogleSignedIn(): Promise<boolean> {
  if (isDesktopApp()) {
    const bridge = desktopBridge()?.googleDrive;
    if (!bridge) return false;
    try {
      return await bridge.isSignedIn();
    } catch {
      return false;
    }
  }
  if (!nativeAuth) return false;
  try {
    return (await SecureStore.getItemAsync(SIGNED_IN_KEY)) === '1';
  } catch {
    return false;
  }
}

/** Opens Google's own sign-in and consent, and remembers that it finished. */
export async function signInToGoogle(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (isDesktopApp()) {
    const bridge = desktopBridge()?.googleDrive;
    if (!bridge) return { ok: false, reason: GOOGLE_NOT_YET_ON_COMPUTER };
    try {
      return await bridge.signIn();
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : 'The Google sign-in did not finish.' };
    }
  }
  if (!nativeAuth) return { ok: false, reason: GOOGLE_NOT_YET_ON_PHONE };
  try {
    const answer = await nativeAuth.authorize(true);
    if (!answer?.accessToken) return { ok: false, reason: 'The Google sign-in was closed before it finished.' };
    cachedAccessToken = { token: answer.accessToken, expiresAt: Date.now() + TOKEN_LIFETIME_MS };
    try {
      await SecureStore.setItemAsync(SIGNED_IN_KEY, '1');
    } catch {
      // Without the mark the next start asks Play services quietly anyway.
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: googleSentence(error) };
  }
}

export async function signOutOfGoogle(): Promise<void> {
  if (isDesktopApp()) {
    try {
      await desktopBridge()?.googleDrive?.signOut();
    } catch {
      // Nothing kept is the same outcome as removing it.
    }
    return;
  }
  const held = cachedAccessToken?.token;
  cachedAccessToken = null;
  inFlight = null;
  if (held && nativeAuth) {
    try {
      await nativeAuth.clearToken(held);
    } catch {
      // A token Play services no longer holds needs no clearing.
    }
  }
  try {
    await SecureStore.deleteItemAsync(SIGNED_IN_KEY);
  } catch {
    // Nothing to delete is the same outcome as deleting it.
  }
}

/** Drops the token held for this run, for one Google refused before its hour was up. */
export function forgetGoogleAccessToken(): void {
  cachedAccessToken = null;
}

/** A usable token on a phone. On a computer the token stays in desktop/googleDrive.js. */
export async function getGoogleAccessToken(): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  if (isDesktopApp()) return { ok: false, reason: 'On a computer the sign-in is held by the app itself.' };
  if (!nativeAuth) return { ok: false, reason: GOOGLE_NOT_YET_ON_PHONE };
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return { ok: true, token: cachedAccessToken.token };
  }
  if (inFlight) return inFlight;
  inFlight = (async () => {
    if (!(await isGoogleSignedIn())) return { ok: false as const, reason: 'Not signed in to Google Drive yet.' };
    try {
      const answer = await nativeAuth.authorize(false);
      if (!answer?.accessToken) {
        return {
          ok: false as const,
          reason: 'Google wants the sign-in confirmed again. Open the Shared Folder screen and tap Use Google Drive.',
        };
      }
      cachedAccessToken = { token: answer.accessToken, expiresAt: Date.now() + TOKEN_LIFETIME_MS };
      return { ok: true as const, token: answer.accessToken };
    } catch (error) {
      return { ok: false as const, reason: googleSentence(error) };
    }
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

function googleSentence(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/network|timeout|7:/i.test(message)) return 'Google could not be reached. Check the connection and try again.';
  if (/cancel|16:/i.test(message)) return 'The Google sign-in was closed before it finished.';
  return 'Google did not finish the sign-in' + (message ? ' (' + message + ')' : '') + '. Try again in a few minutes.';
}
