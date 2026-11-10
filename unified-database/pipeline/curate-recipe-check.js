// Where the recipes stand against the curated list. Reads both databases, changes neither.
//   node curate-recipe-check.js <output.json>
// Every ingredient name in curated_recipe_ingredients and curated_recipe_unlisted_ingredients (live database) lands in one of six places:
//   listed   the curated list has this food, under this name or another one
//   swap     a listed food does the job, and the recipe's wording would change (fresh for canned, and so on)
//   home     made in a kitchen from listed foods
//   named    no source has it, so the recipe keeps its name with no nutrition behind it, as the app does today (owner's call, 2026-11-06)
//   missing  nothing listed does the job, so the owner decides
//   aid      not eaten as a food (a wrapper, slaked lime, rennet), so no food list needs it and it blocks nothing
// Names in the first table are matched on their words first, and every name that match got wrong or could not place is set by hand in HAND.
// Names in the second table are all placed by hand in curate-recipe-outside.js.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LIVE = path.resolve(__dirname, '..', '..', 'assets', 'data', 'foods_reference.db');
const UNI = path.resolve(__dirname, '..', 'unified_foods.sqlite');
const q = (db, s) => JSON.parse(execFileSync('sqlite3', ['-readonly', '-json', db, s], { maxBuffer: 2e9 }).toString() || '[]');

const ALCOHOL = 'Alcohol used in cooking';
const PANTRY = 'Pantry items';
const SAUCES = 'Bottled sauces';
const NOSOURCE = 'Whole foods no source has';
const FERMENT = 'Traditional ferments';
const CURED = 'Sausages and cured meats with no listing';

const listed = (to) => ({ kind: 'listed', to });
const swap = (to, note) => ({ kind: 'swap', to, note });
const home = (how, recipe) => ({ kind: 'home', how, recipe });
const named = (group, stand, caution) => ({ kind: 'named', group, stand: stand || null, caution: caution || null });
const missing = (group, stand) => ({ kind: 'missing', group, stand });
const aid = (note) => ({ kind: 'aid', note });

