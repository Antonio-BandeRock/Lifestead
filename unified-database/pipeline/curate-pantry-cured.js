// Owner's answers on the curated list, 2026-11-06. Applied directly to food_curation.
//   Pantry bases are listed: tofu and yuba, tomato paste and puree, evaporated milk, vanilla extract, barley malt extract.
//   Salted and fermented seafood is listed.
//   Cured meats and common deli meats are listed, each carrying a caution for the app to show (new column: caution).
//   Cooked or melted cheeses stay hidden. Century egg and aged Inuit game stay hidden until the owner decides.
// Every row is set to an absolute state, so running this twice changes nothing further.
// Usage: node curate-pantry-cured.js   (sqlite3 on PATH)
const { execFileSync } = require('child_process');
const path = require('path');

const DB = path.resolve(__dirname, '..', 'unified_foods.sqlite');
const q = (s) => JSON.parse(execFileSync('sqlite3', ['-json', DB, s], { maxBuffer: 2e9 }).toString() || '[]');
const esc = (s) => (s === null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

const PROCESSED_MEAT_CAUTION = 'Processed meat. The World Health Organization\'s cancer agency classes processed meat as a known cause of bowel cancer, with risk rising about 18% for each 50 g eaten daily (IARC, 2015). Most carry a lot of salt, and many carry nitrite. It is wise to keep these small and occasional.';

const WHY = {
  pantry: 'A basic household ingredient and recipe base, listed by the owner.',
  seafood: 'Seafood preserved with salt or by fermenting, a traditional form, listed by the owner.',
  cured: 'Bought often, so listed by the owner with a caution saying why to limit it.',
};

// [listing, type, why, front row, ...rows held to compare]
const LISTINGS = [
  ['Tofu', 'tofu', WHY.pantry, 9692, 25539, 1996, 29926, 38669],
  ['Firm tofu', 'tofu', WHY.pantry, 9691, 9664, 11506, 11507, 24343, 24354, 2812, 22080, 35404, 35408],
  ['Soft tofu', 'tofu', WHY.pantry, 9665, 35406, 35409],
  ['Silken tofu', 'tofu', WHY.pantry, 25540, 25541, 25542, 25543, 25544, 9677, 9678, 9679, 9680, 11508, 29931, 1997, 35405, 35407, 38670],
  ['Koyadofu', 'tofu', WHY.pantry, 9666, 11519, 24271, 24309, 35414],
  ['Fuyu', 'tofu', WHY.pantry, 11496, 11521, 24273, 24310],
  ['Yuba', 'tofu', WHY.pantry, 35430],
  ['Dried yuba', 'tofu', WHY.pantry, 35431],

  ['Tomato paste', 'vegetable', WHY.pantry, 7675, 23360, 22083, 22084, 30708, 2433],
  ['Tomato puree', 'vegetable', WHY.pantry, 7676, 7762, 30709, 2001, 38480],
  ['Evaporated milk', 'milk_cream', WHY.pantry, 8492, 9410, 30157, 30158, 36888, 21488, 22540, 38119, 2207],
  ['Reduced-fat evaporated milk', 'milk_cream', WHY.pantry, 8518, 30156, 21487, 22631],
  ['Nonfat evaporated milk', 'milk_cream', WHY.pantry, 8094, 30155, 22376],
  ['Vanilla extract', 'herb_spice', WHY.pantry, 10687, 23258, 22113],
  ['Barley malt extract', 'sweetener', WHY.pantry, 28388, 23291],

  ['Squid shiokara', 'shellfish', WHY.seafood, 36503],
  ['Abalone shiokara', 'shellfish', WHY.seafood, 36433],
  ['Sea squirt shiokara', 'shellfish', WHY.seafood, 36520],
  ['Ganzuke', 'shellfish', WHY.seafood, 36486],
  ['Uruka', 'fish', WHY.seafood, 36175],
  ['Salted sea urchin', 'shellfish', WHY.seafood, 36511, 36512],
  ['Salted crayfish', 'shellfish', WHY.seafood, 31429],
  ['Salted shrimp', 'shellfish', WHY.seafood, 31457],
  ['Salted trout roe', 'roe', WHY.seafood, 39386],

  ['Prosciutto', 'cured_meat', WHY.cured, 25592, 21833, 20641, 32991, 39546],
  ['Serrano ham', 'cured_meat', WHY.cured, 39547],
  ['Dry-cured ham', 'cured_meat', WHY.cured, 39545, 39541, 39539, 39540, 39543, 39544, 36746, 36747],
  ['Ham', 'cured_meat', WHY.cured, 5511, 11080, 11097, 20642, 21329, 26320, 26444, 36739, 36740, 36741, 39551, 39557],
  ['Bacon', 'cured_meat', WHY.cured, 5493, 5598, 2900, 3322, 36748, 39527, 39536],
  ['Canadian bacon', 'cured_meat', WHY.cured, 5085],
  ['Pancetta', 'cured_meat', WHY.cured, 39549],
  ['Capicola', 'cured_meat', WHY.cured, 26325, 39548],
  ['Bresaola', 'cured_meat', WHY.cured, 39529, 39550],
  ['Salami', 'cured_meat', WHY.cured, 11798, 11819, 10154, 32727, 26329, 27153, 1779, 39607, 21899, 3306],
  ['Pepperoni', 'cured_meat', WHY.cured, 11791, 26332, 1420, 21900],
  ['Chorizo', 'cured_meat', WHY.cured, 11075, 26467, 21948, 1765, 39604, 39605, 39606, 26469, 26472],
  ['Pastrami', 'cured_meat', WHY.cured, 7420, 10175, 23783, 20674],
  ['Corned beef', 'cured_meat', WHY.cured, 7415, 23780, 33003],
  ['Mortadella', 'cured_meat', WHY.cured, 11789, 26331, 20662, 32888],
  ['Bologna', 'cured_meat', WHY.cured, 9229, 9228, 11072, 32828],
  ['Hot dog', 'cured_meat', WHY.cured, 10184, 11078, 10180, 27168, 22422, 26314],
  ['Beef jerky', 'cured_meat', WHY.cured, 4752, 24874, 36672],
  ['Dried beef', 'cured_meat', WHY.cured, 20705, 31636, 7820],
  ['Salt pork', 'cured_meat', WHY.cured, 5503, 22979],
  ['Kielbasa', 'cured_meat', WHY.cured, 11095, 26326],
  ['Summer sausage', 'cured_meat', WHY.cured, 10156, 26330],
];

const cols = q('pragma table_info(food_curation)').map((c) => c.name);
if (!cols.includes('caution')) execFileSync('sqlite3', [DB, 'ALTER TABLE food_curation ADD COLUMN caution TEXT;']);

const ids = LISTINGS.flatMap(([, , , ...r]) => r);
if (new Set(ids).size !== ids.length) throw new Error('a row is placed twice');
const before = new Map(q(`select raw_id, status from food_curation where raw_id in (${ids.join(',')})`).map((r) => [r.raw_id, r]));
for (const id of ids) if (!before.has(id)) throw new Error(`no row ${id}`);
const known = new Set(q(`select lower(listing_name) n from food_curation where status='show' and raw_id not in (${ids.join(',')})`).map((r) => r.n));
for (const [listing] of LISTINGS) if (known.has(listing.toLowerCase())) throw new Error(`listing already exists: ${listing}`);

const now = new Date().toISOString();
const sql = ['BEGIN;'];
for (const [listing, type, why, front, ...rest] of LISTINGS) {
  const caution = type === 'cured_meat' ? PROCESSED_MEAT_CAUTION : null;
  const set = (id, status, eq) => sql.push(
    `UPDATE food_curation SET status='${status}', decided_by='owner', reason_code='meets_criteria', reason_text=${esc(why)}, listing_name=${esc(listing)}, food_type=${esc(type)}, equal_to_raw_id=${eq === null ? 'NULL' : eq}, caution=${esc(caution)}, curated_at=${esc(now)} WHERE raw_id=${id};`,
  );
  set(front, 'show', null);
  for (const id of rest) set(id, 'compare', front);
}
sql.push('COMMIT;');
execFileSync('sqlite3', [DB], { input: sql.join('\n'), maxBuffer: 2e9 });

for (const r of q('select status, count(*) n from food_curation group by 1')) console.log(r.status, r.n);
const bad = q(`select count(*) n from food_curation c left join food_curation t on t.raw_id=c.equal_to_raw_id where c.status='compare' and (t.status is not 'show' or t.listing_name is not c.listing_name)`)[0].n;
const dup = q(`select count(*) n from (select lower(listing_name) from food_curation where status='show' group by 1 having count(*)>1)`)[0].n;
console.log('listings added:', LISTINGS.length, '| compare rows not pointing at their shown row:', bad, '| listings shown twice:', dup);
console.log(q(`select food_type, count(*) n from food_curation where caution is not null group by 1`));
