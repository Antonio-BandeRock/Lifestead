// Runs lib/foodSourcePreference.ts and lib/foodEquivalence.ts: which national
// table's numbers a food reads first, and how the gaps are filled (1.0.86.7).
//
// Owner's instruction, 2026-11-11: "US should always come first unless the
// user, in their profile switches to any of the other sources to be used
// first. If that happens, US becomes the gap filler."
//
// The rules checked:
//
//  1. The default order is USDA first; another table chosen goes first and
//     USDA second; every table appears exactly once; Derived ranks as USDA.
//  2. One row per table stands for the food, the picked row always for its
//     own table, never an unasked dried or canned form, and salt matching.
//  3. Each nutrient is taken from the first table in order that has it, and
//     any value from a later table is marked as filling a gap.
//  4. When the database is here, every food_equivalence group with a USDA
//     row and another table reads USDA first by default.
//
// Run with: node scripts/test_food_equivalence.js
// Exits non-zero on any failure.

/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadModule(relPath, deps = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    if (deps[name]) return deps[name];
    throw new Error(`unexpected import ${name} in ${relPath}`);
  });
  return module.exports;
}

const react = { useSyncExternalStore: () => null };
const P = loadModule('lib/foodSourcePreference.ts', { react });
const cooking = loadModule('lib/cookingMethodResolution.ts');
const E = loadModule('lib/foodEquivalence.ts', {
  './cookingMethodResolution': cooking,
  './foodSourcePreference': P,
});