const SEED_OIL = 'A listed oil in place of corn or sunflower oil; cold-pressed canola also works';
const BREAD = 'Flour, yeast, water and salt';
const MUSTARD = 'Mustard seeds or powder, vinegar, water and salt';
const HAND = {
  // The word match picked the wrong listing.
  'Onions, spring or scallions (includes tops and bulb)': listed('Green onions'),
  'Chicken, broiler, back, meat and skin': listed('Chicken back'),
  'Chicken, broiler, leg, meat and skin': listed('Chicken leg'),
  'Chicken Wings (with skin)': listed('Chicken wing'),
  'Chicken, capons': listed('Capon'),
  'Radish, oriental (daikon)': listed('Daikon'),
  'Radishes, oriental': listed('Daikon'),
  'Pepper, hot chili, red or green': listed('Chili pepper'),
  'Durum wheat, macaroni and spaghetti, dry pasta': listed('Dried pasta'),
  'Rice, non-glutinous rice products, fresh noodles, rice noodles': listed('Rice noodles'),
  'Couscous (durum wheat)': listed('Couscous'),
  'Nudler, hvete, uten egg, tørr': listed('Wheat noodles'),
  'Swamp cabbage (skunk cabbage, water convulvolus)': listed('Water spinach'),
  'Cabbage, Chinese flowering': listed('Choy sum'),
  'Belgium endive (chicory, witloof)': listed('Belgian endive'),
  'Beef Striploin Steak (Raw)': listed('Beef strip steak'),
  // The word match found nothing, and the food is listed under another name.
  'Red Chilli (Chili)': listed('Red chili peppers'),
  'Green Chilli (Chili)': listed('Green chili peppers'),
  'Pepper, ancho': listed('Ancho chile'),
  'Pepper, pasilla': listed('Pasilla chile'),
  'Parmesan, Parmigiano Reggiano, ost': listed('Parmesan cheese'),
  'Peanøttolje': listed('Peanut oil'),
  'Piloncillo / Unrefined Panela': listed('Whole cane sugar'),
  Feta: listed('Feta cheese'),
  Mozzarella: listed('Mozzarella cheese'),
  'Ripe Olive': listed('Olives'),
  'Yandlong beans, immature pods': listed('Yardlong beans'),
  'Ris, arborio, risottoris, tørr': listed('Arborio rice'),
  'Chinese Chive Leaves': listed('Chinese chives'),
  'Grana padano, ost': listed('Grana Padano cheese'),
  'Geitmelk, langtidsholdbar': listed('Goat milk'),
  'Yoghurt, naturell': listed('Plain yogurt'),
  'Borlottibønner, tørr': listed('Cranberry beans'),
  "Jew's ear (cloud or wood ear, pepeao)": listed('Cloud ear mushrooms'),
  'Manchego, ost': listed('Manchego cheese'),
  Swiss: listed('Swiss cheese'),
  'Klippfisk, saltet og tørket': listed('Salt cod'),
  Morel: listed('Morel mushrooms'),
  'Kokt skinke': listed('Ham'),
  'Wienerpølse': listed('Hot dog'),
  'Pork Ham (Cured)': listed('Ham'),
  'Pure Cocoa / Cacao Powder (Unsweetened)': listed('Cocoa powder'),
  'Gris sidfläsk rökt': listed('Bacon'),
  'Natural mineral water': listed('Water'),
  // Brewed from something listed: the tea leaf, the ground coffee, the dried flower.
  'Black Tea (Brewed)': listed('Black tea'),
  'Black tea (infusion)': listed('Black tea'),
  'Green Tea (Brewed)': listed('Green tea'),
  'Brewed Black Coffee': listed('Ground coffee'),
  'Coffee, brewed, espresso, restaurant prepared': listed('Ground coffee'),
  'Hibiscus / Fruit Tea (Unsweetened)': listed('Roselle'),
  'Tea, hibiscus': listed('Roselle'),
  // A listed food does the job, and the wording of the recipe changes.
  Rapsolja: listed('Canola oil'),
  'Tomatoes, canned products, whole, without salt': swap('Tomato', 'Fresh for canned'),
  'Crushed Tomato': swap('Tomato', 'Crush fresh tomatoes'),
  'Bamboo shoots, canned, drained': swap('Bamboo shoots', 'Fresh for canned'),
  'Water chestnuts, canned, drained': swap('Water chestnuts', 'Fresh for canned'),
  'Corn, sweet, canned, cream style': swap('Sweet corn', 'Fresh for canned'),
  'Cornichons pickled, canned, drained': swap('Pickled cucumbers', 'A similar pickle'),
  'Stem Mustard Pickles': swap('Pickled mustard greens', 'A similar pickle'),
  'Soybean Paste': swap('Miso', 'A similar paste'),
  'Herbal Tea (Chamomile / Peppermint / Rooibos / Mate)': swap('Peppermint', 'The one herb of the four that is listed'),
  'Tofu, fried (prepared with calcium sulphate)': swap('Tofu', 'Fry it'),
  'Nuts, coconut meat, desiccated, toasted': swap('Dried coconut', 'Toast it'),
  'Plaice fillet floured': swap('Plaice', 'Flour it'),
  'Swordfish poached (without sauce)': swap('Swordfish', 'Poach it'),
  'Spices, pepper, black and white pepper mix, ground': swap('Black pepper', 'One pepper for the mix'),
  // Made in a kitchen from listed foods. The recipe named is one the app already has.
  'Pain, baguette ou boule, de campagne': home(BREAD, 'Baguette'),
  'Pain, baguette, courante': home(BREAD, 'Baguette'),
  'Pain de mie, courant': home(BREAD),
  'Pain de campagne maison (avec farine pour machine à pain)': home(BREAD),
  'Bröd fullkorn vete råg fibrer ca 6%': home(BREAD, 'Simple Whole Wheat Bread'),
  'Rye Bread': home(BREAD),
  'Rundstykke, fint, med vann, hjemmebakt': home(BREAD),
  'Tortilla, wraps/burrito, hvetemel': home('Flour, fat, water and salt', 'Homemade Wheat Tortillas'),
  'Dressing, mayonnaise, whole egg type': home('Egg, oil, vinegar or lemon', 'Mayonnaise'),
  'Mustard medium hot': home(MUSTARD),
  'Mustard hot': home(MUSTARD),
  'Mustard, prepared, yellow': home(MUSTARD),
  'Tomato ketchup': home('Tomato paste, vinegar, sugar and spices'),
  'Curry powder': home('A mix of listed spices'),
  'Spices, curry powder': home('A mix of listed spices'),
  'Herbes de Provence, séchées': home('A mix of listed dried herbs'),
  'Soybeans, soy milk, regular': home('Soybeans and water'),
  'Almond drink unsweetened': home('Almonds and water'),
  'Meat substitute containing gluten (seitan)': home('Wheat gluten and water'),
  'Hot seasoning, Chinese chili oil': home('Chili and oil', 'Hong You (Sichuan Chili Oil)'),
  'Chilli sauce (Sambal Oelek)': home('Chili, salt and vinegar'),
  'Hoisinsaus, hjemmelaget': home('Miso or soy sauce, sugar, garlic and spices'),
  'Beetroot pickled, drained': home('Beets, vinegar and salt'),
  'Peppers, hot pickled': home('Hot peppers, vinegar and salt'),
  Savoiardikex: home('Egg, sugar and flour'),
  // Listed by the owner's third round, 2026-11-06.
  'Sugar (Cane / Granulated)': listed('White sugar'),
  'Brown Sugar (Commercial)': listed('Brown sugar'),
  'Seasoning sauce, oyster sauce': listed('Oyster sauce'),
  'Seasoning sauce, Tian Mian Jiang (sweet soybean paste)': listed('Sweet bean sauce'),
  'Baking powder': listed('Baking powder'),
  'Baking powder, dry powder': listed('Baking powder'),
  Gelatine: listed('Gelatin'),
  Capers: listed('Capers'),
  'Capers (In Vinegar / Raw)': listed('Capers'),
  'Dark chocolate': listed('Dark chocolate'),
  'Chocolate, dark, 45- 59% cacao solids': listed('Semisweet chocolate'),
  'Chocolate, dark, 60-69% cacao solids': listed('Dark chocolate'),
  Hominy: listed('Hominy'),
  'Millet, puffed': listed('Puffed millet'),
  'Chicken Feet': listed('Chicken feet'),
  'Mushroom, straw, canned, drained solids': listed('Canned straw mushrooms'),
  // Listed by the owner's fourth round, 2026-11-06.
  Majsolja: listed('Corn oil'),
  Maisolje: listed('Corn oil'),
  Solrosolja: listed('Sunflower oil'),
  Solsikkeolje: listed('Sunflower oil'),
  'White Wine': listed('White wine'),
  'Red Wine': listed('Red wine'),
  'Rum 37.5/40 % vol': listed('Rum'),
  'Rum 80 % vol': swap('Rum', 'Ordinary rum in place of overproof rum, so use a little more'),
  'Pale beer': listed('Beer'),
  'Dark beer': listed('Dark beer'),
  'Pilsner beer': listed('Beer'),
  Cider: listed('Hard cider'),
  Liqueur: listed('Liqueur'),
  'Starkvin vol. % 18 typ Madeira': listed('Madeira'),
  'Alcoholic beverage, beer, regular, all': listed('Beer'),
  'Alcoholic beverage, spirit, ~40% v/v, all (Brandy, Gin, Rum, Vodka and Whisky)': listed('Brandy'),
  'Konjak el. brandy vol. % 40': listed('Brandy'),
  'Dessert Wine': listed('Dessert wine'),
  'Sterkvin, søt, portvin, 20 vol-% alkohol': listed('Port'),
};

