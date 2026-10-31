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
// nothing has to be online and no server holds anything.
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
