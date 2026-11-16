// Checks the questions-for-a-visit rules (K4) without a phone:
// lib/visitQuestions.ts.
//
// The rules checked:
//
//  1. A question keeps the words as given, with only extra spaces taken out.
//  2. Questions read in the order the person set; a move renumbers every
//     question from 0, and a move past either end does nothing.
//  3. The opener says how many and how many were asked, nothing more.
//  4. Health notes are offered only once, only while not done, newest first.
//  5. Removing an appointment says what happens to its questions, and offers
//     the move only when some are not asked yet and another visit is planned.
//  6. The page reads since the last visit with the same provider, skipping a
//     cancelled one, or the 90 days before when none is recorded; it escapes
//     HTML, keeps the answers, leaves lines to write on, and carries no score,
//     verdict or percentage.
//
// Run with: node scripts/test_visit_questions.js
// Exits non-zero on any failure.

/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const cache = new Map();
function load(relPath) {
  const full = path.join(__dirname, '..', relPath);
  if (cache.has(full)) return cache.get(full).exports;
  const source = fs.readFileSync(full, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  cache.set(full, module);
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    if (!name.startsWith('.')) throw new Error(`unexpected import ${name}`);
    return load(path.join(path.dirname(relPath), name + '.ts'));
  });
  return module.exports;
}

const V = load('lib/visitQuestions.ts');

let failures = 0;
let checks = 0;
function check(label, actual, expected) {
  checks += 1;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures += 1;
    console.error(`FAIL  ${label}`);
    console.error(`      expected ${JSON.stringify(expected)}`);
    console.error(`      got      ${JSON.stringify(actual)}`);
  }
}
function has(label, text, part) { check(`${label} contains "${part}"`, String(text).includes(part), true); }
function lacks(label, text, part) { check(`${label} lacks "${part}"`, String(text).includes(part), false); }

function q(id, position, extra = {}) {
  return { id, appointmentId: 'a1', text: `Question ${id}`, position, asked: false, answer: null, captureNoteId: null, createdAt: `2026-11-0${position + 1}T10:00:00Z`, ...extra };
}

// --- 1. Words -----------------------------------------------------------------
check('spaces tidied', V.cleanQuestionText('  Is my   dose\n still right? '), 'Is my dose still right?');
check('empty stays empty', V.cleanQuestionText('   \n '), '');
check('long text cut at the limit', V.cleanQuestionText('x'.repeat(900)).length, V.MAX_QUESTION_LENGTH);

// --- 2. Order and moving ------------------------------------------------------
const three = [q('c', 2), q('a', 0), q('b', 1)];
check('ordered by position', V.orderQuestions(three).map((x) => x.id), ['a', 'b', 'c']);
check('next position after the highest', V.nextPosition(three), 3);
check('next position on an empty list', V.nextPosition([]), 0);
check('move b up', V.moveQuestion(three, 'b', 'up'), [{ id: 'b', position: 0 }, { id: 'a', position: 1 }, { id: 'c', position: 2 }]);
check('move b down', V.moveQuestion(three, 'b', 'down'), [{ id: 'a', position: 0 }, { id: 'c', position: 1 }, { id: 'b', position: 2 }]);
check('first cannot go up', V.moveQuestion(three, 'a', 'up'), null);
check('last cannot go down', V.moveQuestion(three, 'c', 'down'), null);
check('unknown id does nothing', V.moveQuestion(three, 'zz', 'up'), null);
const tied = [q('x', 0), { ...q('y', 0), createdAt: '2026-11-05T10:00:00Z' }];
check('tied positions renumber on a move', V.moveQuestion(tied, 'y', 'up'), [{ id: 'y', position: 0 }, { id: 'x', position: 1 }]);

// --- 3. The opener -------------------------------------------------------------
check('no questions', V.questionsLabel([]), 'Questions');
check('none asked', V.questionsLabel(three), 'Questions (3)');
check('some asked', V.questionsLabel([q('a', 0, { asked: true }), q('b', 1)]), 'Questions (2, 1 asked)');

