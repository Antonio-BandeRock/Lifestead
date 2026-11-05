// Checks the language courses in Learn (2026-11-05): the file format, the merge
// by Card ID, the language matching, the scheduler, the study path and the card
// layouts. Everything here is pure and needs no phone.
//
//   node scripts/test_learn_courses.js
/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.join(__dirname, '..');
function load(rel) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const m = { exports: {} };
  const dir = path.dirname(rel);
  const need = (name) => (name.startsWith('./') ? load(path.posix.join(dir, name) + '.ts') : require(name));
  new Function('module', 'exports', 'require', outputText)(m, m.exports, need);
  return m.exports;
}

let passed = 0;
let failed = 0;
function check(name, ok, detail) {
  if (ok) passed++;
  else {
    failed++;
    console.log(`FAIL  ${name}${detail ? `: ${detail}` : ''}`);
  }
}

const file = load('lib/learnCourseFile.ts');
const merge = load('lib/learnCourseMerge.ts');
const library = load('lib/learnCourseLibrary.ts');
const schedule = load('lib/learnCourseSchedule.ts');
const coursePath = load('lib/learnCoursePath.ts');
const cardKit = load('lib/learnCourseCard.ts');
const speech = load('lib/learnCourseSpeech.ts');
const xlsx = load('lib/xlsxRead.ts');
const fflate = require('fflate');

