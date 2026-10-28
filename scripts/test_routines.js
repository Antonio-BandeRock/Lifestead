// Checks the routine and To Do List rules (lib/routines.ts): when each
// thing on the To Do List comes round, which time a tap checks off, what each
// line says,
// which routine the clock puts first, and that reordering steps loses
// nothing. Pure, so it runs here rather than needing a phone.
//
// The dates below are built with the local-time Date constructor on
// purpose. Everything in this module answers a question somebody asks
// standing in their own kitchen ("did I already do it"), so the day and the
// week are the local ones, and a test written in UTC would be checking a
// different question.
//
// Exits non-zero on any failure.

// eslint-config-expo lints this repo as app code, which has no __dirname.
// This is a plain Node script run with node, so it does (2026-09-17).
/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(relPath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, () => {
    throw new Error('lib/routines.ts must stay free of runtime imports');
  });
  return module.exports;
}

const {
  ALL_ROUTINE_OCCASIONS,
  checkIdsInRoutine,
  checkStanding,
  cleanCheckSchedule,
  describeCheckSchedule,
  describeDue,
  isScheduledOn,
  nextCheckReminderTimes,
  occurrenceToMark,
  cleanReminderTime,
  cleanRoutineText,
  describeReminderDays,
  describeRoutineReminder,
  describeCheckRoutine,
  describeChecksSummary,
  describeMarkMoment,
  describeOccasionHours,
  describeRoutineStanding,
  findOccasion,
  formatHour,
  formatMarkClock,
  formatReminderClock,
  groupChecksByRoutine,
  isKnownOccasion,
  isRoutineTextUsable,
  LOOSE_CHECKS_HEADING,
  hasRoutineReminder,
  moveRoutineStep,
  nextReminderTimes,
  occasionChoices,
  orderRoutinesForNow,
  parseReminderDays,
  reminderFiresOnDay,
  routineDoneToday,
  routineForCheck,
  routineOccasionLabel,
  routineProgressLabel,
  serializeReminderDays,
  startOfLocalWeek,
  toggleReminderDay,
  suggestedOccasion,
  summarizeChecks,
} = load('lib/routines.ts');

let failures = 0;
let checks = 0;
function check(label, actual, expected) {
  checks += 1;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures += 1;
    console.error(`FAIL  ${label}`);
    console.error(`      expected ${JSON.stringify(expected)}`);
    console.error(`      actual   ${JSON.stringify(actual)}`);
  }
}

function makeCheck(overrides) {
  return {
    id: 'c1',
    name: 'Take the morning pill',
    active: true,
    position: 0,
    lastMarkedAt: null,
    lastMarkedVia: null,
    times: ['08:00'],
    repeat: 'days',
    days: [],
    everyN: 1,
    everyUnit: 'day',
    startsOn: '2026-09-01',
    reminderOn: true,
    keepReminding: null,
    lastDueAt: null,
    createdAt: new Date(2026, 8, 1, 0, 0, 0).toISOString(),
    ...overrides,
  };
}

function makeStep(id, position) {
  return { id, routineId: 'r1', text: id, detail: null, position, checkId: null };
}

function makeRoutine(overrides) {
  return {
    id: 'r1',
    name: 'Morning',
    occasion: 'morning',
    active: true,
    position: 0,
    lastCompletedAt: null,
    reminderTime: null,
    reminderDays: [],
    reminderOn: false,
    steps: [],
    ...overrides,
  };
}

// A Wednesday, mid-morning. Every clock question below is asked from here.
const wednesday = new Date(2026, 8, 16, 9, 30, 0);

// ------------------------------------------------------------ the week runs Monday to Sunday

check('Monday is its own week start', startOfLocalWeek(new Date(2026, 8, 14, 23, 59)).getDate(), 14);
check('Wednesday belongs to Monday', startOfLocalWeek(wednesday).getDate(), 14);
check('Sunday trails the week it ends', startOfLocalWeek(new Date(2026, 8, 20, 0, 1)).getDate(), 14);

// ------------------------------------------------------------ when a thing comes round

