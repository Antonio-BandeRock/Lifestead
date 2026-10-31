// Checks Interests > Learn: the SM-2 schedule in lib/learnSchedule.ts, that
// only the first answer on a day moves it, that things you now know needs
// two days and never goes down, what a sitting offers and in what order, the
// wording, the ready-made decks in lib/learnDecks.ts (unique ids, thinking
// cards the majority, https sources, no colon subtitles), and a sweep of
// every Learn file for scoring, scolding and filler.
// Run: node scripts/test_learn.js
/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.join(__dirname, '..');
function load(rel) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', outputText)(m, m.exports, () => ({}));
  return m.exports;
}
const S = load('lib/learnSchedule.ts');
const D = load('lib/learnDecks.ts');
const K = load('lib/learnKinds.ts');

let pass = 0;
let fail = 0;
function check(name, ok, detail) {
  if (ok) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ''}`);
  }
}

const r = (cardId, day, grade, hour = 9) => ({ cardId, day, grade, answeredAt: `${day}T${String(hour).padStart(2, '0')}:00:00.000Z` });

// Days.
check('addDays across a month', S.addDays('2026-10-30', 3) === '2026-11-02');
check('addDays across a year', S.addDays('2026-12-31', 1) === '2027-01-01');
check('daysBetween', S.daysBetween('2026-10-30', '2026-11-05') === 6);

// SM-2 steps: 1, then 6, then the interval times the ease.
let st = S.stepCard(S.newCardState(), 'knewIt', '2026-10-01');
check('first recall waits 1 day', st.interval === 1 && st.readyOn === '2026-10-02', st);
st = S.stepCard(st, 'knewIt', '2026-10-02');
check('second recall waits 6 days', st.interval === 6 && st.readyOn === '2026-10-08', st);
const ease = st.ease;
st = S.stepCard(st, 'knewIt', '2026-10-08');
check('third recall waits interval times ease', st.interval === Math.round(6 * ease), st);
const missed = S.stepCard(st, 'notYet', '2026-10-30');
check('not yet starts again from one day', missed.repetitions === 0 && missed.interval === 1 && missed.readyOn === '2026-10-31', missed);
check('not yet lowers the ease', missed.ease < st.ease);
let low = S.newCardState();
for (let i = 0; i < 20; i++) low = S.stepCard(low, 'notYet', S.addDays('2026-01-01', i));
check('ease never goes under 1.3', low.ease >= 1.3, low.ease);
const easy = S.stepCard(S.newCardState(), 'easily', '2026-10-01');
check('easily raises the ease', easy.ease > 2.5, easy.ease);

// Only the first answer on a day moves the schedule.
const sameDay = S.replayCard([r('a', '2026-10-01', 'notYet', 9), r('a', '2026-10-01', 'easily', 10)]);
check('a second answer the same day is practice', sameDay.repetitions === 0 && sameDay.readyOn === '2026-10-02', sameDay);
const outOfOrder = S.replayCard([r('a', '2026-10-02', 'knewIt'), r('a', '2026-10-01', 'knewIt')]);
check('answers replay in time order', outOfOrder.interval === 6 && outOfOrder.readyOn === '2026-10-08', outOfOrder);

// Things you now know: two separate days, and the count never goes down.
check('one day of recall is not yet known', S.countKnown([r('a', '2026-10-01', 'knewIt'), r('a', '2026-10-01', 'easily', 11)]) === 0);
const twoDays = [r('a', '2026-10-01', 'knewIt'), r('a', '2026-10-02', 'withEffort')];
check('two days of recall is known', S.countKnown(twoDays) === 1);
check('forgetting later leaves the count', S.countKnown([...twoDays, r('a', '2026-10-20', 'notYet')]) === 1);
check('a not yet day does not count toward knowing', S.countKnown([r('a', '2026-10-01', 'knewIt'), r('a', '2026-10-02', 'notYet')]) === 0);
check('a card from a deck no longer offered still counts', S.countKnown([r('gone', '2026-01-01', 'knewIt'), r('gone', '2026-01-03', 'knewIt')]) === 1);

// A sitting: ready cards first, oldest first, then new cards in deck order.
const ids = Array.from({ length: 20 }, (_, i) => `c${i}`);
const fresh = S.planSitting(ids, [], '2026-10-30');
check('a new deck offers only the new card limit', fresh.cardIds.length === S.NEW_PER_SITTING && fresh.newCount === S.NEW_PER_SITTING, fresh);
check('new cards come in deck order', fresh.cardIds.join() === 'c0,c1,c2,c3,c4');
const history = [r('c5', '2026-10-20', 'knewIt'), r('c3', '2026-10-25', 'knewIt'), r('c9', '2026-10-30', 'knewIt')];
const mixed = S.planSitting(ids, history, '2026-10-30');
check('ready cards come first, longest waiting first', mixed.cardIds[0] === 'c5' && mixed.cardIds[1] === 'c3', mixed.cardIds);
check('a card answered today is not offered', !mixed.cardIds.includes('c9'));
check('the sitting stays within its size', mixed.cardIds.length <= S.SITTING_SIZE);
const many = ids.map((id) => r(id, '2026-10-01', 'knewIt'));
const full = S.planSitting(ids, many, '2026-10-30');
check('a full sitting of ready cards leaves no room for new', full.cardIds.length === S.SITTING_SIZE && full.newCount === 0, full);
const waiting = S.planSitting(['a'], [r('a', '2026-10-30', 'knewIt')], '2026-10-30');
check('nothing ready names the next day', waiting.cardIds.length === 0 && waiting.nextReadyOn === '2026-10-31', waiting);

// Wording.
const today = '2026-10-30';
check('ready today', S.describeReadyDay('2026-10-30', today) === 'today');
check('ready tomorrow', S.describeReadyDay('2026-10-31', today) === 'tomorrow');
check('ready within the week names the day', S.describeReadyDay('2026-11-02', today) === 'on Monday', S.describeReadyDay('2026-11-02', today));
check('ready later names the date', S.describeReadyDay('2026-11-20', today) === 'on 20 November');
check('a deck never opened', S.describeDeckReady(S.deckStanding(ids, [], today), today) === '5 cards to start with.');
check('a deck with nothing ready', S.describeDeckReady(S.deckStanding(['a'], [r('a', today, 'knewIt')], today), today) === 'More cards are ready tomorrow.');
check('an empty deck', S.describeDeckReady(S.deckStanding([], [], today), today) === 'This deck has no cards yet.');
check('known at none explains itself', /two separate days/.test(S.describeKnown(0)));
check('known at one', S.describeKnown(1) === '1 thing you now know.');
check('known at many', S.describeKnown(7) === '7 things you now know.');
check('sitting done with more now', S.describeSittingDone(0, 5, null, today) === 'That is this sitting. 5 more cards are ready whenever you want them.');
check('sitting done with more tomorrow', S.describeSittingDone(2, 0, '2026-10-31', today) === 'That is every card ready for now. More are ready tomorrow. 2 things you now know.');
check('grade labels', S.LEARN_GRADES.map((g) => S.LEARN_GRADE_LABELS[g]).join() === 'Not Yet,With Effort,Knew It,Easily');

// The decks. Entry ids are read from the reading corpus files as text, so
// the corpus need not load here.
const digestDir = path.join(root, 'lib/digest');
const entryIds = new Set();
for (const file of fs.readdirSync(digestDir)) {
  if (!file.endsWith('.ts')) continue;
  const text = fs.readFileSync(path.join(digestDir, file), 'utf8');
  for (const m of text.matchAll(/\bid: '([^']+)'/g)) entryIds.add(m[1]);
}
const cardIds = new Set();
check('there is a deck', D.LEARN_DECKS.length > 0);
for (const deck of D.LEARN_DECKS) {
  check(`${deck.id}: title and about`, Boolean(deck.title && deck.about));
  check(`${deck.id}: title has no colon subtitle`, !deck.title.includes(': '), deck.title);
  check(`${deck.id}: has cards`, deck.cards.length > 0);
  const thinking = deck.cards.filter((card) => card.thinking).length;
  check(`${deck.id}: thinking cards are the majority`, thinking * 2 > deck.cards.length, `${thinking} of ${deck.cards.length}`);
  for (const card of deck.cards) {
    check(`${card.id}: unique id`, !cardIds.has(card.id));
    cardIds.add(card.id);
    check(`${card.id}: front and back`, Boolean(card.front && card.back));
    const problems = K.cardProblems(card);
    check(`${card.id}: parts fit its kind`, problems.length === 0, problems);
    if (card.entryId) check(`${card.id}: entry ${card.entryId} is in the reading`, entryIds.has(card.entryId));
    if (card.source) {
      check(`${card.id}: source named`, Boolean(card.source.source));
      check(`${card.id}: source is https`, /^https:\/\//.test(card.source.url), card.source.url);
    }
  }
  check(`${deck.id}: deckById`, D.deckById(deck.id) === deck);
}
const kindsUsed = new Set(D.LEARN_DECKS.flatMap((deck) => deck.cards.map((card) => K.kindOf(card))));
check('every kind is used in a ready-made deck', K.LEARN_KINDS.every((kind) => kindsUsed.has(kind)), [...kindsUsed]);
const fromReading = D.LEARN_DECKS.filter((deck) => deck.cards.length > 0 && deck.cards.every((card) => card.entryId));
check('at least three decks are drawn from the reading', fromReading.length >= 3, fromReading.map((d) => d.id));
check('cardById finds a card', D.cardById('evidence-rct')?.deck.id === 'evidence');

// The kinds of question.
check('typed answers are read kindly', K.normalizeAnswer('  The Confounder! ') === 'confounder');
check('accents are read kindly', K.normalizeAnswer('Factor de Confusión') === 'factor de confusion');
check('a blank takes any accepted answer', K.checkBlank(['confounder', 'confounding factor'], 'a Confounding factor.'));
check('a blank does not take another word', !K.checkBlank(['confounder'], 'placebo'));
check('an empty blank is not an answer', !K.checkBlank(['confounder'], '   '));
const sh1 = K.shuffledIndexes(5, 'card:2026-10-30');
check('a shuffle is the same all day', sh1.join() === K.shuffledIndexes(5, 'card:2026-10-30').join());
check('a shuffle holds every item once', [...sh1].sort().join() === '0,1,2,3,4');
let neverRight = true;
for (let i = 0; i < 200; i++) {
  for (const n of [2, 3, 5]) {
    const order = K.shuffledIndexes(n, `seed${i}`);
    if (order.every((v, j) => v === j)) neverRight = false;
  }
}
check('a shuffle never starts in the right order', neverRight);
check('one item shuffles to itself', K.shuffledIndexes(1, 'x').join() === '0');
check('an order in place', K.orderIsRight(['a', 'b', 'c'], ['a', 'b', 'c']));
check('an order out of place', !K.orderIsRight(['a', 'b', 'c'], ['b', 'a', 'c']));
check('an order not finished', !K.orderIsRight(['a', 'b', 'c'], ['a', 'b']));
check('a pair', K.isPair([{ left: 'x', right: 'y' }], 'x', 'y') && !K.isPair([{ left: 'x', right: 'y' }], 'y', 'x'));
check('a pick that is it', K.describePick({ text: 'a', why: 'Because.' }, true) === 'That is it. Because.');
check('a pick that is not it', K.describePick({ text: 'a', why: 'Because.' }, false) === 'Not this one. Because.');
check('a blank answer named', K.describeBlank(false, ['confounder']) === 'The gap holds "confounder".');
check('every kind has a prompt', K.LEARN_KINDS.every((kind) => Boolean(K.KIND_PROMPTS[kind])));
check('a choice with no reasons is caught', K.cardProblems({ kind: 'choice', front: 'q', back: 'a', options: [{ text: 'a', why: '' }, { text: 'b', why: 'x' }], answer: 0 }).length > 0);
check('a blank with no gap is caught', K.cardProblems({ kind: 'blank', front: 'q', back: 'a', accept: ['x'] }).length > 0);
check('a case with no story is caught', K.cardProblems({ kind: 'case', front: 'q', back: 'a', options: [{ text: 'a', why: 'x' }, { text: 'b', why: 'y' }], answer: 0 }).length > 0);
check('pairs with a repeated tile are caught', K.cardProblems({ kind: 'pairs', front: 'q', back: 'a', pairs: [{ left: 'a', right: 'x' }, { left: 'a', right: 'y' }, { left: 'b', right: 'z' }] }).length > 0);

// Wiring.
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
check('the table', read('lib/db.ts').includes('CREATE TABLE IF NOT EXISTS learn_reviews'));
check('the section draws cards through the card view', read('components/LearnSection.tsx').includes('<LearnCardView'));
check('the lens', read('app/(tabs)/interests.tsx').includes("lens === 'learn'"));
check('how-tos', read('lib/toolHowTos.ts').includes("'/interests#learn'"));
check('voice', read('lib/voiceLensDirectory.ts').includes("key: 'learn'"));
check('sync words', read('lib/snapshotChanges.ts').includes("count: ['learn_reviews']"));

// What is never said anywhere in Learn.
const FORBIDDEN = [
  'streak', 'points', 'score', 'level', 'badge', 'well done', 'great job', 'missed', 'overdue', 'behind',
  'fail', 'wrong', 'must', 'you should', 'real ', 'genuine', 'honestly', '—', '–', ' -- ', 'percent', '%',
];
const FILES = ['lib/learnSchedule.ts', 'lib/learnDecks.ts', 'lib/learnDb.ts', 'components/LearnSection.tsx', 'lib/learnKinds.ts', 'components/LearnCardView.tsx'];
const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
for (const rel of FILES) {
  const text = read(rel)
    .split('\n')
    .filter((row) => !row.trim().startsWith('//') && !row.trim().startsWith('*') && !row.trim().startsWith('/**'))
    .join('\n');
  let match;
  while ((match = re.exec(text))) {
    const value = match[1] ?? match[2] ?? match[3];
    if (!value || !/[A-Za-z]{3,} [A-Za-z]/.test(value)) continue;
    const lower = value.toLowerCase();
    for (const word of FORBIDDEN) {
      if (lower.includes(word)) check(`${rel}: "${word}" stays out: "${value.slice(0, 70)}"`, false);
    }
  }
}

console.log(`${pass + fail} checks, ${fail} failures`);
process.exit(fail ? 1 : 0);
