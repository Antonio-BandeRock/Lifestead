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
const paidFeatures = load('lib/paidFeatures.ts');
const toolHowTos = load('lib/toolHowTos.ts');
const tutorials = load('lib/tutorials.ts', { './toolHowTos': toolHowTos, './paidFeatures': paidFeatures, './storyWalk': walk, './yourStoryGuides': guides, './yourStoryInterview': interview });
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
same(
  walk.tapMovesOn({ say: 'Tap + Schedule a meal, then choose what you ate and the time.', point: null, mark: 'schedule.addMeal' }, 'schedule.addMeal'),
  false,
  'a line that goes on past its button waits for Next',
);
for (const name of walk.MORE_AFTER_TAP) {
  check(allHowTos.some((howTo) => howTo.steps.some((step) => step.mark === name)), `${name} waits for Next on a line that uses it`);
}

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
same(spots.fromOrigin(rect, { x: 0, y: -33 }), { ...rect, y: 233 }, 'a window starting below the status bar is moved down to the layer');
same(spots.fromOrigin(rect, null), rect, 'no layer measured, the rect stands');
same(spots.fromOrigin(null, { x: 0, y: 10 }), null, 'nothing measured stays nothing');

// The strip steps out of the ring's way.
const button = { x: 400, y: 60, width: 200, height: 50 };
same(spots.stripTop(null, 200, 40, 2000), 40, 'nothing ringed, the strip rests at the top');
same(spots.stripTop({ ...button, y: 1500 }, 200, 40, 2000), 40, 'a ring well below leaves the strip at the top');
same(spots.stripTop(button, 200, 40, 2000), 124, 'a ring under the strip moves it to just below the ring');
same(spots.stripTop(button, 0, 40, 2000), 40, 'a strip not measured yet stays put');
same(spots.stripTop({ ...button, y: 1900 }, 200, 1800, 2000), 1686, 'no room below, it goes just above');
check(spots.sameRect(button, { ...button, x: 400.4 }) && !spots.sameRect(button, null), 'a rect within a point is the same rect');

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

// A corner box label wrapped with a line break still counts as that lens.
{
  const step = { say: 'x', point: 'corner', until: { pathname: '/garden', lens: 'Plots & Plantings' } };
  check(walk.stepMet(step, { pathname: '/garden', tab: 'Garden', lens: 'Plots &\nPlantings' }), 'a wrapped corner label counts as its lens');
  check(!walk.stepMet(step, { pathname: '/garden', tab: 'Garden', lens: 'Harvest Log' }), 'another lens does not count');
}

// A getting-there line carries its lens key and matches on it, whatever the
// corner box's wording ('Meal Builder' for the Meal lens).
{
  const [, toLens] = walk.gettingThere('/food', 'mealBuilder', 'Meal');
  check(toLens.until.lensKey === 'mealBuilder', 'a lens line carries its key');
  check(walk.stepMet(toLens, { pathname: '/food', tab: 'Food', lens: 'Meal\nBuilder', lensKey: 'mealBuilder' }), 'a lens line is met by its key');
  check(!walk.stepMet(toLens, { pathname: '/food', tab: 'Food', lens: 'Meal', lensKey: 'sideBuilder' }), 'another key is not met');
}

// On Free a paid lens shows its wall, so its how-tos say so in one line
// rather than ringing tools that are not drawn (1.0.68.15). Every paid lens
// is a lens the tutorials walk, under the same tab title.
{
  const tabs = tutorials.buildTutorials(null);
  for (const [tabTitle, lenses] of Object.entries(paidFeatures.PAID_LENSES)) {
    const tab = tabs.find((each) => each.title === tabTitle);
    check(!!tab, `paid tab ${tabTitle} is a tutorial tab`);
    if (!tab) continue;
    for (const lensKeyName of Object.keys(lenses)) {
      const lens = tab.lenses.find((each) => each.lens === lensKeyName);
      check(!!lens, `paid lens ${tabTitle} ${lensKeyName} has a tutorial`);
      if (!lens) continue;
      for (const howTo of lens.howTos) {
        const free = tutorials.stepsForTier(howTo, tab.title, lens.lens, 'free');
        const paid = tutorials.stepsForTier(howTo, tab.title, lens.lens, 'paid');
        check(paid === howTo.steps, `${howTo.key} is unchanged on paid`);
        if (howTo.key.endsWith(':about')) check(free === howTo.steps, `${howTo.key} still gets there on Free`);
        else check(free.length === 1 && !free[0].mark && free[0].say.includes(lenses[lensKeyName].plan), `${howTo.key} is one line on Free`);
      }
    }
  }
}

