// The owner's fourth round of answers, 2026-11-06.
//   1. Cooking alcohol is listed, with a short set of wines, spirits and beers.
//   2. Oils that are not partially hydrogenated are listed. Peanut oil is handled like a peanut or nut allergy.
//   5. A salt warning on anything that has salt in it, for anyone limiting salt.
// Answers 3 and 4 changed nothing. Run with --apply to write; with no flag it only prints what it would do.
const { execFileSync } = require('child_process');
const path = require('path');
const C = require('./curate-cautions');

const DB = path.join(__dirname, '..', 'unified_foods.sqlite');
const APPLY = process.argv.includes('--apply');
const q = (s) => JSON.parse(execFileSync('sqlite3', ['-json', DB, s], { maxBuffer: 2e9 }).toString() || '[]');
const esc = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

const WHY = {
  alcohol: 'Listed by the owner so recipes that cook with it can be made.',
  oil: 'Listed by the owner: a plant oil that is not partially hydrogenated.',
};

// [listing, type, why, caution, front row, ...rows held behind it to compare]
const LISTINGS = [
  ['White wine', 'alcohol', WHY.alcohol, null, 12053, 40056, 30530, 22166, 37116, 3625, 2091, 2092],
  ['Red wine', 'alcohol', WHY.alcohol, null, 10406, 40055, 30549, 22157, 37117, 3624, 2087, 2088, 2089, 23802],
  ['Rosé wine', 'alcohol', WHY.alcohol, null, 9124, 22164, 40057, 37118, 30537, 23803],
  ['Sparkling wine', 'alcohol', WHY.alcohol, null, 22171],
  ['Cooking wine', 'alcohol', WHY.alcohol, null, 6286, 27022],
  ['Dessert wine', 'alcohol', WHY.alcohol, null, 10392, 12328, 22172, 37368],
  ['Dry sherry', 'alcohol', WHY.alcohol, null, 20578, 22155, 30567, 3630],
  ['Sweet sherry', 'alcohol', WHY.alcohol, null, 20579, 22156, 30570],
  ['Port', 'alcohol', WHY.alcohol, null, 22154, 30565, 828, 3629],
  ['Madeira', 'alcohol', WHY.alcohol, null, 30566, 3628],
  ['Marsala', 'alcohol', WHY.alcohol, null, 37386],
  ['Dry vermouth', 'alcohol', WHY.alcohol, null, 30559, 37138],
  ['Sweet vermouth', 'alcohol', WHY.alcohol, null, 30560, 20581, 37137, 827],
  ['Sake', 'alcohol', WHY.alcohol, null, 4939, 27082, 37107, 37395, 37108],
  ['Mirin', 'alcohol', WHY.alcohol, null, 37131],
  ['Shaoxing wine', 'alcohol', WHY.alcohol, null, 37119],
  ['Rum', 'alcohol', WHY.alcohol, null, 12033, 37357, 30591, 37126, 23796],
  ['Vodka', 'alcohol', WHY.alcohol, null, 12034, 30585, 37374, 37124, 3632, 23797],
  ['Whiskey', 'alcohol', WHY.alcohol, null, 12035, 37365, 30589, 37122, 3640, 23795],
  ['Gin', 'alcohol', WHY.alcohol, null, 30587, 37338, 37125, 3639, 23892],
  ['Brandy', 'alcohol', WHY.alcohol, null, 30583, 3635, 37123],
  ['Cognac', 'alcohol', WHY.alcohol, null, 30582, 37393],
  ['Calvados', 'alcohol', WHY.alcohol, null, 30584, 37394],
  ['Beer', 'alcohol', WHY.alcohol, null, 5962, 23888, 20862, 37112, 30506, 30508, 144],
  ['Dark beer', 'alcohol', WHY.alcohol, null, 30511, 40029, 37113, 30513],
  ['Stout', 'alcohol', WHY.alcohol, null, 30516, 20701, 37114],
  ['Wheat beer', 'alcohol', WHY.alcohol, null, 30501, 30500, 40038],
  ['Hard cider', 'alcohol', WHY.alcohol, null, 11362, 21144, 30562],
  ['Liqueur', 'alcohol', WHY.alcohol, null, 37348, 1055, 1056, 3633],

  ['Corn oil', 'plant_oil', WHY.oil, null, 8245, 2143, 30630, 36941, 37995, 1309, 21603, 25127],
  ['Sunflower oil', 'plant_oil', WHY.oil, null, 8241, 2148, 30633, 38004, 36945, 1321, 21612, 8233],
  ['High-oleic sunflower oil', 'plant_oil', WHY.oil, null, 9554, 36961, 25297, 36960, 26355],
  ['Soybean oil', 'plant_oil', WHY.oil, null, 8627, 2147, 36939, 38003, 30631, 1320, 21611, 24964, 9586],
  ['Canola oil', 'plant_oil', WHY.oil, null, 9552, 3800, 36942, 37992, 30624, 1316, 21596, 25275],
  ['Safflower oil', 'plant_oil', WHY.oil, null, 8242, 2145, 21609, 30635, 37991, 36959, 25088],
  ['High-oleic safflower oil', 'plant_oil', WHY.oil, null, 8243, 36938, 25099],
  ['Cottonseed oil', 'plant_oil', WHY.oil, null, 8240, 36946, 37993, 21599, 25068],
  ['Rice bran oil', 'plant_oil', WHY.oil, null, 8229, 36937, 38001, 21608, 24934],
  ['Teaseed oil', 'plant_oil', WHY.oil, null, 8641],
  ['Tomato seed oil', 'plant_oil', WHY.oil, null, 8640],
  ['Oat oil', 'plant_oil', WHY.oil, null, 10792, 25324],
  // A blend names no single plant, so its caution points at the label.
  ['Vegetable oil', 'plant_oil', WHY.oil, C.BLEND_OIL, 21613, 37985, 36940, 3958, 21594, 21595, 1317, 7083, 26982, 26984, 38009],
];

