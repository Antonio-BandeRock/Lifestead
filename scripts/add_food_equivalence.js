#!/usr/bin/env node
/* global __dirname */
// Adds the food_equivalence table to assets/data/foods_reference.db (1.0.86.7).
//
// Owner's instruction, 2026-11-11: US numbers come first unless the person
// chooses another country's table in Profile, and then US fills the gaps;
// either way the person can see what every other country lists for the same
// food. Both need to know which rows in different national tables are the
// same food, and the names alone do not say: Germany calls it "Tomato" where
// USDA has "Red Tomato", and Canada's "Garlic stewed" is not USDA's raw clove.
//
// Every row gets a group_key. A USDA (or Derived) row's key is its own
// category|base_name|prep. Another table's row takes the key of the USDA row
// it was matched to, when it was matched; otherwise its own key, which is the
// same key any USDA row with that exact category, name and preparation has.
// No chains: a row joins at most one USDA row's group, so two foods can never
// end up together because each resembles a third.
//
// The matches in scripts/data/food_equivalence_matches.json were made one
// row at a time: rows whose English names are identical once punctuation is
// dropped were matched automatically, and every other row was read by a
// reviewer against the USDA rows of the same category, with the rules "same
// food, same form; no match when unsure". A row marked none keeps its own key.
//
// Idempotent: drops and refills only this table, which nothing in a person's
// own records refers to. Mirrored in scripts/build_food_reference_db.py.
//
// Usage: node scripts/add_food_equivalence.js [path/to/foods_reference.db]

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dbPath = process.argv[2] || path.join(__dirname, '..', 'assets', 'data', 'foods_reference.db');
const matchesPath = path.join(__dirname, 'data', 'food_equivalence_matches.json');

function ownKey(row) {
  return [row.category ?? '', (row.base_name ?? '').toLowerCase(), (row.prep_method ?? '').toLowerCase()].join('|');
}

function main() {
  const db = new DatabaseSync(dbPath);
  const matches = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));
  const rows = db.prepare('SELECT food_id, source, category, base_name, prep_method FROM foods').all();
  const usdaById = new Map();
  for (const row of rows) if (row.source === 'USDA') usdaById.set(row.food_id, row);

  const matchFor = new Map();
  let unknown = 0;
  for (const m of matches) {
    if (m.usda == null) continue;
    const target = usdaById.get(m.usda);
    if (!target) {
      unknown += 1;
      continue;
    }
    matchFor.set(`${m.source}|${m.food_id}`, ownKey(target));
  }

  db.exec('BEGIN');
  db.exec(`CREATE TABLE IF NOT EXISTS food_equivalence (
    food_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    group_key TEXT NOT NULL,
    matched INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (food_id, source)
  )`);
  db.exec('DELETE FROM food_equivalence');
  const insert = db.prepare('INSERT INTO food_equivalence (food_id, source, group_key, matched) VALUES (?, ?, ?, ?)');
  let matched = 0;
  for (const row of rows) {
    const mapped = row.source === 'USDA' || row.source === 'Derived' ? null : matchFor.get(`${row.source}|${row.food_id}`);
    if (mapped) matched += 1;
    insert.run(row.food_id, row.source, mapped ?? ownKey(row), mapped ? 1 : 0);
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_food_equivalence_group ON food_equivalence (group_key)');
  db.exec('COMMIT');

  const groups = db
    .prepare(
      `SELECT COUNT(*) AS n FROM (SELECT group_key FROM food_equivalence GROUP BY group_key
       HAVING SUM(source IN ('USDA','Derived')) > 0 AND SUM(source NOT IN ('USDA','Derived')) > 0)`,
    )
    .get().n;
  console.log(`food_equivalence: ${rows.length} rows, ${matched} matched to a USDA row (by identical name or by review), ${groups} groups with USDA and another table${unknown ? `, ${unknown} matches named a USDA row that no longer exists` : ''}.`);
  db.close();
}

main();
