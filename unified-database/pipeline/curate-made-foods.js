// Made foods, stocks, protein powders and one merged fruit, 2026-11-18. The owner's answers to the questions left after
// the swap: the made foods the list hid (breads, tortillas, seitan, bouillon, curry powder, mayonnaise, prepared mustard,
// plant milks) go on it; a stock is its own food, so chicken bone stock no longer counts as chicken back; protein powders
// sit with the supplement powders; and Physalis, Groundcherry and Cape gooseberry are one fruit. One food is shown for
// each, USDA first (the app's source order), and the same food from the other tables stays hidden and points at the
// shown one, so a record naming it moves there. Brands stay hidden.
// Run with --apply to write; with no flag it only prints what it would do.
const { execFileSync } = require('child_process');
const path = require('path');

const DB = path.join(__dirname, '..', 'unified_foods.sqlite');
const APPLY = process.argv.includes('--apply');
const q = (s) => JSON.parse(execFileSync('sqlite3', ['-json', DB, s], { maxBuffer: 2e9 }).toString() || '[]');
const esc = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const now = new Date().toISOString();

// listing name -> [shown raw_id, ...hidden raw_ids of the same food]
const FOODS = {
  // Stocks
  'Chicken stock': [10100, 26845, 37188],
  'Beef stock': [10099, 26844],
  'Fish stock': [10101, 25437],
  'Chicken bouillon powder': [8778],
  'Beef bouillon powder': [8776],
  // Breads and tortillas
  'White bread': [4748],
  'Whole-wheat bread': [9906],
  'French bread': [9891],
  'Rye bread': [9900],
  'Pita bread': [10032, 24582],
  'Whole-wheat pita': [12132, 24583],
  'Corn tortillas': [12252],
  'Flour tortillas': [12253, 24842],
  'Whole-wheat tortillas': [11297, 26418],
  // Other made foods
  Seitan: [1797, 39188, 28393],
  'Curry powder': [8140, 22938],
  Mayonnaise: [8225, 26830],
  'Prepared mustard': [9450],
  'Soy milk': [9662],
  'Fortified soy milk': [12431],
  'Almond milk': [12048],
  'Oat drink': [28398, 21586],
  // Protein powders
  'Whey protein powder': [10396, 26391, 21834],
  'Whey protein isolate': [10393, 26389],
  'Soy protein powder': [10397, 26392],
  'Hemp protein powder': [22276],
  // One fruit under three names
  'Cape gooseberries': [10259, 22679, 2571],
};

const ids = Object.values(FOODS).flat();
const rows = new Map(q(`select c.raw_id, c.status, c.listing_name, coalesce(r.name_english, r.name_original) name from food_curation c join raw_foods r using(raw_id) where c.raw_id in (${ids.join(',')})`).map((r) => [r.raw_id, r]));
for (const id of ids) if (!rows.has(id)) throw new Error(`no curation row ${id}`);
if (new Set(ids).size !== ids.length) throw new Error('a raw id is named twice');
for (const listing of Object.keys(FOODS)) {
  const taken = q(`select raw_id from food_curation where status='show' and listing_name=${esc(listing)} and raw_id<>${FOODS[listing][0]}`);
  if (taken.length) throw new Error(`${listing} is already shown by ${taken.map((t) => t.raw_id).join(', ')}`);
}

const sql = ['BEGIN;'];
for (const [listing, [shown, ...same]] of Object.entries(FOODS)) {
  sql.push(`UPDATE food_curation SET status='show', decided_by='owner', reason_code='meets_criteria', reason_text=${esc('Put on the list by the owner, 2026-11-18.')}, listing_name=${esc(listing)}, equal_to_raw_id=NULL, curated_at=${esc(now)} WHERE raw_id=${shown};`);
  for (const id of same) {
    sql.push(`UPDATE food_curation SET status='hide', decided_by='owner', listing_name=${esc(listing)}, equal_to_raw_id=${shown}, reason_text=${esc(`The same food as ${listing}, shown from one table (2026-11-18).`)}, curated_at=${esc(now)} WHERE raw_id=${id};`);
  }
  console.log(`${listing}: ${rows.get(shown).name} [${rows.get(shown).status}]${same.length ? ` (+${same.map((i) => `${i} ${rows.get(i).status}`).join(', ')} pointed here)` : ''}`);
}
sql.push('COMMIT;');

if (!APPLY) {
  console.log('dry run; pass --apply to write');
  process.exit(0);
}
execFileSync('sqlite3', [DB], { input: sql.join('\n'), maxBuffer: 2e9 });
console.log('counts:', JSON.stringify(q(`select status, count(*) n from food_curation group by 1`)));
