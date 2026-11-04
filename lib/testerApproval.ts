// Access for the tester version (tester plan T12, 2026-10-31).
//
// The tester version opens only on a device the developer has approved, for
// 90 days at a time. A tester asks from inside the app, which writes an
// email to testers@ghostead.com carrying a request: their name and a tag
// made from this device's identity key (lib/deviceIdentity.ts), which never
// leaves the device. The developer approves it on the developer version or
// on the PC (scripts/approve_tester.js), which signs an approval naming that
// device and when it ends, and sends back an activation link. The tester
// version checks the signature against the keys in testerApprovalKeys.ts, so
// no server has to vouch for anything.
//
// Code in, code out (1.0.81.2, by direct instruction: "The tester Requests
// for Access and their app sends me a code. I copy the code they send and
// paste it into my developer app ... creates a new code that I then send back
// to them. They receive the code and enter it"). Both ways a short code
// stands for something left sealed at lifestead.ghostead.com/tester/v1: the
// request, under the request code the tester emails (requestSecret), and the
// signed approval, under the code the reply carries. The site holds
// ciphertext it has no key for, by a slot it cannot turn back into the code,
// for DROP_DAYS. The long links still work when the site cannot be reached.
// The pickup a request carried in 1.0.80.11 and 1.0.81.1 is still read, so
// an approval for one of those still reaches it, but nothing makes one now.
//
// What this stops: a copy of the installer passed to somebody else opens on
// their device to the request screen and nothing more, and an activation
// link passed along is for one device and opens nothing on any other. A
// clock set back does not stretch the 90 days, since the latest time this
// device has seen is kept and used whenever the clock reads earlier.
//
// Pure: tweetnacl and nothing else, so scripts/test_tester_approval.js and
// scripts/approve_tester.js run it under node.
import nacl from 'tweetnacl';

export const APPROVAL_DAYS = 90;
/** From this many days before the end, the app offers to ask for more. */
export const RENEW_FROM_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;
const DEVICE_TAG_DOMAIN = 'lifestead-tester-device-v1:';
const LINK_HOST = 'https://lifestead.ghostead.com';

export type AccessRequest = {
  v: 1;
  /** The name the tester gave, as they wrote it. */
  name: string;
  /** deviceTag() of the asking device. */
  device: string;
  platform: 'phone' | 'computer';
  /** True when the device already had access and is asking for more. */
  renewal: boolean;
  /** When it was asked, ms since 1970. */
  asked: number;
  /** A secret this device made for picking up its approval by itself, on
   *  a request from 1.0.80.11 or 1.0.81.1 only. */
  pickup?: string;
  /** Which copy of the app asked: its id and version. Missing on a request
   *  from before 1.0.81.2. */
  app?: string;
};

export type Approval = {
  v: 1;
  name: string;
  device: string;
  issued: number;
  expires: number;
  /** Which approval key signed it (ApprovalKey.id). */
  by: string;
};

export type ApprovalKey = {
  id: string;
  /** Who holds it, said in words for whoever reads the list. */
  label: string;
  /** Ed25519 public key, standard base64. */
  publicKey: string;
};

export type ApprovalState =
  | { kind: 'missing' }
  | { kind: 'wrongDevice'; approval: Approval }
  | { kind: 'expired'; approval: Approval }
  | { kind: 'ok'; approval: Approval; daysLeft: number; renewSoon: boolean };

// UTF-8 by hand, since TextEncoder and TextDecoder are not on every engine
// this runs on.
export function utf8Bytes(text: string): Uint8Array {
  const out: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) as number;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
  }
  return Uint8Array.from(out);
}

export function utf8Text(bytes: Uint8Array): string {
  let text = '';
  let i = 0;
  while (i < bytes.length) {
    const a = bytes[i];
    let code: number;
    if (a < 0x80) {
      code = a;
      i += 1;
    } else if (a < 0xe0) {
      code = ((a & 31) << 6) | (bytes[i + 1] & 63);
      i += 2;
    } else if (a < 0xf0) {
      code = ((a & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63);
      i += 3;
    } else {
      code = ((a & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63);
      i += 4;
    }
    text += String.fromCodePoint(code);
  }
  return text;
}

const B64U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Base64 with - and _ and no padding, so a code survives a link and an email. */
export function toBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64U[(n >> 18) & 63] + B64U[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += B64U[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += B64U[n & 63];
  }
  return out;
}

export function fromBase64Url(text: string): Uint8Array | null {
  const clean = text.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of clean) {
    const index = B64U.indexOf(char);
    if (index === -1) return null;
    value = (value << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >> bits) & 255);
    }
  }
  return Uint8Array.from(out);
}

/** Standard base64 (the form deviceIdentity.ts stores keys in) to bytes. */
export function fromBase64(text: string): Uint8Array | null {
  return fromBase64Url(text);
}

/** A short tag for one device, made from its public identity key. The key
 *  itself never travels; the tag cannot be turned back into it. */
export function deviceTag(publicKeyBase64: string): string {
  const digest = nacl.hash(utf8Bytes(DEVICE_TAG_DOMAIN + publicKeyBase64));
  return toBase64Url(digest.slice(0, 12));
}

