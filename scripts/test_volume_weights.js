// Checks that every ingredient line in the curated recipes converts to grams,
// so every recipe carries its nutrients (owner's instruction, 2026-11-10:
// "everything gets nutrient values").
//
// A spoon or a cup of a solid weighs something different for every food, so
// since 2026-11-10 the reference database carries a weighed figure per food
// in food_volume_weights (from USDA FoodData Central SR Legacy food_portion
// where USDA has one, and a cited figure where it has none), and
// lib/unitConversion.ts's convertToGrams takes it as options.gramsPerMl.
//
// 1. convertToGrams uses gramsPerMl for a volume unit, salt's own density
//    still wins over it, and it wins over a category constant.
// 2. Every food_volume_weights row, read only, has a plausible weight, a
//    citation, and names a food that exists.
// 3. Every curated recipe ingredient line converts: a weight, a piece with
//    a food_unit_weights row, or a volume with salt's density, a
//    food_volume_weights row or a category density.
// 4. lib/db.ts and lib/mealPlanBudgetDb.ts read food_volume_weights.
//
// Exits non-zero on any failure.

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

// 1. The conversion.
const chia = U.convertToGrams(1, 'tbsp', { foodCategory: 'NutSeed', gramsPerMl: 12 / 14.7868 });
check('1 tbsp at 12 g per tbsp is 12 g', chia.ok && near(chia.grams, 12));
const none = U.convertToGrams(1, 'tbsp', { foodCategory: 'NutSeed' });
check('a solid with no weighed figure still refuses', !none.ok && none.reason === 'volume_needs_density');
const salt = U.convertToGrams(1, 'tsp', { foodCategory: 'Herbs', densityClass: 'granular_salt', gramsPerMl: 0.5 });
check("salt's density wins over a weighed figure", salt.ok && near(salt.grams, 6));
const fat = U.convertToGrams(1, 'cup', { foodCategory: 'Fats', gramsPerMl: 0.5 });
check('a weighed figure wins over a category constant', fat.ok && near(fat.grams, 236.588 * 0.5));
const zero = U.convertToGrams(1, 'cup', { foodCategory: 'Fats', gramsPerMl: 0 });
check('a zero weighed figure falls back to the category', zero.ok && near(zero.grams, 236.588 * 0.92));
const grams = U.convertToGrams(100, 'g', { gramsPerMl: 3 });
check('a weight ignores gramsPerMl', grams.ok && grams.grams === 100);

// 2 and 3. The reference database, read only.
const dbPath = path.join(__dirname, '..', 'assets', 'data', 'foods_reference.db');
let DatabaseSync = null;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  DatabaseSync = null;
}
if (!DatabaseSync || !fs.existsSync(dbPath)) {
  console.log('(node:sqlite or the reference database not found; checking the rule only)');
} else {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const rows = db.prepare('SELECT * FROM food_volume_weights').all();
  check('food_volume_weights has rows', rows.length > 100);
  const foodExists = db.prepare('SELECT 1 FROM foods WHERE category = ? AND base_name = ? LIMIT 1');
  for (const r of rows) {
    const key = `${r.category}|${r.base_name}`;
    check(`${key}: weight between 0.05 and 2 g per ml`, r.grams_per_ml > 0.05 && r.grams_per_ml <= 2);
    check(`${key}: has a citation`, typeof r.citation === 'string' && r.citation.length > 20);
    check(`${key}: names a food in the database`, !!foodExists.get(r.category, r.base_name));
  }

  const volumeUnits = new Set(U.VOLUME_UNITS);
  const massUnits = new Set(U.MASS_UNITS);
  const volume = new Set(rows.map((r) => `${r.category}|${r.base_name}`));
  const pieces = new Set(db.prepare('SELECT base_name FROM food_unit_weights').all().map((r) => r.base_name));
  const sodium = db.prepare(
    `SELECT MAX(n.amount_per_100g) AS s FROM foods f
     JOIN food_nutrients n ON n.food_id = f.food_id AND n.source = f.source AND n.nutrient_code = 'sodium'
     WHERE f.category = ? AND f.base_name = ?`,
  );
  const lines = db.prepare(
    `SELECT i.recipe_id, i.category, i.base_name, i.unit, COUNT(*) AS n
     FROM curated_recipe_ingredients i GROUP BY i.recipe_id, i.category, i.base_name, i.unit`,
  ).all();
  const missing = new Map();
  let total = 0;
  for (const l of lines) {
    total += l.n;
    const unit = String(l.unit).trim().toLowerCase().replace(/\s+/g, '_');
    const key = `${l.category}|${l.base_name}`;
    let ok = false;
    if (massUnits.has(unit)) ok = true;
    else if (unit === 'each') ok = pieces.has(l.base_name);
    else if (volumeUnits.has(unit)) {
      ok = volume.has(key)
        || U.categoryHasDensity(l.category)
        || U.isSaltBySodium(sodium.get(l.category, l.base_name)?.s, [l.base_name]);
    }
    if (!ok) missing.set(`${key}|${l.unit}`, (missing.get(`${key}|${l.unit}`) ?? 0) + l.n);
  }
  check(`every one of ${total} recipe ingredient lines converts to grams`, missing.size === 0);
  for (const [k, n] of missing) console.log(`  not convertible: ${k} x${n}`);
}

// 4. The app reads the table.
const dbSource = fs.readFileSync(path.join(__dirname, '..', 'lib', 'db.ts'), 'utf8');
check('lib/db.ts reads food_volume_weights', /JOIN food_volume_weights/.test(dbSource));
check('conversionOptionsFor passes gramsPerMl', /gramsPerMl/.test(dbSource.slice(dbSource.indexOf('export async function conversionOptionsFor'))));
const budgetSource = fs.readFileSync(path.join(__dirname, '..', 'lib', 'mealPlanBudgetDb.ts'), 'utf8');
check('lib/mealPlanBudgetDb.ts reads food_volume_weights', /food_volume_weights/.test(budgetSource));

console.log(`${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