const coursesDir = path.join(root, 'assets', 'courses');
const es = JSON.parse(fs.readFileSync(path.join(coursesDir, 'es-for-en.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(coursesDir, 'en-for-es.json'), 'utf8'));

// ---- The two bundled courses ----
const EXPECTED = [
  { course: es, cards: 1977, units: 26, groups: 81 },
  { course: en, cards: 1516, units: 26, groups: 77 },
];
for (const { course, cards, units, groups } of EXPECTED) {
  const id = course.deck.id;
  check(`${id}: every row is here`, course.cards.length === cards, course.cards.length);
  check(`${id}: Deck sheet count agrees`, course.deck.cardCount === cards);
  check(`${id}: every unit is here`, new Set(course.cards.map((c) => c.unit)).size === units && course.deck.unitCount === units);
  check(`${id}: every group is here`, new Set(course.cards.map((c) => c.group)).size === groups);
  check(`${id}: Seq runs from 1 with no gaps`, course.cards.every((c, i) => c.seq === i + 1));
  check(`${id}: units never go backward along Seq`, course.cards.every((c, i) => i === 0 || c.unit >= course.cards[i - 1].unit));
  check(`${id}: every card has both sides`, course.cards.every((c) => c.target && c.native));
  check(`${id}: every Card ID starts with the Deck ID`, course.cards.every((c) => c.id.startsWith(`${id}-`)));
  check(`${id}: no dash used as punctuation`, !/[–—]/.test(JSON.stringify(course)));
  const again = file.checkCourse(course);
  check(`${id}: the shipped JSON reads back clean`, again.course && again.problems.length === 0 && again.notes.length === 0, again.problems.join('; '));
  const deckFile = JSON.parse(fs.readFileSync(path.join(coursesDir, `${id}.deck.json`), 'utf8'));
  check(`${id}: the deck file matches the course`, deckFile.fingerprint === file.courseFingerprint(course) && JSON.stringify(deckFile.deck) === JSON.stringify(course.deck));
}
const allIds = [...es.cards, ...en.cards].map((c) => c.id);
check('Card IDs are unique across all courses', new Set(allIds).size === allIds.length);
check('the school is not named in anything shipped', !/kaylista/i.test(JSON.stringify(es)) && !/kaylista/i.test(JSON.stringify(en)));

const schema = JSON.parse(fs.readFileSync(path.join(coursesDir, 'course.schema.json'), 'utf8'));
for (const course of [es, en]) {
  check(`${course.deck.id}: has every deck field in the schema`, schema.properties.deck.required.every((key) => key in course.deck));
  check(`${course.deck.id}: every card has every field in the schema`, course.cards.every((c) => schema.properties.cards.items.required.every((key) => key in c)));
}

// ---- The workbook reader against the workbooks, where they are on this computer ----
const decksDir = path.join(root, 'assets', 'decks');
if (fs.existsSync(decksDir)) {
  const sheets = xlsx.readXlsx(new Uint8Array(fs.readFileSync(path.join(decksDir, 'english-for-spanish-speakers.xlsx'))));
  check('the Guide sheet is read as a sheet but never as cards', !!sheets.Guide && file.checkCourse(file.courseShapeFromSheets(sheets)).course.cards.length === 1516);
  const fromFile = file.readCourseBytes(new Uint8Array(fs.readFileSync(path.join(decksDir, 'english-for-spanish-speakers.xlsx'))));
  check('a workbook and its JSON hold the same cards', JSON.stringify(fromFile.course.cards) === JSON.stringify(en.cards));
  check('a line break in a cell survives', en.cards.some((c) => c.type === 'Verb' && c.target.includes('\n')));
}

// ---- A small workbook made here, so the reader is checked for what the two files do not use ----
function makeWorkbook(cardRows, deckExtra = []) {
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '&#10;');
  const sheetXml = (rows) => `<worksheet><sheetData>${rows.map((row, r) => `<row r="${r + 1}">${row.map((cell, c) => (cell === null ? '' : `<c r="${String.fromCharCode(65 + c)}${r + 1}" t="inlineStr"><is><t>${esc(cell)}</t></is></c>`)).join('')}</row>`).join('')}</sheetData></worksheet>`;
  const deck = [['Field', 'Value'], ['Deck ID', 'xx'], ['Deck name', 'Test & Course'], ['Subject', 'Birds'], ['Course type', 'Reference'], ...deckExtra];
  const header = ['Target (front)', 'Native (back)', 'Example (target)', 'Example (native)', 'Remember', 'Group', 'Card type', 'Unit #', 'Unit', 'Seq', 'Source', 'Status', 'Card ID'];
  return fflate.zipSync({
    'xl/workbook.xml': fflate.strToU8('<workbook xmlns:r="x"><sheets><sheet name="Deck" r:id="rId1"/><sheet name="Cards" r:id="rId2"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': fflate.strToU8('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="/xl/worksheets/sheet2.xml"/></Relationships>'),
    'xl/worksheets/sheet1.xml': fflate.strToU8(sheetXml(deck)),
    'xl/worksheets/sheet2.xml': fflate.strToU8(sheetXml([header, ...cardRows])),
  });
}
const row = (id, seq, unit = 1, status = 'Core') => [`front ${id}`, `back ${id}`, '', '', '', 'G', 'Word', String(unit), `U${unit}`, String(seq), 'S', status, `xx-${id}`];
const small = file.readCourseBytes(makeWorkbook([row('a', 1), row('b', 2)]));
check('a subject that is no language reads, with no language codes', small.course && small.course.deck.subject === 'Birds', small.problems.join('; '));
check('entities in a cell decode', small.course && small.course.deck.name === 'Test & Course');
check('a gap in Seq is refused and named', file.readCourseBytes(makeWorkbook([row('a', 1), row('b', 3)])).problems.some((p) => p.includes('2 is missing')));
check('a repeated Card ID is refused and named', file.readCourseBytes(makeWorkbook([row('a', 1), row('a', 2)])).problems.some((p) => p.includes('Row 3') && p.includes('xx-a')));
check('a Card ID without the Deck ID is refused', file.readCourseBytes(makeWorkbook([['f', 'b', '', '', '', 'G', 'Word', '1', 'U', '1', 'S', 'Core', 'zz-a']])).course === null);
check('an unknown Status is refused', file.readCourseBytes(makeWorkbook([row('a', 1, 1, 'Maybe')])).course === null);
check('an unknown card type still reads', file.checkCourse({ deck: { id: 'xx', name: 'n', subject: 's', courseType: 'r' }, cards: [{ id: 'xx-a', seq: 1, unit: 1, status: 'Core', target: 'f', native: 'b', type: 'Diagram' }] }).course !== null);
check('a language course without codes is refused', file.checkCourse({ deck: { id: 'xx', name: 'n', subject: 's', courseType: 'Language course' }, cards: [{ id: 'xx-a', seq: 1, unit: 1, status: 'Core', target: 'f', native: 'b' }] }).course === null);
check('rubbish is refused in words', file.readCourseBytes(new Uint8Array([1, 2, 3])).problems.length === 1 && file.readCourseBytes(new TextEncoder().encode('{"a":1}')).problems.length === 1);
check('JSON with accents and a byte order mark reads', file.readCourseBytes(new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(JSON.stringify({ deck: { id: 'xx', name: 'Inglés', subject: 's', courseType: 'r' }, cards: [{ id: 'xx-a', seq: 1, unit: 1, status: 'Core', target: 'mañana 😀', native: 'b' }] }))])).course.cards[0].target === 'mañana 😀');
check('a Deck sheet that disagrees gets a note, not a refusal', file.checkCourse({ deck: { id: 'xx', name: 'n', subject: 's', courseType: 'r', cardCount: 5 }, cards: [{ id: 'xx-a', seq: 1, unit: 1, status: 'Core', target: 'f', native: 'b' }] }).notes.length === 1);

// ---- Merge by Card ID ----
const c = (id, seq, target = `t ${id}`) => ({ id, seq, unit: 1, unitName: 'U', group: 'G', type: 'Word', status: 'Core', source: 'S', target, native: 'n', exampleTarget: '', exampleNative: '', remember: '' });
const once = merge.mergeCourseCards([c('a', 1), c('b', 2), c('d', 3)], [], [c('a', 1), c('b', 2, 'changed'), c('e', 3)]);
check('merge adds a new ID', once.added === 1 && once.cards.some((x) => x.id === 'e'));
check('merge updates changed text', once.changed === 1 && once.cards.find((x) => x.id === 'b').target === 'changed');
check('merge archives a removed ID and keeps it', once.archivedNow === 1 && once.archived[0].id === 'd' && !once.cards.some((x) => x.id === 'd'));
const back = merge.mergeCourseCards(once.cards, once.archived, [...once.cards, c('d', 4)]);
check('an archived ID that returns is restored, not new', back.restored === 1 && back.added === 0 && back.archived.length === 0);
const none = merge.mergeCourseCards(back.cards, back.archived, back.cards);
check('re-importing the same file changes nothing', none.added + none.changed + none.archivedNow + none.restored === 0 && merge.describeCourseMerge(none) === 'Nothing in this course changed.');
check('a merge says progress stays', merge.describeCourseMerge(once).includes('stays as it was'));
check('a merge never reads an answer, so progress cannot be lost', !fs.readFileSync(path.join(root, 'lib/learnCourseMerge.ts'), 'utf8').includes('learnDb'));

// ---- Language matching ----
const decks = [es, en].map((course) => ({ deck: course.deck }));
const named = (shelves) => shelves.flatMap((shelf) => shelf.courses.map((x) => x.deck.id));
check('language part reads', library.languagePart('es-MX') === 'es' && library.languagePart('EN_us') === 'en');
check('an English app offers the course taught from English first', named(library.buildLibrary(decks, 'en').forYou).join() === 'es-for-en' && named(library.buildLibrary(decks, 'en').others).join() === 'en-for-es');
check('switching to Spanish reorders the library', named(library.buildLibrary(decks, 'es').forYou).join() === 'en-for-es');
check('a third language finds nothing suited and hides nothing', named(library.buildLibrary(decks, 'fi').others).length === 2);
const fi = { deck: { ...es.deck, id: 'sv-for-fi', name: 'Swedish', nativeCode: 'fi-FI' } };
check('a new pair needs no change', named(library.buildLibrary([...decks, fi], 'fi').forYou).join() === 'sv-for-fi');
const birds = { deck: { ...es.deck, id: 'birds', name: 'Birds', subject: 'Nature', nativeCode: '' } };
const withBirds = library.buildLibrary([...decks, birds], 'en');
check('a course with no language suits anybody, on its own shelf', withBirds.forYou.map((s) => s.subject).join() === 'Languages,Nature');
check('a course being studied stays near the top', named(library.buildLibrary(decks, 'en', (x) => x.deck.id === 'en-for-es').forYou).length === 2);
for (const rel of ['lib/learnCourseLibrary.ts', 'lib/learnCoursePath.ts', 'lib/learnCourseSchedule.ts', 'lib/learnCourseMerge.ts', 'lib/learnCourseFile.ts']) {
  check(`${rel} names no language`, !/es-MX|en-US|'es'|'en'|Spanish \(|English \(/.test(fs.readFileSync(path.join(root, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/like (es|en)-[A-Z]+/g, '')));
}

// ---- Scheduler ----
const answer = (cardId, day, grade, time = '15:00:00.000Z') => ({ cardId, day, grade, answeredAt: `${day}T${time}` });
const three = [answer('x', '2026-01-01', 'knewIt'), answer('x', '2026-01-04', 'knewIt'), answer('x', '2026-01-12', 'withEffort')];
const a1 = schedule.replayCourseCard(three);
check('the same answers replay to the same result', JSON.stringify(a1) === JSON.stringify(schedule.replayCourseCard(three)));
check('answer order across devices settles the same', JSON.stringify(a1) === JSON.stringify(schedule.replayCourseCard([three[2], three[0], three[1]])));
check('a card never answered has no state', schedule.replayCourseCard([]) === null);
check('Knew It moves a card on by days', schedule.replayCourseCard([three[0]]).readyOn > '2026-01-01');
check('Easily goes further than Knew It', schedule.replayCourseCard([answer('x', '2026-01-01', 'easily')]).readyOn > schedule.replayCourseCard([three[0]]).readyOn);
check('Knew It goes further than With Effort', schedule.replayCourseCard([three[0]]).readyOn >= schedule.replayCourseCard([answer('x', '2026-01-01', 'withEffort')]).readyOn);
const notYet = schedule.replayCourseCard([answer('x', '2026-01-01', 'notYet')]);
check('Not Yet comes back soon', notYet.readyOn <= '2026-01-02', notYet.readyOn);
const twice = schedule.replayCourseCard([answer('x', '2026-01-01', 'notYet', '10:00:00.000Z'), answer('x', '2026-01-01', 'easily', '10:05:00.000Z')]);
check('only the first answer of a day moves the schedule', twice.readyOn === notYet.readyOn);
check('the second answer of a day still counts as recalled', twice.recalledDays === 1);
check('the time and zone of an answer change nothing', schedule.replayCourseCard([answer('x', '2026-01-01', 'knewIt', '00:01:00.000Z')]).readyOn === schedule.replayCourseCard([three[0]]).readyOn);
check('a clock set backward does not rewind a card', schedule.replayCourseCard([answer('x', '2026-03-01', 'knewIt', '09:00:00.000Z'), answer('x', '2026-01-01', 'notYet', '10:00:00.000Z')]).readyOn > '2026-03-01');
check('learned means recalled on two separate days', !schedule.isLearned(schedule.replayCourseCard([three[0]])) && schedule.isLearned(a1));
check('a missed month brings nothing worse than the card being ready', schedule.replayCourseCard([three[0], answer('x', '2026-03-01', 'knewIt')]).readyOn > '2026-03-01');

// Replay at scale: 2,000 cards with 100 answers each.
const big = [];
for (let cardN = 0; cardN < 2000; cardN++) {
  for (let n = 0; n < 100; n++) {
    const d = new Date(Date.UTC(2026, 0, 1 + n * 3)).toISOString().slice(0, 10);
    big.push(answer(`c${cardN}`, d, n % 7 === 0 ? 'withEffort' : 'knewIt'));
  }
}
const started = Date.now();
const bigStates = schedule.replayCourse(big);
const spent = Date.now() - started;
console.log(`  replaying ${big.length} answers across ${bigStates.size} cards took ${spent} ms on this computer`);
check('200,000 answers replay in under 5 seconds here', spent < 5000, `${spent} ms`);

// ---- The study path ----
function unitCards(unit, startSeq, n, status = 'Core') {
  return Array.from({ length: n }, (_, i) => ({ ...c(`u${unit}-${i}`, startSeq + i), unit, unitName: `Unit ${unit}`, status }));
}
const pathCards = [...unitCards(1, 1, 8), ...unitCards(1, 9, 2, 'Recognize').map((x, i) => ({ ...x, id: `u1-r${i}` })), ...unitCards(2, 11, 5), ...unitCards(3, 16, 5)];
const learnedStates = (ids) => new Map(ids.map((id) => [id, { readyOn: '2099-01-01', firstDay: '2026-01-01', recalledDays: 2, answers: 2 }]));
check('only the first unit opens at the start', [...coursePath.openUnits(pathCards, new Map(), [])].join() === '1');
const six = learnedStates(['u1-0', 'u1-1', 'u1-2', 'u1-3', 'u1-4', 'u1-5']);
check('75% of Core does not open the next unit', !coursePath.openUnits(pathCards, six, []).has(2));
const seven = learnedStates(['u1-0', 'u1-1', 'u1-2', 'u1-3', 'u1-4', 'u1-5', 'u1-6']);
check('80% of Core opens the next unit, with Recognize cards untouched', coursePath.openUnits(pathCards, seven, []).has(2));
check('and only the next one', !coursePath.openUnits(pathCards, seven, []).has(3));
check('a unit can be opened by hand', coursePath.openUnits(pathCards, new Map(), [3]).has(3) && !coursePath.openUnits(pathCards, new Map(), [3]).has(2));
const standings = coursePath.unitStandings(pathCards, seven, [], '2026-06-01');
check('a unit stands at learned, ready and new', standings[0].learned === 7 && standings[0].fresh === 3 && standings[0].ready === 0 && standings[1].fresh === 5);
const first = coursePath.planPathSitting({ cards: pathCards, states: new Map(), today: '2026-06-01', dailyLimit: 15, openedByHand: [] });
check('new cards come strictly in Seq order', first.cardIds.slice(0, 3).join() === 'u1-0,u1-1,u1-2' && first.newCount === 10);
const hand = coursePath.planPathSitting({ cards: pathCards, states: new Map(), today: '2026-06-01', dailyLimit: 15, openedByHand: [3], unit: 3 });
check('a unit opened by hand gives its new cards in Seq order', hand.cardIds[0] === 'u3-0' && hand.newCount === 5);
const closed = coursePath.planPathSitting({ cards: pathCards, states: new Map(), today: '2026-06-01', dailyLimit: 15, openedByHand: [], unit: 3 });
check('a closed unit gives nothing on the path', closed.cardIds.length === 0);
const bigCards = unitCards(1, 1, 60);
const startedToday = new Map(bigCards.slice(0, 15).map((card) => [card.id, { readyOn: '2099-01-01', firstDay: '2026-06-01', recalledDays: 1, answers: 1 }]));
check('the daily limit is worked out from the answers', coursePath.newLeftToday(startedToday, '2026-06-01', 15) === 0 && coursePath.newLeftToday(startedToday, '2026-06-02', 15) === 15);
check('the daily limit holds', coursePath.planPathSitting({ cards: bigCards, states: startedToday, today: '2026-06-01', dailyLimit: 15, openedByHand: [] }).cardIds.length === 0);
const fiveMore = new Map([...startedToday].slice(0, 10));
check('a limit part used leaves the rest', coursePath.planPathSitting({ cards: bigCards, states: fiveMore, today: '2026-06-01', dailyLimit: 15, openedByHand: [] }).newCount === 5);
const manyReady = new Map(bigCards.slice(0, 40).map((card) => [card.id, { readyOn: '2026-05-01', firstDay: '2026-04-01', recalledDays: 1, answers: 1 }]));
const crowded = coursePath.planPathSitting({ cards: bigCards, states: manyReady, today: '2026-06-01', dailyLimit: 15, openedByHand: [] });
check('a long ready list leaves new cards room', crowded.readyCount === 15 && crowded.newCount === 5 && crowded.cardIds.length === 20);

const lesson = pathCards.map((card) => ({ ...card, source: card.unit === 3 ? 'Lesson 6' : 'Other' }));
const filtered = coursePath.planFilterSitting(lesson, new Map(), { source: 'Lesson 6' }, '2026-06-01', new Set());
check('a filter reaches outside the path, the night before class', filtered.cardIds.length === 5 && filtered.cardIds[0] === 'u3-0');
check('a filter leaves out what was answered today', coursePath.planFilterSitting(lesson, new Map(), { source: 'Lesson 6' }, '2026-06-01', new Set(['u3-0'])).cardIds.length === 4);
check('filters narrow together', coursePath.planFilterSitting(lesson, new Map(), { unit: 1, status: 'Recognize' }, '2026-06-01', new Set()).cardIds.length === 2);
const choices = coursePath.filterChoices(en.cards);
check('a Source the same on every card offers no filter', choices.sources.length === 0);
check('a Source that differs offers one', coursePath.filterChoices(es.cards).sources.length === 11);
check('every filter names what it can pick', choices.units.length === 26 && choices.groups.length === 77 && choices.types.length === 6 && choices.statuses.length === 2);
const seenFew = new Map(pathCards.slice(0, 4).map((card) => [card.id, { readyOn: '2099-01-01', firstDay: '2026-01-01', recalledDays: 1, answers: 1 }]));
const mixA = coursePath.planMixSitting(pathCards, seenFew, [], '2026-06-01', new Set());
check('Mix takes only what has been seen in the open units', mixA.cardIds.length === 4 && mixA.newCount === 0);
check('Mix stirs the same way all day and leaves out what was answered', mixA.cardIds.join() === coursePath.planMixSitting(pathCards, seenFew, [], '2026-06-01', new Set()).cardIds.join() && coursePath.planMixSitting(pathCards, seenFew, [], '2026-06-01', new Set([mixA.cardIds[0]])).cardIds.length === 3);
const stats = coursePath.courseStats(pathCards, seven, ['2026-01-01', '2026-01-02', '2026-01-02'], '2026-06-01');
check('stats are plain counts, and days studied counts each day once', stats.seen === 7 && stats.learned === 7 && stats.daysStudied === 2 && stats.total === 20);

// ---- Card layouts: every odd shape in the two files ----
const layout = cardKit.courseCardLayout;
const byId = (course, id) => course.cards.find((card) => card.id === id);
const verbs = (course) => course.cards.filter((card) => card.type === 'Verb').map(layout);
const esVerbs = verbs(es);
const enVerbs = verbs(en);
check('es: 950 verb cards line up as tables', esVerbs.filter((l) => l.kind === 'verb' && l.nativeForms).length === 950, esVerbs.filter((l) => l.kind === 'verb' && l.nativeForms).length);
check('es: 108 one-line verb cards draw plain', esVerbs.filter((l) => l.kind === 'plain').length === 108);
check('es: the one card with forms on one side is never falsely paired', esVerbs.filter((l) => l.kind === 'verb' && !l.nativeForms).length === 1 && layout(byId(es, 'es-for-en-16-llamandose')).nativeText.startsWith('being called'));
check('en: 4 one-line verb cards draw plain', enVerbs.filter((l) => l.kind === 'plain').length === 4);
check('en: the three-form card is a table of three', layout(byId(en, 'en-for-es-16-have-present-continuous-actions-only')).targetForms.length === 3);
check('every table has the same rows on both sides', [...esVerbs, ...enVerbs].every((l) => l.kind !== 'verb' || !l.nativeForms || l.nativeForms.length === l.targetForms.length));
const setsOf = (course) => course.cards.filter((card) => card.type === 'Set' || card.type === 'Contrast pair').map(layout);
const esSets = setsOf(es);
const enSets = setsOf(en);
check('es: 6 sets whose sides do not line up draw as a list', esSets.filter((l) => l.kind === 'list').length === 6, esSets.filter((l) => l.kind === 'list').length);
check('en: 25 sets whose sides do not line up draw as a list', enSets.filter((l) => l.kind === 'list').length === 25, enSets.filter((l) => l.kind === 'list').length);
check('every pair lines up front to back', [...esSets, ...enSets].every((l) => l.kind !== 'pairs' || l.target.length === l.native.length));
const slashPair = layout({ type: 'Contrast pair', target: 'good evening / good night', native: 'buenas noches (al llegar) / buenas noches (al irte)' });
check('a contrast pair splits on a slash when both sides agree', slashPair.kind === 'pairs' && slashPair.target.length === 2);
check('a slash on one side only stays plain', layout({ type: 'Contrast pair', target: 'a / b', native: 'c' }).kind === 'plain');
check('a Word card with a dot in it stays plain', layout({ type: 'Word', target: 'a · b', native: 'c · d' }).kind === 'plain');
check('a kind nobody named yet draws plain', layout({ type: 'Diagram', target: 'a', native: 'b' }).kind === 'plain');
check('layout never looks for a tense name', !/present|presente|tense|preterite/i.test(fs.readFileSync(path.join(root, 'lib/learnCourseCard.ts'), 'utf8').replace(/\/\/.*$/gm, '')));

// ---- Type the answer ----
const typed = cardKit.checkTypedForm;
check('the form as written matches', typed('yo soy', 'yo soy') === 'match');
check('the form without its pronoun matches', typed('soy', 'yo soy') === 'match');
check('a form behind a run of pronouns matches', typed('es', 'él / ella / usted es') === 'match' && typed('usted es', 'él / ella / usted es') === 'match');
check('English works the same way', typed('looks at', 'he / she / it looks at') === 'match' && typed('have been', 'I have been') === 'match');
check('any of a slash of single words matches', typed('is', 'am / is / are') === 'match');
check('capitals and end punctuation do not matter', typed('Soy.', 'yo soy') === 'match');
check('a note in brackets is not asked for', typed('me está doliendo', 'me está doliendo (están doliendo)') === 'match');
check('accents alone pass and are pointed out', typed('sere', 'yo seré') === 'accents' && typed('manana', 'mañana') === 'accents');
check('a wrong form is different', typed('fui', 'yo soy') === 'different' && typed('', 'yo soy') === 'different');
check('a hidden form is steady all day and within the row', cardKit.hiddenFormIndex('a', '2026-06-01', 5) === cardKit.hiddenFormIndex('a', '2026-06-01', 5) && cardKit.hiddenFormIndex('a', '2026-06-01', 5) < 5);

// ---- Speech ----
const say = speech.speechText;
check('an @ word in Spanish says both forms', say('encantad@', 'es-MX') === 'encantado, encantada');
check('a plural @ word says both', say('tod@s', 'es-MX') === 'todos, todas');
check('a contrast with @ reads cleanly', say('es aburrid@ · está aburrid@', 'es-MX') === 'es aburrido, aburrida, está aburrido, aburrida');
check('every @ in the Spanish course is expanded', es.cards.every((card) => !speech.speechParts(card, 'es-MX').join(' ').includes('@')));
check('a language with no table never says the @', !say('amig@', 'fi-FI').includes('@'));
check('dots, slashes and arrows become pauses', say('a · b / c → d', 'en-US') === 'a, b, c, d');
check('no card in either course gives a voice a symbol to read', [...es.cards, ...en.cards].every((card) => !/[·→@]/.test(speech.speechParts(card, card.id.startsWith('es') ? 'es-MX' : 'en-US').join(' '))));
check('a slash inside a word is left alone', say('he/she', 'en-US') === 'he/she');
const verbSaid = speech.speechParts(byId(en, en.cards.find((card) => card.type === 'Verb' && card.target.includes('present simple')).id), 'en-US');
check('a verb card leaves out the line naming the tense', !verbSaid[0].includes('present simple'));
const voices = [
  { identifier: 'es-us-x-sfb-network', name: 'n', language: 'es-MX', quality: 'Enhanced' },
  { identifier: 'es-es-x-eea-local', name: 'l', language: 'es-ES', quality: 'Default' },
  { identifier: 'es-mx-x-abc-local', name: 'm', language: 'es_MX', quality: 'Default' },
  { identifier: 'en-us-x-iom-local', name: 'e', language: 'en-US', quality: 'Default' },
];
check('the exact code wins', speech.pickVoice(voices, 'es-MX').identifier === 'es-mx-x-abc-local');
check('otherwise any voice of the language', speech.pickVoice(voices, 'es-AR').identifier === 'es-es-x-eea-local');
check('a voice that needs the internet never counts', speech.pickVoice([voices[0]], 'es-MX') === null);
check('no voice for the language says so', speech.pickVoice(voices, 'fi-FI') === null);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
