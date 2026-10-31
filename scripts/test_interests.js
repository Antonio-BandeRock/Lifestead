// Checks lib/interests.ts (the Interests tab): reading "since when" as it
// was typed, the stage changes a save writes, the line under a name, the
// history sentences, grouping, the kind and interest pickers, and that
// nothing said about an interest ranks, scores or pushes it toward earning.
// "Today" is fixed at Friday 30 October 2026.
// Run: node scripts/test_interests.js
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
    throw new Error(`lib/interests.ts must stay pure, asked for ${name}`);
  });
  cache[file] = m.exports;
  return m.exports;
}
const I = load('interests');
const TODAY = '2026-10-30';

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

// --- since when -------------------------------------------------------------
const reads = [
  ['', { ok: true, startedOn: null }],
  ['2019', { ok: true, startedOn: '2019' }],
  ['2024-3', { ok: true, startedOn: '2024-03' }],
  ['2024-03-03', { ok: true, startedOn: '2024-03-03' }],
  ['3/2024', { ok: true, startedOn: '2024-03' }],
  ['March 2024', { ok: true, startedOn: '2024-03' }],
  ['mar 2024', { ok: true, startedOn: '2024-03' }],
  ['3 March 2024', { ok: true, startedOn: '2024-03-03' }],
  ['March 3, 2024', { ok: true, startedOn: '2024-03-03' }],
  ['  October   2026 ', { ok: true, startedOn: '2026-10' }],
  ['30 October 2026', { ok: true, startedOn: '2026-10-30' }],
  ['31 October 2026', { ok: false, startedOn: null }],
  ['2027', { ok: false, startedOn: null }],
  ['November 2026', { ok: false, startedOn: null }],
  ['1850', { ok: false, startedOn: null }],
  ['2024-13', { ok: false, startedOn: null }],
  ['ma 2024', { ok: false, startedOn: null }],
  ['a while ago', { ok: false, startedOn: null }],
];
for (const [words, want] of reads) {
  const got = I.readStartedOn(words, TODAY);
  check(`readStartedOn ${JSON.stringify(words)}`, same(got, want), got);
}
check('formatStartedOn year', I.formatStartedOn('2019') === '2019');
check('formatStartedOn month', I.formatStartedOn('2024-03') === 'March 2024');
check('formatStartedOn day', I.formatStartedOn('2024-03-03') === '3 March 2024');

// --- stage changes ----------------------------------------------------------
const none = I.noStages();
const reading = { ...none, following: true };
const doing = { ...none, following: true, practising: true };
check(
  'new interest writes every stage it starts with',
  same(I.stageChangesBetween(null, doing), [
    { stage: 'following', turnedOn: true },
    { stage: 'practising', turnedOn: true },
  ]),
);
check('new interest with no stage writes nothing', I.stageChangesBetween(null, none).length === 0);
check('taking one up', same(I.stageChangesBetween(reading, doing), [{ stage: 'practising', turnedOn: true }]));
check('stepping back from one', same(I.stageChangesBetween(doing, reading), [{ stage: 'practising', turnedOn: false }]));
check('no change writes nothing', I.stageChangesBetween(doing, { ...doing }).length === 0);

// --- the line and the history -----------------------------------------------
const base = {
  id: 'a',
  name: 'Woodworking',
  kind: 'building',
  about: null,
  stages: doing,
  startedOn: '2019',
  leftOff: null,
  leftOffAt: null,
  retiredAt: null,
  createdAt: '2026-10-01T12:00:00.000Z',
};
check('stages joined', I.describeStages(base) === 'Following and practising', I.describeStages(base));
check('three stages joined', I.describeStages({ stages: { ...doing, sharing: true } }) === 'Following, practising and sharing');
check('no stage', I.describeStages({ stages: none }) === 'No stage chosen');
check('line', I.describeInterestLine(base) === 'Building & woodworking · Following and practising · since 2019', I.describeInterestLine(base));
check('a named kind is shown in its words', I.describeInterestLine({ ...base, kind: 'Kite flying' }).startsWith('Kite flying · '));
check(
  'left off',
  I.describeLeftOff({ leftOff: 'the second drawer', leftOffAt: '2026-10-12T15:00:00' }) === 'Where you left off 12 October 2026: the second drawer',
);
check('nothing left off', I.describeLeftOff({ leftOff: null, leftOffAt: null }) === null);
const history = I.describeStageHistory([
  { id: '1', interestId: 'a', stage: 'following', turnedOn: true, changedOn: '2019-04-01' },
  { id: '2', interestId: 'a', stage: 'practising', turnedOn: true, changedOn: '2026-05-04' },
  { id: '3', interestId: 'a', stage: 'sharing', turnedOn: false, changedOn: '2026-08-10' },
]);
check(
  'history newest first',
  same(history, ['Stepped back from sharing, 10 August 2026', 'Started practising, 4 May 2026', 'Started following, 1 April 2019']),
  history,
);

