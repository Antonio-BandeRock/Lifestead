// Checks lib/setupSections.ts, setup one part of life at a time (1.0.79.7),
// and the backup reminder in lib/backupOffer.ts.
//
// What it holds to: every part of life has its why, its questions and its
// cards; every card a part names exists in lib/setupCards.ts and carries a
// line saying what it feeds; every question a part or the last questions
// name is a question the interview asks; the list puts open parts first,
// done ones next and skipped ones at the end; setup moves from choosing
// parts to the list to the last questions to finished; the backup reminder
// never shows while Automatic Sync is on, after Stop Asking, at night, or
// before three days; and no sentence uses a dash for punctuation, a
// percentage, praise or the filler words this app keeps out.
//
// Exits non-zero on any failure.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(relPath, allowed = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    if (allowed[name]) return allowed[name];
    throw new Error(`${relPath} must stay free of runtime imports (asked for ${name})`);
  });
  return module.exports;
}

const story = load('lib/yourStory.ts');
const cards = load('lib/setupCards.ts');
const sections = load('lib/setupSections.ts');
const offer = load('lib/backupOffer.ts', { 'expo-file-system': { File: class {}, Paths: {} } });

let checks = 0;
let failures = 0;
function check(condition, label) {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.log(`FAIL ${label}`);
  }
}

const beats = Object.keys(story.BEAT_LABELS);
check(beats.length === 10, `ten parts of life (found ${beats.length})`);

// The interview's question kinds, read from its source, since it imports
// at runtime.
const interviewSource = fs.readFileSync(path.join(__dirname, '..', 'lib/yourStoryInterview.ts'), 'utf8');
const kinds = new Set([...interviewSource.matchAll(/kind: '([a-zA-Z]+)'/g)].map((m) => m[1]));

for (const beat of beats) {
  check(typeof sections.SECTION_WHY[beat] === 'string' && sections.SECTION_WHY[beat].length > 40, `${beat} says why it matters`);
  check(Array.isArray(sections.SECTION_QUESTIONS[beat]), `${beat} lists its questions`);
  check(Array.isArray(sections.SECTION_CARDS[beat]) && sections.SECTION_CARDS[beat].length > 0, `${beat} has cards to set up`);
  check(typeof sections.BEAT_START_PATH[beat] === 'string', `${beat} has a tab to start on`);
  for (const kind of sections.SECTION_QUESTIONS[beat] ?? []) check(kinds.has(kind), `${beat} asks ${kind}, which the interview has`);
  for (const key of sections.SECTION_CARDS[beat] ?? []) {
    check(!!cards.setupCardByKey(key), `${beat} card ${key} exists in setupCards`);
    check(typeof sections.CARD_WHY[key] === 'string' && sections.CARD_WHY[key].length > 20, `${beat} card ${key} says what it feeds`);
  }
}
for (const key of Object.keys(sections.CARD_WHY)) {
  check(beats.some((beat) => sections.SECTION_CARDS[beat].includes(key)), `CARD_WHY ${key} belongs to a part`);
}
for (const kind of sections.CLOSING_QUESTIONS) check(kinds.has(kind), `last question ${kind} is asked by the interview`);
check(sections.CLOSING_QUESTIONS.slice(-2).join() === 'security,homeView', 'records kept closed, then Home, are the last two');
check(sections.CLOSING_QUESTIONS.indexOf('backup') < sections.CLOSING_QUESTIONS.indexOf('homeView'), 'the backup comes before Home');

// A small interview to walk the stages with.
function interview({ chosen = true, picked = ['health', 'food', 'garden'], parts = {}, questions = [] } = {}) {
  const answers = {};
  if (chosen) answers[sections.SETUP_PARTS_KEY] = { answer: sections.SETUP_PARTS_CHOSEN };
  for (const [beat, how] of Object.entries(parts)) answers[sections.partAnswerKey(beat)] = { answer: how };
  return {
    facts: { answers, story: { beats: picked } },
    questions: questions.map(([key, answered]) => ({ key, answered, def: { kind: key.split(':')[0] } })),
  };
}

