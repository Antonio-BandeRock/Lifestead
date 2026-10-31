// Checks lib/testerInstaller.ts (tester plan T6): when the For Testers band
// says a new installer is waiting, and when it stays quiet.
// Run: node scripts/test_tester_installer.js
/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(rel, deps) {
  const file = path.join(__dirname, '..', rel);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', outputText)(m, m.exports, (name) => {
    if (deps[name]) return deps[name];
    throw new Error(`${rel} must stay pure, asked for ${name}`);
  });
  return m.exports;
}
const notes = load('constants/releaseNotes.ts', {});
const I = load('lib/testerInstaller.ts', { '../constants/releaseNotes': notes });

let failures = 0;
function check(ok, label) {
  if (!ok) {
    failures++;
    console.log(`FAIL  ${label}`);
  }
}

const url = 'https://example.org/lifestead-test.apk';
const file = {
  android: { version: '1.0.80.1', runtime: 'bbb', downloadUrl: url },
  windows: { version: '1.0.80.1', downloadUrl: url },
};

check(I.installerWaiting(file, { kind: 'android', runtime: 'aaa' })?.version === '1.0.80.1', 'a phone on another native build is told');
check(I.installerWaiting(file, { kind: 'android', runtime: 'bbb' }) === null, 'a phone on the newest build is not');
check(I.installerWaiting(file, { kind: 'android', runtime: null }) === null, 'a phone that cannot say its build is not');
check(I.installerWaiting({ android: { ...file.android, downloadUrl: null } }, { kind: 'android', runtime: 'aaa' }) === null, 'nothing is said without a link');
check(I.installerWaiting(file, { kind: 'windows', version: '1.0.79.4' })?.downloadUrl === url, 'an older computer is told');
check(I.installerWaiting(file, { kind: 'windows', version: '1.0.80.1' }) === null, 'a current computer is not');
check(I.installerWaiting(file, { kind: 'windows', version: '1.0.80.2' }) === null, 'a newer computer is not');
check(I.installerWaiting(null, { kind: 'android', runtime: 'aaa' }) === null, 'no file, nothing said');
check(I.installerWaiting('nonsense', { kind: 'windows', version: '1.0.1.1' }) === null, 'a broken file, nothing said');
check(I.installerWaiting(file, { kind: 'other' }) === null, 'other devices are not told');

// The file published on the site parses and, until a tester installer is
// uploaded, says nothing is waiting.
const published = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'app-links', 'public', 'tester', 'latest.json'), 'utf8'));
check(published.android && published.windows, 'the published file has both kinds');

// What Changed reads back the newest notes up to the running version.
const recent = notes.getRecentReleaseNotes('1.0.78.20', 2);
check(recent.length === 2 && recent[0].version === '1.0.78.20', 'recent notes start at the running version');
check(notes.formatReleaseNotesMessage(recent).startsWith('Version 1.0.78.20'), 'several notes get a version heading');

console.log(failures === 0 ? 'All tester installer checks passed.' : `${failures} tester installer check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
