/* global __dirname */
// 2026-10-29, Mexican System Recipes: "with links to the things that you have
// to make first, before you can make whatever the thing is that needs it."
//
// A recipe can now point at another recipe that has to be made first
// (curated_recipe_components: recipe_id, component_recipe_id, servings, where
// servings is how many of the component's servings this recipe's whole batch
// uses). The link is what the recipe card shows and taps through to.
//
// What everything else reads is curated_recipe_ingredients, and nearly every
// reader of it (nutrient totals, the grocery list, what is on hand, the meal
// plan's budget and frequency rules, the sweetener checks, the condition and
// diet tag pipelines) works on plain ingredient rows. So rather than teach
// each of them to expand components, this script writes each component's
// ingredients into the dish as ordinary rows, scaled by servings over the
// component's servings, marked with from_component (the component the row
// came through). It is idempotent: every from_component row is deleted and
// rebuilt from the components table each run, so a base recipe edited later
// reaches every dish that uses it the next time this runs.
//
// The same happens for curated_recipe_unlisted_ingredients, the ingredients a
// recipe needs that the food database does not hold (guajillo chiles, corn
// husks, achiote). They are kept in a table of their own so no reader of
// curated_recipe_ingredients meets a row it cannot resolve, and the diet tag
// pipeline reads their contains.
//
// Run: node scripts/flatten_recipe_components.js
// Also required from scripts/add_cuisine_recipes.js.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, '..', 'assets', 'data', 'foods_reference.db');
const MAX_DEPTH = 6;

function ensureSchema(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS curated_recipe_components (
    recipe_id TEXT NOT NULL,
    component_recipe_id TEXT NOT NULL,
    servings REAL NOT NULL,
    prep_note TEXT,
    sort_order INTEGER NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_curated_recipe_components_recipe ON curated_recipe_components (recipe_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_curated_recipe_components_component ON curated_recipe_components (component_recipe_id)');
  db.exec(`CREATE TABLE IF NOT EXISTS curated_recipe_unlisted_ingredients (
    recipe_id TEXT NOT NULL,
    name TEXT NOT NULL,
    contains TEXT,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    cut_prep TEXT,
    prep_note TEXT,
    sort_order INTEGER NOT NULL,
    from_component TEXT
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_curated_recipe_unlisted_recipe ON curated_recipe_unlisted_ingredients (recipe_id)');
  const cols = db.prepare('PRAGMA table_info(curated_recipe_ingredients)').all().map((c) => c.name);
  if (!cols.includes('from_component')) db.exec('ALTER TABLE curated_recipe_ingredients ADD COLUMN from_component TEXT');
}

// Rebuilds every from_component row. Throws on a loop or a missing component,
// leaving the transaction to roll back.
function flattenAll(db) {
  ensureSchema(db);
  db.exec('DELETE FROM curated_recipe_ingredients WHERE from_component IS NOT NULL');
  db.exec('DELETE FROM curated_recipe_unlisted_ingredients WHERE from_component IS NOT NULL');

  const servingsOf = new Map(db.prepare('SELECT id, servings FROM curated_recipes').all().map((r) => [r.id, r.servings]));
  const comps = new Map();
  for (const c of db.prepare('SELECT recipe_id, component_recipe_id, servings FROM curated_recipe_components ORDER BY recipe_id, sort_order').all()) {
    if (!comps.has(c.recipe_id)) comps.set(c.recipe_id, []);
    comps.get(c.recipe_id).push(c);
  }
  const directIngredients = db.prepare(
    'SELECT category, base_name, quantity, unit, cut_prep, cooking_method, prep_note FROM curated_recipe_ingredients WHERE recipe_id = ? AND from_component IS NULL ORDER BY sort_order',
  );
  const directUnlisted = db.prepare(
    'SELECT name, contains, quantity, unit, cut_prep, prep_note FROM curated_recipe_unlisted_ingredients WHERE recipe_id = ? AND from_component IS NULL ORDER BY sort_order',
  );

  // Every ingredient a recipe takes, direct and through its components, for
  // one batch of it.
  const memo = new Map();
  function expand(id, trail) {
    if (memo.has(id)) return memo.get(id);
    if (trail.includes(id)) throw new Error(`Component loop: ${[...trail, id].join(' > ')}`);
    if (trail.length > MAX_DEPTH) throw new Error(`Components nested deeper than ${MAX_DEPTH}: ${[...trail, id].join(' > ')}`);
    const result = { ingredients: directIngredients.all(id), unlisted: directUnlisted.all(id) };
    for (const c of comps.get(id) || []) {
      const compServings = servingsOf.get(c.component_recipe_id);
      if (!compServings) throw new Error(`${id} uses ${c.component_recipe_id}, which is not a recipe`);
      const scale = c.servings / compServings;
      const inner = expand(c.component_recipe_id, [...trail, id]);
      for (const row of inner.ingredients) result.ingredients.push({ ...row, quantity: round(row.quantity * scale) });
      for (const row of inner.unlisted) result.unlisted.push({ ...row, quantity: round(row.quantity * scale) });
    }
    memo.set(id, result);
    return result;
  }

  const insertIngredient = db.prepare(
    `INSERT INTO curated_recipe_ingredients (recipe_id, category, base_name, quantity, unit, cut_prep, cooking_method, prep_note, sort_order, from_component)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertUnlisted = db.prepare(
    `INSERT INTO curated_recipe_unlisted_ingredients (recipe_id, name, contains, quantity, unit, cut_prep, prep_note, sort_order, from_component)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM curated_recipe_ingredients WHERE recipe_id = ?');
  const maxUnlistedSort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM curated_recipe_unlisted_ingredients WHERE recipe_id = ?');

  let rows = 0;
  for (const [id, list] of comps) {
    let sort = maxSort.get(id).m;
    let unlistedSort = maxUnlistedSort.get(id).m;
    for (const c of list) {
      const scale = c.servings / servingsOf.get(c.component_recipe_id);
      const inner = expand(c.component_recipe_id, [id]);
      for (const row of inner.ingredients) {
        insertIngredient.run(id, row.category, row.base_name, round(row.quantity * scale), row.unit, row.cut_prep, row.cooking_method, row.prep_note, ++sort, c.component_recipe_id);
        rows++;
      }
      for (const row of inner.unlisted) {
        insertUnlisted.run(id, row.name, row.contains, round(row.quantity * scale), row.unit, row.cut_prep, row.prep_note, ++unlistedSort, c.component_recipe_id);
        rows++;
      }
    }
  }
  return { recipesWithComponents: comps.size, rowsWritten: rows };
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

module.exports = { ensureSchema, flattenAll, DB_PATH };

if (require.main === module) {
  const db = new DatabaseSync(DB_PATH);
  db.exec('BEGIN');
  try {
    const result = flattenAll(db);
    db.exec('COMMIT');
    console.log(`Flattened ${result.recipesWithComponents} recipes with components, ${result.rowsWritten} rows written.`);
  } catch (e) {
    db.exec('ROLLBACK');
    console.error(e.message);
    process.exit(1);
  }
}
