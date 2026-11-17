// Checks Q64 (reports saved to a remembered folder), lib/reportFolder.ts.
//
//  1. Which kinds of file a save writes, read back and switched.
//  2. A remembered folder read back, and anything unreadable is none.
//  3. File names, and what the screen says once a save is done.
//  4. Both settings stay on the device: DEVICE_LOCAL_META_KEYS names them.
//  5. The screen asks for the folder through the system picker or the
//     shared folder, never anywhere else.
//
// Run with: node scripts/test_report_folder.js

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const cache = {};
function load(relPath) {
  if (cache[relPath]) return cache[relPath].exports;
  const source = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  cache[relPath] = module;
  const dir = path.dirname(relPath);
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    if (!name.startsWith('.')) return {};
    if (name === './db') throw new Error(relPath + ' reaches the database');
    return load(path.join(dir, name + '.ts').replace(/\\/g, '/'));
  });
  return module.exports;
}

const F = load('lib/reportFolder.ts');

let checks = 0;
let failures = 0;
function same(a, b, label) {
  checks += 1;
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    failures += 1;
    console.error('FAIL: ' + label + '\n  got  ' + JSON.stringify(a) + '\n  want ' + JSON.stringify(b));
  }
}

// 1. Formats
same(F.parseFormats(null), ['pdf', 'text'], 'nothing chosen yet is a PDF and plain text');
same(F.parseFormats(''), ['pdf', 'text'], 'empty is the default');
same(F.parseFormats('csv,pdf'), ['pdf', 'csv'], 'read back in a fixed order');
same(F.parseFormats('docx,nonsense'), ['pdf', 'text'], 'nothing known is the default');
same(F.parseFormats(' text , csv '), ['text', 'csv'], 'spaces ignored');
same(F.formatsValue(['csv', 'pdf']), 'pdf,csv', 'stored in a fixed order');
same(F.toggleFormat(['pdf', 'text'], 'csv'), ['pdf', 'text', 'csv'], 'switching the spreadsheet on');
same(F.toggleFormat(['pdf', 'text'], 'pdf'), ['text'], 'switching the PDF off');
same(F.toggleFormat(['text'], 'text'), [], 'the last one can be switched off, and the screen says why a save cannot go');
same(F.parseFormats(F.formatsValue(['text', 'csv'])), ['text', 'csv'], 'round trip');

// 2. Folder
const folder = { driveId: 'phone', itemId: 'content://tree/abc', name: 'Reports', path: 'Apps / Lifestead / Reports' };
same(F.parseFolder(F.folderValue(folder)), folder, 'a folder read back whole');
same(F.parseFolder(F.folderValue({ driveId: 'd', itemId: 'i', name: 'Docs' })), { driveId: 'd', itemId: 'i', name: 'Docs' }, 'a folder with no path');
same([F.parseFolder(null), F.parseFolder('nonsense'), F.parseFolder('{"driveId":"d"}'), F.parseFolder('{"driveId":"d","itemId":"","name":"x"}')], [null, null, null, null], 'anything unreadable is no folder');
same(F.folderWords(folder), 'Apps / Lifestead / Reports', 'a folder named by its path');
same(F.folderWords({ name: 'Docs' }), 'Docs', 'or by its name');
same(F.folderLine(null), { words: F.NO_FOLDER_YET }, 'no folder yet says the first save asks');
same(F.folderLine(folder), { words: 'Saves to {where}', values: { where: 'Apps / Lifestead / Reports' } }, 'a folder line names it');

// 3. Names and words
const stamp = 'lifestead-report-2026-11-16-30d';
same(F.reportFileName(stamp, 'For Your Doctor', 'pdf'), 'lifestead-report-2026-11-16-30d-for-your-doctor.pdf', 'PDF name carries the report');
same(F.reportFileName(stamp, 'Meals & Shopping', 'text'), 'lifestead-report-2026-11-16-30d-meals-shopping.txt', 'plain text is .txt, odd characters dropped');
same(F.reportFileName(stamp, '', 'csv'), 'lifestead-report-2026-11-16-30d.csv', 'no report name, only the stamp');
const ok = (format, fileName) => ({ format, fileName, ok: true });
const bad = (format, fileName) => ({ format, fileName, ok: false, reason: 'The folder could not be reached.' });
same(F.savedMessage(folder, [ok('pdf', 'a.pdf')]), { title: 'Saved', words: '{files} is in {where}.', values: { files: 'a.pdf', where: 'Apps / Lifestead / Reports' } }, 'one file saved');
same(F.savedMessage(folder, [ok('pdf', 'a.pdf'), ok('text', 'a.txt'), ok('csv', 'a.csv')]).values.files, 'a.pdf, a.txt and a.csv', 'three files listed');
same(F.savedMessage(folder, [ok('pdf', 'a.pdf'), ok('text', 'a.txt')]).words, '{files} are in {where}.', 'several are');
same(F.savedMessage(folder, [bad('pdf', 'a.pdf')]).title, 'Not saved', 'nothing went in');
same(F.savedMessage(folder, [ok('text', 'a.txt'), bad('pdf', 'a.pdf')]).title, 'Partly saved', 'some went in');
same(F.savedMessage(folder, [ok('text', 'a.txt'), bad('pdf', 'a.pdf')]).values.failed, 'a.pdf', 'names what did not');

// 4. Device-local
const sync = fs.readFileSync(path.join(ROOT, 'lib/snapshotSync.ts'), 'utf8');
const localBlock = sync.slice(sync.indexOf('DEVICE_LOCAL_META_KEYS'), sync.indexOf('];', sync.indexOf('DEVICE_LOCAL_META_KEYS')));
same([F.REPORT_FOLDER_META_KEY, F.REPORT_FORMATS_META_KEY].map((key) => localBlock.includes("'" + key + "'")), [true, true], 'the folder and the formats never travel to another device');

// 5. Where a folder can come from
const dbSide = fs.readFileSync(path.join(ROOT, 'lib/reportFolderDb.ts'), 'utf8');
same(/graphFetch|fetch\(/.test(dbSide), false, 'nothing is sent anywhere but the folder chosen');
same(dbSide.includes('getReportsFolder') && dbSide.includes('pickComputerFolder') && dbSide.includes('pickPhoneFolder'), true, 'the shared Reports folder or the system picker');

// No verdicts or filler in anything shown
const shown = [F.REPORT_FOLDER_CAPTION, F.NO_FOLDER_YET, F.SHARED_REPORTS_CAPTION, F.PICK_FOLDER_CAPTION, F.NO_FORMAT_CHOSEN].join(' ');
same(/\b(real|genuine|genuinely|great|well done|simply|just)\b/i.test(shown), false, 'no filler or praise');
same(/[–—]/.test(shown), false, 'no dashes');

console.log((failures === 0 ? 'PASS' : 'FAIL') + ' ' + (checks - failures) + '/' + checks);
process.exit(failures === 0 ? 0 : 1);
