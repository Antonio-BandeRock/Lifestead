// Phase 6: checks the candidate built by merge-candidate.js against the live database and the curated list.
//   node verify-candidate.js [summary.json]
// Reads all three databases and changes none. Exits 1 when any check fails; notes are things to know, not failures.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LIVE = path.resolve(__dirname, '..', '..', 'assets', 'data', 'foods_reference.db').replace(/\\/g, '/');
const UNI = path.resolve(__dirname, '..', 'unified_foods.sqlite').replace(/\\/g, '/');
const CAND = path.resolve(__dirname, '..', 'candidate', 'foods_reference_candidate.db');
if (!fs.existsSync(CAND)) throw new Error('no candidate; run merge-candidate.js first');

const q = (s) => JSON.parse(execFileSync('sqlite3', ['-readonly', '-json', CAND],
  { input: `ATTACH 'file:${LIVE}?mode=ro' AS L; ATTACH 'file:${UNI}?mode=ro' AS U;\n${s}`, maxBuffer: 2e9 }).toString() || '[]');
const one = (s) => { const r = q(s)[0]; return r ? Object.values(r)[0] : null; };

const results = [];
const check = (label, ok, detail) => { results.push({ label, ok: !!ok, detail }); console.log(`${ok ? 'pass' : 'FAIL'}  ${label}${detail !== undefined ? `  (${typeof detail === 'string' ? detail : JSON.stringify(detail)})` : ''}`); };
const notes = [];
const note = (label, detail) => { notes.push({ label, detail }); console.log(`note  ${label}${detail !== undefined ? `  ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); };

// A. The file itself.
check('integrity check', one('PRAGMA main.integrity_check') === 'ok');
check('every nutrient row belongs to a food', one('select count(*) from food_nutrients n left join foods f using(food_id, source) where f.food_id is null') === 0);
check('every score row belongs to a food', one('select count(*) from food_scores s left join foods f using(food_id, source) where f.food_id is null') === 0);

// B. Nothing the live database had is lost or changed.
const liveFoods = one('select count(*) from L.foods');
// A renamed food keeps what it was called in original_base_name and original_short_name, and a hidden one moved with its name keeps its category in original_category.
const wasShort = `case when f.original_base_name is not null then f.original_short_name else f.short_name end`;
check('every live food is still there, same id, source, code, names (as they were before the short names) and category', one(`select count(*) from L.foods l left join foods f using(food_id, source)
  where f.food_id is null or f.source_code is not l.source_code or f.name is not l.name or f.name_local is not l.name_local or ${wasShort} is not l.short_name
  or coalesce(f.original_base_name, f.base_name) is not l.base_name or f.prep_method is not l.prep_method or coalesce(f.original_category, f.category) is not l.category or f.subcategory is not l.subcategory`) === 0, `${liveFoods} live foods`);
check('every live nutrient value is still there, unchanged', one(`select count(*) from (select food_id, source, nutrient_code, amount_per_100g from L.food_nutrients
  except select food_id, source, nutrient_code, amount_per_100g from food_nutrients)`) === 0);
