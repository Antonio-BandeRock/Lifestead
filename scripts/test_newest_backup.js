// Checks which backup "Restore Most Recent Backup" opens (lib/newestBackup.ts):
// the moment is read from the name, the later of this device and the shared
// folder wins, a copied file's newer date does not beat a later backup, and
// files that are not backups are never picked. Exits non-zero on any failure.

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
  new Function('exports', 'module', 'require', outputText)(module.exports, module, () => {
    throw new Error('lib/newestBackup.ts must stay free of runtime imports');
  });
  return module.exports;
}

const { backupTakenAt, pickNewestBackup, isBackupFileName } = load('lib/newestBackup.ts');

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : ` (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`}`);
}

check(
  'reads the moment from a name',
  backupTakenAt('lifestead-backup-2026-10-18T20-01-21-290Z.json'),
  Date.parse('2026-10-18T20:01:21.290Z'),
);
check('reads an old inside-story name', backupTakenAt('inside-story-backup-2026-09-01T08-00-00-000Z.json'), Date.parse('2026-09-01T08:00:00.000Z'));
check('a sync copy is not a backup', isBackupFileName('inside-story-sync.json'), false);
check('a name with no moment reads null', backupTakenAt('lifestead-backup-copy.json'), null);

check('nothing anywhere', pickNewestBackup([]), null);

const device = { place: 'device', name: 'lifestead-backup-2026-10-10T10-00-00-000Z.json', modifiedMs: 1 };
const shared = { place: 'shared', name: 'lifestead-backup-2026-10-18T20-01-21-290Z.json' };
check('the shared folder wins when its backup is later', pickNewestBackup([device, shared]).place, 'shared');

const laterHere = { place: 'device', name: 'lifestead-backup-2026-10-19T09-00-00-000Z.json', modifiedMs: 1 };
check('this device wins when its backup is later', pickNewestBackup([laterHere, shared]).place, 'device');

check(
  'only the shared folder has one',
  pickNewestBackup([shared, { place: 'shared', name: 'inside-story-sync.json' }]).name,
  shared.name,
);

const copiedOld = { place: 'device', name: 'lifestead-backup-2026-10-01T00-00-00-000Z.json', modifiedMs: Date.parse('2026-10-20T00:00:00Z') };
check('a copied file with a newer date does not beat a later backup', pickNewestBackup([copiedOld, shared]).place, 'shared');

const sameOnBoth = { place: 'device', name: shared.name };
check('the same backup in both places opens from this device', pickNewestBackup([shared, sameOnBoth]).place, 'device');

const unnamed = { place: 'device', name: 'lifestead-backup-copy.json', modifiedMs: Date.parse('2030-01-01T00:00:00Z') };
check('a name with a moment beats one without', pickNewestBackup([unnamed, device]).name, device.name);

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
