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
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import { isDesktopApp } from './desktop/bridge';
import { bytesToBase64, base64ToBytes } from './deviceIdentity';
import { addDevNote, syncDevNotes } from './devNotesDb';
import {
  activationLink,
  decodeRequest,
  deviceTag,
  endDay,
  extractCode,
  makeApproval,
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
  | { ok: true; request: AccessRequest; link: string; until: string; trusted: boolean }
  | { ok: false; reason: string };

/** Reads a request link or code and signs an approval for the device in it. */
export async function approveRequest(input: string, days?: number): Promise<Approved> {
  const code = extractCode(input, 'r');
  const request = code ? decodeRequest(code) : null;
  if (!request) return { ok: false, reason: 'That is not a request from Lifestead Test. Copy the whole link from the email.' };
  const pair = await keyPair();
  const mine = await getMyApprovalKey();
  const approval = makeApproval(request, mine.id, Date.now(), days);
  return { ok: true, request, link: activationLink(signApproval(approval, pair.secretKey)), until: endDay(approval), trusted: mine.trusted };
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
