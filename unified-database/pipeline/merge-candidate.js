// Phase 5: builds a candidate reference database in the shape the app reads, from the live one plus the curated list.
//   node merge-candidate.js <recipe_check.json>
// Reads assets/data/foods_reference.db and unified_foods.sqlite, changes neither, and writes candidate/foods_reference_candidate.db.
// The recipe check comes from curate-recipe-check.js, run first.
//
// What the candidate is:
//   1. A copy of the live database, so every score, alias, rule, recipe and reference table comes across unchanged.
//   2. Every live food keeps its food_id, source and names. Each is paired with its row in the curated list by source and
//      the source's own food code (Sweden by its Swedish name, since the live rows carry no code), and takes the owner's
//      decision: hidden unless the list shows it. Four columns are added: unified_raw_id, curation_status, listing_name,
//      food_type and caution. The six Derived spirits have no source row and keep what they had.
//   3. Every curated row the live database never had is added as a food, with ids from 1,000,000 up. Its category is the
//      one most paired rows of the same food type carry. A shown one takes its listing name as its base name.
//   4. Nutrients: a live food keeps every value it had and gains any the source gives that it lacked. An added food
//      takes the source's values. Only the nutrient codes in the live nutrients table are carried. The unified database
//      labels every value g; the values are in the units the nutrients table states, which verify-candidate.js checks.
//   5. Recipes: every ingredient line whose name the recipe check placed on the list (listed, or swap) points at that
//      listing's base name and category, keeping what it said before in original_base_name and original_category.
//      Lines in the unlisted table placed on the list move into curated_recipe_ingredients, so they gain nutrition.
//      Lines made at home, kept by name, or not eaten (aid) stay where they are.
//   6. Aliases, unit weights and purchase forms that named a food now hidden point at the shown food with its listing
//      name, keeping what they said before in original_base_name (and original_category).
//   7. Short names: every shown food takes its listing name as its base and short name. Where several shared an old
//      name, recipe lines, aliases, weights, purchase forms and hidden rows move to one of them (data/short-names.json),
//      and base_name_renames records each old name and where it went.
//   node merge-candidate.js <recipe_check.json> [renames.txt] writes the shared names and their choices to renames.txt.
//   8. Categories (data/categories.json). 9. Purchase forms pointed by hand (data/purchase-forms.json).
//   10. Every shown food the workbook never scored is scored by score-unscored.js, which records where each score came
//       from in score_origin; the live scores are never changed, and verify-candidate.js checks both.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LIVE = path.resolve(__dirname, '..', '..', 'assets', 'data', 'foods_reference.db');
const UNI = path.resolve(__dirname, '..', 'unified_foods.sqlite');
const OUT_DIR = path.resolve(__dirname, '..', 'candidate');
const OUT = path.join(OUT_DIR, 'foods_reference_candidate.db');
const FIRST_NEW_ID = 1000000;

const q = (db, s) => JSON.parse(execFileSync('sqlite3', ['-readonly', '-json', db, s], { maxBuffer: 2e9 }).toString() || '[]');
const esc = (s) => (s === null || s === undefined ? 'NULL' : typeof s === 'number' ? String(s) : `'${String(s).replace(/'/g, "''")}'`);

const checkFile = process.argv[2];
if (!checkFile) throw new Error('usage: node merge-candidate.js <recipe_check.json>');
const { placements } = JSON.parse(fs.readFileSync(checkFile, 'utf8'));
if (!placements) throw new Error('the recipe check has no placements; rerun curate-recipe-check.js');

// The curated list.
const raw = q(UNI, `select r.raw_id, r.source_code src, r.source_food_id sid, r.name_original orig, r.name_english en,
  r.category_original cat, r.raw_json j, c.status, c.listing_name, c.food_type, c.caution
  from raw_foods r join food_curation c using(raw_id)`);
const codeOf = (r) => {
  if (r.src === 'Norway_Matvaretabellen') return r.sid;
  if (r.src === 'Sweden_Livsmedelsverket') return null;
  const c = JSON.parse(r.j).source_code;
  return c === null || c === undefined ? null : String(c);
};
const byCode = new Map();
const bySwedish = new Map();
for (const r of raw) {
  const c = codeOf(r);
  if (c !== null) {
    const k = `${r.src}|${c}`;
    if (byCode.has(k)) throw new Error(`two curated rows share ${k}`);
    byCode.set(k, r);
  }
  if (r.src === 'Sweden_Livsmedelsverket') {
    if (bySwedish.has(r.orig)) throw new Error(`two Swedish rows share the name ${r.orig}`);
    bySwedish.set(r.orig, r);
  }
}

// Pair the live foods.
const live = q(LIVE, `select food_id, source, source_code, name, base_name, category from foods`);
const pairOf = new Map();
const paired = new Set();
for (const f of live) {
  const r = f.source === 'Sweden_Livsmedelsverket' ? bySwedish.get(f.name) : byCode.get(`${f.source}|${f.source_code}`);
  if (!r) { if (f.source !== 'Derived') throw new Error(`live food ${f.source} ${f.food_id} ${f.name} has no curated row`); continue; }
  if (paired.has(r.raw_id)) throw new Error(`curated row ${r.raw_id} pairs with two live foods`);
  paired.add(r.raw_id);
  pairOf.set(`${f.food_id}|${f.source}`, r);
}

