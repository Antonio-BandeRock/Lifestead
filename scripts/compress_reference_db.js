// Packs the food list small for the phone app (2026-11-19).
//
// The phone carries assets/data/foods_reference.db.gz, not the 194 MB .db,
// and lib/referenceDbUnpack.ts unpacks it the first time the app opens and
// again only when REFERENCE_DB_VERSION changes. The desktop installer keeps
// carrying the plain .db. Run this whenever the food list changes (the
// backup script runs it too):
//   node scripts/compress_reference_db.js          writes the .gz when stale
//   node scripts/compress_reference_db.js --check  exits 1 if missing or stale
//
// The .gz is git-ignored like the .db; EAS uploads it for a build and an
// update, so publishing from C:/Dev/wt-tester needs it copied in too.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DB = path.join(ROOT, 'assets', 'data', 'foods_reference.db');
const GZ = `${DB}.gz`;

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function isCurrent() {
  if (!fs.existsSync(GZ)) return { current: false, why: 'missing' };
  const db = fs.readFileSync(DB);
  let unpacked;
  try {
    unpacked = zlib.gunzipSync(fs.readFileSync(GZ));
  } catch (error) {
    return { current: false, why: `unreadable (${error.message})` };
  }
  if (unpacked.length !== db.length || sha256(unpacked) !== sha256(db)) return { current: false, why: 'stale' };
  return { current: true };
}

function main() {
  if (!fs.existsSync(DB)) {
    console.error(`No food list at ${DB}`);
    process.exit(1);
  }
  const state = isCurrent();
  if (process.argv.includes('--check')) {
    if (state.current) {
      console.log(`current  ${path.relative(ROOT, GZ)} (${(fs.statSync(GZ).size / 1048576).toFixed(1)} MB)`);
      return;
    }
    console.error(`${path.relative(ROOT, GZ)} is ${state.why}: run node scripts/compress_reference_db.js`);
    process.exit(1);
  }
  if (state.current) {
    console.log(`current  ${path.relative(ROOT, GZ)} already matches the food list`);
    return;
  }
  const packed = zlib.gzipSync(fs.readFileSync(DB), { level: 9 });
  fs.writeFileSync(`${GZ}.tmp`, packed);
  fs.renameSync(`${GZ}.tmp`, GZ);
  const after = isCurrent();
  if (!after.current) {
    console.error(`Packed file did not unpack to the food list (${after.why})`);
    process.exit(1);
  }
  console.log(`packed   ${path.relative(ROOT, DB)} ${(fs.statSync(DB).size / 1048576).toFixed(1)} MB -> ${(packed.length / 1048576).toFixed(1)} MB`);
}

main();
