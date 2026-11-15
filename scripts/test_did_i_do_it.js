// Runs lib/didIDoIt.ts: the day Life > Did I Do It looks back on.
//
// Built 2026-11-15, from the direct instruction that Did I Do It shows only
// what was checked off: the things done on their own, and each routine with
// the steps done on it under it, never a routine's steps among the things on
// their own.
//
// The rules checked:
//
//  1. A thing no routine walks past, and a Task marked done, are listed on
//     their own with every time they were checked off that day.
//  2. A thing a routine walks past is never listed on its own, whether it
//     was ticked on a walk or from the Checklist.
//  3. A walk lists the steps done on it in walk order; a skipped step is not
//     listed.
//  4. A mark made on a walk that already lists that step is not said twice.
//  5. A thing in a routine checked off outside a walk is listed under the
//     routine.
//  6. A walk from before each step was kept says only its count, and its
//     marks are listed under the routine.
//  7. A walk put down before anything was done is not listed, and a routine
//     with nothing done that day is not listed.
//  8. Only the local day is kept, from inputs a day wider at both ends.
//
// Run with: node scripts/test_did_i_do_it.js
// Exits non-zero on any failure.

/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function transpile(relPath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  }).outputText;
}

function run(relPath, resolve) {
  const module = { exports: {} };
  new Function('exports', 'module', 'require', transpile(relPath))(module.exports, module, (name) => {
    const found = resolve[name];
    if (!found) throw new Error(`unexpected import ${name}`);
    return found;
  });
  return module.exports;
}

const R = run('lib/routines.ts', {});
const D = run('lib/didIDoIt.ts', { './routines': R });

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`ok   ${label}`);
  else {
    failures += 1;
    console.log(`FAIL ${label}`);
  }
}

// Local times on 2026-11-15, as UTC ISO, the way the tables keep them.
const at = (h, m = 0, d = 15) => new Date(2026, 10, d, h, m).toISOString();
const DAY = '2026-11-15';

const morning = {
  id: 'r1',
  name: 'Morning',
  position: 0,
  steps: [
    { id: 's1', routineId: 'r1', text: 'Pill', detail: null, position: 0, checkId: 'c1', minutes: null },
    { id: 's2', routineId: 'r1', text: 'Stretch', detail: null, position: 1, checkId: 'c2', minutes: null },
    { id: 's3', routineId: 'r1', text: 'Water plants', detail: null, position: 2, checkId: 'c3', minutes: null },
  ],
};
const evening = {
  id: 'r2',
  name: 'Evening',
  position: 1,
  steps: [{ id: 'e1', routineId: 'r2', text: 'Lock the door', detail: null, position: 0, checkId: 'c5', minutes: null }],
};
const routines = [morning, evening];

const day = D.buildLookBackDay({
  day: DAY,
  routines,
  marks: [
    { checkId: 'c4', checkName: 'Bins out', markedAt: at(9), via: 'tap', routineId: null },
    { checkId: 'c4', checkName: 'Bins out', markedAt: at(18), via: 'tap', routineId: null },
    { checkId: 'c4', checkName: 'Bins out', markedAt: at(9, 0, 14), via: 'tap', routineId: null },
    { checkId: 'c1', checkName: 'Pill', markedAt: at(7, 1), via: 'routine', routineId: 'r1' },
    { checkId: 'c3', checkName: 'Water plants', markedAt: at(13), via: 'tap', routineId: null },
    { checkId: 'c5', checkName: 'Lock the door', markedAt: at(22), via: 'routine', routineId: 'r2' },
  ],
  runs: [
    { id: 'run1', routineId: 'r1', routineName: 'Morning', startedAt: at(7), completedAt: at(7, 10), stepsDone: 2, stepsTotal: 3 },
    { id: 'run2', routineId: 'r1', routineName: 'Morning', startedAt: at(11), completedAt: null, stepsDone: 0, stepsTotal: 3 },
    { id: 'old', routineId: 'r2', routineName: 'Evening', startedAt: at(22), completedAt: at(22, 1), stepsDone: 1, stepsTotal: 1 },
    { id: 'yday', routineId: 'r1', routineName: 'Morning', startedAt: at(7, 0, 14), completedAt: at(7, 5, 14), stepsDone: 3, stepsTotal: 3 },
  ],
  runSteps: [
    { runId: 'run1', stepText: 'Stretch', checkId: 'c2', position: 1, answer: 'done', answeredAt: at(7, 5) },
    { runId: 'run1', stepText: 'Pill', checkId: 'c1', position: 0, answer: 'done', answeredAt: at(7, 1) },
    { runId: 'run1', stepText: 'Water plants', checkId: 'c3', position: 2, answer: 'skipped', answeredAt: at(7, 9) },
    { runId: 'yday', stepText: 'Pill', checkId: 'c1', position: 0, answer: 'done', answeredAt: at(7, 1, 14) },
  ],
  tasks: [
    { todoId: 't1', title: 'Call the bank', doneAt: at(10) },
    { todoId: 't2', title: 'Yesterday task', doneAt: at(10, 0, 14) },
  ],
});

// 1
const ownNames = day.onTheirOwn.map((item) => item.name);
check('1. a thing on its own is listed', ownNames.includes('Bins out'));
check('1. a Task done is listed', ownNames.includes('Call the bank'));
check('1. both times of a thing are kept', day.onTheirOwn.find((item) => item.name === 'Bins out').times.length === 2);
// 2
check('2. no routine step is listed on its own', !ownNames.some((name) => ['Pill', 'Stretch', 'Water plants', 'Lock the door'].includes(name)));
// 3
const m = day.routines.find((routine) => routine.routineId === 'r1');
check('3. the routine is listed', m != null);
check('3. one walk with something done', m.walks.length === 1);
check('3. steps in walk order, skipped left out', JSON.stringify(m.walks[0].steps.map((s) => s.text)) === '["Pill","Stretch"]');
check('3. a finished walk says so', m.walks[0].finished === true);
// 4 and 5
check('4. the walk mark for Pill is not said twice', !m.outsideWalks.some((item) => item.name === 'Pill'));
check('5. a routine thing ticked outside a walk is under the routine', m.outsideWalks.some((item) => item.name === 'Water plants'));
// 6
const e = day.routines.find((routine) => routine.routineId === 'r2');
check('6. an older walk has only its count', e.walks[0].steps === null && e.walks[0].stepsDone === 1);
check('6. an older walk\'s mark is under the routine', e.outsideWalks.some((item) => item.name === 'Lock the door'));
// 7
check('7. a walk with nothing done is not listed', !m.walks.some((walk) => walk.runId === 'run2'));
const empty = D.buildLookBackDay({ day: DAY, routines, marks: [], runs: [{ id: 'x', routineId: 'r1', routineName: 'Morning', startedAt: at(8), completedAt: null, stepsDone: 0, stepsTotal: 3 }], runSteps: [], tasks: [] });
check('7. a routine with nothing done is not listed', empty.routines.length === 0 && empty.onTheirOwn.length === 0);
// 8
check('8. yesterday\'s Task is not on today', !ownNames.includes('Yesterday task'));
check('8. yesterday\'s walk is not on today', !m.walks.some((walk) => walk.runId === 'yday'));
check('8. shiftDay crosses a month', D.shiftDay('2026-11-30', 1) === '2026-12-01' && D.shiftDay('2026-03-01', -1) === '2026-02-28');

if (failures > 0) {
  console.log(`\n${failures} failed`);
  process.exit(1);
}
console.log('\nAll passed.');