// Category for an added food: the one most paired rows of its food type carry.
const tally = new Map();
for (const f of live) {
  const r = pairOf.get(`${f.food_id}|${f.source}`);
  if (!r) continue;
  const t = tally.get(r.food_type) || new Map();
  t.set(f.category, (t.get(f.category) || 0) + 1);
  tally.set(r.food_type, t);
}
const categoryFor = (type) => {
  const t = tally.get(type);
  if (!t) return 'Mixed';
  return [...t].sort((a, b) => b[1] - a[1])[0][0];
};

// Nutrients: the codes the app knows, what each live food has, and the source's values.
const codes = new Set(q(LIVE, 'select code from nutrients').map((r) => r.code));
const liveHas = new Set(q(LIVE, `select food_id||'|'||source||'|'||nutrient_code k from food_nutrients`).map((r) => r.k));
const uniNut = q(UNI, 'select raw_id, nutrient_code c, amount_per_100g a from raw_food_nutrients where amount_per_100g is not null');

fs.mkdirSync(OUT_DIR, { recursive: true });
if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
fs.copyFileSync(LIVE, OUT);

const sql = ['PRAGMA foreign_keys=OFF;', 'BEGIN;'];
for (const col of ['unified_raw_id INTEGER', 'curation_status TEXT', 'listing_name TEXT', 'food_type TEXT', 'caution TEXT']) sql.push(`ALTER TABLE foods ADD COLUMN ${col};`);

const foodOfRaw = new Map();
let namesTranslated = 0;
for (const f of live) {
  const r = pairOf.get(`${f.food_id}|${f.source}`);
  if (!r) { sql.push(`UPDATE foods SET curation_status='derived' WHERE food_id=${f.food_id} AND source=${esc(f.source)};`); continue; }
  foodOfRaw.set(r.raw_id, { food_id: f.food_id, source: f.source, base_name: f.base_name, category: f.category });
  sql.push(`UPDATE foods SET unified_raw_id=${r.raw_id}, curation_status=${esc(r.status)}, listing_name=${esc(r.listing_name)}, food_type=${esc(r.food_type)}, caution=${esc(r.caution)}, hidden=${r.status === 'show' ? 0 : 1} WHERE food_id=${f.food_id} AND source=${esc(f.source)};`);
  // A live food still named in its table's language takes the unified English name; the original moves to name_local.
  // Records find a food by id or base_name, never by name, so nothing a person kept moves.
  if (r.en && f.name === r.orig && r.en !== r.orig) { sql.push(`UPDATE foods SET name=${esc(r.en)}, name_local=coalesce(name_local, ${esc(r.orig)}) WHERE food_id=${f.food_id} AND source=${esc(f.source)};`); namesTranslated += 1; }
}

let nextId = FIRST_NEW_ID;
let added = 0;
for (const r of raw) {
  if (paired.has(r.raw_id)) continue;
  const id = nextId++;
  const shown = r.status === 'show';
  const name = r.en || r.orig;
  const base = (shown || r.status === 'compare') && r.listing_name ? r.listing_name : name;
  const category = categoryFor(r.food_type);
  foodOfRaw.set(r.raw_id, { food_id: id, source: r.src, base_name: base, category });
  sql.push(`INSERT INTO foods (food_id, source, source_code, name, name_local, short_name, base_name, category, raw_category, hidden, unified_raw_id, curation_status, listing_name, food_type, caution) VALUES (${id}, ${esc(r.src)}, ${esc(codeOf(r))}, ${esc(name)}, ${esc(r.orig !== name ? r.orig : null)}, ${esc(base)}, ${esc(base)}, ${esc(category)}, ${esc(r.cat)}, ${shown ? 0 : 1}, ${r.raw_id}, ${esc(r.status)}, ${esc(r.listing_name)}, ${esc(r.food_type)}, ${esc(r.caution)});`);
  added += 1;
}

let gained = 0;
for (const n of uniNut) {
  if (!codes.has(n.c)) continue;
  const f = foodOfRaw.get(n.raw_id);
  if (!f) continue;
  if (liveHas.has(`${f.food_id}|${f.source}|${n.c}`)) continue;
  sql.push(`INSERT INTO food_nutrients VALUES (${f.food_id}, ${esc(f.source)}, ${esc(n.c)}, ${n.a});`);
  gained += 1;
}

