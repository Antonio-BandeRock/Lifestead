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
  const dir = path.dirname(rel);
  const need = (name) => (name.startsWith('./') ? load(path.posix.join(dir, name) + '.ts') : {});
  new Function('module', 'exports', 'require', outputText)(m, m.exports, need);
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

// Decks made from the person's records (part 6d), built from made-up inputs.
const R = load('lib/learnRecordDecks.ts');
const read0 = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const tr = (text, values) => (values ? text.replace(/\{(\w+)\}/g, (_, k) => String(values[k])) : text);
const noGuess = { foodDays: [], mealDays: 0, plantings: [], interestMinutes: [] };
check('no records make no decks', R.buildRecordDecks({ meds: [], crops: [], guess: noGuess }, tr).length === 0);
const timing = { ruleId: 'levo_calcium', ruleType: 'timing_separation', title: 'Levothyroxine and calcium need hours between them', guidance: 'Calcium can lower absorption.', citation: 'A label', hours: 4, namesA: ['Levo'], namesB: ['Cal-Mag', 'Cal-Mag'] };
const caution = { ruleId: 'biotin_assay', ruleType: 'reference_only', title: 'Biotin can upset thyroid tests', guidance: 'Biotin can upset some tests.', citation: 'A review', hours: null, namesA: ['Hair vitamins'], namesB: [] };
const crop = (key) => ({ key, name: key[0].toUpperCase() + key.slice(1), problems: [1, 2, 3].map((n) => ({ label: `${key} trouble ${n}`, looks: `Looks ${n}.`, why: `Why ${n}.`, fix: `Fix ${n}.` })) });
const recFull = R.buildRecordDecks(
  {
    meds: [timing, caution],
    crops: ['tomato', 'bean', 'kale', 'pea', 'leek', 'okra'].map(crop),
    guess: {
      foodDays: [{ name: 'Oats', days: 12 }, { name: 'Kale', days: 7 }, { name: 'Rice', days: 7 }, { name: 'Eggs', days: 3 }, { name: 'Figs', days: 1 }],
      mealDays: 22,
      plantings: [{ name: 'Kale', plantedAt: '2026-09-02' }, { name: 'Bean', plantedAt: '2026-08-15' }, { name: 'Leek', plantedAt: '2026-09-20' }, { name: 'Kale', plantedAt: '2026-10-01' }],
      interestMinutes: [{ name: 'Knitting', minutes: 300 }, { name: 'Chess', minutes: 45 }],
    },
  },
  tr,
);
check('three record decks', recFull.map((d) => d.id).join() === R.RECORD_DECK_IDS.join(), recFull.map((d) => d.id));
const recIds = new Set();
for (const deck of recFull) {
  const thinking = deck.cards.filter((card) => card.thinking).length;
  check(`${deck.id}: thinking cards are the majority`, thinking * 2 > deck.cards.length, `${thinking} of ${deck.cards.length}`);
  check(`${deck.id}: title has no colon subtitle`, !deck.title.includes(': '), deck.title);
  for (const card of deck.cards) {
    check(`${card.id}: unique record id`, !recIds.has(card.id) && !cardIds.has(card.id));
    recIds.add(card.id);
    check(`${card.id}: parts fit its kind`, K.cardProblems(card).length === 0, K.cardProblems(card));
    check(`${card.id}: no gap left unfilled`, !/\{\w+\}/.test(card.front + card.back));
  }
}
const meds = recFull.find((d) => d.id === 'rec-meds');
const hoursCard = meds.cards.find((c) => c.kind === 'estimate');
check('a timing card asks the rule hours', hoursCard.options[hoursCard.answer].text === '4 hours', hoursCard.options[hoursCard.answer]);
check('a timing card names both, once each', /your Levo and your Cal-Mag\?/.test(hoursCard.front), hoursCard.front);
check('a timing card id carries the hours', hoursCard.id === 'rec-med-levo_calcium-4');
check('a caution card says what the rule says', meds.cards.some((c) => c.id === 'rec-med-biotin_assay' && c.back === caution.guidance));
check('each rule has a card on its source', meds.cards.filter((c) => /-source$/.test(c.id)).length === 2);
check('the medicine deck leaves a dose to the prescriber', meds.cards.some((c) => /prescriber/.test(c.back)));
const garden = recFull.find((d) => d.id === 'rec-garden');
check('the garden deck stops at five crops', !garden.cards.some((c) => c.id.startsWith('rec-crop-okra')));
const sign = garden.cards.find((c) => c.id === 'rec-crop-tomato-1');
check('a sign card answers with the problem it shows', sign.options[sign.answer].text === 'tomato trouble 2', sign.options);
check('a sign card says why the others are not it', sign.options.filter((o, i) => i !== sign.answer).every((o) => /^Not this one\./.test(o.why)));
const guess = recFull.find((d) => d.id === 'rec-guess');
const food = guess.cards.find((c) => c.id.startsWith('rec-guess-food'));
check('the food guess answers with the most days', food && food.options[food.answer].text === 'Oats' && food.id === 'rec-guess-food-oats', food);
const mealDays = guess.cards.find((c) => c.id.startsWith('rec-guess-meal-days'));
check('the meal days guess picks its band', mealDays.options[mealDays.answer].text === '20 to 25' && mealDays.id === 'rec-guess-meal-days-20');
const planted = guess.cards.find((c) => c.kind === 'order');
check('the planting order runs first to last, one line a crop', planted.items.join() === 'Bean,Kale,Leek', planted.items);
check('the interest guess', guess.cards.some((c) => c.id === 'rec-guess-interest-knitting'));
const tied = R.buildRecordDecks({ meds: [], crops: [], guess: { ...noGuess, foodDays: [{ name: 'A', days: 3 }, { name: 'B', days: 3 }, { name: 'C', days: 1 }] } }, tr);
check('a tie for most eaten makes no food card', tied.length === 0);
const halfTiming = R.buildRecordDecks({ meds: [{ ...timing, namesB: [] }], crops: [], guess: noGuess }, tr);
check('a timing rule with one half matched makes no hours card', !halfTiming.some((d) => d.cards.some((c) => c.kind === 'estimate')));
check('the section reads the record decks', read0('components/LearnSection.tsx').includes('loadRecordDecks(today(), t)'));
check('the medicine deck reads the same matching as the advisories', read0('lib/interactionRules.ts').includes('export async function rulesConcerningMyMeds'));

