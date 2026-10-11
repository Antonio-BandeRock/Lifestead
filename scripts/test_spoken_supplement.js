// Checks lib/spokenSupplement.ts (step 4 of the voice order, 1.0.66.22): a
// supplement label said aloud or typed becomes ingredient rows for My Meds,
// and anything it cannot read comes back with a reason rather than a guess.
// Pure, so it runs here rather than on a phone. Exits non-zero on any
// failure.

// eslint-config-expo lints this repo as app code, which has no __dirname.
/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(relPath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    throw new Error(`${relPath} must stay free of runtime imports (${name})`);
  });
  return module.exports;
}

const s = load('lib/spokenSupplement.ts');

let failures = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) return;
  failures++;
  console.log(`FAIL ${label}\n  expected ${e}\n  actual   ${a}`);
}

function rows(text) {
  return s.readSpokenSupplementLabel(text).rows.map((row) => [row.nutrientCode, row.amount, row.unit, row.formWords]);
}
function missed(text) {
  return s.readSpokenSupplementLabel(text).notUnderstood.map((item) => item.reason.split(' ').slice(0, 2).join(' '));
}

// The example from the screen's placeholder.
check('placeholder', rows('vitamin D 25 mcg, zinc 11 mg, B12 500 mcg as methylcobalamin'), [
  ['vitamin_d', 25, 'mcg', null],
  ['zinc', 11, 'mg', null],
  ['vitamin_b12', 500, 'mcg', 'methylcobalamin'],
]);

// Speech with no commas and the units spelled out.
check('spoken run-on', rows('vitamin D3 25 micrograms zinc 11 milligrams B 12 500 micrograms as methylcobalamin magnesium glycinate 200 milligrams'), [
  ['vitamin_d', 25, 'mcg', 'd3'],
  ['zinc', 11, 'mg', null],
  ['vitamin_b12', 500, 'mcg', 'methylcobalamin'],
  ['magnesium', 200, 'mg', 'glycinate'],
]);

// "and" and "then" as separators.
check('and then', rows('selenium 200 mcg and vitamin C 90 milligrams then iodine 150 mcg'), [
  ['selenium', 200, 'mcg', null],
  ['vitamin_c', 90, 'mg', null],
  ['iodine', 150, 'mcg', null],
]);

// A typed label with both units and a percent of daily value.
check('typed label', rows('Vitamin D3 (as cholecalciferol) 25 mcg (1,000 IU) 125%\nFolate 680 mcg DFE (400 mcg folic acid) 170%'), [
  ['vitamin_d', 25, 'mcg', 'd3 cholecalciferol'],
  ['folate_b9', 680, 'mcg', 'folic acid'],
]);

// International units said aloud.
check('IU', rows('vitamin D 2000 international units'), [['vitamin_d', 2000, 'IU', null]]);

// Amount before the name.
check('amount first', rows('25 mcg of vitamin D, 11 mg of zinc'), [
  ['vitamin_d', 25, 'mcg', null],
  ['zinc', 11, 'mg', null],
]);
check('amount first run-on', rows('25 mcg vitamin D 11 mg zinc'), [
  ['vitamin_d', 25, 'mcg', null],
  ['zinc', 11, 'mg', null],
]);

// A longer name wins over the nutrient inside it.
check('calcium pantothenate is B5', rows('calcium pantothenate 10 mg'), [['pantothenic_acid_b5', 10, 'mg', null]]);
check('potassium iodide is iodine', rows('potassium iodide 150 mcg'), [['iodine', 150, 'mcg', 'potassium iodide']]);
check('sodium selenite is selenium', rows('sodium selenite 55 mcg'), [['selenium', 55, 'mcg', 'sodium selenite']]);

// Decimal said as "point".
check('point', rows('copper 0 point 9 milligrams'), [['copper', 0.9, 'mg', null]]);

// Form after the last amount.
check('trailing form', rows('zinc 15 mg picolinate'), [['zinc', 15, 'mg', 'picolinate']]);

// Nothing guessed.
check('no unit', missed('zinc 11'), ['No unit']);
check('no amount', missed('vitamin C'), ['No amount']);
check('unknown nutrient', missed('ashwagandha 300 mg'), ['No nutrient']);
check('two nutrients one amount', missed('calcium magnesium 500 mg'), ['More than']);
check('headings passed over', s.readSpokenSupplementLabel('supplement facts serving size 1 capsule').notUnderstood.length, 0);
check('mixed good and bad', rows('vitamin C 90 mg, ashwagandha 300 mg, zinc 11 mg').length, 2);

// Forms matched against the list the database holds.
const zincForms = ['Zinc picolinate', 'Zinc citrate / zinc gluconate', 'Zinc oxide'];
const dForms = ['Vitamin D3 (cholecalciferol)', 'Vitamin D2 (ergocalciferol)'];
const kForms = ['Vitamin K2 (MK-7)', 'Vitamin K2 (MK-4)', 'Vitamin K1 (phylloquinone)'];
const folateForms = ['L-methylfolate (5-MTHF)', 'Folic acid'];
check('form picolinate', s.matchSupplementForm('picolinate', zincForms), 'Zinc picolinate');
check('form gluconate', s.matchSupplementForm('gluconate', zincForms), 'Zinc citrate / zinc gluconate');
check('form d3', s.matchSupplementForm('d3 cholecalciferol', dForms), 'Vitamin D3 (cholecalciferol)');
check('form mk7', s.matchSupplementForm('mk7', kForms), 'Vitamin K2 (MK-7)');
check('form k2 alone is two', s.matchSupplementForm('k2', kForms), null);
check('form methylfolate', s.matchSupplementForm('methylfolate', folateForms), 'L-methylfolate (5-MTHF)');
check('form unknown', s.matchSupplementForm('hydroxocobalamin', ['Methylcobalamin', 'Cyanocobalamin']), null);

if (failures) {
  console.log(`\n${failures} failed`);
  process.exit(1);
}
console.log('test_spoken_supplement: all passed');
