/* global __dirname */
// The cuisines whose System Recipes are written as recipe files, one folder
// each, and the loaders every cuisine script shares.
//
// 2026-10-29: Mexican came first (scripts/_mexican_recipes/); French,
// Italian, German, Chinese, Thai and Vietnamese followed the same day, each
// in scripts/_cuisines/<key>/. A folder holds base_ids.json (the made-first
// recipes, fixed before any dish was written so files written side by side
// agree on ids), a dish list, and recipe files named a_ to h_.
//
// The bands and shelves themselves live in lib/cuisineBands.ts, which
// readCuisineBands below reads as text so the app and these scripts cannot
// disagree about them.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const CUISINES = [
  { key: 'mexican', cuisine: 'Mexican', prefix: 'curated_mx_', dir: path.join(__dirname, '_mexican_recipes') },
  { key: 'french', cuisine: 'French', prefix: 'curated_fr_', dir: path.join(__dirname, '_cuisines', 'french') },
  { key: 'italian', cuisine: 'Italian', prefix: 'curated_it_', dir: path.join(__dirname, '_cuisines', 'italian') },
  { key: 'german', cuisine: 'German', prefix: 'curated_de_', dir: path.join(__dirname, '_cuisines', 'german') },
  { key: 'chinese', cuisine: 'Chinese', prefix: 'curated_cn_', dir: path.join(__dirname, '_cuisines', 'chinese') },
  { key: 'thai', cuisine: 'Thai', prefix: 'curated_th_', dir: path.join(__dirname, '_cuisines', 'thai') },
  { key: 'vietnamese', cuisine: 'Vietnamese', prefix: 'curated_vn_', dir: path.join(__dirname, '_cuisines', 'vietnamese') },
];

const DIET_TAGS = new Set(['meat', 'fish', 'dairy', 'egg', 'gluten', 'insect', 'alcohol', 'none']);

// Recipe files: a_ to h_ hold recipes. Mexican's d_existing_links.json also
// holds the made-first recipes the older System Recipes point at (stocks,
// hummus), which belong to no cuisine.
function recipeFiles(c) {
  if (!fs.existsSync(c.dir)) return [];
  return fs.readdirSync(c.dir).filter((f) => /^[a-h]_.*\.json$/.test(f)).sort();
}

function loadCuisineRecipes(c) {
  const recipes = [];
  for (const f of recipeFiles(c)) {
    const data = JSON.parse(fs.readFileSync(path.join(c.dir, f), 'utf8'));
    const cuisine = c.key === 'mexican' && f.startsWith('d_') ? null : c.cuisine;
    for (const r of data.recipes || []) recipes.push({ ...r, sourceFile: f, cuisine, cuisineKey: c.key });
  }
  return recipes;
}

function loadAllCuisineRecipes() {
  return CUISINES.flatMap(loadCuisineRecipes);
}

function loadExistingLinks() {
  const file = path.join(CUISINES[0].dir, 'd_existing_links.json');
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).links || [] : [];
}

// Mexican keeps its diet tags for unlisted ingredients in unlisted_tags.json;
// the later cuisines carry `contains` on the ingredient itself.
function loadUnlistedTags(c) {
  const file = path.join(c.dir, 'unlisted_tags.json');
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).tags : {};
}

function unlistedKey(name) {
  return name.trim().toLowerCase();
}

// What an unlisted ingredient contains, as the comma list the table stores
// ('' for plant or mineral), or undefined when nothing says.
function unlistedContains(ing, tags) {
  let value = ing.contains;
  if (Array.isArray(value)) value = value.join(',');
  if (value === undefined) value = tags[unlistedKey(ing.name)];
  if (value === undefined) return undefined;
  const list = String(value).split(',').map((t) => t.trim()).filter(Boolean);
  for (const tag of list) if (!DIET_TAGS.has(tag)) throw new Error(`Unknown diet tag "${tag}" for ${ing.name}`);
  return list.filter((t) => t !== 'none').join(',');
}

function readCuisineBands() {
  const source = fs.readFileSync(path.join(ROOT, 'lib', 'cuisineBands.ts'), 'utf8');
  const start = source.indexOf('export const CUISINE_BANDS');
  const open = source.indexOf('= [', start) + 2;
  const end = source.indexOf('\n];', open) + 2;
  return new Function(`return ${source.slice(open, end)};`)();
}

module.exports = {
  CUISINES,
  DIET_TAGS,
  recipeFiles,
  loadCuisineRecipes,
  loadAllCuisineRecipes,
  loadExistingLinks,
  loadUnlistedTags,
  unlistedKey,
  unlistedContains,
  readCuisineBands,
};