const OUTSIDE = require('./curate-recipe-outside')({ listed, swap, home, named, missing, aid, SEED_OIL, G: { ALCOHOL, PANTRY, SAUCES, NOSOURCE, FERMENT, CURED } });
const outsideRows = q(LIVE, 'select recipe_id, lower(trim(name)) name from curated_recipe_unlisted_ingredients');
const ings = q(LIVE, 'select recipe_id, base_name from curated_recipe_ingredients');
const recipes = q(LIVE, 'select id, name, builder_type from curated_recipes');
const rows = q(UNI, "select c.status, c.listing_name, r.name_english en, r.name_original o from food_curation c join raw_foods r using(raw_id) where c.status<>'hide'");
const shown = new Set(q(UNI, "select listing_name n from food_curation where status='show'").map((r) => r.n));
const noListing = [...Object.entries(HAND), ...Object.entries(OUTSIDE)].filter(([, h]) => h.to && !shown.has(h.to)).map(([n, h]) => `${h.to} for ${n}`);
if (noListing.length) throw new Error('no listing: ' + noListing.join('; '));
const outsideNames = new Set(outsideRows.map((r) => r.name));
const notPlaced = [...outsideNames].filter((n) => !OUTSIDE[n]);
const notUsed = Object.keys(OUTSIDE).filter((n) => !outsideNames.has(n));
if (notPlaced.length || notUsed.length) throw new Error(`outside names not placed (${notPlaced.length}): ${notPlaced.join(' | ')}
placed but no recipe uses (${notUsed.length}): ${notUsed.join(' | ')}`);
// A name in the second table keeps a mark, so the two tables stay apart even where the words agree.
const MARK = ' ';
for (const r of outsideRows) ings.push({ recipe_id: r.recipe_id, base_name: MARK + r.name });

