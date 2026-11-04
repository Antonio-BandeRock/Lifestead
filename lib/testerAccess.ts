// The tester version's side of access (tester plan T12, 2026-10-31).
//
// Everything here is kept in the device's secure store, never in the
// database, so it never travels through sync or a backup: an approval is for
// this device, and a restored backup on another phone has to ask again.
// The rules (what a request and an approval are, when one has ended) are in
// lib/testerApproval.ts; this file keeps them and asks.
//
// Since 1.0.81.2 it is a code each way, by direct instruction: Ask for
// Access leaves the request sealed on the site under a short request code
// and the email carries only that code; the developer pastes it into the
// developer version, which sends back an approval code; the tester types or
// pastes that into the box and presses Use This Code. Nothing opens by
// itself any more, so there is one way in. When the site cannot be reached
// the email carries the long request link instead, and an activation link
// still opens as before.
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { AppState, Linking } from 'react-native';
import { APP_VERSION } from '../constants/version';
import { APP_VARIANT } from './appVariant';
import { isDesktopApp } from './desktop/bridge';
import { getDeviceIdentity } from './deviceIdentity';
import { t } from './i18n';
import { PROBLEM_REPORT_ADDRESS } from './problemReport';
import {
  approvalState,
  codeFromBytes,
  CODE_LENGTH,
  deviceTag,
  dropSlot,
  DROP_URL,
  encodeRequest,
  extractCode,
  findCodes,
  formatCode,
  laterApproval,
  openDrop,
  readApproval,
  requestLink,
  requestSecret,
  sealDrop,
  type AccessRequest,
  type Approval,
  type ApprovalState,
} from './testerApproval';
import { TRUSTED_APPROVAL_KEYS } from './testerApprovalKeys';

const ACTIVATION_KEY = 'tester_activation_v1';
const LATEST_SEEN_KEY = 'tester_latest_seen_v1';
const AGREEMENT_KEY = 'tester_agreement_v1';
const NAME_KEY = 'tester_access_name';
const ASKED_KEY = 'tester_access_asked';
/** Left by 1.0.80.11 and 1.0.81.1, and cleared on load since nothing looks
 *  for an approval by itself now. */
const PICKUP_KEY = 'tester_pickup_v1';
const REQUEST_CODE_KEY = 'tester_request_code_v1';

/** Raised when the agreement's words change enough to be read again. */
export const TESTER_AGREEMENT_VERSION = '1';

export type TesterAccess = {
  loaded: boolean;
  agreed: boolean;
  name: string;
  /** When this device last asked, ms, or null. */
  askedAt: number | null;
  /** The request code this device last sent, or null when its request went
   *  as a link or it has not asked. */
  requestCode: string | null;
  state: ApprovalState;
};

let snapshot: TesterAccess = { loaded: false, agreed: false, name: '', askedAt: null, requestCode: null, state: { kind: 'missing' } };
let tag: string | null = null;
let approval: Approval | null = null;
let latestSeen = 0;
const listeners = new Set<() => void>();