check(sections.setupStage(interview({ chosen: false })) === 'parts', 'nothing chosen yet: choose the parts');
check(sections.setupStage(interview({ picked: [] })) === 'parts', 'chosen but no parts: choose the parts');
check(sections.setupStage(interview()) === 'list', 'parts chosen: the list');
const listed = sections.listParts(interview({ parts: { health: 'skip', food: 'done' } })).map((part) => `${part.beat}:${part.state}`);
check(listed.join() === 'garden:open,food:done,health:skipped', `open, then done, then skipped (got ${listed.join()})`);
const settled = interview({ parts: { health: 'done', food: 'skip', garden: 'done' }, questions: [['backup', false], ['homeView', false]] });
check(sections.setupStage(settled) === 'closing', 'every part settled: the last questions');
check(sections.closingQuestions(settled).map((q) => q.key).join() === 'backup,homeView', 'the last questions keep their order');
const finished = interview({ parts: { health: 'done', food: 'skip', garden: 'done' }, questions: [['backup', true], ['homeView', true]] });
check(sections.setupStage(finished) === 'finished', 'everything answered: finished');
check(!sections.setupWaiting(finished), 'finished setup is not waiting');
const healthQuestions = sections.sectionQuestions(
  interview({ questions: [['meds', false], ['aboutYou', false], ['stage:HASH', false], ['conditions', true]] }),
  'health',
);
check(healthQuestions.map((q) => q.key).join() === 'aboutYou,stage:HASH,meds', `a part asks its open questions in order (got ${healthQuestions.map((q) => q.key).join()})`);

// What the app needs comes before any part (1.0.80.9, reported: Health
// chosen and no birth date asked).
{
  const open = [['eatingStyle', false], ['meds', false], ['stage:HASH', false], ['aboutYou', false], ['allergies', false], ['conditions', false], ['backup', false]];
  const gardenFirst = interview({ picked: ['garden', 'health'], questions: open });
  check(sections.setupStage(gardenFirst) === 'required', 'parts chosen with questions waiting: what the app needs comes first');
  const order = sections.requiredQuestions(gardenFirst).map((q) => q.key).join();
  check(order === 'aboutYou,conditions,stage:HASH,meds,allergies', `asked in the order each feeds the next, whichever part is listed first (got ${order})`);
  const withFood = sections.requiredQuestions(interview({ picked: ['food'], questions: open })).map((q) => q.key);
  check(withFood[0] === 'aboutYou' && withFood[withFood.length - 1] === 'eatingStyle', 'a way of eating comes after everything it reads');
  const movement = sections.requiredQuestions(interview({ picked: ['movement'], questions: open })).map((q) => q.key).join();
  check(movement === '', `Movement alone asks nothing, since nothing it shows reads birth date or sex (got ${movement})`);
  check(sections.requiredQuestions(interview({ picked: ['garden'], questions: open })).length === 0, 'a part that needs nothing asks nothing');
  check(!sections.requiredQuestions(gardenFirst).some((q) => q.key === 'backup'), 'the last questions stay last');
  const answeredAll = interview({ picked: ['health'], questions: open.map(([key]) => [key, key === 'backup' ? false : true]) });
  check(sections.setupStage(answeredAll) === 'list', 'everything needed answered: the list of parts');
  const idx = (k) => sections.REQUIRED_ORDER.indexOf(k);
  check(idx('conditions') < idx('stage') && idx('aboutYou') < idx('eatingStyle') && idx('meds') < idx('eatingStyle'), 'nothing is asked before what it needs');
  for (const beat of beats) for (const kind of sections.SECTION_QUESTIONS[beat]) check(sections.REQUIRED_ORDER.includes(kind), `${beat} question ${kind} has a place in the required order`);
}

// Shelves: Dose times beside My Meds, Meals and Water beside Food (2026-11-02).
const tabOf = (key) => cards.setupCardByKey(key)?.tabPath;
check(tabOf('doseTimes') === '/life', 'Dose times sits on Life beside My Meds');
check(tabOf('meal') === '/food' && tabOf('water') === '/food', 'Meals and Water sit on Food');

// The backup reminder.
const DAY = 24 * 60 * 60 * 1000;
const noon = new Date(2026, 10, 2, 12, 0, 0);
const at = noon.getTime();
const state = (over = {}) => ({ offeredAt: at - 4 * DAY, stopped: false, setUpWaiting: false, ...over });
const due = (over = {}) => offer.backupOfferDue({ automaticSyncOn: false, lastBackupAt: null, state: state(), now: noon, ...over });
check(due(), 'no backup and offered four days ago: due');
check(!due({ automaticSyncOn: true }), 'never while Automatic Sync is on');
check(!due({ state: state({ stopped: true }) }), 'never after Stop Asking');
check(!due({ now: new Date(2026, 10, 2, 22, 0, 0) }), 'never at night');
check(!due({ lastBackupAt: at - 2 * DAY }), 'not while the last backup is under three days old');
check(due({ lastBackupAt: at - 5 * DAY }), 'a backup five days old: due');
check(!due({ state: state({ offeredAt: at - DAY }) }), 'not a day after the last offer');
check(!due({ state: state({ offeredAt: null }) }), 'the first look only starts the clock');
check(offer.backupOfferClockStarts(state({ offeredAt: null })), 'the clock starts on the first look');
check(!offer.backupOfferClockStarts(state({ offeredAt: null, stopped: true })), 'no clock after Stop Asking');
check(offer.backupOfferText(at - 5 * DAY, noon).body.includes('5 days ago'), 'the reminder says how old the backup is');
check(offer.backupOfferText(null, noon).title.includes('backed up yet'), 'a phone never backed up is told so');
const parsed = offer.parseBackupOfferState('{"offeredAt":5,"stopped":true}');
check(parsed && parsed.offeredAt === 5 && parsed.stopped && !parsed.setUpWaiting, 'the offer file reads back');
check(offer.parseBackupOfferState('not json') === null, 'a broken offer file reads as nothing');

