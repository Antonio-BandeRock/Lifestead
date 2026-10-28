// Checks lib/setupCards.ts, Getting Set Up as rows of cards (1.0.74.13).
//
// What it holds to: every card gives back somewhere, every place on
// Insights, Trends and Reports that records give back to is fed by at
// least one card, every key a card names is a key that exists, a done card
// moves to the end of its row and says since when, a row shows only for
// the parts of life chosen, and no sentence uses a dash for punctuation, a
// percentage, praise or the filler words this app keeps out.
//
// The module imports nothing at runtime. Exits non-zero on any failure.

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

let checks = 0;
let failures = 0;
function check(condition, label) {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error('FAIL: ' + label);
  }
}

// The keys that exist, read from the source so a renamed key fails here.
function unionKeys(relPath, typeName) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const start = source.indexOf(`export type ${typeName} =`);
  const end = source.indexOf(';', start);
  return new Set([...source.slice(start, end).matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]));
}
const recordKeys = unionKeys('lib/yourStoryGuides.ts', 'GuideRecordKey');
const itemKeys = new Set(story.ITEMS.map((item) => item.key));
check(recordKeys.size > 20, 'record keys read from lib/yourStoryGuides.ts');
const tabPaths = new Set(
  [...fs.readFileSync(path.join(__dirname, '..', 'constants/tabs.ts'), 'utf8').matchAll(/path: '(\/[a-z]*)'/g)].map((m) => m[1]),
);

const allCards = [];
for (const tab of cards.SETUP_TABS) {
  check(tabPaths.has(tab.path), `${tab.path} is a tab`);
  check(tab.shelves.length > 0, `${tab.path} has a row`);
  for (const shelf of tab.shelves) {
    check(shelf.cards.length > 0, `${shelf.key} has a card`);
    for (const card of shelf.cards) allCards.push(card);
  }
}
const cardKeys = new Set(allCards.map((card) => card.key));
check(cardKeys.size === allCards.length, 'every card key is used once');
const shelfKeys = cards.SETUP_TABS.flatMap((tab) => tab.shelves.map((shelf) => shelf.key));
check(new Set(shelfKeys).size === shelfKeys.length, 'every row key is used once');

const areaKeys = new Set(cards.GIVE_BACK_AREAS.map((area) => area.key));
check(areaKeys.size === cards.GIVE_BACK_AREAS.length, 'every give-back key is used once');
const fed = new Set();
for (const card of allCards) {
  check(card.getsBack.length > 0, `${card.key} gives back somewhere`);
  for (const key of card.getsBack) {
    check(areaKeys.has(key), `${card.key} gives back to ${key}, which exists`);
    fed.add(key);
  }
  check(!card.item || itemKeys.has(card.item), `${card.key} names item ${card.item}, which exists`);
  for (const key of card.records ?? []) check(recordKeys.has(key), `${card.key} names record ${key}, which exists`);
  check(!!card.item || (card.records ?? []).length > 0, `${card.key} has something that marks it done`);
  for (const key of card.worksWith ?? []) {
    check(cardKeys.has(key), `${card.key} goes well with ${key}, which is a card`);
    check(key !== card.key, `${card.key} does not go well with itself`);
  }
  for (const field of ['title', 'hook', 'whatItIs', 'whatYouDo', 'takes']) check(!!card[field], `${card.key} has ${field}`);
  check(!!card.destination && !!card.destination.kind, `${card.key} opens somewhere`);
  check(card.destination.kind !== 'beats', `${card.key} opens a place, not the chooser`);
}
for (const area of cards.GIVE_BACK_AREAS) {
  check(fed.has(area.key), `${area.label} is fed by at least one card`);
  check(['/insights', '/trends', '/reports'].includes(area.tabPath), `${area.key} gives back on Insights, Trends or Reports`);
  check(!area.waitsOn || itemKeys.has(area.waitsOn), `${area.key} waits on ${area.waitsOn}, which exists`);
}

// Behaviour, on a story built from facts.
const archiveOff = { syncOn: false, syncSavedOn: null, syncLoadedOn: null, lastBackupOn: null };
function facts(overrides) {
  return { today: '2026-10-27', beats: [], doneOn: {}, counts: {}, seenOn: {}, setAsideOn: {}, archive: archiveOff, ...overrides };
}
const fresh = story.buildYourStory(facts({}));
const everything = cards.buildSetupShelves(fresh, {}, null);
check(everything.length === cards.SETUP_TABS.length, 'with no part of life chosen, every tab shows');
check(
  everything.every((tab) => tab.shelves.every((shelf) => shelf.openCount === shelf.cards.length)),
  'with nothing recorded, every card is open',
);

const garden = story.buildYourStory(facts({ beats: ['garden'], doneOn: { beats: '2026-10-01' } }));
const gardenTabs = cards.buildSetupShelves(garden, {}, null);
check(
  gardenTabs.every((tab) => tab.shelves.every((shelf) => shelf.def.beats.includes('garden'))),
  'with only garden chosen, only rows for the garden show',
);
check(gardenTabs.some((tab) => tab.def.path === '/garden'), 'the Garden tab shows when garden is chosen');

const started = cards.buildSetupShelves(fresh, {}, '/garden');
check(started[0].def.path === '/garden' && started[0].startHere, 'the tab chosen to start from comes first');

