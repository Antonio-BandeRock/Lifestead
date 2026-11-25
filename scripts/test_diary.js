// Checks the Diary and the Health Journal (1.0.96.2): how an entry is named,
// found and paged, what letting a diary go means, what the exported page
// holds, and above all that no report and no other person's device can read
// a diary.
//
// Exits non-zero on any failure.

// This is a plain Node script run with node, so it has __dirname.
/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const read = (relPath) => fs.readFileSync(path.join(ROOT, relPath), 'utf8');

function load(relPath) {
  const { outputText } = ts.transpileModule(read(relPath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    throw new Error(`${relPath} must stay free of runtime imports (asked for ${name})`);
  });
  return module.exports;
}

const d = load('lib/diary.ts');

let checks = 0;
let failures = 0;
function expect(label, actual, wanted) {
  checks += 1;
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    failures += 1;
    console.log(`FAIL ${label}: got ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`);
  }
}

const entry = (id, happenedAt, body, more = {}) => ({ id, diaryId: 'diary_daily', happenedAt, body, isLifeEvent: false, lifeEventLabel: null, ...more });

// Names.
expect('first line with words', d.firstLine('\n  \n The sea.\nMore'), 'The sea.');
expect('short line whole', d.firstLine('Short'), 'Short');
expect('long line ends on a whole word', d.firstLine('one two three four five', 12), 'one two…');
expect('no words', d.firstLine('  \n '), '');
expect('an event is its name', d.entryTitle(entry('a', '2026-01-01T10:00', 'Boxes', { isLifeEvent: true, lifeEventLabel: ' Moved house ' })), 'Moved house');
expect('an entry is its first line', d.entryTitle(entry('a', '2026-01-01T10:00', 'Boxes\nmore')), 'Boxes');

// On this day.
const years = [entry('a', '2024-11-24T08:00', 'x'), entry('b', '2025-11-24T08:00', 'y'), entry('c', '2026-11-24T08:00', 'z'), entry('e', '2025-11-23T08:00', 'w')];
expect('earlier years only, newest first', d.onThisDay(years, '2026-11-24').map((item) => item.id), ['b', 'a']);

// Finding.
const found = [entry('a', '2026-01-01T10:00', 'El niño comió pan'), entry('b', '2026-01-02T10:00', 'bread', { lifeEventLabel: 'Nino arrived' })];
expect('accents and capitals', d.findByWords(found, 'NINO').map((item) => item.id), ['a', 'b']);
expect('every word', d.findByWords(found, 'nino pan').map((item) => item.id), ['a']);
expect('no words finds all', d.findByWords(found, '  ').length, 2);
expect('a day', d.isDay('2026-02-28'), true);
expect('not a day', d.isDay('2026-02-30'), false);
expect('from that day back', d.fromDayBack(found, '2026-01-01').map((item) => item.id), ['a']);
expect('neighbours', [d.neighbours(years, 'b').earlier.id, d.neighbours(years, 'b').later.id], ['e', 'c']);
expect('newest has nothing later', d.neighbours(years, 'c').later, null);

// Letting one go never takes entries with it.
const diary = (id) => ({ id, name: id, showHealth: false, retiredAt: null });
expect('the last in use stays', d.letGoOfDiary(diary('x'), 0, 1).action, 'refuse');
expect('one with entries is put away', d.letGoOfDiary(diary('x'), 3, 2).action, 'retire');
expect('Daily is put away even when empty', d.letGoOfDiary(diary('diary_daily'), 0, 2).action, 'retire');
expect('an empty one goes', d.letGoOfDiary(diary('x'), 0, 2).action, 'delete');
expect('same name refused', typeof d.diaryNameProblem('DREAMS', [{ ...diary('a'), name: 'Dreams' }]), 'string');

