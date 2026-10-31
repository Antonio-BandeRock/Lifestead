// Checks lib/projects.ts (Projects, app-wide): the next step, what waiting
// and kept-for-later do to it, the count of steps left, grouping, moving a
// step, what raises a reminder, and that nothing said about a project
// judges it: no percentages, no failed or abandoned, nothing late.
// "Today" is fixed at Friday 30 October 2026.
// Run: node scripts/test_projects.js
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
    throw new Error(`lib/projects.ts must stay pure, asked for ${name}`);
  });
  cache[file] = m.exports;
  return m.exports;
}
const P = load('projects');
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

let n = 0;
function project(over) {
  n++;
  return {
    id: `p${n}`,
    name: `Project ${n}`,
    about: null,
    area: 'life',
    status: 'active',
    pausedAt: null,
    pausedNote: null,
    finishedAt: null,
    stoppedAt: null,
    dueOn: null,
    createdAt: `2026-10-0${(n % 9) + 1}T10:00:00Z`,
    ...over,
  };
}
function step(projectId, position, over) {
  n++;
  return {
    id: `s${n}`,
    projectId,
    text: `Step ${position}`,
    position,
    parked: false,
    waitingOn: null,
    dueOn: null,
    doneAt: null,
    createdAt: `2026-10-01T10:00:${String(n).padStart(2, '0')}Z`,
    ...over,
  };
}

// The next step.
const bath = project({ name: 'Retile the bathroom' });
const steps = [
  step(bath.id, 1, { text: 'Measure the floor', doneAt: '2026-10-20T12:00:00Z' }),
  step(bath.id, 2, { text: 'Order the tiles', waitingOn: 'the quote from the shop' }),
  step(bath.id, 3, { text: 'Clear the room' }),
  step(bath.id, 4, { text: 'Heated floor?', parked: true }),
];
check('next skips done and waiting', P.nextStep(steps).text === 'Clear the room', P.nextStep(steps));
check('steps left counts open and waiting', P.stepsLeft(steps) === 2, P.stepsLeft(steps));
check('kept for later is not left', P.stepsLeft([step(bath.id, 1, { parked: true })]) === 0);
check('states', steps.map(P.stepState).join() === 'done,waiting,open,parked', steps.map(P.stepState));
check('order: plan, later, done', P.orderSteps(steps).map((s) => s.text).join('|') === 'Order the tiles|Clear the room|Heated floor?|Measure the floor');
check('blank waiting is not waiting', P.stepState(step(bath.id, 1, { waitingOn: '   ' })) === 'open');

const lines = P.describeProjectLines(bath, steps, TODAY);
check('leads with the next step', lines[0] === 'Next: Clear the room', lines);
check('then the count', lines[1] === '2 steps left', lines);

const waitingOnly = project();
const waitingLines = P.describeProjectLines(waitingOnly, [step(waitingOnly.id, 1, { waitingOn: 'Dad' })], TODAY);
check('all waiting says what it waits on', waitingLines[0] === 'Waiting on Dad', waitingLines);

const empty = project();
check('no steps yet', P.describeProjectLines(empty, [], TODAY)[0] === 'No steps yet');
const allDone = project();
check('every step done', P.describeProjectLines(allDone, [step(allDone.id, 1, { doneAt: '2026-10-29T10:00:00Z' })], TODAY)[0] === 'Every step in the plan is done');

const dated = project({ dueOn: '2026-11-12' });
check('a day reads For', P.describeProjectLines(dated, [], TODAY).includes('For Thu 12 Nov'), P.describeProjectLines(dated, [], TODAY));
check('day gone by is named, not late', P.describeProjectDay('2026-10-20', TODAY) === 'Its day was Tue 20 Oct', P.describeProjectDay('2026-10-20', TODAY));
check('today', P.describeProjectDay(TODAY, TODAY) === 'For today');
check('tomorrow', P.describeProjectDay('2026-10-31', TODAY) === 'For tomorrow');
check('next year carries the year', P.describeProjectDay('2027-01-05', TODAY) === 'For Tue 5 Jan 2027');

const paused = project({ status: 'paused', pausedAt: '2026-10-10T09:00:00', pausedNote: 'Grout bought, not mixed' });
const pausedLines = P.describeProjectLines(paused, [step(paused.id, 1, { text: 'Mix the grout' })], TODAY);
check('paused says since when', pausedLines[0] === 'Paused since Sat 10 Oct', pausedLines);
check('paused still names its next step', pausedLines[1] === 'Next: Mix the grout', pausedLines);
check('left off line', P.describeLeftOff(paused) === 'Where you left off: Grout bought, not mixed');
check('no left off line on a going one', P.describeLeftOff(bath) === null);