const REPOINTED = { food_aliases: 'food_category', food_purchase_forms: 'category', food_volume_weights: 'category', food_unit_weights: null };
const tables = q(`select name from L.sqlite_master where type='table' and name not in ('foods','food_nutrients','curated_recipe_ingredients','curated_recipe_unlisted_ingredients',${Object.keys(REPOINTED).map((t) => `'${t}'`).join(',')}) order by name`).map((r) => r.name);
// The three tables that name foods: the same rows, each either untouched or pointed somewhere new with its old target kept.
for (const [t, cat] of Object.entries(REPOINTED)) {
  const cols = q(`select name from pragma_table_info('${t}', 'L')`).map((r) => r.name);
  const was = cols.map((c) => (c === 'base_name' ? 'coalesce(original_base_name, base_name)' : c === cat ? `coalesce(original_category, ${cat})` : `"${c}"`)).join(', ');
  const plain = cols.map((c) => `"${c}"`).join(', ');
  const restored = one(`select count(*) from L."${t}"`) === one(`select count(*) from main."${t}"`)
    && one(`select count(*) from (select ${plain} from L."${t}" except select ${was} from main."${t}")`) === 0;
  const moved = one(`select count(*) from main."${t}" where original_base_name is not null`);
  const orphan = (db, f) => one(`select count(*) from ${db}."${t}" x where not exists (select 1 from ${f}.foods f where f.hidden=0 and f.base_name=x.base_name collate nocase${cat ? ` and f.category=x.${cat}` : ''})`);
  const liveOrphans = orphan('L', 'L');
  const candOrphans = orphan('main', 'main');
  check(`${t}: every row is still there, and undoing the repoint gives back the live table`, restored, `${moved} repointed`);
  const left = q(`select x.base_name b from main."${t}" x where not exists (select 1 from foods f where f.hidden=0 and f.base_name=x.base_name collate nocase${cat ? ` and f.category=x.${cat}` : ''})
    and exists (select 1 from L."${t}" y join L.foods f on f.hidden=0 and f.base_name=y.base_name collate nocase${cat ? ` and f.category=y.${cat}` : ''} where y.rowid=x.rowid)`);
  note(`${t}: rows naming no shown food`, `live ${liveOrphans}, candidate ${candOrphans}${left.length ? `; newly: ${left.slice(0, 8).map((l) => l.b).join('; ')}` : ''}`);
}
const changedTables = [];
for (const t of tables) {
  const cols = q(`select name from pragma_table_info('${t}', 'L')`).map((r) => `"${r.name}"`).join(', ');
  const same = one(`select count(*) from L."${t}"`) === one(`select count(*) from main."${t}"`)
    && one(`select count(*) from (select ${cols} from L."${t}" except select ${cols} from main."${t}")`) === 0
    && one(`select count(*) from (select ${cols} from main."${t}" except select ${cols} from L."${t}")`) === 0;
  if (!same) changedTables.push(t);
}
check(`the other ${tables.length} tables (scores, aliases, rules, conditions, recipes and the rest) are identical to the live ones`, changedTables.length === 0, changedTables.join(', ') || undefined);

// C. The owner's list is what the candidate shows.
const uniRows = one('select count(*) from U.food_curation');
check('every curated row is one food', one('select count(distinct unified_raw_id) from foods where unified_raw_id is not null') === uniRows
  && one('select count(*) from foods where unified_raw_id is not null') === uniRows, `${uniRows} curated rows`);
const shownList = one(`select count(*) from U.food_curation where status='show'`);
const shown = one('select count(*) from foods where hidden=0');
const derivedShown = one(`select count(*) from foods where hidden=0 and curation_status='derived'`);
check('the foods shown are exactly the ones the list shows', shown - derivedShown === shownList
  && one(`select count(*) from foods f join U.food_curation c on c.raw_id=f.unified_raw_id where (c.status='show') <> (f.hidden=0)`) === 0, `${shownList} shown${derivedShown ? `, plus ${derivedShown} Derived spirits kept as they were` : ''}`);
check('each food carries the decision, listing name, type and caution from the list', one(`select count(*) from foods f join U.food_curation c on c.raw_id=f.unified_raw_id
  where f.curation_status is not c.status or f.listing_name is not c.listing_name or f.food_type is not c.food_type or f.caution is not c.caution`) === 0);
