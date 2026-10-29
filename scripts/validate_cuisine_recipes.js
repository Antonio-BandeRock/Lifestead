/* global __dirname */
// Checks one cuisine's recipe files before anything is written to the
// reference database. Read only: it opens assets/data/foods_reference.db
// with readOnly and never writes.
//
// Usage:
//   node scripts/validate_cuisine_recipes.js french             (every recipe file)
//   node scripts/validate_cuisine_recipes.js french b_dishes.json
//   node scripts/validate_cuisine_recipes.js all                (every cuisine)
//
// Exit code 1 when any file has an error. Warnings do not fail.
//
// An id already in curated_recipes is an error only when no recipe file
// writes it, since scripts/add_cuisine_recipes.js deletes and rewrites every
// recipe in these files on each run.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { CUISINES, recipeFiles, loadUnlistedTags, unlistedContains, readCuisineBands } = require('./cuisine_recipes');

const DB_PATH = path.join(__dirname, '..', 'assets', 'data', 'foods_reference.db');

const BUILDER_TYPES = new Set(['bakedGoods', 'beverage', 'dessert', 'fermentation', 'handheld', 'salad', 'sauce', 'side', 'smoothie', 'snack', 'soup']);
const UNITS = new Set(['g', 'ml', 'tsp', 'tbsp', 'each']);
const SERVING_UNITS = new Set([
  'bowl', 'cup', 'plate', 'tbsp', 'serving', 'glass', 'wrap', 'each', 'sandwich', 'jar', 'fillet', 'taco', 'slice',
  'tortilla', 'tamal', 'torta', 'piece', 'roll', 'bun', 'skewer', 'dumpling', 'pancake', 'pastry',
]);
const TIERS = new Set(['strong', 'moderate', 'weak']);

// Writing rules for anything a person reads.
const STYLE = [
  [/[—–]/, 'em or en dash'],
  [/ -- /, 'double hyphen used as a dash'],
  [/\breal(ly)?\b/i, '"real" or "really"'],
  [/\bgenuine(ly)?\b/i, '"genuine"'],
  [/\bhonest(ly)?\b/i, '"honest"'],
  [/\bown\b/i, '"own" (remove it unless it is the "in its own right" idiom)'],
  [/\*\*/, 'bold markup'],
];

