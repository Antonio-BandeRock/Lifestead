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
// Since 1.0.80.11 an approval is also left on the site, sealed, twice: once
// under a short code for the reply email, and once under the pickup secret
// the asking device put in its request, so that device unlocks by itself the
// next time it is open with internet. The link stays as the way that needs
// no site at all.
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import { isDesktopApp } from './desktop/bridge';
import { bytesToBase64, base64ToBytes } from './deviceIdentity';
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
  makeApproval,
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

/** Reads a request link or code and signs an approval for the device in it. */
export async function approveRequest(input: string, days?: number): Promise<Approved> {
  const code = extractCode(input, 'r');
  const request = code ? decodeRequest(code) : null;
  if (!request) return { ok: false, reason: 'That is not a request from Lifestead Test. Copy the whole link from the email.' };
  const pair = await keyPair();
  const mine = await getMyApprovalKey();
  const approval = makeApproval(request, mine.id, Date.now(), days);
  const token = signApproval(approval, pair.secretKey);
  const typed = codeFromBytes(await Crypto.getRandomBytesAsync(CODE_LENGTH));
  const [codeLeft, pickupLeft] = await Promise.all([
    leaveDrop(typed, token),
    request.pickup ? leaveDrop(request.pickup, token) : Promise.resolve(false),
  ]);
  return {
    ok: true,
    request,
    link: activationLink(token),
    until: endDay(approval),
    trusted: mine.trusted,
    code: codeLeft ? typed : null,
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
