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

db.close();
