// Checks the steps-and-labels rules for to-dos (Q47) without a phone:
// lib/todoExtras.ts.
//
// The rules checked:
//
//  1. A step keeps its words, with only extra spaces taken out.
//  2. Steps read in the order the person set; a move renumbers every step
//     from 0, and a move past either end does nothing.
//  3. The opener says how many steps are still to do, nothing more: no
//     percentage and no "of".
//  4. Labels are read from words split at commas, tidied, kept once each in
//     any capitals, and a label already in use keeps its spelling.
//  5. The label row lists each label once, alphabetically; a filter keeps
//     only the to-dos carrying the chosen label, and no choice keeps all.
//
// Run with: node scripts/test_todo_extras.js
// Exits non-zero on any failure.

/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(relPath) {
  const full = path.join(__dirname, '..', relPath);
  const { outputText } = ts.transpileModule(fs.readFileSync(full, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    throw new Error(`unexpected import ${name}`);
  });
  return module.exports;
}

const X = load('lib/todoExtras.ts');

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

function step(id, position, extra = {}) {
  return { id, todoId: 't1', text: `Step ${id}`, position, doneAt: null, createdAt: `2026-11-0${position + 1}T10:00:00Z`, ...extra };
}

// --- 1. Words -----------------------------------------------------------------
check('spaces tidied', X.cleanStepText('  Find the   receipt\n '), 'Find the receipt');
check('empty stays empty', X.cleanStepText('  \n '), '');
check('long step cut at the limit', X.cleanStepText('x'.repeat(500)).length, X.MAX_STEP_LENGTH);

// --- 2. Order and moving ------------------------------------------------------
const three = [step('c', 2), step('a', 0), step('b', 1)];
check('ordered by position', X.orderTodoSteps(three).map((x) => x.id), ['a', 'b', 'c']);
check('next position', X.nextStepPosition(three), 3);
check('next position on none', X.nextStepPosition([]), 0);
check('move b up', X.moveTodoStep(three, 'b', 'up'), [{ id: 'b', position: 0 }, { id: 'a', position: 1 }, { id: 'c', position: 2 }]);
check('move b down', X.moveTodoStep(three, 'b', 'down'), [{ id: 'a', position: 0 }, { id: 'c', position: 1 }, { id: 'b', position: 2 }]);
check('first cannot go up', X.moveTodoStep(three, 'a', 'up'), null);
check('last cannot go down', X.moveTodoStep(three, 'c', 'down'), null);
check('unknown id', X.moveTodoStep(three, 'zz', 'up'), null);
const tied = [step('x', 0), { ...step('y', 0), createdAt: '2026-11-09T10:00:00Z' }];
check('tied positions renumber', X.moveTodoStep(tied, 'y', 'up'), [{ id: 'y', position: 0 }, { id: 'x', position: 1 }]);

// --- 3. The opener -------------------------------------------------------------
check('no steps', X.stepsLabel([]), 'Steps');
check('some to do', X.stepsLabel([step('a', 0, { doneAt: '2026-11-10T00:00:00Z' }), step('b', 1), step('c', 2)]), 'Steps (2 to do)');
check('all ticked', X.stepsLabel([step('a', 0, { doneAt: '2026-11-10T00:00:00Z' })]), 'Steps (all ticked)');
for (const steps of [[step('a', 0)], [step('a', 0, { doneAt: 'x' }), step('b', 1)]]) {
  const label = X.stepsLabel(steps);
  check(`no percentage in "${label}"`, /%| of /.test(label), false);
}
const tr = (english, values) => `[${english}]${values ? JSON.stringify(values) : ''}`;
check('opener goes through the translator', X.stepsLabel([step('a', 0)], tr), '[Steps ({count} to do)]{"count":1}');

// --- 4. Labels read -----------------------------------------------------------
check('split at commas', X.readLabelWords('house, car ,  garden '), ['house', 'car', 'garden']);
check('same label twice kept once', X.readLabelWords('House, house, HOUSE'), ['House']);
check('empty pieces dropped', X.readLabelWords(', ,car,,'), ['car']);
check('a leading # dropped', X.readLabelWords('#errands'), ['errands']);
check('spelling in use wins', X.readLabelWords('house, For Lisa', ['House', 'for Lisa']), ['House', 'for Lisa']);
check('nothing typed, no labels', X.readLabelWords('   '), []);
check('long label cut', X.cleanLabel('y'.repeat(100)).length, X.MAX_LABEL_LENGTH);
check('field words back', X.labelWordsOf(['house', 'car']), 'house, car');

// --- 5. The label row and the filter ------------------------------------------
const byTodo = new Map([
  ['t1', ['house', 'Car']],
  ['t2', ['House']],
  ['t3', []],
  ['t4', ['errands']],
]);
check('labels once each, alphabetical', X.labelsInUse(byTodo), ['Car', 'errands', 'house']);
check('no choice keeps all', X.todoHasLabel([], null), true);
check('filter any capitals', X.todoHasLabel(['House'], 'house'), true);
check('filter leaves others out', X.todoHasLabel(['car'], 'house'), false);
check('no labels with a choice', X.todoHasLabel(undefined, 'house'), false);
check('row order', X.sortedLabels(['zebra', 'Apple', 'mango']), ['Apple', 'mango', 'zebra']);
check('empty filter words', X.emptyLabelWords('car'), 'Nothing on the list carries the label car.');

console.log(`todoExtras: ${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
