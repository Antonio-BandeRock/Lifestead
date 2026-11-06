// Stores the ingredients recipes keep by name alone, so the merge has them with the rest of the curated data.
// No source has these foods: a recipe shows the name, with no nutrition behind it, as the app does today (owner's call, 2026-11-06).
// The table is rebuilt from the recipe check each run, so it always matches the check.
//   node curate-named-import.js <recipe_check.json>
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DB = path.resolve(__dirname, '..', 'unified_foods.sqlite');
const esc = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const { named } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const sql = ['BEGIN;',
  'CREATE TABLE IF NOT EXISTS curated_named_ingredients (name TEXT PRIMARY KEY, group_name TEXT NOT NULL, stand_in TEXT, caution TEXT, recipes INTEGER NOT NULL);',
  'DELETE FROM curated_named_ingredients;'];
for (const n of named) sql.push(`INSERT INTO curated_named_ingredients VALUES (${esc(n.name)}, ${esc(n.group)}, ${esc(n.stand)}, ${esc(n.caution)}, ${n.recipes});`);
sql.push('COMMIT;');
execFileSync('sqlite3', [DB], { input: sql.join('\n'), maxBuffer: 2e9 });
console.log(execFileSync('sqlite3', [DB, 'select group_name, count(*), count(caution) from curated_named_ingredients group by 1']).toString());
