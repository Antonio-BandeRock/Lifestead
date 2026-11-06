// Builds the curation report page from food_curation as it stands.
//   node curate-report.js <work folder> <template.html> <output.html>
// Reads the unified database only. The work folder supplies recipe_check.json, written by curate-recipe-check.js.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [work, template, output] = process.argv.slice(2);
const DB = path.resolve(__dirname, '..', 'unified_foods.sqlite');
const q = (s) => JSON.parse(execFileSync('sqlite3', ['-readonly', '-json', DB, s], { maxBuffer: 2e9 }).toString() || '[]');

const SOURCES = [
  ['USDA', 'USDA', 'United States'], ['Canada_CNF', 'Canada', 'Canada'], ['Germany_BLS', 'Germany', 'Germany'],
  ['France_Ciqual', 'France', 'France'], ['Sweden_Livsmedelsverket', 'Sweden', 'Sweden'], ['Japan_MEXT', 'Japan', 'Japan'],
  ['Norway_Matvaretabellen', 'Norway', 'Norway'], ['Australia_AFCD', 'Australia', 'Australia'], ['UK_CoFID', 'UK', 'United Kingdom'],
];
const srcIdx = new Map(SOURCES.map((s, i) => [s[0], i]));

const rows = q(`select c.raw_id id, f.source_code src, f.name_english en, f.name_original orig, f.category_original cat,
  c.status st, c.decided_by by, c.reason_code rc, c.reason_text why, c.listing_name name, c.food_type type, c.equal_to_raw_id eq, c.doubt_note doubt, c.caution caution,
  (select count(*) from raw_food_nutrients n where n.raw_id=c.raw_id) nut
  from food_curation c join raw_foods f using(raw_id)`);
for (const r of rows) if (!srcIdx.has(r.src)) throw new Error('unknown source ' + r.src);

const types = [...new Set(rows.map((r) => r.type))];
const reasons = [...new Set(rows.filter((r) => r.st === 'hide').map((r) => r.rc))];

const count = (list, key) => { const m = {}; for (const r of list) { const k = key(r); m[k] = (m[k] || 0) + 1; } return m; };
const hidden = rows.filter((r) => r.st === 'hide');
const kept = rows.filter((r) => r.st !== 'hide');

// One row per searchable food, each carrying every country's copy.
const byName = new Map();
for (const r of kept) { if (!byName.has(r.name)) byName.set(r.name, []); byName.get(r.name).push(r); }
const foods = [...byName.entries()].map(([name, copies]) => {
  const show = copies.find((c) => c.st === 'show');
  if (!show) throw new Error('no show row for ' + name);
  const qs = [...new Set(copies.map((c) => c.doubt).filter(Boolean))];
  return {
    n: name, t: show.type, a: srcIdx.get(show.src), w: show.why, q: qs, x: show.caution || null,
    c: copies.sort((x, y) => (x.st === 'show' ? -1 : y.st === 'show' ? 1 : srcIdx.get(x.src) - srcIdx.get(y.src)))
      .map((x) => [srcIdx.get(x.src), x.en || x.orig, x.nut > 0 ? 1 : 0]),
  };
}).sort((a, b) => a.n.localeCompare(b.n));

const compare = kept.filter((r) => r.st === 'compare');
const anchorUsda = foods.filter((f) => f.a === 0);
const earlier = q(`select r.* from whole_food_classifications r where r.reviewed=1`);
const stat = new Map(rows.map((r) => [r.id, r]));
const earlierKey = Object.keys(earlier[0]).find((k) => /classification|is_whole|decision/.test(k));
const earlierIsKeep = (v) => v === 1 || v === '1' || /^(keep|whole|show)/i.test(String(v));
const differ = earlier.filter((e) => earlierIsKeep(e[earlierKey]) !== (stat.get(e.raw_id).st !== 'hide'))
  .map((e) => { const r = stat.get(e.raw_id); return { en: r.en || r.orig, s: SOURCES[srcIdx.get(r.src)][1], was: earlierIsKeep(e[earlierKey]) ? 'kept' : 'hidden', now: r.st !== 'hide' ? 'kept as ' + r.name : 'hidden: ' + r.rc }; });
console.log('earlier key', earlierKey, 'values', count(earlier, (e) => String(e[earlierKey])), 'differ', differ.length, 'of', earlier.length);

// Sweden and Norway are the only sources with categories of their own.
const catRows = {};
for (const r of rows) {
  if (!r.cat) continue;
  const s = SOURCES[srcIdx.get(r.src)][1];
  catRows[s] = catRows[s] || {};
  catRows[s][r.cat] = catRows[s][r.cat] || [0, 0];
  catRows[s][r.cat][r.st === 'hide' ? 0 : 1] += 1;
}

const recipe = JSON.parse(fs.readFileSync(path.join(work, 'recipe_check.json'), 'utf8'));
const data = {
  sources: SOURCES.map((s) => s[1]), types, reasons,
  totals: { rows: rows.length, hide: hidden.length, show: foods.length, compare: compare.length, byRule: count(rows, (r) => r.by).rule, byReader: count(rows, (r) => r.by).agent, usdaAnchor: anchorUsda.length, otherAnchor: foods.length - anchorUsda.length, compareNut: compare.filter((c) => c.nut > 0).length, doubts: rows.filter((r) => r.doubt).length },
  srcTotal: count(rows, (r) => srcIdx.get(r.src)),
  typeHide: count(hidden, (r) => r.type + '|' + srcIdx.get(r.src)),
  typeKeep: count(kept, (r) => r.type + '|' + srcIdx.get(r.src)),
  reasonSrc: count(hidden, (r) => r.rc + '|' + srcIdx.get(r.src)),
  byFoods: count(foods, (f) => f.t),
  catRows, foods, recipe, differ, earlierN: earlier.length,
  hiddenDoubts: hidden.filter((r) => r.doubt).map((r) => [r.en || r.orig, srcIdx.get(r.src), r.rc, r.doubt]),
  hidden: hidden.map((r) => [r.en || r.orig, srcIdx.get(r.src), reasons.indexOf(r.rc), r.by === 'rule' ? 1 : 0]),
};
console.log(JSON.stringify(data.totals));
const page = fs.readFileSync(template, 'utf8').replace('/*DATA*/null', () => JSON.stringify(data).replace(/</g, '\\u003c'));
fs.writeFileSync(output, page);
console.log('page bytes', page.length);
