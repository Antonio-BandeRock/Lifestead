// Checks lib/foodNameRenames.ts: that records holding a food only by its
// name follow it to the name it shows under in the reference database the
// app ships, that nothing is deleted, and that a name already taken is left
// alone. Reads assets/data/foods_reference.db (or a path given as the first
// argument) and runs the move against an in-memory copy of the tables.
//
// Exits non-zero on any failure.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

function load(relPath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, () => {
    throw new Error('lib/foodNameRenames.ts must stay free of runtime imports');
  });
  return module.exports;
}

const { buildFoodRenames, movedName, moveFoodNames } = load('lib/foodNameRenames.ts');

let failures = 0;
function check(label, ok, detail) {
  if (ok) return;
  failures += 1;
  console.log(`FAIL ${label}${detail ? `: ${detail}` : ''}`);
}

const refPath = process.argv[2] || path.join(__dirname, '..', 'assets', 'data', 'foods_reference.db');
const ref = new DatabaseSync(refPath, { readOnly: true });
const cols = ref.prepare('PRAGMA table_info(foods)').all().map((c) => c.name);
if (!cols.includes('original_base_name')) {
  console.log(`${refPath} has no original_base_name column: not the unified database yet, nothing to move.`);
  process.exit(0);
}
const rows = ref
  .prepare('SELECT category, base_name, hidden, listing_name, original_category, original_base_name FROM foods')
  .all();
const renames = buildFoodRenames(rows);

// Every target is a food someone can see.
const shown = new Set(ref.prepare("SELECT category || '|' || base_name AS k FROM foods WHERE hidden = 0").all().map((r) => r.k));
let hiddenTargets = 0;
for (const target of renames.byCategory.values()) if (!shown.has(`${target.category}|${target.name}`)) hiddenTargets += 1;
check('every new name is a shown food', hiddenTargets === 0, `${hiddenTargets} point at a hidden row`);

// A few the unified database is known to have renamed.
const expect = [
  ['Fruit', 'Strawberry', 'Strawberries'],
  ['Fruit', 'Raspberry', 'Raspberries'],
  ['Veg', 'Red Tomato', 'Tomato'],
  ['Sweets', 'Standard Honey (Blossom Honey)', 'Honey'],
];
for (const [cat, oldName, newName] of expect) {
  const got = movedName(renames, cat, oldName);
  check(`${cat} ${oldName}`, got && got.name === newName, got ? `went to ${got.category} ${got.name}` : 'not moved');
}
// A name still shown as it is stays put.
for (const r of ref.prepare('SELECT category, base_name FROM foods WHERE hidden = 0 LIMIT 200').all()) {
  const got = movedName(renames, r.category, r.base_name);
  check(`${r.category} ${r.base_name} stays`, !got, got ? `moved to ${got.name}` : '');
}

// Run the move against a small set of records.
const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE kitchen_items (id TEXT PRIMARY KEY, category TEXT NOT NULL DEFAULT '', food_name TEXT NOT NULL);
  CREATE TABLE grocery_list_items (id TEXT PRIMARY KEY, category TEXT, food_name TEXT NOT NULL);
  CREATE TABLE food_trials (id TEXT PRIMARY KEY, food_name TEXT NOT NULL);
  CREATE TABLE my_safe_foods (food_key TEXT PRIMARY KEY, food_name TEXT NOT NULL, verdict TEXT, category TEXT);
  CREATE TABLE kitchen_low_marks (id TEXT PRIMARY KEY, food_key TEXT NOT NULL UNIQUE, food_name TEXT NOT NULL, category TEXT NOT NULL DEFAULT '');
  CREATE TABLE kitchen_usage_log (id TEXT PRIMARY KEY, kitchen_item_id TEXT, food_key TEXT NOT NULL, amount REAL);
  INSERT INTO kitchen_items VALUES ('k1', 'Fruit', 'Strawberry'), ('k2', 'Fruit', 'Something I typed');
  INSERT INTO grocery_list_items VALUES ('g1', 'Veg', 'Red Tomato');
  INSERT INTO food_trials VALUES ('t1', 'Standard Honey (Blossom Honey)');
  INSERT INTO my_safe_foods VALUES ('raspberry', 'Raspberry', 'safe', 'Fruit'), ('strawberry', 'Strawberry', 'safe', 'Fruit'), ('strawberries', 'Strawberries', 'avoid', 'Fruit');
  INSERT INTO kitchen_low_marks VALUES ('m1', 'fruit|strawberry', 'Strawberry', 'Fruit');
  INSERT INTO kitchen_usage_log VALUES ('u1', 'k1', 'fruit|strawberry', 1), ('u2', 'k1', 'veg|red tomato', 2);
`);
const wrap = {
  getAllAsync: async (sql, ...params) => db.prepare(sql).all(...params),
  runAsync: async (sql, ...params) => db.prepare(sql).run(...params),
};
const countBefore = ['kitchen_items', 'grocery_list_items', 'food_trials', 'my_safe_foods', 'kitchen_low_marks', 'kitchen_usage_log'].map(
  (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n,
);

moveFoodNames(wrap, renames).then(async () => {
  const one = (sql) => db.prepare(sql).get();
  check('kitchen item moved', one("SELECT food_name FROM kitchen_items WHERE id = 'k1'").food_name === 'Strawberries');
  check('typed kitchen item left', one("SELECT food_name FROM kitchen_items WHERE id = 'k2'").food_name === 'Something I typed');
  check('grocery line moved', one("SELECT food_name FROM grocery_list_items WHERE id = 'g1'").food_name === 'Tomato');
  check('food trial moved by name alone', one("SELECT food_name FROM food_trials WHERE id = 't1'").food_name === 'Honey');
  check('safe food moved', !!one("SELECT 1 AS x FROM my_safe_foods WHERE food_key = 'raspberries' AND food_name = 'Raspberries'"));
  check(
    'safe food whose new name is taken stays as it was',
    !!one("SELECT 1 AS x FROM my_safe_foods WHERE food_key = 'strawberry'") &&
      one("SELECT verdict FROM my_safe_foods WHERE food_key = 'strawberries'").verdict === 'avoid',
  );
  check('low mark moved', one("SELECT food_key FROM kitchen_low_marks WHERE id = 'm1'").food_key === 'fruit|strawberries');
  check('usage log followed the mark', one("SELECT food_key FROM kitchen_usage_log WHERE id = 'u1'").food_key === 'fruit|strawberries');
  check('usage log moved case-blind', one("SELECT food_key FROM kitchen_usage_log WHERE id = 'u2'").food_key === 'veg|tomato');
  const countAfter = ['kitchen_items', 'grocery_list_items', 'food_trials', 'my_safe_foods', 'kitchen_low_marks', 'kitchen_usage_log'].map(
    (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n,
  );
  check('nothing deleted', JSON.stringify(countBefore) === JSON.stringify(countAfter));

  // Running it twice changes nothing more.
  const again = await moveFoodNames(wrap, renames);
  check('a second run finds nothing', again === 0, `${again} rows changed`);

  console.log(
    failures
      ? `${failures} failure(s)`
      : `food name renames: ${renames.byCategory.size} names moved by category, ${renames.byName.size} by name alone, all checks passed`,
  );
  process.exit(failures ? 1 : 0);
});
