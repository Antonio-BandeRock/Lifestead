/* global __dirname */
// Computes real, rule-based diet-compatibility tags for every curated
// recipe, 2026-08-24, direct request: "For all recipes, they need to be
// grouped so they can be identified at being omnivore, vegetarian, or
// vegan... also identified for if they fit into the mediterranean, or the
// AIP, or any of the other various diet plans."
//
// Every tag here is computed directly from the live database's own real
// (category, base_name) ingredient rows for all 300 curated recipes, the
// same way this project's own vegan/vegetarian meal-plan tracks were
// classified -- never eyeballed recipe-by-recipe. Rules are stated
// explicitly below so they're auditable, matching this app's own standing
// evidence-honesty discipline: a UI tag is still a real claim about a
// dish, not decoration.
//
// One base-tier tag (Vegan/Vegetarian/Omnivore, mutually exclusive, since
// vegan already implies vegetarian-safe -- showing both would be
// redundant) plus zero or more real diet-philosophy tags:
//
//   Plant-Based/Flexitarian -- any vegan/vegetarian recipe, or an
//     omnivore recipe whose only meat is poultry/fish/shellfish (no red
//     meat), matching flexitarian's own real "mostly plant, occasional
//     lighter meat" definition.
//   Mediterranean -- uses olive oil as its fat AND has no red meat
//     (Mediterranean research consistently treats red meat as the least
//     emphasized protein there, fish/poultry/legumes/plants the most).
//   Gluten-Free -- no wheat/rye/spelt/seitan/wheat-based soy sauce
//     ingredient present. Oats are treated as GF-compatible by default,
//     the same real, standard convention most consumer labeling uses.
//   Dairy-Free -- no Dairy-category ingredient present (independent of
//     the vegan/vegetarian tag, since an egg dish with no dairy at all is
//     real and dairy-free without being vegan).
//   Paleo -- no Grain/Legume/Dairy-category ingredient, no refined cane
//     sugar, no commercial mayonnaise. Honey and maple syrup are treated
//     as real, allowed Paleo sweeteners, the same standard reading most
//     Paleo guidance itself uses.
//   AIP -- Paleo's own rules, further excluding eggs, nuts/seeds, and
//     nightshades (tomato, white potato, eggplant, bell pepper, and
//     nightshade-derived spices like paprika), the real, standard AIP
//     elimination list. Expected to match very few recipes -- that's
//     honest, not a bug, AIP is genuinely this restrictive.
//   High-Protein -- contains meat, a real protein legume (tofu, tempeh,
//     beans, lentils), egg, or a real high-protein dairy food (Greek
//     yogurt, cottage cheese, cheese) -- excludes plain produce sides
//     that are real foods but never a meaningful protein source.
//
// Deliberately NOT auto-tagged: Keto. A real carb-gram threshold (under
// 30g/day) needs full per-recipe macro computation this project doesn't
// currently have built for all 300 recipes (scripts/compute_recipe_data.js
// only ever covered the original 47) -- naming this honestly rather than
// inventing a number, matching this app's own standing rule against
// invented precision.
//
// Usage:
//   node scripts/compute_recipe_diet_tags.js
// Writes scripts/_recipe_diet_tags_output.json, a { [recipeId]: string[] }
// map, for the follow-up step that writes these into lib/digest/recipes.ts.

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DB = path.join(__dirname, '..', 'assets', 'data', 'foods_reference.db');

// Through node:sqlite since 2026-10-29, the same change as in
// compute_recipe_condition_data.js, where going through sqlite3.exe on the
// command line garbled accented food names on Windows.
const db = new DatabaseSync(DB, { readOnly: true });
function runSql(sql) {
  return db.prepare(sql).all();
}

const rows = runSql(`
  SELECT cri.recipe_id AS recipeId, cri.category AS category, cri.base_name AS baseName
  FROM curated_recipe_ingredients cri
  ORDER BY cri.recipe_id, cri.sort_order;
`);

const byRecipe = new Map();
for (const row of rows) {
  if (!byRecipe.has(row.recipeId)) byRecipe.set(row.recipeId, []);
  byRecipe.get(row.recipeId).push({ category: row.category, baseName: row.baseName });
}

// 2026-10-29: ingredients the food database does not hold (the Mexican
// recipes' guajillo chiles, corn husks, goat meat) live in
// curated_recipe_unlisted_ingredients with the diet tags they carry in
// `contains` (meat, fish, dairy, egg, gluten, insect, alcohol), so a recipe
// whose goat is not in the database is still never tagged Vegan.
const RED_MEAT_NAME_UNLISTED =
  /\b(beef|pork|lamb|mutton|goat|veal|venison|ham|bacon|sausages?|chorizo|longaniza|salami|lard|tongue|tripe|res|cerdo|chivo|cabrito|tasajo|chicharr\w*|espinazo|buche|cow|asiento)\b/i;