// Decks a person makes (Learn part 6e).
const M = load('lib/learnMyDecks.ts');
const empty = M.emptyDraft();
check('an empty card says it needs a question', M.draftProblem(empty) === 'The card needs a question on its front first.');
check('a card with no answer says so', M.draftProblem({ ...empty, front: 'What is a shrub?' }) === 'The card needs an answer for its back first.');
const flip = { ...empty, front: 'What is a shrub?', back: 'A woody plant with many stems.' };
check('a flip card with both sides is ready', M.draftProblem(flip) === null);
const choice = { ...flip, kind: 'choice', options: [{ text: 'Oak', why: 'A tree, one trunk.' }, { text: 'Lilac', why: 'Many stems from the ground.' }, { text: '', why: '' }], answer: 1 };
check('a choice with two whole options is ready', M.draftProblem(choice) === null, M.draftProblem(choice));
check('an option with no reason is named', /why it is or is not/.test(M.draftProblem({ ...choice, options: [{ text: 'Oak', why: '' }, choice.options[1]] }) || ''));
check('an answer on an empty option is named', M.draftProblem({ ...choice, answer: 2 }) === 'Mark which option is the answer.');
check('a case needs its story', /story/.test(M.draftProblem({ ...choice, kind: 'case' }) || ''));
check('a blank needs its gap', /where the gap goes/.test(M.draftProblem({ ...flip, kind: 'blank', accept: 'x' }) || ''));
check('a blank needs what fills it', /fills the gap/.test(M.draftProblem({ ...flip, kind: 'blank', front: 'A ____ has many stems.' }) || ''));
check('an order needs three', /three things/.test(M.draftProblem({ ...flip, kind: 'order', items: ['a', 'b', ''] }) || ''));
check('an order with a repeat is named', /say the same/.test(M.draftProblem({ ...flip, kind: 'order', items: ['a', 'b', 'A'] }) || ''));
check('pairs need both tiles', /both of its tiles/.test(M.draftProblem({ ...flip, kind: 'pairs', pairs: [{ left: 'a', right: '' }] }) || ''));
const pairsDraft = { ...flip, kind: 'pairs', pairs: [{ left: 'a', right: '1' }, { left: 'b', right: '2' }, { left: 'c', right: '3' }, { left: '', right: '' }] };
check('three whole pairs are ready', M.draftProblem(pairsDraft) === null);
// Every ready draft of every kind makes a card the study view accepts.
const ready = {
  flip,
  explain: { ...flip, kind: 'explain' },
  choice,
  estimate: { ...choice, kind: 'estimate' },
  case: { ...choice, kind: 'case', story: 'A plant in the yard has five stems.' },
  blank: { ...flip, kind: 'blank', front: 'A ____ has many stems.', accept: 'shrub\nbush\n' },
  order: { ...flip, kind: 'order', items: ['seed', 'sprout', 'flower', ''] },
  pairs: pairsDraft,
};
check('every kind is offered in the form', K.LEARN_KINDS.every((kind) => M.KIND_LABELS[kind] && ready[kind]));
for (const [kind, draft] of Object.entries(ready)) {
  check(`${kind}: ready`, M.draftProblem(draft) === null, M.draftProblem(draft));
  const row = { id: 'my-card-1', deckId: 'my-deck-1', kind: draft.kind, front: draft.front, back: draft.back, thinking: false, parts: JSON.stringify(M.draftParts(draft)), position: 0 };
  const card = M.rowToCard(row);
  check(`${kind}: the kept card passes the kind check`, K.cardProblems(card).length === 0, K.cardProblems(card));
  const back = M.rowToDraft(row);
  check(`${kind}: opens again in the form as it was kept`, M.draftProblem(back) === null && back.kind === draft.kind);
}
check('the answer follows its option past an empty one', M.rowToCard({ id: 'x', deckId: 'd', kind: 'choice', front: 'q', back: 'a', thinking: false, parts: JSON.stringify(M.draftParts({ ...choice, options: [{ text: '', why: '' }, ...choice.options.slice(0, 2)], answer: 2 })), position: 0 }).answer === 1);
check('a stored card with broken parts still opens', M.rowToCard({ id: 'x', deckId: 'd', kind: 'nonsense', front: 'q', back: 'a', thinking: true, parts: '{', position: 0 }).front === 'q');
check('cards keep their order', M.buildMyDeck({ id: 'd', title: 'T', about: '' }, [
  { id: 'b', deckId: 'd', kind: 'flip', front: '2', back: '2', thinking: false, parts: '{}', position: 1 },
  { id: 'a', deckId: 'd', kind: 'flip', front: '1', back: '1', thinking: false, parts: '{}', position: 0 },
]).cards.map((c) => c.id).join() === 'a,b');
check('a deck needs a name', M.deckTitleProblem('  ') === 'The deck needs a name first.' && M.deckTitleProblem('Knots') === null);
const answered = new Set(['my-card-1']);
check('an answered card is retired', M.planCardRemoval('my-card-1', answered) === 'retire');
check('an unanswered card is deleted', M.planCardRemoval('my-card-2', answered) === 'delete');
check('a deck with an answered card is retired', M.planDeckRemoval(['my-card-2', 'my-card-1'], answered) === 'retire');
check('a deck with no answers is deleted', M.planDeckRemoval(['my-card-2'], answered) === 'delete');
check('a retired card still counts', /still counts/.test(M.describeRemoval('card', 'retire')) && /still counts/.test(M.describeRemoval('deck', 'retire')));
check('the thinking line shows when recall cards are most', M.describeThinkingShare([{ thinking: false }, { thinking: false }, { thinking: true }]) !== null);
check('the thinking line stays away at half', M.describeThinkingShare([{ thinking: false }, { thinking: true }]) === null && M.describeThinkingShare([]) === null);
check('the thinking line has no count in it', !/[0-9]/.test(M.describeThinkingShare([{ thinking: false }]) || ''));
check('ids never meet a ready-made one', read0('lib/learnMyDecksDb.ts').includes('`${MY_DECK_PREFIX}${what}-'));
check('the tables', read0('lib/db.ts').includes('CREATE TABLE IF NOT EXISTS learn_my_decks') && read0('lib/db.ts').includes('CREATE TABLE IF NOT EXISTS learn_my_cards'));
check('making is paid', read0('lib/paidFeatures.ts').includes('learnMake:') && read0('components/LearnMyDecksEditor.tsx').includes("isFunctionWalled(tier, 'learnMake')"));
check('on Free the buttons say why', read0('components/LearnMyDecksEditor.tsx').includes('explainNotYet(MAKE_PAID_LINE)'));
check('the section studies decks you made', read0('components/LearnSection.tsx').includes('listMyDecks()') && read0('components/LearnSection.tsx').includes('<LearnMyDecksEditor'));
check('sync words for decks you made', read0('lib/snapshotChanges.ts').includes("count: ['learn_my_decks']") && read0('lib/snapshotChanges.ts').includes("count: ['learn_my_cards']"));

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

