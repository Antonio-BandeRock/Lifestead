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
// No score is made up: a food the live database never scored has none, and verify-candidate.js counts them.
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
for (const f of live) {
  const r = pairOf.get(`${f.food_id}|${f.source}`);
  if (!r) { sql.push(`UPDATE foods SET curation_status='derived' WHERE food_id=${f.food_id} AND source=${esc(f.source)};`); continue; }
  foodOfRaw.set(r.raw_id, { food_id: f.food_id, source: f.source, base_name: f.base_name, category: f.category });
  sql.push(`UPDATE foods SET unified_raw_id=${r.raw_id}, curation_status=${esc(r.status)}, listing_name=${esc(r.listing_name)}, food_type=${esc(r.food_type)}, caution=${esc(r.caution)}, hidden=${r.status === 'show' ? 0 : 1} WHERE food_id=${f.food_id} AND source=${esc(f.source)};`);
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
for (const p of placements) {
  const kind = p.kind;
  const target = kind === 'listed' || kind === 'swap' ? shownByListing.get(p.to) : null;
  if ((kind === 'listed' || kind === 'swap') && !target) throw new Error(`no shown food carries ${p.to}`);
  const note = p.note || p.how || p.stand || null;
  if (!p.outside) {
    if (target) {
      sql.push(`UPDATE curated_recipe_ingredients SET original_base_name=base_name, original_category=category, base_name=${esc(target.base_name)}, category=${esc(target.category)}, placement=${esc(kind)}, placement_note=${esc(note)} WHERE base_name=${esc(p.name)};`);
      pointed += 1;
    } else {
      sql.push(`UPDATE curated_recipe_ingredients SET placement=${esc(kind)}, placement_note=${esc(note)} WHERE base_name=${esc(p.name)};`);
    }
  } else if (target) {
    // The recipe check reads unlisted names lower case and trimmed.
    const match = `lower(trim(name))=${esc(p.name)}`;
    sql.push(`INSERT INTO curated_recipe_ingredients (recipe_id, category, base_name, quantity, unit, cut_prep, cooking_method, prep_note, sort_order, from_component, original_base_name, original_category, placement, placement_note)
      SELECT recipe_id, ${esc(target.category)}, ${esc(target.base_name)}, quantity, unit, cut_prep, NULL, prep_note, sort_order, from_component, name, NULL, ${esc(kind)}, ${esc(note)} FROM curated_recipe_unlisted_ingredients WHERE ${match};`);
    sql.push(`DELETE FROM curated_recipe_unlisted_ingredients WHERE ${match};`);
    moved += 1;
  }
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
    if (!g.names.has(to)) throw new Error(`short-names.json: ${to} is not a shown food named ${k}`);
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
  if (!shownAt.has(`${l.to}|${cat}`)) throw new Error(`short-names.json: no shown food ${l.to} in ${cat}`);
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
for (const line of q(OUT, `select r.rowid id, r.base_name b, r.category c, r.cut_prep cut, r.prep_note note, c.name recipe
  from curated_recipe_ingredients r join curated_recipes c on c.id=r.recipe_id`)) {
  const k = `${line.b}|${line.c}`;
  const rule = rules.find((l) => l.from === k && l.fields.some((f) => l.re.test(line[f] || '')));
  const to = rule ? rule.to : renameOf.get(k)?.to;
  const toCat = rule ? line.c : renameOf.get(k)?.toCat;
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
for (const w of q(OUT, `select id, base_name b, unit_label u from food_unit_weights`)) {
  const rule = SN.unitWeights.find((l) => l.from === w.b && new RegExp(l.unit, 'i').test(w.u));
  const tos = byName.get(w.b);
  const to = rule ? rule.to : tos && tos.size === 1 ? [...tos][0] : null;
  if (!to) continue;
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

s7.push(`CREATE TABLE candidate_build (key TEXT PRIMARY KEY, value TEXT);`);
const build = { built_at: new Date().toISOString(), live_foods: live.length, added_foods: added, nutrients_gained: gained, recipe_names_pointed: pointed, unlisted_names_moved: moved,
  names_renamed: renames.length, category_moves: categoryMoves, recipe_lines_renamed: linesRenamed, recipe_lines_by_their_words: linesByWords, unit_weights_renamed: weightsRenamed };
for (const [k, v] of Object.entries(build)) s7.push(`INSERT INTO candidate_build VALUES (${esc(k)}, ${esc(String(v))});`);
s7.push('COMMIT;', 'VACUUM;');
execFileSync('sqlite3', [OUT], { input: s7.join('\n'), maxBuffer: 2e9 });

const how = {};
for (const r of renames) how[r.how] = (how[r.how] || 0) + 1;
console.log(JSON.stringify({ out: OUT, liveFoods: live.length, paired: paired.size, added, nutrientsGained: gained, recipeNamesPointed: pointed, unlistedNamesMoved: moved,
  namesRenamed: renames.length, renamedBy: how, categoryMoves, recipeLinesRenamed: linesRenamed, recipeLinesByTheirWords: linesByWords, unitWeightsRenamed: weightsRenamed }));
if (process.argv[3]) fs.writeFileSync(process.argv[3], renames.filter((r) => r.names.length > 1).map((r) => `${r.old} (${r.category}) -> ${r.to} [${r.how}] of ${r.names.join(' / ')}`).join('\n'));
