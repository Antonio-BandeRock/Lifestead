// Brewed drinks, 2026-11-17. The first passes hid every brewed coffee and tea
// as a prepared meal or a cooked food, leaving only the dry leaf and the
// grounds on the list, so a cup of coffee could only be logged as 397 kcal of
// grounds. The owner's instruction for the swap: foods that belong on the list
// are on it. One brewed food is shown for each everyday drink, USDA first
// (the app's source order), and the German table only where USDA has none
// (peppermint, rooibos, mate). The same drink from the other tables stays
// hidden and points at the shown name, so a record naming it moves there.
// Run with --apply to write; with no flag it only prints what it would do.
const { execFileSync } = require('child_process');
const path = require('path');

const DB = path.join(__dirname, '..', 'unified_foods.sqlite');
const APPLY = process.argv.includes('--apply');
const q = (s) => JSON.parse(execFileSync('sqlite3', ['-json', DB, s], { maxBuffer: 2e9 }).toString() || '[]');
const esc = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const now = new Date().toISOString();

// listing name -> [shown raw_id, ...hidden raw_ids of the same drink]
const DRINKS = {
  'Brewed coffee': [9106, 9097, 23825, 30437, 37151, 605, 3662],
  'Decaf brewed coffee': [9105, 25570, 30450],
  Espresso: [9107, 21161, 25452, 38064, 30444, 766, 3663],
  'Decaf espresso': [11341, 26913],
  'Brewed black tea': [10443, 11371, 22074, 23856, 23886, 38081, 38029, 30480, 37150, 1989, 3666],
  'Decaf brewed black tea': [12087, 22072, 25572, 30488],
  'Brewed green tea': [9133, 22073, 38082, 30478, 37143, 37145, 37140, 1990],
  'Decaf brewed green tea': [9126],
  'Brewed oolong tea': [11336, 38083, 37148],
  'Chamomile tea': [11372, 23887],
  'Herbal tea': [10448, 23863, 30491],
  'Hibiscus tea': [9162, 26241],
  'Peppermint tea': [30498],
  'Rooibos tea': [30477],
  'Mate tea': [30479],
};

const ids = Object.values(DRINKS).flat();
const rows = new Map(q(`select c.raw_id, c.status, c.listing_name, c.food_type, coalesce(r.name_english, r.name_original) name from food_curation c join raw_foods r using(raw_id) where c.raw_id in (${ids.join(',')})`).map((r) => [r.raw_id, r]));
for (const id of ids) {
  const r = rows.get(id);
  if (!r) throw new Error(`no curation row ${id}`);
  if (r.food_type !== 'tea_coffee') throw new Error(`${id} ${r.name} is ${r.food_type}, not tea_coffee`);
  if (/(?<!without )milk|(?<!un)sugar|cream|alcohol|lemon|(?<!non-)instant/i.test(r.name)) throw new Error(`${id} ${r.name} is not a plain brewed drink`);
}
for (const listing of Object.keys(DRINKS)) {
  const taken = q(`select raw_id from food_curation where status='show' and listing_name=${esc(listing)} and raw_id<>${DRINKS[listing][0]}`);
  if (taken.length) throw new Error(`${listing} is already shown by ${taken.map((t) => t.raw_id).join(', ')}`);
}

const sql = ['BEGIN;'];
for (const [listing, [shown, ...same]] of Object.entries(DRINKS)) {
  sql.push(`UPDATE food_curation SET status='show', decided_by='owner', reason_code='meets_criteria', reason_text=${esc('A brewed drink people log every day; the dry leaf or grounds is a different food (2026-11-17).')}, listing_name=${esc(listing)}, equal_to_raw_id=NULL, curated_at=${esc(now)} WHERE raw_id=${shown};`);
  for (const id of same) {
    sql.push(`UPDATE food_curation SET status='hide', listing_name=${esc(listing)}, equal_to_raw_id=${shown}, reason_text=${esc(`The same drink as ${listing}, shown from USDA (2026-11-17).`)}, curated_at=${esc(now)} WHERE raw_id=${id};`);
  }
  console.log(`${listing}: ${rows.get(shown).name}${same.length ? ` (+${same.length} pointed here)` : ''}`);
}
sql.push('COMMIT;');

if (!APPLY) {
  console.log('dry run; pass --apply to write');
  process.exit(0);
}
execFileSync('sqlite3', [DB], { input: sql.join('\n'), maxBuffer: 2e9 });
console.log('counts:', JSON.stringify(q(`select status, count(*) n from food_curation group by 1`)));
