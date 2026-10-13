// Checks the tutorials (1.0.68.14): lib/tutorials.ts, lib/tutorialRun.ts and
// the ringed-button arithmetic in lib/walkSpots.ts.
//
// What it holds to: every tab in the tour and every lens on it has a
// tutorial, the chosen tab comes first, every how-to ends on a line to read
// rather than a screen opening, each run goes through exactly the how-tos
// asked for, a stopped run picks up where it stopped, a tap moves a line on
// only when it lands on the ringed button, and nothing a person reads counts,
// grades or praises them.
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
const guides = load('lib/yourStoryGuides.ts', { './yourStory': story });
const walk = load('lib/storyWalk.ts', { './yourStoryGuides': guides });
const interview = load('lib/yourStoryInterview.ts', { './yourStory': story });
const tutorials = load('lib/tutorials.ts', { './storyWalk': walk, './yourStoryGuides': guides, './yourStoryInterview': interview });
const runs = load('lib/tutorialRun.ts');
const spots = load('lib/walkSpots.ts');

let checks = 0;
let failures = 0;
function check(condition, label) {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error('FAIL: ' + label);
  }
}
function same(actual, expected, label) {
  check(JSON.stringify(actual) === JSON.stringify(expected), label + '\n  got      ' + JSON.stringify(actual) + '\n  expected ' + JSON.stringify(expected));
}

// Every tab, every lens.
const tabs = tutorials.buildTutorials(null);
same(
  tabs.map((tab) => tab.path),
  interview.TOUR_TABS.map((tab) => tab.path),
  'one tutorial per tab, in tour order',
);
for (const tourTab of interview.TOUR_TABS) {
  const tab = tabs.find((entry) => entry.path === tourTab.path);
  if (tourTab.path === '/') {
    same(tab.lenses.length, 1, 'Home has one tutorial of its own');
    continue;
  }
  for (const group of tourTab.groups) {
    for (const lens of group.lenses) {
      check(
        tab.lenses.some((entry) => entry.lens === lens),
        `${tourTab.title} > ${interview.lensName(tourTab.path, lens)} has a tutorial`,
      );
    }
  }
}

const byKey = tutorials.howToByKey(tabs);
const allHowTos = [...byKey.values()].map((found) => found.howTo);
same(new Set(allHowTos.map((howTo) => howTo.key)).size, allHowTos.length, 'how-to keys are unique');
for (const howTo of allHowTos) {
  check(howTo.steps.length > 0, `${howTo.key} has lines`);
  const last = howTo.steps[howTo.steps.length - 1];
  check(last && !last.until && !last.mark, `${howTo.key} ends on a line to read`);
  check(howTo.steps.every((step) => typeof step.say === 'string' && step.say.trim().length > 0), `${howTo.key} has no empty line`);
  check(typeof howTo.title === 'string' && howTo.title.length > 0, `${howTo.key} has a title`);
}
for (const tab of tabs) {
  for (const lens of tab.lenses) {
    check(lens.howTos[0] && lens.howTos[0].key.endsWith(':about'), `${lens.key} starts with getting there`);
  }
}
// Guide steps done on a lens turn up on that lens.
const lensWithSteps = tabs.flatMap((tab) => tab.lenses).filter((lens) => lens.howTos.length > 1);
check(lensWithSteps.length > 5, 'guide steps reach the lenses they are done on');
// A guide step done on a lens rings its buttons in a tutorial.
check(
  allHowTos.some((howTo) => !howTo.key.endsWith(':about') && howTo.steps.some((step) => step.mark)),
  'a guide step rings a button in its tutorial',
);

// The chosen tab comes first.
const garden = interview.TOUR_TABS.find((tab) => tab.path !== '/').path;
const fromGarden = tutorials.buildTutorials(garden);
same(fromGarden[0].path, garden, 'the chosen tab comes first');
same(fromGarden.length, tabs.length, 'every tab is still there');
same(tutorials.buildTutorials(null)[0].path, interview.TOUR_TABS[0].path, 'no choice keeps tour order');

// What a run goes through.
const all = tutorials.tutorialQueue(tabs, { kind: 'all' });
same(all.length, allHowTos.length, 'from the beginning goes through every how-to');
const second = tabs[1];
const tabQueue = tutorials.tutorialQueue(tabs, { kind: 'tab', path: second.path });
check(tabQueue.length > 0 && tabQueue.every((key) => byKey.get(key).tab.path === second.path), 'one tab stays on that tab');
const fromQueue = tutorials.tutorialQueue(tabs, { kind: 'fromTab', path: second.path });
same(fromQueue, all.slice(all.indexOf(tabQueue[0])), 'a tab and the rest after it runs to the end');
const lens = second.lenses[0];
same(tutorials.tutorialQueue(tabs, { kind: 'lens', key: lens.key }), lens.howTos.map((howTo) => howTo.key), 'one lens is its how-tos');
same(tutorials.tutorialQueue(tabs, { kind: 'howTo', key: lens.howTos[0].key }), [lens.howTos[0].key], 'one how-to is itself');
same(tutorials.tutorialQueue(tabs, { kind: 'howTo', key: 'nothing' }), [], 'an unknown how-to gives nothing');
same(tutorials.tutorialQueue(tabs, { kind: 'fromTab', path: '/nowhere' }), [], 'an unknown tab gives nothing');