// Tool how-tos (lib/toolHowTos.ts, 1.0.68.16): every lens key is a lens
// the tutorials know, keys are unique on a lens, every mark is drawn on a
// screen, and a tab listed as done has tools on every lens.
{
  const lensByKey = new Map(tabs.flatMap((tab) => tab.lenses.map((lens) => [lens.key, { tab, lens }])));
  const sourceFiles = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) =>
      item.isDirectory() ? sourceFiles(path.join(dir, item.name)) : [path.join(dir, item.name)],
    );
  const markSource = ['app', 'components']
    .flatMap((dir) => sourceFiles(path.join(__dirname, '..', dir)))
    .filter((file) => /\.tsx?$/.test(file))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
  for (const [key, tools] of Object.entries(toolHowTos.TOOL_HOW_TOS)) {
    const found = lensByKey.get(key);
    check(!!found, `tool how-tos for ${key} sit on a lens`);
    if (!found) continue;
    const keys = tools.map((tool) => tool.key);
    check(new Set(keys).size === keys.length, `${key} tool keys are unique`);
    for (const tool of tools) {
      const howTo = found.lens.howTos.find((each) => each.key === `${key}:tool:${tool.key}`);
      check(!!howTo, `${key}:tool:${tool.key} is in the tutorials`);
      check(tool.steps.length > 0 && tool.forYou.trim().length > 0, `${tool.key} has steps and says what it does`);
      if (howTo) check(howTo.steps[0].mark === 'hub' || found.tab.path === '/', `${tool.key} starts from the round button`);
      for (const step of tool.steps) {
        if (!step.mark) continue;
        // A row of pills marks each one as `work.${entry.key}`, so the prefix
        // with a template stands for every pill in the row.
        const prefix = step.mark.slice(0, step.mark.indexOf('.') + 1);
        check(
          markSource.includes(`walkMark('${step.mark}')`) ||
            markSource.includes(`walkMark.ref('${step.mark}')`) ||
            // A card handed its mark as a prop (SetupCard's markCard and markGo).
            markSource.includes(`? '${step.mark}' : undefined`) ||
            (prefix && markSource.includes('walkMark.ref(`' + prefix + '${')),
          `${step.mark} is drawn on a screen`,
        );
      }
    }
  }
  for (const tabPath of toolHowTos.TOOL_TABS_DONE) {
    const tab = tabs.find((each) => each.path === tabPath);
    check(!!tab, `${tabPath} in TOOL_TABS_DONE is a tutorial tab`);
    for (const lens of tab ? tab.lenses : []) check((toolHowTos.TOOL_HOW_TOS[lens.key] ?? []).length > 0, `${lens.key} has its tools`);
  }
  // Written steps: one per line, and a picture name every how-to reaching
  // the same lens shares for its getting-there lines.
  for (const howTo of allHowTos) {
    const written = tutorials.writtenSteps(howTo);
    check(written.length === howTo.steps.length, `${howTo.key} reads as many lines as it runs`);
    check(written.every((step) => /^[A-Za-z0-9_]+$/.test(step.shot)), `${howTo.key} picture names are plain`);
  }
  for (const tab of tabs) {
    for (const lens of tab.lenses) {
      const reach = lens.howTos
        .filter((howTo) => howTo.key.includes(':tool:'))
        .map((howTo) => tutorials.writtenSteps(howTo).filter((_, index) => howTo.steps[index].until).map((step) => step.shot).join('|'));
      check(reach.every((each) => each === reach[0]), `${lens.key} tools share their getting-there pictures`);
    }
  }
}

console.log(`${checks - failures}/${checks} tutorial checks pass`);
if (failures) process.exit(1);