const day = (d) => new Date(2026, 8, d, 12, 0, 0);
check('every day means every day', isScheduledOn(makeCheck({}), day(19)), true);
check('weekdays leave Saturday out', isScheduledOn(makeCheck({ days: [1, 2, 3, 4, 5] }), day(19)), false);
check('and keep Wednesday', isScheduledOn(makeCheck({ days: [1, 2, 3, 4, 5] }), day(16)), true);
const fortnightly = makeCheck({ repeat: 'every', everyN: 2, everyUnit: 'week', startsOn: '2026-09-02' });
check('every 2 weeks skips the week between', isScheduledOn(fortnightly, day(9)), false);
check('and lands on the second Wednesday', isScheduledOn(fortnightly, day(16)), true);
check('nothing comes round before it starts', isScheduledOn(fortnightly, new Date(2026, 7, 19, 12)), false);
const every3 = makeCheck({ repeat: 'every', everyN: 3, everyUnit: 'day', startsOn: '2026-09-10' });
check('every 3 days from the 10th lands on the 16th', isScheduledOn(every3, day(16)), true);
check('and not on the 17th', isScheduledOn(every3, day(17)), false);
// The 31st falls on the last day of a shorter month rather than skipping it.
const monthEnd = makeCheck({ repeat: 'every', everyN: 1, everyUnit: 'month', startsOn: '2026-01-31' });
check('the 31st lands on April 30', isScheduledOn(monthEnd, new Date(2026, 3, 30, 12)), true);
check('and not on April 29', isScheduledOn(monthEnd, new Date(2026, 3, 29, 12)), false);

const cleaned = cleanCheckSchedule(
  { times: ['20:00', 'nonsense', '08:00', '08:00'], repeat: 'other', days: [9, 1], everyN: 0, everyUnit: 'year', startsOn: 'soon', reminderOn: true, keepReminding: null },
  wednesday,
);
check('times are cleaned, deduplicated and put in clock order', cleaned.times, ['08:00', '20:00']);
check('an unknown repeat reads as days', cleaned.repeat, 'days');
check('an unknown unit reads as days', cleaned.everyUnit, 'day');
check('a number below one reads as one', cleaned.everyN, 1);
check('a start that is not a day reads as today', cleaned.startsOn, '2026-09-16');
check(
  'a schedule never ends up with no time',
  cleanCheckSchedule({ ...cleaned, times: [] }, wednesday).times,
  ['09:00'],
);

// ------------------------------------------------------------ which time a tap checks off

const twiceDaily = makeCheck({ times: ['08:00', '20:00'] });
check('the morning time is open at 9:30, so a tap checks it off', occurrenceToMark(twiceDaily, wednesday), '2026-09-16T08:00');
check(
  'once the morning is done, a tap counts for the evening',
  occurrenceToMark(makeCheck({ times: ['08:00', '20:00'], lastDueAt: '2026-09-16T08:00' }), wednesday),
  '2026-09-16T20:00',
);
check(
  'and once the evening is done early, the next tap is tomorrow morning',
  occurrenceToMark(makeCheck({ times: ['08:00', '20:00'], lastDueAt: '2026-09-16T20:00' }), wednesday),
  '2026-09-17T08:00',
);

// ------------------------------------------------------------ where a thing stands

const markedThisMorning = new Date(2026, 8, 16, 7, 12, 0).toISOString();
const markedLastWeek = new Date(2026, 8, 8, 8, 2, 0).toISOString();

const doneToday = checkStanding(makeCheck({ lastMarkedAt: markedThisMorning, lastDueAt: '2026-09-16T08:00' }), wednesday);
check('this morning checked off is done', doneToday.done, true);
check('and nothing is waiting', doneToday.waitingSince, null);
check('the next one is tomorrow morning', doneToday.nextDue.getTime(), new Date(2026, 8, 17, 8, 0).getTime());
const waiting = checkStanding(makeCheck({ lastMarkedAt: markedLastWeek, lastDueAt: '2026-09-08T08:00' }), wednesday);
check('checked off last week is waiting today', waiting.done, false);
check('since this morning', waiting.waitingSince.getTime(), new Date(2026, 8, 16, 8, 0).getTime());
// Added at nine with an eight o'clock time: this morning's eight never
// applied to it, so it is not waiting since then.
const addedToday = checkStanding(makeCheck({ createdAt: new Date(2026, 8, 16, 9, 0).toISOString() }), wednesday);
check('a thing added after its time today has nothing due yet', addedToday.done, null);
check(
  'nonsense in the column reads as nothing recorded',
  checkStanding(makeCheck({ lastMarkedAt: 'not a date' }), wednesday).lastMarkedAt,
  null,
);