// Recipes. A listing name points at the shown food that carries it.
const shownByListing = new Map();
for (const r of raw) if (r.status === 'show') shownByListing.set(r.listing_name, foodOfRaw.get(r.raw_id));
sql.push('ALTER TABLE curated_recipe_ingredients ADD COLUMN original_base_name TEXT;');
sql.push('ALTER TABLE curated_recipe_ingredients ADD COLUMN original_category TEXT;');
sql.push('ALTER TABLE curated_recipe_ingredients ADD COLUMN placement TEXT;');
sql.push('ALTER TABLE curated_recipe_ingredients ADD COLUMN placement_note TEXT;');
let pointed = 0;
let moved = 0;
// Each line is placed by its own row, chosen before any line is renamed: a line set to one food's old name must not be
// caught again by a later placement for that name. The listing it was placed on is kept in placed_listing, so the
// renaming in step 7 cannot send it on to another food that shared the old name ('Prune (dried plum)' was placed on
// Prunes, whose old name was Plum, and the default for Plum is fresh plums).
sql.push('CREATE TABLE placed_listing (rid INTEGER PRIMARY KEY, listing TEXT NOT NULL);');
const placedNames = [];
for (const p of placements) {
  const kind = p.kind;
  const target = kind === 'listed' || kind === 'swap' ? shownByListing.get(p.to) : null;
  if ((kind === 'listed' || kind === 'swap') && !target) throw new Error(`no shown food carries ${p.to}`);
  if (!p.outside) placedNames.push({ p, target, kind });
}
sql.push('CREATE TEMP TABLE line_name AS SELECT rowid rid, base_name name FROM curated_recipe_ingredients;');
for (const { p, target, kind } of placedNames) {
  const note = p.note || p.how || p.stand || null;
  const rows = `rowid IN (SELECT rid FROM line_name WHERE name=${esc(p.name)})`;
  if (target) {
    // A placement found by the bare name ('Orange') leaves a line in another group that has a food of that name (an
    // orange juice line in Bev) to follow its own food.
    const own = p.by === 'name'
      ? ` AND NOT (category<>${esc(target.category)} AND EXISTS (SELECT 1 FROM foods f WHERE f.category=curated_recipe_ingredients.category AND f.base_name=curated_recipe_ingredients.base_name AND f.hidden=0))`
      : '';
    sql.push(`INSERT OR IGNORE INTO placed_listing SELECT rowid, ${esc(p.to)} FROM curated_recipe_ingredients WHERE ${rows}${own};`);
    sql.push(`UPDATE curated_recipe_ingredients SET original_base_name=base_name, original_category=category, base_name=${esc(target.base_name)}, category=${esc(target.category)}, placement=${esc(kind)}, placement_note=${esc(note)} WHERE ${rows}${own};`);
    if (own) sql.push(`UPDATE curated_recipe_ingredients SET placement=${esc(kind)}, placement_note=${esc(note)} WHERE ${rows} AND placement IS NULL;`);
    pointed += 1;
  } else {
    sql.push(`UPDATE curated_recipe_ingredients SET placement=${esc(kind)}, placement_note=${esc(note)} WHERE ${rows};`);
  }
}
for (const p of placements) {
  if (!p.outside) continue;
  const kind = p.kind;
  const target = kind === 'listed' || kind === 'swap' ? shownByListing.get(p.to) : null;
  if (!target) continue;
  const note = p.note || p.how || p.stand || null;
  // The recipe check reads unlisted names lower case and trimmed.
  const match = `lower(trim(name))=${esc(p.name)}`;
  sql.push(`INSERT INTO curated_recipe_ingredients (recipe_id, category, base_name, quantity, unit, cut_prep, cooking_method, prep_note, sort_order, from_component, original_base_name, original_category, placement, placement_note)
    SELECT recipe_id, ${esc(target.category)}, ${esc(target.base_name)}, quantity, unit, cut_prep, NULL, prep_note, sort_order, from_component, name, NULL, ${esc(kind)}, ${esc(note)} FROM curated_recipe_unlisted_ingredients WHERE ${match};`);
  sql.push(`INSERT OR IGNORE INTO placed_listing SELECT rowid, ${esc(p.to)} FROM curated_recipe_ingredients WHERE original_category IS NULL AND original_base_name IN (SELECT name FROM curated_recipe_unlisted_ingredients WHERE ${match}) AND rowid NOT IN (SELECT rid FROM line_name);`);
  sql.push(`DELETE FROM curated_recipe_unlisted_ingredients WHERE ${match};`);
  moved += 1;
}

// Aliases, unit weights and purchase forms name a food by base name. One that names a food the list now hides, where no
// shown food has that name, points at the shown food carrying the hidden one's listing name, when exactly one does.
// A repoint that would duplicate a row already there is skipped and the row keeps its old target.
sql.push(`CREATE TEMP TABLE repoint AS SELECT h.base_name hb, h.category hc, min(s.base_name) sb, min(s.category) sc
  FROM foods h JOIN foods s ON s.hidden=0 AND s.listing_name=h.listing_name
  WHERE h.hidden=1 AND h.listing_name IS NOT NULL
  GROUP BY h.base_name, h.category HAVING count(DISTINCT s.base_name||'|'||s.category)=1;`);
sql.push(`CREATE TEMP TABLE repoint_name AS SELECT hb, min(sb) sb FROM repoint GROUP BY hb HAVING count(DISTINCT sb)=1;`);
const unshown = (b, c) => `NOT EXISTS (SELECT 1 FROM foods f WHERE f.hidden=0 AND f.base_name=${b} COLLATE NOCASE${c ? ` AND f.category=${c}` : ''})`;
for (const [t, cat] of [['food_aliases', 'food_category'], ['food_purchase_forms', 'category']]) {
  sql.push(`ALTER TABLE ${t} ADD COLUMN original_base_name TEXT;`, `ALTER TABLE ${t} ADD COLUMN original_category TEXT;`);
  sql.push(`UPDATE OR IGNORE ${t} SET original_base_name=base_name, original_category=${cat},
    base_name=(SELECT sb FROM repoint r WHERE r.hb=${t}.base_name COLLATE NOCASE AND r.hc=${t}.${cat}),
    ${cat}=(SELECT sc FROM repoint r WHERE r.hb=${t}.base_name COLLATE NOCASE AND r.hc=${t}.${cat})
    WHERE ${unshown(`${t}.base_name`, `${t}.${cat}`)} AND EXISTS (SELECT 1 FROM repoint r WHERE r.hb=${t}.base_name COLLATE NOCASE AND r.hc=${t}.${cat});`);
}
sql.push(`ALTER TABLE food_unit_weights ADD COLUMN original_base_name TEXT;`);
sql.push(`UPDATE food_unit_weights SET original_base_name=base_name, base_name=(SELECT sb FROM repoint_name r WHERE r.hb=food_unit_weights.base_name COLLATE NOCASE)
  WHERE ${unshown('food_unit_weights.base_name')} AND EXISTS (SELECT 1 FROM repoint_name r WHERE r.hb=food_unit_weights.base_name COLLATE NOCASE);`);

