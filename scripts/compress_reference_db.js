// Packs the food list for the phone app: a frozen base plus a small change
// file (2026-11-19, change files 2026-11-20).
//
// The phone carries assets/data/foods_reference.db.gz, the base, and never
// downloads it again while it stays the same. Beside it rides
// assets/data/foods_reference.patch.gz: the rows that turn the base into
// today's list, and the undo, worked out by scripts/reference_db_patch.js and
// applied on the phone by lib/referenceDbPatch.ts. So a change to the food
// list reaches a phone as a file the size of the change. The desktop
// installer keeps carrying the plain .db.
//
// assets/data/foods_reference.base.json (in git) records which list the base
// is. A new base is made only when the list's shape changes (a table, column
// or index) or the change file has grown past a quarter of the base; that
// update carries the whole list once.
//
//   node scripts/compress_reference_db.js          refreshes the change file
//   node scripts/compress_reference_db.js --check  exits 1 if anything is stale
//   node scripts/compress_reference_db.js --rebase makes today's list the base
//
// Both .gz files are git-ignored like the .db and backed up by
// scripts/backup_reference_dbs.js; EAS uploads them, so publishing from
// C:/Dev/wt-tester needs both copied in.

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const { diffDatabases, contentHash } = require('./reference_db_patch');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'assets', 'data');
const DB = path.join(DATA, 'foods_reference.db');
const BASE_GZ = path.join(DATA, 'foods_reference.db.gz');
const BASE_JSON = path.join(DATA, 'foods_reference.base.json');
const PATCH_GZ = path.join(DATA, 'foods_reference.patch.gz');
const PATCH_FORMAT = 1;
const REBASE_SHARE = 0.25;

const rel = (file) => path.relative(ROOT, file).replace(/\\/g, '/');
const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function referenceVersion() {
  const text = fs.readFileSync(path.join(ROOT, 'lib', 'referenceDbVersion.ts'), 'utf8');
  const match = text.match(/export const REFERENCE_DB_VERSION = "(\d+)"/);
  if (!match) throw new Error('REFERENCE_DB_VERSION not found in lib/referenceDbVersion.ts');
  return match[1];
}

function writeAtomic(file, bytes) {
  fs.writeFileSync(`${file}.tmp`, bytes);
  fs.renameSync(`${file}.tmp`, file);
}

function readBaseRecord() {
  if (!fs.existsSync(BASE_JSON)) return null;
  return JSON.parse(fs.readFileSync(BASE_JSON, 'utf8'));
}

// The base unpacked to a scratch file, checked against its record.
function unpackBase(record) {
  if (!fs.existsSync(BASE_GZ)) {
    throw new Error(`${rel(BASE_GZ)} is missing: copy it from the reference-dbs backup folder, or run with --rebase`);
  }
  const bytes = zlib.gunzipSync(fs.readFileSync(BASE_GZ));
  if (sha256(bytes) !== record.sha256) {
    throw new Error(`${rel(BASE_GZ)} is not the base ${rel(BASE_JSON)} records (version ${record.version}). Restore it from the backup folder, or run with --rebase`);
  }
  const file = path.join(os.tmpdir(), `lifestead-reference-base-${process.pid}.db`);
  fs.writeFileSync(file, bytes);
  return file;
}

function packPatch(patch) {
  return zlib.gzipSync(Buffer.from(JSON.stringify(patch), 'utf8'), { level: 9 });
}

function readPatch() {
  if (!fs.existsSync(PATCH_GZ)) return null;
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(PATCH_GZ)).toString('utf8'));
}

// Applies a change file to a copy of the base the way the phone does, and
// confirms the copy becomes today's list, and that the undo brings the base
// back.
function proveOnCopy(baseFile, patch, currentHash, baseHash) {
  const copy = `${baseFile}.proof`;
  fs.copyFileSync(baseFile, copy);
  try {
    const db = new DatabaseSync(copy);
    try {
      db.exec('BEGIN');
      db.exec(patch.forward.join('\n'));
      db.exec('COMMIT');
      if (contentHash(db) !== currentHash) return 'the change file does not turn the base into the food list';
      db.exec('BEGIN');
      db.exec(patch.undo.join('\n'));
      db.exec('COMMIT');
      if (contentHash(db) !== baseHash) return 'the undo does not bring the base back';
    } finally {
      db.close();
    }
  } finally {
    fs.rmSync(copy, { force: true });
  }
  return null;
}