// ------------------------------------------------------------ the line somebody reads

check('noon reads as 12', formatMarkClock(new Date(2026, 8, 16, 12, 5)), '12:05pm');
check('midnight reads as 12 too', formatMarkClock(new Date(2026, 8, 16, 0, 5)), '12:05am');
check('the hour keeps its zero', formatMarkClock(new Date(2026, 8, 16, 7, 2)), '7:02am');

check('today keeps its clock', describeMarkMoment(markedThisMorning, wednesday), 'today at 7:12am');
check(
  'yesterday keeps its clock',
  describeMarkMoment(new Date(2026, 8, 15, 21, 40).toISOString(), wednesday),
  'yesterday at 9:40pm',
);
check(
  'inside the week it is named by its day',
  describeMarkMoment(new Date(2026, 8, 13, 8, 0).toISOString(), wednesday),
  'Sunday at 8:00am',
);
check('past a week the clock is noise', describeMarkMoment(markedLastWeek, wednesday), 'over a week ago');
check(
  'past a fortnight it counts in weeks',
  describeMarkMoment(new Date(2026, 7, 20, 8, 0).toISOString(), wednesday),
  '3 weeks ago',
);

check('a time later today', describeDue(new Date(2026, 8, 16, 20, 0), wednesday), 'today at 8pm');
check('a time tomorrow', describeDue(new Date(2026, 8, 17, 8, 0), wednesday), 'tomorrow at 8am');
check('a time this week is named by its day', describeDue(new Date(2026, 8, 18, 9, 0), wednesday), 'Friday at 9am');
check('a time further off is named by its date', describeDue(new Date(2026, 10, 14, 9, 0), wednesday), 'Nov 14 at 9am');

check('done says when, and when it comes back', doneToday.line, 'Done today at 7:12am. Next: tomorrow at 8am.');
check('waiting says since when, and when it last was', waiting.line, 'Not checked off for today at 8am. Last done over a week ago.');
check('never done says only what it is waiting for', checkStanding(makeCheck({}), wednesday).line, 'Not checked off for today at 8am.');
check('added after its time says when the first one is', addedToday.line, 'First one is tomorrow at 8am.');

// ------------------------------------------------------------ the schedule in words

check('two times every day', describeCheckSchedule(twiceDaily), '8am and 8pm, every day.');
check('weekdays', describeCheckSchedule(makeCheck({ days: [1, 2, 3, 4, 5] })), '8am, weekdays.');
check('every 3 days', describeCheckSchedule(every3), '8am, every 3 days.');
check('every 2 weeks names its day', describeCheckSchedule(fortnightly), '8am, every 2 weeks on Wednesday.');
check(
  'every month names its date',
  describeCheckSchedule(makeCheck({ repeat: 'every', everyN: 1, everyUnit: 'month', startsOn: '2026-09-15' })),
  '8am, every month on day 15.',
);
const spanish = { and: 'y', 'every day': 'cada día' };
check(
  'a language can be handed in',
  describeCheckSchedule(twiceDaily, (english) => spanish[english] ?? english),
  '8am y 8pm, cada día.',
);

// ------------------------------------------------------------ reminders for a thing on its own

check('a thing with its reminder off never speaks', nextCheckReminderTimes(makeCheck({ reminderOn: false }), wednesday, 2), []);
check('a thing a routine walks past never speaks on its own', nextCheckReminderTimes(twiceDaily, wednesday, 2, true), []);
check('a switched off thing never speaks', nextCheckReminderTimes(makeCheck({ active: false }), wednesday, 2), []);
check(
  'twice a day, still open this morning: this morning, tonight, and both tomorrow',
  nextCheckReminderTimes(twiceDaily, wednesday, 1).length,
  4,
);
check(
  'once the morning is checked off it is left out',
  nextCheckReminderTimes(makeCheck({ times: ['08:00', '20:00'], lastDueAt: '2026-09-16T08:00' }), wednesday, 1).length,
  3,
);

// ------------------------------------------------------------ the card's line