// A record marks its card done and moves it to the end of its row.
const compostShelf = cards.SETUP_TABS.flatMap((tab) => tab.shelves).find((shelf) => shelf.cards.some((card) => card.key === 'compost'));
check(!!compostShelf, 'there is a compost card');
if (compostShelf) {
  const withCompost = cards.buildSetupShelves(fresh, { compost: '2026-10-20' }, null);
  const row = withCompost.flatMap((tab) => tab.shelves).find((shelf) => shelf.def.key === compostShelf.key);
  const last = row.cards[row.cards.length - 1];
  check(last.def.key === 'compost' && last.doneOn === '2026-10-20', 'a done card moves to the end and keeps its day');
  check(row.openCount === row.cards.length - 1, 'a done card is not counted as open');
  check(story.datelineFor('2026-10-20').length > 0, 'a done card can say since when');
}
check(
  cards.cardDoneOn({ key: 'x', records: ['labs', 'weight'] }, fresh, { labs: '2026-10-10', weight: '2026-09-01' }) === '2026-09-01',
  'a card with two records is done from the earlier one',
);

// What fills this in (1.0.75.1): every place a card gives back to is on a
// lens, each lens row shows a card once and in the order written, a done,
// hidden or set aside card steps aside, and the how-tos list every lens
// that draws the row.
{
  const howTos = load('lib/toolHowTos.ts');
  const lensKeys = cards.lensKeysWithFeeders();
  check(
    JSON.stringify([...howTos.LENSES_WITH_FEEDERS].sort()) === JSON.stringify([...lensKeys].sort()),
    'lib/toolHowTos.ts LENSES_WITH_FEEDERS matches lensKeysWithFeeders()',
  );
  for (const key of lensKeys) {
    check((howTos.TOOL_HOW_TOS[key] ?? []).some((tool) => tool.key === 'feedsThis'), `${key} has the What fills this in how-to`);
  }
  const covered = new Set();
  for (const key of lensKeys) {
    const [tabPath, lensKey] = key.split('#');
    for (const area of cards.areasForLens(tabPath, lensKey)) covered.add(area.key);
    const row = cards.buildLensFeeders(tabPath, lensKey, fresh, {}, []);
    check(row.cards.length > 0, `${key} has a card to set up when nothing is recorded`);
    const rowKeys = row.cards.map((card) => card.def.key);
    check(new Set(rowKeys).size === rowKeys.length, `${key} shows each card once`);
    const order = allCards.map((card) => card.key).filter((cardKey) => rowKeys.includes(cardKey));
    check(JSON.stringify(order) === JSON.stringify(rowKeys), `${key} keeps the order written`);
    const own = new Set(row.areas.map((area) => area.key));
    check(
      row.cards.every((card) => card.areas.every((area) => !own.has(area.key))),
      `${key} cards list only the other places they come back on`,
    );
    check(row.cards.every((card) => tabPaths.has(card.tabPath)), `${key} cards know their tab`);
    const first = row.cards[0].def;
    const hidden = cards.buildLensFeeders(tabPath, lensKey, fresh, {}, [first.key]);
    check(!hidden.cards.some((card) => card.def.key === first.key), `${key} leaves out a card marked Not for me`);
  }
  for (const area of cards.GIVE_BACK_AREAS) check(covered.has(area.key), `${area.key} sits on a lens that draws the row`);

  const compostLens = cards.GIVE_BACK_AREAS.find((area) =>
    allCards.some((card) => card.key === 'compost' && card.getsBack.includes(area.key)),
  );
  if (compostLens) {
    const lensKey = Object.values(compostLens.destination.params ?? {})[0];
    const open = cards.buildLensFeeders(compostLens.tabPath, lensKey, fresh, {}, []);
    const done = cards.buildLensFeeders(compostLens.tabPath, lensKey, fresh, { compost: '2026-10-20' }, []);
    check(open.cards.some((card) => card.def.key === 'compost'), 'an open card is on its lens row');
    check(!done.cards.some((card) => card.def.key === 'compost'), 'a done card steps aside on its lens row');
  }

  const once = cards.withHiddenFeeder(cards.withHiddenFeeder([], 'labs'), 'labs');
  check(once.length === 1, 'marking a card Not for me twice keeps it once');
  check(cards.parseHiddenFeeders('not json').length === 0 && cards.parseHiddenFeeders(null).length === 0, 'a bad stored list reads as empty');
  check(JSON.stringify(cards.parseHiddenFeeders('["a",3,"b"]')) === '["a","b"]', 'only names are kept from the stored list');
}

// Words.
const BANNED = [
  [/—|–| -- | - /, 'a dash used as punctuation'],
  [/%/, 'a percentage'],
  [/\b(real|really|genuine|genuinely|honestly)\b/i, 'a filler word'],
  [/\b(great job|well done|amazing|awesome|congrat|proud|streak|score)\b/i, 'praise or scoring'],
  [/\b(your|its|their|my|his|her) own [a-z]/i, 'a redundant own'],
  [/’/, 'a curly apostrophe'],
];
const strings = [];
for (const tab of cards.SETUP_TABS) {
  strings.push(tab.title, tab.line);
  for (const shelf of tab.shelves) {
    strings.push(shelf.title);
    for (const card of shelf.cards) strings.push(card.title, card.hook, card.whatItIs, card.whatYouDo, card.takes);
  }
}
for (const area of cards.GIVE_BACK_AREAS) strings.push(area.label, area.line);
for (const [name, value] of Object.entries(cards)) if (/_LABEL$|^SETUP_CARDS_|^FEEDS_THIS_|^NOT_FOR_ME_/.test(name)) strings.push(value);
for (const text of strings) {
  check(typeof text === 'string' && text.length > 0, 'every string is filled in');
  for (const [pattern, why] of BANNED) check(!pattern.test(text), `${why}: ${text}`);
}

console.log(`${checks} checks, ${failures} failed (${allCards.length} cards, ${cards.GIVE_BACK_AREAS.length} places they give back to)`);
process.exit(failures === 0 ? 0 : 1);
