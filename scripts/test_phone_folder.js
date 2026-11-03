// Checks how a folder chosen in Android's picker is named and described
// (lib/phoneFolder.ts): a file's name read from its address, an address that
// names nothing coming back as null rather than a guess, and where a folder
// sits written the way a person reads it.
//
// The two functions are pure, so this runs here rather than needing a phone.
// Exits non-zero on any failure.

// eslint-config-expo lints this repo as app code, which has no __dirname.
// This is a plain Node script run with node, so it does.
/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(relPath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  // The only runtime import at module scope is the file-name wording, which
  // these two functions never use.
  new Function('exports', 'module', 'require', outputText)(module.exports, module, () => ({}));
  return module.exports;
}

const { describePhoneAddress, isPhoneFolder, nameFromAddress } = load('lib/phoneFolder.ts');

let checks = 0;
let failures = 0;
function expect(label, actual, wanted) {
  checks += 1;
  if (actual !== wanted) {
    failures += 1;
    console.log('FAIL ' + label + ': got ' + JSON.stringify(actual) + ', wanted ' + JSON.stringify(wanted));
  }
}

const TREE = 'content://com.android.externalstorage.documents/tree/primary%3ASync%2FLifestead';
const FILE =
  'content://com.android.externalstorage.documents/tree/primary%3ASync%2FLifestead/document/primary%3ASync%2FLifestead%2Finside-story-sync.json';
const CARD = 'content://com.android.externalstorage.documents/tree/1A2B-3C4D%3AShared';
const OPAQUE = 'content://com.example.provider/tree/12345/document/67890';

expect('folder name from a tree address', nameFromAddress(TREE), 'Lifestead');
expect('file name from a document address', nameFromAddress(FILE), 'inside-story-sync.json');
expect('trailing slash ignored', nameFromAddress(TREE + '/'), 'Lifestead');
expect('a number names nothing', nameFromAddress(OPAQUE), null);
expect('the top of a volume names nothing', nameFromAddress('content://x/tree/primary%3A'), null);
expect('a broken escape names nothing', nameFromAddress('content://x/tree/%E0%A4%A'), null);

expect('phone storage described', describePhoneAddress(TREE, 'Lifestead'), 'This phone / Sync / Lifestead');
expect('memory card described', describePhoneAddress(CARD, 'Shared'), 'Memory card / Shared');
expect('another app described by name', describePhoneAddress(OPAQUE, 'Backups'), 'On this phone: Backups');

expect('a phone folder', isPhoneFolder({ driveId: 'phone' }), true);
expect('a computer folder', isPhoneFolder({ driveId: 'disk' }), false);
expect('no folder', isPhoneFolder(null), false);

console.log(checks - failures + ' of ' + checks + ' checks passed.');
if (failures > 0) process.exit(1);