const waitingAndDone = [
  makeCheck({ id: 'a', lastMarkedAt: markedThisMorning, lastDueAt: '2026-09-16T08:00' }),
  makeCheck({ id: 'b' }),
  makeCheck({ id: 'c', createdAt: new Date(2026, 8, 16, 9, 0).toISOString() }),
  makeCheck({ id: 'd', active: false }),
];
check('a switched off thing counts for nothing', summarizeChecks(waitingAndDone, wednesday), {
  total: 3,
  waiting: 1,
  done: 1,
  notYet: 1,
});
check('one waiting is said in the singular', describeChecksSummary(summarizeChecks(waitingAndDone, wednesday)), '1 thing not recorded yet.');
check(
  'nothing waiting says nothing at all',
  describeChecksSummary(summarizeChecks([waitingAndDone[0]], wednesday)),
  null,
);
check('an empty list says nothing at all', describeChecksSummary(summarizeChecks([], wednesday)), null);

// ------------------------------------------------------------ which routine the clock puts first

check('early is the morning', suggestedOccasion(new Date(2026, 8, 16, 6, 0)), 'morning');
check('late is bedtime', suggestedOccasion(new Date(2026, 8, 16, 22, 0)), 'bedtime');
check('after midnight is still bedtime', suggestedOccasion(new Date(2026, 8, 16, 1, 0)), 'bedtime');
// The middle of the afternoon belongs to nothing, and guessing would be
// wrong more often than not.
check('the afternoon is nobody s', suggestedOccasion(new Date(2026, 8, 16, 15, 0)), null);

const routines = [
  makeRoutine({ id: 'bed', name: 'Bedtime', occasion: 'bedtime', position: 0 }),
  makeRoutine({ id: 'out', name: 'Leaving', occasion: 'leaving', position: 1 }),
  makeRoutine({ id: 'morn', name: 'Morning', occasion: 'morning', position: 2 }),
  makeRoutine({ id: 'off', name: 'Retired', occasion: 'morning', position: 3, active: false }),
];
check(
  'the morning one leads at breakfast',
  orderRoutinesForNow(routines, new Date(2026, 8, 16, 7, 0)).map((r) => r.id),
  ['morn', 'bed', 'out'],
);
check(
  'the bedtime one leads at night',
  orderRoutinesForNow(routines, new Date(2026, 8, 16, 22, 0)).map((r) => r.id),
  ['bed', 'out', 'morn'],
);
check(
  'the afternoon leaves the order alone',
  orderRoutinesForNow(routines, new Date(2026, 8, 16, 15, 0)).map((r) => r.id),
  ['bed', 'out', 'morn'],
);
check(
  'a switched off routine is not offered',
  orderRoutinesForNow(routines, wednesday).every((r) => r.id !== 'off'),
  true,
);

// ------------------------------------------------------------ the line under a routine name

check(
  'a routine with no steps says what is missing',
  describeRoutineStanding(makeRoutine({}), wednesday),
  'No steps yet. Add the first one to make this walkable.',
);
check(
  'one step is said in the singular',
  describeRoutineStanding(makeRoutine({ steps: [makeStep('s1', 0)] }), wednesday),
  '1 step. Not walked yet.',
);
check(
  'finished today says so',
  describeRoutineStanding(
    makeRoutine({ steps: [makeStep('s1', 0), makeStep('s2', 1)], lastCompletedAt: markedThisMorning }),
    wednesday,
  ),
  '2 steps. Finished today at 7:12am.',
);
check(
  'finished before today is last finished',
  describeRoutineStanding(
    makeRoutine({ steps: [makeStep('s1', 0), makeStep('s2', 1)], lastCompletedAt: markedLastWeek }),
    wednesday,
  ),
  '2 steps. Last finished over a week ago.',
);
check('done today is today only', routineDoneToday(makeRoutine({ lastCompletedAt: markedLastWeek }), wednesday), false);
check(
  'done today is true for this morning',
  routineDoneToday(makeRoutine({ lastCompletedAt: markedThisMorning }), wednesday),
  true,
);

check('progress counts from one', routineProgressLabel(0, 7), 'Step 1 of 7');
check('progress never runs past the end', routineProgressLabel(9, 7), 'Step 7 of 7');
check('no steps means no progress line', routineProgressLabel(0, 0), '');

