// Works out what changed in the food list since the base the phones carry
// (2026-11-20, Tony: "send food list changes as small files instead").
//
// The phone app carries a frozen base, assets/data/foods_reference.db.gz,
// which an update never changes, so the phone never downloads it again.
// Beside it rides assets/data/foods_reference.patch.gz: the rows to take out
// and put in that turn the base into today's list, plus the opposite (the
// undo), which the phone keeps so the next change file can start from the
// base again. lib/referenceDbPatch.ts applies it.
//
// Rows are compared whole, as a count of identical rows per table, so a table
// with no key, duplicate rows, NULLs, whole-number REALs and BLOBs all come
// out exact. A changed row is the old row taken out and the new one put in.
//
// Used by scripts/compress_reference_db.js and scripts/test_reference_patch.js.

const crypto = require('crypto');

// Where the phone notes which change file its list holds
// (lib/referencePatchPlan.ts). Never part of the list itself.
const STATE_TABLE = 'lifestead_patch_state';

// Integers are read as BigInt so a REAL that holds a whole number (5.0) keeps
// its kind: written back as 5.0, never as the integer 5.
function literal(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`A number the food list cannot hold: ${value}`);
    const text = String(value);
    return /[.eE]/.test(text) ? text : `${text}.0`;
  }
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  if (value instanceof Uint8Array) return `X'${Buffer.from(value).toString('hex')}'`;
  throw new Error(`A value the food list cannot hold: ${typeof value}`);
}

function quoteName(name) {
  return `"${name.replace(/"/g, '""')}"`;
}

function userTables(db) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> ? ORDER BY name")
    .all(STATE_TABLE)
    .map((row) => row.name);
}

// Everything that shapes the list other than its rows: tables, columns,
// indexes, views and triggers. A change here needs a new base.
function schemaOf(db) {
  return db
    .prepare("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND tbl_name <> ? ORDER BY type, name")
    .all(STATE_TABLE)
    .map((row) => `${row.type} ${row.name} ${row.sql ?? ''}`)
    .join('\n');
}

function columnsOf(db, table) {
  return db.prepare(`PRAGMA table_info(${quoteName(table)})`).all().map((row) => row.name);
}

// Each row as one string of SQL literals, counted.
function rowCounts(db, table, columns) {
  const statement = db.prepare(`SELECT ${columns.map(quoteName).join(', ')} FROM ${quoteName(table)}`);
  statement.setReadBigInts(true);
  statement.setReturnArrays(true);
  const counts = new Map();
  for (const row of statement.iterate()) {
    const key = row.map(literal).join(',');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function splitLiterals(key, columnCount) {
  // Literals never hold a bare comma outside quotes, so a small scanner
  // splits them back apart.
  const parts = [];
  let start = 0;
  let inText = false;
  for (let i = 0; i < key.length; i += 1) {
    const ch = key[i];
    if (inText) {
      if (ch === "'") {
        if (key[i + 1] === "'") i += 1;
        else inText = false;
      }
    } else if (ch === "'") {
      inText = true;
    } else if (ch === ',') {
      parts.push(key.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(key.slice(start));
  if (parts.length !== columnCount) throw new Error(`A row split into ${parts.length} values, expected ${columnCount}`);
  return parts;
}

function deleteSql(table, columns, key, count) {
  const values = splitLiterals(key, columns.length);
  const where = columns
    .map((column, i) => {
      if (values[i] === 'NULL') return `${quoteName(column)} IS NULL`;
      // BINARY so a NOCASE column never matches a row differing only in case.
      const collate = values[i].startsWith("'") ? ' COLLATE BINARY' : '';
      return `${quoteName(column)} = ${values[i]}${collate}`;
    })
    .join(' AND ');
  const name = quoteName(table);
  return `DELETE FROM ${name} WHERE rowid IN (SELECT rowid FROM ${name} WHERE ${where} LIMIT ${count});`;
}

function insertSql(table, columns, keys) {
  // Several rows per statement keeps the file small; 200 stays well under
  // SQLite's limits on a statement.
  const out = [];
  const head = `INSERT INTO ${quoteName(table)} (${columns.map(quoteName).join(', ')}) VALUES `;
  for (let i = 0; i < keys.length; i += 200) {
    out.push(`${head}${keys.slice(i, i + 200).map((key) => `(${key})`).join(',')};`);
  }
  return out;
}

// Rows in `from` that `to` lacks, with how many copies.
function surplus(from, to) {
  const out = [];
  for (const [key, count] of from) {
    const extra = count - (to.get(key) ?? 0);
    if (extra > 0) out.push([key, extra]);
  }
  return out;
}

// Turns `from` into `to`, table by table: what to take out, then what to put in.
function stepsBetween(table, columns, from, to) {
  const removed = surplus(from, to);
  const added = surplus(to, from);
  if (!removed.length && !added.length) return null;
  const sql = removed.map(([key, count]) => deleteSql(table, columns, key, count));
  const insertKeys = [];
  for (const [key, count] of added) for (let i = 0; i < count; i += 1) insertKeys.push(key);
  sql.push(...insertSql(table, columns, insertKeys));
  return { sql, removed: removed.reduce((n, [, c]) => n + c, 0), added: insertKeys.length };
}

// Compares two open node:sqlite databases. Returns null when their shape
// differs (a new base is needed), else the forward and undo SQL statements
// (lists, so the phone can run them a batch at a time and show how far it
// has got) and a
// per-table count of rows taken out and put in.
function diffDatabases(baseDb, currentDb) {
  if (schemaOf(baseDb) !== schemaOf(currentDb)) return null;
  const forward = [];
  const undo = [];
  const tables = [];
  for (const table of userTables(currentDb)) {
    const columns = columnsOf(currentDb, table);
    const base = rowCounts(baseDb, table, columns);
    const current = rowCounts(currentDb, table, columns);
    const ahead = stepsBetween(table, columns, base, current);
    if (!ahead) continue;
    const back = stepsBetween(table, columns, current, base);
    forward.push(...ahead.sql);
    undo.push(...back.sql);
    tables.push({ table, removed: ahead.removed, added: ahead.added });
  }
  return { forward, undo, tables };
}

// A fingerprint of every row in every table, independent of row order, so a
// patched copy can be checked against the list it was meant to become.
function contentHash(db) {
  const hash = crypto.createHash('sha256');
  hash.update(schemaOf(db));
  for (const table of userTables(db)) {
    const columns = columnsOf(db, table);
    const keys = [...rowCounts(db, table, columns).entries()].map(([key, count]) => `${count}x${key}`).sort();
    hash.update(`\n#${table}\n`);
    for (const key of keys) hash.update(`${key}\n`);
  }
  return hash.digest('hex');
}

module.exports = { diffDatabases, contentHash, literal };
