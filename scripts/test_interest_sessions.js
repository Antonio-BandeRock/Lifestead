// Checks lib/interestSessions.ts (Interests > Sessions): reading a length
// and a day as typed, the timer, the lines a session is shown with, the
// month groups and total, the practice reminder's days, time, wording and
// moments, and that nothing said about time spent ranks, scores, praises or
// pushes. "Today" is fixed at Friday 30 October 2026.
// Run: node scripts/test_interest_sessions.js
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
    throw new Error(`lib/interestSessions.ts must stay pure, asked for ${name}`);
  });
  cache[file] = m.exports;
  return m.exports;
}
const S = load('interestSessions');
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

// --- a length, as typed ---------------------------------------------------------
const lengths = [
  ['', { ok: true, minutes: null }],
  ['45', { ok: true, minutes: 45 }],
  ['45 min', { ok: true, minutes: 45 }],
  ['1:20', { ok: true, minutes: 80 }],
  ['an hour', { ok: true, minutes: 60 }],
  ['half an hour', { ok: true, minutes: 30 }],
  ['an hour and a half', { ok: true, minutes: 90 }],
  ['1h 20m', { ok: true, minutes: 80 }],
  ['1.5 hours', { ok: true, minutes: 90 }],
  ['0', { ok: false, minutes: null }],
  ['25 hours', { ok: false, minutes: null }],
  ['a while', { ok: false, minutes: null }],
];
for (const [words, expected] of lengths) {
  const got = S.readDuration(words);
  check(`length "${words}"`, same(got, expected), got);
}
check('minutes alone', S.formatMinutes(45) === '45 minutes', S.formatMinutes(45));
check('one minute', S.formatMinutes(1) === '1 minute', S.formatMinutes(1));
check('hours and minutes', S.formatMinutes(80) === '1 hour 20 minutes', S.formatMinutes(80));
check('whole hours', S.formatMinutes(120) === '2 hours', S.formatMinutes(120));

// --- the timer ------------------------------------------------------------------
const started = new Date(2026, 9, 30, 15, 5).toISOString();
check('a timer counts whole minutes', S.timerMinutes(started, new Date(2026, 9, 30, 15, 30)) === 25);
check('a timer just started is at least a minute', S.timerMinutes(started, new Date(2026, 9, 30, 15, 5, 10)) === 1);
check('a timer left for days stops at a day', S.timerMinutes(started, new Date(2026, 10, 3, 15, 5)) === 1440);
const timerLine = S.describeTimer(started, new Date(2026, 9, 30, 15, 30));
check('the timer line says when it started and how long', timerLine === 'Started 3:05 pm, 25 minutes so far.', timerLine);

// --- a day, as typed --------------------------------------------------------------
const days = [
  ['', '2026-10-30'],
  ['today', '2026-10-30'],
  ['yesterday', '2026-10-29'],
  ['3 days ago', '2026-10-27'],
  ['friday', '2026-10-30'],
  ['monday', '2026-10-26'],
  ['28 October', '2026-10-28'],
  ['October 28', '2026-10-28'],
  ['5 November', '2025-11-05'],
];
for (const [words, day] of days) {
  const got = S.readSessionDay(words, TODAY);
  check(`day "${words}"`, got.ok && got.day === day, got);
}
check('a day still to come is refused', !S.readSessionDay('2026-11-02', TODAY).ok);
check('nonsense is refused', !S.readSessionDay('soon', TODAY).ok);
check('today reads as Today', S.describeSessionDay(TODAY, TODAY) === 'Today');
check('yesterday reads as Yesterday', S.describeSessionDay('2026-10-29', TODAY) === 'Yesterday');

const line = S.describeSessionLine({ doneOn: '2026-10-29', minutes: 45 }, TODAY, 'Learn the F chord');
check('a session line joins day, length and project', line === 'Yesterday · 45 minutes · Learn the F chord', line);
const untimed = S.describeSessionLine({ doneOn: TODAY, minutes: null }, TODAY);
check('an untimed session says so', untimed === 'Today · not timed', untimed);

// --- months and the total ---------------------------------------------------------
const sessions = [
  { id: 'a', doneOn: '2026-10-29', minutes: 45, running: false, createdAt: '2026-10-29T10:00:00Z' },
  { id: 'b', doneOn: '2026-09-02', minutes: null, running: false, createdAt: '2026-09-02T10:00:00Z' },
  { id: 'c', doneOn: '2026-10-30', minutes: null, running: true, createdAt: '2026-10-30T10:00:00Z' },
  { id: 'd', doneOn: '2026-10-05', minutes: 145, running: false, createdAt: '2026-10-05T10:00:00Z' },
];
const months = S.groupSessionsByMonth(sessions);
check('months newest first', same(months.map((m) => m.label), ['October 2026', 'September 2026']), months.map((m) => m.label));
check('a running timer is not in the list', !months.some((m) => m.sessions.some((s) => s.running)));
check('newest first inside a month', same(months[0].sessions.map((s) => s.id), ['a', 'd']));
const total = S.describeSessionTotal(sessions);
check('the total counts finished sessions and timed minutes', total === '3 sessions, 3 hours 10 minutes timed', total);

