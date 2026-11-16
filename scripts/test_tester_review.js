// Checks the tester's three reviews (2026-11-15): lib/testerReview.ts,
// the day-by-day lens record and the wiring around them.
//
// What it holds to: a review opens two weeks before its day and covers the
// app on the day; sending starts the next 90 days; the third send ends the
// tester version for good; round 2 asks first about changes to what was
// rated before; an approval no longer runs out; lens_use_days stays on the
// device and never counts as a change for sync; the email carries no record
// and every item it asks about; the review screen shows the emergency card
// when it covers the app.
//
// Exits non-zero on any failure.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');

function load(relPath, allowed = {}) {
  const source = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
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

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const review = load('lib/testerReview.ts');
const directory = load('lib/voiceLensDirectory.ts');

let checks = 0;
let failures = 0;
function check(condition, label) {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error('FAIL: ' + label);
  }
}

const DAY = 24 * 60 * 60 * 1000;
const approved = new Date(2026, 0, 10, 9).getTime();

// ---- The rounds ----
let progress = review.EMPTY_PROGRESS;
check(review.reviewPhase(progress, approved, approved + 10 * DAY).kind === 'quiet', 'day 10 is quiet');
check(review.reviewPhase(progress, approved, approved + 76 * DAY).kind === 'open', 'two weeks before the day it opens');
check(review.reviewPhase(progress, approved, approved + 75 * DAY).kind === 'quiet', 'just over two weeks before it is still quiet');
check(review.reviewPhase(progress, approved, approved + 90 * DAY).kind === 'due', 'on day 90 it is due');
check(review.reviewPhase(progress, approved, approved + 400 * DAY).kind === 'due', 'long after, it is still due, never skipped');
check(review.reviewPhase(progress, approved, approved + 10 * DAY, approved + 95 * DAY).kind === 'due', 'a clock set back cannot put it off');

const sent1 = approved + 80 * DAY;
progress = review.afterSending(progress, 1, ['/life#', '/life#groceryList'], sent1);
check(progress.periodStart === sent1, 'sending starts the next 90 days on the day it is sent');
check(review.currentRound(progress) === 2, 'after the first, round 2');
check(review.reviewPhase(progress, approved, approved + 90 * DAY).kind === 'quiet', 'an early send moves the next day out');
check(review.reviewPhase(progress, approved, sent1 + 90 * DAY).kind === 'due', 'round 2 is due 90 days after the first was sent');
check(!review.isGraduated(progress), 'one review does not graduate');

progress = review.afterSending(progress, 2, ['/food#'], sent1 + 91 * DAY);
check(!review.isGraduated(progress), 'two reviews do not graduate');
const sent3 = sent1 + 200 * DAY;
progress = review.afterSending(progress, 3, [], sent3);
check(review.isGraduated(progress) && progress.graduatedAt === sent3, 'the third send graduates, with its day kept');
check(review.reviewPhase(progress, approved, sent3 + 1000 * DAY).kind === 'graduated', 'after graduating nothing comes due again');
check(review.currentRound(progress) === review.REVIEW_ROUNDS, 'the round never passes three');

// ---- What was used ----
const catalog = review.reviewCatalog(directory.VOICE_LENS_DIRECTORY);
const ids = new Set(catalog.map((item) => item.id));
check(ids.size === catalog.length, 'every review id is listed once');
for (const tab of review.REVIEW_TABS) check(ids.has(review.itemId(tab.path, null)), `${tab.title} is asked about as a whole`);
check(catalog.some((item) => item.id === '/life#groceryList'), 'lenses come from the lens directory');
check(!catalog.some((item) => item.tab === '/' && item.lens !== null), 'Home is asked about as one tab');

const day = (ms) => review.localDay(ms);
const rows = [
  { tab: '/life', lens: 'groceryList', day: day(approved + 2 * DAY) },
  { tab: '/food', lens: 'nope', day: day(approved + 3 * DAY) },
  { tab: '/profile', lens: '', day: day(approved + 4 * DAY) },
  { tab: '/garden', lens: 'horticulture', day: day(approved + 200 * DAY) },
];
const used = review.usedIds(catalog, rows, approved, approved + 90 * DAY);
check(used.has('/life#groceryList') && used.has('/life#'), 'a lens used counts, and its tab with it');
check(!used.has('/food#nope') && !used.has('/food#'), 'a lens the catalog lacks is ignored');
check(used.has('/profile#'), 'Profile counts as a screen of its own');
check(used.has('/#'), 'Home always counts');
check(!used.has('/garden#horticulture'), 'a day outside the period is left out');
const sections = review.reviewSections(catalog, used, used);
check(sections.untried.every((item) => item.lens !== null), 'a whole tab is never listed as untried');
check(!sections.untried.some((item) => item.id === '/life#groceryList'), 'what was used is not untried');

// ---- Changes asked about ----
const changes = [
  { id: 'c1', date: day(sent1 + 5 * DAY), items: ['/life#groceryList'], text: 'one' },
  { id: 'c2', date: day(sent1 + 5 * DAY), items: ['/garden#horticulture'], text: 'two' },
  { id: 'c3', date: day(sent1 + 5 * DAY), items: [], text: 'three' },
  { id: 'c4', date: day(sent1 - 30 * DAY), items: [], text: 'four' },
];
const afterOne = review.afterSending(review.EMPTY_PROGRESS, 1, ['/life#', '/life#groceryList'], sent1);
const asked = review.changesToAsk(changes, afterOne).map((change) => change.id);
check(asked.includes('c1'), 'a change to something rated is asked about');
check(!asked.includes('c2'), 'a change to something not rated is not');
check(asked.includes('c3'), 'a change to the whole app is asked about');
check(!asked.includes('c4'), 'a change from before the last review is not');
check(review.changesToAsk(changes, review.EMPTY_PROGRESS).length === 0, 'the first review asks about no changes');

