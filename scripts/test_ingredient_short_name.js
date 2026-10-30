// Checks lib/ingredientShortName.ts, the plain ingredient names in the
// builders' ingredient lists (2026-10-30):
// 1. Hand-picked database names come out as what the food is.
// 2. Across every base name in assets/data/foods_reference.db, a short name
//    is never empty and never longer than the name it came from.
//
// Pure, so it runs here rather than needing a phone. Exits non-zero on any
// failure.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'ingredientShortName.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const loaded = { exports: {} };
new Function('exports', 'module', outputText)(loaded.exports, loaded);
const { ingredientShortName } = loaded.exports;

let failures = 0;
const CASES = [
  ['Grains, wheat flour, white, bread flour', 'Wheat Flour'],
  ['Water, tap', 'Water'],
  ['Table Salt', 'Salt'],
  ['Salt, table, iodised', 'Salt'],
  ['Black Beans', 'Black Beans'],
  ['Beans, black, mature seeds, raw', 'Black Beans'],
  ['Pink, Boiled, Salted Beans', 'Pink Beans'],
  ['Chicken Thigh (with skin)', 'Chicken Thigh'],
  ['Chicken, broiler, drumstick, meat, braised', 'Chicken Drumstick'],
  ['Nuts, almond butter, plain, without salt added', 'Almond Butter'],
  ['Nut, hazelnut, raw, unsalted', 'Hazelnut'],
  ['Olive oil', 'Olive Oil'],
  ['Yogurt, Greek, plain, lowfat', 'Greek Yogurt'],
  ['Peas, green, canned, seasoned, solids and liquid', 'Green Peas'],
  ['Onions, raw', 'Onions'],
  ['White Rice', 'White Rice'],
  ['Garlic powder', 'Garlic Powder'],
  ['Okra canned, drained', 'Okra'],
  ['Seaweed, kelp', 'Kelp'],
  ['Chili with beans', 'Chili with Beans'],
  ['Common salt/table salt', 'Salt'],
  ['Seasoned salt/herb salt', 'Seasoned Salt'],
  ['Whisky/whiskey', 'Whisky'],
  ['Coffee/Chocolate Liqueur (with milk/cream)', 'Coffee Liqueur'],
  ['Rum, Dark/Aged', 'Rum'],
  ['Chard/leaf beet, braised without fat', 'Chard'],
  ['Soupe de poissons et / ou crustacés, préemballée à réchauffer', 'Soupe de Poissons'],
];
for (const [input, expected] of CASES) {
  const got = ingredientShortName(input);
  if (got !== expected) {
    failures += 1;
    console.log(`FAIL "${input}"\n  expected ${expected}\n  got      ${got}`);
  }
}

const dbPath = path.join(__dirname, '..', 'assets', 'data', 'foods_reference.db');
if (fs.existsSync(dbPath)) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const names = db.prepare('select distinct base_name as name from foods').all().map((row) => row.name);
  let bad = 0;
  for (const name of names) {
    const short = ingredientShortName(name);
    if (!short || short.length > name.length) {
      bad += 1;
      if (bad <= 10) console.log(`FAIL "${name}" became "${short}"`);
    }
  }
  console.log(`${names.length} base names checked.`);
  failures += bad;
} else {
  console.log('No reference database here, so only the hand-picked names were checked.');
}

if (failures > 0) {
  console.log(`${failures} failure(s).`);
  process.exit(1);
}
console.log('All ingredient short name checks pass.');
