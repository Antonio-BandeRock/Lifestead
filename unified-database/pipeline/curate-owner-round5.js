// The owner's fifth round of answers, 2026-11-09.
//   1. No salt warning under the 120 mg line. Salt added to a dish is counted
//      in the app instead (lib/unitConversion.ts, lib/db.ts), not here.
//   2. Alcohol carries a caution: recovery, medications, and cooking leaves
//      some of it in the dish.
//   3. Sesame and soybean oil carry allergy wording.
//   4. Margarine stays hidden. A person who wants it scans the product.
//   5. The stomach cancer sentence goes only where the evidence points:
//      vegetables and fruit salted the traditional Japanese and Chinese way.
//      Sauerkraut, kimchi and lactic sour pickles are left as they are.
// Run with --apply to write; with no flag it only prints what it would do.
// Run once: it refuses if any of its wording is already stored.
const { execFileSync } = require('child_process');
const path = require('path');
const C = require('./curate-cautions');

const DB = path.join(__dirname, '..', 'unified_foods.sqlite');
const APPLY = process.argv.includes('--apply');
const q = (s) => JSON.parse(execFileSync('sqlite3', ['-json', DB, s], { maxBuffer: 2e9 }).toString() || '[]');
const esc = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const now = new Date().toISOString();

const EAST_ASIAN_SALTED = [
  'Koji pickled daikon', 'Koji pickled eggplant', 'Pickled Chinese cabbage greens', 'Pickled cabbage',
  'Pickled eggplant', 'Pickled mizuna', 'Pickled mustard greens', 'Pickled napa cabbage', 'Pickled turnip',
  'Pickled turnip greens', 'Rice bran pickled cucumber', 'Rice bran pickled daikon', 'Rice bran pickled eggplant',
  'Salt-pickled cucumber', 'Salt-pickled oriental melon', 'Salted mustard greens', 'Takuan', 'Umeboshi',
];
const LEFT_AS_THEY_ARE = ['Sauerkraut', 'Kimchi', 'Fermented pickled cucumber', 'Pickles', 'Pickled cucumbers'];
const ALCOHOL_NAMES = ['baijiu (chinese grain spirit)', 'kirschwasser (cherry brandy)', 'mei gui lu jiu (chinese rose wine)', 'rose wine (mei gui lu jiu)', 'pulque'];

// Guards.
for (const text of [C.ALCOHOL, C.SOY_OIL, C.SESAME_OIL, C.SALT_PRESERVED_EAST_ASIAN]) {
  const n = q(`select count(*) n from food_curation where instr(coalesce(caution,''), ${esc(text)}) > 0`)[0].n
    + q(`select count(*) n from curated_named_ingredients where instr(coalesce(caution,''), ${esc(text)}) > 0`)[0].n;
  if (n) throw new Error('already applied: ' + text.slice(0, 50));
}
const shown = (listing) => q(`select caution from food_curation where status='show' and listing_name=${esc(listing)}`);
const one = (listing) => {
  const rows = shown(listing);
  if (rows.length !== 1) throw new Error(`expected one shown row for ${listing}, found ${rows.length}`);
  return rows[0].caution;
};
const alcohol = q(`select listing_name n, caution x from food_curation where status='show' and food_type='alcohol' order by 1`);
if (alcohol.length !== 29) throw new Error(`expected 29 alcohol listings, found ${alcohol.length}`);
for (const name of ALCOHOL_NAMES) {
  if (q(`select count(*) n from curated_named_ingredients where name=${esc(name)}`)[0].n !== 1) throw new Error('no named ingredient: ' + name);
}
for (const listing of ['Sesame oil', 'Soybean oil']) if (one(listing)) throw new Error(`${listing} already has a caution`);
for (const listing of EAST_ASIAN_SALTED) if (!one(listing)) throw new Error(`${listing} has no salt caution to add to`);
for (const listing of LEFT_AS_THEY_ARE) {
  for (const r of shown(listing)) if (/cancer/i.test(r.caution || '')) throw new Error(`${listing} mentions cancer`);
}
if (q(`select count(*) n from food_curation where status<>'hide' and lower(listing_name) like '%margarine%'`)[0].n) throw new Error('a margarine is listed');

const sql = ['BEGIN;'];
const put = (where, text) => sql.push(`UPDATE food_curation SET caution=${esc(text)}, curated_at=${esc(now)} WHERE ${where};`);

// 2. Alcohol: the alcohol caution first, any salt caution after it.
for (const { n, x } of alcohol) put(`listing_name=${esc(n)} AND status<>'hide'`, x ? `${C.ALCOHOL} ${x}` : C.ALCOHOL);
for (const name of ALCOHOL_NAMES) sql.push(`UPDATE curated_named_ingredients SET caution=${esc(C.ALCOHOL)} WHERE name=${esc(name)};`);
// 3. Allergy wording.
put(`listing_name='Sesame oil' AND status<>'hide'`, C.SESAME_OIL);
put(`listing_name='Soybean oil' AND status<>'hide'`, C.SOY_OIL);
// 5. The stomach cancer sentence, after the salt caution each already has.
for (const listing of EAST_ASIAN_SALTED) put(`listing_name=${esc(listing)} AND status<>'hide'`, `${one(listing)} ${C.SALT_PRESERVED_EAST_ASIAN}`);
sql.push('COMMIT;');

console.log(`alcohol listings: ${alcohol.length}, named alcohol: ${ALCOHOL_NAMES.length}, oils: 2, salted East Asian listings: ${EAST_ASIAN_SALTED.length}`);
if (!APPLY) {
  console.log('dry run; pass --apply to write');
  process.exit(0);
}
execFileSync('sqlite3', [DB], { input: sql.join('\n'), maxBuffer: 2e9 });
console.log('shown with a caution:', q(`select count(*) n from food_curation where status='show' and caution is not null`)[0].n);
console.log('counts:', JSON.stringify(q(`select status, count(*) n from food_curation group by 1`)));
