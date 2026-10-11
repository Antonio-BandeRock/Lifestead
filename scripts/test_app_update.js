// Checks the update-ready notification's pure half (lib/appUpdate.ts,
// 2026-10-11):
//
//  1. Checks are spaced at least ten minutes apart, and the first one
//     always runs.
//  2. The version is read from an Expo manifest, and a manifest without one
//     gives null rather than a guess.
//  3. The words name the new version and the one on the phone, fall back to
//     plain words with no version, and say how to dismiss it.
//
// Run with: node scripts/test_app_update.js

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'appUpdate.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const mod = { exports: {} };
new Function('exports', 'module', outputText)(mod.exports, mod);
const U = mod.exports;

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error('FAIL: ' + label);
  }
}

// 1
ok(U.shouldCheckForUpdate(null, 0), 'first check runs');
ok(!U.shouldCheckForUpdate(1000, 1000 + 60 * 1000), 'a minute later does not check');
ok(U.shouldCheckForUpdate(1000, 1000 + U.UPDATE_CHECK_EVERY_MS), 'ten minutes later checks');

// 2
ok(U.versionOfManifest({ extra: { expoClient: { version: '1.0.67.6' } } }) === '1.0.67.6', 'expoClient version read');
ok(U.versionOfManifest({ version: ' 1.0.67.7 ' }) === '1.0.67.7', 'top-level version read and trimmed');
ok(U.versionOfManifest({ extra: {} }) === null, 'no version gives null');
ok(U.versionOfManifest(null) === null, 'no manifest gives null');
ok(U.versionOfManifest({ version: 5 }) === null, 'a non-string version gives null');

// 3
const named = U.updateReadyText('1.0.67.6', '1.0.67.5');
ok(named.body.includes('1.0.67.6') && named.body.includes('1.0.67.5'), 'both versions named');
ok(/tap/i.test(named.body), 'says a tap restarts into it');
ok(/next time/i.test(named.body), 'says it goes in by itself otherwise');
const plain = U.updateReadyText(null, '1.0.67.5');
ok(plain.body.startsWith('A newer version'), 'no version falls back to plain words');
const same = U.updateReadyText('1.0.67.5', '1.0.67.5');
ok(same.body.startsWith('A newer version'), 'a manifest carrying the same version number does not claim it is new');
ok(!/[–—]/.test(named.title + named.body + plain.body), 'no dashes');

console.log(`${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