// The words.
// A card that needs another is skipped with it (2026-11-02, reported:
// medicines skipped, then Dose times asked for straight after).
{
  const all = cards.SETUP_TABS.flatMap((tab) => tab.shelves.flatMap((shelf) => shelf.cards));
  const byKey = new Map(all.map((card) => [card.key, card]));
  for (const card of all) {
    if (!card.needs) continue;
    check(byKey.has(card.needs), `${card.key} needs ${card.needs}, which exists`);
    const seen = new Set([card.key]);
    let at = byKey.get(card.needs);
    while (at && !seen.has(at.key)) {
      seen.add(at.key);
      at = at.needs ? byKey.get(at.needs) : undefined;
    }
    check(!at, `${card.key} needs no loop`);
  }
  for (const [card, need] of [['doseTimes', 'meds'], ['familyConditions', 'familyMember'], ['planting', 'gardenArea'], ['harvest', 'planting'], ['gardenReading', 'gardenArea'], ['gardenSetup', 'gardenArea'], ['gardenCost', 'gardenArea']]) {
    check(byKey.get(card)?.needs === need, `${card} needs ${need}`);
  }
  const dose = byKey.get('doseTimes');
  const harvest = byKey.get('harvest');
  const none = { allItems: {} };
  check(cards.cardWaitingOn(dose, none, {})?.key === 'meds', 'Dose times waits while no med is recorded');
  check(cards.cardWaitingOn(dose, { allItems: { meds: { doneOn: '2026-11-02', state: 'done' } } }, {}) === null, 'Dose times shows once a med is recorded');
  check(cards.cardWaitingOn(byKey.get('meds'), none, {}) === null, 'My Meds waits on nothing');
  check(cards.cardSetAside(dose, { allItems: { meds: { doneOn: null, state: 'setAside' } } }), 'Nothing on medicines sets Dose times aside too');
  check(!cards.cardSetAside(dose, none), 'Dose times is not set aside while medicines are open');
  check(cards.cardSetAside(harvest, { allItems: { gardenArea: { doneOn: null, state: 'setAside' } } }), 'an area set aside sets a harvest aside, down the chain');
  check(cards.viewSetupCard(dose, { allItems: { meds: { doneOn: null, state: 'setAside' } } }, {}).setAside, 'Your Guide shows Dose times set aside with medicines');
}

const words = [
  ...Object.values(sections.SECTION_WHY),
  ...Object.values(sections.CARD_WHY),
  ...Object.entries(sections).filter(([name, value]) => /^[A-Z_]+$/.test(name) && typeof value === 'string' && value.includes(' ')).map(([, value]) => value),
  offer.backupOfferText(null, noon).title,
  offer.backupOfferText(null, noon).body,
  offer.backupOfferText(at - 5 * DAY, noon).title,
  offer.backupOfferText(at - 5 * DAY, noon).body,
];
const forbidden = [
  [/[–—]| -- /, 'a dash used as punctuation'],
  [/%|\bpercent/i, 'a percentage'],
  [/\b(real|genuine|genuinely)\b/i, 'a filler word'],
  [/\b(great job|well done|awesome|amazing)\b/i, 'praise'],
  [/\b(ideal|optimal)\b/i, 'a verdict word'],
  [/\b(step \d|beat)\b/i, 'a step count or the word beat'],
  [/\b(?<!on )(?:your|its|their|my) own\b/i, 'a redundant own'],
];
for (const sentence of words) {
  for (const [pattern, what] of forbidden) check(!pattern.test(sentence), `no ${what}: "${sentence.slice(0, 60)}"`);
}

console.log(`${checks} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