sql.push('COMMIT;');
execFileSync('sqlite3', [OUT], { input: sql.join('\n'), maxBuffer: 2e9 });

// 7. Short names. Every shown food is named by its listing name, so the app names it the way the list does and each
// listing is a food of its own. A shown food keeps what it was called in original_base_name and original_short_name.
// Where several shown foods shared one old name, everything else that named it moves to one of them (see
// data/short-names.json), and base_name_renames records each move so the records on a phone can follow.
const SN = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'short-names.json'), 'utf8'));
const FORM = /^(frozen|dried|pickled|smoked|salt|salted|parboiled|partially|fermented|canned|deep-frozen|hot-smoked|cold-smoked|skinless|fat-free|nonfat|low-fat|reduced-fat|grass-fed|whole)\b/i;
const groups = new Map();
for (const r of q(OUT, `select base_name b, category c, listing_name l from foods where hidden=0 and listing_name is not null`)) {
  const k = `${r.b}|${r.c}`;
  if (!groups.has(k)) groups.set(k, { old: r.b, category: r.c, names: new Set() });
  groups.get(k).names.add(r.l);
}
// A food the list now names exactly as the old name (case aside) keeps it: "Tomato" stays fresh tomato even where the only
// shown row that was called Tomato is sun-dried, since the fresh one is now the food named Tomato.
const listingAt = new Map();
for (const r of q(OUT, 'select distinct listing_name l, category c from foods where hidden=0 and listing_name is not null')) listingAt.set(r.l.toLowerCase() + '|' + r.c, r.l);
// Where the only shown row under an old name is preserved (Germany's dried sweet cherry) and the raw one is kept to
// compare under a plain listing shown elsewhere (Cherries), the old name meant the fresh food, so it goes there, to the
// category that food is shown in (Germany files chanterelles under Mushroom, the list shows them under Veg).
const PRESERVED = /^(frozen|dried|sun-dried|air-dried|freeze-dried|dry|pickled|smoked|hot-smoked|cold-smoked|salted|canned)\b/i;
const kept = new Map();
for (const r of q(OUT, `select base_name b, category c, listing_name l from foods where hidden=1 and curation_status='compare' and listing_name is not null`)) {
  const k = `${r.b}|${r.c}`;
  if (!kept.has(k)) kept.set(k, new Set());
  kept.get(k).add(r.l);
}
const shownCats = new Map();
for (const r of q(OUT, 'select distinct listing_name l, category c from foods where hidden=0 and listing_name is not null')) {
  if (!shownCats.has(r.l)) shownCats.set(r.l, new Set());
  shownCats.get(r.l).add(r.c);
}
const renames = [];
const usedDefaults = new Set();
for (const [k, g] of groups) {
  const names = [...g.names];
  let to;
  let how;
  const named = listingAt.get(g.old.toLowerCase() + '|' + g.category);
  const fresh = names.length === 1 && PRESERVED.test(names[0])
    ? [...(kept.get(k) || [])].filter((n) => !PRESERVED.test(n) && shownCats.has(n) && (shownCats.get(n).has(g.category) || shownCats.get(n).size === 1)) : [];
  let toCat = g.category;
  if (SN.defaults[k]) {
    to = SN.defaults[k]; how = 'chosen'; usedDefaults.add(k);
    if (!g.names.has(to)) { // a default may name a food the old one was merged into, in its own group
      const cats = shownCats.get(to);
      if (!cats) throw new Error(`short-names.json: ${to} is not a shown food`);
      if (!cats.has(g.category)) { if (cats.size !== 1) throw new Error(`short-names.json: ${to} is shown in several groups`); [toCat] = cats; }
    }
  } else if (named) { to = named; how = g.names.has(named) ? 'same name' : 'now named so'; } else if (fresh.length === 1) { [to] = fresh; how = 'the fresh one'; if (!shownCats.get(to).has(g.category)) [toCat] = shownCats.get(to); } else if (names.length === 1) { [to] = names; how = 'only'; } else {
    const same = names.filter((n) => n.toLowerCase() === g.old.toLowerCase());
    const plain = names.filter((n) => !FORM.test(n));
    if (same.length === 1) { [to] = same; how = 'same name'; } else if (plain.length === 1) { [to] = plain; how = 'only plain form'; } else throw new Error(`short-names.json needs a default for ${k}: ${names.join(' / ')}`);
  }
  if (to !== g.old || toCat !== g.category) renames.push({ ...g, to, toCat, how, names });
}
for (const k of Object.keys(SN.defaults)) if (!usedDefaults.has(k)) throw new Error(`short-names.json: ${k} is not a shared shown name`);
const renameOf = new Map(renames.map((r) => [`${r.old}|${r.category}`, r]));
const shownAt = new Set(q(OUT, `select listing_name||'|'||category k from foods where hidden=0 and listing_name is not null`).map((r) => r.k));
for (const l of [...SN.lines, ...SN.unitWeights]) {
  const cat = l.from.includes('|') ? l.from.split('|')[1] : groups.get([...groups.keys()].find((k) => k.startsWith(`${l.from}|`)))?.category;
  // A unit weight is matched by name alone, so its food may sit in any group.
  const found = cat ? shownAt.has(`${l.to}|${cat}`) : [...shownAt].some((k) => k.startsWith(`${l.to}|`));
  if (!found) throw new Error(`short-names.json: no shown food ${l.to} in ${cat}`);
}

