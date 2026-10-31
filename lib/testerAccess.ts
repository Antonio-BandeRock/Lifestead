// The tester version's side of access (tester plan T12, 2026-10-31).
//
// Everything here is kept in the device's secure store, never in the
// database, so it never travels through sync or a backup: an approval is for
// this device, and a restored backup on another phone has to ask again.
// The rules (what a request and an approval are, when one has ended) are in
// lib/testerApproval.ts; this file keeps them and asks.
import * as Clipboard from 'expo-clipboard';
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
  encodeRequest,
  extractCode,
  laterApproval,
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
    const [token, seen, agreed, name, asked] = await Promise.all([
      SecureStore.getItemAsync(ACTIVATION_KEY),
      SecureStore.getItemAsync(LATEST_SEEN_KEY),
      SecureStore.getItemAsync(AGREEMENT_KEY),
      SecureStore.getItemAsync(NAME_KEY),
      SecureStore.getItemAsync(ASKED_KEY),
    ]);
    approval = token ? readApproval(token, TRUSTED_APPROVAL_KEYS) : null;
    latestSeen = Number(seen) || 0;
    publish({
      agreed: agreed === TESTER_AGREEMENT_VERSION,
      name: name ?? '',
      askedAt: asked ? Number(asked) || null : null,
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
  const request: AccessRequest = {
    v: 1,
    name: clean,
    device: await myTag(),
    platform: isDesktopApp() ? 'computer' : 'phone',
    renewal,
    asked: Date.now(),
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

export type ActivateResult = 'ok' | 'notApproval' | 'wrongDevice' | 'expired';

/** Takes an activation link or code, pasted or opened. */
export async function activateFromText(input: string): Promise<ActivateResult> {
  const code = extractCode(input, 'a');
  const read = code ? readApproval(code, TRUSTED_APPROVAL_KEYS) : null;
  if (!code || !read) return 'notApproval';
  const state = approvalState(read, await myTag(), Date.now(), latestSeen);
  if (state.kind === 'wrongDevice') return 'wrongDevice';
  if (state.kind === 'expired') return 'expired';
  const kept = laterApproval(approval, read);
  if (kept === read) {
    approval = read;
    await SecureStore.setItemAsync(ACTIVATION_KEY, code);
  }
  await recompute();
  return 'ok';
}

/** The words for what activateFromText answered. */
export function activateResultText(result: ActivateResult): string {
  switch (result) {
    case 'ok':
      return t('This device can open Lifestead Test now.');
    case 'wrongDevice':
      return t('That approval is for a different device. Each phone or computer asks for its own, so ask from this one.');
    case 'expired':
      return t('That approval has already ended. Ask for more time and a new link will come.');
    default:
      return t('That is not an approval link for Lifestead Test. Copy the whole link from the email and paste it here.');
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
