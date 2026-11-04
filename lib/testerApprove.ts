// Approving a tester from the developer version (tester plan T12,
// 2026-10-31). Developer only: metro.config.js swaps this file for
// lib/variantStubs/testerApprove.ts in the tester and store versions, so
// they carry no way to approve anybody.
//
// Each developer device makes an approval key of its own the first time it
// is needed, a seed in the device's secure store that never leaves it. Its
// public half reaches the tester version by Developer Tools > Send My
// Approval Key to Claude, a Tell Claude note, and is added to
// lib/testerApprovalKeys.ts in the next update. Until then an approval from
// this device is signed but not yet accepted, and the screen says so.
//
// Since 1.0.81.2 it is a code each way: the tester's email carries a request
// code, which is fetched and opened here, and the approval is left on the
// site, sealed, under a new code for the reply. Each approval is kept in
// tester_approvals, so the developer version holds who was approved, on
// which device and which copy of the app. A request link from an older
// tester version still works, and an approval for one that carried a pickup
// is left under it too, since that version still looks there.
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import { isDesktopApp } from './desktop/bridge';
import { bytesToBase64, base64ToBytes } from './deviceIdentity';
import { getDatabase } from './db';
import { addDevNote, syncDevNotes } from './devNotesDb';
import {
  activationLink,
  codeFromBytes,
  CODE_LENGTH,
  decodeRequest,
  deviceTag,
  dropSlot,
  DROP_URL,
  endDay,
  extractCode,
  findCodes,
  makeApproval,
  openDrop,
  requestSecret,
  sealDrop,
  signApproval,
  type AccessRequest,
} from './testerApproval';
import { TRUSTED_APPROVAL_KEYS } from './testerApprovalKeys';

const SEED_KEY = 'tester_approval_seed_v1';

async function keyPair(): Promise<nacl.SignKeyPair> {
  let stored = await SecureStore.getItemAsync(SEED_KEY);
  if (!stored) {
    const seed = await Crypto.getRandomBytesAsync(nacl.sign.seedLength);
    stored = bytesToBase64(seed);
    await SecureStore.setItemAsync(SEED_KEY, stored);
  }
  return nacl.sign.keyPair.fromSeed(base64ToBytes(stored));
}

export type MyApprovalKey = { id: string; label: string; publicKey: string; trusted: boolean };

export async function getMyApprovalKey(): Promise<MyApprovalKey> {
  const pair = await keyPair();
  const publicKey = bytesToBase64(pair.publicKey);
  const id = `dev-${deviceTag(publicKey).slice(0, 8)}`;
  const label = isDesktopApp() ? "The developer's computer" : "The developer's phone";
  return { id, label, publicKey, trusted: TRUSTED_APPROVAL_KEYS.some((key) => key.id === id && key.publicKey === publicKey) };
}

export type Approved =
  | {
      ok: true;
      /** This approval's line in tester_approvals, null when it could not be written. */
      recordId: string | null;
      request: AccessRequest;
      link: string;
      until: string;
      trusted: boolean;
      /** The code to type, when the site took the sealed approval; null when
       *  it could not be reached, and the reply carries the link instead. */
      code: string | null;
      /** True when the asking device can pick it up by itself. */
      pickup: boolean;
    }
  | { ok: false; reason: string };

async function leaveDrop(secret: string, token: string): Promise<boolean> {
  try {
    const nonce = await Crypto.getRandomBytesAsync(nacl.secretbox.nonceLength);
    const response = await fetch(`${DROP_URL}/put`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slot: dropSlot(secret), body: sealDrop(token, secret, nonce) }),
    });
    return response.ok;
  } catch (error) {
    console.warn('[testerApprove] could not reach the site', error);
    return false;
  }
}

/** The request a request code stands for, fetched from the site and opened. */
async function fetchRequest(code: string): Promise<AccessRequest | 'notFound' | 'offline'> {
  const secret = requestSecret(code);
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
    const opened = typeof answer.body === 'string' ? openDrop(answer.body, secret) : null;
    return (opened && decodeRequest(opened)) || 'notFound';
  } catch {
    return 'offline';
  }
}

