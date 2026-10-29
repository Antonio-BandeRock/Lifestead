/* global __dirname */
// Writes every cuisine's System Recipes into lib/digest/recipes.ts, one
// DigestEntry per recipe in that cuisine's folder (scripts/cuisine_recipes.js
// lists them), each cuisine between marker comments of its own so it can run
// again after a recipe file changes. Run after scripts/add_cuisine_recipes.js,
// then run the condition and diet tag compute and apply scripts, which fill
// dietTags, safeForConditions, conditionCautions and conditionNotes.
//
// What is different from the earlier generators:
//   - A component (something made first) is its own ingredient line with
//     makeFirst set to that recipe's digest id, so the card links to it.
//   - An ingredient the food database does not hold carries notInDatabase,
//     which the card marks and explains.
//   - citations come from the recipe files, and cuisine, shelf and region
//     go on the recipeCard for System Recipes' bands and shelves. The
//     made-first recipes from Mexican's d_existing_links.json (stocks,
//     hummus) belong to no cuisine, so they land in their builder's band.
//
// Usage: node scripts/generate_cuisine_recipes_ts.js
const fs = require('fs');
const path = require('path');
const { CUISINES, loadCuisineRecipes, loadAllCuisineRecipes } = require('./cuisine_recipes');
const { DatabaseSync } = require('node:sqlite');
const { DB_PATH } = require('./flatten_recipe_components');

const RECIPES_TS = path.join(__dirname, '..', 'lib', 'digest', 'recipes.ts');
const beginMarker = (c) => `  // BEGIN ${c.cuisine.toUpperCase()} RECIPES`;
const endMarker = (c) => `  // END ${c.cuisine.toUpperCase()} RECIPES`;

// Database base names written as a cook would say them. Anything not here is
// lowercased.
const DISPLAY_NAME = {
  'Olive Oil (Extra Virgin)': 'olive oil',
  'Common salt/table salt': 'salt',
  'Pepper, black, ground': 'black pepper',
  'Spices, cinnamon, ground': 'ground cinnamon',
  'Water, tap': 'water',
  'Pork Lard': 'lard',
  'Coriander (cilantro) leaves': 'cilantro',
};

const FRACTIONS = { 0.25: '¼', 0.5: '½', 0.75: '¾', 0.125: '⅛', 0.33: '⅓', 0.333: '⅓', 0.67: '⅔', 0.667: '⅔', 1.5: '1½', 2.5: '2½' };

function displayName(baseName) {
  const mapped = DISPLAY_NAME[baseName];
  return mapped !== undefined ? mapped : baseName.toLowerCase();
}

function formatQuantity(q) {
  return FRACTIONS[q] || String(Math.round(q * 100) / 100);
}

function amountPhrase(quantity, unit, name) {
  const qty = formatQuantity(quantity);
  if (unit === 'each') return `${qty} ${name}`;
  if (unit === 'tsp' || unit === 'tbsp') {
    const one = quantity <= 1;
    const label = unit === 'tsp' ? (one ? 'teaspoon' : 'teaspoons') : one ? 'tablespoon' : 'tablespoons';
    return `${qty} ${label} ${name}`;
  }
  return `${qty}${unit} ${name}`;
}

function ingredientText(ing) {
  const name = ing.notInDatabase ? ing.name : displayName(ing.baseName);
  let text = amountPhrase(ing.quantity, ing.unit, name);
  const descriptors = [ing.cutPrep, ing.notInDatabase ? null : ing.cookingMethod && ing.cookingMethod.toLowerCase()].filter(Boolean);
  if (descriptors.length > 0) text += `, ${descriptors.join(', ')}`;
  if (ing.prepNote === 'optional') text += ' (optional)';
  else if (ing.prepNote) text += ` (${ing.prepNote})`;
  return text;
}

const PLURAL = {
  bowl: 'bowls', cup: 'cups', plate: 'plates', tbsp: 'tbsp', serving: 'servings', glass: 'glasses', wrap: 'wraps',
  each: '', sandwich: 'sandwiches', jar: 'jars', fillet: 'fillets', taco: 'tacos', slice: 'slices', tortilla: 'tortillas',
  tamal: 'tamales', torta: 'tortas', piece: 'pieces', roll: 'rolls', bun: 'buns', skewer: 'skewers', dumpling: 'dumplings',
  pancake: 'pancakes', pastry: 'pastries',
};

// "Tortillas de Maíz, 12 tortillas": how much of the made-first recipe this
// batch uses, in that recipe's serving unit.
// A made-first amount as a cook measures it: the nearest quarter, with
// "about" when that rounds (0.78 cups reads as about ¾ cup).
const QUARTERS = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' };
function cookAmount(n) {
  const rounded = Math.max(0.25, Math.round(n * 4) / 4);
  const whole = Math.floor(rounded);
  const text = `${whole > 0 ? whole : ''}${QUARTERS[rounded - whole]}`;
  return { text: Math.abs(rounded - n) > 0.02 ? `about ${text}` : text, value: rounded };
}

// What one serving of a made-first recipe is called when its serving unit is
// each, so a link reads 2 tortillas rather than 2 servings.
const EACH_WORD = { curated_baked_wheat_tortillas: ['tortilla', 'tortillas'] };