// --- 4. Notes offered ----------------------------------------------------------
const notes = [
  { id: 'n1', text: 'Ask about iron', createdAt: '2026-11-01T09:00:00Z', status: 'open', destination: 'health' },
  { id: 'n2', text: 'Done one', createdAt: '2026-11-02T09:00:00Z', status: 'done', destination: 'health' },
  { id: 'n3', text: 'Buy milk', createdAt: '2026-11-03T09:00:00Z', status: 'open', destination: 'shopping' },
  { id: 'n4', text: 'Ask about sleep', createdAt: '2026-11-04T09:00:00Z', status: 'open', destination: 'health' },
  { id: 'n5', text: 'Already brought in', createdAt: '2026-11-05T09:00:00Z', status: 'open', destination: 'health' },
];
check('offered notes', V.notesToOffer(notes, new Set(['n5'])).map((n) => n.id), ['n4', 'n1']);

// --- 5. Removal words -----------------------------------------------------------
const next = { title: 'Endocrinology', day: '2026-12-02' };
const r1 = V.removalWords([q('a', 0), q('b', 1, { asked: true })], next);
check('can move when some wait and a visit is planned', r1.canMove, true);
has('move words', r1.message, 'The 1 not asked yet can move to Endocrinology');
has('move words count', r1.message, '2 questions');
const r2 = V.removalWords([q('a', 0, { asked: true })], next);
check('nothing to move when all asked', r2.canMove, false);
has('all asked words', r2.message, 'go with it');
check('no next visit, no move', V.removalWords([q('a', 0)], null).canMove, false);
check('no questions, no words', V.removalWords([], next), { message: '', canMove: false });

// --- 6. The page ---------------------------------------------------------------
const appointment = { id: 'a1', title: 'Thyroid check', scheduledFor: '2026-11-20T09:30', providerName: 'Dr. Ruiz', location: 'Clinic 3', appointmentType: 'specialist', status: 'planned' };
const appointments = [
  { scheduledFor: '2026-08-10T09:00', title: 'Thyroid check', providerName: 'Dr. Ruiz', status: 'completed' },
  { scheduledFor: '2026-10-01T09:00', title: 'Thyroid check', providerName: 'Dr. Ruiz', status: 'cancelled' },
  { scheduledFor: '2026-10-15T09:00', title: 'Dentist', providerName: 'Dr. Lee', status: 'completed' },
];
check('since the last visit with the provider, skipping cancelled', V.sinceDay({ appointment, appointments }), { day: '2026-08-10', previous: true });
check('90 days back with no earlier visit', V.sinceDay({ appointment, appointments: [] }), { day: '2026-08-22', previous: false });

const input = {
  appointment,
  appointments,
  labs: [
    { displayName: 'TSH', value: 3.1, unit: 'mIU/L', low: 0.4, high: 4.0, testedAt: '2026-11-01' },
    { displayName: 'Old TSH', value: 5, unit: 'mIU/L', low: 0.4, high: 4.0, testedAt: '2026-07-01' },
  ],
  flares: [{ loggedAt: '2026-09-05T08:00:00', severity: 3, notes: 'Joint pain' }],
  treatments: [],
  questions: [q('b', 1, { text: 'Is <b>this</b> right?' }), q('a', 0, { text: 'First one', asked: true, answer: 'Yes, keep going' })],
};
const sections = V.buildSinceSections(input);
check('only labs inside the window', sections.sections[0].lines.length, 1);
check('flares inside the window', sections.sections[1].lines.length, 1);
check('no changes recorded', sections.sections[2].summary, 'None recorded.');
const html = V.buildVisitPageHtml(input);
has('page', html, 'Thyroid check');
has('page', html, 'Dr. Ruiz');
has('page escapes', html, 'Is &lt;b&gt;this&lt;/b&gt; right?');
lacks('page escapes', html, '<b>this</b>');
check('questions in order', html.indexOf('First one') < html.indexOf('Is &lt;b&gt;'), true);
has('page keeps answers', html, 'Yes, keep going');
has('page ticks asked', html, '&#10003;');
has('page', html, 'Anything else said at the visit');
const blank = V.buildVisitPageHtml({ ...input, questions: [] });
has('blank page', blank, 'lines below are for writing them by hand');
const body = html.replace(/<style>[\s\S]*?<\/style>/, '');
for (const word of ['%', 'score', 'abnormal', 'great', 'should stop', 'worse', 'better']) {
  lacks('no verdict on the page', body, word);
}
const tr = (english, values) => `[${english}]${values ? JSON.stringify(values) : ''}`;
has('words go through the translator', V.questionsLabel([], tr), '[Questions]');
has('page words go through the translator', V.buildVisitPageHtml(input, tr), '[Since the last visit]');

console.log(`visitQuestions: ${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
