/* global __dirname */
// 2026-10-29: "the links to make this first will also need to be applied to
// the existing recipes." scripts/add_mexican_recipes.js applies the links in
// scripts/_mexican_recipes/d_existing_links.json to the database; this does
// the same to each older recipe's card in lib/digest/recipes.ts, so the card
// shows the made-first line that taps through.
//
// For each link, the card's ingredient lines naming what the made-first
// recipe stands in for (the vegetable stock and its water, the flour
// tortilla, the hummus listed by its parts) are taken out, and one makeFirst
// line goes where the first of them was. A line is matched by a word for each
// replaced food (WORDS below); where a hummus link has a choice, a line
// saying hummus wins. Every change is printed so it can be read over.
//
// Rerunnable: a card already carrying the link's makeFirst line is left alone.
//
// Run after scripts/generate_mexican_recipes_ts.js (which writes the new
// made-first recipes' own cards): node scripts/apply_existing_recipe_links_ts.js
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { loadMexicanRecipes, loadExistingLinks } = require('./add_mexican_recipes');
const { componentText, digestId, q } = require('./generate_mexican_recipes_ts');
const { DB_PATH } = require('./flatten_recipe_components');

const RECIPES_TS = path.join(__dirname, '..', 'lib', 'digest', 'recipes.ts');

const WORDS = {
  'Wheat flour, white, tortilla mix, enriched': /tortilla/i,
  'Tortilla, wraps/burrito, hvetemel': /tortilla/i,
  'Chickpeas (garbanzo beans, bengal gram)': /chickpea/i,
  Tahini: /tahini/i,
  Lemon: /lemon/i,
  Garlic: /garlic/i,
  'Common salt/table salt': /\bsalt\b/i,
  'Olive Oil (Extra Virgin)': /olive oil/i,
  'Water, tap': /water/i,
  'Vegetable stock': /stock|bouillon|broth/i,
  'Chicken bouillon/stock/soup (stock cubes, powder)': /stock|bouillon|broth/i,
};

const newRecipes = new Map(loadMexicanRecipes().map((r) => [r.id, r]));
const db = new DatabaseSync(DB_PATH, { readOnly: true });
const dbRecipe = db.prepare('SELECT id, name, serving_size_amount AS servingSizeAmount, serving_size_unit AS servingSizeUnit FROM curated_recipes WHERE id = ?');

let source = fs.readFileSync(RECIPES_TS, 'utf8');
const crlf = source.includes('\r\n');
const lines = source.replace(/\r\n/g, '\n').split('\n');

function entryIdFor(curatedId) {
  const at = lines.findIndex((l) => l === `    linkedCuratedRecipeId: '${curatedId}',`);
  if (at === -1) return null;
  for (let i = at; i >= 0; i -= 1) {
    const m = lines[i].match(/^ {4}id: '([^']+)',/);
    if (m) return m[1];
  }
  return null;
}

let problems = 0;
let changed = 0;
for (const link of loadExistingLinks()) {
  const at = lines.findIndex((l) => l === `    linkedCuratedRecipeId: '${link.recipeId}',`);
  if (at === -1) { console.log(`PROBLEM: no card for ${link.recipeId}`); problems++; continue; }
  const start = lines.findIndex((l, i) => i > at && l === '      ingredients: [');
  const end = lines.findIndex((l, i) => i > start && l === '      ],');
  const target = entryIdFor(link.componentRecipeId) || digestId(link.componentRecipeId);
  const block = lines.slice(start + 1, end);
  if (block.some((l) => l.includes(`makeFirst: '${target}'`))) continue;

  const taken = [];
  for (const r of link.replaces) {
    const word = WORDS[r.baseName];
    if (!word) { console.log(`PROBLEM: no word for ${r.baseName}`); problems++; continue; }
    const candidates = block
      .map((l, i) => ({ l, i }))
      .filter(({ l, i }) => !taken.includes(i) && !l.includes('makeFirst') && word.test(l));
    const preferred = candidates.find(({ l }) => /hummus/i.test(l)) || candidates[0];
    if (!preferred) { console.log(`  ${link.recipeId}: no line for ${r.baseName}, left as is`); continue; }
    taken.push(preferred.i);
  }
  if (taken.length === 0) { console.log(`PROBLEM: ${link.recipeId} has no line to replace`); problems++; continue; }

  const comp = newRecipes.get(link.componentRecipeId) || dbRecipe.get(link.componentRecipeId);
  if (!comp) { console.log(`PROBLEM: ${link.componentRecipeId} is not a recipe`); problems++; continue; }
  const makeLine = `        { text: ${q(componentText({ servings: link.servings, note: link.note }, comp))}, makeFirst: ${q(target)} },`;
  const first = Math.min(...taken);
  console.log(`${link.recipeId}`);
  for (const i of taken.slice().sort((a, b) => a - b)) console.log(`    - ${block[i].trim()}`);
  console.log(`    + ${makeLine.trim()}`);
  const replaced = [];
  block.forEach((l, i) => {
    if (i === first) replaced.push(makeLine);
    else if (!taken.includes(i)) replaced.push(l);
  });
  lines.splice(start + 1, end - start - 1, ...replaced);
  changed++;
}

source = lines.join('\n');
fs.writeFileSync(RECIPES_TS, crlf ? source.replace(/\n/g, '\r\n') : source, 'utf8');
console.log(`\n${changed} links written to cards${problems ? `, ${problems} problems` : ''}.`);
process.exit(problems ? 1 : 0);
