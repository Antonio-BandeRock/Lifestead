// Checks that salt added to a dish is counted in the salt a person eats
// (owner's instruction, 2026-11-09).
//
// Salt sits in the Herbs category, which gives volume units no density, so
// until 1.0.83.1 every "1 tsp salt" converted to nothing and its sodium was
// left out of recipes, meals and daily totals. lib/unitConversion.ts now has
// a granular_salt density and isSaltBySodium, and lib/db.ts's
// conversionOptionsFor passes that density for a food whose own sodium
// figure says it is salt.
//
// 1. A teaspoon of salt weighs 6 g and a tablespoon 18 g (USDA).
// 2. Other Herbs foods measured by the spoon still need a weight, as before.
// 3. Across the reference database, read only, every food over 30,000 mg
//    sodium per 100 g counts as salt, baking soda and stock powder do not,
//    and every salt a curated recipe measures by the spoon is recognised.
// 4. lib/db.ts sends every nutrient conversion through conversionOptionsFor.
//
// Exits non-zero on any failure.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { execFileSync } = require('child_process');

function load(relPath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, () => {
    throw new Error('lib/unitConversion.ts must stay free of imports');
  });
  return module.exports;
}

const U = load('lib/unitConversion.ts');

let failures = 0;
let checks = 0;
function check(label, ok) {
  checks += 1;
  if (!ok) {
    failures += 1;
    console.log(`FAIL ${label}`);
  }
}
const near = (a, b) => Math.abs(a - b) < 0.05;

// 1. Weights.
const tsp = U.convertToGrams(1, 'tsp', { foodCategory: 'Herbs', densityClass: 'granular_salt' });
check('1 tsp salt is 6 g', tsp.ok && near(tsp.grams, 6.0));
const tbsp = U.convertToGrams(1, 'tbsp', { foodCategory: 'Herbs', densityClass: 'granular_salt' });
check('1 tbsp salt is 18 g', tbsp.ok && near(tbsp.grams, 18.0));
const grams = U.convertToGrams(5, 'g', { foodCategory: 'Herbs' });
check('5 g salt stays 5 g', grams.ok && grams.grams === 5);

// 2. Nothing else changes.
const oregano = U.convertToGrams(1, 'tsp', { foodCategory: 'Herbs' });
check('a teaspoon of a Herbs food with no density still needs a weight', !oregano.ok && oregano.reason === 'volume_needs_density');
const oil = U.convertToGrams(1, 'tbsp', { foodCategory: 'Fats' });
check('oil keeps the oil density', oil.ok && near(oil.grams, 14.7868 * 0.92));
check('Herbs has no category density', !U.categoryHasDensity('Herbs'));
check('Fats has a category density', U.categoryHasDensity('Fats'));

// The rule itself.
check('pure salt is salt', U.isSaltBySodium(38758, ['Salt, table']));
check('Havsalt is salt', U.isSaltBySodium(37600, ['Havsalt']));
check('a mineral salt under 30,000 mg is salt by its name', U.isSaltBySodium(25700, ['Salt mineralsalt']));
check('baking soda is not salt', !U.isSaltBySodium(27400, ['Bicarbonate de soude']));
check('stock powder is not salt', !U.isSaltBySodium(21000, ['Buljongpulver']));
check('soy sauce is not salt', !U.isSaltBySodium(5600, ['Soy sauce']));
check('salt substitute with no sodium is not salt', !U.isSaltBySodium(33, ['Salt substitute, potassium chloride']));
check('no sodium figure is not salt', !U.isSaltBySodium(null, ['Salt']));

// 3. The reference database, read only.
const db = path.join(__dirname, '..', 'assets', 'data', 'foods_reference.db');
let rows = null;
try {
  if (fs.existsSync(db)) {
    rows = execFileSync('sqlite3.exe', ['-readonly', '-separator', '\t', db,
      `SELECT f.food_id, f.source, n.amount_per_100g, f.name, coalesce(f.short_name,''), coalesce(f.base_name,'')
       FROM foods f JOIN food_nutrients n ON n.food_id = f.food_id AND n.source = f.source AND n.nutrient_code = 'sodium'
       WHERE n.amount_per_100g >= 15000`], { encoding: 'utf8', maxBuffer: 1 << 26 }).trim().split(/\r?\n/).map((l) => l.split('\t'));
  }
} catch {
  rows = null;
}
if (!rows) {
  console.log('(sqlite3.exe or the reference database not found; checking the rule only)');
} else {
  const salt = new Set();
  for (const [id, source, sodium, ...names] of rows) {
    const isSalt = U.isSaltBySodium(Number(sodium), names);
    if (isSalt) salt.add(`${id}|${source}`);
    if (Number(sodium) >= 30000) check(`${names[0]} counts as salt`, isSalt);
    if (/bicarbonate|natron|baking soda|buljong|bouillon|stock/i.test(names.join(' '))) check(`${names[0]} does not count as salt`, !isSalt);
  }
  check(`at least 30 foods count as salt (${salt.size})`, salt.size >= 30);

  const spoons = execFileSync('sqlite3.exe', ['-readonly', '-separator', '\t', db,
    `SELECT DISTINCT r.base_name, f.food_id, f.source
     FROM curated_recipe_ingredients r JOIN foods f ON f.base_name = r.base_name AND f.category = r.category
     WHERE lower(r.base_name) LIKE '%salt%' AND r.category IN ('Herbs','PantryStaples') AND r.unit IN ('tsp','tbsp','cup')`], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean).map((l) => l.split('\t'));
  const names = new Map();
  for (const [base, id, source] of spoons) names.set(base, (names.get(base) || false) || salt.has(`${id}|${source}`));
  for (const [base, found] of names) check(`recipe salt "${base}" measured by the spoon is recognised`, found);
  check('recipes measure salt by the spoon', names.size > 0);
}

// 4. Every nutrient conversion in lib/db.ts goes through conversionOptionsFor.
const dbSource = fs.readFileSync(path.join(__dirname, '..', 'lib', 'db.ts'), 'utf8');
const calls = dbSource.match(/convertToGrams\([^\n]*/g) || [];
const bare = calls.filter((c) => !c.includes('conversionOptionsFor('));
check(`lib/db.ts has no conversion that skips conversionOptionsFor (${bare.length} found)`, bare.length === 0);
check('lib/db.ts converts in at least 14 places', calls.length >= 14);

console.log(`${checks - failures} of ${checks} checks passed`);
process.exit(failures ? 1 : 0);