check('every shown food has a base name and a category the app knows', one(`select count(*) from foods where hidden=0 and (coalesce(base_name,'')='' or category not in (select distinct category from L.foods))`) === 0);
check('every shown food is named by its listing name', one(`select count(*) from foods where hidden=0 and listing_name is not null and (base_name is not listing_name or short_name is not listing_name)`) === 0);
const renames = one('select count(*) from base_name_renames');
check('every renamed old name points at a shown food, and no old name is still a shown name there', one(`select count(*) from base_name_renames n where not exists (select 1 from foods f where f.hidden=0 and f.base_name=n.new_base_name and f.category=n.new_category)
  or exists (select 1 from foods f where f.hidden=0 and f.base_name=n.old_base_name collate binary and f.category=n.category and n.old_base_name<>n.new_base_name collate nocase)`) === 0, `${renames} old names`);
check('every hidden row under a renamed name follows it', one(`select count(*) from foods f join base_name_renames n on n.old_base_name=coalesce(f.original_base_name, f.base_name) and n.category=coalesce(f.original_category, f.category) where f.hidden=1 and (f.base_name is not n.new_base_name or f.category is not n.new_category)`) === 0);
const dupNames = q(`select base_name, category, count(*) n from foods where hidden=0 group by 1,2 having n>1 order by n desc`);
note('shown foods sharing a base name and category (the app reads them as one food, as it does today)', `${dupNames.length} names, e.g. ${dupNames.slice(0, 5).map((d) => `${d.base_name} (${d.n})`).join(', ')}`);
note('shown foods by origin', q(`select case when food_id>=1000000 then 'new to the app' else 'already in the app' end k, count(*) n from foods where hidden=0 group by 1`));

// D. Units and plausible values.
const ratios = q(`select f.nutrient_code code, count(*) n,
  sum(case when f.amount_per_100g between u.amount_per_100g*0.98 and u.amount_per_100g*1.02 then 1 else 0 end) same
  from food_nutrients f join foods x using(food_id, source) join U.raw_food_nutrients u on u.raw_id=x.unified_raw_id and u.nutrient_code=f.nutrient_code
  where f.food_id < 1000000 and u.amount_per_100g > 0 and f.amount_per_100g > 0 group by 1 order by 1`);
const offUnits = ratios.filter((r) => r.same / r.n < 0.9);
check('the source values are in the same units as the live ones (90% or more within 2%, per nutrient)', offUnits.length === 0,
  offUnits.length ? offUnits.map((r) => `${r.code} ${r.same}/${r.n}`).join(', ') : `${ratios.length} nutrients compared`);
note('live values the source states differently (more than 2% apart)', ratios.filter((r) => r.same < r.n).map((r) => `${r.code} ${r.n - r.same}`).join(', '));
const GRAMS = ['protein', 'fat_total', 'carbohydrate', 'fiber_total', 'sugars_total', 'water', 'fat_saturated', 'fat_monounsaturated', 'fat_polyunsaturated'];
const over = q(`select f.base_name, n.nutrient_code, n.amount_per_100g a from food_nutrients n join foods f using(food_id, source) where f.hidden=0 and (
  (n.nutrient_code in (${GRAMS.map((g) => `'${g}'`).join(',')}) and n.amount_per_100g > case when n.nutrient_code='carbohydrate' then 110 else 100.5 end)
  or (n.nutrient_code='energy_kcal' and n.amount_per_100g > 930) or (n.nutrient_code='sodium' and n.amount_per_100g > 40000) or n.amount_per_100g < 0)`);
// Japan's table counts carbohydrate as monosaccharide equivalents, so a pure sugar reads up to about 105 g, and its
// energy factors put an oil near 921 kcal. Those limits are 110 g and 930 kcal; anything past 100 g or 900 kcal is listed.
check('no shown food has an impossible value (over 100 g per 100 g, 110 g carbohydrate, 930 kcal, 40,000 mg sodium, or below zero)', over.length === 0, over.slice(0, 8).map((o) => `${o.base_name} ${o.nutrient_code} ${o.a}`).join('; ') || undefined);
const edge = q(`select f.base_name, f.source, n.nutrient_code, n.amount_per_100g a from food_nutrients n join foods f using(food_id, source) where f.hidden=0 and (
  (n.nutrient_code in (${GRAMS.map((g) => `'${g}'`).join(',')}) and n.amount_per_100g > 100.5) or (n.nutrient_code='energy_kcal' and n.amount_per_100g > 900))`);
