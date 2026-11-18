// Lactose intolerance on the food allergies list (lib/lactose.ts, 2026-11-18).
//
// The rules checked:
//
//  1. Every way of writing it on the list is recognised, and nothing else is.
//  2. Foods that carry a meaningful amount of lactose match.
//  3. Butter, ghee, aged hard cheese, plant milks, lactose-free products and
//     cream of tartar do not.
//  4. Every other allergy keeps the plain word match.
//
// Run with: node scripts/test_lactose.js
// Exits non-zero on any failure.

/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'lactose.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: 'lactose.ts',
});
const mod = { exports: {} };
new Function('exports', 'module', 'require', outputText)(mod.exports, mod, (name) => {
  throw new Error(`unexpected import ${name}`);
});
const { isLactoseEntry, findLactose, allergyMatchIn, LACTOSE_INTOLERANCE } = mod.exports;

let failures = 0;
function check(label, actual, expected) {
  if (actual !== expected) {
    failures++;
    console.log(`FAIL ${label}\n  expected ${JSON.stringify(expected)}\n  got      ${JSON.stringify(actual)}`);
  }
}

for (const name of [LACTOSE_INTOLERANCE, 'lactose', ' Lactose  Intolerant ', 'lactose sensitivity']) {
  check(`entry ${name}`, isLactoseEntry(name), true);
}
for (const name of ['Milk', 'dairy', 'lactase']) check(`not entry ${name}`, isLactoseEntry(name), false);

const carries = [
  'Whole milk', 'Milk, 2%', 'Heavy cream', 'Sour cream', 'Greek yogurt', 'Ricotta cheese', 'Cottage cheese',
  'Ice cream, vanilla', 'Whey protein concentrate', 'Leche entera', 'Queso fresco', 'Crema mexicana', 'Cajeta',
  'Cream cheese', 'Buttermilk', 'Condensed milk', 'lactose',
];
for (const text of carries) check(`carries: ${text}`, findLactose(text) !== null, true);

const none = [
  'Butter, salted', 'Ghee', 'Parmesan cheese', 'Aged cheddar', 'Almond milk', 'Oat milk, unsweetened', 'Soy milk',
  'Coconut milk', 'Coconut cream', 'Lactose-free milk', 'Leche sin lactosa', 'Cream of tartar', 'Buttercup squash',
  'Peanut butter', 'Rice', 'Milkweed',
];
for (const text of none) check(`none: ${text}`, findLactose(text), null);

check('allergy list, lactose', allergyMatchIn('Greek yogurt', ['Peanuts', 'Lactose intolerance']), 'Lactose intolerance');
check('allergy list, butter', allergyMatchIn('Butter', ['Lactose intolerance']), null);
check('allergy list, plain word', allergyMatchIn('Peanut butter', ['Peanut', 'Lactose intolerance']), 'Peanut');
check('allergy list, empty entry', allergyMatchIn('Rice', ['  ']), null);

if (failures > 0) {
  console.log(`lactose: ${failures} failure(s)`);
  process.exit(1);
}
console.log('lactose: all checks passed');