function validate(key, only) {
  const c = CUISINES.find((x) => x.key === key);
  if (!c) throw new Error(`No cuisine "${key}". One of: ${CUISINES.map((x) => x.key).join(', ')}`);
  const band = readCuisineBands().find((b) => b.key === key);
  if (!band) throw new Error(`lib/cuisineBands.ts has no band "${key}"`);
  const shelves = new Set(band.shelves);
  const tags = loadUnlistedTags(c);

  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  const foodCheck = db.prepare('SELECT 1 AS ok FROM foods WHERE category = ? AND base_name = ? AND hidden = 0 LIMIT 1');

  // Every recipe id in every cuisine's files, so a dish may point at a base
  // written in another file or another cuisine.
  const idsInFiles = new Map();
  const parsed = new Map();
  for (const other of CUISINES) {
    for (const f of recipeFiles(other)) {
      const label = `${other.key}/${f}`;
      try {
        const data = JSON.parse(fs.readFileSync(path.join(other.dir, f), 'utf8'));
        if (other.key === key) parsed.set(f, data);
        for (const r of data.recipes || []) {
          if (!idsInFiles.has(r.id)) idsInFiles.set(r.id, []);
          idsInFiles.get(r.id).push(label);
        }
      } catch (e) {
        if (other.key === key) parsed.set(f, { parseError: e.message });
      }
    }
  }
  const existingIds = new Set(db.prepare('SELECT id FROM curated_recipes').all().map((r) => r.id));
  const baseFile = path.join(c.dir, 'base_ids.json');
  const BASE_IDS = new Set(fs.existsSync(baseFile) ? JSON.parse(fs.readFileSync(baseFile, 'utf8')).bases.map((b) => b.id) : []);

  const targets = only && only.length > 0 ? only.map((f) => path.basename(f)) : recipeFiles(c);
  let failed = false;
  for (const f of targets) {
    const errors = [];
    const warnings = [];
    const data = parsed.get(f);
    if (!data) { console.log(`${key}/${f}: not found (recipe files are named a_ to h_ and end .json)`); failed = true; continue; }
    if (data.parseError) { console.log(`${key}/${f}: JSON parse error: ${data.parseError}`); failed = true; continue; }
    if (!Array.isArray(data.recipes)) { console.log(`${key}/${f}: top level must be { "recipes": [ ... ] }`); failed = true; continue; }
    const madeFirstFile = key === 'mexican' && f.startsWith('d_');

    const components = new Map();
    for (const r of data.recipes) {
      const at = r.id || '(no id)';
      const err = (m) => errors.push(`${at}: ${m}`);
      const warn = (m) => warnings.push(`${at}: ${m}`);

      if (!/^curated_[a-z0-9_]+$/.test(r.id || '')) err('id must be curated_ followed by lowercase letters, digits and underscores');
      else if (!madeFirstFile && !r.id.startsWith(c.prefix)) err(`id must start with ${c.prefix}`);
      if ((idsInFiles.get(r.id) || []).length > 1) err(`id appears in more than one place: ${idsInFiles.get(r.id).join(', ')}`);
      if (existingIds.has(r.id) && !idsInFiles.has(r.id)) err('id already exists in curated_recipes');
      if (!r.name || typeof r.name !== 'string') err('name missing');
      if (!BUILDER_TYPES.has(r.builderType)) err(`builderType must be one of ${[...BUILDER_TYPES].join(', ')}`);
      if (r.builderType === 'side' && !['main', 'side'].includes(r.dishRole)) err('a side builderType needs dishRole "main" or "side"');
      if (!Number.isInteger(r.servings) || r.servings < 1) err('servings must be a whole number of 1 or more');
      if (!(r.servingSizeAmount > 0)) err('servingSizeAmount must be above 0');
      if (!SERVING_UNITS.has(r.servingSizeUnit)) err(`servingSizeUnit must be one of ${[...SERVING_UNITS].join(', ')}`);
      if (!r.flavorProfile) err('flavorProfile missing');
      if (!r.healthBenefit) err('healthBenefit missing');
      if (!r.dishGroup) err('dishGroup missing');
      else if (!madeFirstFile && !shelves.has(r.dishGroup)) err(`dishGroup "${r.dishGroup}" is not a shelf of the ${band.cuisine} band: ${band.shelves.join(' | ')}`);
      if (!TIERS.has(r.overallTier)) err('overallTier must be strong, moderate or weak');

      const ings = Array.isArray(r.ingredients) ? r.ingredients : [];
      const comps = Array.isArray(r.components) ? r.components : [];
      if (ings.length + comps.length === 0) err('no ingredients and no components');
      ings.forEach((ing, i) => {
        const where = `ingredient ${i + 1}`;
        if (!(ing.quantity > 0)) err(`${where}: quantity must be above 0`);
        if (!UNITS.has(ing.unit)) err(`${where}: unit must be one of ${[...UNITS].join(', ')}`);
        if (ing.notInDatabase) {
          if (!ing.name) err(`${where}: a notInDatabase ingredient needs a name`);
          if (ing.category || ing.baseName) err(`${where}: a notInDatabase ingredient carries a name, not category and baseName`);
          try {
            const contains = unlistedContains(ing, tags);
            if (contains === undefined) err(`${where}: a notInDatabase ingredient needs "contains": one or more of meat, fish, dairy, egg, gluten, insect, alcohol, or "none"`);
          } catch (e) {
            err(`${where}: ${e.message}`);
          }
        } else {
          if (!ing.category || !ing.baseName) err(`${where}: needs category and baseName, or notInDatabase: true with a name`);
          else if (!foodCheck.get(ing.category, ing.baseName)) err(`${where}: (${ing.category}, ${ing.baseName}) is not a visible food in the database`);
        }
      });
      comps.forEach((comp, i) => {
        const where = `component ${i + 1}`;
        if (!comp.recipeId) { err(`${where}: recipeId missing`); return; }
        if (!(comp.servings > 0)) err(`${where}: servings (how many of that recipe's servings this batch uses) must be above 0`);
        if (comp.recipeId === r.id) err(`${where}: a recipe cannot be a component of itself`);
        const known = existingIds.has(comp.recipeId) || BASE_IDS.has(comp.recipeId) || idsInFiles.has(comp.recipeId);
        if (!known) err(`${where}: ${comp.recipeId} is not an existing recipe, a listed base, or a recipe in any file`);
        else if (!existingIds.has(comp.recipeId) && !idsInFiles.has(comp.recipeId)) warn(`${where}: ${comp.recipeId} is a listed base not written yet`);
      });
      components.set(r.id, comps.map((x) => x.recipeId));

      const steps = Array.isArray(r.instructions) ? r.instructions : [];
      if (steps.length < 2) err('needs at least 2 instructions');
      const hl = Array.isArray(r.nutritionHighlights) ? r.nutritionHighlights : [];
      if (hl.length < 1 || hl.length > 3) err('needs 1 to 3 nutritionHighlights');
      const cites = Array.isArray(r.citations) ? r.citations : [];
      if (cites.length < 1) err('needs at least 1 citation');
      cites.forEach((x, i) => { if (!x.source || !/^https?:\/\//.test(x.url || '')) err(`citation ${i + 1}: needs source and an http(s) url`); });

      const texts = [r.name, r.flavorProfile, r.healthBenefit, ...steps, ...hl.map((h) => `${h.nutrient} ${h.note}`),
        ...ings.map((x) => [x.name, x.cutPrep, x.cookingMethod, x.prepNote].filter(Boolean).join(' ')),
        ...comps.map((x) => x.note || '')];
      for (const t of texts) {
        if (typeof t !== 'string') continue;
        for (const [re, label] of STYLE) if (re.test(t)) err(`writing rule, ${label}: "${t.slice(0, 90)}"`);
      }
    }

    // A component loop inside one file.
    const visiting = new Set();
    const done = new Set();
    const loop = (id, trail) => {
      if (done.has(id)) return;
      if (visiting.has(id)) { errors.push(`component loop: ${[...trail, id].join(' > ')}`); return; }
      visiting.add(id);
      for (const next of components.get(id) || []) loop(next, [...trail, id]);
      visiting.delete(id);
      done.add(id);
    };
    for (const id of components.keys()) loop(id, []);

    console.log(`${key}/${f}: ${data.recipes.length} recipes, ${errors.length} errors, ${warnings.length} warnings`);
    for (const e of errors) console.log(`  ERROR ${e}`);
    for (const w of warnings.slice(0, 20)) console.log(`  warn  ${w}`);
    if (warnings.length > 20) console.log(`  ... ${warnings.length - 20} more warnings`);
    if (errors.length > 0) failed = true;
  }
  return !failed;
}

module.exports = { validate };

if (require.main === module) {
  const [key, ...files] = process.argv.slice(2);
  if (!key) { console.log(`Usage: node scripts/validate_cuisine_recipes.js <${CUISINES.map((x) => x.key).join('|')}|all> [file.json ...]`); process.exit(1); }
  const keys = key === 'all' ? CUISINES.map((x) => x.key) : [key];
  let ok = true;
  for (const k of keys) ok = validate(k, files) && ok;
  process.exit(ok ? 0 : 1);
}