/** The request in what was pasted: a request code (a whole copied email is
 *  fine), or a request link from an older tester version. */
async function readRequest(input: string): Promise<AccessRequest | string> {
  const codes = findCodes(input);
  if (codes.length) {
    let offline = false;
    for (const one of codes) {
      const found = await fetchRequest(one);
      if (found === 'offline') offline = true;
      else if (found !== 'notFound') return found;
    }
    return offline
      ? 'The site could not be reached, so the request code could not be read. Connect and try again.'
      : 'Nothing is waiting under that request code. Check it against the email, or ask the tester to ask again if it is more than two weeks old.';
  }
  const link = extractCode(input, 'r');
  const request = link ? decodeRequest(link) : null;
  return request ?? 'That is not a request code from Lifestead Test. Copy the eight letters and numbers from the tester\'s email.';
}

export type TesterApprovalRecord = {
  id: string;
  approvedAt: string;
  name: string;
  device: string;
  platform: string;
  app: string | null;
  renewal: boolean;
  untilDay: string;
  code: string | null;
};

/** Writes the record, in place of `replaces` when the same request was
 *  signed again for another length. Null when it could not be written. */
async function keepRecord(request: AccessRequest, until: string, code: string | null, replaces?: string): Promise<string | null> {
  try {
    const db = await getDatabase();
    const id = replaces ?? bytesToBase64(await Crypto.getRandomBytesAsync(12));
    if (replaces) await db.runAsync('DELETE FROM tester_approvals WHERE id = ?', [replaces]);
    await db.runAsync(
      'INSERT INTO tester_approvals (id, approved_at, name, device, platform, app, renewal, until_day, code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, new Date().toISOString(), request.name, request.device, request.platform, request.app ?? null, request.renewal ? 1 : 0, until, code],
    );
    return id;
  } catch (error) {
    // The approval still went; only the developer's list is missing a line.
    console.warn('[testerApprove] could not keep the record', error);
    return null;
  }
}

/** Every approval given from this device, newest first. */
export async function listTesterApprovals(): Promise<TesterApprovalRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Omit<TesterApprovalRecord, 'renewal'> & { renewal: number }>(
    'SELECT id, approved_at AS approvedAt, name, device, platform, app, renewal, until_day AS untilDay, code FROM tester_approvals ORDER BY approved_at DESC',
  );
  return rows.map((row) => ({ ...row, renewal: row.renewal === 1 }));
}

/** Reads a request code or link and signs an approval for the device in it.
 *  `replaces` is the record of the same request signed a moment ago for
 *  another length, so the list holds one line for it. */
export async function approveRequest(input: string, days?: number, replaces?: string): Promise<Approved> {
  const request = await readRequest(input);
  if (typeof request === 'string') return { ok: false, reason: request };
  const pair = await keyPair();
  const mine = await getMyApprovalKey();
  const approval = makeApproval(request, mine.id, Date.now(), days);
  const token = signApproval(approval, pair.secretKey);
  const typed = codeFromBytes(await Crypto.getRandomBytesAsync(CODE_LENGTH));
  const [codeLeft, pickupLeft] = await Promise.all([
    leaveDrop(typed, token),
    request.pickup ? leaveDrop(request.pickup, token) : Promise.resolve(false),
  ]);
  const until = endDay(approval);
  const code = codeLeft ? typed : null;
  const recordId = await keepRecord(request, until, code, replaces);
  return {
    ok: true,
    recordId,
    request,
    link: activationLink(token),
    until,
    trusted: mine.trusted,
    code,
    pickup: pickupLeft,
  };
}

/** Leaves this device's public approval key as a Tell Claude note, for
 *  lib/testerApprovalKeys.ts. Returns the problem, or null when it went. */
export async function sendMyApprovalKey(): Promise<string | null> {
  const mine = await getMyApprovalKey();
  await addDevNote({
    kind: 'idea',
    body: `Tester approval key for lib/testerApprovalKeys.ts: { id: '${mine.id}', label: "${mine.label}", publicKey: '${mine.publicKey}' }`,
    tab: 'Profile',
    lens: null,
    bandId: null,
    bandTitle: 'Developer Tools',
  });
  const result = await syncDevNotes();
  return result.problem;
}
