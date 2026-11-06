// Owner's third round of answers on the curated list, 2026-11-06. Applied directly to food_curation.
//   Listed: white, brown and powdered sugar, pantry items, the single hidden foods, bottled sauces, traditional ferments,
//   sausages and more cured meats, smoked fish, sweetened condensed milk, century egg.
//   Hidden for safety by the owner: pokeberry shoots, bitter almonds. Aged Inuit game stays hidden.
//   Corn, sunflower and the other refined seed oils stay hidden; the owner excluded oils seen as completely unhealthy.
//   Cautions: processed meat, added sugar, and salt on anything preserved or seasoned with salt.
// Every row is set to an absolute state, so running this twice changes nothing further.
// Usage: node curate-owner-round3.js   (sqlite3 on PATH)
const { execFileSync } = require('child_process');
const path = require('path');
const C = require('./curate-cautions');

const DB = path.resolve(__dirname, '..', 'unified_foods.sqlite');
const q = (s) => JSON.parse(execFileSync('sqlite3', ['-json', DB, s], { maxBuffer: 2e9 }).toString() || '[]');
const esc = (s) => (s === null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

const WHY = {
  sugar: 'Used across the recipes, listed by the owner with a caution saying why to limit it.',
  pantry: 'A basic household ingredient and recipe base, listed by the owner.',
  single: 'A single food the recipes use, listed by the owner.',
  sauce: 'A bottled sauce the recipes use, listed by the owner.',
  ferment: 'A traditional ferment the recipes use, listed by the owner.',
  cured: 'Sold and used often, so listed by the owner with a caution saying why to limit it.',
  smoked: 'Fish preserved by smoking, a traditional form, listed by the owner.',
};

// [listing, type, why, caution, front row, ...rows held to compare]
const LISTINGS = [
  ['White sugar', 'sweetener', WHY.sugar, C.SUGAR, 6871, 3610, 39647, 25086, 22047, 35350, 1913],
  ['Brown sugar', 'sweetener', WHY.sugar, C.SUGAR, 6049, 1912, 22045, 39648, 25085],
  ['Powdered sugar', 'sweetener', WHY.sugar, C.SUGAR, 6872, 22048, 30781],
  ['Vanilla sugar', 'sweetener', WHY.sugar, C.SUGAR, 30783, 2039, 39668],
  ['Rock sugar', 'sweetener', WHY.sugar, C.SUGAR, 35354],
  ['Maltose', 'sweetener', WHY.sugar, C.SUGAR, 30786],
  ['Sweetened condensed milk', 'milk_cream', WHY.sugar, C.SUGAR, 8491, 27753, 38120, 36889, 1157, 30154, 2208],
  ['Nonfat sweetened condensed milk', 'milk_cream', WHY.sugar, C.SUGAR, 20352, 30153],

  ['Baking powder', 'leavener', WHY.pantry, null, 10020, 10019, 93, 3685, 30717, 37248, 20752, 37439, 24809, 24808],
  ['Low-sodium baking powder', 'leavener', WHY.pantry, null, 10021, 24810],
  ['Gelatin', 'other', WHY.pantry, null, 30725, 859, 37408, 21292],
  ['Capers', 'vinegar_condiment', WHY.pantry, null, 9454, 344, 25532, 37434, 29247, 21034],
  ['Dark chocolate', 'cocoa', WHY.pantry, null, 30960, 534, 535, 3736, 4555, 4556],
  ['Semisweet chocolate', 'cocoa', WHY.pantry, null, 5192, 30954, 3737],
  ['Hominy', 'grain', WHY.pantry, null, 6917],
  ['Yellow hominy', 'grain', WHY.pantry, null, 6968, 25227],
  ['Puffed millet', 'grain', WHY.pantry, null, 4940, 25737],
  ['Rice paper', 'pasta_noodle', WHY.pantry, null, 1642, 21878],
  ['Wonton wrappers', 'pasta_noodle', WHY.pantry, null, 10018, 24807, 2099],
  ['Baking wafers', 'other', WHY.pantry, null, 28658],

  ['Chicken feet', 'poultry', WHY.single, null, 8335, 26842],
  ['Canned straw mushrooms', 'fungi', WHY.single, null, 5798, 25512, 20430],
  ['Century egg', 'eggs', WHY.single, null, 36876],

  ['Oyster sauce', 'vinegar_condiment', WHY.sauce, null, 37195, 20605],
  ['Worcestershire sauce', 'vinegar_condiment', WHY.sauce, null, 8826, 2100, 21939, 22387],
  ['Hoisin sauce', 'vinegar_condiment', WHY.sauce, null, 10102, 25438, 21920],
  ['Sriracha', 'vinegar_condiment', WHY.sauce, null, 8402],

  ['Doubanjiang', 'soy_ferment', WHY.ferment, null, 37168],
  ['Sweet bean sauce', 'soy_ferment', WHY.ferment, null, 37270],

  ['Kasseler', 'cured_meat', WHY.cured, C.PROCESSED_MEAT, 32996, 32999, 2903],
  ['Eisbein', 'cured_meat', WHY.cured, C.PROCESSED_MEAT, 32007, 32029],
  ['Smoked pork shoulder', 'cured_meat', WHY.cured, C.PROCESSED_MEAT, 5504, 1815, 20643],
  ['Lyon sausage', 'cured_meat', WHY.cured, C.PROCESSED_MEAT, 32818, 36756, 32843],
  ['Italian sausage', 'cured_meat', WHY.cured, C.PROCESSED_MEAT, 8847, 22399, 1784, 3317],
  ['Bratwurst', 'cured_meat', WHY.cured, C.PROCESSED_MEAT, 8836, 32796, 32803, 32793, 20657],
  ['Mettwurst', 'cured_meat', WHY.cured, C.PROCESSED_MEAT, 32739, 21897],
  ['Morteau sausage', 'cured_meat', WHY.cured, C.PROCESSED_MEAT, 39580],
  ['Montbéliard sausage', 'cured_meat', WHY.cured, C.PROCESSED_MEAT, 39581],
  ['Knackwurst', 'cured_meat', WHY.cured, C.PROCESSED_MEAT, 11083, 22400, 20661, 39619, 32785],
  ['Toulouse sausage', 'cured_meat', WHY.cured, C.PROCESSED_MEAT, 39583],
  ['Pinkel sausage', 'cured_meat', WHY.cured, C.PROCESSED_MEAT, 32957],
  ['Smoked pork sausage', 'cured_meat', WHY.cured, C.PROCESSED_MEAT, 22410],
  ['Sausage meat', 'cured_meat', WHY.cured, C.PROCESSED_MEAT, 39576],

  ['Smoked salmon', 'fish', WHY.smoked, null, 10903, 23991, 36297, 31294, 31275, 31302, 1731, 21910, 39300, 3107, 3125, 3127, 3128, 7029, 26135, 4830, 4861, 27370, 4831, 27371],
  ['Lox', 'fish', WHY.smoked, null, 9201, 24071],
  ['Kippered salmon', 'fish', WHY.smoked, null, 4863, 4862, 5240, 27369],
  ['Kippered herring', 'fish', WHY.smoked, null, 10884, 23958],
  ['Smoked herring', 'fish', WHY.smoked, null, 31079, 36367, 934, 39277],
  ['Smoked matjes herring', 'fish', WHY.smoked, null, 31082],
  ['Smoked mackerel', 'fish', WHY.smoked, null, 31102, 1098, 1099, 39342, 3116, 3126],
  ['Smoked haddock', 'fish', WHY.smoked, null, 11415, 23952, 39344, 31161, 897],
  ['Smoked cod', 'fish', WHY.smoked, null, 21157, 24174],
  ['Smoked sablefish', 'fish', WHY.smoked, null, 10901, 23989],
  ['Smoked sturgeon', 'fish', WHY.smoked, null, 12365, 24012],
  ['Smoked whitefish', 'fish', WHY.smoked, null, 10928, 24029, 31263, 3093],
  ['Dried smoked whitefish', 'fish', WHY.smoked, null, 27400],
  ['Smoked cisco', 'fish', WHY.smoked, null, 9170, 23937],
  ['Dried smoked cisco', 'fish', WHY.smoked, null, 27398],
  ['Dried smoked inconnu', 'fish', WHY.smoked, null, 27319],
  ['Smoked trout', 'fish', WHY.smoked, null, 31318, 2016, 39488, 31256],
  ['Smoked eel', 'fish', WHY.smoked, null, 31054, 747, 3130, 3114],
  ['Smoked halibut', 'fish', WHY.smoked, null, 903, 905, 31230],
  ['Smoked sprat', 'fish', WHY.smoked, null, 31097],
  ['Smoked carp', 'fish', WHY.smoked, null, 31336],
  ['Smoked catfish', 'fish', WHY.smoked, null, 31352, 31392],
  ['Smoked pollock', 'fish', WHY.smoked, null, 39387],
  ['Smoked saithe', 'fish', WHY.smoked, null, 31174],
  ['Smoked redfish', 'fish', WHY.smoked, null, 31409],
  ['Smoked dogfish', 'fish', WHY.smoked, null, 31049, 31045],
  ['Smoked char', 'fish', WHY.smoked, null, 3129],
  ['Smoked cod roe', 'roe', WHY.smoked, null, 39316],
];

// Rows that join a listing already on the list.
const JOIN = [['Fish sauce', 37529]];
// Hidden by the owner because they are unsafe as food.
const SAFETY_HIDE = [
  [7648, 'Pokeberry shoots are poisonous unless boiled and drained, hidden for safety by the owner.'],
  [23264, 'Pokeberry shoots are poisonous unless boiled and drained, hidden for safety by the owner.'],
  [29843, 'Bitter almonds carry cyanide, hidden for safety by the owner.'],
];

// Over 0.6 g of sodium per 100 g on these kinds of food reads as salted. Sodium is stored in mg, whatever the unit column says.
const SALT_MG = 600;
const SALT_TYPES = ['fish', 'roe', 'shellfish', 'vegetable', 'fruit', 'tofu', 'soy_ferment', 'vinegar_condiment', 'game', 'eggs'];
// Salty by nature or concentrated by drying, not salted by anybody.
const NOT_SALTED = new Set(['Sardine', 'Sprat', 'Sea squirt', 'Clam', 'King crab', 'Razor clams', 'Dried celery', 'Glasswort', 'Dried egg white', 'Egg white powder']);
const PRESERVED_SEAFOOD = /^salted |shiokara|ganzuke|uruka|^salt cod$|^fermented |^salmon kidney$|^fish sauce$|matjes|caviar|^dried salted fish$|^lumpfish roe$|^vendace roe$|^dried mullet roe$|^jellyfish$/i;
const PRESERVED_TYPES = new Set(['fish', 'roe', 'shellfish', 'vinegar_condiment']);

const ids = LISTINGS.flatMap(([, , , , ...r]) => r);
const hideIds = SAFETY_HIDE.map(([id]) => id);
const all = [...ids, ...JOIN.map(([, id]) => id), ...hideIds];
if (new Set(all).size !== all.length) throw new Error('a row is placed twice');
const before = new Map(q(`select raw_id, status, listing_name from food_curation where raw_id in (${all.join(',')})`).map((r) => [r.raw_id, r]));
for (const id of all) if (!before.has(id)) throw new Error(`no row ${id}`);
// A row that already sits under another listing is never taken from it here.
for (const [listing, , , , ...rows] of LISTINGS) {
  for (const id of rows) {
    const b = before.get(id);
    if (b.status !== 'hide' && b.listing_name !== listing) throw new Error(`row ${id} already belongs to ${b.listing_name}`);
  }
}
const known = new Set(q(`select lower(listing_name) n from food_curation where status='show' and raw_id not in (${ids.join(',')})`).map((r) => r.n));
for (const [listing] of LISTINGS) if (known.has(listing.toLowerCase())) throw new Error(`listing already exists: ${listing}`);

const now = new Date().toISOString();
const sql = ['BEGIN;'];
for (const [listing, type, why, caution, front, ...rest] of LISTINGS) {
  const set = (id, status, eq) => sql.push(
    `UPDATE food_curation SET status='${status}', decided_by='owner', reason_code='meets_criteria', reason_text=${esc(why)}, listing_name=${esc(listing)}, food_type=${esc(type)}, equal_to_raw_id=${eq === null ? 'NULL' : eq}, caution=${esc(caution)}, curated_at=${esc(now)} WHERE raw_id=${id};`,
  );
  set(front, 'show', null);
  for (const id of rest) set(id, 'compare', front);
}
for (const [listing, id] of JOIN) {
  const front = `(select raw_id from food_curation where status='show' and listing_name=${esc(listing)})`;
  const type = `(select food_type from food_curation where status='show' and listing_name=${esc(listing)})`;
  sql.push(`UPDATE food_curation SET status='compare', decided_by='owner', reason_code='meets_criteria', reason_text=${esc(WHY.sauce)}, listing_name=${esc(listing)}, food_type=${type}, equal_to_raw_id=${front}, curated_at=${esc(now)} WHERE raw_id=${id};`);
}
for (const [id, why] of SAFETY_HIDE) {
  sql.push(`UPDATE food_curation SET status='hide', decided_by='owner', reason_code='unsafe_as_food', reason_text=${esc(why)}, listing_name=NULL, food_type=NULL, equal_to_raw_id=NULL, caution=NULL, curated_at=${esc(now)} WHERE raw_id=${id};`);
}
sql.push('COMMIT;');
execFileSync('sqlite3', [DB], { input: sql.join('\n'), maxBuffer: 2e9 });

// Salt, from the measured sodium of each listing's front row. A listing that already says something else keeps it.
const types = SALT_TYPES.map((t) => `'${t}'`).join(',');
const shown = q(`select c.listing_name l, c.food_type t, c.caution ca, (select amount_per_100g from raw_food_nutrients n where n.raw_id=c.raw_id and n.nutrient_code='sodium') na from food_curation c where c.status='show' and c.food_type in (${types})`);
const salted = [];
const sql2 = ['BEGIN;'];
for (const r of shown) {
  if (r.ca && r.ca !== C.SALT && r.ca !== C.SALT_PRESERVED_SEAFOOD) continue;
  const preserved = PRESERVED_TYPES.has(r.t) && PRESERVED_SEAFOOD.test(r.l);
  const high = r.na !== null && r.na >= SALT_MG && !NOT_SALTED.has(r.l);
  if (!preserved && !high) continue;
  salted.push(`${r.l}${preserved ? '*' : ''}`);
  sql2.push(`UPDATE food_curation SET caution=${esc(preserved ? C.SALT_PRESERVED_SEAFOOD : C.SALT)} WHERE listing_name=${esc(r.l)} AND status<>'hide';`);
}
sql2.push('COMMIT;');
execFileSync('sqlite3', [DB], { input: sql2.join('\n'), maxBuffer: 2e9 });

for (const r of q('select status, count(*) n from food_curation group by 1')) console.log(r.status, r.n);
const bad = q("select count(*) n from food_curation c left join food_curation t on t.raw_id=c.equal_to_raw_id where c.status='compare' and (t.status is not 'show' or t.listing_name is not c.listing_name)")[0].n;
const dup = q("select count(*) n from (select lower(listing_name) from food_curation where status='show' group by 1 having count(*)>1)")[0].n;
console.log('listings added:', LISTINGS.length, '| compare rows not pointing at their shown row:', bad, '| listings shown twice:', dup);
console.log(q("select substr(caution,1,28) c, count(*) rows_, sum(status='show') listings from food_curation where caution is not null group by 1"));
console.log(`salt caution on ${salted.length} (* = preserved seafood wording):`, salted.sort().join('; '));
console.log('safety check:', q(`select raw_id, status, listing_name from food_curation where raw_id in (${hideIds.join(',')}) or lower(listing_name) in ('pokeberry shoots','bitter almonds')`));
console.log('century egg / Inuit game:', q("select c.raw_id, c.status, c.listing_name, r.name_english from food_curation c join raw_foods r using(raw_id) where lower(r.name_english) like '%inuit%' or c.raw_id=36876"));