const UNLISTED_NIGHTSHADE = /chil[ei]|guajillo|ancho|pasilla|mulato|chipotle|habanero|jalape|poblano|serrano|tomat|paprika/i;
const unlistedTable = runSql("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'curated_recipe_unlisted_ingredients';");
const unlistedByRecipe = new Map();
if (unlistedTable.length > 0) {
  for (const row of runSql('SELECT recipe_id AS recipeId, name, contains FROM curated_recipe_unlisted_ingredients;')) {
    if (!unlistedByRecipe.has(row.recipeId)) unlistedByRecipe.set(row.recipeId, new Set());
    for (const tag of String(row.contains || '').split(',').filter(Boolean)) unlistedByRecipe.get(row.recipeId).add(tag);
    // Chiles are nightshades, which only AIP asks about, so the name says so
    // rather than a tag every other diet would ignore. Tomatillo husks flavour
    // the cooking water and are not eaten.
    if (UNLISTED_NIGHTSHADE.test(row.name) && !/husk/i.test(row.name)) unlistedByRecipe.get(row.recipeId).add('nightshade');
    // Red meat the same way, for Flexitarian and Mediterranean.
    if (/\bmeat\b/.test(String(row.contains || '')) && RED_MEAT_NAME_UNLISTED.test(row.name)) unlistedByRecipe.get(row.recipeId).add('redmeat');
    if (!byRecipe.has(row.recipeId)) byRecipe.set(row.recipeId, []);
  }
}

const RED_MEATS = new Set([
  'Beef Top Sirloin (Raw)',
  'Bison Top Sirloin (Raw)',
  'Lamb Chop (Raw)',
  'Lamb Fillet (Raw)',
  'Pork Chop (Raw)',
  'Pork Fillet / Tenderloin (Raw)',
  'Pork Loin (Raw)',
]);

const GLUTEN_INGREDIENTS = new Set([
  'Bröd fullkorn vete råg fibrer ca 6%',
  'Tortilla, wraps/burrito, hvetemel',
  'Bulgur',
  'Couscous (durum wheat)',
  'Meat substitute containing gluten (seitan)',
  'Spelt Grains',
  'Soy sauce made from soy and wheat (shoyu)',
  'Wheat flour, white, tortilla mix, enriched',
  'Whole-Grain Wheat Flour',
]);

const PROTEIN_LEGUMES = new Set([
  'MORI-NU, Tofu, silken, firm',
  'Tofu',
  'Tempeh',
  'Black Beans',
  'Chickpea',
  'Chickpeas (garbanzo beans, bengal gram)',
  'Kidney Beans',
  'Lentil, green, hulled, dry',
  'Lentil, red, hulled, dry',
  'Lima Bean',
  'Pinto Beans',
  'White Beans',
  'Edamame',
]);

const HIGH_PROTEIN_DAIRY = new Set(['Yogurt, Greek, plain, lowfat', 'Cottage Cheese', 'Cheddar', 'Feta', 'Parmesan']);

const NIGHTSHADES = new Set(['Tomato', 'Potato', 'Eggplant', 'Red Bell Pepper', 'Yellow Bell Pepper']);
// 2026-10-29: the five above missed every chile, the tomatillo, green bell
// pepper, tomato paste and the red potato, which the Mexican recipes made
// common. Black pepper is a different plant and sweet potato is not a
// nightshade.
const NIGHTSHADE_NAME = /(tomato|tomatillo|potato|eggplant|bell pepper|chile|chili|cayenne|pimiento)|^Pepper, (ancho|jalapeno|pasilla|serrano|poblano|chipotle|guajillo)|^Peppers, hot/i;
const NOT_NIGHTSHADE_NAME = /sweet potato|black/i;

function hasNightshadeName(ingredients) {
  return ingredients.some((i) => NIGHTSHADE_NAME.test(i.baseName) && !NOT_NIGHTSHADE_NAME.test(i.baseName));
}

// Butter sits under Fats in this database, not Dairy.
const DAIRY_FAT_NAME = /^(Pure Butter|Butter, plain)/i;
const NIGHTSHADE_SPICES = new Set(['Paprika']);

const REFINED_SUGAR = new Set(['Sugar (Cane / Granulated)']);
const COMMERCIAL_CONDIMENTS = new Set(['Dressing, mayonnaise, whole egg type']);

function hasCategory(ingredients, category) {
  return ingredients.some((i) => i.category === category);
}

function hasIngredient(ingredients, category, baseName) {
  return ingredients.some((i) => i.category === category && i.baseName === baseName);
}

function hasNameMatch(ingredients, regex) {
  return ingredients.some((i) => regex.test(i.baseName));
}

function hasAnyFromSet(ingredients, names) {
  return ingredients.some((i) => names.has(i.baseName));
}

