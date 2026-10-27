// Checks splitLabelEvenly (lib/labelSplit.ts): short and one-word labels are
// left alone, and a longer label breaks at the space that leaves its two lines
// closest in length. Exits non-zero on any failure.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'lib/labelSplit.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { splitLabelEvenly } = mod.exports;

const cases = [
  ['Comidas', 'Comidas'],
  ['Mis citas', 'Mis citas'],
  ['Comidas de hoy', 'Comidas\nde hoy'],
  ['Plan de comidas', 'Plan de\ncomidas'],
  ['Mis medicamentos', 'Mis\nmedicamentos'],
  ['Hidratación', 'Hidratación'],
  ['Ya\nsplit here', 'Ya\nsplit here'],
];
let failed = 0;
for (const [input, expected] of cases) {
  const got = splitLabelEvenly(input);
  if (got !== expected) {
    failed += 1;
    console.log(`FAIL ${JSON.stringify(input)}: got ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`);
  }
}
if (failed) process.exit(1);
console.log(`All ${cases.length} label split checks passed.`);