const changesFile = read('lib/testerReviewChanges.ts');
check(/TESTER_REVIEW_CHANGES/.test(changesFile), 'the changes list exists');
const changeIds = [...changesFile.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
check(new Set(changeIds).size === changeIds.length, 'every change id is used once');
for (const [, list] of changesFile.matchAll(/items:\s*\[([^\]]*)\]/g)) {
  for (const [, id] of list.matchAll(/'([^']+)'/g)) check(ids.has(id), `change item ${id} is a review id`);
}

// ---- Answers ----
const draft = review.emptyDraft(1);
const rate = catalog.filter((item) => item.id === '/life#' || item.id === '/life#groceryList');
check(review.stillToAnswer(draft, rate, []).items.length === 2, 'nothing answered yet');
draft.items['/life#'] = { ...review.EMPTY_ITEM, ease: 4 };
check(review.stillToAnswer(draft, rate, []).items.length === 2, 'one scale alone does not answer an item');
draft.items['/life#'] = { ...review.EMPTY_ITEM, ease: 4, useful: 5, note: 'Fine' };
draft.items['/life#groceryList'] = { ...review.EMPTY_ITEM, hardly: true };
check(review.stillToAnswer(draft, rate, []).items.length === 0, 'two scales, or Hardly used it, answer an item');
draft.items['/life#'] = { ...review.EMPTY_ITEM, ease: 6, useful: 5 };
check(review.stillToAnswer(draft, rate, []).items.length === 1, 'a number off the scale is not an answer');
check(review.EASE_SCALE.length === 5 && review.USEFUL_SCALE.length === 5 && review.CHANGE_SCALE.length === 5, 'every scale runs 1 to 5');

draft.items['/life#'] = { ...review.EMPTY_ITEM, ease: 4, useful: 5, note: 'Fine' };
const email = review.reviewEmail({
  name: 'Test Person',
  round: 1,
  period: review.reviewPeriod(review.EMPTY_PROGRESS, approved),
  now: approved + 90 * DAY,
  device: 'a phone',
  version: '1.0.0.1',
  rate,
  untried: sections.untried,
  changes: [],
  draft,
});
check(/review 1 of 3/i.test(email.subject), 'the subject names the round');
check(/easy 4, useful 5/.test(email.body) && /Note: Fine/.test(email.body), 'scores and notes are in the email');
check(/hardly used it/.test(email.body), 'Hardly used it is in the email');
check(/NOT TRIED YET/.test(email.body), 'the untried parts are in the email');
check(!/[—–]/.test(email.body), 'the email carries no dashes in place of punctuation');

// ---- Wiring ----
const access = read('lib/testerAccess.ts');
check(/approvalState\(lasting\(approval\)/.test(access) && /approvalState\(lasting\(read\)/.test(access), 'an approval no longer runs out; the reviews govern instead');
const sync = read('lib/snapshotSync.ts');
check(/DEVICE_LOCAL_TABLES[\s\S]{0,4000}'lens_use_days'/.test(sync), 'lens_use_days never travels through sync');
check(/lens_use_days\)\\b/.test(read('lib/databaseActivity.ts')), 'writing lens_use_days is not a change to save');
check(/CREATE TABLE IF NOT EXISTS lens_use_days/.test(read('lib/db.ts')), 'lens_use_days is created additively');
check(/noteLensUsed\(/.test(read('components/LensHub.tsx')), 'LensHub notes each lens opened');
check(/noteLensUsed\('\/profile'/.test(read('app/profile.tsx')), 'Profile notes being opened');
const gate = read('components/TesterGate.tsx');
check(/useTesterChrome\(\)/.test(gate) && /reviewPhase\(/.test(gate) && /<TesterReview[^>]*covered/.test(gate), 'the gate covers the app with the review on its day, and is gone after the third');
const screen = read('components/TesterReview.tsx');
check(/readEmergencyLinesSync\(\)/.test(screen), 'the covering review shows the emergency card');
check(/explainNotYet\(/.test(screen), 'Send says what is still unanswered');
check(/<AppTextInput/.test(screen) && !/voice=\{false\}/.test(screen), 'every note takes the microphone');
for (const rel of [
  'components/TesterWatermark.tsx',
  'components/TesterWelcome.tsx',
  'components/ReportProblemHost.tsx',
  'components/UsabilitySurveyHost.tsx',
  'components/YourStorySection.tsx',
  'components/TutorialHost.tsx',
  'lib/tutorialDb.ts',
  'lib/visualPreferences.ts',
]) {
  check(/useTesterChrome|testerChromeShown/.test(read(rel)), `${rel} drops the tester wording after the third review`);
}
check(/'tester\.review'/.test(read('lib/toolHowTos.ts')) && !/'tester\.renew'/.test(read('lib/toolHowTos.ts')), 'the how-to rings Start Your Review, not Ask to Renew');

console.log(`test_tester_review: ${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