// Rows of a plant already listed, which only add a country's figures to compare.
const JOIN = {
  'Grape seed oil': [8244, 21600, 30634, 38000, 25117],
  'Poppy seed oil': [8639, 37999, 25110],
  'Palm oil': [30620, 37945, 25004],
  'Palm kernel oil': [8638, 25108],
  'Cold-pressed canola oil': [4097],
  'Almond oil': [25156],
  'Apricot kernel oil': [25164],
  'Avocado oil': [25264],
  'Babassu oil': [25197],
  'Coconut oil': [24976],
  'Flaxseed oil': [26975],
  'Hazelnut oil': [25186],
  'Mustard oil': [25286],
  'Olive oil': [24995],
  'Peanut oil': [24953],
  'Sesame oil': [25011],
  'Walnut oil': [25146],
  'Wheat germ oil': [24943],
};

const ALLERGY = { 'Peanut oil': C.PEANUT_OIL, 'Almond oil': C.NUT_OIL, 'Walnut oil': C.NUT_OIL, 'Hazelnut oil': C.NUT_OIL, 'Macadamia oil': C.NUT_OIL };

// Types and names where salt is part of how the food is made. Everything else at the line gets the sodium wording, which claims nothing about added salt.
const ADDED_TYPES = new Set(['cheese', 'butter_animal_fat', 'pasta_noodle', 'salt_mineral']);
const ADDED_NAME = /smoked|pickled|sauerkraut|kimchi|fermented|canned|hominy|tortilla mix|cooking wine/i;
const NO_FIGURE_SALTED = new Set(['Low-fat cheese', 'Smoked pollock']);
const SODIUM_LINE = 120; // UK front-of-pack "low" stops at 0.3 g salt per 100 g, about 120 mg sodium.
const HIGH_LINE = 600; // UK front-of-pack "high" starts at 1.5 g salt per 100 g, about 600 mg sodium.
const PINCH_TYPE = 'herb_spice'; // Measured per 100 g but used by the pinch, so the figure would mislead.

// ---- Checks before anything is written.
const allIds = [...LISTINGS.flatMap((l) => l.slice(4)), ...Object.values(JOIN).flat()];
const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i);
if (dupes.length) throw new Error('row used twice: ' + dupes.join(', '));
const rows = new Map(q(`select c.raw_id, c.status, c.listing_name, c.food_type, c.reason_code, coalesce(f.name_english, f.name_original) name, f.source_code from food_curation c join raw_foods f using(raw_id) where c.raw_id in (${allIds.join(',')})`).map((r) => [r.raw_id, r]));
for (const id of allIds) {
  const r = rows.get(id);
  if (!r) throw new Error('no such row: ' + id);
  if (r.status !== 'hide') throw new Error(`row ${id} ${r.name} is already ${r.status} under ${r.listing_name}`);
  if (/hydrogenated|margarine|shortening/i.test(r.name)) throw new Error(`row ${id} is not allowed: ${r.name}`);
}
for (const l of LISTINGS) {
  const [taken] = q(`select count(*) n from food_curation where listing_name=${esc(l[0])} and status='show'`);
  if (taken.n) throw new Error('listing already exists: ' + l[0]);
}
const fronts = {};
for (const name of [...Object.keys(JOIN), ...Object.keys(ALLERGY)]) {
  const f = q(`select raw_id from food_curation where listing_name=${esc(name)} and status='show'`);
  if (f.length !== 1) throw new Error(`expected one shown row for ${name}, found ${f.length}`);
  fronts[name] = f[0].raw_id;
}

