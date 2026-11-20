// Checks lib/gzipUnpack.ts against the real packed food list (2026-11-19):
// read 1 MB at a time the way the phone does, the output must be the .db
// byte for byte, the size gzip records must match, and a cut-short file must
// be refused rather than taken for the food list.
//   node scripts/test_gzip_unpack.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ts = require('typescript');
const Module = require('module');

const ROOT = path.resolve(__dirname, '..');
const DB = path.join(ROOT, 'assets', 'data', 'foods_reference.db');
const GZ = `${DB}.gz`;

function load(rel) {
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

let failures = 0;
function check(ok, label) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures += 1;
}

function ioFor(buffer, sink) {
  let offset = 0;
  return {
    packedSize: buffer.length,
    read(length) {
      const piece = buffer.subarray(offset, offset + length);
      offset += piece.length;
      return new Uint8Array(piece);
    },
    write(bytes) {
      sink.push(Buffer.from(bytes));
    },
  };
}

async function main() {
  const { unpackGzip, recordedUnpackedSize, UNPACK_READ_BYTES } = load('lib/gzipUnpack.ts');
  if (!fs.existsSync(GZ)) {
    console.error(`${GZ} is missing: run node scripts/compress_reference_db.js`);
    process.exit(1);
  }
  const packed = fs.readFileSync(GZ);
  const db = fs.readFileSync(DB);

  check(UNPACK_READ_BYTES === 1 << 20, 'reads 1 MB at a time');
  const expected = recordedUnpackedSize(new Uint8Array(packed.subarray(packed.length - 4)));
  check(expected === db.length, `recorded size ${expected} matches the food list ${db.length}`);

  const sink = [];
  const fractions = [];
  const io = ioFor(packed, sink);
  io.onProgress = (f) => fractions.push(f);
  let pauses = 0;
  io.pause = async () => {
    pauses += 1;
  };
  const written = await unpackGzip(io, expected);
  const out = Buffer.concat(sink);
  check(written === db.length, `wrote ${written} bytes`);
  check(
    crypto.createHash('sha256').update(out).digest('hex') === crypto.createHash('sha256').update(db).digest('hex'),
    'unpacked bytes are the food list byte for byte',
  );
  check(fractions.length === Math.ceil(packed.length / UNPACK_READ_BYTES), `progress reported each step (${fractions.length})`);
  check(fractions.every((f, i) => i === 0 || f > fractions[i - 1]) && fractions[fractions.length - 1] === 1, 'progress climbs to 1');
  check(pauses === fractions.length, 'pauses between steps so the screen can redraw');

  // A cut-short file: the last megabyte gone.
  const short = packed.subarray(0, packed.length - UNPACK_READ_BYTES);
  let refused = false;
  try {
    await unpackGzip(ioFor(short, []), expected);
  } catch {
    refused = true;
  }
  check(refused, 'a cut-short file is refused');

  // A wrong expected size is refused.
  refused = false;
  try {
    await unpackGzip(ioFor(packed, []), expected + 1);
  } catch {
    refused = true;
  }
  check(refused, 'a size that does not match is refused');

  let threw = false;
  try {
    recordedUnpackedSize(new Uint8Array(3));
  } catch {
    threw = true;
  }
  check(threw, 'recordedUnpackedSize needs four bytes');

  console.log(failures ? `${failures} failed` : 'all passed');
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