// Cards from a table.
const I = load('lib/learnImport.ts');
const idT = (text, values) => (values ? text.replace(/\{(\w+)\}/g, (_, key) => String(values[key])) : text);
check('a comma table splits', JSON.stringify(I.parseTable('a,b\nc,d')) === JSON.stringify([['a', 'b'], ['c', 'd']]));
check('a tab table splits on tabs, keeping commas in a cell', JSON.stringify(I.parseTable('one, two\tthree\n')) === JSON.stringify([['one, two', 'three']]));
check('a semicolon table splits on semicolons', JSON.stringify(I.parseTable('a;b;c\r\nd;e;f')) === JSON.stringify([['a', 'b', 'c'], ['d', 'e', 'f']]));
check('a quoted cell keeps its comma, its line break and its quotes', JSON.stringify(I.parseTable('"Hello, ""you""\nthere",b')) === JSON.stringify([['Hello, "you"\nthere', 'b']]));
check('a leading byte order mark is dropped', I.parseTable('﻿front,back')[0][0] === 'front');
check('markup is taken out of a cell', I.plainCell('<b>Big</b>&nbsp;bird<br/>here &amp; there') === 'Big bird here & there');
{
  const r = I.importTable('Front,Back\nCapital of France?,Paris\nWhy test twice?,Chance,yes\n');
  check('a heading row is read as headings', r.headings === true && r.drafts.length === 2);
  check('a plain row becomes a question and answer card', r.drafts[0].kind === 'flip' && r.drafts[0].front === 'Capital of France?' && r.drafts[0].back === 'Paris' && r.drafts[0].thinking === false);
  check('a third column reading yes marks a thinking card', r.drafts[1].thinking === true);
}
{
  const r = I.importTable('pregunta;respuesta\nEl ____ es azul;cielo|mar');
  check('Spanish headings are read as headings', r.headings === true);
  check('a front holding the gap becomes a gap to fill', r.drafts[0].kind === 'blank' && r.drafts[0].back === 'cielo' && r.drafts[0].accept === 'cielo\nmar');
}
{
  const r = I.importTable('Paris,France\nonly one\n,empty front\nempty back,\nParis,france\n\n');
  check('a first row that names no columns is a card', r.headings === false && r.drafts.length === 1);
  check('one column is left out with why', r.skipped.some((x) => x.row === 2 && x.reason.includes('one column')));
  check('an empty front is left out with why', r.skipped.some((x) => x.row === 3 && x.reason === 'its front is empty'));
  check('an empty back is left out with why', r.skipped.some((x) => x.row === 4 && x.reason === 'its back is empty'));
  check('a repeated row is left out, whatever its case', r.skipped.some((x) => x.row === 5 && x.reason.includes('same card')));
  check('an empty row is passed over without a word', r.skipped.length === 4);
  const lines = I.describeImport(r, idT);
  check('the lines say what is ready', lines[0] === '1 card is ready to add.');
  check('the lines name each row left out', lines.some((l) => l === 'Row 3 is left out: its front is empty.'));
}
{
  const many = Array.from({ length: I.IMPORT_ROW_LIMIT + 7 }, (_, i) => `q${i},a${i}`).join('\n');
  const r = I.importTable(many);
  check('one import stops at the limit and counts the rest', r.drafts.length === I.IMPORT_ROW_LIMIT && r.cut === 7);
  check('the cut is said', I.describeImport(r, idT).some((l) => l.includes('7 after them were not read')));
  const skips = I.importTable(Array.from({ length: 8 }, (_, i) => `only${i}`).join('\n'));
  const skipLines = I.describeImport(skips, idT);
  check('nothing ready is said plainly', skipLines[0] === 'No row of this table can become a card yet.');
  check('past five rows left out, the rest are counted', skipLines.includes('3 more rows are left out for the same kinds of reason.'));
}
check('the editor imports through the pure module', read0('components/LearnMyDecksEditor.tsx').includes('importTable(text)'));
check('imported cards are kept in one transaction', read0('lib/learnMyDecksDb.ts').includes('withTransactionAsync'));
check('a card shows its photo above the question', read0('components/LearnCardView.tsx').includes('<LearnCardPhoto'));
check('a deleted card takes its photo with it', read0('lib/learnMyDecksDb.ts').includes('removePhotosOf(LEARN_CARD_OWNER_KIND'));
check('a cancelled new card forgets its photo', read0('components/LearnMyDecksEditor.tsx').includes('forgetPhotos([cardForm.newId])'));

