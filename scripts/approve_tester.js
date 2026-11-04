#!/usr/bin/env node
/* global Buffer */
// Approves a device for the tester version from the PC (tester plan T12).
//
//   node scripts/approve_tester.js K7M2-QX9P      the request code from the email
//   node scripts/approve_tester.js K7M2-QX9P --days 30
//   node scripts/approve_tester.js --new-key      makes a new PC key
//
// Signs with the seed in _backups/tester-approval/pc-approval-key.json, which
// never enters the repo. Since 1.0.81.2 it takes the request code from the
// tester's email, fetches and opens the request it stands for, leaves the
// approval sealed on the site under a new code, and prints a reply carrying
// that code, as the developer version does (lib/testerApprove.ts). Each
// approval is added to approved-testers.jsonl beside the key, so the PC
// keeps who was approved too. A request link from an older tester version
// still works. Where the site cannot be reached the reply carries the
// activation link instead.
/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const crypto = require('crypto');
const nacl = require('tweetnacl');

const KEY_FILE = 'C:/Users/TonyR/OneDrive/Desktop/AppProject/_backups/tester-approval/pc-approval-key.json';
const RECORD_FILE = path.join(path.dirname(KEY_FILE), 'approved-testers.jsonl');

function load(rel) {
  const file = path.join(__dirname, '..', 'lib', `${rel}.ts`);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', outputText)(m, m.exports, (name) => {
    if (name === 'tweetnacl') return nacl;
    throw new Error(`lib/${rel}.ts asked for ${name}`);
  });
  return m.exports;
}
const A = load('testerApproval');

const args = process.argv.slice(2);

if (args[0] === '--new-key') {
  if (fs.existsSync(KEY_FILE)) {
    console.error(`${KEY_FILE} already exists. Move it aside first if a new key is wanted.`);
    process.exit(1);
  }
  const seed = nacl.randomBytes(32);
  const pair = nacl.sign.keyPair.fromSeed(seed);
  const publicKey = Buffer.from(pair.publicKey).toString('base64');
  fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
  fs.writeFileSync(KEY_FILE, JSON.stringify({ id: 'pc-2', label: 'The PC (scripts/approve_tester.js)', seed: Buffer.from(seed).toString('base64'), publicKey }, null, 2));
  console.log(`New key written. Add this to lib/testerApprovalKeys.ts as pc-2:\n${publicKey}`);
  process.exit(0);
}

const input = args.find((one) => !one.startsWith('--'));
const daysAt = args.indexOf('--days');
const days = daysAt === -1 ? A.APPROVAL_DAYS : Number(args[daysAt + 1]);
if (!input || !(days > 0)) {
  console.error("Give the request code from the tester's email: node scripts/approve_tester.js K7M2-QX9P");
  process.exit(1);
}
if (!fs.existsSync(KEY_FILE)) {
  console.error(`No key at ${KEY_FILE}.`);
  process.exit(1);
}
const key = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
const pair = nacl.sign.keyPair.fromSeed(Uint8Array.from(Buffer.from(key.seed, 'base64')));

async function fetchRequest(one) {
  const secret = A.requestSecret(one);
  let response;
  try {
    response = await fetch(`${A.DROP_URL}/get?slot=${A.dropSlot(secret)}`);
  } catch {
    return 'offline';
  }
  if (response.status === 404) return 'notFound';
  if (!response.ok) return 'offline';
  const answer = await response.json().catch(() => ({}));
  const opened = typeof answer.body === 'string' ? A.openDrop(answer.body, secret) : null;
  return (opened && A.decodeRequest(opened)) || 'notFound';
}

async function readRequest() {
  const codes = A.findCodes(input);
  let offline = false;
  for (const one of codes) {
    const found = await fetchRequest(one);
    if (found === 'offline') offline = true;
    else if (found !== 'notFound') return found;
  }
  if (codes.length) {
    console.error(offline ? 'The site could not be reached. Connect and try again.' : 'Nothing is waiting under that request code. Check it against the email.');
    process.exit(1);
  }
  const link = A.extractCode(input, 'r');
  const request = link ? A.decodeRequest(link) : null;
  if (!request) {
    console.error('That is not a request code from the tester version. Copy the eight letters and numbers from the email.');
    process.exit(1);
  }
  return request;
}

async function leaveDrop(secret, token) {
  try {
    const response = await fetch(`${A.DROP_URL}/put`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slot: A.dropSlot(secret), body: A.sealDrop(token, secret, crypto.randomBytes(24)) }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const request = await readRequest();
  const approval = A.makeApproval(request, key.id, Date.now(), days);
  const token = A.signApproval(approval, pair.secretKey);
  const typed = A.codeFromBytes(crypto.randomBytes(A.CODE_LENGTH));
  // An older version still looks under its pickup, so it is left there too.
  const [codeLeft] = await Promise.all([leaveDrop(typed, token), request.pickup ? leaveDrop(request.pickup, token) : false]);
  const until = A.endDay(approval);
  const record = {
    approvedAt: new Date().toISOString(),
    name: request.name,
    device: request.device,
    platform: request.platform,
    app: request.app ?? null,
    renewal: !!request.renewal,
    until,
    code: codeLeft ? typed : null,
  };
  fs.appendFileSync(RECORD_FILE, `${JSON.stringify(record)}\n`);
  console.log(`${request.name}, ${request.platform === 'phone' ? 'a phone' : 'a computer'}${request.renewal ? ', asking for more time' : ''}.`);
  console.log(`Device ${request.device.slice(0, 12)}. App ${request.app ?? 'not given (an older test version)'}.`);
  console.log(`Asked ${new Date(request.asked).toLocaleString()}. Approved until ${until}.`);
  console.log('');
  console.log('Send this back to them:');
  if (!codeLeft) {
    console.log(`${request.name}, here is your link for Lifestead Test. Open it on the device you asked from:`);
    console.log(A.activationLink(token));
    console.log('');
    console.log('(The site could not be reached, so this is the link rather than a code.)');
  } else {
    console.log(`${request.name}, you are approved for Lifestead Test until ${until}. On the device you asked from, type this code in Lifestead Test and press Use This Code: ${A.formatCode(typed)}`);
  }
}

void main();