// Saving.
const draft = { body: '', isLifeEvent: false, lifeEventLabel: '', happenedAt: '2026-11-24T09:00' };
expect('nothing in it', typeof d.entryProblem(draft, false), 'string');
expect('a recording is enough', d.entryProblem(draft, true), null);
expect('an event needs a name', typeof d.entryProblem({ ...draft, isLifeEvent: true }, false), 'string');
expect('a bad date', typeof d.entryProblem({ ...draft, body: 'x', happenedAt: '2026-13-01T09:00' }, false), 'string');

// The Health Journal shows only when asked for.
const health = [{ id: 'h', loggedAt: '2026-01-01T12:00', words: 'Sore' }];
expect('hidden', d.diaryRows(found, health, false).length, 2);
expect('shown in its place', d.diaryRows(found, health, true).map((row) => row.kind), ['entry', 'health', 'entry']);

// Near a flare, and the chart lines.
expect('near a flare', d.entriesNearDays(found, ['2026-01-03'], 1).map((item) => item.id), ['b']);
expect('across a month end', d.entriesNearDays([entry('m', '2026-02-28T10:00', 'x')], ['2026-03-01'], 1).length, 1);
const events = [entry('b', '2026-03-02T10:00', '', { isLifeEvent: true, lifeEventLabel: 'New job' }), entry('a', '2026-01-02T10:00', 'x', { isLifeEvent: true, lifeEventLabel: 'Moved' }), found[0]];
expect('life events oldest first', d.lifeEvents(events), [{ id: 'a', day: '2026-01-02', label: 'Moved' }, { id: 'b', day: '2026-03-02', label: 'New job' }]);

// The page.
const words = { about: 'About', sound: 'Recording', health: 'Health Journal', soundKept: (name) => `kept ${name}`, when: (at) => at };
const page = (forPaper, lines) =>
  d.diaryPage('My <diary>', [{ happenedAt: '2026-01-02T10:00', diaryName: 'Daily', title: null, body: 'a < b', about: [], photos: [], sounds: [{ uri: 'data:audio/mp4;base64,AA', name: 'one' }] }], lines, forPaper, words, 'en');
expect('words are escaped', page(false, []).includes('a &lt; b') && page(false, []).includes('My &lt;diary&gt;'), true);
expect('a page plays', page(false, []).includes('<audio'), true);
expect('paper names the recording', !page(true, []).includes('<audio') && page(true, []).includes('kept one'), true);
expect('health only when chosen', [page(false, []).includes('Sore'), page(false, health).includes('Sore')], [false, true]);
expect('nothing loaded from anywhere', /https?:/.test(page(false, health)), false);

// Drafts.
expect('a broken draft', d.parseDraft('{'), null);
expect('a draft comes back', d.parseDraft(JSON.stringify({ ...draft, entryId: 'e', isNew: true, diaryId: 'x', links: [] })).entryId, 'e');

// Private: nothing that reports, prints for a doctor or shares between
// people names the diary.
const READERS = fs
  .readdirSync(path.join(ROOT, 'lib'))
  .filter((name) => /^(report|peer|partner|household|caregiver|sharing|connection)/.test(name) && name.endsWith('.ts') && name !== 'reportPdf.ts');
for (const name of READERS) {
  const text = read(`lib/${name}`);
  expect(`lib/${name} reads no diary`, /diary_(entries|links|drafts)\b|from '\.\/diary(Db|Export)?'|diary_entry/.test(text), false);
}
expect('peer relationships were checked', READERS.includes('peerRelationships.ts'), true);
expect('reports were checked', READERS.includes('reportGenerator.ts'), true);

// The Health Journal section of the doctor report.
const more = read('lib/reportMore.ts');
expect('the section exists', more.includes('export function healthJournalSection'), true);
expect('only the doctor report carries it', (read('lib/reportKinds.ts').match(/'health-journal'/g) || []).length, 3);

// No counting how often somebody writes.
for (const file of ['lib/diary.ts', 'components/DiarySection.tsx', 'components/DiaryHomeCard.tsx']) {
  const said = read(file).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  expect(`${file} keeps no streak`, /streak|in a row|haven't written|have not written/i.test(said), false);
}

console.log(`${checks - failures}/${checks} diary checks pass`);
process.exit(failures ? 1 : 0);