// ------------------------------------------------------------ typing, and reordering

check('runs of spaces collapse', cleanRoutineText('  take   the  pill  '), 'take the pill');
check('a line of spaces is not usable', isRoutineTextUsable('    '), false);
check('a word is usable', isRoutineTextUsable(' pill '), true);

const steps = [makeStep('a', 0), makeStep('b', 1), makeStep('c', 2)];
check(
  'a step dragged to the top lands there',
  moveRoutineStep(steps, 2, 0).map((s) => s.id),
  ['c', 'a', 'b'],
);
check(
  'positions are renumbered without gaps',
  moveRoutineStep(steps, 2, 0).map((s) => s.position),
  [0, 1, 2],
);
check('a move loses nothing', moveRoutineStep(steps, 0, 2).length, 3);
check(
  'a move off the end does nothing',
  moveRoutineStep(steps, 0, 3).map((s) => s.id),
  ['a', 'b', 'c'],
);

// ------------------------------------------------------------ a when it happens of their own

check('midnight is said as twelve', formatHour(0), '12am');
check('noon is said as twelve too', formatHour(12), '12pm');
check('the morning hour reads plainly', formatHour(7), '7am');
check('the afternoon hour comes back round', formatHour(17), '5pm');

check('a range reads as a range', describeOccasionHours(9, 17), 'Around 9am to 5pm.');
check('no hours is no line', describeOccasionHours(null, null), null);
check('half a range is no line', describeOccasionHours(9, null), null);
// A range that starts and ends on the same hour is no range at all, and
// saying "around 9am to 9am" would be worse than saying nothing.
check('an empty range is no line', describeOccasionHours(9, 9), null);

const work = { id: 'occ_work', name: 'Work', hourFrom: 9, hourTo: 17, position: 0 };
const workshop = { id: 'occ_shed', name: 'The workshop', hourFrom: null, hourTo: null, position: 1 };
const mine = [work, workshop];

check('theirs lead the list', occasionChoices(mine).map((o) => o.key).slice(0, 2), ['occ_work', 'occ_shed']);
check('the built in four are still there', occasionChoices(mine).length, 6);
check('the built in four stand alone', occasionChoices().length, 4);
check('one they made is theirs to change', findOccasion('occ_work', mine).mine, true);
check('one that shipped is not', findOccasion('morning', mine).mine, false);
check('a name they typed is the label', routineOccasionLabel('occ_work', mine), 'Work');
// The one that matters if an occasion is ever removed: the routine keeps
// working and is listed under something a person can read.
check('an occasion that is gone falls back', routineOccasionLabel('occ_gone', mine), 'Something else');
check('and is not known any more', isKnownOccasion('occ_gone', mine), false);
check('one with no hours says nothing extra', findOccasion('occ_shed', mine).example, null);

// Work runs 9 to 5 and Morning runs 4 to 11, so ten in the morning is
// covered by both. Theirs wins, because they typed it.
check('their own beats a built in', suggestedOccasion(new Date(2026, 8, 16, 10, 0), mine), 'occ_work');
check('outside their hours the built in returns', suggestedOccasion(new Date(2026, 8, 16, 6, 0), mine), 'morning');
check('one with no hours never leads', suggestedOccasion(new Date(2026, 8, 16, 15, 0), [workshop]), null);

const withWork = [
  makeRoutine({ id: 'morn', name: 'Morning', occasion: 'morning', position: 0 }),
  makeRoutine({ id: 'desk', name: 'Starting work', occasion: 'occ_work', position: 1 }),
];
check(
  'the work one leads inside work hours',
  orderRoutinesForNow(withWork, new Date(2026, 8, 16, 10, 0), mine).map((r) => r.id),
  ['desk', 'morn'],
);
check(
  'and the morning one leads before them',
  orderRoutinesForNow(withWork, new Date(2026, 8, 16, 6, 0), mine).map((r) => r.id),
  ['morn', 'desk'],
);

// ------------------------------------------------------------ the record reads under its routine

function makeCheckStep(id, position, checkId) {
  return { id, routineId: 'r1', text: id, detail: null, position, checkId };
}

