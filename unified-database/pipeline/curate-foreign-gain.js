// Owner's review of the curated list, 2026-11-06. Applied directly to food_curation.
//   Tap water is listed as Water. Curing salt is hidden.
//   Foods no USDA row covers, which had been folded under a broader USDA name or hidden by a word rule
//   that did not fit, get a listing of their own. Wagyu gets its own listings from both Japan and USDA.
// Every row is set to an absolute state, so running this twice changes nothing further.
// Usage: node curate-foreign-gain.js   (sqlite3 on PATH)
const { execFileSync } = require('child_process');
const path = require('path');

const DB = path.resolve(__dirname, '..', 'unified_foods.sqlite');
const q = (s) => JSON.parse(execFileSync('sqlite3', ['-json', DB, s], { maxBuffer: 2e9 }).toString() || '[]');
const esc = (s) => (s === null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

const WHY = {
  water: 'Listed as Water by the owner: tap water, the plain water recipes use. Bottled, mineral and vichy water stay hidden.',
  named: 'A distinct food that no USDA row covers, known and searched for by this name.',
  variety: 'A named variety that no USDA row covers, known and searched for by this name.',
  wagyu: 'Wagyu is bought and searched for as Wagyu, so it is not folded under the plain beef cut.',
  rule: 'A word rule hid this by mistake: it is a single food that meets the filter.',
  dried: 'A traditional fish preserved by boiling, drying or smoking, with nothing added, like the dried fish already listed. No USDA row covers it.',
  salted: 'Preserved with salt only, a traditional form, and the only form the sources carry. No USDA row covers it.',
  egg: 'A traditional preserved duck egg with no USDA row.',
  kelp: 'Herring eggs laid on kelp as they are gathered, a traditional coastal food with no USDA row.',
  bottled: 'Young water shield leaves held in water, the only form this food is sold in. No USDA row covers it.',
  moved: 'Moved to the listing that names this food.',
};

// [listing, type or null to keep the row's type, why, front row, ...rows held to compare]
const LISTINGS = [
  ['Water', 'water', WHY.water, 10863, 12312, 12319, 2066, 3659, 22144, 30393, 38059],

  ["Fourme d'Ambert", null, WHY.named, 37621],
  ["Bleu d'Auvergne", null, WHY.named, 37620],
  ['Bleu des Causses', null, WHY.named, 37622],
  ['Bleu de Gex', null, WHY.named, 37624],
  ['Bleu de Bresse', null, WHY.named, 37625],
  ['Danish Blue', null, WHY.named, 30283],
  ['Brie de Meaux', null, WHY.named, 37567],
  ['Brie de Melun', null, WHY.named, 37568],
  ['Chabichou', null, WHY.named, 37672],
  ['Crottin de Chavignol', null, WHY.named, 37676],
  ['Crottin', null, WHY.named, 37675, 37674],
  ['Chevrot', null, WHY.named, 37681],
  ['Valençay', null, WHY.named, 37683],
  ['Emmental', null, WHY.named, 37600, 37602, 36908, 30229],
  ['Wine cheese', null, WHY.named, 30311, 30312],

  ['Pike conger', null, WHY.named, 36377],
  ['Crucian carp', null, WHY.named, 36384],
  ['Lutefisk', 'fish', WHY.rule, 3117, 805],
  ['Katsuobushi', 'fish', WHY.dried, 36237],
  ['Saba-bushi', 'fish', WHY.dried, 36303],
  ['Niboshi', 'fish', WHY.dried, 36191],
  ['Sand lance niboshi', 'fish', WHY.dried, 36180],
  ['Shirasuboshi', 'fish', WHY.dried, 36201, 36202],
  ['Matjes herring', 'fish', WHY.salted, 31081, 31499],
  ['Herring eggs on kelp', 'roe', WHY.kelp, 27356],

  ['Belgian endive', null, WHY.named, 23147, 29271, 35667],
  ['Escarole', null, WHY.named, 38350, 23184, 29275],
  ['Giraumon', null, WHY.variety, 38647, 38649],
  ['Pointed cabbage', null, WHY.variety, 29405],
  ['Golden nugget pumpkin', 'vegetable', WHY.rule, 21845],
  ['Satsuma', null, WHY.variety, 29227, 35896, 35897, 35898, 35899],
  ['Hiroshimana', null, WHY.variety, 35762],
  ['Santosai', null, WHY.variety, 35597],
  ['Nozawana', null, WHY.variety, 35737],
  ['Mizukakena', null, WHY.variety, 35780],
  ['Sugukina', null, WHY.variety, 35621],
  ['Hinona', null, WHY.variety, 35760],
  ['Taisai', null, WHY.variety, 35652, 35653],
  ['Takana', null, WHY.variety, 35655],
  ['Karashina', null, WHY.variety, 35560],
  ['Wakegi', null, WHY.variety, 35828],
  ['Kintoki carrot', null, WHY.variety, 35726, 35728],
  ['Nagaimo', null, WHY.variety, 35306],
  ['Yamatoimo', null, WHY.variety, 35308],
  ['Satoimo', null, WHY.variety, 35293],
  ['Mizuimo', null, WHY.variety, 35296],
  ['Yatsugashira', null, WHY.variety, 35298],
  ['Takenoko-imo', null, WHY.variety, 35335],
  ['Chinese white pear', null, WHY.variety, 35958],
  ['Junsai', 'vegetable', WHY.bottled, 35609],

  ['Tosaka-nori', 'seaweed', WHY.salted, 36122, 36123],
  ['Mukade-nori', 'seaweed', WHY.salted, 36128],
  ['Okinawa mozuku', 'seaweed', WHY.salted, 36129],
  ['Mozuku', 'seaweed', WHY.salted, 36130],

  ['Wagyu chuck', null, WHY.wagyu, 36569, 36570, 36571],
  ['Wagyu chuck roll', null, WHY.wagyu, 36573, 36574, 36575],
  ['Wagyu rib', null, WHY.wagyu, 8956, 8953, 8954, 8957, 36576, 36577, 36578],
  ['Wagyu top loin', null, WHY.wagyu, 11194, 8952, 11190, 11195],
  ['Wagyu sirloin', null, WHY.wagyu, 36580, 36581, 36582],
  ['Wagyu flank', null, WHY.wagyu, 36583],
  ['Wagyu inside round', null, WHY.wagyu, 36584, 36585, 36586],
  ['Wagyu silverside', null, WHY.wagyu, 36588, 36589, 36590],
  ['Wagyu rump', null, WHY.wagyu, 36591, 36592, 36593],
  ['Wagyu tenderloin', null, WHY.wagyu, 8948, 8958, 11182, 11189, 36594],
  ['Wagyu fat', null, WHY.wagyu, 8946, 8947, 11183, 11184, 36572, 36579, 36587],

  ['Aigamo duck', null, WHY.named, 36770],
  ['Polar bear', null, WHY.named, 27303],
];

// Rows that belong under a listing that already exists: [id, the shown row, why]
const JOIN = [
  [3343, 27695, WHY.rule], // Swedish peanut butter
  [2173, 2172, WHY.rule], // Swedish fresh cheese
  [20618, 5783, WHY.rule], // UK sun-dried tomatoes
  [37798, 21616, WHY.rule], // French black olive
  [36370, 31069, WHY.rule], // Japanese salted herring roe
  [3956, 4823, WHY.moved], // Swedish "Älg" is moose, translated as elk
  [36042, 36002, WHY.moved], // Japanese muskmelon was under Cantaloupe
  [37705, 5411, WHY.moved], // French clementine was under Mandarin
  [21827, 21824, WHY.moved], // Australian prawns were under Shrimp
  [21829, 21824, WHY.moved],
  [21830, 21824, WHY.moved],
  [21831, 21824, WHY.moved],
];

const HIDE = [
  [30690, 'Curing salt is salt with sodium nitrite, used in small measured amounts to cure meat. It is not an eating salt and is unsafe used like one.'],
  [30691, 'Curing salt is salt with sodium nitrite, used in small measured amounts to cure meat. It is not an eating salt and is unsafe used like one.'],
];

const now = new Date().toISOString();
const ids = [...LISTINGS.flatMap(([, , , ...r]) => r), ...JOIN.map((j) => j[0]), ...JOIN.map((j) => j[1]), ...HIDE.map((h) => h[0])];
const before = new Map(q(`select raw_id, status, listing_name, food_type from food_curation where raw_id in (${[...new Set(ids)].join(',')})`).map((r) => [r.raw_id, r]));
for (const id of ids) if (!before.has(id)) throw new Error(`no row ${id}`);
const moved = new Set([...LISTINGS.flatMap(([, , , ...r]) => r), ...JOIN.map((j) => j[0]), ...HIDE.map((h) => h[0])]);
if (moved.size !== LISTINGS.flatMap(([, , , ...r]) => r).length + JOIN.length + HIDE.length) throw new Error('a row is placed twice');
for (const [id, front] of JOIN) {
  const f = before.get(front);
  if (f.status !== 'show' || moved.has(front)) throw new Error(`${id} joins ${front}, which is not a settled shown row`);
}

const types = new Set(q('select distinct food_type t from food_curation').map((r) => r.t));
const known = new Set(q(`select lower(listing_name) n from food_curation where status='show' and raw_id not in (${[...moved].join(',')})`).map((r) => r.n));
const sql = ['BEGIN;'];
const set = (id, status, listing, type, eq, code, why) => sql.push(
  `UPDATE food_curation SET status=${esc(status)}, decided_by='agent', reason_code=${esc(code)}, reason_text=${esc(why)}, listing_name=${esc(listing)}, food_type=${esc(type)}, equal_to_raw_id=${eq === null ? 'NULL' : eq}, curated_at=${esc(now)} WHERE raw_id=${id};`,
);
for (const [listing, type, why, front, ...rest] of LISTINGS) {
  if (known.has(listing.toLowerCase())) throw new Error(`listing already exists: ${listing}`);
  if (type && !types.has(type)) throw new Error(`unknown type ${type}`);
  set(front, 'show', listing, type || before.get(front).food_type, null, 'meets_criteria', why);
  for (const id of rest) set(id, 'compare', listing, type || before.get(id).food_type, front, 'meets_criteria', why);
}
for (const [id, front, why] of JOIN) set(id, 'compare', before.get(front).listing_name, before.get(front).food_type, front, 'meets_criteria', why);
for (const [id, why] of HIDE) set(id, 'hide', null, before.get(id).food_type, null, 'multi_ingredient', why);

sql.push('COMMIT;');
execFileSync('sqlite3', [DB], { input: sql.join('\n'), maxBuffer: 2e9 });

// A listing whose shown row moved away takes a new front: a USDA row when there is one.
const orphans = q(`select c.raw_id, c.listing_name, f.source_code, f.name_english from food_curation c join raw_foods f using(raw_id)
  left join food_curation t on t.raw_id = c.equal_to_raw_id
  where c.status='compare' and (t.status is not 'show' or t.listing_name is not c.listing_name)`);
const byListing = new Map();
for (const o of orphans) byListing.set(o.listing_name, [...(byListing.get(o.listing_name) || []), o]);
const fix = ['BEGIN;'];
for (const [listing, rows] of byListing) {
  const pick = rows.find((r) => r.source_code === 'USDA') || rows[0];
  console.log(`new front for ${listing}: ${pick.raw_id} ${pick.source_code} ${pick.name_english}`);
  fix.push(`UPDATE food_curation SET status='show', equal_to_raw_id=NULL WHERE raw_id=${pick.raw_id};`);
  fix.push(`UPDATE food_curation SET equal_to_raw_id=${pick.raw_id} WHERE raw_id IN (${rows.filter((r) => r !== pick).map((r) => r.raw_id).join(',') || 0});`);
}
fix.push('COMMIT;');
execFileSync('sqlite3', [DB], { input: fix.join('\n'), maxBuffer: 2e9 });

for (const r of q("select status, count(*) n from food_curation group by 1")) console.log(r.status, r.n);
const bad = q(`select count(*) n from food_curation c left join food_curation t on t.raw_id=c.equal_to_raw_id where c.status='compare' and (t.status is not 'show' or t.listing_name is not c.listing_name)`)[0].n;
const dup = q(`select count(*) n from (select lower(listing_name) from food_curation where status='show' group by 1 having count(*)>1)`)[0].n;
console.log('compare rows not pointing at their shown row:', bad, '| listings shown twice:', dup);
