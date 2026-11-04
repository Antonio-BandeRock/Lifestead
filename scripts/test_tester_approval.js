/* global Buffer */
// Checks lib/testerApproval.ts (tester plan T12): a request survives the
// trip, an approval verifies only with a trusted key and only unchanged, it
// opens only the device it names, it ends on time, a clock set back does not
// stretch it, a pasted link gives up its code, and a name with accents comes
// through whole.
// Run: node scripts/test_tester_approval.js
/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const nacl = require('tweetnacl');

function load(rel, allowed) {
  const file = path.join(__dirname, '..', 'lib', `${rel}.ts`);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', outputText)(m, m.exports, (name) => {
    if (allowed[name]) return allowed[name];
    throw new Error(`lib/${rel}.ts must stay pure, asked for ${name}`);
  });
  return m.exports;
}
const A = load('testerApproval', { tweetnacl: nacl });
const K = load('testerApprovalKeys', {});

let failures = 0;
function check(ok, label) {
  if (!ok) {
    failures++;
    console.log(`FAIL  ${label}`);
  }
}

const DAY = 24 * 60 * 60 * 1000;
const pair = nacl.sign.keyPair.fromSeed(new Uint8Array(32).fill(7));
const other = nacl.sign.keyPair.fromSeed(new Uint8Array(32).fill(9));
const keys = [{ id: 'test-1', label: 'test', publicKey: Buffer.from(pair.publicKey).toString('base64') }];

const phoneKey = Buffer.from(nacl.sign.keyPair.fromSeed(new Uint8Array(32).fill(1)).publicKey).toString('base64');
const otherPhoneKey = Buffer.from(nacl.sign.keyPair.fromSeed(new Uint8Array(32).fill(2)).publicKey).toString('base64');
const tag = A.deviceTag(phoneKey);
const otherTag = A.deviceTag(otherPhoneKey);

// Base64url and UTF-8.
for (const n of [0, 1, 2, 3, 4, 5, 31, 32, 33]) {
  const bytes = nacl.randomBytes(n);
  const back = A.fromBase64Url(A.toBase64Url(bytes));
  check(back && Buffer.from(back).equals(Buffer.from(bytes)), `base64url round trip of ${n} bytes`);
  check(A.toBase64Url(bytes) === Buffer.from(bytes).toString('base64url'), `base64url matches node for ${n} bytes`);
}
for (const text of ['Víctor', 'Ñandú José', 'Zoë 😀', 'plain']) {
  check(A.utf8Text(A.utf8Bytes(text)) === text, `utf8 round trip of ${text}`);
  check(Buffer.from(A.utf8Bytes(text)).equals(Buffer.from(text, 'utf8')), `utf8 bytes match node for ${text}`);
}
check(A.fromBase64(keys[0].publicKey).length === 32, 'standard base64 public key reads as 32 bytes');

// Device tags.
check(tag === A.deviceTag(phoneKey), 'a device tag is stable');
check(tag !== otherTag, 'two devices get different tags');
check(/^[A-Za-z0-9_-]{16}$/.test(tag), 'a tag is 16 link-safe characters');
check(!tag.includes(phoneKey.slice(0, 8)), 'a tag does not carry the key');

// Requests.
const asked = Date.UTC(2026, 9, 31, 15);
const request = { v: 1, name: '  Víctor Hernández ', device: tag, platform: 'phone', renewal: false, asked };
const code = A.encodeRequest(request);
const read = A.decodeRequest(code);
check(read && read.name === 'Víctor Hernández', 'a request keeps an accented name, trimmed');
check(read && read.device === tag && read.platform === 'phone' && read.renewal === false, 'a request keeps its device and platform');
check(A.decodeRequest('not-a-code') === null, 'rubbish is not a request');
check(A.decodeRequest(A.toBase64Url(A.utf8Bytes(JSON.stringify({ ...request, device: 'x' })))) === null, 'a request with a bad device tag is refused');
check(A.decodeRequest(A.toBase64Url(A.utf8Bytes(JSON.stringify({ ...request, name: ' ' })))) === null, 'a request with no name is refused');