// Sharing a deck.
{
  const S = load('lib/learnShare.ts');
  const M = load('lib/learnMyDecks.ts');
  const idT = (text, values) => (values ? text.replace(/\{(\w+)\}/g, (_, key) => String(values[key])) : text);
  const row = (id, draft, position) => ({ id, deckId: 'my-deck-1', kind: draft.kind, front: draft.front, back: draft.back, thinking: draft.thinking, parts: JSON.stringify(M.draftParts(draft)), position });
  const flip = { ...M.emptyDraft('flip'), front: 'Why test twice?', back: 'Chance', thinking: true };
  const choice = { ...M.emptyDraft('choice'), front: 'Which is a seed?', back: 'A bean', options: [{ text: 'A bean', why: 'It grows' }, { text: 'A stone', why: 'It does not' }], answer: 0 };
  const rows = [row('my-card-a', flip, 0), row('my-card-b', choice, 1)];
  const deck = { id: 'my-deck-1', title: 'Seeds', about: 'What grows' };
  const payload = S.buildDeckPayload(deck, rows, new Map([['my-card-b', 'QUJD']]));
  check('a shared deck carries its words and every card', payload.kind === 'deck' && payload.title === 'Seeds' && payload.cards.length === 2);
  check('a photo rides on its own card', payload.cards[1].photoBase64 === 'QUJD' && !payload.cards[0].photoBase64);
  check('no answer, schedule or position travels', !JSON.stringify(payload).includes('position') && !JSON.stringify(payload).includes('my-card-a'));
  check('the shape check takes a deck', S.isDeckPayloadShape(payload));
  check('the shape check turns away a deck with no cards', !S.isDeckPayloadShape({ ...payload, cards: [] }));
  check('the shape check turns away a deck with no name', !S.isDeckPayloadShape({ ...payload, title: '  ' }));
  const wire = JSON.parse(JSON.stringify(payload));
  const read = S.readSharedDeck(wire);
  check('every good card is read back', read.cards.length === 2 && read.skipped === 0);
  check('a read card is the card that was sent', read.cards[1].options[1].text === 'A stone' && read.cards[0].thinking === true);
  const bad = { ...wire, cards: [...wire.cards, { kind: 'teleport', front: 'x' }, { kind: 'flip', front: '', back: 'y' }, { kind: 'choice', front: 'q', back: 'a', options: [{ text: 'a', why: '' }], answer: 5 }, 'nonsense'] };
  const readBad = S.readSharedDeck(bad);
  check('a card of an unknown kind, an empty side, an answer past its options and a stray value are counted, never kept', readBad.cards.length === 2 && readBad.skipped === 4);
  check('a photo that is not base64 is dropped', S.readSharedCard({ ...wire.cards[0], photoBase64: '<script>' }).photoBase64 === undefined);
  const lines = S.describeSharedDeck(readBad, idT);
  check('the receiving lines say how many cards, photos and cards left out', lines[0] === '2 cards.' && lines[1] === '1 of them has a photo.' && lines[2] === '4 cards in the file could not be read and are left out.');
  check('photos past the limit are counted for the sender', S.photosLeftBehind(S.SHARE_DECK_PHOTO_LIMIT + 3) === 3 && S.photosLeftBehind(2) === 0);
  const many = new Map(Array.from({ length: S.SHARE_DECK_PHOTO_LIMIT + 5 }, (_, i) => [`my-card-${i}`, 'QUJD']));
  const manyRows = Array.from({ length: S.SHARE_DECK_PHOTO_LIMIT + 5 }, (_, i) => row(`my-card-${i}`, flip, i));
  check('no more than the photo limit travel', S.buildDeckPayload(deck, manyRows, many).cards.filter((c) => c.photoBase64).length === S.SHARE_DECK_PHOTO_LIMIT);
}
check('a deck goes through the signed envelope', read0('lib/sharing.ts').includes("parsed.payload.kind === 'deck'") && read0('lib/sharing.ts').includes('isDeckPayloadShape'));
check('recipe paths never meet a deck', read0('lib/sharing.ts').includes('return envelope && !isDeckEnvelope(envelope) ? envelope : null;'));
check('the import screen hands a deck to the deck preview', read0('app/import-shared.tsx').includes('<SharedDeckPreview'));
check('a shared deck is kept as a deck of the person', read0('components/SharedDeckPreview.tsx').includes('addSharedDeck(read)'));
check('the open deck offers Share the Deck', read0('components/LearnMyDecksEditor.tsx').includes('Share the Deck'));

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
const FILES = ['lib/learnSchedule.ts', 'lib/learnDecks.ts', 'lib/learnDb.ts', 'components/LearnSection.tsx', 'lib/learnKinds.ts', 'components/LearnCardView.tsx', 'lib/learnRecordDecks.ts', 'lib/learnRecordDecksDb.ts', 'lib/learnMyDecks.ts', 'lib/learnMyDecksDb.ts', 'components/LearnMyDecksEditor.tsx', 'lib/learnImport.ts', 'components/LearnCardPhoto.tsx', 'lib/learnShare.ts', 'components/SharedDeckPreview.tsx'];
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
