// Linoleic acid, ALA, EPA, DHA and phytosterols, 2026-11-27. The source adapters map these five now
// (sources/legacy-v3-shared.js, norway.js, sweden.js), so a fresh ingest brings them in. This puts
// the same values on the raw rows already in unified_foods.sqlite without re-ingesting anything else:
// it reads each source the way its adapter does, deletes only these five codes and writes them again,
// so running it twice gives the same result. Run with --apply to write; with no flag it only counts.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const legacy = require('../sources/legacy-v3-shared.js');
const { NORWAY_NUTRIENT_MAP } = require('../sources/norway.js');
const { SWEDEN_COLUMN_INDEX } = require('../sources/sweden.js');

const SQLITE = process.env.SQLITE_EXE || 'C:/Users/TonyR/AppData/Local/Android/Sdk/platform-tools/sqlite3.exe';
const DB = path.join(__dirname, '..', 'unified_foods.sqlite');
const APPLY = process.argv.includes('--apply');
const CODES = legacy.FATTY_ACID_CODES;
const codeList = CODES.map((c) => `'${c}'`).join(',');
const q = (db, sql) => JSON.parse(execFileSync(SQLITE, ['-readonly', '-json', db, sql], { maxBuffer: 2e9 }).toString() || '[]');

const LEGACY = ['USDA', 'Canada_CNF', 'UK_CoFID', 'Australia_AFCD', 'Germany_BLS', 'Japan_MEXT', 'France_Ciqual'];

const rows = []; // [raw_id, code, amount]

// Legacy national tables: same tags, priority and scaling as ingestLegacySource.
const cache = legacy.ensureExtracted();
const fattyTags = Object.entries(legacy.NUTRIENT_TAG_MAP).filter(([, c]) => CODES.includes(c)).map(([t]) => t);
const tagSql = fattyTags.map((t) => `'${t.replace(/'/g, "''")}'`).join(',');
for (const src of LEGACY) {
  const rawIds = new Map(q(DB, `select raw_id, source_food_id from raw_foods where source_code='${src}'`).map((r) => [r.source_food_id, r.raw_id]));
  const vals = q(cache, `select fn.food_id, fn.tag, fn.value from food_nutrients fn join foods f using(food_id) where f.source='${src}' and fn.tag in (${tagSql})`);
  const best = new Map();
  for (const v of vals) {
    if (typeof v.value !== 'number') continue;
    const rawId = rawIds.get(String(v.food_id));
    if (!rawId) continue;
    const code = legacy.NUTRIENT_TAG_MAP[v.tag];
    const rank = legacy.TAG_PRIORITY[v.tag] || 0;
    const key = `${rawId}|${code}`;
    const prev = best.get(key);
    if (!prev || rank < prev.rank) {
      best.set(key, { rawId, code, rank, amount: v.value * ((legacy.SOURCE_SCALE[src] || {})[code] || 1) });
    }
  }
  for (const b of best.values()) rows.push([b.rawId, b.code, b.amount]);
  console.log(`${src}: ${best.size} values`);
}

// Norway: constituents in raw_json.
{
  let n = 0;
  for (const r of q(DB, `select raw_id, raw_json from raw_foods where source_code='Norway_Matvaretabellen'`)) {
    const rec = JSON.parse(r.raw_json);
    for (const c of rec.constituents || []) {
      const code = NORWAY_NUTRIENT_MAP[c.nutrientId];
      if (CODES.includes(code) && typeof c.quantity === 'number') { rows.push([r.raw_id, code, c.quantity]); n++; }
    }
  }
  console.log(`Norway_Matvaretabellen: ${n} values`);
}

// Sweden: raw_json is the source row.
{
  let n = 0;
  for (const r of q(DB, `select raw_id, raw_json from raw_foods where source_code='Sweden_Livsmedelsverket'`)) {
    const row = JSON.parse(r.raw_json);
    for (const code of CODES) {
      const idx = SWEDEN_COLUMN_INDEX[code];
      if (idx === undefined) continue;
      if (typeof row[idx] === 'number') { rows.push([r.raw_id, code, row[idx]]); n++; }
    }
  }
  console.log(`Sweden_Livsmedelsverket: ${n} values`);
}

const byCode = {};
for (const [, c] of rows) byCode[c] = (byCode[c] || 0) + 1;
console.log('By nutrient:', byCode, 'total', rows.length);

if (!APPLY) { console.log('Dry run. Pass --apply to write.'); process.exit(0); }

const sqlFile = path.join(os.tmpdir(), `add-fatty-acids-${process.pid}.sql`);
const lines = ['BEGIN;', `DELETE FROM raw_food_nutrients WHERE nutrient_code IN (${codeList});`];
for (const [id, c, a] of rows) lines.push(`INSERT INTO raw_food_nutrients (raw_id, nutrient_code, amount_per_100g, unit) VALUES (${id}, '${c}', ${a}, 'g');`);
lines.push('COMMIT;');
fs.writeFileSync(sqlFile, lines.join('\n'));
execFileSync(SQLITE, [DB, `.read ${sqlFile.replace(/\\/g, '/')}`], { stdio: 'inherit' });
fs.unlinkSync(sqlFile);
console.log(`Wrote ${rows.length} values.`);
