#!/usr/bin/env node
// Says whether the built Windows installer still matches the repo.
//
// Written 2026-09-22, after 1.0.49.4 through 1.0.49.9 all shipped to the
// phone and none of them reached Windows. A JS change reaches a phone by
// itself through `eas update`, so the finishing ritual ends there and the
// desktop app, which only ever changes when somebody builds and installs a
// new .exe, sat six releases behind without a word from anything.
//
//   node desktop/check-installer-current.js   exit 1 when the installer is behind
//
// It reads desktop/dist rather than anything about this machine, so it
// reports what was BUILT, not what is installed. Installing it is still a
// person walking through the installer.
//
// Since tester plan T9 (2026-10-31) there are two installers: the
// developer's in desktop/dist and the tester version's in desktop/dist-test
// (`npm run dist:test`). Both are checked once the tester one has been built.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const KINDS = [
  { folder: 'dist', name: 'Lifestead', build: 'npm run dist', always: true },
  { folder: 'dist-test', name: 'Lifestead Test', build: 'npm run dist:test', always: false },
];

function repoVersion() {
  const text = fs.readFileSync(path.join(root, 'constants/version.ts'), 'utf8');
  const match = text.match(/APP_VERSION = '(\d+\.\d+\.\d+\.\d+)'/);
  if (!match) throw new Error('No APP_VERSION found in constants/version.ts');
  return match[1];
}

function rank(version) {
  return version.split('.').map((part) => Number(part));
}

function isAfter(a, b) {
  const [x, y] = [rank(a), rank(b)];
  for (let i = 0; i < 4; i += 1) {
    if (x[i] !== y[i]) return x[i] > y[i];
  }
  return false;
}

const wanted = repoVersion();

function escape(name) {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 0 when this kind's newest installer is current, 1 otherwise.
function check(kind) {
  const dist = path.join(__dirname, kind.folder);
  const label = kind.name + ' installer';
  if (!fs.existsSync(dist)) {
    if (!kind.always) return 0;
    process.stderr.write('No desktop/' + kind.folder + ' folder, so no ' + label + ' has been built. The repo is at ' + wanted + '.\n');
    return 1;
  }
  const pattern = new RegExp('^' + escape(kind.name) + ' Setup (\\d+\\.\\d+\\.\\d+\\.\\d+)\\.exe$');
  const built = fs
    .readdirSync(dist)
    .map((name) => name.match(pattern))
    .filter(Boolean)
    .map((match) => match[1]);
  if (built.length === 0) {
    process.stderr.write('No ' + label + ' in desktop/' + kind.folder + ', and the repo is at ' + wanted + '.\n');
    return 1;
  }
  const newest = built.reduce((best, one) => (isAfter(one, best) ? one : best));
  if (!isAfter(wanted, newest)) {
    process.stdout.write('The newest ' + label + ' is ' + newest + ', and the repo is at ' + wanted + '.\n');
    return 0;
  }
  process.stderr.write(
    'The newest ' + label + ' is ' + newest + ', and the repo is at ' + wanted + '.\n' +
    'Nothing since ' + newest + ' has reached it.\n' +
    'Build it: cd desktop && ' + kind.build + '\n');
  return 1;
}

const behind = KINDS.map(check).reduce((a, b) => a + b, 0);
process.exit(behind === 0 ? 0 : 1);