// Approvals.
const now = asked + 60 * 60 * 1000;
const approval = A.makeApproval(read, 'test-1', now);
check(approval.expires - approval.issued === 90 * DAY, 'an approval lasts 90 days');
const token = A.signApproval(approval, pair.secretKey);
const back = A.readApproval(token, keys);
check(back && back.device === tag && back.name === 'Víctor Hernández' && back.expires === approval.expires, 'a signed approval reads back');
check(A.readApproval(token, []) === null, 'no trusted keys, no approval');
check(A.readApproval(A.signApproval(approval, other.secretKey), keys) === null, 'an approval from an untrusted key is refused');
check(A.readApproval(A.signApproval({ ...approval, by: 'nobody' }, pair.secretKey), keys) === null, 'an approval naming an unknown key is refused');

// Tampering: change one character of the body or the signature.
const [body, signature] = token.split('.');
const flip = (s, i) => s.slice(0, i) + (s[i] === 'A' ? 'B' : 'A') + s.slice(i + 1);
let tamperRefused = true;
for (const i of [0, 5, 20, body.length - 2]) if (A.readApproval(flip(body, i) + '.' + signature, keys)) tamperRefused = false;
for (const i of [0, 10, signature.length - 2]) if (A.readApproval(body + '.' + flip(signature, i), keys)) tamperRefused = false;
check(tamperRefused, 'a changed character anywhere is refused');
const longer = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
longer.expires += 365 * DAY;
check(A.readApproval(Buffer.from(JSON.stringify(longer)).toString('base64url') + '.' + signature, keys) === null, 'stretching the end date breaks the signature');
check(A.readApproval(token + '.x', keys) === null, 'a third part is refused');

// State.
check(A.approvalState(null, tag, now).kind === 'missing', 'no approval is missing');
check(A.approvalState(back, otherTag, now).kind === 'wrongDevice', 'another device is the wrong device');
const fresh = A.approvalState(back, tag, now);
check(fresh.kind === 'ok' && fresh.daysLeft === 90 && !fresh.renewSoon, 'a fresh approval is ok with 90 days left');
const late = A.approvalState(back, tag, approval.expires - 10 * DAY);
check(late.kind === 'ok' && late.daysLeft === 10 && late.renewSoon, 'ten days before the end offers to renew');
check(A.approvalState(back, tag, approval.expires - 15 * DAY).renewSoon === false, 'fifteen days before the end does not yet');
check(A.approvalState(back, tag, approval.expires).kind === 'expired', 'it ends at its end');
check(A.approvalState(back, tag, approval.expires + DAY).kind === 'expired', 'it stays ended');
check(A.approvalState(back, tag, now, approval.expires + DAY).kind === 'expired', 'a clock set back does not bring it back');
const backwards = A.approvalState(back, tag, now - 30 * DAY, now + 20 * DAY);
check(backwards.kind === 'ok' && backwards.daysLeft === 70, 'a clock set back counts from the latest time seen');

// Later of two.
const renewal = A.makeApproval(read, 'test-1', now + 80 * DAY);
check(A.laterApproval(back, renewal) === renewal, 'a renewal replaces the old approval');
check(A.laterApproval(renewal, back) === renewal, 'an older link opened later does not shorten access');
check(A.laterApproval(null, back) === back && A.laterApproval(back, null) === back, 'one approval stands alone');

// Links and pasting.
const activate = A.activationLink(token);
check(activate.startsWith('https://lifestead.ghostead.com/activate#a='), 'the activation link goes to the activate page');
check(A.extractCode(activate, 'a') === token, 'an https activation link gives up its token');
check(A.extractCode(`lifesteadtest://activate?a=${token}`, 'a') === token, 'an app link gives up its token');
check(A.extractCode(`  ${token}\n`, 'a') === token, 'a bare token pasted with spaces');
check(A.extractCode(`Here it is: ${activate} thanks`, 'a') === token, 'a link inside a sentence');
check(A.extractCode(A.requestLink(code), 'r') === code, 'a request link gives up its code');
check(A.extractCode(code, 'r') === code, 'a bare request code');
check(A.extractCode(code, 'a') === null, 'a request code is not a token');
check(A.extractCode('hello there', 'a') === null && A.extractCode('', 'r') === null, 'words are not a code');