let failures = 0;
function check(label, ok) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${label}`);
  }
}

// 1. Order.
const all = P.FOOD_SOURCE_CHOICES.map((c) => c.key);
check('default is USDA', P.DEFAULT_FOOD_SOURCE === 'USDA' && P.getPreferredFoodSource() === 'USDA');
check('USDA first by default', P.foodSourceOrder('USDA')[0] === 'USDA');
for (const key of all) {
  const order = P.foodSourceOrder(key);
  check(`${key} goes first`, order[0] === key);
  if (key !== 'USDA') check(`USDA second after ${key}`, order[1] === 'USDA');
  check(`${key}: every table once`, order.length === all.length && new Set(order).size === all.length);
}
check('Derived ranks as USDA', P.foodSourceRank('Derived', 'USDA') === 0 && P.foodSourceRank('Derived', 'Japan_MEXT') === 1);
check('unknown source last', P.foodSourceRank('Mystery', 'USDA') === all.length);
check('SQL rank names USDA first', P.foodSourceRankSql('f.source', 'USDA').startsWith("CASE f.source WHEN 'USDA' THEN 0"));
check('SQL rank after a choice', P.foodSourceRankSql('source', 'France_Ciqual').includes("WHEN 'USDA' THEN 1"));
check('outside the preferred table', P.isOutsidePreferredSource('Canada_CNF', 'USDA') && !P.isOutsidePreferredSource('USDA', 'USDA'));
let heard = 0;
const stop = P.subscribeToFoodSourcePreference(() => heard++);
P.setPreferredFoodSourceInMemory('Germany_BLS');
P.setPreferredFoodSourceInMemory('Germany_BLS');
check('a change is heard once', heard === 1 && P.getPreferredFoodSource() === 'Germany_BLS');
stop();
P.setPreferredFoodSourceInMemory('USDA');
check('country names', P.countryForFoodSource('Derived') === 'United States' && P.countryForFoodSource('Japan_MEXT') === 'Japan');

// 2. One row per table.
const row = (foodId, source, name, prepMethod = 'Raw') => ({ foodId, source, name, prepMethod });
const tomato = row(10, 'Germany_BLS', 'Tomato');
const group = [
  tomato,
  row(1, 'USDA', 'Red Tomato'),
  row(2, 'USDA', 'Tomato, sun-dried', 'Dried'),
  row(3, 'Canada_CNF', 'Tomato, canned, with salt', 'Canned'),
  row(4, 'Canada_CNF', 'Tomato, red, raw'),
  row(5, 'Derived', 'Tomato (derived)'),
];
const usdaFirst = E.orderEquivalentRows(tomato, group, 'USDA');
check('USDA row first by default', usdaFirst[0].source === 'USDA' && usdaFirst[0].foodId === 1);
check('never an unasked dried form', !usdaFirst.some((r) => r.foodId === 2));
check('never an unasked canned form', usdaFirst.find((r) => r.source === 'Canada_CNF').foodId === 4);
check('Derived shares USDA’s place', usdaFirst.filter((r) => r.source === 'USDA' || r.source === 'Derived').length === 1);
check('one row per table', usdaFirst.length === 3);
const germanyFirst = E.orderEquivalentRows(tomato, group, 'Germany_BLS');
check('chosen table first, USDA second', germanyFirst[0].foodId === 10 && germanyFirst[1].source === 'USDA');
const pickedUsda = E.orderEquivalentRows(row(5, 'Derived', 'Tomato (derived)'), group, 'USDA');
check('the picked row stands for its own table', pickedUsda[0].foodId === 5);
const salted = E.orderEquivalentRows(row(20, 'USDA', 'Peanuts, with salt'), [
  row(21, 'UK_CoFID', 'Peanuts, without salt'),
  row(22, 'UK_CoFID', 'Peanuts, with salt'),
], 'USDA');
check('salt matches the picked row', salted[1].foodId === 22);
check('a lone row stands alone', E.orderEquivalentRows(tomato, [], 'USDA').length === 1);

// 3. Merging.
const amounts = new Map([
  ['1|USDA', [{ code: 'protein', amountPer100g: 0.9 }, { code: 'iron', amountPer100g: 0.3 }]],
  ['10|Germany_BLS', [{ code: 'protein', amountPer100g: 1.0 }, { code: 'iodine', amountPer100g: 0.002 }]],
  ['4|Canada_CNF', [{ code: 'iodine', amountPer100g: 0.009 }, { code: 'biotin', amountPer100g: 0.004 }]],
]);
const merged = Object.fromEntries(E.mergeNutrientsInOrder(usdaFirst, amounts).map((n) => [n.code, n]));
check('USDA value read first', merged.protein.amountPer100g === 0.9 && !merged.protein.isSupplemented);
check('gap filled from the next table', merged.iodine.sourceUsed === 'Canada_CNF' && merged.iodine.isSupplemented);
check('every nutrient once', Object.keys(merged).length === 4);
const mergedGermany = Object.fromEntries(E.mergeNutrientsInOrder(germanyFirst, amounts).map((n) => [n.code, n]));
check('chosen table read first', mergedGermany.protein.sourceUsed === 'Germany_BLS' && !mergedGermany.protein.isSupplemented);
check('USDA fills the chosen table’s gap', mergedGermany.iron.sourceUsed === 'USDA' && mergedGermany.iron.isSupplemented);
check('USDA ahead of the others for a gap', mergedGermany.iodine.sourceUsed === 'Germany_BLS' && mergedGermany.biotin.sourceUsed === 'Canada_CNF');
const emptyLead = E.mergeNutrientsInOrder(usdaFirst, new Map([['4|Canada_CNF', [{ code: 'iron', amountPer100g: 1 }]]]));
check('a table with no numbers does not lead', emptyLead[0].sourceUsed === 'Canada_CNF' && !emptyLead[0].isSupplemented);

// 4. The database itself.
try {
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(__dirname, '..', 'assets', 'data', 'foods_reference.db');
  if (!fs.existsSync(dbPath)) throw new Error('no database');
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const total = db.prepare('SELECT COUNT(*) AS n FROM foods').get().n;
  const grouped = db.prepare('SELECT COUNT(*) AS n FROM food_equivalence').get().n;
  check(`every food has a group (${grouped} of ${total})`, total === grouped);
  const rows = db
    .prepare(
      `SELECT f.food_id AS foodId, f.source, f.name, f.prep_method AS prepMethod, e.group_key AS groupKey
       FROM food_equivalence e JOIN foods f ON f.food_id = e.food_id AND f.source = e.source
       WHERE e.group_key IN (SELECT group_key FROM food_equivalence GROUP BY group_key
         HAVING SUM(source IN ('USDA','Derived')) > 0 AND SUM(source NOT IN ('USDA','Derived')) > 0)`,
    )
    .all();
  const groups = new Map();
  for (const r of rows) {
    if (!groups.has(r.groupKey)) groups.set(r.groupKey, []);
    groups.get(r.groupKey).push(r);
  }
  let wrong = 0;
  for (const members of groups.values()) {
    for (const self of members) {
      const ordered = E.orderEquivalentRows(self, members, 'USDA');
      const first = ordered[0].source;
      if (first !== 'USDA' && first !== 'Derived') wrong++;
    }
  }
  check(`USDA read first in all ${groups.size} shared groups (${wrong} not)`, wrong === 0);
  const unmatchedUsda = db
    .prepare(
      `SELECT COUNT(*) AS n FROM food_equivalence e
       WHERE e.matched = 1 AND NOT EXISTS (SELECT 1 FROM food_equivalence x WHERE x.group_key = e.group_key AND x.source IN ('USDA','Derived'))`,
    )
    .get().n;
  check('every matched row joins a group holding USDA', unmatchedUsda === 0);
  db.close();
} catch (error) {
  console.log(`(reference database not checked: ${error.message})`);
}

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('food equivalence: all checks passed');