const s7 = ['PRAGMA foreign_keys=OFF;', 'BEGIN;'];
s7.push(`CREATE TABLE base_name_renames (old_base_name TEXT NOT NULL, category TEXT NOT NULL, new_base_name TEXT NOT NULL, new_category TEXT NOT NULL, how TEXT NOT NULL, PRIMARY KEY (old_base_name, category));`);
for (const r of renames) s7.push(`INSERT INTO base_name_renames VALUES (${esc(r.old)}, ${esc(r.category)}, ${esc(r.to)}, ${esc(r.toCat)}, ${esc(r.how)});`);
const ren = (b, c) => `(SELECT new_base_name FROM base_name_renames n WHERE n.old_base_name=${b} AND n.category=${c})`;
const renCat = (b, c) => `(SELECT new_category FROM base_name_renames n WHERE n.old_base_name=${b} AND n.category=${c})`;
const hasRen = (b, c) => `EXISTS (SELECT 1 FROM base_name_renames n WHERE n.old_base_name=${b} AND n.category=${c})`;
s7.push('ALTER TABLE foods ADD COLUMN original_base_name TEXT;', 'ALTER TABLE foods ADD COLUMN original_short_name TEXT;', 'ALTER TABLE foods ADD COLUMN original_category TEXT;');
// A hidden row under a renamed name follows the default, so a record pointing at it lands on the same food.
s7.push(`UPDATE foods SET original_base_name=base_name, original_short_name=short_name, original_category=category,
  base_name=${ren('foods.base_name', 'foods.category')}, category=${renCat('foods.base_name', 'foods.category')}
  WHERE hidden=1 AND ${hasRen('foods.base_name', 'foods.category')};`);
s7.push(`UPDATE foods SET original_base_name=base_name, original_short_name=short_name, base_name=listing_name, short_name=listing_name
  WHERE hidden=0 AND listing_name IS NOT NULL AND (base_name IS NOT listing_name OR short_name IS NOT listing_name);`);

// Recipe lines: the line's own words first, then the default.
const rules = SN.lines.map((l) => ({ ...l, re: new RegExp(l.match, 'i'), fields: (l.fields || 'cut,note,recipe').split(',') }));
let linesRenamed = 0;
let linesByWords = 0;
// Where the recipe lines naming each food went, so a unit weight can follow them.
const lineWentTo = new Map();
for (const line of q(OUT, `select r.rowid id, r.base_name b, r.original_base_name ob, r.category c, r.cut_prep cut, r.prep_note note, c.name recipe, p.listing placed
  from curated_recipe_ingredients r join curated_recipes c on c.id=r.recipe_id left join placed_listing p on p.rid=r.rowid`)) {
  const k = `${line.b}|${line.c}`;
  // The line's own words first, then the food it was placed on, then the default.
  const rule = rules.find((l) => l.from === k && l.fields.some((f) => l.re.test(line[f] || '')));
  const to = rule ? rule.to : line.placed ?? renameOf.get(k)?.to;
  const toCat = rule || line.placed ? line.c : renameOf.get(k)?.toCat;
  const was = line.ob ?? line.b;
  if (!lineWentTo.has(was)) lineWentTo.set(was, new Set());
  lineWentTo.get(was).add(to || line.b);
  if (!to || (to === line.b && toCat === line.c)) continue;
  s7.push(`UPDATE curated_recipe_ingredients SET original_base_name=coalesce(original_base_name, base_name), original_category=coalesce(original_category, category), base_name=${esc(to)}, category=${esc(toCat)} WHERE rowid=${line.id};`);
  linesRenamed += 1;
  if (rule) linesByWords += 1;
}

// Aliases, purchase forms and volume weights carry a category; unit weights name a food without one, so they move
// only where the old name means one food in every category, or a rule names the unit.
s7.push('ALTER TABLE food_volume_weights ADD COLUMN original_base_name TEXT;', 'ALTER TABLE food_volume_weights ADD COLUMN original_category TEXT;');
for (const [t, cat] of [['food_aliases', 'food_category'], ['food_purchase_forms', 'category'], ['food_volume_weights', 'category']]) {
  s7.push(`UPDATE OR IGNORE ${t} SET original_base_name=coalesce(original_base_name, base_name), original_category=coalesce(original_category, ${cat}),
    base_name=${ren(`${t}.base_name`, `${t}.${cat}`)}, ${cat}=${renCat(`${t}.base_name`, `${t}.${cat}`)} WHERE ${hasRen(`${t}.base_name`, `${t}.${cat}`)};`);
}
const byName = new Map();
for (const r of renames) { if (!byName.has(r.old)) byName.set(r.old, new Set()); byName.get(r.old).add(r.to); }
let weightsRenamed = 0;
// A name a shown food still carries keeps its weight: Veg|Onion stays Onion when only Bev|Onion became Onion juice.
const stillShown = new Set(q(OUT, 'select distinct coalesce(listing_name, base_name) n from foods where hidden=0').map((r) => r.n));
for (const w of q(OUT, `select id, base_name b, original_base_name ob, unit_label u from food_unit_weights`)) {
  const rule = SN.unitWeights.find((l) => l.from === w.b && new RegExp(l.unit, 'i').test(w.u));
  const tos = stillShown.has(w.b) ? null : byName.get(w.b);
  // The recipe lines that named it come first: a weight per prune belongs where the prune lines went, even when the
  // listing repoint above had sent it to Plum. A weight on its own still-shown name stays.
  const was = w.ob ?? w.b;
  const went = !w.ob && stillShown.has(w.b) ? null : [...(lineWentTo.get(was) || [])].filter((n) => n !== was && stillShown.has(n));
  const to = rule ? rule.to : went && went.length === 1 ? went[0] : tos && tos.size === 1 ? [...tos][0] : null;
  if (!to || to === w.b) continue;
  s7.push(`UPDATE food_unit_weights SET original_base_name=coalesce(original_base_name, base_name), base_name=${esc(to)} WHERE id=${w.id};`);
  weightsRenamed += 1;
}