// 2026-10-29, direct instruction: "Goat and any other meat must be
// categorized as meat so it will disqualify as vegan. Make sure anything that
// we know what it is can be categorized properly." The database's category
// alone missed animal foods filed elsewhere: Pork Lard and Beef Tallow under
// Fats, Gelatine and the stocks under PantryStaples, fish sauce and oyster
// sauce under Herbs, ghee under Fats. So an ingredient is also read by its
// name, with the plant foods that share a word (coconut meat, lamb's lettuce,
// butter beans, sesame butter) named as exceptions. Checked against every
// visible food in the database on 2026-10-29.
const FLESH_NAME =
  /\b(beef|pork|lamb|mutton|goat|veal|venison|bison|buffalo|chicken|turkey|duck|goose|quail|rabbit|bacon|ham|sausages?|chorizo|salami|prosciutto|pancetta|lard|tallow|suet|gelatine?|bouillon|broth|stock|consomm[eé]|dashi|anchov\w*|fish|salmon|tuna|cod|shrimps?|prawns?|crab|lobster|oysters?|clams?|mussels?|squid|octopus|scallops?|sardines?|mackerel|caviar|roe|liver|tripe|oxtail|meat|nam pla)\b/i;
const NOT_FLESH_NAME =
  /\beggs?\b|vegetable|vegan|vegetarian|plant|meat (substitute|extender|alternative)|alternativ|imitation|meatless|coconut|lettuce|squash|green caviar|u\. gelatin|seitan|tofu|mushroom/i;
const DAIRY_NAME = /\b(milk|cream|cheese|butter|yogh?urt|ghee|whey|casein|kefir|curds?|quark|skyr|paneer|ricotta|mozzarella|parmesan)\b/i;
const NOT_DAIRY_NAME =
  /coconut|soy|almond|\boat|rice milk|cashew|nut|peanut|cocoa butter|cacao butter|seed butter|sesame|sunflower|tahini|apple butter|cream of tartar|plant|vegan|dairy[- ]free|non-?dairy|hemp|pea milk|bean|lettuce|bread and butter|vegetabilsk|milk cap|tofu|cream cracker/i;
const EGG_NAME = /\beggs?\b|mayonnaise/i;
const NOT_EGG_NAME = /egg[- ]free|eggless/i;
// Honey is made by bees, so a recipe with it is Vegetarian, not Vegan, the
// definition the Vegan Society uses.
const HONEY_NAME = /\bhoney\b/i;
// Red meat for the Flexitarian and Mediterranean tags, by name rather than a
// fixed list of cuts, which missed goat, ground pork, bacon, ham and brisket.
const RED_MEAT_NAME =
  /\b(beef|pork|lamb|mutton|goat|veal|venison|bison|buffalo|ham|bacon|sausages?|chorizo|longaniza|salami|prosciutto|pancetta|lard|tallow|oxtail|tongue|tripe|res|cerdo|chivo|cabrito|tasajo|chicharr\w*|espinazo|buche|cow|steak|brisket|sirloin|ribs?)\b/i;

// What is said in a name that does not count: "granules without milk".
function withoutNegations(name) {
  return name.replace(/\b(without|no added|no|u\.)\s+(milk|meat|gelatin)\b/gi, '');
}

function isFlesh(i) {
  if (i.category === 'Meat') return true;
  if (['Mushroom', 'Algae', 'Veg'].includes(i.category)) return false;
  const name = withoutNegations(i.baseName);
  return FLESH_NAME.test(name) && !NOT_FLESH_NAME.test(name);
}

function isDairy(i) {
  if (i.category === 'Dairy') return !EGG_NAME.test(i.baseName) || DAIRY_NAME.test(i.baseName);
  if (i.category === 'Mushroom') return false;
  const name = withoutNegations(i.baseName);
  return DAIRY_NAME.test(name) && !NOT_DAIRY_NAME.test(name);
}

function isEgg(i) {
  return EGG_NAME.test(i.baseName) && !NOT_EGG_NAME.test(i.baseName);
}

function hasRedMeat(ingredients, unlistedRedMeat = false) {
  return unlistedRedMeat || ingredients.some((i) => (RED_MEATS.has(i.baseName) || RED_MEAT_NAME.test(i.baseName)) && isFlesh(i));
}

// 2026-10-29: wheat, barley and rye named in a base_name the fixed list
// above does not hold (the Mexican recipes' flour tortillas and bolillos).
// Buckwheat is not wheat.
const GLUTEN_GRAIN_NAME = /\b(wheat|barley|rye|spelt|semolina|durum|seitan)\b/i;

function hasGluten(ingredients) {
  return ingredients.some(
    (i) => GLUTEN_INGREDIENTS.has(i.baseName) || (GLUTEN_GRAIN_NAME.test(i.baseName) && !/buckwheat/i.test(i.baseName)),
  );
}

