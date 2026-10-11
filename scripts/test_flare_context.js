// Checks what a flare is without assuming food (2026-10-11):
// lib/flareContext.ts, the workouts family in lib/patternFactors.ts and the
// report section in lib/reportNoticed.ts.
//
//  1. Pickers put what the person marked before first, then what is linked
//     to what they marked in Profile, and every other choice still follows.
//  2. The lock-screen question always has two choices to offer, even for a
//     person with no history and nothing marked.
//  3. Not sure stands alone.
//  4. Counts of what was marked name their denominators and leave out the
//     flares with nothing marked.
//  5. Symptoms outside what was marked need three flares, and with nothing
//     marked every recurring symptom is listed.
//  6. Workouts are keyed by kind, vigorous and long, and an empty kind is
//     not a workout.
//  7. No sentence claims a cause or names a condition the person has.
//
// Run with: node scripts/test_flare_context.js

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const cache = {};
function load(relPath) {
  if (cache[relPath]) return cache[relPath].exports;
  const source = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  cache[relPath] = module;
  const dir = path.dirname(relPath);
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    if (!name.startsWith('.')) return {};
    if (name === './db') throw new Error(relPath + ' reaches the database');
    return load(path.join(dir, name + '.ts').replace(/\\/g, '/'));
  });
  return module.exports;
}

const C = load('lib/flareContext.ts');
const PF = load('lib/patternFactors.ts');
const N = load('lib/reportNoticed.ts');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error('FAIL: ' + label);
  }
}

const none = { conditions: [], neuro: [] };
const autistic = { conditions: [], neuro: ['autism'] };

// 1. Ordering for the person.
const items = C.FLARE_CONTRIBUTORS;
const split = C.splitForPerson(items, C.contributorsForMarks(autistic), new Map([['food_drink', 4]]));
ok(split.forYou[0].code === 'food_drink', 'what was marked before comes first, whatever is linked');
ok(split.forYou.length + split.other.length === items.length, 'nothing is dropped by the split');
ok(new Set([...split.forYou, ...split.other].map((i) => i.code)).size === items.length, 'nothing is listed twice');
const plain = C.splitForPerson(items, C.contributorsForMarks(none), new Map());
ok(plain.forYou.length === 0 && plain.other.length === items.length, 'with nothing known, everything is under other possibilities');
ok(C.symptomsForMarks(autistic).size > 0, 'autism lists symptoms to put first');

// 2. Lock-screen question.
const ask = C.contributorsToAsk(new Map(), none, items);
ok(ask.length === 2, 'two choices with no history and nothing marked');
ok(!ask.includes(C.NOT_SURE_CONTRIBUTOR), 'Not sure is a button of its own, never one of the two');
const askUsed = C.contributorsToAsk(new Map([['heat', 3], ['stress', 1]]), none, items);
ok(askUsed[0] === 'heat' && askUsed[1] === 'stress', 'the most marked come first');
const retired = items.map((i) => (i.code === 'stress' ? { ...i, retired: true } : i));
ok(!C.contributorsToAsk(new Map([['stress', 9]]), none, retired).includes('stress'), 'a retired entry is not offered');
ok(!C.contributorsToAsk(new Map(), none, retired.filter((i) => i.code !== 'stress')).includes('stress'), 'a removed entry is not offered');

// 3. Not sure stands alone.
ok(C.toggleContributor(['stress', 'food'], C.NOT_SURE_CONTRIBUTOR).join() === C.NOT_SURE_CONTRIBUTOR, 'Not sure clears the rest');
ok(C.toggleContributor([C.NOT_SURE_CONTRIBUTOR], 'stress').join() === 'stress', 'anything else clears Not sure');
ok(C.toggleContributor(['stress'], 'stress').length === 0, 'a second tap takes it off');

// 4. Counting what was marked.
const flares = [
  { tags: ['widespread_pain', 'brain_fog'], contributors: ['stress', 'poor_sleep'] },
  { tags: ['widespread_pain'], contributors: ['stress'] },
  { tags: ['widespread_pain', 'brain_fog'], contributors: [] },
  { tags: ['brain_fog', 'widespread_pain'], contributors: [C.NOT_SURE_CONTRIBUTOR] },
];
const lines = C.contributorLines(flares, C.contributorLabel);
ok(lines.unanswered === 1, 'a flare with nothing marked is counted as unanswered');
ok(lines.lines[0] === 'You marked stress behind 2 of 3 flares.', 'the count is against the flares with something marked: ' + lines.lines[0]);
ok(lines.lines.some((l) => l.startsWith('Not sure what was going on: 1 of 3')), 'Not sure is counted in its own words');

