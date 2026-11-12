// Runs lib/cookingMethodResolution.ts against the cases that decide which
// reference row a builder ingredient gets scored against.
//
// Built 2026-09-01, from a direct observation: "Broccoli (boiled) nutrients
// aren't going to be tallied the same as raw. It can't be used for their
// nutrient value unless they actually boil it and tell the app that they
// boiled it."
//
// Every failure mode here is a silently wrong NUMBER rather than a crash. A
// dish scored against raw broccoli when it was boiled, or against a cooked row
// when it was eaten raw, looks entirely normal on screen and feeds wrong
// figures into nutrient totals, condition scores and every trend built on
// them.
//
// Run with: node scripts/test_cooking_method_resolution.js
// Exits non-zero on any failure.

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const SOURCE = path.join(__dirname, '..', 'lib', 'cookingMethodResolution.ts');

function loadModule() {
  const source = fs.readFileSync(SOURCE, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: 'cookingMethodResolution.ts',
  });
  const module = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'module', outputText)(module.exports, module);
  return module.exports;
}

const { cookingMethodIntent, preferredPrepMethodFor, isRawPrepMethod, describePrepMismatch, pickCookedRow } = loadModule();

let failures = 0;
let checks = 0;

function check(label, actual, expected) {
  checks += 1;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures += 1;
    console.error(`FAIL  ${label}`);
    console.error(`      expected ${JSON.stringify(expected)}`);
    console.error(`      got      ${JSON.stringify(actual)}`);
  }
}

// --- What a cooking word means ---------------------------------------------

check('N/A constrains nothing', cookingMethodIntent('N/A'), 'unconstrained');
check('an empty method constrains nothing', cookingMethodIntent(''), 'unconstrained');
check('a missing method constrains nothing', cookingMethodIntent(null), 'unconstrained');
check('Raw means raw', cookingMethodIntent('Raw'), 'raw');
check('Boiled means cooked', cookingMethodIntent('Boiled'), 'cooked');
check('casing does not matter', cookingMethodIntent('  bOiLeD '), 'cooked');
// Every builder's own additions, since the 11 lists are not identical.
check('a soup simmers', cookingMethodIntent('Simmered'), 'cooked');
check('a sauce reduces', cookingMethodIntent('Reduced'), 'cooked');
check('a handheld toasts', cookingMethodIntent('Toasted'), 'cooked');
check('the accented spelling works', cookingMethodIntent('Sautéed'), 'cooked');
check('the unaccented spelling works too', cookingMethodIntent('Sauteed'), 'cooked');
// These two have no honest counterpart in the database's prep vocabulary, so
// they leave the row alone rather than pushing it toward a cooked one.
check('fermenting is left alone', cookingMethodIntent('Fermented'), 'unconstrained');
check('chilling is left alone', cookingMethodIntent('Chilled/Frozen'), 'unconstrained');

check('frying maps to the database word', preferredPrepMethodFor('Pan-Fried'), 'Fried');
check('stir-frying maps to the same one', preferredPrepMethodFor('Stir-fried'), 'Fried');
check('simmering is treated as boiling', preferredPrepMethodFor('Simmered'), 'Boiled');
check('an unmapped method prefers nothing', preferredPrepMethodFor('Fermented'), null);

// --- What counts as raw -----------------------------------------------------

check('Raw is raw', isRawPrepMethod('Raw'), true);
check('Unprepared is raw', isRawPrepMethod('Unprepared'), true);
// The important one: most rows in this database carry no prep_method at all,
// and treating those as cooked would send every oil and spice hunting for a
// variant that does not exist.
check('an untagged row is raw', isRawPrepMethod(''), true);
check('a missing tag is raw', isRawPrepMethod(null), true);
check('Boiled is not raw', isRawPrepMethod('Boiled'), false);

// --- Saying so when the two genuinely disagree ------------------------------

// Nothing to say when the row already matches what was stated.
check('boiled row, boiled dish, nothing to say', describePrepMismatch('Broccoli', 'Boiled', 'Boiled'), null);
check('raw row, raw dish, nothing to say', describePrepMismatch('Spinach', 'Raw', 'Raw'), null);
check('no stated method, nothing to say', describePrepMismatch('Broccoli', 'Raw', 'N/A'), null);

// The real contradiction: the database distinguishes raw for this food, the
// person said they cooked it, and no cooked row exists to move to.
check(
  'raw row and a cooked dish is said plainly',
  describePrepMismatch('Kale', 'Raw', 'Sautéed'),
  'Counted as raw Kale: this food database has no cooked version of it, so any change from cooking is not reflected.',
);
check(
  'a cooked row and a raw dish is said plainly',
  describePrepMismatch('Lentils', 'Boiled', 'Raw'),
  'Counted as boiled Lentils: this food database has no raw version of it.',
);