function publish(next: Partial<TesterAccess>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

/**
 * Whether the tester version lets the person past its door: approved for
 * this device AND the agreement read. Since 1.0.79.1 the agreement comes
 * after approval, so setup and the general agreement wait on both.
 */
export function testerDoorOpen(access: TesterAccess): boolean {
  return access.state.kind === 'ok' && access.agreed;
}

export function useTesterAccess(): TesterAccess {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

async function myTag(): Promise<string> {
  if (!tag) tag = deviceTag((await getDeviceIdentity()).publicKeyBase64);
  return tag;
}

/** Works out the state again, and moves the latest time seen forward. */
async function recompute() {
  const now = Date.now();
  if (now > latestSeen) {
    latestSeen = now;
    await SecureStore.setItemAsync(LATEST_SEEN_KEY, String(latestSeen)).catch(() => {});
  }
  publish({ state: approvalState(approval, await myTag(), now, latestSeen) });
}

export async function loadTesterAccess(): Promise<void> {
  try {
    const [token, seen, agreed, name, asked, requestCode] = await Promise.all([
      SecureStore.getItemAsync(ACTIVATION_KEY),
      SecureStore.getItemAsync(LATEST_SEEN_KEY),
      SecureStore.getItemAsync(AGREEMENT_KEY),
      SecureStore.getItemAsync(NAME_KEY),
      SecureStore.getItemAsync(ASKED_KEY),
      SecureStore.getItemAsync(REQUEST_CODE_KEY),
    ]);
    void SecureStore.deleteItemAsync(PICKUP_KEY).catch(() => {});
    approval = token ? readApproval(token, TRUSTED_APPROVAL_KEYS) : null;
    latestSeen = Number(seen) || 0;
    publish({
      agreed: agreed === TESTER_AGREEMENT_VERSION,
      name: name ?? '',
      askedAt: asked ? Number(asked) || null : null,
      requestCode,
    });
    await recompute();
  } catch (error) {
    // Nothing could be read: the gate stays up and asks, which is the safe
    // side, and the records underneath are untouched.
    console.warn('[testerAccess] could not read access', error);
  }
  publish({ loaded: true });
}

export async function acceptTesterAgreement(): Promise<void> {
  await SecureStore.setItemAsync(AGREEMENT_KEY, TESTER_AGREEMENT_VERSION);
  publish({ agreed: true });
}

export type AskResult = 'opened' | 'copied' | 'failed';

/** Which copy of the app is asking, for the developer's record. */
function appId(): string {
  const id = Application.applicationId ?? (isDesktopApp() ? `computer, ${APP_VARIANT}` : APP_VARIANT);
  return `${id} ${APP_VERSION}`;
}

/** The email carries the request code, or the long link when the site
 *  could not take the request. */
function accessEmail(request: AccessRequest, code: string | null, link: string): { subject: string; body: string } {
  const subject = request.renewal
    ? t('More time on Lifestead Test for {name}', { name: request.name })
    : t('Lifestead Test access for {name}', { name: request.name });
  const body = [
    request.renewal ? t('Please give this device more time on Lifestead Test.') : t('Please let this device open Lifestead Test.'),
    '',
    t('Name: {name}', { name: request.name }),
    request.platform === 'phone' ? t('Device: a phone') : t('Device: a computer'),
    '',
    ...(code
      ? [t('Request code: {code}', { code: formatCode(code) }), '', t('The code stands only for the name above, a code for this device and which copy of the app is asking. Nothing from the app is in it.')]
      : [link, '', t('This link carries only the name above and a code for this device. Nothing from the app is in it.')]),
  ].join('\n');
  return { subject, body };
}

/** Leaves the request sealed on the site under its code. False when the
 *  site could not be reached. */
async function leaveRequest(code: string, request: AccessRequest): Promise<boolean> {
  try {
    const secret = requestSecret(code);
    const nonce = await Crypto.getRandomBytesAsync(24);
    const response = await fetch(`${DROP_URL}/put`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slot: dropSlot(secret), body: sealDrop(encodeRequest(request), secret, nonce) }),
    });
    return response.ok;
  } catch (error) {
    console.warn('[testerAccess] could not reach the site', error);
    return false;
  }
}

/** Writes the request into the tester's email app, addressed to the
 *  testers inbox. Where no email app opens, the request is copied. */
