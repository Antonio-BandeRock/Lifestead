/* global __dirname */
// Sets curated recipe ingredients to the amount a person eats, not the amount
// that goes into the pot (2026-11-11).
//
// A nutrient audit of every curated recipe found ingredients scored at their
// full as-bought weight when most of that weight is never eaten: stock bones
// strained out, bone-in ribs and chicken, whole birds, mussels in the shell,
// a pot of frying oil, a master stock kept for the next batch. Others named a
// cooked food for a dry weight (dry rice and pasta scored as cooked), or a
// food with no cooked row (White Corn). A day of three dishes read past the
// upper limit for iron, magnesium, manganese and niacin because of it.
//
// The convention every builder already follows: quantity is the share eaten,
// and prep_note says the full amount the cook uses, so a shopping list and the
// method still tell the cook what to buy. cooking_method never changes here,
// since the cook reads it.
//
// Data: scripts/data/recipe_edible_amounts.json, one entry per row, matched
// on recipe_id, category, base_name and the quantity it held before. A row
// already changed no longer matches, so running this twice changes nothing.
//
// Run: node scripts/fix_recipe_edible_amounts.js [--dry]

const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB = path.join(__dirname, '..', 'assets', 'data', 'foods_reference.db');
const DATA = require('./data/recipe_edible_amounts.json');
const dry = process.argv.includes('--dry');

const db = new DatabaseSync(DB);

// Sweet Corn counted by the ear needs a weight per ear, the same USDA portion
// White Corn already carries.
const SWEET_CORN_EAR = {
  base_name: 'Sweet Corn',
  unit_label: 'large ear',
  grams_per_unit: 143.0,
  citation:
    'USDA FoodData Central, SR Legacy, FDC 168538 (NDB 11900), "Corn, sweet, white, raw": 1 ear, large (7-3/4" to 9" long) = 143 g',
  notes: 'Added 2026-11-11 so recipes that count sweet corn by the ear carry its nutrients.',
};

let changed = 0;
let already = 0;
const missing = [];

db.exec('BEGIN');
try {
  const hasEar = db
    .prepare('SELECT 1 FROM food_unit_weights WHERE base_name = ? AND unit_label = ?')
    .get(SWEET_CORN_EAR.base_name, SWEET_CORN_EAR.unit_label);
  if (!hasEar) {
    db.prepare(
      'INSERT INTO food_unit_weights (base_name, unit_label, grams_per_unit, citation, notes) VALUES (?, ?, ?, ?, ?)',
    ).run(SWEET_CORN_EAR.base_name, SWEET_CORN_EAR.unit_label, SWEET_CORN_EAR.grams_per_unit, SWEET_CORN_EAR.citation, SWEET_CORN_EAR.notes);
    console.log('added the Sweet Corn large ear weight');
  }

  for (const e of DATA) {
    const sets = [];
    const args = [];
    if (e.to_quantity != null) {
      sets.push('quantity = ?');
      args.push(e.to_quantity);
    }
    if (e.prep_note != null) {
      sets.push('prep_note = ?');
      args.push(e.prep_note);
    }
    if (e.to_base_name != null) {
      sets.push('base_name = ?');
      args.push(e.to_base_name);
    }
    if (e.to_cooking_method != null) {
      sets.push('cooking_method = ?');
      args.push(e.to_cooking_method);
    }
    const where = 'recipe_id = ? AND category = ? AND base_name = ? AND abs(quantity - ?) < 0.001';
    const whereArgs = [e.recipe_id, e.category, e.base_name, e.from_quantity];
    // A cooking_method-only change keeps matching after it runs, so it skips
    // a row that already carries the method.
    const extra = e.to_cooking_method != null && sets.length === 1 ? ' AND (cooking_method IS NULL OR cooking_method <> ?)' : '';
    const extraArgs = extra ? [e.to_cooking_method] : [];
    const n = db.prepare(`SELECT count(*) AS n FROM curated_recipe_ingredients WHERE ${where}${extra}`).get(...whereArgs, ...extraArgs).n;
    if (n === 0) {
      const done = db
        .prepare('SELECT count(*) AS n FROM curated_recipe_ingredients WHERE recipe_id = ? AND category = ? AND base_name = ?')
        .get(e.recipe_id, e.category, e.to_base_name ?? e.base_name).n;
      if (done > 0) already += 1;
      else missing.push(`${e.recipe_id} ${e.base_name} ${e.from_quantity}`);
      continue;
    }
    db.prepare(`UPDATE curated_recipe_ingredients SET ${sets.join(', ')} WHERE ${where}${extra}`).run(...args, ...whereArgs, ...extraArgs);
    changed += n;
  }
  if (dry) db.exec('ROLLBACK');
  else db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  throw err;
}

console.log(`${dry ? '[dry] ' : ''}rows changed ${changed}, entries already done ${already}, not found ${missing.length}`);
for (const m of missing) console.log('  not found:', m);
