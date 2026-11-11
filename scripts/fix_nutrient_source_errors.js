/* global __dirname */
// Corrects two source-wide errors in the LIVE reference database
// (assets/data/foods_reference.db), found 2026-11-11 while tracing why whole
// days of meals read far past the upper limits.
//
// 1. Germany_BLS stores vitamin B6 in micrograms in a column the app reads
//    as milligrams. Its median was about 780 times every other source's, so
//    fresh tomato read 51 mg per 100 g (the adult upper limit is 100 mg a
//    day). Every BLS vitamin_b6 value is divided by 1000. Guarded on the
//    source median, so a second run changes nothing.
//
// 2. France_Ciqual records "below the detection limit" for selenium and
//    iodine as the limit itself, 20 or 50 micrograms, in about a thousand
//    rows (194 vegetables among them, where measured selenium is nearer 1).
//    Such a value is removed where the same food in other sources, or failing
//    that its subcategory or category, sits under a third of it. With the
//    value gone, getFoodNutrients fills it from the same food in another
//    source and says which. A 20 kept where other sources agree (meat
//    selenium) stays, since there it may be a measurement.
//
// Mirrored in scripts/build_food_reference_db.py (apply_nutrient_source_fixes)
// so a rebuild from the workbook comes out the same.
//
// Usage: node scripts/fix_nutrient_source_errors.js [--dry-run]

const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, '..', 'assets', 'data', 'foods_reference.db');
const dryRun = process.argv.includes('--dry-run');
const db = new DatabaseSync(DB_PATH);

const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

// 1. BLS vitamin B6.
const blsB6 = db
  .prepare("SELECT amount_per_100g AS a FROM food_nutrients WHERE source = 'Germany_BLS' AND nutrient_code = 'vitamin_b6'")
  .all()
  .map((r) => r.a);
const blsMedian = median(blsB6);
let b6Scaled = 0;
if (blsMedian != null && blsMedian > 5) {
  b6Scaled = blsB6.length;
  if (!dryRun) {
    db.prepare(
      "UPDATE food_nutrients SET amount_per_100g = amount_per_100g / 1000.0 WHERE source = 'Germany_BLS' AND nutrient_code = 'vitamin_b6'",
    ).run();
  }
}
console.log(`Germany_BLS vitamin_b6: median ${blsMedian}, ${b6Scaled} values divided by 1000${dryRun ? ' (dry run)' : ''}`);

// 2. Ciqual detection-limit placeholders.
const PLACEHOLDERS = [20, 50];
const removeStmt = db.prepare("DELETE FROM food_nutrients WHERE food_id = ? AND source = 'France_Ciqual' AND nutrient_code = ?");
for (const code of ['selenium', 'iodine']) {
  const others = db
    .prepare(
      `SELECT f.category, f.subcategory, f.base_name, COALESCE(f.prep_method, '') AS prep, fn.amount_per_100g AS a
       FROM food_nutrients fn JOIN foods f ON f.food_id = fn.food_id AND f.source = fn.source
       WHERE fn.nutrient_code = ? AND fn.source != 'France_Ciqual'`,
    )
    .all(code);
  const bySibling = new Map();
  const bySub = new Map();
  const byCat = new Map();
  const push = (map, key, value) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(value);
  };
  for (const r of others) {
    push(bySibling, `${r.category}|${r.base_name}|${r.prep}`, r.a);
    push(bySub, `${r.category}|${r.subcategory ?? ''}`, r.a);
    push(byCat, r.category, r.a);
  }
  const candidates = db
    .prepare(
      `SELECT f.food_id, f.category, f.subcategory, f.base_name, COALESCE(f.prep_method, '') AS prep, fn.amount_per_100g AS a
       FROM food_nutrients fn JOIN foods f ON f.food_id = fn.food_id AND f.source = fn.source
       WHERE fn.nutrient_code = ? AND fn.source = 'France_Ciqual' AND fn.amount_per_100g IN (${PLACEHOLDERS.join(',')})`,
    )
    .all(code);
  let removed = 0;
  let kept = 0;
  for (const c of candidates) {
    const sibling = bySibling.get(`${c.category}|${c.base_name}|${c.prep}`);
    const sub = bySub.get(`${c.category}|${c.subcategory ?? ''}`);
    const reference =
      sibling && sibling.length > 0
        ? median(sibling)
        : sub && sub.length >= 5
          ? median(sub)
          : median(byCat.get(c.category) ?? []);
    if (reference != null && reference < c.a / 3) {
      removed += 1;
      if (!dryRun) removeStmt.run(c.food_id, code);
    } else {
      kept += 1;
    }
  }
  console.log(`France_Ciqual ${code}: ${removed} placeholder values removed, ${kept} kept${dryRun ? ' (dry run)' : ''}`);
}