// ---- The writes.
const now = new Date().toISOString();
const sql = ['BEGIN;'];
const set = (id, status, listing, type, why, equal, caution) => sql.push(`UPDATE food_curation SET status=${esc(status)}, decided_by='owner', reason_code='meets_criteria', reason_text=${esc(why)}, listing_name=${esc(listing)}, food_type=${esc(type)}, equal_to_raw_id=${equal === null ? 'NULL' : equal}, caution=${esc(caution)}, curated_at=${esc(now)} WHERE raw_id=${id};`);
for (const [listing, type, why, caution, front, ...others] of LISTINGS) {
  set(front, 'show', listing, type, why, null, caution);
  for (const id of others) set(id, 'compare', listing, type, why, front, caution);
}
for (const [listing, ids] of Object.entries(JOIN)) for (const id of ids) set(id, 'compare', listing, 'plant_oil', WHY.oil, fronts[listing], null);
for (const [listing, text] of Object.entries(ALLERGY)) sql.push(`UPDATE food_curation SET caution=${esc(text)}, curated_at=${esc(now)} WHERE listing_name=${esc(listing)} AND status<>'hide';`);

// Earlier wording of the seafood caution, replaced wherever it is stored.
const OLD_SEAFOOD = `${C.SALT} Eating a lot of food preserved with salt is also a probable cause of stomach cancer (World Cancer Research Fund, 2018).`;
sql.push(`UPDATE food_curation SET caution=${esc(C.SALT_PRESERVED_SEAFOOD)}, curated_at=${esc(now)} WHERE caution=${esc(OLD_SEAFOOD)};`);
sql.push('COMMIT;');
if (APPLY) execFileSync('sqlite3', [DB], { input: sql.join('\n'), maxBuffer: 2e9 });

// ---- Salt, read from each listing's front row. New listings count only once applied.
const shown = q(`select c.listing_name n, c.food_type t, c.caution x, (select amount_per_100g from raw_food_nutrients s where s.raw_id=c.raw_id and s.nutrient_code='sodium') na from food_curation c where c.status='show'`);
const salt = { strong: [], some: [], sodium: [], noFigure: [], appended: [], pinch: [], under: 0 };
const saltSql = ['BEGIN;'];
const put = (n, text) => saltSql.push(`UPDATE food_curation SET caution=${esc(text)}, curated_at=${esc(now)} WHERE listing_name=${esc(n)} AND status<>'hide';`);
for (const r of shown) {
  if (r.x && !r.x.startsWith('Added sugar')) continue; // Salt wording, processed meat and allergy text stay as they are.
  if (r.na === null || r.na === undefined) {
    if (NO_FIGURE_SALTED.has(r.n)) { salt.noFigure.push(r.n); put(r.n, C.SALT_NO_FIGURE); }
    continue;
  }
  if (r.na < SODIUM_LINE) { salt.under += 1; continue; }
  if (r.t === PINCH_TYPE) { salt.pinch.push(r.n); continue; }
  if (r.x) { salt.appended.push(r.n); put(r.n, `${r.x} ${C.sodium(r.na)}`); continue; } // Added sugar, and sodium as well.
  const added = ADDED_TYPES.has(r.t) || ADDED_NAME.test(r.n);
  if (added && r.na >= HIGH_LINE) { salt.strong.push(r.n); put(r.n, C.SALT); } else if (added) { salt.some.push(r.n); put(r.n, C.saltSome(r.na)); } else { salt.sodium.push(r.n); put(r.n, C.sodium(r.na)); }
}
saltSql.push('COMMIT;');
if (APPLY) execFileSync('sqlite3', [DB], { input: saltSql.join('\n'), maxBuffer: 2e9 });

// ---- What happened.
for (const [listing, , , , front, ...others] of LISTINGS) console.log(`${listing}: ${rows.get(front).source_code} ${rows.get(front).name}${others.length ? '\n    + ' + others.map((id) => rows.get(id).name).join(' | ') : ''}`);
for (const [listing, ids] of Object.entries(JOIN)) console.log(`JOIN ${listing}: ${ids.map((id) => rows.get(id).name).join(' | ')}`);
console.log('\nsalt:', Object.fromEntries(Object.entries(salt).map(([k, v]) => [k, Array.isArray(v) ? v.length : v])));
console.log('pinch left out:', salt.pinch.join(', '));
console.log('appended to sugar:', salt.appended.join(', '));
console.log(q(`select status, count(*) n from food_curation group by 1`));
console.log('compare rows not pointing at a shown row:', q(`select count(*) n from food_curation c where c.status='compare' and not exists (select 1 from food_curation s where s.raw_id=c.equal_to_raw_id and s.status='show')`)[0].n);
console.log('listings shown twice:', q(`select listing_name, count(*) n from food_curation where status='show' group by 1 having n>1`));
console.log('shown with a caution:', q(`select count(*) n from food_curation where status='show' and caution is not null`)[0].n);
console.log(APPLY ? 'APPLIED' : 'DRY RUN, nothing written');