// Written out of order on purpose: the steps come back from the database
// sorted, but nothing here should depend on that.
const morningWalk = makeRoutine({
  id: 'morn',
  name: 'Morning',
  position: 0,
  steps: [
    makeCheckStep('s2', 1, 'pill'),
    makeCheckStep('s1', 0, 'door'),
    makeCheckStep('s3', 2, 'pill'),
    makeStep('s4', 3),
  ],
});

check('the checks a routine ticks off come in step order', checkIdsInRoutine(morningWalk), ['door', 'pill']);
check('a check two steps point at is named once', checkIdsInRoutine(morningWalk).length, 2);
check('a routine with no checks ticks nothing off', checkIdsInRoutine(makeRoutine({ steps: [makeStep('s1', 0)] })), []);

check('the routine that ticks it off is found', routineForCheck('pill', [morningWalk]).id, 'morn');
check('one nothing walks past has no routine', routineForCheck('bins', [morningWalk]), null);
check('the line says where it gets ticked off', describeCheckRoutine('pill', [morningWalk]), 'Ticked off while walking Morning.');
check('and says nothing when nothing walks past it', describeCheckRoutine('bins', [morningWalk]), null);

const grouped = groupChecksByRoutine(
  [makeCheck({ id: 'pill' }), makeCheck({ id: 'bins' }), makeCheck({ id: 'door' })],
  [morningWalk],
);
check('a routine heading and the loose one', grouped.map((g) => g.heading), ['Morning', LOOSE_CHECKS_HEADING]);
check('both of the routine checks sit under it', grouped[0].checks.map((c) => c.id), ['pill', 'door']);
// The ones nothing walks past go last, so the list ends with the odds and
// ends rather than opening with them.
check('the loose ones come last', grouped[grouped.length - 1].routine, null);
check('and carry the one nothing walks past', grouped[1].checks.map((c) => c.id), ['bins']);
check(
  'with no routines at all everything is loose',
  groupChecksByRoutine([makeCheck({ id: 'bins' })], []).map((g) => g.heading),
  [LOOSE_CHECKS_HEADING],
);
check('and an empty list groups into nothing', groupChecksByRoutine([], [morningWalk]).length, 0);


// ------------------------------------------------------------ the reminder that starts it
//
// A routine is the one thing in Life that carries its own pattern rather than
// sitting on a schedule somewhere, so the pattern is worked out here: a local
// wall-clock time, the days of the week it speaks on, and a switch. Everything
// below is asked from the same Wednesday morning as the rest of this file.

check('a plain time is padded', cleanReminderTime('7:05'), '07:05');
check('an already padded one is left alone', cleanReminderTime('07:05'), '07:05');
check('surrounding space does not matter', cleanReminderTime(' 7:00 '), '07:00');
check('an hour of 24 is not a time anybody picked', cleanReminderTime('24:00'), null);
check('and neither is a minute of 60', cleanReminderTime('7:60'), null);
check('a time with no colon is not a time', cleanReminderTime('700'), null);
check('nothing is not a time', cleanReminderTime(null), null);

check('days come back sorted and deduped', parseReminderDays('5,1,3,3'), [1, 3, 5]);
check('anything out of range is dropped', parseReminderDays('1,9,-2,6'), [1, 6]);
check('an empty list is no days at all', parseReminderDays(''), []);
check('and so is nothing', parseReminderDays(null), []);

check('every day stores nothing', serializeReminderDays([0, 1, 2, 3, 4, 5, 6]), null);
check('and so does no day', serializeReminderDays([]), null);
check('anything else stores itself, in order', serializeReminderDays([5, 1, 3]), '1,3,5');

check('turning one off inside every day leaves the other six', toggleReminderDay([], 3), [0, 1, 2, 4, 5, 6]);
check('turning one on adds it', toggleReminderDay([1, 2], 3), [1, 2, 3]);
check('turning the last one off means every day again', toggleReminderDay([3], 3), []);

check('a whole hour says only the hour', formatReminderClock('07:00'), '7am');
check('and minutes show when there are any', formatReminderClock('07:15'), '7:15am');
check('noon is 12pm', formatReminderClock('12:00'), '12pm');
check('and half past midnight is 12:30am', formatReminderClock('00:30'), '12:30am');
check('the afternoon wraps', formatReminderClock('13:05'), '1:05pm');