// A run.
same(runs.newRun([]), null, 'nothing to go through is no run');
let run = runs.newRun(['a', 'b', 'c']);
same(runs.currentHowToKey(run), 'a', 'a run starts at the first');
run = { ...run, cursor: 2, skipped: [1] };
run = runs.nextHowTo(run);
same([runs.currentHowToKey(run), run.cursor, run.skipped], ['b', 0, []], 'the next how-to starts at its first line');
run = runs.nextHowTo(runs.nextHowTo(run));
check(runs.runFinished(run), 'past the last how-to the run is over');
same(runs.currentHowToKey(run), null, 'a finished run has no how-to');
same(runs.nextHowTo(run).index, 3, 'going on from the end stays at the end');

// Where a run stopped.
const stopped = runs.newRun(['a', 'b', 'c'], 1);
const kept = runs.resumeText(stopped);
same(runs.runFromResume(kept, () => true), { queue: ['a', 'b', 'c'], index: 1, cursor: 0, skipped: [] }, 'a stopped run picks up where it stopped');
same(runs.resumeText(run), null, 'a finished run keeps nothing');
same(runs.runFromResume(kept, (key) => key !== 'a').index, 0, 'a how-to gone in an update is left out, and the place holds');
same(runs.runFromResume(kept, (key) => key !== 'b').queue, ['a', 'c'], 'the stopped how-to gone, the run goes on from near it');
same(runs.runFromResume('not json', () => true), null, 'something unreadable is no run');
same(runs.runFromResume(null, () => true), null, 'nothing kept is no run');
same(runs.runFromResume(kept, () => false), null, 'nothing left is no run');

// Lines that move on by a tap.
same(walk.tapMovesOn({ say: 'x', point: null, mark: 'hub' }, 'hub'), true, 'a tap on the ringed button moves the line on');
same(walk.tapMovesOn({ say: 'x', point: null, mark: 'hub' }, 'other'), false, 'a tap on another button does not');
same(walk.tapMovesOn({ say: 'x', point: null, mark: 'hub', until: { pathname: '/' } }, 'hub'), false, 'a line waiting for a screen waits for the screen');
same(walk.tapMovesOn(null, 'hub'), false, 'no line, nothing moves');

// The ring and the tap.
const rect = { x: 100, y: 200, width: 80, height: 40 };
same(spots.spotWhere(rect, 800), 'here', 'on screen');
same(spots.spotWhere({ ...rect, y: 900 }, 800), 'below', 'below the screen');
same(spots.spotWhere({ ...rect, y: -60 }, 800), 'above', 'above the screen');
same(spots.spotWhere(null, 800), 'missing', 'not drawn');
same(spots.pickSpot([{ ...rect, y: 900 }, rect, null], 800), 1, 'the copy on screen is the one pointed at');
same(spots.pickSpot([{ ...rect, y: 1500 }, { ...rect, y: 900 }], 800), 1, 'otherwise the nearest');
same(spots.pickSpot([null, null], 800), -1, 'none drawn, none picked');
check(spots.spotHit(rect, 140, 220), 'a tap inside lands');
check(spots.spotHit(rect, 96, 196), 'a tap just outside the edge still lands');
check(!spots.spotHit(rect, 300, 220), 'a tap well away does not');
check(!spots.spotHit(null, 140, 220), 'nothing ringed, nothing lands');

let heard = [];
const stopListening = spots.subscribeSpotTapped((name) => heard.push(name));
spots.setActiveSpot('hub', rect);
spots.reportTap(300, 220);
spots.reportTap(140, 220);
same(heard, ['hub'], 'only a tap on the ringed button is heard');
spots.setActiveSpot(null, null);
spots.reportTap(140, 220);
same(heard, ['hub'], 'nothing ringed, nothing heard');
stopListening();

// Nothing a person reads counts, grades or praises them, and the writing
// rules hold.
const words = Object.entries(tutorials)
  .filter(([, value]) => typeof value === 'string')
  .map(([key, value]) => [key, value]);
const lines = [...words, ...allHowTos.map((howTo) => [howTo.key, howTo.title])];
const ruled = [
  [/[–—]/, 'a dash used as punctuation'],
  [/ -- /, 'a double hyphen'],
  [/\b(real|genuine|genuinely)\b/i, 'a filler word'],
  [/\d+\s*%|\bpercent\b/i, 'a percentage'],
  [/\b(great job|well done|congrat|awesome|amazing|you did it|streak|\d+ points?\b|earn points|level up)/i, 'praise or a score'],
  [/\b\d+ of \d+\b/, 'a count of how far along'],
];
for (const [key, text] of lines) {
  for (const [pattern, what] of ruled) check(!pattern.test(text), `${key} carries ${what}: ${text}`);
}

console.log(`${checks - failures}/${checks} tutorial checks pass`);
if (failures) process.exit(1);
