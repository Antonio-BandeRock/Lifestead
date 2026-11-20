// Checks the food list change files (2026-11-20): scripts/reference_db_patch.js
// works out the change, and the phone applies it the way lib/referenceDbPatch.ts
// does (the undo it kept, then the new change file).
//   node scripts/test_reference_patch.js          small made-up lists, quick
//   node scripts/test_reference_patch.js --real   also a changed copy of the real list

const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { diffDatabases, contentHash, literal } = require('./reference_db_patch');

const ROOT = path.resolve(__dirname, '..');
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lifestead-patch-test-'));
let failures = 0;
function check(ok, label) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures += 1;
}

function makeDb(name, statements) {
  const file = path.join(DIR, name);
  fs.rmSync(file, { force: true });
  const db = new DatabaseSync(file);
  db.exec(statements);
  return { file, db };
}

const SCHEMA = `
  CREATE TABLE foods (id INTEGER PRIMARY KEY, name TEXT NOT NULL, grams REAL, photo BLOB);
  CREATE TABLE scores (food_id INTEGER NOT NULL, tier TEXT NOT NULL, note TEXT);
  CREATE INDEX idx_scores_food ON scores(food_id);
  CREATE TABLE aliases (alias TEXT NOT NULL COLLATE NOCASE, base TEXT NOT NULL, UNIQUE (alias, base));
`;
const BASE_ROWS = `
  INSERT INTO foods VALUES (1, 'Apple', 5.0, NULL), (2, 'Bean''s', 0.1, X'00ff'), (3, 'Corn, sweet', NULL, NULL);
  INSERT INTO scores VALUES (1, 'A', NULL), (1, 'A', NULL), (2, 'B', 'x'), (3, 'C', 'it''s');
  INSERT INTO aliases VALUES ('kale', 'Kale'), ('Kale', 'Kale curly');
`;

function copy(from, name) {
  const file = path.join(DIR, name);
  fs.copyFileSync(from, file);
  return file;
}

function loadTs(rel) {
  const ts = require('typescript');
  const Module = require('module');
  const file = path.join(ROOT, rel);
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const m = new Module(file, module);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  m._compile(out, file);
  return m.exports;
}
const plan = loadTs('lib/referencePatchPlan.ts');

function heldOn(db) {
  const has = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(plan.PATCH_STATE_TABLE);
  return has ? plan.readHeldPatch(db.prepare(`SELECT key, value FROM ${plan.PATCH_STATE_TABLE}`).all()) : null;
}

// What the phone does (lib/referenceDbPatch.ts): read what the list holds,
// choose, and either apply over the kept undo or answer that it must unpack.
async function applyOnPhone(file, previousVersion, version, diff) {
  const patch = plan.parseReferencePatch(
    JSON.stringify({ format: 1, base: 'base', version, forward: diff.forward, undo: diff.undo }),
  );
  const db = new DatabaseSync(file);
  try {
    const choice = plan.chooseReferenceUpdate({ fileExists: true, held: heldOn(db), previousVersion, patch });
    if (choice.kind !== 'patch') return { kind: 'unpack' };
    const fractions = [];
    db.exec('BEGIN');
    await plan.applyReferencePatch(
      { exec: async (sql) => db.exec(sql), run: async (sql, params) => void db.prepare(sql).run(...params) },
      choice.undo,
      patch,
      (f) => fractions.push(f),
    );
    db.exec('COMMIT');
    return { kind: 'patch', hash: contentHash(db), held: heldOn(db), fractions };
  } finally {
    db.close();
  }
}

