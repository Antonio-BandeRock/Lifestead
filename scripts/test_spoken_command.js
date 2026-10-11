// Checks lib/spokenCommand.ts (step 3 of the voice order, 1.0.66.21): what a
// spoken note asks for. A reminder is set outright only with a clock time; a
// day or a loose time asks; a note with a day only ever offers. Pure, so it
// runs here rather than on a phone. Exits non-zero on any failure.

// eslint-config-expo lints this repo as app code, which has no __dirname.
/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(relPath, stubs = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    if (name in stubs) return stubs[name];
    throw new Error(`${relPath} must stay free of runtime imports (${name})`);
  });
  return module.exports;
}

const plainDate = load('lib/plainDate.ts');
const s = load('lib/spokenCommand.ts', { './plainDate': plainDate, './repeatRule': {} });

let failures = 0;
let total = 0;
function check(name, actual, expected) {
  total += 1;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures += 1;
    console.log(`FAIL  ${name}\n      expected ${e}\n      got      ${a}`);
  }
}

// Tuesday 2026-09-22, 10:00 local.
const tue = new Date(2026, 8, 22, 10, 0, 0);
const read = (text, now = tue) => s.readSpokenCommand(text, now);
const brief = (text, now = tue) => {
  const c = read(text, now);
  if (c.kind === 'reminder') return [c.kind, c.title, c.when.scheduledFor, c.repeat.type, c.repeat.weekdays ?? null];
  if (c.kind === 'reminderAsk') return [c.kind, c.title, c.offers.map((o) => o.scheduledFor)];
  if (c.kind === 'timer') return [c.kind, c.title, c.minutes];
  if (c.kind === 'days') return [c.kind, c.title, c.days];
  return [c.kind, c.offers.map((o) => o.scheduledFor)];
};

// --- Reminders with a clock time ---------------------------------------------
check('tomorrow at 10', brief('Remind me to call the pharmacy tomorrow at 10'),
  ['reminder', 'Call the pharmacy', '2026-09-23T10:00', 'none', null]);
check('Friday at 3 pm', brief('remind me Friday at 3 pm to pick up the prescription'),
  ['reminder', 'Pick up the prescription', '2026-09-25T15:00', 'none', null]);
check('in 20 minutes', brief('remind me in 20 minutes to take the bread out'),
  ['reminder', 'Take the bread out', '2026-09-22T10:20', 'none', null]);
check('the 15th at noon', brief('remind me about the water bill on the 15th at noon'),
  ['reminder', 'The water bill', '2026-10-15T12:00', 'none', null]);
check('lead-in words dropped', brief('Okay, remind me to water the tomatoes at 6:30 pm'),
  ['reminder', 'Water the tomatoes', '2026-09-22T18:30', 'none', null]);
check('set a reminder', brief('set a reminder to stretch at 4'),
  ['reminder', 'Stretch', '2026-09-22T16:00', 'none', null]);
check('in two weeks at 9 am', brief('remind me to book the blood test in two weeks at 9 am'),
  ['reminder', 'Book the blood test', '2026-10-06T09:00', 'none', null]);

// --- Repeats -----------------------------------------------------------------
check('every Monday at 8', brief('remind me to put the bins out every Monday at 8 pm'),
  ['reminder', 'Put the bins out', '2026-09-28T20:00', 'weekly', [1]]);
check('every day at 9 pm', brief('remind me to take my magnesium every day at 9 pm'),
  ['reminder', 'Take my magnesium', '2026-09-22T21:00', 'daily', null]);
check('every weekday', brief('remind me every weekday at 7:30 am to check the calendar'),
  ['reminder', 'Check the calendar', '2026-09-23T07:30', 'weekly', [1, 2, 3, 4, 5]]);
check('every Tuesday today still ahead', brief('remind me every tuesday at 11 am to call Ana'),
  ['reminder', 'Call Ana', '2026-09-22T11:00', 'weekly', [2]]);
check('two weekdays', brief('remind me every monday and thursday at 6 pm to water'),
  ['reminder', 'Water', '2026-09-24T18:00', 'weekly', [1, 4]]);

// --- No guessing ------------------------------------------------------------
check('this evening asks', brief('remind me this evening to call mum'),
  ['reminderAsk', 'Call mum', ['2026-09-22T19:00']]);
check('a day with no time asks', brief('remind me tomorrow to order seeds'),
  ['reminderAsk', 'Order seeds', ['2026-09-23T09:00']]);
check('soon asks with nothing to offer', brief('remind me soon to stretch'),
  ['reminderAsk', 'Stretch', []]);
check('nothing at all asks', brief('remind me to buy oats'),
  ['reminderAsk', 'Buy oats', []]);
check('every Monday with no time asks', brief('remind me every monday to weigh in'),
  ['reminderAsk', 'Weigh in', ['2026-09-28T09:00']]);
check('a time already gone today asks', read('remind me today at 8 am to walk').kind, 'reminderAsk');

// --- Timers and day counters -----------------------------------------------
check('count down 2 hours 30 minutes', brief('count down 2 hours 30 minutes for the bread'),
  ['timer', 'The bread', 150]);
check('set a timer for 10 minutes', brief('set a timer for 10 minutes'), ['timer', null, 10]);
check('an hour and a half', brief('start a timer for an hour and a half to rest the dough'),
  ['timer', 'Rest the dough', 90]);
check('half an hour', brief('timer for half an hour'), ['timer', null, 30]);
check('90 min', brief('set a countdown for 90 min'), ['timer', null, 90]);
check('whole days become a day counter', brief('count down 3 days to the market'), ['days', 'The market', 3]);
check('days and hours stay a timer', brief('count down 1 day and 4 hours'), ['timer', null, 1680]);

// --- Notes ---------------------------------------------------------------------
check('a note with a day offers it', brief('the passport comes on the 15th'), ['note', ['2026-10-15T09:00']]);
check('a note with no day offers nothing', brief('the basil looks happier'), ['note', []]);
check('an empty note', brief('   '), ['note', []]);

// --- Words ----------------------------------------------------------------------
check('describeDuration', [s.describeDuration(150), s.describeDuration(60), s.describeDuration(1680)],
  ['2 hours 30 minutes', '1 hour', '1 day 4 hours']);
check('timer end today', s.describeTimerEnd(s.timerEndsAt(tue, 150), tue), '12:30 PM');

console.log(`${total - failures}/${total} passed`);
if (failures) process.exit(1);