// 8. Categories. A shown food sits in the group a person would look for it in (data/categories.json). Every row that
// names it in its old group follows: hidden rows given its name, recipe lines, aliases, purchase forms, volume weights.
// A rename already pointing at it points at the new group, and records on a phone that name it in the old group get a
// rename of their own.
const CAT = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'categories.json'), 'utf8'));
let categoryMoves = 0;
for (const [l, spec] of Object.entries(CAT.moves)) {
  const [to, sub] = Array.isArray(spec) ? spec : [spec, null];
  const cats = shownCats.get(l);
  if (!cats) throw new Error(`categories.json: no shown food ${l}`);
  if (cats.size !== 1) throw new Error(`categories.json: ${l} is shown in ${[...cats].join(' and ')}`);
  const [from] = cats;
  if (from === to) throw new Error(`categories.json: ${l} is already in ${to}`);
  const L = esc(l);
  s7.push(`UPDATE foods SET original_category=coalesce(original_category, category), category=${esc(to)}, subcategory=${esc(sub)} WHERE base_name=${L} AND category=${esc(from)};`);
  s7.push(`UPDATE curated_recipe_ingredients SET original_base_name=coalesce(original_base_name, base_name), original_category=coalesce(original_category, category), category=${esc(to)} WHERE base_name=${L} AND category=${esc(from)};`);
  for (const [t, cat] of [['food_aliases', 'food_category'], ['food_purchase_forms', 'category'], ['food_volume_weights', 'category']]) {
    s7.push(`UPDATE OR IGNORE ${t} SET original_base_name=coalesce(original_base_name, base_name), original_category=coalesce(original_category, ${cat}), ${cat}=${esc(to)} WHERE base_name=${L} AND ${cat}=${esc(from)};`);
  }
  s7.push(`UPDATE base_name_renames SET new_category=${esc(to)} WHERE new_base_name=${L} AND new_category=${esc(from)};`);
  s7.push(`INSERT OR IGNORE INTO base_name_renames SELECT ${L}, ${esc(from)}, ${L}, ${esc(to)}, 'moved group' WHERE EXISTS (SELECT 1 FROM foods WHERE food_id < ${FIRST_NEW_ID} AND coalesce(original_base_name, base_name)=${L} AND original_category=${esc(from)});`);
  categoryMoves += 1;
}

s7.push('DROP TABLE placed_listing;');
s7.push(`CREATE TABLE candidate_build (key TEXT PRIMARY KEY, value TEXT);`);
const build = { built_at: new Date().toISOString(), live_foods: live.length, added_foods: added, nutrients_gained: gained, recipe_names_pointed: pointed, unlisted_names_moved: moved,
  names_renamed: renames.length, category_moves: categoryMoves, recipe_lines_renamed: linesRenamed, recipe_lines_by_their_words: linesByWords, unit_weights_renamed: weightsRenamed };
for (const [k, v] of Object.entries(build)) s7.push(`INSERT INTO candidate_build VALUES (${esc(k)}, ${esc(String(v))});`);
s7.push('COMMIT;', 'VACUUM;');
execFileSync('sqlite3', [OUT], { input: s7.join('\n'), maxBuffer: 2e9 });

// 9. Purchase forms still naming a hidden duplicate, pointed by hand at the shown food that took its place
// (data/purchase-forms.json). Where that food already has a form of its own, the old row was the same thing twice and
// is dropped, since a food has one purchase form.
const s9 = ['BEGIN;'];
const PF = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'purchase-forms.json'), 'utf8'));
const shownBaseAt = new Set(q(OUT, 'select base_name||\'|\'||category k from foods where hidden=0').map((r) => r.k));
const formAt = new Set(q(OUT, 'select category||\'|\'||base_name k from food_purchase_forms').map((r) => r.k));
let formsMoved = 0;
let formsDropped = 0;
for (const [from, [toCat, to]] of Object.entries(PF.moves)) {
  if (!formAt.has(from)) throw new Error(`purchase-forms.json: no purchase form ${from}`);
  if (!shownBaseAt.has(`${to}|${toCat}`)) throw new Error(`purchase-forms.json: no shown food ${to} in ${toCat}`);
  const [fc, ...rest] = from.split('|');
  const fb = rest.join('|');
  const where = `category=${esc(fc)} AND base_name=${esc(fb)}`;
  if (formAt.has(`${toCat}|${to}`)) { s9.push(`DELETE FROM food_purchase_forms WHERE ${where};`); formsDropped += 1; continue; }
  s9.push(`UPDATE food_purchase_forms SET original_base_name=coalesce(original_base_name, base_name), original_category=coalesce(original_category, category), base_name=${esc(to)}, category=${esc(toCat)} WHERE ${where};`);
  formAt.add(`${toCat}|${to}`);
  formsMoved += 1;
}