// --- the practice reminder --------------------------------------------------------
check('days read back', same(S.readPracticeDays('1,3,5'), [1, 3, 5]));
check('nothing stored is no days', same(S.readPracticeDays(null), []));
check('no days stores nothing', S.writePracticeDays([]) === null);
check('days round-trip', same(S.readPracticeDays(S.writePracticeDays([5, 1, 3])), [1, 3, 5]));
check('7:30 pm', S.readPracticeTime('7:30 pm') === '19:30');
check('7pm', S.readPracticeTime('7pm') === '19:00');
check('19:30', S.readPracticeTime('19:30') === '19:30');
check('12 am is midnight', S.readPracticeTime('12am') === '00:00');
check('25:00 is refused', S.readPracticeTime('25:00') === null);
check('a time reads back', S.formatPracticeTime('19:30') === '7:30 pm', S.formatPracticeTime('19:30'));
check('pills run Monday to Sunday', same(S.PRACTICE_DAY_PILLS.map((p) => p.day), [1, 2, 3, 4, 5, 6, 0]));
const every = S.describePractice([0, 1, 2, 3, 4, 5, 6], '19:30');
check('every day', every === 'Every day at 7:30 pm', every);
const some = S.describePractice([1, 3, 5], '19:30');
check('named days', some === 'Monday, Wednesday and Friday at 7:30 pm', some);
check('no days is no practice time', S.describePractice([], '19:30') === null);
check('Friday falls on Friday', S.practiceFallsOn([5], TODAY));
const text = S.practiceReminderText('Guitar', 'bar 12 of the Bach');
check('the title names the interest', text.title === 'Time for Guitar');
check('the body is where it was left off', text.body === 'Where you left off: bar 12 of the Bach');
check('with nothing left off, an offer', S.practiceReminderText('Guitar', null).body === 'Your practice time, if today suits.');
const kept = [{ interestId: 'g', doneOn: TODAY, running: false }, { interestId: 'b', doneOn: TODAY, running: true }];
check('a session kept today is found', S.hasSessionOn(kept, 'g', TODAY));
check('a running timer is not a session kept', !S.hasSessionOn(kept, 'b', TODAY));

const now = new Date(2026, 9, 30, 18, 0); // Friday, 6 pm
const times = S.practiceFireTimes([1, 5], '19:30', now, 7);
check('today still ahead, then Monday, then next Friday',
  same(times.map((d) => `${d.getDate()} ${d.getHours()}:${d.getMinutes()}`), ['30 19:30', '2 19:30', '6 19:30']),
  times.map((d) => d.toString()));
const later = S.practiceFireTimes([5], '07:00', now, 7);
check('today gone by is left out', same(later.map((d) => d.getDate()), [6]), later.map((d) => d.getDate()));
check('no time is no moments', S.practiceFireTimes([1], null, now, 7).length === 0);
check('no days is no moments', S.practiceFireTimes([], '19:00', now, 7).length === 0);

// --- nothing ranks, scores, praises or pushes ---------------------------------------
const FORBIDDEN = [
  'streak', 'level', 'points', 'score', 'percent', 'well done', 'great job', 'good job', 'keep it up',
  'you missed', 'behind', 'should', 'goal', 'earn', 'genuine', 'honestly', '—', '–',
];
const sources = ['lib/interestSessions.ts', 'components/InterestSessionsSection.tsx'];
for (const rel of sources) {
  const source = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')
    .split('\n')
    .filter((row) => !row.trim().startsWith('//') && !row.trim().startsWith('*') && !row.trim().startsWith('/*'))
    .join('\n');
  const re = /'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`|>([^<>{}\n]*[A-Za-z][^<>{}\n]*)</g;
  let match;
  while ((match = re.exec(source))) {
    const value = match[1] ?? match[2] ?? match[3];
    if (!value || !/[A-Za-z]{3,} [A-Za-z]/.test(value)) continue;
    const lower = value.toLowerCase();
    for (const word of FORBIDDEN) {
      if (lower.includes(word)) check(`"${word}" stays out of ${rel}: "${value.slice(0, 60)}"`, false);
    }
  }
}

console.log(`${pass + fail} checks, ${fail} failures`);
process.exit(fail ? 1 : 0);