const toks = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean)
  .map((x) => x.replace(/ies$/, 'y').replace(/(es|s)$/, ''));
const key = (s) => toks(s).sort().join(' ');
const exact = new Map();
for (const r of rows) exact.set(key(r.listing_name), r.listing_name);
for (const r of rows) for (const f of [r.en, r.o, (r.en || '').split(',')[0], (r.o || '').split(',')[0]]) { const k = key(f); if (k && !exact.has(k)) exact.set(k, r.listing_name); }
const names = [...shown].map((n) => ({ n, t: toks(n) })).filter((x) => x.t.join('').length > 2).sort((a, b) => b.t.length - a.t.length || b.n.length - a.n.length);

const place = (name) => {
  if (name.startsWith(MARK)) return { ...OUTSIDE[name.slice(1)], by: 'hand', outside: true };
  if (HAND[name]) return { ...HAND[name], by: 'hand' };
  const e = exact.get(key(name));
  if (e) return { kind: 'listed', to: e, by: 'name' };
  const it = new Set(toks(name));
  const hit = names.find((x) => x.t.every((t) => it.has(t)));
  if (hit) return { kind: 'listed', to: hit.n, by: 'words' };
  return { kind: 'unplaced' };
};

const placed = new Map();
for (const n of new Set(ings.map((i) => i.base_name))) placed.set(n, place(n));
const unplaced = [...placed].filter(([, p]) => p.kind === 'unplaced').map(([n]) => n);
if (unplaced.length) throw new Error('unplaced: ' + unplaced.join('; '));
for (const n of Object.keys(HAND)) if (!placed.has(n)) console.log('hand entry no recipe uses:', n);

const byRecipe = new Map(recipes.map((r) => [r.id, new Set()]));
for (const i of ings) byRecipe.get(i.recipe_id).add(i.base_name);
const usage = new Map();
for (const i of ings) { const u = usage.get(i.base_name) || { rows: 0, recipes: new Set() }; u.rows += 1; u.recipes.add(i.recipe_id); usage.set(i.base_name, u); }

const RANK = { listed: 0, swap: 1, home: 2, named: 3, missing: 4 };
const rankOf = (p) => (p.kind === 'aid' ? 0 : RANK[p.kind]);
const standing = { listed: 0, swap: 0, home: 0, named: 0, missing: 0 };
const missingFor = new Map();
for (const r of recipes) {
  const ps = [...byRecipe.get(r.id)].map((n) => [n, placed.get(n)]);
  const worst = Math.max(...ps.map(([, p]) => rankOf(p)), 0);
  standing[Object.keys(RANK)[worst]] += 1;
  missingFor.set(r.id, new Set(ps.filter(([, p]) => p.kind === 'missing').map(([, p]) => p.group)));
}
const groups = [...new Set([...Object.values(HAND), ...Object.values(OUTSIDE)].filter((h) => h.kind === 'missing').map((h) => h.group))];
const groupRows = groups.map((g) => {
  const blocked = recipes.filter((r) => missingFor.get(r.id).has(g));
  return { group: g, recipes: blocked.length, alone: blocked.filter((r) => missingFor.get(r.id).size === 1).length };
}).sort((a, b) => b.recipes - a.recipes);