function encodeJson(value: unknown): string {
  return toBase64Url(utf8Bytes(JSON.stringify(value)));
}

function decodeJson(code: string): unknown {
  const bytes = fromBase64Url(code);
  if (!bytes) return null;
  try {
    return JSON.parse(utf8Text(bytes));
  } catch {
    return null;
  }
}

export function encodeRequest(request: AccessRequest): string {
  return encodeJson(request);
}

export function decodeRequest(code: string): AccessRequest | null {
  const value = decodeJson(code) as Partial<AccessRequest> | null;
  if (!value || value.v !== 1) return null;
  if (typeof value.name !== 'string' || !value.name.trim()) return null;
  if (typeof value.device !== 'string' || !/^[A-Za-z0-9_-]{8,40}$/.test(value.device)) return null;
  if (value.platform !== 'phone' && value.platform !== 'computer') return null;
  if (typeof value.asked !== 'number') return null;
  return {
    v: 1,
    name: value.name.trim().slice(0, 80),
    device: value.device,
    platform: value.platform,
    renewal: value.renewal === true,
    asked: value.asked,
    ...(typeof value.pickup === 'string' && /^[A-Za-z0-9_-]{16,44}$/.test(value.pickup) ? { pickup: value.pickup } : {}),
    ...(typeof value.app === 'string' && value.app.trim() ? { app: value.app.trim().slice(0, 80) } : {}),
  };
}

export function makeApproval(request: AccessRequest, keyId: string, now: number, days: number = APPROVAL_DAYS): Approval {
  return { v: 1, name: request.name, device: request.device, issued: now, expires: now + days * DAY_MS, by: keyId };
}

/** The activation token: the approval and its signature, both base64url,
 *  joined by a dot. */
export function signApproval(approval: Approval, secretKey: Uint8Array): string {
  const body = utf8Bytes(JSON.stringify(approval));
  const signature = nacl.sign.detached(body, secretKey);
  return toBase64Url(body) + '.' + toBase64Url(signature);
}

/** The approval inside a token, when a trusted key signed it; null for
 *  anything else, a changed character included. */
export function readApproval(token: string, keys: readonly ApprovalKey[]): Approval | null {
  const [bodyPart, signaturePart, extra] = token.trim().split('.');
  if (!bodyPart || !signaturePart || extra !== undefined) return null;
  const body = fromBase64Url(bodyPart);
  const signature = fromBase64Url(signaturePart);
  if (!body || !signature || signature.length !== nacl.sign.signatureLength) return null;
  let approval: Partial<Approval>;
  try {
    approval = JSON.parse(utf8Text(body));
  } catch {
    return null;
  }
  if (!approval || approval.v !== 1 || typeof approval.by !== 'string') return null;
  const key = keys.find((one) => one.id === approval.by);
  const publicKey = key ? fromBase64(key.publicKey) : null;
  if (!publicKey || publicKey.length !== nacl.sign.publicKeyLength) return null;
  if (!nacl.sign.detached.verify(body, signature, publicKey)) return null;
  if (typeof approval.device !== 'string' || typeof approval.expires !== 'number' || typeof approval.issued !== 'number') return null;
  return {
    v: 1,
    name: typeof approval.name === 'string' ? approval.name : '',
    device: approval.device,
    issued: approval.issued,
    expires: approval.expires,
    by: approval.by,
  };
}

/** Whether this device may open the tester version right now. `latestSeen`
 *  is the latest time this device has recorded, so turning the clock back
 *  never brings an ended approval back. */
export function approvalState(approval: Approval | null, tag: string, now: number, latestSeen: number = 0): ApprovalState {
  if (!approval) return { kind: 'missing' };
  if (approval.device !== tag) return { kind: 'wrongDevice', approval };
  const effectiveNow = Math.max(now, latestSeen);
  if (effectiveNow >= approval.expires) return { kind: 'expired', approval };
  const daysLeft = Math.ceil((approval.expires - effectiveNow) / DAY_MS);
  return { kind: 'ok', approval, daysLeft, renewSoon: daysLeft <= RENEW_FROM_DAYS };
}

/** Of two approvals for this device, the one that lasts longer. A renewal
 *  pasted twice, or an older link opened after a newer one, never shortens
 *  access. */
export function laterApproval(a: Approval | null, b: Approval | null): Approval | null {
  if (!a) return b;
  if (!b) return a;
  return b.expires > a.expires ? b : a;
}

export function requestLink(code: string): string {
  return `${LINK_HOST}/approve#r=${code}`;
}

export function activationLink(token: string): string {
  return `${LINK_HOST}/activate#a=${token}`;
}

/** The code from whatever was pasted: an https link (#a= or #r=), an app
 *  link (?a= or ?r=), or the code by itself. */