function componentText(c, comp) {
  const unit = comp.servingSizeUnit;
  let measure;
  if (unit === 'each' || unit === 'serving') {
    const { text, value } = cookAmount(c.servings);
    const [one, many] = EACH_WORD[comp.id] || ['serving', 'servings'];
    measure = `${text} ${value <= 1 ? one : many}`;
  } else {
    const { text, value } = cookAmount(c.servings * comp.servingSizeAmount);
    measure = `${text} ${value <= 1 ? unit : PLURAL[unit] || unit}`;
  }
  let text = `${comp.name}, ${measure}`;
  if (c.note) text += `, ${c.note}`;
  return text;
}

function yieldLine(r) {
  if (r.servings === 1) return `Makes 1 ${r.servingSizeUnit}.`;
  return `Makes ${r.servings} servings.`;
}

function digestId(recipeId) {
  return 'recipe-' + recipeId.replace(/^curated_/, '').replace(/_/g, '-');
}

function q(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

module.exports = { componentText, digestId, q };

if (require.main === module) {
const byId = new Map(loadAllCuisineRecipes().map((r) => [r.id, r]));
// A link may point at a recipe written before the cuisine ones.
const db = new DatabaseSync(DB_PATH, { readOnly: true });
const dbRecipe = db.prepare('SELECT id, name, serving_size_amount AS servingSizeAmount, serving_size_unit AS servingSizeUnit FROM curated_recipes WHERE id = ?');
function recipeFor(id) {
  const r = byId.get(id) || dbRecipe.get(id);
  if (!r) throw new Error(`Component ${id} is not a recipe`);
  return r;
}

// cuisine, shelf and region, on the cuisine recipes only (not the stocks and
// hummus in Mexican's d_ file).
function cardExtras(r) {
  if (!r.cuisine) return '';
  let out = `      cuisine: ${q(r.cuisine)},\n      shelf: ${q(r.dishGroup)},\n`;
  if (r.region) out += `      region: ${q(r.region)},\n`;
  return out;
}

function blockFor(recipes) {
let block = '';
for (const r of recipes) {
  const lines = [];
  for (const c of r.components || []) {
    lines.push(`        { text: ${q(componentText(c, recipeFor(c.recipeId)))}, makeFirst: ${q(digestId(c.recipeId))} },`);
  }
  for (const ing of r.ingredients || []) {
    lines.push(`        { text: ${q(ingredientText(ing))}${ing.notInDatabase ? ', notInDatabase: true' : ''} },`);
  }
  const cites = r.citations.map((c) => `      { source: ${q(c.source)}, url: ${q(c.url)} },`).join('\n');
  block += `  {
    id: ${q(digestId(r.id))},
    category: 'recipes',
    title: ${q(r.name)},
    teaser: ${q(r.flavorProfile)},
    summary: ${q(r.healthBenefit)},
    citations: [
${cites}
    ],
    overallTier: ${q(r.overallTier)},
    linkedCuratedRecipeId: ${q(r.id)},
    linkedBuilderType: ${q(r.builderType)},
    recipeCard: {
      dietTags: [],
      safeForConditions: [],
      conditionCautions: {},
      conditionNotes: [],
${cardExtras(r)}      yield: ${q(yieldLine(r))},
      ingredients: [
${lines.join('\n')}
      ],
      instructions: [
${r.instructions.map((s) => `        ${q(s)},`).join('\n')}
      ],
      nutritionHighlights: [
${r.nutritionHighlights.map((h) => `        { nutrient: ${q(h.nutrient)}, note: ${q(h.note)} },`).join('\n')}
      ],
    },
  },
`;
}

let source = fs.readFileSync(RECIPES_TS, 'utf8');
const crlf = source.includes('\r\n');
source = source.replace(/\r\n/g, '\n');
return block;
}

let source = fs.readFileSync(RECIPES_TS, 'utf8');
const crlf = source.includes('\r\n');
source = source.replace(/\r\n/g, '\n');
let total = 0;
for (const c of CUISINES) {
  const recipes = loadCuisineRecipes(c);
  const BEGIN = beginMarker(c);
  const END = endMarker(c);
  let at = source.indexOf(BEGIN);
  if (at !== -1) {
    const end = source.indexOf(END, at);
    if (end === -1) throw new Error(`${BEGIN} without END`);
    source = source.slice(0, at) + source.slice(end + END.length + 1);
  } else {
    at = source.lastIndexOf('\n];') + 1;
    if (at === 0) throw new Error('Could not find insertion point');
  }
  if (recipes.length === 0) continue;
  const header = `${BEGIN} (scripts/generate_cuisine_recipes_ts.js writes everything up to END)\n`;
  source = source.slice(0, at) + header + blockFor(recipes) + END + '\n' + source.slice(at);
  total += recipes.length;
  console.log(`${c.cuisine}: ${recipes.length} recipe entries`);
}
fs.writeFileSync(RECIPES_TS, crlf ? source.replace(/\n/g, '\r\n') : source, 'utf8');
console.log(`Wrote ${total} recipe entries, ${crlf ? 'CRLF' : 'LF'} line endings.`);
}