// --- grouping and pickers ---------------------------------------------------
const list = [
  { ...base, id: 'w', name: 'woodworking' },
  { ...base, id: 'b', name: 'Birds', kind: 'nature' },
  { ...base, id: 'k', name: 'Knitting', kind: 'Fibre arts', retiredAt: '2026-09-01T10:00:00Z' },
];
const groups = I.groupInterests(list);
check('current alphabetically, ignoring case', same(groups.current.map((i) => i.id), ['b', 'w']));
check('stepped back kept', same(groups.steppedBack.map((i) => i.id), ['k']));
check('interest picker leaves out the stepped back', same(I.interestChoices(list).map((c) => c.value), ['b', 'w']));
check('interest picker keeps the one already chosen', I.interestChoices(list, 'k').some((c) => c.value === 'k'));
const kinds = I.kindChoices(list);
check('kind picker carries every built-in', I.INTEREST_KINDS.every((k) => kinds.some((c) => c.value === k.code)));
check('kind picker carries a named kind once', kinds.filter((c) => c.value === 'Fibre arts').length === 1);
const labels = kinds.map((c) => c.label);
check('kind picker reads alphabetically', same(labels, [...labels].sort((a, b) => a.localeCompare(b))), labels);
check('own kinds', same(I.ownKinds(list), ['Fibre arts']));
check('kind label of a built-in', I.kindLabel('music') === 'Music');
check('kind label of a named kind', I.kindLabel('Fibre arts') === 'Fibre arts');

// --- nothing ranks, scores or pushes toward earning ------------------------
const FORBIDDEN =
  /\b(level|levels|streak|streaks|score|scores|points|rank|ranked|behind|falling|failed|abandoned|gave up|lazy|should|must|monetis\w*|monetiz\w*|side hustle|business|unlock\w*)\b|%/i;
const said = [
  ...Object.values(I.INTEREST_STAGE_LABELS),
  ...Object.values(I.INTEREST_STAGE_LINES),
  ...I.INTERESTS_EXPLAINED.flatMap((part) => [part.heading, part.body]),
  ...history,
  I.describeInterestLine(base),
  I.describeInterestLine(list[2]),
];
const component = fs.readFileSync(path.join(__dirname, '..', 'components', 'MyInterestsSection.tsx'), 'utf8');
const screen = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'interests.tsx'), 'utf8');
for (const text of [component, screen]) {
  for (const match of text.matchAll(/'((?:[^'\\\n]|\\.)*[a-z] [a-z](?:[^'\\\n]|\\.)*)'/g)) said.push(match[1]);
}
// Sentences that name a forbidden word only to say it does not apply.
const ALLOWED = new Set([
  // My Interests help: says there is no level to reach.
  'Turning a stage on or off is kept with the day it happened, so an interest you only read about for years and then took up shows both. Nothing about it is a level to reach, and earning is one way of being part of something, never the goal.',
]);
for (const sentence of said) {
  if (ALLOWED.has(sentence)) continue;
  check(`no ranking words: ${sentence.slice(0, 60)}`, !FORBIDDEN.test(sentence), sentence);
}

console.log(fail === 0 ? `All ${pass} interests checks pass.` : `\n${fail} failed, ${pass} passed`);
if (fail > 0) process.exit(1);