// What each answer buys, taken in the order of the table: recipes still waiting after each group is settled.
let left = new Set(recipes.filter((r) => missingFor.get(r.id).size).map((r) => r.id));
const settled = new Set();
for (const g of groupRows) {
  settled.add(g.group);
  left = new Set([...left].filter((id) => [...missingFor.get(id)].some((x) => !settled.has(x))));
  g.leftAfter = left.size;
}

// Each recipe still waiting, with what it waits on, and how every builder stands.
const waiting = recipes.filter((r) => missingFor.get(r.id).size).map((r) => ({
  name: r.name, builder: r.builder_type,
  items: [...byRecipe.get(r.id)].filter((n) => placed.get(n).kind === 'missing').map((n) => ({ name: n.replace(MARK, ''), group: placed.get(n).group, stand: placed.get(n).stand || null })),
})).sort((a, b) => a.items.length - b.items.length || a.name.localeCompare(b.name));
const builders = {};
for (const r of recipes) {
  const b = builders[r.builder_type] = builders[r.builder_type] || { builder: r.builder_type, recipes: 0, listed: 0, swap: 0, home: 0, named: 0, missing: 0 };
  b.recipes += 1;
  b[Object.keys(RANK)[Math.max(...[...byRecipe.get(r.id)].map((n) => rankOf(placed.get(n))), 0)]] += 1;
}
// Recipes held back only by items that already have a stand-in on the list.
const standIn = waiting.filter((w) => w.items.every((i) => i.stand)).length;
const onlyOne = waiting.filter((w) => w.items.length === 1).length;
const list = (kind) => [...placed].filter(([, p]) => p.kind === kind).map(([n, p]) => ({ name: n.replace(MARK, ''), ...p, rows: usage.get(n).rows, recipes: usage.get(n).recipes.size })).sort((a, b) => b.recipes - a.recipes);
const out = {
  waiting, builders: Object.values(builders).sort((a, b) => b.recipes - a.recipes), standIn, onlyOne, recipes: recipes.length, names: placed.size, rows: ings.length, standing, groups: groupRows,
  counts: Object.fromEntries([...Object.keys(RANK), 'aid'].map((k) => [k, list(k).length])),
  byName: list('listed').filter((x) => x.by === 'name').length, byWords: list('listed').filter((x) => x.by === 'words').length, byHand: list('listed').filter((x) => x.by === 'hand').length,
  renamed: list('listed').filter((x) => x.by === 'hand'), matchedOnWords: list('listed').filter((x) => x.by === 'words'), swap: list('swap'), home: list('home'), named: list('named'), missing: list('missing'), aid: list('aid'),
  // Every name and where it landed, for merge-candidate.js. A name starting with MARK comes from the unlisted table.
  placements: [...placed].map(([n, p]) => ({ name: n.replace(MARK, ''), outside: n.startsWith(MARK), ...p })),
  mainNames: [...placed.keys()].filter((n) => !n.startsWith(MARK)).length, outsideNames: outsideNames.size, outsideRows: outsideRows.length,
  namedRecipes: Object.fromEntries(['Baguette', 'Mayonnaise', 'Simple Whole Wheat Bread', 'Homemade Wheat Tortillas', 'Hong You (Sichuan Chili Oil)'].map((n) => { const r = recipes.find((x) => x.name === n); return [n, r ? [...missingFor.get(r.id)] : null]; })),
};
fs.writeFileSync(process.argv[2], JSON.stringify(out));
console.log(JSON.stringify({ recipes: out.recipes, names: out.names, rows: out.rows, standing, counts: out.counts, byName: out.byName, byWords: out.byWords, byHand: out.byHand }));
console.table(groupRows);
console.table(out.builders);
console.log('waiting recipes where every missing item has a stand-in:', standIn, '| waiting on one item only:', onlyOne);
console.log('missing:', out.missing.map((x) => `${x.name} ${x.recipes}`).join('; '));
console.log('named:', out.named.map((x) => `${x.name} ${x.recipes}`).join('; '));
console.log('home:', out.home.map((x) => `${x.name} ${x.recipes}`).join('; '));
console.log('swap:', out.swap.map((x) => `${x.name} ${x.recipes}`).join('; '));
console.log('named recipes blocked by:', JSON.stringify(out.namedRecipes));