// 5. Outside what was marked.
const outsideNone = C.symptomsOutsideMarks(flares, none);
ok(outsideNone.some((o) => o.code === 'widespread_pain' && o.count === 4), 'with nothing marked, a recurring symptom is listed');
ok(outsideNone.some((o) => o.code === 'brain_fog' && o.count === 3), 'three flares is enough');
ok(!C.symptomsOutsideMarks(flares.slice(0, 2), none).length, 'under three flares nothing is listed');
const outsideAutism = C.symptomsOutsideMarks(flares, autistic);
ok(!outsideAutism.some((o) => o.code === 'widespread_pain'), 'a symptom listed for what was marked is not outside it');
ok(C.outsideLines(outsideNone, 4, (c) => c)[0].endsWith('of 4 flares.'), 'the outside line names its denominator');
ok(C.outsideNote(none) !== C.outsideNote(autistic), 'the note says when nothing is marked');

// 6. Workouts.
const moments = PF.workoutMoments([
  { at: '2026-10-01T07:30:00', exerciseType: 'Running ', durationMinutes: 75, intensity: 'vigorous' },
  { at: '2026-10-02T07:30:00', exerciseType: 'Yoga', durationMinutes: 30, intensity: 'light' },
  { at: '2026-10-03T07:30:00', exerciseType: '  ', durationMinutes: 30, intensity: null },
]);
ok(moments.length === 2, 'an empty kind is not a workout');
ok(moments[0].keys.join() === 'workout:type:running,workout:vigorous,workout:long', 'kind, vigorous and long: ' + moments[0].keys.join());
ok(moments[1].keys.join() === 'workout:type:yoga', 'a short light workout carries only its kind');
ok(moments[0].at === '2026-10-01T07:30' && moments[0].group === 'workouts', 'the moment is stamped to the minute in the workouts group');
ok(PF.workoutLabel('workout:type:running', new Map([['workout:type:running', 'Running']])) === 'Running', 'the kind reads as typed');
ok(PF.FACTOR_FAMILY_TITLES.workouts === 'Workouts', 'the family has a title');
ok(/workouts/.test(PF.FACTOR_BAND_EMPTY_LINE), 'the empty line names workouts');

// Report section.
const marks = {
  flares: 4,
  contributorLines: lines.lines,
  unanswered: 1,
  contributorNote: C.CONTRIBUTOR_NOTE,
  outsideLines: C.outsideLines(outsideNone, 4, (c) => c),
  outsideNote: C.outsideNote(none),
};
const section = N.flareMarksSection(marks);
ok(section.heading === N.FLARE_MARKS_HEADING, 'the report section has its heading');
ok(section.rows[0].startsWith('Marked stress'), 'the report drops "You" for the reader: ' + section.rows[0]);
ok(section.rows.some((r) => r.startsWith('1 of 4 flares have nothing marked')), 'the report says how many are left out');
ok(section.rows.some((r) => r.startsWith('Outside what was marked:')), 'the report carries the outside symptoms');
ok(N.flareMarksSection(null).empty.length > 0, 'no flares says so');
ok(N.flareMarksSection({ ...marks, contributorLines: [], unanswered: 4 }).rows[0].startsWith('Nothing was marked'), 'nothing marked says so');

// 7. No verdicts.
const sentences = [
  ...lines.lines,
  C.CONTRIBUTOR_NOTE,
  C.outsideNote(none),
  C.outsideNote(autistic),
  C.OUTSIDE_EMPTY_LINE,
  PF.WORKOUT_FAMILY_LINE,
  N.FLARE_MARKS_NOTE,
  N.OUTSIDE_REPORT_NOTE,
  ...section.rows,
];
const VERDICT = /\b(caused|causes|causing|triggered|triggers|because of|you have|diagnos|proves?|confirms?|is to blame)\b/i;
for (const s of sentences) ok(!VERDICT.test(s), 'no verdict words: ' + s);
const NAMES = /\b(hashimoto|lupus|celiac|fibromyalgia|autism|autistic|adhd)\b/i;
for (const s of [C.outsideNote(none), C.outsideNote(autistic), C.OUTSIDE_EMPTY_LINE, N.OUTSIDE_REPORT_NOTE]) {
  ok(!NAMES.test(s), 'the outside wording names no condition: ' + s);
}

console.log(`${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
