// Cross-country matching against USDA, 2026-11-11.
// The owner asked that every listed food from another country's table be
// matched to the same food in the USDA table wherever one exists: same
// species, same cut, same form, same fat class. Near matches are not matches.
// Every compare link whose water, fat or protein differed beyond what one
// food shows between two national tables was read by hand, and each decision
// is in data/usda-match-decisions.txt:
//   G <id> <listing>  this row heads its own group under that listing name
//   L <id> <target>   this row is the same food as target (a head that is
//                     linked away takes the rows that pointed at it along)
//   H <id> <reason>   hide: cooked, canned, or values that cannot be right
//   N <id> <english>  the machine translation was wrong; replace name_english
//   Q <id> <note>     cooked or premade, held for the owner; only a doubt
//                     note is written, the row keeps its place
// Every compare row ends with the listing name of the shown row it points at.
// Run with --apply to write; with no flag it prints what it would do.
// Safe to run again: G, L and H set values, and N only replaces a name that
// still reads as the wrong translation it was written against... or is
// already corrected.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DB = path.join(__dirname, '..', 'unified_foods.sqlite');
const FILE = path.join(__dirname, 'data', 'usda-match-decisions.txt');
const APPLY = process.argv.includes('--apply');
const q = (s) => JSON.parse(execFileSync('sqlite3', ['-json', DB, s], { maxBuffer: 2e9 }).toString() || '[]');
const esc = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const now = new Date().toISOString();

const decisions = [];
fs.readFileSync(FILE, 'utf8').split(/\r?\n/).forEach((line, i) => {
  if (!line.trim() || line.startsWith('#')) return;
  const m = line.match(/^([GLHNQ]) (\d+) (.+)$/);
  if (!m) throw new Error(`line ${i + 1} not understood: ${line}`);
  decisions.push({ op: m[1], id: +m[2], arg: m[3].trim(), line: i + 1 });
});

const rows = new Map(q(`select c.raw_id id, c.status, c.listing_name ln, c.equal_to_raw_id eq, c.doubt_note dn, r.name_english en
  from food_curation c join raw_foods r using(raw_id)`).map((r) => [r.id, r]));
const before = new Map([...rows].map(([k, v]) => [k, { ...v }]));
const touched = new Set();
const why = new Map();
const names = [];
const doubts = [];

for (const d of decisions) {
  const r = rows.get(d.id);
  if (!r) throw new Error(`line ${d.line}: no curation row ${d.id}`);
  if (d.op === 'G') { r.status = 'show'; r.eq = null; r.ln = d.arg; touched.add(d.id); why.set(d.id, `heads ${d.arg}`); }
  else if (d.op === 'L') {
    const t = +d.arg;
    if (!rows.has(t)) throw new Error(`line ${d.line}: no target ${t}`);
    if (t === d.id) throw new Error(`line ${d.line}: linked to itself`);
    r.status = 'compare'; r.eq = t; touched.add(d.id); why.set(d.id, `same food as ${t}`);
  } else if (d.op === 'H') { r.status = 'hide'; r.eq = null; r.ln = null; touched.add(d.id); why.set(d.id, d.arg); }
  else if (d.op === 'N') names.push(d);
  else doubts.push(d);
}

// Follow every compare link to its shown head.
const head = (id) => {
  const seen = new Set();
  let cur = id;
  while (rows.get(cur).status === 'compare') {
    if (seen.has(cur)) throw new Error(`cycle through ${id}`);
    seen.add(cur);
    cur = rows.get(cur).eq;
    if (!rows.has(cur)) throw new Error(`${id} points at missing row`);
  }
  return cur;
};
const problems = [];
for (const [id, r] of rows) {
  if (r.status !== 'compare') continue;
  const h = head(id);
  if (rows.get(h).status !== 'show') { problems.push(`${id} ends at ${h}, which is ${rows.get(h).status}`); continue; }
  if (r.eq !== h) { r.eq = h; touched.add(id); }
  if (r.ln !== rows.get(h).ln) { r.ln = rows.get(h).ln; touched.add(id); }
}
for (const [id, r] of rows) {
  if (r.status !== 'hide' && !r.ln) problems.push(`${id} is ${r.status} with no listing name`);
  if (r.status === 'show' && r.eq) problems.push(`${id} is shown but points at ${r.eq}`);
}
// A listing name is one group: no two shown rows may share one unless they already did.
const dupes = (m) => {
  const c = new Map();
  for (const r of m.values()) if (r.status === 'show') c.set(r.ln, (c.get(r.ln) || 0) + 1);
  return new Set([...c].filter(([, n]) => n > 1).map(([k]) => k));
};
const oldDupes = dupes(before);
for (const ln of dupes(rows)) if (!oldDupes.has(ln)) problems.push(`two shown rows named ${ln}`);
for (const d of names) if (!rows.get(d.id) || rows.get(d.id).status === 'hide') problems.push(`N ${d.id}: row is hidden`);
if (problems.length) { console.error(problems.join('\n')); throw new Error(`${problems.length} problems; nothing written`); }

const sql = ['BEGIN;'];
let moved = 0, promoted = 0, hidden = 0;
for (const id of touched) {
  const a = before.get(id), b = rows.get(id);
  if (a.status === b.status && a.ln === b.ln && a.eq === b.eq) continue;
  moved++;
  if (a.status === 'hide' && b.status !== 'hide') promoted++;
  if (b.status === 'hide' && a.status !== 'hide') hidden++;
  const reason = why.get(id) || `listing follows ${b.eq}`;
  sql.push(`UPDATE food_curation SET status=${esc(b.status)}, listing_name=${esc(b.ln)}, equal_to_raw_id=${b.eq ?? 'NULL'},
    decided_by='agent', reason_code='usda_match', reason_text=${esc(reason)}, curated_at=${esc(now)} WHERE raw_id=${id};`);
}
let renamed = 0;
for (const d of names) {
  if (rows.get(d.id).en === d.arg) continue;
  renamed++;
  sql.push(`UPDATE raw_foods SET name_english=${esc(d.arg)}, name_english_source='translation_corrected' WHERE raw_id=${d.id};`);
}
let held = 0;
for (const d of doubts) {
  const note = `Held for the owner: ${d.arg}`;
  const dn = rows.get(d.id).dn || '';
  if (dn.includes(note)) continue;
  held++;
  sql.push(`UPDATE food_curation SET doubt_note=${esc(dn ? `${dn} ${note}` : note)} WHERE raw_id=${d.id};`);
}
sql.push('COMMIT;');

const count = (m, s) => [...m.values()].filter((r) => r.status === s).length;
console.log(`decisions ${decisions.length}; rows changed ${moved} (hidden ${hidden}, brought back ${promoted}); names corrected ${renamed}; held notes ${held}`);
console.log(`shown ${count(before, 'show')} -> ${count(rows, 'show')}, compare ${count(before, 'compare')} -> ${count(rows, 'compare')}, hidden ${count(before, 'hide')} -> ${count(rows, 'hide')}`);
const shownNames = (m) => new Set([...m.values()].filter((r) => r.status === 'show').map((r) => r.ln));
const after = shownNames(rows);
const gone = [...shownNames(before)].filter((n) => !after.has(n)).sort();
if (gone.length) console.log('shown names no longer used (' + gone.length + '): ' + gone.join(' | '));
if (!APPLY) { console.log('dry run; pass --apply to write'); process.exit(0); }
execFileSync('sqlite3', [DB], { input: sql.join('\n'), maxBuffer: 2e9 });
console.log('counts:', JSON.stringify(q(`select status, count(*) n from food_curation group by 1`)));