function rebase(version, why) {
  const bytes = fs.readFileSync(DB);
  const packed = zlib.gzipSync(bytes, { level: 9 });
  writeAtomic(BASE_GZ, packed);
  fs.writeFileSync(BASE_JSON, `${JSON.stringify({ version, sha256: sha256(bytes), packedBytes: packed.length }, null, 2)}\n`);
  writeAtomic(PATCH_GZ, packPatch({ format: PATCH_FORMAT, base: version, version, forward: [], undo: [], tables: [] }));
  console.log(`new base ${rel(BASE_GZ)} ${mb(bytes.length)} -> ${mb(packed.length)} (${why})`);
  console.log('         The next update carries the whole food list once; every phone downloads it.');
}

function main() {
  if (!fs.existsSync(DB)) {
    console.error(`No food list at ${DB}`);
    process.exit(1);
  }
  const check = process.argv.includes('--check');
  const version = referenceVersion();
  const record = readBaseRecord();

  if (process.argv.includes('--rebase') || !record) {
    if (check) {
      console.error(`${rel(BASE_JSON)} is missing: run node scripts/compress_reference_db.js --rebase`);
      process.exit(1);
    }
    rebase(version, record ? 'asked for' : 'no base recorded yet');
    return;
  }

  // The list is still the base byte for byte: nothing to work out.
  const dbBytes = fs.readFileSync(DB);
  if (sha256(dbBytes) === record.sha256 && fs.existsSync(BASE_GZ)) {
    const patch = { format: PATCH_FORMAT, base: record.version, version, forward: [], undo: [], tables: [] };
    const existing = readPatch();
    if (existing && JSON.stringify(existing) === JSON.stringify(patch)) {
      console.log(`current  base ${record.version} (${mb(fs.statSync(BASE_GZ).size)}), no change since the base`);
      return;
    }
    if (check) {
      console.error(`${rel(PATCH_GZ)} is ${existing ? 'stale' : 'missing'}: run node scripts/compress_reference_db.js`);
      process.exit(1);
    }
    writeAtomic(PATCH_GZ, packPatch(patch));
    console.log(`changes  ${rel(PATCH_GZ)} written: no change since the base`);
    return;
  }

  const baseFile = unpackBase(record);
  try {
    const baseDb = new DatabaseSync(baseFile, { readOnly: true });
    const currentDb = new DatabaseSync(DB, { readOnly: true });
    let diff;
    let baseHash;
    let currentHash;
    try {
      diff = diffDatabases(baseDb, currentDb);
      baseHash = contentHash(baseDb);
      currentHash = contentHash(currentDb);
    } finally {
      baseDb.close();
      currentDb.close();
    }

    if (!diff) {
      if (check) {
        console.error('The food list changed shape since the base: run node scripts/compress_reference_db.js');
        process.exit(1);
      }
      rebase(version, 'a table, column or index changed');
      return;
    }
    if (diff.tables.length && version === record.version) {
      console.error(`The food list differs from the base but REFERENCE_DB_VERSION is still ${version}: bump it so phones take the change`);
      process.exit(1);
    }

    const patch = { format: PATCH_FORMAT, base: record.version, version, forward: diff.forward, undo: diff.undo, tables: diff.tables };
    const existing = readPatch();
    const same = existing && JSON.stringify(existing) === JSON.stringify(patch);
    const summary = diff.tables.length
      ? diff.tables.map((t) => `${t.table} -${t.removed} +${t.added}`).join(', ')
      : 'no change since the base';

    if (check) {
      if (!same) {
        console.error(`${rel(PATCH_GZ)} is ${existing ? 'stale' : 'missing'}: run node scripts/compress_reference_db.js`);
        process.exit(1);
      }
      const failure = proveOnCopy(baseFile, patch, currentHash, baseHash);
      if (failure) {
        console.error(`${rel(PATCH_GZ)}: ${failure}`);
        process.exit(1);
      }
      console.log(`current  base ${record.version} (${mb(fs.statSync(BASE_GZ).size)}), change file ${mb(fs.statSync(PATCH_GZ).size)}: ${summary}`);
      return;
    }

    if (same) {
      console.log(`current  ${rel(PATCH_GZ)} already matches the food list (${summary})`);
      return;
    }
    const packed = packPatch(patch);
    if (packed.length > REBASE_SHARE * record.packedBytes) {
      rebase(version, `the change file reached ${mb(packed.length)}, past a quarter of the base`);
      return;
    }
    const failure = proveOnCopy(baseFile, patch, currentHash, baseHash);
    if (failure) {
      console.error(`Not written: ${failure}`);
      process.exit(1);
    }
    writeAtomic(PATCH_GZ, packed);
    console.log(`changes  ${rel(PATCH_GZ)} ${mb(packed.length)} against base ${record.version}: ${summary}`);
  } finally {
    fs.rmSync(baseFile, { force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
