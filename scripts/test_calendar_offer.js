// Checks lib/calendarOffer.ts, events on the phone's calendar offered to
// Appointments as a notification (1.0.79.13).
//
// What it holds to: only events ahead, inside two weeks, not linked to an
// appointment and never offered come up; three a day at most, nearest
// first, and none at night; a repeating event's shared id is asked about
// once; Stop Asking ends the offers; Add to Appointments is kept until the
// app is open and kept once; with reminders saying only their kind, the
// event's name stays off the notification; an event's name gives its
// appointment kind; and no sentence uses a dash for punctuation.
//
// Exits non-zero on any failure.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(relPath, allowed = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
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

const t = (text, values = {}) => text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
const offer = load('lib/calendarOffer.ts', {
  'expo-file-system': { File: class {}, Paths: {} },
  './i18n': { t },
});

let failures = 0;
function check(label, ok) {
  if (ok) return;
  failures += 1;
  console.error(`FAIL: ${label}`);
}

const now = new Date(2026, 10, 2, 10, 0);
const at = (day, hour, minute = 0) => new Date(2026, 10, day, hour, minute).toISOString();
const event = (id, startDate, minutes = 60, title = 'Dentist') => ({
  id,
  title,
  startDate,
  endDate: new Date(Date.parse(startDate) + minutes * 60000).toISOString(),
  location: null,
  notes: null,
});
const empty = offer.EMPTY_CALENDAR_OFFER_STATE;
const ids = (list) => list.map((item) => item.id).join();

const events = [
  event('later', at(6, 9)),
  event('soon', at(2, 15)),
  event('past', at(2, 8)),
  event('far', at(20, 9)),
  event('linked', at(3, 9)),
  event('next', at(4, 9)),
  event('fourth', at(5, 9)),
  event('soon', at(9, 15)),
];
const chosen = offer.eventsToOffer(events, new Set(['linked']), empty, now);
check('nearest three ahead, unlinked, inside two weeks', ids(chosen) === 'soon,next,fourth');
check('a repeating event is offered once', chosen.filter((item) => item.id === 'soon').length === 1);
check('nothing at night', offer.eventsToOffer(events, new Set(), empty, new Date(2026, 10, 2, 22, 0)).length === 0);
check('nothing before nine', offer.eventsToOffer(events, new Set(), empty, new Date(2026, 10, 2, 8, 30)).length === 0);

const marked = offer.markOffered(empty, chosen, now);
check(
  'offered events are not offered again',
  ids(offer.eventsToOffer(events, new Set(['linked']), marked, new Date(2026, 10, 3, 11, 0))) === 'later',
);
check('the day has no more room', offer.eventsToOffer(events, new Set(), marked, new Date(2026, 10, 2, 12, 0)).length === 0);
const muchLater = offer.markOffered(marked, [], new Date(2026, 11, 30, 10, 0));
check('long-past offers are forgotten', Object.keys(muchLater.offered).length === 0);

const stopped = offer.answerCalendarOffer(empty, 'calendarStop', 'soon', 1);
check('Stop Asking waits to turn the switch off', stopped.stopWaiting === true);
check('Stop Asking ends the offers', offer.eventsToOffer(events, new Set(), stopped, now).length === 0);
const added = offer.answerCalendarOffer(empty, 'calendarAdd', 'soon', 5);
check('Add to Appointments is kept', added.toAdd.length === 1 && added.toAdd[0].startsAt === 5);
check('a second press is kept once', offer.answerCalendarOffer(added, 'calendarAdd', 'soon', 5).toAdd.length === 1);
check('Not This One keeps nothing', offer.answerCalendarOffer(empty, 'calendarNotThis', 'soon', 5) === empty);

const round = offer.parseCalendarOfferState(JSON.stringify(offer.answerCalendarOffer(marked, 'calendarAdd', 'next', 7)));
check('the file reads back', round && round.toAdd[0].eventId === 'next' && Object.keys(round.offered).length === 3);
check('a broken file reads as nothing', offer.parseCalendarOfferState('{oops') === null);

check('one identifier per event', offer.calendarOfferIdentifier('a') !== offer.calendarOfferIdentifier('b'));
check('the identifier is stable', offer.calendarOfferIdentifier('abc') === offer.calendarOfferIdentifier('abc'));
check('the identifier carries the prefix', offer.calendarOfferIdentifier('abc').startsWith(offer.CALENDAR_OFFER_PREFIX));

check('today', offer.describeWhen(at(2, 15), now) === 'today at 3:00 pm');
check('tomorrow', offer.describeWhen(at(3, 9, 30), now) === 'tomorrow at 9:30 am');
check('later in the week', offer.describeWhen(at(6, 12), now) === 'Friday, November 6 at 12:00 pm');

const full = offer.calendarOfferText(event('x', at(3, 9), 60, 'Dr. Ruiz'), now, false);
const kind = offer.calendarOfferText(event('x', at(3, 9), 60, 'Dr. Ruiz'), now, true);
check('the full text names the event', full.title.includes('Dr. Ruiz') && full.body.includes('tomorrow at 9:00 am'));
check('kind only keeps the name off', !kind.title.includes('Ruiz') && !kind.body.includes('Ruiz'));

const kinds = {
  'Blood work': 'lab_draw',
  'Lab draw at Quest': 'lab_draw',
  'Dietitian follow-up': 'nutritionist',
  'Personal training': 'trainer',
  'Dr. Ruiz': 'doctor',
  Endocrinologist: 'doctor',
  'Dentist cleaning': 'doctor',
  'Dinner with Lisa': 'other',
  'Laborday picnic': 'other',
};
for (const [title, expected] of Object.entries(kinds)) {
  check(`${title} is ${expected}`, offer.appointmentTypeFromTitle(title) === expected);
}
check('an hour long', offer.eventMinutes(event('x', at(3, 9), 60)) === 60);
check('a length past a day is not kept', offer.eventMinutes(event('x', at(3, 9), 3000)) === null);
check('local time as stored', offer.localDateTimeOf(at(3, 9, 5)) === '2026-11-03T09:05');

for (const sentence of [full.title, full.body, kind.title, kind.body]) {
  check(`no dash for punctuation: ${sentence}`, !/[–—]| -- /.test(sentence));
}

if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log('calendar offer: all checks passed');