note('shown foods past 100 g or 900 kcal, as their source states them', edge.map((o) => `${o.base_name} (${o.source}) ${o.nutrient_code} ${o.a}`).join('; ') || 'none');
const salt = one(`select max(n.amount_per_100g) from food_nutrients n join foods f using(food_id, source) where f.hidden=0 and n.nutrient_code='sodium' and f.food_type='salt_mineral'`);
check('table salt reads close to 38,758 mg sodium per 100 g', salt > 37000 && salt < 40000, salt);
const paste = one(`select max(n.amount_per_100g) from food_nutrients n join foods f using(food_id, source) where n.nutrient_code='lycopene' and f.name like 'Tomato products, canned, paste%'`);
check('tomato paste reads close to 28,764 micrograms lycopene per 100 g', paste > 25000 && paste < 32000, paste);
const gained = q(`select n.nutrient_code code, sum(f.food_id<1000000) on_live_foods, sum(f.food_id>=1000000) on_new_foods,
  sum(f.food_id<1000000 and n.amount_per_100g=0) zero_on_live from food_nutrients n join foods f using(food_id, source)
  where not exists (select 1 from L.food_nutrients l where l.food_id=n.food_id and l.source=n.source and l.nutrient_code=n.nutrient_code) group by 1 order by 2 desc`);
note('nutrient values gained from the sources, by nutrient (on live foods, of them zero, on new foods)', gained.map((g) => `${g.code} ${g.on_live_foods}/${g.zero_on_live}/${g.on_new_foods}`).join(', '));
const gainedShown = one(`select count(*) from food_nutrients n join foods f using(food_id, source) where f.hidden=0 and f.food_id<1000000
  and not exists (select 1 from L.food_nutrients l where l.food_id=n.food_id and l.source=n.source and l.nutrient_code=n.nutrient_code)`);
note('of those, values gained on shown foods that were already in the app', gainedShown);

// E. Recipes.
const liveLines = one('select count(*) from L.curated_recipe_ingredients') + one('select count(*) from L.curated_recipe_unlisted_ingredients');
const candLines = one('select count(*) from curated_recipe_ingredients') + one('select count(*) from curated_recipe_unlisted_ingredients');
check('every recipe ingredient line is still there', liveLines === candLines, `${candLines} lines`);
const lineKeys = (db) => `select * from (select recipe_id, sort_order, coalesce(from_component,'') c from ${db}.curated_recipe_ingredients union all select recipe_id, sort_order, coalesce(from_component,'') from ${db}.curated_recipe_unlisted_ingredients)`;
check('every recipe still has its lines in the same order', one(`select count(*) from (${lineKeys('L')} except ${lineKeys('main')})`) === 0
  && one(`select count(*) from (${lineKeys('main')} except ${lineKeys('L')})`) === 0);
