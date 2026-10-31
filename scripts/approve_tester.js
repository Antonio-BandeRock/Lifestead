#!/usr/bin/env node
/* global Buffer */
// Approves a device for the tester version from the PC (tester plan T12).
//
//   node scripts/approve_tester.js "<link or code from the tester's email>"
//   node scripts/approve_tester.js "<link or code>" --days 30
//   node scripts/approve_tester.js --new-key      makes a new PC key
//
// Signs with the seed in _backups/tester-approval/pc-approval-key.json, which
// never enters the repo, and prints the activation link to send back. The
// tester presses it, or pastes it into the tester version.
/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const nacl = require('tweetnacl');

const KEY_FILE = 'C:/Users/TonyR/OneDrive/Desktop/AppProject/_backups/tester-approval/pc-approval-key.json';

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
  console.error('Give the link or code from the tester\'s email: node scripts/approve_tester.js "<link>"');
  process.exit(1);
}
const code = A.extractCode(input, 'r');
const request = code ? A.decodeRequest(code) : null;
if (!request) {
  console.error('That is not a request from the tester version. Copy the whole link from the email.');
  process.exit(1);
}
if (!fs.existsSync(KEY_FILE)) {
  console.error(`No key at ${KEY_FILE}.`);
  process.exit(1);
}
const key = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
const pair = nacl.sign.keyPair.fromSeed(Uint8Array.from(Buffer.from(key.seed, 'base64')));
const approval = A.makeApproval(request, key.id, Date.now(), days);
const token = A.signApproval(approval, pair.secretKey);

console.log(`${request.name}, ${request.platform === 'phone' ? 'a phone' : 'a computer'}${request.renewal ? ', asking for more time' : ''}.`);
console.log(`Asked ${new Date(request.asked).toLocaleString()}. Approved until ${A.endDay(approval)}.`);
console.log('');
console.log('Send this back to them:');
console.log(A.activationLink(token));