export async function askForAccess(name: string, renewal: boolean): Promise<AskResult> {
  const clean = name.trim();
  await SecureStore.setItemAsync(NAME_KEY, clean).catch(() => {});
  const request: AccessRequest = {
    v: 1,
    name: clean,
    device: await myTag(),
    platform: isDesktopApp() ? 'computer' : 'phone',
    renewal,
    asked: Date.now(),
    app: appId(),
  };
  // A fresh code each time, so an older request and a newer one never
  // share a slot.
  const fresh = codeFromBytes(await Crypto.getRandomBytesAsync(CODE_LENGTH));
  const code = (await leaveRequest(fresh, request)) ? fresh : null;
  const link = requestLink(encodeRequest(request));
  const email = accessEmail(request, code, link);
  const asked = Date.now();
  await SecureStore.setItemAsync(ASKED_KEY, String(asked)).catch(() => {});
  if (code) await SecureStore.setItemAsync(REQUEST_CODE_KEY, code).catch(() => {});
  else await SecureStore.deleteItemAsync(REQUEST_CODE_KEY).catch(() => {});
  publish({ name: clean, askedAt: asked, requestCode: code });
  const mailto = `mailto:${PROBLEM_REPORT_ADDRESS}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body.replace(/\n/g, '\r\n'))}`;
  try {
    await Linking.openURL(mailto);
    return 'opened';
  } catch (error) {
    console.warn('[testerAccess] no email app opened', error);
  }
  try {
    await Clipboard.setStringAsync(`${PROBLEM_REPORT_ADDRESS}\n${email.subject}\n\n${email.body}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export type ActivateResult = 'ok' | 'notApproval' | 'wrongDevice' | 'expired' | 'notFound' | 'offline';

/** Keeps a signed approval token when it is for this device and still runs. */
async function keepToken(token: string): Promise<ActivateResult> {
  const read = readApproval(token, TRUSTED_APPROVAL_KEYS);
  if (!read) return 'notApproval';
  const state = approvalState(read, await myTag(), Date.now(), latestSeen);
  if (state.kind === 'wrongDevice') return 'wrongDevice';
  if (state.kind === 'expired') return 'expired';
  const kept = laterApproval(approval, read);
  if (kept === read) {
    approval = read;
    await SecureStore.setItemAsync(ACTIVATION_KEY, token);
  }
  // The request is answered, so For Testers stops showing its code and box.
  await SecureStore.deleteItemAsync(REQUEST_CODE_KEY).catch(() => {});
  publish({ requestCode: null });
  await recompute();
  return 'ok';
}

/** What the site holds under a secret: the token, nothing there yet, or
 *  the site out of reach. */
async function fetchDrop(secret: string): Promise<string | 'notFound' | 'offline'> {
  let response: Response;
  try {
    response = await fetch(`${DROP_URL}/get?slot=${dropSlot(secret)}`);
  } catch {
    return 'offline';
  }
  if (response.status === 404) return 'notFound';
  if (!response.ok) return 'offline';
  try {
    const answer = (await response.json()) as { body?: unknown };
    const token = typeof answer.body === 'string' ? openDrop(answer.body, secret) : null;
    return token ?? 'notFound';
  } catch {
    return 'offline';
  }
}

/** Takes the short code from the reply email, or an activation link, typed,
 *  pasted or opened. */
export async function activateFromText(input: string): Promise<ActivateResult> {
  // A reply that quotes the request below it carries this device's request
  // code too, which is never the approval.
  const typed = findCodes(input).filter((one) => one !== snapshot.requestCode);
  if (typed.length) {
    let last: ActivateResult = 'notFound';
    for (const one of typed) {
      const found = await fetchDrop(one);
      if (found === 'offline') return 'offline';
      if (found === 'notFound') continue;
      last = await keepToken(found);
      if (last === 'ok') return 'ok';
    }
    return last;
  }
  const code = extractCode(input, 'a');
  if (!code) return 'notApproval';
  return keepToken(code);
}

/** The words for what activateFromText answered. */
export function activateResultText(result: ActivateResult): string {
  switch (result) {
    case 'ok':
      return t('This device can open Lifestead Test now.');
    case 'wrongDevice':
      return t('That approval is for a different device. Each phone or computer asks for its own, so ask from this one.');
    case 'expired':
      return t('That approval has already ended. Ask for more time and a new code will come.');
    case 'notFound':
      return t('Nothing is waiting under that code. Check it against the email, or ask again if it is more than two weeks old.');
    case 'offline':
      return t('The code could not be checked without internet. Connect and try again.');
    default:
      return t('That is not a code for Lifestead Test. Type the eight letters and numbers from the email.');
  }
}

let watching = false;

/** Checks again when the app comes back to the front, and every hour, so an
 *  approval ends at its end even with the app left open. */
export function startTesterAccessWatch(): () => void {
  if (watching) return () => {};
  watching = true;
  void loadTesterAccess();
  const subscription = AppState.addEventListener('change', (next) => {
    if (next === 'active') void recompute();
  });
  const timer = setInterval(() => void recompute(), 60 * 60 * 1000);
  return () => {
    watching = false;
    subscription.remove();
    clearInterval(timer);
  };
}