async function smallLists() {
  check(literal(5) === '5.0' && literal(5n) === '5' && literal(0.1) === '0.1', 'a whole-number REAL keeps its kind');
  check(literal("it's") === "'it''s'" && literal(null) === 'NULL', 'text is quoted and NULL is NULL');

  const base = makeDb('base.db', SCHEMA + BASE_ROWS);
  const v1 = makeDb(
    'v1.db',
    SCHEMA +
      BASE_ROWS +
      `
      UPDATE foods SET grams = 6.0 WHERE id = 1;
      DELETE FROM foods WHERE id = 3;
      INSERT INTO foods VALUES (4, 'Date', 2.0, X'');
      DELETE FROM scores WHERE rowid = (SELECT rowid FROM scores WHERE food_id = 1 LIMIT 1);
      INSERT INTO scores VALUES (2, 'B', 'x'), (4, 'A', NULL);
      UPDATE aliases SET alias = 'KALE' WHERE alias = 'kale' COLLATE BINARY;
    `,
  );
  const v2 = makeDb(
    'v2.db',
    SCHEMA +
      BASE_ROWS +
      `
      UPDATE foods SET name = 'Apple, raw' WHERE id = 1;
      INSERT INTO scores VALUES (3, 'C', 'it''s');
    `,
  );
  const shaped = makeDb('shaped.db', SCHEMA + BASE_ROWS + 'ALTER TABLE foods ADD COLUMN kind TEXT;');

  const baseHash = contentHash(base.db);
  const v1Hash = contentHash(v1.db);
  const v2Hash = contentHash(v2.db);
  const same = diffDatabases(base.db, base.db);
  check(same && same.forward.length === 0 && same.undo.length === 0 && same.tables.length === 0, 'no change gives an empty change file');
  check(diffDatabases(base.db, shaped.db) === null, 'a new column asks for a new base');

  const p1 = diffDatabases(base.db, v1.db);
  const p2 = diffDatabases(base.db, v2.db);
  const counts = Object.fromEntries(p1.tables.map((t) => [t.table, `-${t.removed} +${t.added}`]));
  check(counts.foods === '-2 +2' && counts.scores === '-1 +2' && counts.aliases === '-1 +1', `counts what changed (${JSON.stringify(counts)})`);

  // A phone that unpacked the base before change files existed: no state
  // rows, and the version it recorded is the base's.
  const phone = copy(base.file, 'phone.db');
  const first = await applyOnPhone(phone, 'base', 'v1', p1);
  check(first.kind === 'patch' && first.hash === v1Hash, 'the base plus the change file is the new list');
  check(first.held && first.held.base === 'base' && first.held.undo.length === p1.undo.length, 'the list keeps the undo of what it applied');
  check(first.fractions.length > 0 && first.fractions[first.fractions.length - 1] === 1, 'progress reaches the end');
  // An update: the phone holds v1 and its kept undo; p2 arrives.
  const second = await applyOnPhone(phone, 'v1', 'v2', p2);
  check(second.kind === 'patch' && second.hash === v2Hash, 'the kept undo then the next change file is the next list');
  // Back to the base through p2's undo and an empty change file.
  const third = await applyOnPhone(phone, 'v2', 'v3', same);
  check(third.kind === 'patch' && third.hash === baseHash, 'the undo alone brings the base back');

  // A list the phone cannot place unpacks the base instead.
  const stranger = copy(v2.file, 'stranger.db');
  check((await applyOnPhone(stranger, 'something else', 'v1', p1)).kind === 'unpack', 'an unknown list unpacks the base');
  const p = plan.parseReferencePatch(JSON.stringify({ format: 1, base: 'b', version: 'v', forward: [], undo: [] }));
  check(plan.chooseReferenceUpdate({ fileExists: false, held: null, previousVersion: 'b', patch: p }).kind === 'unpack', 'no list on the phone unpacks the base');
  check(plan.chooseReferenceUpdate({ fileExists: true, held: { base: 'old', undo: [] }, previousVersion: 'b', patch: p }).kind === 'unpack', 'a list built on another base unpacks the new one');
  check(plan.readHeldPatch([{ key: 'base', value: 'b' }, { key: 'undo', value: 'not json' }]) === null, 'damaged state rows are not trusted');
  let refused = false;
  try {
    plan.parseReferencePatch(JSON.stringify({ format: 2, base: 'b', version: 'v', forward: [], undo: [] }));
  } catch {
    refused = true;
  }
  check(refused, 'a change file of an unknown format is refused');

  // The case-blind column: 'KALE' and 'kale' are different rows to the change file.
  const db = new DatabaseSync(copy(base.file, 'case.db'));
  db.exec(p1.forward.join('\n'));
  const aliases = db.prepare('SELECT alias FROM aliases ORDER BY base').all().map((r) => r.alias);
  db.close();
  check(JSON.stringify(aliases) === '["KALE","Kale"]', `a NOCASE column changes only the row that changed (${aliases})`);

  for (const d of [base, v1, v2, shaped]) d.db.close();
}

async function realList() {
  const source = path.join(ROOT, 'assets', 'data', 'foods_reference.db');
  const changedFile = copy(source, 'real-changed.db');
  const changed = new DatabaseSync(changedFile);
  changed.exec(`
    UPDATE food_nutrients SET amount_per_100g = amount_per_100g * 1.01 WHERE rowid IN (SELECT rowid FROM food_nutrients LIMIT 3000);
    DELETE FROM food_scores WHERE rowid IN (SELECT rowid FROM food_scores LIMIT 500);
    INSERT INTO food_aliases SELECT alias || ' test', base_name, food_category, reason, original_base_name, original_category FROM food_aliases LIMIT 5;
    DELETE FROM curated_recipe_ingredients WHERE rowid IN (SELECT rowid FROM curated_recipe_ingredients LIMIT 40);
  `);
  const started = Date.now();
  const original = new DatabaseSync(source, { readOnly: true });
  const patch = diffDatabases(original, changed);
  const wanted = contentHash(changed);
  original.close();
  changed.close();
  const bytes = require('zlib').gzipSync(JSON.stringify(patch), { level: 9 }).length;
  console.log(`     worked out in ${((Date.now() - started) / 1000).toFixed(1)} s, ${(bytes / 1024).toFixed(0)} KB packed: ${patch.tables.map((t) => `${t.table} -${t.removed} +${t.added}`).join(', ')}`);
  const phoneFile = copy(source, 'real-phone.db');
  const applyStarted = Date.now();
  const got = await applyOnPhone(phoneFile, 'base', 'v1', { forward: patch.forward, undo: patch.undo });
  console.log(`     applied and checked in ${((Date.now() - applyStarted) / 1000).toFixed(1)} s`);
  check(got.kind === 'patch' && got.hash === wanted, 'the real list plus its change file is the changed list');
  check(bytes < 2 * 1048576, 'a change of a few thousand rows packs under 2 MB');
}

async function main() {
  await smallLists();
  if (process.argv.includes('--real')) await realList();
}

main().catch((error) => {
  console.error(error);
  failures += 1;
}).finally(() => {
  try {
    fs.rmSync(DIR, { recursive: true, force: true });
  } catch {
    // A database left open by a failed step keeps its file; the temp folder goes later.
  }
  console.log(failures ? `${failures} failed` : 'all passed');
  process.exit(failures ? 1 : 0);
});