const resolves = `exists (select 1 from foods f where f.hidden=0 and f.category=r.category and f.base_name=r.base_name collate nocase)`;
const badPlaced = q(`select base_name, category, count(*) n from curated_recipe_ingredients r where placement in ('listed','swap') and not ${resolves} group by 1,2`);
check('every line placed on the list finds a shown food', badPlaced.length === 0, badPlaced.slice(0, 8).map((b) => `${b.base_name} (${b.category})`).join('; ') || undefined);
const unplaced = one(`select count(*) from curated_recipe_ingredients where placement is null`);
check('every line in the ingredient table was placed by the recipe check', unplaced === 0, unplaced || undefined);
const standing = q(`select placement, count(*) lines, sum(${resolves}) resolve from curated_recipe_ingredients r group by 1`);
note('ingredient lines by placement (lines, of them finding a shown food)', standing.map((s) => `${s.placement} ${s.lines}/${s.resolve}`).join(', '));
const liveRes = one(`select count(*) from L.curated_recipe_ingredients r where exists (select 1 from L.foods f where f.hidden=0 and f.category=r.category and f.base_name=r.base_name collate nocase)`);
const candRes = one(`select count(*) from curated_recipe_ingredients r where ${resolves}`);
note('ingredient lines with nutrition behind them', `live ${liveRes}, candidate ${candRes}`);
const fullLive = one(`select count(*) from L.curated_recipes c where not exists (select 1 from L.curated_recipe_ingredients r where r.recipe_id=c.id and not exists (select 1 from L.foods f where f.hidden=0 and f.category=r.category and f.base_name=r.base_name collate nocase)) and not exists (select 1 from L.curated_recipe_unlisted_ingredients u where u.recipe_id=c.id)`);
const fullCand = one(`select count(*) from curated_recipes c where not exists (select 1 from curated_recipe_ingredients r where r.recipe_id=c.id and r.placement not in ('aid') and not ${resolves}) and not exists (select 1 from curated_recipe_unlisted_ingredients u where u.recipe_id=c.id)`);
note('recipes where every eaten ingredient has nutrition behind it', `live ${fullLive}, candidate ${fullCand}, of ${one('select count(*) from curated_recipes')}`);
const movedUnits = q(`select unit, count(*) n from curated_recipe_ingredients where original_category is null and placement in ('listed','swap') group by 1 order by 2 desc`);
note('units on the lines that moved from the unlisted table', movedUnits.map((m) => `${m.unit} ${m.n}`).join(', '));

// F. Reference tables that name foods.
const aliasLost = q(`select a.alias, a.base_name, a.food_category from food_aliases a where not exists (select 1 from foods f where f.hidden=0 and f.base_name=a.base_name collate nocase and f.category=a.food_category)`);
note('aliases that now point at a hidden food', `${aliasLost.length} of ${one('select count(*) from food_aliases')}: ${aliasLost.slice(0, 6).map((a) => `${a.alias} -> ${a.base_name}`).join('; ')}`);
const weightsLost = q(`select base_name from food_unit_weights w where not exists (select 1 from foods f where f.hidden=0 and f.base_name=w.base_name collate nocase)`);
note('unit weights for a food no longer shown', `${weightsLost.length} of ${one('select count(*) from food_unit_weights')}: ${weightsLost.slice(0, 6).map((w) => w.base_name).join('; ')}`);
const formsLost = q(`select base_name, category from food_purchase_forms p where not exists (select 1 from foods f where f.hidden=0 and f.base_name=p.base_name collate nocase and f.category=p.category)`);
note('purchase forms for a food no longer shown', `${formsLost.length} of ${one('select count(*) from food_purchase_forms')}: ${formsLost.slice(0, 6).map((w) => w.base_name).join('; ')}`);

// G. Scores.
const unscored = q(`select case when food_id>=1000000 then 'new' else 'live' end k, count(*) n from foods f where hidden=0 and not exists (select 1 from food_scores s where s.food_id=f.food_id and s.source=f.source) group by 1`);
note('shown foods with no scores', unscored.map((u) => `${u.n} ${u.k === 'new' ? 'new to the app' : 'already in the app'}`).join(', ') || 'none');
const unscoredRecipe = one(`select count(distinct r.base_name||'|'||r.category) from curated_recipe_ingredients r where ${resolves} and not exists (select 1 from foods f join food_scores s using(food_id, source) where f.hidden=0 and f.category=r.category and f.base_name=r.base_name collate nocase)`);
note('recipe ingredients whose shown food has no scores', unscoredRecipe);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} checks passed, ${notes.length} notes`);
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ at: new Date().toISOString(), results, notes }, null, 1));
process.exit(failed.length ? 1 : 0);
