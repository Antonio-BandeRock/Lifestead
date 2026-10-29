// Writes every cuisine's System Recipes (scripts/cuisine_recipes.js lists
// them: Mexican, French, Italian, German, Chinese, Thai, Vietnamese) to
// assets/data/foods_reference.db in one transaction, after
// scripts/validate_cuisine_recipes.js passes for each:
//   curated_recipes                       one row per recipe
//   curated_recipe_ingredients            the foods the database holds
//   curated_recipe_unlisted_ingredients   the ones it does not (guajillo,
//                                         galangal, chervil), with diet tags
//                                         in `contains`
//   curated_recipe_components             what is made first
// then the older recipes' made-first links from Mexican's
// d_existing_links.json, then the flattened component rows
// (flatten_recipe_components.js).
//
// Rerunnable: every recipe under a cuisine's id prefix is deleted from all
// four tables first, so a corrected file is written again cleanly.
//
// Run: node scripts/add_cuisine_recipes.js
// Then: node scripts/generate_cuisine_recipes_ts.js
const { DatabaseSync } = require('node:sqlite');
const { flattenAll, ensureSchema, DB_PATH } = require('./flatten_recipe_components');
const { CUISINES, loadAllCuisineRecipes, loadExistingLinks, loadUnlistedTags, unlistedContains } = require('./cuisine_recipes');
const { validate } = require('./validate_cuisine_recipes');

const CHILD_TABLES = ['curated_recipe_ingredients', 'curated_recipe_unlisted_ingredients', 'curated_recipe_components'];

let valid = true;
for (const c of CUISINES) valid = validate(c.key) && valid;
if (!valid) process.exit(1);

const recipes = loadAllCuisineRecipes();
const tagsByCuisine = new Map(CUISINES.map((c) => [c.key, loadUnlistedTags(c)]));
const tagsFor = (r) => tagsByCuisine.get(r.cuisineKey);
const counts = new Map();
for (const r of recipes) {
  const label = r.cuisine || 'made first for older recipes';
  counts.set(label, (counts.get(label) || 0) + 1);
  for (const ing of r.ingredients || []) {
    if (ing.notInDatabase && unlistedContains(ing, tagsFor(r)) === undefined) throw new Error(`No diet tag for ${ing.name} in ${r.id}`);
  }
}
for (const [label, n] of counts) console.log(`  ${label}: ${n}`);

const db = new DatabaseSync(DB_PATH);
db.exec('BEGIN');
try {
  // The schema first, so the deletes below have tables to run against.
  ensureSchema(db);
  for (const c of CUISINES) {
    const like = `${c.prefix.replace(/_/g, '\\_')}%`;
    for (const t of CHILD_TABLES) db.prepare(`DELETE FROM ${t} WHERE recipe_id LIKE ? ESCAPE '\\'`).run(like);
    db.prepare("DELETE FROM curated_recipes WHERE id LIKE ? ESCAPE '\\'").run(like);
  }
  // The made-first recipes from Mexican's d_ file have ordinary ids, so they
  // go by id.
  for (const r of recipes.filter((x) => !CUISINES.some((c) => x.id.startsWith(c.prefix)))) {
    for (const t of CHILD_TABLES) db.prepare(`DELETE FROM ${t} WHERE recipe_id = ?`).run(r.id);
    db.prepare('DELETE FROM curated_recipes WHERE id = ?').run(r.id);
  }

  const nextSort = new Map(db.prepare('SELECT builder_type, MAX(sort_order) AS m FROM curated_recipes GROUP BY builder_type').all().map((r) => [r.builder_type, r.m]));
  const insertRecipe = db.prepare(
    `INSERT INTO curated_recipes (id, builder_type, name, flavor_profile, health_benefit, servings, serving_size_amount, serving_size_unit, sort_order, instructions)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertIngredient = db.prepare(
    `INSERT INTO curated_recipe_ingredients (recipe_id, category, base_name, quantity, unit, cut_prep, cooking_method, prep_note, sort_order, from_component)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
  );
  const insertUnlisted = db.prepare(
    `INSERT INTO curated_recipe_unlisted_ingredients (recipe_id, name, contains, quantity, unit, cut_prep, prep_note, sort_order, from_component)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
  );
  const insertComponent = db.prepare(
    'INSERT INTO curated_recipe_components (recipe_id, component_recipe_id, servings, prep_note, sort_order) VALUES (?, ?, ?, ?, ?)',
  );

  let ingredientRows = 0;
  let unlistedRows = 0;
  let componentRows = 0;
  for (const r of recipes) {
    const sort = (nextSort.get(r.builderType) ?? -1) + 1;
    nextSort.set(r.builderType, sort);
    insertRecipe.run(r.id, r.builderType, r.name, r.flavorProfile, r.healthBenefit, r.servings, r.servingSizeAmount, r.servingSizeUnit, sort, JSON.stringify(r.instructions));
    let i = 0;
    let u = 0;
    for (const ing of r.ingredients || []) {
      if (ing.notInDatabase) {
        insertUnlisted.run(r.id, ing.name, unlistedContains(ing, tagsFor(r)), ing.quantity, ing.unit, ing.cutPrep ?? null, ing.prepNote ?? null, ++u);
        unlistedRows++;
      } else {
        insertIngredient.run(r.id, ing.category, ing.baseName, ing.quantity, ing.unit, ing.cutPrep ?? null, ing.cookingMethod ?? null, ing.prepNote ?? null, ++i);
        ingredientRows++;
      }
    }
    (r.components || []).forEach((c, k) => {
      insertComponent.run(r.id, c.recipeId, c.servings, c.note ?? null, k + 1);
      componentRows++;
    });
  }

  // The older recipes' links (d_existing_links.json). Each link removes the
  // rows the made-first recipe stands in for (the bouillon powder and its
  // water, a store tortilla, a hummus listed by its parts) and adds the
  // component. Removing is a no-op on a rerun, since the rows are already
  // gone; the components on those recipes are rebuilt each time. The
  // database backup taken before the first run holds the removed rows.
  const links = loadExistingLinks();
  const linked = [...new Set(links.map((l) => l.recipeId))];
  for (const id of linked) db.prepare('DELETE FROM curated_recipe_components WHERE recipe_id = ?').run(id);
  const removeReplaced = db.prepare(
    'DELETE FROM curated_recipe_ingredients WHERE recipe_id = ? AND category = ? AND base_name = ? AND from_component IS NULL',
  );
  const linkSort = new Map();
  let replacedRows = 0;
  for (const l of links) {
    if (!db.prepare('SELECT 1 FROM curated_recipes WHERE id = ?').get(l.recipeId)) throw new Error(`Link from ${l.recipeId}, which is not a recipe`);
    for (const r of l.replaces) replacedRows += Number(removeReplaced.run(l.recipeId, r.category, r.baseName).changes);
    const sort = (linkSort.get(l.recipeId) || 0) + 1;
    linkSort.set(l.recipeId, sort);
    insertComponent.run(l.recipeId, l.componentRecipeId, l.servings, null, sort);
    componentRows++;
  }
  console.log(`Linked ${linked.length} older recipes to what is made first (${links.length} links, ${replacedRows} replaced rows removed this run).`);

  const flat = flattenAll(db);
  db.exec('COMMIT');
  console.log(`Wrote ${recipes.length} recipes: ${ingredientRows} ingredient rows, ${unlistedRows} not in the database, ${componentRows} made-first links.`);
  console.log(`Flattened ${flat.recipesWithComponents} recipes with components, ${flat.rowsWritten} rows.`);
} catch (e) {
  db.exec('ROLLBACK');
  console.error(e);
  process.exit(1);
}
