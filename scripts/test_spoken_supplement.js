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


// A Mexican label, typed, spoken or read from a photo (1.0.93.18).
check('es multivitamin', rows('Cada tableta contiene: Vitamina D3 25 µg, Ácido fólico 400 µg, Hierro (como fumarato ferroso) 18 mg, Citrato de magnesio 100 mg, Zinc 11 mg'), [
  ['vitamin_d', 25, 'mcg', 'd3'],
  ['folate_b9', 400, 'mcg', 'folic acid'],
  ['iron', 18, 'mg', 'ferrous fumarate'],
  ['magnesium', 100, 'mg', 'citrate'],
  ['zinc', 11, 'mg', null],
]);
check('es decimal comma and UI', rows('Vitamina B6 (clorhidrato de piridoxina) 2,5 mg; Vitamina D 1000 U.I.'), [
  ['vitamin_b6', 2.5, 'mg', null],
  ['vitamin_d', 1000, 'IU', null],
]);
check('es spoken units', rows('selenio 55 microgramos como selenometionina y yoduro de potasio 150 microgramos'), [
  ['selenium', 55, 'mcg', 'selenomethionine'],
  ['iodine', 150, 'mcg', 'potassium iodide'],
]);
check('es printed table leaders', rows('Vitamina C ........ 60 mg\nCalcio ....... 200 mg'), [
  ['vitamin_c', 60, 'mg', null],
  ['calcium', 200, 'mg', null],
]);
check('es b12 form', rows('Vitamina B12 (metilcobalamina) 500 µg'), [['vitamin_b12', 500, 'mcg', 'methylcobalamin']]);

// Lisa's multivitamin photo (1.0.93.20): a Mexican Información Nutrimental
// table with a per-portion and a per-100 g column, a space as the thousands
// mark, and an ingredients paragraph under it. Each printed line is its own
// row, so the second column never reads as the next row's amount.
check('space thousands', rows('Vitamina A  1 000 µg  100 mg'), [['vitamin_a', 1000, 'mcg', null]]);
check('two numbers stay two', s.normalizeSpokenLabel('2 capsulas 100 mg').includes('2100'), false);
const lisaLabel = [
  'Información Nutrimental',
  'Tamaño de la porción: 2 Cápsulas (1 g)',
  'Cantidades  Por porción (1 g)  Por 100 g',
  'Calcio  100 mg  10 g',
  'Maca  100 mg  10 g',
  'Vitamina C  60 mg  6 g',
  'Vitamina B1  1.5 mg  0.15 g',
  'Vitamina A  1 000 µg  100 mg',
  'Biotina  300 µg  30 mg',
  'Ácido Fólico  200 µg  20 mg',
  'Vitamina B12  2 µg  0.2 mg',
  'INGREDIENTES: Colágeno Hidrolizado, Calcio, Inositol, Raíz de Maca, Potasio',
].join('\n');
check('ingredients cut', s.labelTableOnly(lisaLabel).includes('INGREDIENTES'), false);
check('no ingredients heading keeps all', s.labelTableOnly('Vitamina C 60 mg'), 'Vitamina C 60 mg');
check('mexican table', rows(s.labelTableOnly(lisaLabel)).map((row) => row.slice(0, 3)), [
  ['calcium', 100, 'mg'],
  ['vitamin_c', 60, 'mg'],
  ['thiamin_b1', 1.5, 'mg'],
  ['vitamin_a', 1000, 'mcg'],
  ['biotin_b7', 300, 'mcg'],
  ['folate_b9', 200, 'mcg'],
  ['vitamin_b12', 2, 'mcg'],
]);

// The forms come from the ingredients paragraph, which a Mexican table never
// prints beside the amounts (Tony, 2026-11-19).
const formsLabel = [
  'Vitamina A 1 000 µg 125%',
  'Vitamina D 5 µg 100%',
  'Vitamina E 10 mg 67%',
  'Vitamina B12 2 µg 83%',
  'Lípidos 0 g',
  'INGREDIENTES: Colágeno Hidrolizado, Vitamina A (Palmitato de retinol), Vitamina D3 (colecalciferol),',
  'Vitamina E (Acetato de dl-alfa tocoferilo), Vitamina B12 (Cianocobalamina), Maltodextrina.',
].join('\n');
const forms = s.ingredientForms(formsLabel);
check('ingredient form A', forms.vitamin_a, 'retinyl palmitate');
check('ingredient form D', forms.vitamin_d, 'cholecalciferol');
check('ingredient form E', forms.vitamin_e, 'dl alpha tocopheryl acetate');
check('ingredient form B12', forms.vitamin_b12, 'cyanocobalamin');
const filled = s.readSupplementLabel(formsLabel).rows.map((row) => [row.nutrientCode, row.amount, row.formWords]);
check('label with forms', filled.filter((row) => row[0] !== 'fat_total'), [
  ['vitamin_a', 1000, 'retinyl palmitate'],
  ['vitamin_d', 5, 'cholecalciferol'],
  ['vitamin_e', 10, 'dl alpha tocopheryl acetate'],
  ['vitamin_b12', 2, 'cyanocobalamin'],
]);
check('fat has no form', filled.filter((row) => row[0] === 'fat_total').map((row) => row[2] ?? null), filled.some((row) => row[0] === 'fat_total') ? [null] : []);

if (failures) {
  console.log(`\n${failures} failed`);
  process.exit(1);
}
console.log('test_spoken_supplement: all passed');
