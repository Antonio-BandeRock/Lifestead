// The tester version's side of access (tester plan T12, 2026-10-31).
//
// Everything here is kept in the device's secure store, never in the
// database, so it never travels through sync or a backup: an approval is for
// this device, and a restored backup on another phone has to ask again.
// The rules (what a request and an approval are, when one has ended) are in
// lib/testerApproval.ts; this file keeps them and asks.
//
// Since 1.0.80.11 a request carries a pickup secret made here, and the
// approver leaves the approval sealed on the site under it. This device looks
// for it when it starts, when it comes to the front and every minute while it
// waits, so an approved tester does nothing at all. The short code in the
// reply email opens the same thing by hand, and the long link still works.
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { AppState, Linking } from 'react-native';
import { isDesktopApp } from './desktop/bridge';
import { getDeviceIdentity } from './deviceIdentity';
import { t } from './i18n';
import { PROBLEM_REPORT_ADDRESS } from './problemReport';
import {
  approvalState,
  deviceTag,
  dropSlot,
  DROP_URL,
  encodeRequest,
  extractCode,
  findCode,
  laterApproval,
  openDrop,
  pickupFromBytes,
  readApproval,
  requestLink,
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
const PICKUP_KEY = 'tester_pickup_v1';

/** Raised when the agreement's words change enough to be read again. */
export const TESTER_AGREEMENT_VERSION = '1';

export type TesterAccess = {
  loaded: boolean;
  agreed: boolean;
  name: string;
  /** When this device last asked, ms, or null. */
  askedAt: number | null;
  state: ApprovalState;
};

let snapshot: TesterAccess = { loaded: false, agreed: false, name: '', askedAt: null, state: { kind: 'missing' } };
let tag: string | null = null;
let approval: Approval | null = null;
let latestSeen = 0;
let pickup: string | null = null;
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
    const [token, seen, agreed, name, asked, waiting] = await Promise.all([
      SecureStore.getItemAsync(ACTIVATION_KEY),
      SecureStore.getItemAsync(LATEST_SEEN_KEY),
      SecureStore.getItemAsync(AGREEMENT_KEY),
      SecureStore.getItemAsync(NAME_KEY),
      SecureStore.getItemAsync(ASKED_KEY),
      SecureStore.getItemAsync(PICKUP_KEY),
    ]);
    pickup = waiting;
    approval = token ? readApproval(token, TRUSTED_APPROVAL_KEYS) : null;
    latestSeen = Number(seen) || 0;
    publish({
      agreed: agreed === TESTER_AGREEMENT_VERSION,
      name: name ?? '',
      askedAt: asked ? Number(asked) || null : null,
    });
    await recompute();
    void lookForApproval();
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

function accessEmail(request: AccessRequest, link: string): { subject: string; body: string } {
  const subject = request.renewal
    ? t('More time on Lifestead Test for {name}', { name: request.name })
    : t('Lifestead Test access for {name}', { name: request.name });
  const body = [
    request.renewal ? t('Please give this device more time on Lifestead Test.') : t('Please let this device open Lifestead Test.'),
    '',
    t('Name: {name}', { name: request.name }),
    request.platform === 'phone' ? t('Device: a phone') : t('Device: a computer'),
    '',
    link,
    '',
    t('This link carries only the name above and a code for this device. Nothing from the app is in it.'),
  ].join('\n');
  return { subject, body };
}

/** Writes the request into the tester's email app, addressed to the
 *  testers inbox. Where no email app opens, the request is copied. */
export async function askForAccess(name: string, renewal: boolean): Promise<AskResult> {
  const clean = name.trim();
  await SecureStore.setItemAsync(NAME_KEY, clean).catch(() => {});
  // A fresh pickup each time, so an older request's approval and a newer
  // one never share a slot.
  pickup = pickupFromBytes(await Crypto.getRandomBytesAsync(16));
  await SecureStore.setItemAsync(PICKUP_KEY, pickup).catch(() => {});
  const request: AccessRequest = {
    v: 1,
    name: clean,
    device: await myTag(),
    platform: isDesktopApp() ? 'computer' : 'phone',
    renewal,
    asked: Date.now(),
    pickup,
  };
  const link = requestLink(encodeRequest(request));
  const email = accessEmail(request, link);
  const asked = Date.now();
  await SecureStore.setItemAsync(ASKED_KEY, String(asked)).catch(() => {});
  publish({ name: clean, askedAt: asked });
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

let looking = false;

/** Looks on the site for the approval this device asked for. Quiet: nothing
 *  waiting, or no internet, just means look again later. */
async function lookForApproval(): Promise<void> {
  if (!pickup || looking) return;
  looking = true;
  try {
    const secret = pickup;
    const found = await fetchDrop(secret);
    if (found === 'notFound' || found === 'offline') return;
    await keepToken(found);
    // Kept, or for some reason never usable here: either way this pickup has
    // been answered, so stop asking the site about it.
    if (pickup === secret) {
      pickup = null;
      await SecureStore.deleteItemAsync(PICKUP_KEY).catch(() => {});
    }
  } finally {
    looking = false;
  }
}

/** Takes the short code from the reply email, or an activation link, typed,
 *  pasted or opened. */
export async function activateFromText(input: string): Promise<ActivateResult> {
  const typed = findCode(input);
  if (typed) {
    const found = await fetchDrop(typed);
    if (found === 'notFound' || found === 'offline') return found;
    return keepToken(found);
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
 *  approval ends at its end even with the app left open. While a request is
 *  waiting it also looks for the approval at those moments and every minute. */
export function startTesterAccessWatch(): () => void {
  if (watching) return () => {};
  watching = true;
  void loadTesterAccess();
  const subscription = AppState.addEventListener('change', (next) => {
    if (next === 'active') {
      void recompute();
      void lookForApproval();
    }
  });
  const timer = setInterval(() => void recompute(), 60 * 60 * 1000);
  const pickupTimer = setInterval(() => {
    if (AppState.currentState === 'active') void lookForApproval();
  }, 60 * 1000);
  return () => {
    watching = false;
    subscription.remove();
    clearInterval(timer);
    clearInterval(pickupTimer);
  };
}
