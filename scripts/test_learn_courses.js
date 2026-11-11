// Checks Interests > Languages (2026-11-05): the file format, which sets a person
// sees, the ladder, a sitting, units and decks, the information icon, the outlines
// and the card layouts. Everything here is pure and needs no phone.
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
const basics = load('lib/languageBasics.ts');
const cardKit = load('lib/learnCourseCard.ts');
const speech = load('lib/learnCourseSpeech.ts');
const xlsx = load('lib/xlsxRead.ts');
const fflate = require('fflate');

const coursesDir = path.join(root, 'assets', 'courses');
const es = JSON.parse(fs.readFileSync(path.join(coursesDir, 'es-for-en.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(coursesDir, 'en-for-es.json'), 'utf8'));

// ---- The two bundled sets ----
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

// ---- A line to say next, on every card (2026-11-11, Tony: "every card for every language") ----
// A card type joins REPLIES_REQUIRED_TYPES once every card of that type has its line in both sets.
const REPLIES_REQUIRED_TYPES = new Set(['Phrase', 'Word', 'Set', 'Contrast pair', 'Rule']);
for (const course of [es, en]) {
  const id = course.deck.id;
  const withReply = course.cards.filter((c) => c.replyTarget);
  check(`${id}: every reply has its meaning`, withReply.every((c) => c.replyNative && c.replyNative.trim() === c.replyNative));
  check(`${id}: no reply repeats its card`, withReply.every((c) => c.replyTarget !== c.target && c.replyTarget !== c.exampleTarget), withReply.filter((c) => c.replyTarget === c.target || c.replyTarget === c.exampleTarget).map((c) => c.id).join(', '));
  const missing = course.cards.filter((c) => !c.replyTarget);
  for (const type of REPLIES_REQUIRED_TYPES) {
    const gap = missing.filter((c) => c.type === type);
    check(`${id}: every ${type} card has a line to say next`, gap.length === 0, gap.slice(0, 5).map((c) => c.id).join(', '));
  }
  console.log(`${id}: ${withReply.length} of ${course.cards.length} cards have a line to say next`);
}

// ---- The workbook reader against the workbooks, where they are on this computer ----
const decksDir = path.join(root, 'assets', 'decks');
if (fs.existsSync(decksDir)) {
  const sheets = xlsx.readXlsx(new Uint8Array(fs.readFileSync(path.join(decksDir, 'english-for-spanish-speakers.xlsx'))));
  check('the Guide sheet is read as a sheet but never as cards', !!sheets.Guide && file.checkCourse(file.courseShapeFromSheets(sheets)).course.cards.length === 1516);
  const fromFile = file.readCourseBytes(new Uint8Array(fs.readFileSync(path.join(decksDir, 'english-for-spanish-speakers.xlsx'))));
  // The shipped JSON is the workbook with scripts/course-fixes/ laid over it, so only the fields a fix may set differ.
  const FIXABLE = ['meaning', 'remember', 'target', 'native', 'replyTarget', 'replyNative'];
  const strip = (card) => JSON.stringify(Object.fromEntries(Object.entries(card).filter(([key]) => !FIXABLE.includes(key))));
  check('a workbook and its JSON hold the same cards', fromFile.course.cards.length === en.cards.length && fromFile.course.cards.every((card, i) => strip(card) === strip(en.cards[i])));
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

// ---- Which sets a person sees ----
const sets = [es, en].map((course) => ({ deck: course.deck }));
const idsFor = (language, list = sets) => basics.setsForLanguage(list, language).map((set) => set.deck.id).join();
check('language part reads', basics.languagePart('es-MX') === 'es' && basics.languagePart('EN_us') === 'en');
check('an English app shows only the set taught from English', idsFor('en') === 'es-for-en');
check('a Spanish app shows only the set taught from Spanish', idsFor('es') === 'en-for-es');
{
  const shipped = fs.readFileSync(path.join(root, 'lib', 'learnCoursesBundled.ts'), 'utf8');
  const metro = fs.readFileSync(path.join(root, 'metro.config.js'), 'utf8');
  check('both sets ship in every version', shipped.includes('es-for-en.json') && shipped.includes('en-for-es.json') && !metro.includes('learnCourse'));
}
check('a third language shows none, and hides nothing behind a shelf', idsFor('fi') === '');
check('a new set needs no change in the code', idsFor('fi', [...sets, { deck: { ...es.deck, id: 'sv-for-fi', nativeCode: 'fi-FI' } }]) === 'sv-for-fi');
check('the sets carry their plain names', es.deck.name === 'Basic Spanish for English Speakers' && en.deck.name === 'Basic English for Spanish Speakers');
for (const rel of ['lib/languageBasics.ts', 'lib/learnCourseFile.ts']) {
  check(`${rel} names no language`, !/es-MX|en-US|'es'|'en'|Spanish \(|English \(/.test(fs.readFileSync(path.join(root, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/like (es|en)-[A-Z]+/g, '')));
}

// ---- The word "course" is gone from what a person reads ----
const uncommented = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
for (const rel of ['app/language-basics.tsx', 'components/LanguagesSection.tsx', 'components/LanguageBasicsHomeCard.tsx', 'components/LanguageDeckInfo.tsx', 'components/CourseCardView.tsx']) {
  check(`${rel} never says course`, !/['">][^'"<>\n]*\b[Cc]ourses?\b[^'"<>\n]*['"<]/.test(uncommented(rel)));
}
const howTos = fs.readFileSync(path.join(root, 'lib/toolHowTos.ts'), 'utf8');
check('the how-tos for Languages never say course', !/\b[Cc]ourses?\b/.test(howTos.slice(howTos.indexOf("'/interests#languages'"), howTos.indexOf("'/interests#learn'"))));
check('swiping is gone from the card', !/PanResponder|Swipe/.test(uncommented('components/CourseCardView.tsx')));

// ---- The ladder ----
const answer = (cardId, day, grade, time = '15:00:00.000Z') => ({ cardId, day, grade, answeredAt: `${day}T${time}` });
const replay = (...reviews) => basics.replayLadderCard(reviews);
const inDays = (state, from) => Math.round((Date.parse(state.readyOn) - Date.parse(from)) / 86400000);
const D1 = '2026-01-01';
check('a card never answered has no state', basics.replayLadderCard([]) === null);
check('a first + comes back in 1 day', inDays(replay(answer('x', D1, 'notYet')), D1) === 1);
check('a first = comes back in 2 days', inDays(replay(answer('x', D1, 'knewIt')), D1) === 2);
check('a first minus comes back in 4 days', inDays(replay(answer('x', D1, 'easily')), D1) === 4);
const stay = replay(answer('x', D1, 'knewIt'), answer('x', '2026-01-03', 'knewIt'), answer('x', '2026-01-05', 'knewIt'));
check('= keeps a card in the same rotation, however many times', stay.step === basics.LADDER_START && inDays(stay, '2026-01-05') === 2);
check('an older With Effort answer reads as the same rotation', replay(answer('x', D1, 'withEffort'), answer('x', '2026-01-03', 'withEffort')).step === basics.LADDER_START);
check('minus climbs a step at a time', replay(answer('x', D1, 'easily'), answer('x', '2026-01-05', 'easily')).step === basics.LADDER_START + 2);
check('+ comes down a step', replay(answer('x', D1, 'easily'), answer('x', '2026-01-05', 'notYet')).step === basics.LADDER_START);
const low = [answer('x', D1, 'notYet'), answer('x', '2026-01-02', 'notYet'), answer('x', '2026-01-03', 'notYet')];
check('the ladder has a floor', replay(...low).step === 0 && inDays(replay(...low), '2026-01-03') === 1);
const high = Array.from({ length: 20 }, (_, n) => answer('x', new Date(Date.UTC(2026, 0, 1 + n * 200)).toISOString().slice(0, 10), 'easily'));
check('the ladder has a ceiling', replay(...high).step === basics.LADDER_DAYS.length - 1);
const sameDay = replay(answer('x', D1, 'notYet', '10:00:00.000Z'), answer('x', D1, 'easily', '10:05:00.000Z'));
check('only the first answer of a day moves a card', sameDay.step === 0 && sameDay.answers === 2);
const shuffled = [answer('x', D1, 'knewIt'), answer('x', '2026-01-04', 'easily'), answer('x', '2026-01-12', 'notYet')];
check('the same answers replay the same in any order, so two devices agree', JSON.stringify(replay(...shuffled)) === JSON.stringify(replay(shuffled[2], shuffled[0], shuffled[1])));
check('a month away takes nothing from a card', replay(answer('x', D1, 'easily'), answer('x', '2026-03-01', 'knewIt')).step === replay(answer('x', D1, 'easily')).step);
check('the indicators are the stored grades', basics.INDICATOR_GRADES.more === 'notYet' && basics.INDICATOR_GRADES.same === 'knewIt' && basics.INDICATOR_GRADES.less === 'easily');

const big = [];
for (let cardN = 0; cardN < 2000; cardN++) {
  for (let n = 0; n < 100; n++) {
    big.push(answer(`c${cardN}`, new Date(Date.UTC(2026, 0, 1 + n * 3)).toISOString().slice(0, 10), n % 7 === 0 ? 'notYet' : 'knewIt'));
  }
}
const started = Date.now();
const bigStates = basics.replayLadder(big);
const spent = Date.now() - started;
console.log(`  replaying ${big.length} answers across ${bigStates.size} cards took ${spent} ms on this computer`);
check('200,000 answers replay in under 5 seconds here', spent < 5000, `${spent} ms`);

// ---- A sitting ----
const TODAY = '2026-06-01';
const c = (id, seq, unit = 1, group = 'G', extra = {}) => ({ id, seq, unit, unitName: `U${unit}`, group, type: 'Word', status: 'Core', source: 'S', target: `t ${id}`, native: `n ${id}`, exampleTarget: '', exampleNative: '', remember: '', ...extra });
const many = Array.from({ length: 60 }, (_, i) => c(`c${i}`, i + 1));
const stateOf = (readyOn, firstDay = '2026-01-01') => ({ step: 1, readyOn, firstDay, lastDay: firstDay, answers: 1 });
const plan = (over) => basics.planSitting({ cards: many, states: new Map(), today: TODAY, order: 'learning', newLeft: 15, answeredToday: new Set(), ...over });
check('new cards come in learning order', plan().cardIds.slice(0, 3).join() === 'c0,c1,c2' && !plan().goingOver);
check('the day limit holds for units', plan({ newLeft: 5 }).cardIds.length === 5);
check('a sitting stops at 20 cards', plan({ newLeft: 50 }).cardIds.length === basics.SITTING_SIZE);
check('a deck chosen by hand ignores the limit', plan({ newLeft: null }).cardIds.length === basics.SITTING_SIZE);
const waiting = new Map([['c30', stateOf('2026-05-01')], ['c40', stateOf('2099-01-01')]]);
const mixed = plan({ states: waiting, newLeft: 2 }).cardIds;
check('a card waiting joins the new ones, and one not ready stays away', mixed.join() === 'c0,c1,c30');
const random = plan({ order: 'random', newLeft: 15 }).cardIds;
check('random uses the same cards in another order', random.join() !== plan().cardIds.join() && [...random].sort().join() === [...plan().cardIds].sort().join());
check('random is steady all day', random.join() === plan({ order: 'random', newLeft: 15 }).cardIds.join());
check('random stirs differently tomorrow', random.join() !== plan({ order: 'random', newLeft: 15, today: '2026-06-02' }).cardIds.join());
const allSeen = new Map(many.map((card) => [card.id, stateOf('2099-01-01')]));
const over = plan({ states: allSeen, answeredToday: new Set(['c0']) });
check('nothing waiting offers extra cards and says so', over.goingOver && over.cardIds.length === basics.SITTING_SIZE && !over.cardIds.includes('c0'));
const usedUp = plan({ newLeft: 0 });
check('a used up limit with nothing seen still gives something to do', usedUp.goingOver && usedUp.cardIds[0] === 'c0');
check('no cards at all gives nothing and claims nothing', !basics.planSitting({ cards: [], states: new Map(), today: TODAY, order: 'learning', newLeft: 5, answeredToday: new Set() }).goingOver);
const startedToday = new Map(many.slice(0, 10).map((card) => [card.id, stateOf('2099-01-01', TODAY)]));
check('the day limit is worked out from the answers', basics.newLeftToday(startedToday, TODAY, 15) === 5 && basics.newLeftToday(startedToday, '2026-06-02', 15) === 15 && basics.newLeftToday(startedToday, TODAY, 5) === 0);

// ---- Units, decks and the information icon ----
const tiny = [
  c('a', 1, 1, 'First', { remember: 'Keep this in mind.' }),
  c('b', 2, 1, 'Rules', { type: 'Rule', target: 'soy', native: 'A rule' }),
  c('d', 3, 1, 'First'),
  c('e', 4, 2, 'First'),
];
const tinyOutline = {
  id: 'tiny',
  units: { 1: { name: 'One', description: 'd1' }, 2: { name: 'Two', description: 'd2' } },
  groups: { '1|First': { name: 'Plain first', links: {} }, '1|Rules': { name: 'Plain rules', links: { '1|First': 'because' } }, '2|First': { name: 'Plain later', links: { '1|First': 'it builds', '1|Rules': 'it uses' } } },
};
const tinyUnits = basics.unitsOf(tiny, tinyOutline);
check('units come in order with their plain names', tinyUnits.map((u) => u.name).join() === 'One,Two');
check('a group that returns inside a unit stays one deck', tinyUnits[0].decks.length === 2 && tinyUnits[0].decks[0].cards.length === 2 && tinyUnits[0].decks[0].name === 'Plain first');
check('the same group in another unit is another deck', tinyUnits[1].decks[0].key === '2|First');
check('units on Home come in order whatever order they were turned on', basics.unitsTurnedOn(tinyOutline, [2, 1]).map((u) => u.unit).join() === '1,2');
check('a unit no longer in the set is left out of Home', basics.unitsTurnedOn(tinyOutline, [9]).length === 0);
const later = basics.deckInfo('2|First', tiny, tinyOutline, new Set(['a']));
check('earlier decks split into worked on and not yet', later.worked.map((l) => l.name).join() === 'Plain first' && later.notYet.map((l) => l.name).join() === 'Plain rules' && later.worked[0].why === 'it builds');
const firstInfo = basics.deckInfo('1|First', tiny, tinyOutline, new Set());
check('a deck with nothing before it has no links', firstInfo.worked.length === 0 && firstInfo.notYet.length === 0);
check('a unit\'s rule cards are the rules to keep in mind', firstInfo.rules.length === 1 && firstInfo.rules[0].native === 'A rule' && firstInfo.remember.length === 0);
check('a rule deck does not repeat itself', basics.deckInfo('1|Rules', tiny, tinyOutline, new Set()).rules.length === 0);
check('a unit with no rule falls back to what its cards say to remember', basics.deckInfo('2|First', [...tiny.slice(3).map((x) => ({ ...x, remember: 'Later note.' }))], tinyOutline, new Set()).remember.join() === 'Later note.');

// ---- The outlines, against the cards ----
for (const course of [es, en]) {
  const id = course.deck.id;
  const outline = JSON.parse(fs.readFileSync(path.join(coursesDir, `${id}.outline.json`), 'utf8'));
  const first = {};
  for (const card of course.cards) {
    const key = basics.deckKeyOf(card);
    if (first[key] === undefined || card.seq < first[key]) first[key] = card.seq;
  }
  const deckKeys = Object.keys(first);
  check(`${id}: outline says which set it is`, outline.id === id);
  check(`${id}: every deck is named`, deckKeys.every((key) => outline.groups[key]?.name), deckKeys.filter((key) => !outline.groups[key]?.name).join());
  check(`${id}: every named deck exists`, Object.keys(outline.groups).every((key) => first[key] !== undefined));
  check(`${id}: every unit is named and described`, course.cards.every((card) => outline.units[card.unit]?.name && outline.units[card.unit]?.description));
  const links = Object.entries(outline.groups).flatMap(([key, group]) => Object.entries(group.links ?? {}).map(([earlier, why]) => ({ key, earlier, why })));
  check(`${id}: every link goes to a deck that exists`, links.every((link) => first[link.earlier] !== undefined));
  check(`${id}: every link looks backward`, links.every((link) => first[link.earlier] < first[link.key]), links.filter((link) => !(first[link.earlier] < first[link.key])).map((link) => `${link.key} > ${link.earlier}`).slice(0, 3).join());
  check(`${id}: every link says why`, links.every((link) => link.why && link.why.trim().length > 0));
  check(`${id}: the outline has no dash as punctuation`, !/[–—]/.test(JSON.stringify(outline)));
  check(`${id}: the outline does not name the school`, !/kaylista/i.test(JSON.stringify(outline)));
  const rebuilt = basics.unitsOf(course.cards, outline);
  check(`${id}: 26 units with every card in exactly one deck`, rebuilt.length === 26 && rebuilt.reduce((n, u) => n + u.decks.reduce((m, d) => m + d.cards.length, 0), 0) === course.cards.length);
}

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

// ---- Corrections laid over the workbooks, in the learner's language ----
for (const course of [es, en]) {
  const id = course.deck.id;
  const fixes = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'course-fixes', `${id}.json`), 'utf8'));
  const ids = new Set(course.cards.map((card) => card.id));
  check(`${id}: every fixed card is in the set`, Object.keys(fixes.cards || {}).every((cardId) => ids.has(cardId)));
  const meant = course.cards.filter((card) => card.meaning !== undefined);
  check(`${id}: every meaning says something other than the front`, meant.length > 0 && meant.every((card) => card.meaning.trim() && card.meaning !== card.target));
  const shipped = new Set(course.cards.map((card) => card.remember));
  const glossed = Object.entries(fixes.remember || {});
  check(`${id}: every glossed Remember line ships, and the bare one is gone`, glossed.length > 0 && glossed.every(([from, to]) => shipped.has(to) && !shipped.has(from)));
  const heads = course.cards.filter((card) => card.type === 'Verb' && card.target.includes('\n')).map((card) => card.target.split('\n')[0].split(' · ')[1]);
  const untranslated = heads.filter((head) => head && Object.keys(fixes.labels || {}).some((label) => !label.includes('{x}') && head === label));
  check(`${id}: no verb card names its tense in the language being learned`, untranslated.length === 0, untranslated.slice(0, 3).join(', '));
}
const studied = basics.withStudyGroup([{ units: [1, 2], order: 'learning' }], { units: [3, 1, 3], order: 'random' });
check('a group studied together goes first, sorted, once each', JSON.stringify(studied[0]) === JSON.stringify({ units: [1, 3], order: 'random' }) && studied.length === 2);
const again = basics.withStudyGroup(studied, { units: [2, 1], order: 'random' });
check('the same units studied again move up and are not kept twice', again.length === 2 && again[0].units.join() === '1,2' && again[0].order === 'random');
const tenGroups = Array.from({ length: 10 }, (_, i) => i + 1).reduce((groups, unit) => basics.withStudyGroup(groups, { units: [unit], order: 'learning' }), []);
check('Home keeps the newest few groups', tenGroups.length === basics.STUDY_GROUP_LIMIT && tenGroups[0].units[0] === 10);

// ---- Speech ----
const say = speech.speechText;
check('an @ word in Spanish says both forms', say('encantad@', 'es-MX') === 'encantado, encantada');
check('a plural @ word says both', say('tod@s', 'es-MX') === 'todos, todas');
check('a contrast with @ reads cleanly', say('es aburrid@ · está aburrid@', 'es-MX') === 'es aburrido, aburrida, está aburrido, aburrida');
check('every @ in the Spanish set is expanded', es.cards.every((card) => !speech.speechParts(card, 'es-MX').join(' ').includes('@')));
check('a language with no table never says the @', !say('amig@', 'fi-FI').includes('@'));
check('dots, slashes and arrows become pauses', say('a · b / c → d', 'en-US') === 'a, b, c, d');
check('no card in either set gives a voice a symbol to read', [...es.cards, ...en.cards].every((card) => !/[·→@]/.test(speech.speechParts(card, card.id.startsWith('es') ? 'es-MX' : 'en-US').join(' '))));
check('a slash inside a word is left alone', say('he/she', 'en-US') === 'he/she');
const verbSaid = speech.speechParts(byId(en, en.cards.find((card) => card.type === 'Verb' && card.target.split('\n')[0].endsWith(' · presente')).id), 'en-US');
check('a verb card leaves out the line naming the tense', !verbSaid[0].includes('presente'));
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
