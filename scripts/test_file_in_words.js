// Checks lib/fileInWords.ts: no sync file name, and so no "inside-story",
// reaches a sentence the person reads.
const fs = require('fs');
const ts = require('typescript');
const out = ts.transpileModule(fs.readFileSync(require.resolve('../lib/fileInWords.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
}).outputText;
const m = {};
new Function('exports', out)(m);
let failed = 0;
function check(name, got, want) {
  if (got !== want) { failed++; console.log('FAIL', name, '\n  got ', got, '\n  want', want); }
}
check('sync record', m.FileInWords('inside-story-sync.json') + ' could not be fetched from OneDrive.', 'The note saying which device saved last could not be fetched from OneDrive.');
check('snapshot in a path', m.fileInWords('C:/Users/x/OneDrive/Backups/inside-story-snapshot-phone-ab12.json'), 'the saved copy of your records');
check('changes', m.fileInWords('inside-story-changes-desktop-ff.json'), 'the latest changes from your other device');
check('backup', m.fileInWords('lifestead-backup-2026-10-12.json'), 'the backup');
check('a name the app did not make', m.fileInWords('my-renamed.json'), 'my-renamed.json');
check('inside a OneDrive sentence', m.fileNamesInWords("The resource 'inside-story-session.json' could not be found."), 'The resource the note saying which device is in use could not be found.');
for (const name of ['inside-story-sync.json', 'inside-story-session.json', 'inside-story-snapshot-x.json', 'inside-story-sync-base.json', 'inside-story-whatever.bin']) {
  if (/inside.?story/i.test(m.fileInWords(name))) { failed++; console.log('FAIL old name left in', name); }
}
if (failed) { console.log(failed + ' failed'); process.exit(1); }
console.log('All file-in-words checks passed');