// 3. Single values found wrong by the 2026-11-11 audit of every row against
//    the same food in other sources. Removing one lets getFoodNutrients fill
//    it from a sibling row and say so; a replacement is used only where the
//    measured value from another national source is clear.
const ROW_FIXES = [
  // [source, food_id, nutrient_code, new value or null to remove, why]
  ['Germany_BLS', 10455, 'manganese', 1.2, 'loganberry stored 600'],
  ['Canada_CNF', 20011, 'manganese', 2.2, 'raw chickpeas stored 21.3'],
  ['Australia_AFCD', 26948, 'manganese', null, 'coconut oil stored 11'],
  ['Norway_Matvaretabellen', 560, 'iron', null, 'roast goose meat at liver level'],
  ['Norway_Matvaretabellen', 560, 'copper', null, 'roast goose meat at liver level'],
  ['Norway_Matvaretabellen', 560, 'riboflavin_b2', null, 'roast goose meat at liver level'],
  ['USDA', 641, 'manganese', null, 'dried jujube stored 31'],
  ['UK_CoFID', 8013, 'iron', null, 'canned okra stored 5.4'],
  ['France_Ciqual', 26325, 'manganese', null, 'meal replacement drink stored 20.3'],
  ['USDA', 5663, 'manganese', null, 'shake mix stored 269'],
  ['USDA', 6670, 'manganese', null, 'protein powder stored 125'],
  ['Canada_CNF', 22899, 'manganese', null, 'protein powder stored 125'],
  ['Canada_CNF', 22895, 'manganese', null, 'whey isolate stored 58'],
  ['Sweden_Livsmedelsverket', 7051, 'riboflavin_b2', 0.21, 'aronia powder stored in micrograms (210)'],
  ['Canada_CNF', 22998, 'thiamin_b1', null, 'meat stick stored 11'],
  ['Australia_AFCD', 26715, 'selenium', null, 'chickpea flour stored 68'],
];
const setStmt = db.prepare('UPDATE food_nutrients SET amount_per_100g = ? WHERE source = ? AND food_id = ? AND nutrient_code = ?');
const delStmt = db.prepare('DELETE FROM food_nutrients WHERE source = ? AND food_id = ? AND nutrient_code = ?');
let rowFixes = 0;
for (const [source, foodId, code, value] of ROW_FIXES) {
  if (dryRun) { rowFixes += 1; continue; }
  const r = value == null ? delStmt.run(source, foodId, code) : setStmt.run(value, source, foodId, code);
  rowFixes += Number(r.changes);
}
console.log(`Single-row fixes: ${rowFixes}${dryRun ? ' (dry run)' : ''}`);

// 4. Manganese on Germany_BLS mushrooms runs about four times Japan_MEXT and
//    up to 24 times USDA (oyster mushroom 2.69 against 0.11), and Australia_AFCD
//    salmon, trout and shark about a hundred times other sources. Removed, so
//    the fill supplies a measured value from another source.
const mn1 = dryRun ? { changes: 0 } : db.prepare(
  "DELETE FROM food_nutrients WHERE source = 'Germany_BLS' AND nutrient_code = 'manganese' AND food_id IN (SELECT food_id FROM foods WHERE source = 'Germany_BLS' AND category = 'Mushroom')",
).run();
const mn2 = dryRun ? { changes: 0 } : db.prepare(
  "DELETE FROM food_nutrients WHERE source = 'Australia_AFCD' AND nutrient_code = 'manganese' AND amount_per_100g > 1 AND food_id IN (SELECT food_id FROM foods WHERE source = 'Australia_AFCD' AND (lower(name) LIKE 'salmon%' OR lower(name) LIKE 'trout%' OR lower(name) LIKE 'shark%' OR lower(name) LIKE 'abalone%'))",
).run();
console.log(`Manganese removed: ${mn1.changes} BLS mushroom values, ${mn2.changes} AFCD fish values`);

// 5. Rows that are not food as eaten. Five Norway supplement tablets carry
//    tablet strength per 100 g (a multivitamin at 2,290 mg iron), and
//    Japan_MEXT purple sweet potato "raw" holds the water and energy of a
//    dried product (22 g water, 303 kcal). Hidden, never deleted, so nothing
//    that refers to them breaks; supplements belong in My Meds.
const hideStmt = db.prepare('UPDATE foods SET hidden = 1 WHERE source = ? AND food_id = ?');
const HIDE = [
  ['Norway_Matvaretabellen', 1191], ['Norway_Matvaretabellen', 1192], ['Norway_Matvaretabellen', 2065],
  ['Norway_Matvaretabellen', 2066], ['Norway_Matvaretabellen', 443], ['Japan_MEXT', 8361],
];
let hidden = 0;
for (const [source, foodId] of HIDE) if (!dryRun) hidden += Number(hideStmt.run(source, foodId).changes);
console.log(`Rows hidden: ${hidden}${dryRun ? ' (dry run)' : ''}`);

db.close();