check('no days is every day', describeReminderDays([]), 'every day');
check('and so is all seven', describeReminderDays([0, 1, 2, 3, 4, 5, 6]), 'every day');
check('Monday to Friday has a name', describeReminderDays([1, 2, 3, 4, 5]), 'weekdays');
check('so does the other two', describeReminderDays([0, 6]), 'weekends');
check('anything else says itself', describeReminderDays([5, 1, 3]), 'Mon, Wed, Fri');

check(
  'a switch with a time behind it is a reminder',
  hasRoutineReminder(makeRoutine({ reminderTime: '07:00', reminderOn: true })),
  true,
);
check(
  'a switch with no time is not',
  hasRoutineReminder(makeRoutine({ reminderTime: null, reminderOn: true })),
  false,
);
check(
  'and a time with the switch off is not either',
  hasRoutineReminder(makeRoutine({ reminderTime: '07:00', reminderOn: false })),
  false,
);

check(
  'Wednesday is one of the days it speaks on',
  reminderFiresOnDay(makeRoutine({ reminderTime: '07:00', reminderOn: true, reminderDays: [3] }), wednesday),
  true,
);
check(
  'and Monday only is not',
  reminderFiresOnDay(makeRoutine({ reminderTime: '07:00', reminderOn: true, reminderDays: [1] }), wednesday),
  false,
);
check(
  'no days named means it speaks today too',
  reminderFiresOnDay(makeRoutine({ reminderTime: '07:00', reminderOn: true }), wednesday),
  true,
);

check('a routine with no time says nothing at all', describeRoutineReminder(makeRoutine({})), null);
check(
  'one that speaks says when',
  describeRoutineReminder(makeRoutine({ reminderTime: '07:00', reminderOn: true })),
  'Nudges at 7am, every day.',
);
check(
  'and one switched off still shows the time it is keeping',
  describeRoutineReminder(
    makeRoutine({ reminderTime: '07:00', reminderOn: false, reminderDays: [1, 2, 3, 4, 5] }),
  ),
  'A nudge at 7am, weekdays, switched off.',
);

check('nothing to say, nothing to schedule', nextReminderTimes(makeRoutine({}), wednesday, 7).length, 0);

// 7am on a Wednesday morning at half past nine has already gone, so the next
// two days are what is left inside a two-day window.
{
  const morning = makeRoutine({ reminderTime: '07:00', reminderOn: true });
  const times = nextReminderTimes(morning, wednesday, 2);
  check('this morning has gone, so the next two days are what is left', times.length, 2);
  check('the first is tomorrow at seven', times[0].getTime(), new Date(2026, 8, 17, 7, 0, 0, 0).getTime());
  check('and the last is the day after', times[1].getTime(), new Date(2026, 8, 18, 7, 0, 0, 0).getTime());
}

{
  const evening = makeRoutine({ reminderTime: '18:00', reminderOn: true });
  check('tonight is still ahead', nextReminderTimes(evening, wednesday, 0).length, 1);
  const walked = makeRoutine({
    reminderTime: '18:00',
    reminderOn: true,
    lastCompletedAt: '2026-09-16T06:10:00',
  });
  check('and a routine already walked today stays quiet', nextReminderTimes(walked, wednesday, 0).length, 0);
  check('though the rest of the week is untouched by that', nextReminderTimes(walked, wednesday, 2).length, 2);
}

{
  const fridays = makeRoutine({ reminderTime: '09:00', reminderOn: true, reminderDays: [5] });
  const times = nextReminderTimes(fridays, wednesday, 9);
  check('a Friday routine speaks twice inside nine days', times.length, 2);
  check('starting this Friday', times[0].getTime(), new Date(2026, 8, 18, 9, 0, 0, 0).getTime());
  check('and again the Friday after', times[1].getTime(), new Date(2026, 8, 25, 9, 0, 0, 0).getTime());
}
// ------------------------------------------------------------ nothing goes unnamed

check('every occasion is listed', ALL_ROUTINE_OCCASIONS.length, 4);
for (const repeat of ['days', 'every']) {
  check(`${repeat} has a standing line`, checkStanding(makeCheck({ repeat }), wednesday).line.length > 0, true);
}

if (failures > 0) {
  console.error(`\n${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`All ${checks} checks passed`);
