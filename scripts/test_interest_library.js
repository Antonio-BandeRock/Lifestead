// Checks lib/interestLibrary.ts (Interests > Library and People & Places):
// the open kind list, the lines under an entry and a person, where it was
// left off, the groups by interest, status and kind, a page from Capture,
// and that nothing said here rates, ranks or pushes.
// Run: node scripts/test_interest_library.js
/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const cache = {};
function load(rel) {
  const file = path.join(__dirname, '..', 'lib', `${rel}.ts`);
  if (cache[file]) return cache[file];
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const m = { exports: {} };
  cache[file] = m.exports;
  new Function('module', 'exports', 'require', outputText)(m, m.exports, (name) => {
    if (name.startsWith('./')) return load(name.slice(2));
    throw new Error(`lib/interestLibrary.ts must stay pure, asked for ${name}`);
  });
  cache[file] = m.exports;
  return m.exports;
}
const L = load('interestLibrary');

let pass = 0;
let fail = 0;
function check(name, ok, detail) {
  if (ok) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ''}`);
  }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- statuses and kinds -----------------------------------------------------------
check('status order', same(L.LIBRARY_STATUSES, ['going', 'want', 'following', 'done']));
check('unknown status reads as want', L.readLibraryStatus('nonsense') === 'want' && L.readLibraryStatus(null) === 'want');
check('done status reads', L.readLibraryStatus('done') === 'done');
const kinds = L.kindChoices(['A book', 'A video'], ['a book', 'Zine', null, 'audiobook', 'Zine']);
check('kinds: built-ins first, theirs alphabetically, case-blind', same(kinds, ['A book', 'A video', 'audiobook', 'Zine']), kinds);

// --- lines ----------------------------------------------------------------------------
function entry(over) {
  return {
    id: 'x', interestId: 'i1', kind: null, title: 'Walden', byWhom: null, link: null, status: 'want', leftOff: null,
    about: null, published: null, doneOn: null, fromNoteId: null, retiredAt: null, createdAt: '2026-10-30T10:00:00Z',
    ...over,
  };
}
check('bare line is empty', L.describeLibraryLine(entry({})) === '');
const line = L.describeLibraryLine(entry({ kind: 'A book', byWhom: 'Thoreau', published: '1854', link: 'https://www.example.org/walden?x=1' }));
check('full line', line === 'A book · by Thoreau · 1854 · example.org', line);
check('site from a link', L.linkSite('http://YouTube.com/watch?v=1') === 'youtube.com');
check('no progress', L.describeLibraryProgress(entry({})) === null);
check('left off', L.describeLibraryProgress(entry({ status: 'going', leftOff: 'page 120' })) === 'Left off at page 120');
const done = L.describeLibraryProgress(entry({ status: 'done', doneOn: '2026-10-30', leftOff: 'page 120' }));
check('finished wins over left off', done !== null && done.startsWith('Finished ') && done.includes('2026'), done);
check('status change words', L.describeStatusChange('Walden', 'going') === 'Walden is under Going Through It.');
check('finished change words', L.describeStatusChange('Walden', 'done') === 'Walden is under Finished, dated today.');
check('counts', L.countLibrary(1) === '1 thing in the library' && L.countPeople(2) === '2 people and places' && L.countPeople(1) === '1 person or place');

function person(over) {
  return { id: 'p', interestId: 'i1', kind: null, name: 'Ana', reach: null, place: null, about: null, retiredAt: null, createdAt: '2026-10-30T10:00:00Z', ...over };
}
check('person line', L.describePersonLine(person({ kind: 'A teacher', place: 'Centro', reach: 'Tuesdays' })) === 'A teacher · Centro · Tuesdays');
check('bare person line', L.describePersonLine(person({})) === '');

// --- groups ---------------------------------------------------------------------------
const names = { i1: 'Woodworking', i2: 'Birding' };
const all = [
  entry({ id: 'a', title: 'zebra guide', interestId: 'i2', status: 'want' }),
  entry({ id: 'b', title: 'Apple', interestId: 'i2', status: 'want' }),
  entry({ id: 'c', title: 'Old', interestId: 'i2', status: 'done', doneOn: '2025-01-01' }),
  entry({ id: 'd', title: 'New', interestId: 'i2', status: 'done', doneOn: '2026-05-01' }),
  entry({ id: 'e', title: 'Reading now', interestId: 'i2', status: 'going' }),
  entry({ id: 'f', title: 'Planes', interestId: 'i1', status: 'following' }),
  entry({ id: 'g', title: 'Gone', interestId: 'i1', retiredAt: '2026-10-01T00:00:00Z' }),
];
const groups = L.groupLibrary(all, (id) => names[id]);
check('groups by interest alphabetically', same(groups.map((g) => g.interestName), ['Birding', 'Woodworking']));
check('statuses in order, empty left out', same(groups[0].statuses.map((s) => s.status), ['going', 'want', 'done']), groups[0].statuses.map((s) => s.status));
check('titles alphabetically', same(groups[0].statuses[1].entries.map((e) => e.id), ['b', 'a']));
check('finished newest first', same(groups[0].statuses[2].entries.map((e) => e.id), ['d', 'c']));
check('retired left out of groups', groups[1].count === 1);
check('retired listed', same(L.retiredLibrary(all).map((e) => e.id), ['g']));

const people = [
  person({ id: 'p1', name: 'Zoe', kind: 'A friend' }),
  person({ id: 'p2', name: 'Bob', kind: null }),
  person({ id: 'p3', name: 'Ana', kind: 'A friend' }),
  person({ id: 'p4', name: 'Club', kind: 'A club or group' }),
  person({ id: 'p5', name: 'Left', retiredAt: '2026-10-01T00:00:00Z' }),
];
const pg = L.groupPeople(people, (id) => names[id]);
check('kinds alphabetically, none last', same(pg[0].kinds.map((k) => k.kind), ['A club or group', 'A friend', null]), pg[0].kinds.map((k) => k.kind));
check('people alphabetically in a kind', same(pg[0].kinds[1].people.map((p) => p.id), ['p3', 'p1']));
check('retired people', same(L.retiredPeople(people).map((p) => p.id), ['p5']) && pg[0].count === 4);

// --- a page from Capture ---------------------------------------------------------------
const page = L.libraryFromPage({ url: 'https://x.org/a', title: 'On Owls', author: 'Kim', published: '2024-03', kind: 'article' });
check('page fills the form', same(page, { title: 'On Owls', byWhom: 'Kim', link: 'https://x.org/a', published: '2024-03', kind: 'An article' }), page);
check('video page', L.libraryFromPage({ url: 'u', title: 't', author: null, published: null, kind: 'video' }).kind === 'A video');
check('plain page', L.libraryFromPage({ url: 'u', title: 't', author: null, published: null, kind: 'page' }).kind === 'A website');

// --- nothing rates, ranks or pushes -----------------------------------------------------
const FORBIDDEN = [
  'streak', 'level', 'points', 'score', 'rating', 'stars', 'percent', 'well done', 'great job', 'good job', 'keep it up',
  'should', 'goal', 'earn', 'worth', 'best', 'top ', 'behind', 'fall behind', 'you need', 'genuine', 'honestly', '—', '–',
];
const sources = ['lib/interestLibrary.ts', 'components/InterestLibrarySection.tsx', 'components/InterestPeopleSection.tsx'];
for (const rel of sources) {
  const source = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')
    .split('\n')
    .filter((row) => !row.trim().startsWith('//') && !row.trim().startsWith('*') && !row.trim().startsWith('/*'))
    .join('\n');
  const re = /'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`|>([^<>{}\n]*[A-Za-z][^<>{}\n]*)</g;
  let match;
  while ((match = re.exec(source))) {
    const value = match[1] ?? match[2] ?? match[3];
    if (!value || !/[A-Za-z]{3,} [A-Za-z]/.test(value)) continue;
    const lower = value.toLowerCase();
    for (const word of FORBIDDEN) {
      if (lower.includes(word)) check(`"${word}" stays out of ${rel}: "${value.slice(0, 60)}"`, false);
    }
  }
}

console.log(`${pass + fail} checks, ${fail} failures`);
process.exit(fail ? 1 : 0);
