/* global __dirname */
// 2026-10-29, direct request: add the Mexican dishes from Tony's list
// (Mexican Foods.pdf) as System Recipes, each "as authentic as possible",
// built from its ingredients, "with links to the things that you have to make
// first."
//
// Reads every recipe file in scripts/_mexican_recipes/ (the bases plus the
// dishes), checks them with validate.js, and writes them to
// assets/data/foods_reference.db in one transaction:
//   curated_recipes                       one row per recipe
//   curated_recipe_ingredients            the foods the database holds
//   curated_recipe_unlisted_ingredients   the ones it does not (guajillo,
//                                         corn husks), with diet tags from
//                                         unlisted_tags.json in `contains`
//   curated_recipe_components             what is made first
// then rebuilds the flattened component rows (flatten_recipe_components.js).
//
// Rerunnable: every curated_mx_ recipe is deleted from all four tables first,
// so a corrected file is written again cleanly.
//
// Run: node scripts/add_mexican_recipes.js
// Then: node scripts/generate_mexican_recipes_ts.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');
const { flattenAll, DB_PATH } = require('./flatten_recipe_components');

const DIR = path.join(__dirname, '_mexican_recipes');
const DIET_TAGS = new Set(['meat', 'fish', 'dairy', 'egg', 'gluten', 'insect', 'alcohol', 'none']);

// a_ to c_ are the Mexican recipes. d_existing_links.json holds the
// made-first recipes the older System Recipes now point at (vegetable and
// chicken stock, hummus), which are not Mexican, and the links themselves.
function loadMexicanRecipes() {
  const files = fs.readdirSync(DIR).filter((f) => /^[a-d]_.*\.json$/.test(f)).sort();
  const recipes = [];
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    const cuisine = f.startsWith('d_') ? null : 'Mexican';
    for (const r of data.recipes || []) recipes.push({ ...r, sourceFile: f, cuisine });
  }
  return recipes;
}

function loadExistingLinks() {
  const file = path.join(DIR, 'd_existing_links.json');
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).links || [] : [];
}

function loadUnlistedTags() {
  const file = path.join(DIR, 'unlisted_tags.json');
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).tags : {};
}

function unlistedKey(name) {
  return name.trim().toLowerCase();
}

module.exports = { loadMexicanRecipes, loadExistingLinks, loadUnlistedTags, unlistedKey };

if (require.main === module) {
  execFileSync(process.execPath, [path.join(DIR, 'validate.js')], { stdio: 'inherit' });

  const recipes = loadMexicanRecipes();
  const tags = loadUnlistedTags();
  const missingTags = new Set();
  for (const r of recipes) {
    for (const ing of r.ingredients || []) {
      if (!ing.notInDatabase) continue;
      const t = tags[unlistedKey(ing.name)];
      if (t === undefined) missingTags.add(ing.name);
      else for (const tag of t.split(',').filter(Boolean)) if (!DIET_TAGS.has(tag)) throw new Error(`Unknown tag "${tag}" for ${ing.name}`);
    }
  }
  if (missingTags.size > 0) {
    console.error(`unlisted_tags.json has no entry for ${missingTags.size} ingredient names:`);
    for (const n of [...missingTags].sort()) console.error(`  ${n}`);
    process.exit(1);
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec('BEGIN');
  try {
    // The schema first, so the deletes below have tables to run against.
    require('./flatten_recipe_components').ensureSchema(db);
    for (const t of ['curated_recipe_ingredients', 'curated_recipe_unlisted_ingredients', 'curated_recipe_components']) {
      db.exec(`DELETE FROM ${t} WHERE recipe_id LIKE 'curated\\_mx\\_%' ESCAPE '\\'`);
    }
    db.exec("DELETE FROM curated_recipes WHERE id LIKE 'curated\\_mx\\_%' ESCAPE '\\'");
    // The made-first recipes from d_ have ordinary ids, so they go by id.
    for (const r of recipes.filter((x) => !x.id.startsWith('curated_mx_'))) {
      for (const t of ['curated_recipe_ingredients', 'curated_recipe_unlisted_ingredients', 'curated_recipe_components']) {
        db.prepare(`DELETE FROM ${t} WHERE recipe_id = ?`).run(r.id);
      }
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
          const t = tags[unlistedKey(ing.name)];
          insertUnlisted.run(r.id, ing.name, t === 'none' ? '' : t, ing.quantity, ing.unit, ing.cutPrep ?? null, ing.prepNote ?? null, ++u);
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
}
