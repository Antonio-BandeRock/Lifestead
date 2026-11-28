/* global __dirname */
// Checks lib/doseAmount.ts: a half or a quarter pill is accepted however it
// is written, and shown back the way a person says it.
const path = require('path');
const fs = require('fs');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'doseAmount.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
const { parseDoseAmount, formatDoseAmount, doseIsSingular, doseWithUnit } = mod.exports;

let failed = 0;
function check(label, actual, expected) {
  const same = Number.isNaN(expected) ? Number.isNaN(actual) : Math.abs((actual ?? -999) - (expected ?? -999)) < 1e-9 || actual === expected;
  if (!same) {
    failed += 1;
    console.log(`FAIL ${label}: got ${actual}, expected ${expected}`);
  }
}

const parses = [
  ['1', 1], ['2', 2], ['0.5', 0.5], ['.5', 0.5], ['0,5', 0.5], ['1/2', 0.5], ['1 / 4', 0.25], ['3/4', 0.75],
  ['1 1/2', 1.5], ['½', 0.5], ['¼', 0.25], ['¾', 0.75], ['1½', 1.5], ['2 ¼', 2.25], ['', null], ['  ', null],
  ['abc', NaN], ['1/0', NaN], ['-1', NaN], ['.', NaN], ['1.2.3', NaN], ['75', 75], ['2.5', 2.5],
];
for (const [text, expected] of parses) check(`parse "${text}"`, parseDoseAmount(text), expected);

const formats = [[0.5, '½'], [0.25, '¼'], [0.75, '¾'], [1.5, '1½'], [1, '1'], [2, '2'], [2.25, '2¼'], [0.125, '0.125'], [75, '75']];
for (const [amount, expected] of formats) {
  const got = formatDoseAmount(amount);
  if (got !== expected) {
    failed += 1;
    console.log(`FAIL format ${amount}: got ${got}, expected ${expected}`);
  }
}

if (!doseIsSingular(0.5) || !doseIsSingular(1) || doseIsSingular(2) || doseIsSingular(1.5)) {
  failed += 1;
  console.log('FAIL doseIsSingular');
}

// Typed singular or plural, the unit agrees with the amount; a measure never changes.
for (const [amount, unit, expected] of [[3, 'capsules', '3 capsules'], [3, 'capsule', '3 capsules'], [0.5, 'capsules', '½ capsule'], [1, 'tablets', '1 tablet'], [2, 'mg', '2 mg'], [2, 'softgel', '2 softgels'], [2, 'patches', '2 patches'], [1, 'patches', '1 patch'], [2, 'drops', '2 drops']]) {
  const got = doseWithUnit(amount, unit);
  if (got !== expected) { failed += 1; console.log(`FAIL doseWithUnit ${amount} ${unit}: got ${got}, expected ${expected}`); }
}

if (failed) {
  console.log(`${failed} failed`);
  process.exit(1);
}
console.log('All dose amount checks passed.');