export function extractCode(input: string, which: 'a' | 'r'): string | null {
  const text = input.trim();
  if (!text) return null;
  const match = text.match(new RegExp(`[#?&]${which}=([A-Za-z0-9_.-]+)`));
  if (match) return match[1];
  if (/[\s/:#?&=]/.test(text)) return null;
  const allowed = which === 'a' ? /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/ : /^[A-Za-z0-9_-]+$/;
  return allowed.test(text) ? text : null;
}

/** The first word of a name, for the faint name across the tester screens. */
export function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  return [...first].slice(0, 20).join('');
}

/** The date an approval ends, as YYYY-MM-DD in the device's local day. */
export function endDay(approval: Approval): string {
  const date = new Date(approval.expires);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ---- The code and the sealed drop (1.0.80.11) ----

/** Where approvals wait to be picked up. */
export const DROP_URL = `${LINK_HOST}/tester/v1`;
/** How long the site keeps a sealed approval. */
export const DROP_DAYS = 14;

/** No 0, 1, I or O, so nothing reads as something else. 32 letters, so a
 *  random byte masked to five bits picks each one evenly. */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const CODE_LENGTH = 8;

/** A code from CODE_LENGTH random bytes. */
export function codeFromBytes(bytes: Uint8Array): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) code += CODE_ALPHABET[bytes[i] & 31];
  return code;
}

/** As it is shown and written: two groups of four. */
export function formatCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** The code in whatever was typed or pasted (spaces, dashes and small
 *  letters forgiven), or null when it is not one. A link or a long approval
 *  is never read as a code. */
export function normalizeCode(input: string): string | null {
  const text = input.trim();
  if (!text || text.length > 40 || /[#?=./:]/.test(text)) return null;
  const clean = text.toUpperCase().replace(/[\s-]/g, '');
  if (clean.length !== CODE_LENGTH) return null;
  for (const char of clean) if (!CODE_ALPHABET.includes(char)) return null;
  return clean;
}

/** The code anywhere in what was pasted, so a whole copied email still
 *  works: the text itself when it is a code, otherwise the first XXXX-XXXX
 *  in it. Text carrying an activation link is left to extractCode. */
export function findCode(input: string): string | null {
  const exact = normalizeCode(input);
  if (exact) return exact;
  if (/[#?&]a=/.test(input)) return null;
  const match = input.match(/(?:^|[^A-Za-z0-9_-])([2-9A-HJ-NP-Za-hj-np-z]{4}-[2-9A-HJ-NP-Za-hj-np-z]{4})(?![A-Za-z0-9_-])/);
  return match ? normalizeCode(match[1]) : null;
}

/** Every code in what was pasted, in order and once each, so a reply that
 *  quotes the request below it still yields the approval code: the caller
 *  leaves out the code it sent itself. */
export function findCodes(input: string): string[] {
  const exact = normalizeCode(input);
  if (exact) return [exact];
  if (/[#?&]a=/.test(input)) return [];
  const found: string[] = [];
  const pattern = /(?:^|[^A-Za-z0-9_-])([2-9A-HJ-NP-Za-hj-np-z]{4}-[2-9A-HJ-NP-Za-hj-np-z]{4})(?![A-Za-z0-9_-])/g;
  for (const match of input.matchAll(pattern)) {
    const code = normalizeCode(match[1]);
    if (code && !found.includes(code)) found.push(code);
  }
  return found;
}

/** What a request is sealed with on the site: its code, kept apart from
 *  approval codes so one can never open the other. */
export function requestSecret(code: string): string {
  return `request:${code}`;
}

/** A fresh pickup secret from 16 random bytes. */
export function pickupFromBytes(bytes: Uint8Array): string {
  return toBase64Url(bytes.slice(0, 16));
}

function derive(label: string, secret: string): Uint8Array {
  return nacl.hash(utf8Bytes(`lifestead-tester-drop-v1:${label}:${secret}`));
}

/** The slot a secret (a pickup or a code) is left under. One way: the site
 *  cannot get the secret back from it. */
export function dropSlot(secret: string): string {
  return toBase64Url(derive('slot', secret).slice(0, 24));
}

/** The approval token sealed with a key made from the secret. */
export function sealDrop(token: string, secret: string, nonce: Uint8Array): string {
  const key = derive('key', secret).slice(0, nacl.secretbox.keyLength);
  const box = nacl.secretbox(utf8Bytes(token), nonce.slice(0, nacl.secretbox.nonceLength), key);
  const out = new Uint8Array(nacl.secretbox.nonceLength + box.length);
  out.set(nonce.slice(0, nacl.secretbox.nonceLength), 0);
  out.set(box, nacl.secretbox.nonceLength);
  return toBase64Url(out);
}

/** The approval token back out of a drop, or null when the secret is wrong
 *  or anything was changed. */
export function openDrop(body: string, secret: string): string | null {
  const bytes = fromBase64Url(body);
  if (!bytes || bytes.length <= nacl.secretbox.nonceLength) return null;
  const key = derive('key', secret).slice(0, nacl.secretbox.keyLength);
  const opened = nacl.secretbox.open(bytes.slice(nacl.secretbox.nonceLength), bytes.slice(0, nacl.secretbox.nonceLength), key);
  return opened ? utf8Text(opened) : null;
}