s9.push(`INSERT INTO candidate_build VALUES ('purchase_forms_moved', '${formsMoved}');`, `INSERT INTO candidate_build VALUES ('purchase_forms_dropped', '${formsDropped}');`, 'COMMIT;');
execFileSync('sqlite3', [OUT], { input: s9.join('\n'), maxBuffer: 2e9 });

// 9b. Volume weights still naming a hidden row. Each is copied to the shown food that row now lists under, and to every
// shown food the recipe lines that named it were placed on, where that food has no weight of its own, so a tablespoon of
// white sugar or fish sauce still turns into grams. A weight measured on a brewed drink is never given to the dry leaf,
// ground coffee or fruit it was made from. A row naming no food at all
// lost its move to a weight already there for the same food, so it goes.
const vwSql = ['BEGIN;'];
const shownKey = new Set(q(OUT, "select category||'|'||base_name k from foods where hidden=0").map((r) => r.k));
const anyKey = new Set(q(OUT, "select category||'|'||base_name k from foods").map((r) => r.k));
const vwAt = new Set(q(OUT, "select category||'|'||base_name k from food_volume_weights").map((r) => r.k));
const hiddenListingAt = new Map();
for (const r of q(OUT, "select category c, base_name b, listing_name l, original_category oc, original_base_name ob from foods where hidden=1 and listing_name is not null")) {
  for (const k of [`${r.c}|${r.b}`, r.ob ? `${r.oc || r.c}|${r.ob}` : null]) if (k) { if (!hiddenListingAt.has(k)) hiddenListingAt.set(k, new Set()); hiddenListingAt.get(k).add(r.l); }
}
const linesWentTo = new Map();
for (const r of q(OUT, "select distinct original_category oc, original_base_name ob, category c, base_name b from curated_recipe_ingredients where original_base_name is not null and original_category is not null")) {
  const k = `${r.oc}|${r.ob}`;
  if (!linesWentTo.has(k)) linesWentTo.set(k, new Set());
  linesWentTo.get(k).add(`${r.c}|${r.b}`);
}
const shownCatsOf = new Map();
for (const k of shownKey) { const [c, ...b] = k.split('|'); const n = b.join('|'); if (!shownCatsOf.has(n)) shownCatsOf.set(n, new Set()); shownCatsOf.get(n).add(c); }
let weightsCopied = 0;
let weightsDropped = 0;
for (const w of q(OUT, 'select category c, base_name b, original_category oc, original_base_name ob from food_volume_weights')) {
  const k = `${w.c}|${w.b}`;
  const targets = new Set();
  for (const l of shownKey.has(k) ? [] : hiddenListingAt.get(k) || []) {
    const cats = shownCatsOf.get(l);
    if (!cats) continue;
    targets.add(`${cats.has(w.c) ? w.c : cats.size === 1 ? [...cats][0] : ''}|${l}`);
  }
  if (!anyKey.has(k)) { vwSql.push(`DELETE FROM food_volume_weights WHERE category=${esc(w.c)} AND base_name=${esc(w.b)};`); weightsDropped += 1; continue; }
  for (const key of [k, w.ob ? `${w.oc || w.c}|${w.ob}` : null]) for (const t of linesWentTo.get(key) || []) if (shownKey.has(t)) targets.add(t);
  // A drink's weight per ml says nothing about the leaf, grounds or fruit it was brewed from.
  if (/brewed|tea|coffee/i.test(w.b)) continue;
  for (const t of targets) {
  const [tc, ...tb] = t.split('|');
  const to = tb.join('|');
  if (!tc || vwAt.has(t)) continue;
  vwSql.push(`INSERT INTO food_volume_weights (category, base_name, grams_per_ml, measure, fdc_id, ndb, fdc_description, stand_in, citation, original_base_name, original_category)
    SELECT ${esc(tc)}, ${esc(to)}, grams_per_ml, measure, fdc_id, ndb, fdc_description, stand_in, citation, coalesce(original_base_name, base_name), coalesce(original_category, category)
    FROM food_volume_weights WHERE category=${esc(w.c)} AND base_name=${esc(w.b)};`);
  vwAt.add(t);
  weightsCopied += 1;
  }
}
vwSql.push(`INSERT INTO candidate_build VALUES ('volume_weights_copied', '${weightsCopied}');`, `INSERT INTO candidate_build VALUES ('volume_weights_dropped', '${weightsDropped}');`, 'COMMIT;');
execFileSync('sqlite3', [OUT], { input: vwSql.join('\n'), maxBuffer: 2e9 });