// The noise rule, and the reason it exists: a row with no prep_method is not
// claiming to be raw, it is a food this database never split by preparation.
// Without this, every sauteed dish would carry a note about its olive oil, its
// garlic and its salt, and nobody would read the section at all.
check('an untagged food says nothing', describePrepMismatch('Olive Oil (Extra Virgin)', '', 'Sautéed'), null);
check('a missing tag says nothing', describePrepMismatch('Common salt', null, 'Boiled'), null);

// --- Which cooked row stands for the food (2026-11-11) ----------------------

// A base name can hold many cooked rows. Table order once decided, so a
// poached whole chicken was scored as battered fried chicken with giblets.
const chickenRows = [
  { food_id: 1, source: 'USDA', prep_method: 'Fried', name: 'Chicken, broilers or fryers, meat and skin and giblets and neck, fried, batter' },
  { food_id: 2, source: 'USDA', prep_method: 'Roasted', name: 'Chicken, broilers or fryers, skin only, cooked, roasted' },
  { food_id: 3, source: 'USDA', prep_method: 'Stewed', name: 'Chicken, broilers or fryers, thigh, meat and skin, cooked, stewed' },
  { food_id: 4, source: 'USDA', prep_method: 'Stewed', name: 'Chicken, broilers or fryers, meat and skin, cooked, stewed' },
  { food_id: 5, source: 'USDA', prep_method: 'Fried', name: 'Chicken, broilers or fryers, thigh, meat and skin, cooked, fried, flour' },
  { food_id: 6, source: 'USDA', prep_method: 'Roasted', name: 'Chicken, broilers or fryers, thigh, meat and skin, cooked, roasted' },
];
const startWhole = 'Chicken, broilers or fryers, meat and skin, raw';
const startThigh = 'Chicken, broilers or fryers, thigh, meat and skin, raw';
const idOf = (row) => (row ? row.food_id : null);
check('poached whole chicken stays a whole bird, stewed', idOf(pickCookedRow(chickenRows, startWhole, 'Poached')), 4);
check('braised thigh stays a thigh, stewed', idOf(pickCookedRow(chickenRows, startThigh, 'Braised')), 3);
check('roast thigh is the roasted thigh', idOf(pickCookedRow(chickenRows, startThigh, 'Roasted')), 6);
check('pan-fried thigh is never the floured one unasked', idOf(pickCookedRow(chickenRows, startThigh, 'Pan-Fried')), 3);
check('a floured fry, asked for, is chosen', idOf(pickCookedRow(chickenRows, startThigh, 'Fried in flour')), 5);
check('skin only is never chosen unasked', idOf(pickCookedRow(chickenRows, startWhole, 'Roasted')), 6);
check(
  'a tie keeps the row already chosen',
  idOf(pickCookedRow(
    [
      { food_id: 7, source: 'USDA', prep_method: 'Boiled', name: 'Beans, boiled' },
      { food_id: 8, source: 'USDA', prep_method: 'Boiled', name: 'Beans, boiled' },
    ],
    'Beans, raw',
    'Boiled',
    { foodId: 8, source: 'USDA' },
  )),
  8,
);
check('a separable-fat row is passed over', idOf(pickCookedRow(
  [
    { food_id: 9, source: 'USDA', prep_method: 'Braised', name: 'Veal, breast, separable fat, cooked' },
    { food_id: 10, source: 'USDA', prep_method: 'Braised', name: 'Veal, breast, whole, boneless, cooked, braised' },
  ],
  'Veal, breast, whole, boneless, raw',
  'Simmered',
)), 10);
check('no rows, nothing chosen', pickCookedRow([], 'x', 'Boiled'), undefined);
// A dish already on the battered row is moved off it: the starting row's
// own name never counts as asking for a coating.
check(
  'a wrong battered starting row is corrected',
  idOf(pickCookedRow(chickenRows, chickenRows[0].name, 'Poached', { foodId: 1, source: 'USDA' }, 'Chicken, broilers or fryers')),
  4,
);
check('a salted row is passed over unasked', idOf(pickCookedRow(
  [
    { food_id: 1014, source: 'USDA', prep_method: 'Boiled', name: 'Corn, sweet, yellow, cooked, boiled, drained, with salt' },
    { food_id: 1028, source: 'USDA', prep_method: 'Boiled', name: 'Corn, sweet, white, cooked, boiled, drained, without salt' },
  ],
  'Sweet Corn',
  'Boiled',
)), 1028);

if (failures > 0) {
  console.error(`\nCooking method resolution: ${failures} of ${checks} checks failed.`);
  process.exit(1);
}
console.log(`Cooking method resolution: all ${checks} checks passed.`);