// Names.
check(A.firstName('  Víctor Hernández') === 'Víctor', 'first name keeps its accent');
check(A.firstName('Lisa') === 'Lisa', 'a one-word name');
check([...A.firstName('Aaaaaaaaaaaaaaaaaaaaaaaaaaaa')].length === 20, 'a long first name is cut to 20');

// The code and the sealed drop (1.0.80.11).
const typed = A.codeFromBytes(new Uint8Array([0, 31, 32, 63, 5, 200, 17, 255]));
check(typed.length === A.CODE_LENGTH && /^[2-9A-HJ-NP-Z]+$/.test(typed), 'a code uses only the plain letters and numbers');
check(A.formatCode(typed) === `${typed.slice(0, 4)}-${typed.slice(4)}`, 'a code is shown in two groups of four');
check(A.normalizeCode(` ${A.formatCode(typed).toLowerCase()} `) === typed, 'small letters, spaces and the dash are forgiven');
check(A.normalizeCode(`${typed.slice(0, 4)} ${typed.slice(4)}`) === typed, 'a space in place of the dash');
check(A.normalizeCode('ABCD-EFG0') === null && A.normalizeCode('ABCD-EFGO') === null, 'a 0 or an O is not in a code');
check(A.normalizeCode(token) === null && A.normalizeCode(activate) === null, 'an approval or a link is never read as a code');
check(A.findCode(`Tony, you are approved until 2027-02-02. Type this code there: ${A.formatCode(typed)}`) === typed, 'a whole pasted email gives up its code');
check(A.findCode(`Here it is: ${activate}`) === null, 'text with an activation link is left to the link');
check(A.findCode('nothing here') === null, 'words without a code');
const pickup = A.pickupFromBytes(new Uint8Array(16).fill(3));
check(/^[A-Za-z0-9_-]{22}$/.test(pickup), 'a pickup is 22 base64url characters');
const withPickup = A.decodeRequest(A.encodeRequest({ ...request, pickup }));
check(withPickup && withPickup.pickup === pickup, 'a request carries its pickup through');
check(A.decodeRequest(A.encodeRequest({ ...request, pickup: 'short' })).pickup === undefined, 'a pickup that is not one is dropped');
check(A.dropSlot(typed) === A.dropSlot(typed) && A.dropSlot(typed) !== A.dropSlot(pickup), 'a slot is the same for one secret and differs between two');
check(!A.dropSlot(typed).includes(typed), 'a slot does not carry the code');
const sealed = A.sealDrop(token, typed, new Uint8Array(24).fill(1));
check(/^[A-Za-z0-9_-]+$/.test(sealed) && sealed.length < 4096, 'a sealed approval fits what the site takes');
check(!sealed.includes(token.slice(0, 20)), 'a sealed approval does not show the approval');
check(A.openDrop(sealed, typed) === token, 'the right code opens it');
check(A.openDrop(sealed, pickup) === null, 'another secret does not');
check(A.openDrop(`${sealed.slice(0, -2)}AA`, typed) === null, 'a changed one does not');
check(A.openDrop('', typed) === null && A.openDrop('!!', typed) === null, 'garbage does not');

// The shipped list.
check(Array.isArray(K.TRUSTED_APPROVAL_KEYS) && K.TRUSTED_APPROVAL_KEYS.length > 0, 'at least one trusted key ships');
const ids = new Set();
for (const key of K.TRUSTED_APPROVAL_KEYS) {
  check(!ids.has(key.id), `key id ${key.id} is listed once`);
  ids.add(key.id);
  const bytes = A.fromBase64(key.publicKey);
  check(bytes && bytes.length === 32, `key ${key.id} is a 32-byte public key`);
}

if (failures) {
  console.log(`${failures} failed`);
  process.exit(1);
}
console.log('tester approval: all checks pass');