function classifyRecipe(ingredients, unlisted = new Set()) {
  const tags = [];

  // ---- Base tier: exactly one of Vegan / Vegetarian / Omnivore ----
  const unlistedAnimal = unlisted.has('meat') || unlisted.has('fish') || unlisted.has('insect');
  const hasMeat = ingredients.some(isFlesh) || unlistedAnimal;
  const hasDairy = ingredients.some(isDairy) || hasNameMatch(ingredients, DAIRY_FAT_NAME) || unlisted.has('dairy');
  const hasEgg = ingredients.some(isEgg) || unlisted.has('egg');
  const hasHoney = ingredients.some((i) => i.category !== 'Mushroom' && HONEY_NAME.test(i.baseName)) || unlisted.has('honey');
  const redMeat = hasRedMeat(ingredients, unlisted.has('redmeat'));
  let baseTag;
  if (hasMeat) {
    baseTag = 'Omnivore';
  } else if (hasDairy || hasEgg || hasHoney) {
    baseTag = 'Vegetarian';
  } else {
    baseTag = 'Vegan';
  }
  tags.push(baseTag);

  // ---- Plant-Based/Flexitarian ----
  const onlyLighterMeat = hasMeat && !redMeat;
  if (baseTag === 'Vegan' || baseTag === 'Vegetarian' || onlyLighterMeat) {
    tags.push('Plant-Based/Flexitarian');
  }

  // ---- Mediterranean ----
  const hasOliveOil = hasIngredient(ingredients, 'Fats', 'Olive Oil (Extra Virgin)');
  if (hasOliveOil && !redMeat) {
    tags.push('Mediterranean');
  }

  // ---- Gluten-Free ----
  const containsGluten = hasGluten(ingredients) || unlisted.has('gluten');
  if (!containsGluten) {
    tags.push('Gluten-Free');
  }

  // ---- Dairy-Free ----
  if (!hasDairy) {
    tags.push('Dairy-Free');
  }

  // ---- Paleo ----
  const hasGrain = hasCategory(ingredients, 'Grain');
  const hasLegume = hasCategory(ingredients, 'Legume');
  const hasBaked = hasCategory(ingredients, 'Baked');
  const hasRefinedSugar = hasAnyFromSet(ingredients, REFINED_SUGAR);
  const hasCommercialCondiment = hasAnyFromSet(ingredients, COMMERCIAL_CONDIMENTS);
  // Wheat flour sits under the PantryStaples category in this database,
  // not Grain -- GLUTEN_INGREDIENTS already names every real grain-derived
  // item across every category it actually appears in (Grain, Baked, the
  // Legume soy-sauce row, and these two PantryStaples flour rows), so
  // reusing it here catches the flour case the plain category checks miss.
  const hasGrainProduct = hasGrain || hasBaked || containsGluten;
  const isPaleo = !hasGrainProduct && !hasLegume && !hasDairy && !hasRefinedSugar && !hasCommercialCondiment;
  if (isPaleo) {
    tags.push('Paleo');
  }

  // ---- AIP (Autoimmune Protocol) ----
  if (isPaleo) {
    const hasNutSeed = hasCategory(ingredients, 'NutSeed');
    const hasNightshade =
      hasAnyFromSet(ingredients, NIGHTSHADES) || hasAnyFromSet(ingredients, NIGHTSHADE_SPICES) || hasNightshadeName(ingredients) || unlisted.has('nightshade');
    if (!hasEgg && !hasNutSeed && !hasNightshade) {
      tags.push('AIP');
    }
  }

  // ---- High-Protein ----
  const hasProteinLegume = hasAnyFromSet(ingredients, PROTEIN_LEGUMES);
  const hasHighProteinDairy = hasAnyFromSet(ingredients, HIGH_PROTEIN_DAIRY);
  // Meat as a protein: lard, gelatine and a stock flavour a dish without
  // making it a protein source.
  const hasProteinMeat = hasCategory(ingredients, 'Meat') || unlistedAnimal;
  if (hasProteinMeat || hasProteinLegume || hasEgg || hasHighProteinDairy) {
    tags.push('High-Protein');
  }

  return tags;
}

const output = {};
for (const [recipeId, ingredients] of byRecipe.entries()) {
  output[recipeId] = classifyRecipe(ingredients, unlistedByRecipe.get(recipeId));
}

const outPath = path.join(__dirname, '_recipe_diet_tags_output.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`Classified ${Object.keys(output).length} recipes -> ${outPath}`);

// Quick summary counts, printed directly so the classification can be
// sanity-checked before it's written into recipes.ts.
const counts = {};
for (const tags of Object.values(output)) {
  for (const t of tags) counts[t] = (counts[t] || 0) + 1;
}
console.log('Tag counts:', counts);