const finished = project({ status: 'finished', finishedAt: '2026-10-28T09:00:00' });
check('finished', P.describeProjectLines(finished, [], TODAY)[0] === 'Finished Wed 28 Oct');
const stopped = project({ status: 'stopped', stoppedAt: '2026-10-27T09:00:00' });
check('stopped is kept', P.describeProjectLines(stopped, [], TODAY)[0] === 'Stopped Tue 27 Oct, kept as a record');

check('step caption waiting and day', P.describeStepCaption(step(bath.id, 1, { waitingOn: 'Ana', dueOn: '2026-11-02' }), TODAY) === 'Waiting on Ana · For Mon 2 Nov');
check('step caption done', P.describeStepCaption(steps[0], TODAY) === 'Done Tue 20 Oct');
check('step caption none', P.describeStepCaption(steps[2], TODAY) === null);

check('steps left words', P.describeStepsLeft(1) === '1 step left' && P.describeStepsLeft(3) === '3 steps left');

// Grouping.
const g1 = project({ dueOn: '2026-11-20' });
const g2 = project({ dueOn: '2026-11-05' });
const g3 = project({});
const g4 = project({ status: 'paused', pausedAt: '2026-10-20T00:00:00Z' });
const g5 = project({ status: 'paused', pausedAt: '2026-10-01T00:00:00Z' });
const g6 = project({ status: 'stopped', stoppedAt: '2026-10-02T00:00:00Z' });
const g7 = project({ status: 'finished', finishedAt: '2026-10-03T00:00:00Z' });
const groups = P.groupProjects([g1, g2, g3, g4, g5, g6, g7]);
check('group order', groups.map((g) => g.key).join() === 'active,paused,finished,stopped', groups.map((g) => g.key));
check('soonest day first', groups[0].projects.map((p) => p.id).join() === [g2.id, g1.id, g3.id].join());
check('paused longest first', groups[1].projects[0].id === g5.id);
check('empty groups left out', P.groupProjects([g3]).length === 1);

// Moving a step.
const moved = P.planStepMove(steps, steps[2].id, -1);
check('move up swaps with the step above in the plan', moved && moved.get(steps[2].id) === 1 && moved.get(steps[1].id) === 2, moved && [...moved]);
check('cannot move first up', P.planStepMove(steps, steps[1].id, -1) === null);
check('cannot move last down', P.planStepMove(steps, steps[2].id, 1) === null);
check('a later step does not move in the plan', P.planStepMove(steps, steps[3].id, -1) === null);
check('next position', P.nextPosition(steps) === 5 && P.nextPosition([]) === 1);

// Reminders.
const going = project({ dueOn: '2026-11-15' });
const pausedWithDays = project({ status: 'paused', dueOn: '2026-11-15' });
const reminderSteps = [
  step(going.id, 1, { text: 'Book the plumber', dueOn: '2026-11-02' }),
  step(going.id, 2, { text: 'Old one', dueOn: '2026-10-01' }),
  step(going.id, 3, { text: 'Done one', dueOn: '2026-11-03', doneAt: '2026-10-29T00:00:00Z' }),
  step(going.id, 4, { text: 'Later one', dueOn: '2026-11-04', parked: true }),
  step(pausedWithDays.id, 1, { text: 'Paused step', dueOn: '2026-11-02' }),
];
const reminders = P.projectReminders([going, pausedWithDays], reminderSteps, TODAY);
check('project day and one step', reminders.length === 2, reminders);
const projectReminder = reminders.find((r) => r.sourceId === going.id);
check('project day carries the next step and no Done', projectReminder && projectReminder.detail === 'Next: Book the plumber' && projectReminder.markable === false, projectReminder);
const stepReminder = reminders.find((r) => r.sourceId === reminderSteps[0].id);
check('step names its project and carries Done', stepReminder && stepReminder.detail === going.name && stepReminder.markable === true, stepReminder);

check('clean text', P.cleanProjectText('  a   b  ') === 'a b');

// Nothing judges.
const said = [
  ...Object.values(P.PROJECT_GROUP_LABELS),
  ...Object.values(P.PROJECT_AREA_LABELS),
  ...[bath, waitingOnly, empty, allDone, dated, paused, finished, stopped].flatMap((p) => P.describeProjectLines(p, steps, TODAY)),
  P.describeProjectDay('2026-01-01', TODAY),
  P.describeStepsLeft(0),
  ...reminders.map((r) => `${r.title} ${r.detail}`),
  fs.readFileSync(path.join(__dirname, '..', 'components', 'ProjectsSection.tsx'), 'utf8'),
].join('\n');
for (const word of ['late', 'missed', 'failed', 'failure', 'abandoned', 'gave up', 'give up', 'overdue', 'streak', 'behind', 'genuine', 'genuinely', 'real', 'percent', 'progress bar']) {
  check(`no "${word}"`, !new RegExp(`\\b${word}\\b`, 'i').test(said));
}
check('no percentage sign in what is said', !/\d\s?%/.test(said));
check('no em or en dash', !/[–—]/.test(said));

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