// 9c. Weights for a piece of a food that recipe lines count in pieces and that had none, because those lines sat in the
// unlisted table until the recipe check placed them (tarragon sprigs, a cow foot). Each carries its citation.
const uwSql = ['BEGIN;'];
let unitWeightsAdded = 0;
for (const a of SN.addUnitWeights || []) {
  if (!q(OUT, `select 1 from foods where hidden=0 and base_name=${esc(a.base_name)} limit 1`).length) throw new Error(`short-names.json addUnitWeights: no shown food ${a.base_name}`);
  uwSql.push(`INSERT INTO food_unit_weights (base_name, unit_label, grams_per_unit, citation, notes) SELECT ${esc(a.base_name)}, ${esc(a.unit_label)}, ${a.grams_per_unit}, ${esc(a.citation)}, ${esc(a.notes || null)}
    WHERE NOT EXISTS (SELECT 1 FROM food_unit_weights WHERE base_name=${esc(a.base_name)} AND unit_label=${esc(a.unit_label)});`);
  unitWeightsAdded += 1;
}
let volumeWeightsAdded = 0;
for (const a of SN.addVolumeWeights || []) {
  if (!q(OUT, `select 1 from foods where hidden=0 and category=${esc(a.category)} and base_name=${esc(a.base_name)} limit 1`).length) {
    throw new Error(`short-names.json addVolumeWeights: no shown food ${a.category}|${a.base_name}`);
  }
  if (q(OUT, `select 1 from food_volume_weights where category=${esc(a.category)} and base_name=${esc(a.base_name)}`).length) continue;
  uwSql.push(`INSERT INTO food_volume_weights (category, base_name, grams_per_ml, measure, ndb, fdc_description, citation)
    VALUES (${esc(a.category)}, ${esc(a.base_name)}, ${a.grams_per_ml}, ${esc(a.measure)}, ${esc(a.ndb)}, ${esc(a.fdc_description)}, ${esc(a.citation)});`);
  volumeWeightsAdded += 1;
}
uwSql.push(`INSERT INTO candidate_build VALUES ('volume_weights_added', '${volumeWeightsAdded}');`);
uwSql.push(`INSERT INTO candidate_build VALUES ('unit_weights_added', '${unitWeightsAdded}');`, 'COMMIT;');
execFileSync('sqlite3', [OUT], { input: uwSql.join('\n'), maxBuffer: 2e9 });

// 9d. Equivalence groups (scripts/add_food_equivalence.js) for the foods the live file never had. The live groups stay as
// they were: rebuilding them from the new names would split rows a reviewer matched by hand. A new food the curation
// lists under a shown food joins that food's group, the same food in another table; any other new food takes its own
// key, category|name|preparation, the way add_food_equivalence.js makes one.
const ownKey = (a) => `${a}.category||'|'||lower(${a}.base_name)||'|'||lower(coalesce(${a}.prep_method,''))`;
const noGroup = `NOT EXISTS (SELECT 1 FROM food_equivalence x WHERE x.food_id=f.food_id AND x.source=f.source)`;
const before = q(OUT, 'select count(*) n from food_equivalence')[0].n;
execFileSync('sqlite3', [OUT], { input: [
  'BEGIN;',
  `INSERT INTO food_equivalence (food_id, source, group_key, matched) SELECT f.food_id, f.source, ${ownKey('f')}, 0 FROM foods f WHERE f.hidden=0 AND ${noGroup};`,
  `CREATE TEMP TABLE eq_new AS SELECT f.food_id, f.source, f.category cat, f.listing_name listing, ${ownKey('f')} own FROM foods f WHERE ${noGroup};`,
  `CREATE TEMP TABLE eq_target AS SELECT n.food_id, n.source, n.own, e.group_key gk, ROW_NUMBER() OVER (PARTITION BY n.food_id, n.source ORDER BY e.group_key IS NULL, s.category=n.cat DESC, s.source='USDA' DESC) rk FROM eq_new n LEFT JOIN foods s ON s.hidden=0 AND s.base_name=n.listing LEFT JOIN food_equivalence e ON e.food_id=s.food_id AND e.source=s.source;`,
  `INSERT INTO food_equivalence (food_id, source, group_key, matched) SELECT food_id, source, coalesce(gk, own), 0 FROM eq_target WHERE rk=1;`,
  `INSERT INTO candidate_build VALUES ('equivalence_rows_added', CAST((SELECT count(*) FROM food_equivalence) - ${before} AS TEXT));`,
  'COMMIT;',
].join('\n'), maxBuffer: 2e9 });
const equivalenceAdded = q(OUT, 'select count(*) n from food_equivalence')[0].n - before;

// 10. Scores for every shown food the workbook never scored (score-unscored.js).
const scoring = require('./score-unscored.js').scoreUnscored(OUT);
execFileSync('sqlite3', [OUT], { input: `INSERT INTO candidate_build VALUES ('foods_scored_here', '${scoring.foods}');
VACUUM;`, maxBuffer: 2e9 });

const how = {};
for (const r of renames) how[r.how] = (how[r.how] || 0) + 1;
console.log(JSON.stringify({ out: OUT, liveFoods: live.length, paired: paired.size, added, nutrientsGained: gained, recipeNamesPointed: pointed, unlistedNamesMoved: moved,
  namesRenamed: renames.length, renamedBy: how, categoryMoves, recipeLinesRenamed: linesRenamed, recipeLinesByTheirWords: linesByWords, unitWeightsRenamed: weightsRenamed,
  purchaseFormsMoved: formsMoved, purchaseFormsDropped: formsDropped, volumeWeightsCopied: weightsCopied, volumeWeightsDropped: weightsDropped, unitWeightsAdded, volumeWeightsAdded, equivalenceAdded, namesTranslated, scoring }));
if (process.argv[3]) fs.writeFileSync(process.argv[3], renames.filter((r) => r.names.length > 1).map((r) => `${r.old} (${r.category}) -> ${r.to} [${r.how}] of ${r.names.join(' / ')}`).join('\n'));
