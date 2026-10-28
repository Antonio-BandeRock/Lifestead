// Routines you walk one step at a time, and the record of what you have
// already done.
//
// 2026-09-17, direct instruction: "Build the step-by-step routines and the
// 'did I already do it' record." Two rows of the daily-living program
// (CLAUDE.md item 28), built in one pass because they turn out to be the
// same fact seen from two sides.
//
// A ROUTINE is an order somebody does not want to hold in their head:
// morning, bedtime, leaving the house. The screen shows ONE step at a time,
// because a list of nine is a thing to be scanned, re-scanned, and lost your
// place in, and losing your place is the hard part the routine exists to
// take away. Finish a step and the next one arrives. Nothing else moves.
//
// A CHECK is a thing on the To Do List (Did I Do It until 2026-10-28):
// something done regularly, on a schedule of its own, whose every time is
// checked off on its own. Its value is that the answer can be looked at, so
// "did I take my pill" costs a glance rather than a walk back upstairs or a
// second payment. A routine only puts some of them in order.
//
// WHY THEY SHARE A FILE: a routine step can BE a check. "Take your
// levothyroxine", walked at 7am, has to answer "did I take my pill" at 11am
// without being recorded twice. So finishing that step writes the same mark
// a tap on the check would have written. Held apart, the two would have
// produced either two records of one act, or a screen telling somebody at
// 11am that they had not done the thing they did at 7.
//
// 2026-09-17, direct correction, and the thing to keep hold of: "Did I Do
// it should be related to Routines, not treated separately. While they are
// walking through a routine, they are also checking off things that they
// need to do while running the routine. Did I do it is the user selecting
// to check the item off as they are doing it." Two things follow. The mark
// is written AT THE STEP, the moment the person ticks it, not gathered up
// and written when the walk ends: somebody who takes the pill at step two
// and then answers the door has still taken the pill. And the record is
// read grouped under the routine it belongs to, not as a second list.
//
// Pure on purpose: no database, no React, no colours, so these rules can be
// checked in plain node (scripts/test_routines.js), and so the screens and
// the database module can both read them without a cycle.

// ---------------------------------------------------------------- routines

/** Which moment a routine belongs to. Grouping and wording only: every
 *  routine is walked the same way whichever this is. 'leaving' has no hour
 *  of its own on purpose, because leaving the house happens whenever it
 *  happens, which is exactly why it is the one most often half done.
 *
 *  A plain string rather than a union of four, because the set is open.
 *  2026-09-17, direct instruction: "There needs to be a way for them to add
 *  a new When it happens so they can create a routine specific to something
 *  that isn't on the list, and when they create it, it can then be something
 *  that can be selected in the list again." So this holds either one of the
 *  four built-in keys below or the id of one somebody made themselves, in
 *  the same column, because both answer the same question. Resolve one
 *  through findOccasion or routineOccasionLabel, never by comparing it to a
 *  literal. */
export type RoutineOccasion = string;

/** The four that ship. Named apart from RoutineOccasion so the code that
 *  genuinely means one of these four can still say so. */
export type BuiltInOccasion = 'morning' | 'bedtime' | 'leaving' | 'other';

export const ROUTINE_OCCASIONS: {
  key: BuiltInOccasion;
  label: string;
  example: string;
  /** Local hours this occasion covers, start inclusive, end exclusive, or
   *  null for one that does not belong to a time of day. A range that wraps
   *  midnight is written with start greater than end and read that way. */
  hours: { from: number; to: number } | null;
}[] = [
  {
    key: 'morning',
    label: 'Morning',
    example: 'Meds, breakfast, the things that only work if they happen early.',
    hours: { from: 4, to: 11 },
  },
  {
    key: 'bedtime',
    label: 'Bedtime',
    example: 'Winding down, locking up, setting out what tomorrow needs.',
    hours: { from: 20, to: 4 },
  },
  {
    key: 'leaving',
    label: 'Leaving the house',
    example: 'Keys, wallet, phone, the stove, the back door.',
    hours: null,
  },
  {
    key: 'other',
    label: 'Something else',
    example: 'Anything with an order worth keeping.',
    hours: null,
  },
];

export const ALL_ROUTINE_OCCASIONS: BuiltInOccasion[] = ROUTINE_OCCASIONS.map((entry) => entry.key);

/**
 * One "when it happens" somebody made themselves: Work, the school run,
 * the workshop. Added 2026-09-17, because "Something else" is a place to
 * put one routine and no place at all to put six.
 *
 * The hours are optional and mean what they mean for a built-in: which
 * part of the day this covers, used for nothing but putting the routine
 * that fits the clock at the top of the list. One with no hours behaves
 * exactly like Something else, which is the right default for a name that
 * is about a place or a person rather than an hour.
 */
export type CustomOccasion = {
  id: string;
  name: string;
  /** Local hours covered, start inclusive, end exclusive, or both null for
   *  one that does not belong to a time of day. A range that wraps midnight
   *  is written with from greater than to, the same as the built-ins. */
  hourFrom: number | null;
  hourTo: number | null;
  position: number;
};

/** A built-in and a person's own seen the same way: what the picker lists,
 *  what a label lookup reads, and what the clock is compared against. */
export type OccasionChoice = {
  key: RoutineOccasion;
  label: string;
  /** The line under the picker, or null for a custom one with no hours,
   *  where there is nothing to say that the name does not say already. */
  example: string | null;
  hours: { from: number; to: number } | null;
  /** Whether this is one the person made, which is the only thing that can
   *  be renamed or removed. */
  mine: boolean;
};

/** A clock hour the way somebody says it: 7am, 12pm, 12am. */
export function formatHour(hour: number): string {
  const wrapped = ((Math.trunc(hour) % 24) + 24) % 24;
  const suffix = wrapped < 12 ? 'am' : 'pm';
  const shown = wrapped % 12 === 0 ? 12 : wrapped % 12;
  return `${shown}${suffix}`;
}

/** The line a custom occasion's hours read as, or null when it has none.
 *  A range that starts and ends on the same hour is no range at all and
 *  reads as none, rather than as a day long or a moment long. */
export function describeOccasionHours(hourFrom: number | null, hourTo: number | null): string | null {
  if (hourFrom === null || hourTo === null || hourFrom === hourTo) return null;
  return `Around ${formatHour(hourFrom)} to ${formatHour(hourTo)}.`;
}

function customOccasionHours(entry: CustomOccasion): { from: number; to: number } | null {
  if (entry.hourFrom === null || entry.hourTo === null) return null;
  if (entry.hourFrom === entry.hourTo) return null;
  return { from: entry.hourFrom, to: entry.hourTo };
}

/**
 * Every occasion there is, the person's own first. Theirs lead because a
 * name somebody typed is more specific than one that shipped with the app,
 * and because the four built-ins are what a list falls back to rather than
 * what it starts from once there are others. That order also settles which
 * one wins when two cover the same hour: see suggestedOccasion.
 */
export function occasionChoices(custom: CustomOccasion[] = []): OccasionChoice[] {
  const mine: OccasionChoice[] = [...custom]
    .sort((a, b) => a.position - b.position)
    .map((entry) => ({
      key: entry.id,
      label: entry.name,
      example: describeOccasionHours(entry.hourFrom, entry.hourTo),
      hours: customOccasionHours(entry),
      mine: true,
    }));
  const built: OccasionChoice[] = ROUTINE_OCCASIONS.map((entry) => ({
    key: entry.key,
    label: entry.label,
    example: entry.example,
    hours: entry.hours,
    mine: false,
  }));
  return [...mine, ...built];
}

export function findOccasion(
  occasion: RoutineOccasion,
  custom: CustomOccasion[] = [],
): OccasionChoice | null {
  return occasionChoices(custom).find((entry) => entry.key === occasion) ?? null;
}

export function routineOccasionLabel(occasion: RoutineOccasion, custom: CustomOccasion[] = []): string {
  return findOccasion(occasion, custom)?.label ?? 'Something else';
}

/** Whether an occasion still exists, which is the whole of what saving a
 *  routine has to check. An id whose occasion was removed is not known any
 *  more and falls back to Something else. */
export function isKnownOccasion(occasion: RoutineOccasion, custom: CustomOccasion[] = []): boolean {
  return findOccasion(occasion, custom) !== null;
}

export type RoutineStep = {
  id: string;
  routineId: string;
  /** The instruction, said the way somebody would say it to themselves. */
  text: string;
  /** One optional line underneath, shown only while this is the step on
   *  screen. Where the spare key is, which drawer, how many. */
  detail: string | null;
  position: number;
  /** The check this step also answers, when it is one worth being able to
   *  look up later. Null for a step that is only ever part of the walk. */
  checkId: string | null;
  /** How long it takes, when somebody knows (B4). Null for a step nobody
   *  has timed, which counts for nothing in a total rather than a guess. */
  minutes: number | null;
};

export type Routine = {
  id: string;
  name: string;
  occasion: RoutineOccasion;
  active: boolean;
  position: number;
  /** When the last step was finished, not when the walk started. A routine
   *  abandoned half way through has not been done. */
  lastCompletedAt: string | null;
  /** 'HH:mm' local wall-clock, or null for a routine nothing reminds
   *  anybody about. Kept even while reminderOn is false, so switching the
   *  reminder off and on again does not lose the time they picked. */
  reminderTime: string | null;
  /** Which days it speaks on, 0 for Sunday. Empty means every day. */
  reminderDays: number[];
  reminderOn: boolean;
  /** lib/keepReminding.ts: null follows Profile, 0 once, N every N minutes. */
  keepReminding: number | null;
  /** Read each step aloud while it is walked (B6). */
  speakSteps: boolean;
  steps: RoutineStep[];
};

// ------------------------------------------------------------------ checks
//
// The To Do List (2026-10-28, until then Did I Do It). Direct instruction:
// "it needs to have a true schedule built around it, including days of the
// week and it continually repeats and is available to be checked off the
// next time the time is for it to be done again." So a check is a thing
// somebody does regularly, with a schedule of its own: one or more times a
// day, on days of the week or every so many days, weeks or months. Each of
// those times is an occurrence of its own and is checked off on its own, so
// the 8am pill being done says nothing about the 8pm one. "No set pattern"
// is gone by the same instruction: "Why would they need a No Set Pattern
// option for a reminder to make sure they did something."

/** How the days a thing comes round on are picked. 'days' is days of the
 *  week (none picked means every day); 'every' is every N days, weeks or
 *  months, counted from startsOn. */
export type CheckRepeat = 'days' | 'every';
export type CheckEveryUnit = 'day' | 'week' | 'month';

export const CHECK_EVERY_UNITS: { key: CheckEveryUnit; label: string; plural: string; most: number }[] = [
  { key: 'day', label: 'day', plural: 'days', most: 365 },
  { key: 'week', label: 'week', plural: 'weeks', most: 52 },
  { key: 'month', label: 'month', plural: 'months', most: 24 },
];

/** At most this many times in one day. Six covers every pill schedule
 *  anybody has described, and keeps one thing from filling the shade. */
export const MAX_CHECK_TIMES = 6;

/** How a mark came to be written. Kept because the two read differently
 *  later: a mark somebody tapped is them saying they did it, and a mark a
 *  routine wrote is them having walked past it inside the routine, which is
 *  the same claim made in passing. */
export type CheckMarkVia = 'tap' | 'routine';

export type DoneCheck = {
  id: string;
  name: string;
  active: boolean;
  position: number;
  lastMarkedAt: string | null;
  lastMarkedVia: CheckMarkVia | null;
  /** 'HH:mm', sorted, never empty. Each one is its own thing to check off. */
  times: string[];
  repeat: CheckRepeat;
  /** For 'days': 0 is Sunday. Empty means every day. */
  days: number[];
  /** For 'every'. */
  everyN: number;
  everyUnit: CheckEveryUnit;
  /** 'YYYY-MM-DD', the day an 'every' schedule counts from. */
  startsOn: string;
  /** Whether it speaks in the notification area at its times. On unless the
   *  person switched it off; a thing a routine walks past never speaks on
   *  its own, since the routine's reminder covers it. */
  reminderOn: boolean;
  /** lib/keepReminding.ts: null follows Profile, 0 once, N every N minutes. */
  keepReminding: number | null;
  /** The latest occurrence checked off, as dueKey() writes it. */
  lastDueAt: string | null;
  /** When the thing was added. Times before it are never shown as waiting. */
  createdAt: string | null;
};

/** The part of a thing the form edits, apart from its name. */
export type CheckSchedule = Pick<
  DoneCheck,
  'times' | 'repeat' | 'days' | 'everyN' | 'everyUnit' | 'startsOn' | 'reminderOn' | 'keepReminding'
>;

/** What a new thing starts as when nobody has said otherwise: once a day at
 *  the time given, every day, counted from today, speaking at its time. */
export function defaultCheckSchedule(now: Date, time = '09:00', reminderOn = true): CheckSchedule {
  return {
    times: cleanCheckTimes([time]).length > 0 ? cleanCheckTimes([time]) : ['09:00'],
    repeat: 'days',
    days: [],
    everyN: 1,
    everyUnit: 'day',
    startsOn: localDayKey(now),
    reminderOn,
    keepReminding: null,
  };
}

/** A schedule as it should be stored: times cleaned and never empty, the
 *  number in range for its unit, a start day that is a day. */
export function cleanCheckSchedule(schedule: CheckSchedule, now: Date): CheckSchedule {
  const times = cleanCheckTimes(schedule.times);
  const everyUnit = cleanEveryUnit(schedule.everyUnit);
  return {
    times: times.length > 0 ? times : ['09:00'],
    repeat: schedule.repeat === 'every' ? 'every' : 'days',
    days: parseReminderDays(schedule.days.join(',')),
    everyN: cleanEveryN(schedule.everyN, everyUnit),
    everyUnit,
    startsOn: /^\d{4}-\d{2}-\d{2}$/.test(schedule.startsOn) ? schedule.startsOn : localDayKey(now),
    reminderOn: schedule.reminderOn,
    keepReminding: schedule.keepReminding,
  };
}

// -------------------------------------------------------------------- text

export const MAX_ROUTINE_NAME = 60;
export const MAX_STEP_TEXT = 140;
export const MAX_STEP_DETAIL = 200;
export const MAX_CHECK_NAME = 60;
export const MAX_OCCASION_NAME = 40;

/** Whitespace collapsed, nothing else touched. The same refusal to rewrite
 *  somebody's words that lib/captureNotes.ts makes. */
export function cleanRoutineText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function isRoutineTextUsable(value: string): boolean {
  return cleanRoutineText(value).length > 0;
}

// --------------------------------------------------------- when things count

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** The Monday of the week a moment falls in, matching the convention
 *  lib/workMeaning.ts already set for this app rather than adding a second
 *  one. Sunday counts as the end of the week it trails, not the start of
 *  the next. */
export function startOfLocalWeek(date: Date): Date {
  const day = startOfLocalDay(date);
  // getDay(): 0 Sunday through 6 Saturday. Monday is 1, so Sunday steps
  // back six days rather than forward one.
  const back = (day.getDay() + 6) % 7;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - back);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** 'YYYY-MM-DD' for the local day a moment falls on. */
export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** 'YYYY-MM-DDTHH:mm', local wall-clock time. The name an occurrence goes by
 *  in last_due_at and in a notification, and it sorts as text in time
 *  order, which is what every "is this one done" comparison relies on. */
export function dueKey(date: Date): string {
  return `${localDayKey(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** The moment a dueKey names, or null for anything else. */
export function parseDueKey(key: string | null | undefined): Date | null {
  const match = key ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(key) : null;
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDayKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function daysApart(from: Date, to: Date): number {
  return Math.round((startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / 86400000);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Times cleaned, without repeats, in clock order, at most MAX_CHECK_TIMES. */
export function cleanCheckTimes(times: readonly (string | null | undefined)[]): string[] {
  const kept = new Set<string>();
  for (const time of times) {
    const cleaned = cleanReminderTime(time);
    if (cleaned) kept.add(cleaned);
  }
  return [...kept].sort().slice(0, MAX_CHECK_TIMES);
}

/** Stored as one comma-separated column. */
export function parseCheckTimes(raw: string | null | undefined): string[] {
  return cleanCheckTimes((raw ?? '').split(','));
}

export function serializeCheckTimes(times: readonly string[]): string {
  return cleanCheckTimes(times).join(',');
}

export function cleanEveryUnit(value: string | null | undefined): CheckEveryUnit {
  return value === 'week' || value === 'month' ? value : 'day';
}

/** A whole number from 1 to the most that unit allows. */
export function cleanEveryN(value: number | null | undefined, unit: CheckEveryUnit): number {
  const most = CHECK_EVERY_UNITS.find((entry) => entry.key === unit)?.most ?? 365;
  const whole = Math.round(Number(value));
  if (!Number.isFinite(whole) || whole < 1) return 1;
  return Math.min(whole, most);
}

/** Whether the thing comes round on this local day at all. */
export function isScheduledOn(check: DoneCheck, day: Date): boolean {
  if (check.repeat === 'days') {
    const days = parseReminderDays(check.days.join(','));
    return days.length === 0 || days.includes(day.getDay());
  }
  const start = parseDayKey(check.startsOn);
  if (!start) return false;
  const apart = daysApart(start, day);
  if (apart < 0) return false;
  const n = cleanEveryN(check.everyN, check.everyUnit);
  if (check.everyUnit === 'day') return apart % n === 0;
  if (check.everyUnit === 'week') return apart % (7 * n) === 0;
  // Every N months, on the day of the month it started, or on the last day
  // of a month too short to have that day: the 31st lands on the 30th in
  // April rather than skipping it.
  const months = (day.getFullYear() - start.getFullYear()) * 12 + (day.getMonth() - start.getMonth());
  if (months < 0 || months % n !== 0) return false;
  const wanted = Math.min(start.getDate(), daysInMonth(day.getFullYear(), day.getMonth()));
  return day.getDate() === wanted;
}

function occurrencesOn(check: DoneCheck, day: Date): Date[] {
  if (!isScheduledOn(check, day)) return [];
  return cleanCheckTimes(check.times).map((time) => {
    const [hour, minute] = time.split(':').map(Number);
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0);
  });
}

/** Far enough back and ahead to find the next of anything a schedule allows,
 *  every 24 months being the widest. */
const OCCURRENCE_SCAN_DAYS = 800;

function addedMoment(check: DoneCheck): number {
  const parsed = check.createdAt ? Date.parse(check.createdAt) : NaN;
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

/** The latest time it was due at or before now, or null when nothing has
 *  been due yet. A time before the thing was added does not count, so
 *  something added at 3pm with an 8am time is not waiting since 8am. */
export function currentOccurrence(check: DoneCheck, now: Date): Date | null {
  const added = addedMoment(check);
  for (let back = 0; back <= OCCURRENCE_SCAN_DAYS; back += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    if (day.getTime() + 86400000 <= added) return null;
    const found = occurrencesOn(check, day).filter((at) => at.getTime() <= now.getTime() && at.getTime() >= added - 60_000);
    if (found.length > 0) return found[found.length - 1];
  }
  return null;
}

/** The first time it is due strictly after a moment. */
export function nextOccurrence(check: DoneCheck, after: Date): Date | null {
  for (let ahead = 0; ahead <= OCCURRENCE_SCAN_DAYS; ahead += 1) {
    const day = new Date(after.getFullYear(), after.getMonth(), after.getDate() + ahead);
    const found = occurrencesOn(check, day).find((at) => at.getTime() > after.getTime());
    if (found) return found;
  }
  return null;
}

/**
 * Which occurrence a tap at this moment checks off: the one due now when it
 * is still open, otherwise the next one, so doing the evening pill a little
 * early counts for the evening. Null for a thing with no times at all.
 */
export function occurrenceToMark(check: DoneCheck, now: Date): string | null {
  const current = currentOccurrence(check, now);
  if (current) {
    const key = dueKey(current);
    if (!check.lastDueAt || check.lastDueAt < key) return key;
  }
  const after = parseDueKey(check.lastDueAt);
  const from = after && after.getTime() > now.getTime() ? after : now;
  const next = nextOccurrence(check, from);
  return next ? dueKey(next) : null;
}

export type CheckStanding = {
  check: DoneCheck;
  /** True when the time due now is checked off, false when it is waiting,
   *  null when nothing has been due yet. */
  done: boolean | null;
  /** The time it is waiting since, when it is. */
  waitingSince: Date | null;
  /** The next time still to come that is not already checked off. */
  nextDue: Date | null;
  lastMarkedAt: string | null;
  /** The one line somebody actually reads. */
  line: string;
};

export function checkStanding(check: DoneCheck, now: Date): CheckStanding {
  const parsed = check.lastMarkedAt ? new Date(check.lastMarkedAt) : null;
  const marked = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  const current = currentOccurrence(check, now);
  const done = current === null ? null : Boolean(check.lastDueAt && check.lastDueAt >= dueKey(current));
  const lastDue = parseDueKey(check.lastDueAt);
  const nextFrom = lastDue && lastDue.getTime() > now.getTime() ? lastDue : now;
  const nextDue = nextOccurrence(check, nextFrom);
  const waitingSince = done === false ? current : null;
  return {
    check,
    done,
    waitingSince,
    nextDue,
    lastMarkedAt: marked ? check.lastMarkedAt : null,
    line: describeCheckStanding(done, waitingSince, nextDue, marked, now),
  };
}

/** A clock time the way somebody would say it: 7:12am, 11:40pm. */
export function formatMarkClock(date: Date): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours < 12 ? 'am' : 'pm';
  const shown = hours % 12 === 0 ? 12 : hours % 12;
  return `${shown}:${minutes}${suffix}`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * When a mark happened, said as somebody would say it. Today keeps its
 * clock time, because "did I take my pill" is answered by the hour and not
 * by the day. Anything older loses the clock, since the hour of a thing
 * eleven days ago is noise.
 */
export function describeMarkMoment(markedAt: string, now: Date): string {
  const then = new Date(markedAt);
  if (Number.isNaN(then.getTime())) return '';
  const days = Math.round((startOfLocalDay(now).getTime() - startOfLocalDay(then).getTime()) / 86400000);
  if (days <= 0) return `today at ${formatMarkClock(then)}`;
  if (days === 1) return `yesterday at ${formatMarkClock(then)}`;
  if (days < 7) return `${DAY_NAMES[then.getDay()]} at ${formatMarkClock(then)}`;
  if (days < 14) return 'over a week ago';
  if (days < 62) return `${Math.floor(days / 7)} weeks ago`;
  const months = Math.floor(days / 30);
  return `${months} months ago`;
}

/** When a time is due, near or far: "today at 8pm", "tomorrow at 8am",
 *  "Friday at 9am", "Nov 14 at 9am". */
export function describeDue(at: Date, now: Date): string {
  const clock = formatReminderClock(`${pad2(at.getHours())}:${pad2(at.getMinutes())}`);
  const days = daysApart(now, at);
  if (days === 0) return `today at ${clock}`;
  if (days === 1) return `tomorrow at ${clock}`;
  if (days === -1) return `yesterday at ${clock}`;
  if (days > 1 && days < 7) return `${DAY_NAMES[at.getDay()]} at ${clock}`;
  return `${MONTH_NAMES[at.getMonth()]} ${at.getDate()} at ${clock}`;
}

function describeCheckStanding(
  done: boolean | null,
  waitingSince: Date | null,
  nextDue: Date | null,
  marked: Date | null,
  now: Date,
): string {
  const moment = marked ? describeMarkMoment(marked.toISOString(), now) : null;
  const next = nextDue ? describeDue(nextDue, now) : null;
  if (done === null) {
    if (next) return `First one is ${next}.`;
    return 'Nothing recorded yet.';
  }
  if (done) {
    const doneLine = moment ? `Done ${moment}.` : 'Done.';
    return next ? `${doneLine} Next: ${next}.` : doneLine;
  }
  const since = waitingSince ? describeDue(waitingSince, now) : null;
  const waiting = since ? `Not checked off for ${since}.` : 'Not checked off yet.';
  return moment ? `${waiting} Last done ${moment}.` : waiting;
}

/**
 * How a schedule's words are said. This module imports nothing, so a screen
 * that shows a schedule hands in t() from lib/i18n and each word and pattern
 * below is looked up there; left out, the English is filled in as it is.
 */
export type SayWords = (english: string, values?: Record<string, string | number>) => string;

const sayAsWritten: SayWords = (english, values) =>
  english.replace(/\{(\w+)\}/g, (whole, name: string) => (values && name in values ? String(values[name]) : whole));

/** The times together, the way somebody would read them out: "8am",
 *  "8am and 8pm", "8am, 1pm and 8pm". */
export function describeCheckTimes(times: readonly string[], say: SayWords = sayAsWritten): string {
  const said = cleanCheckTimes(times).map(formatReminderClock);
  if (said.length <= 1) return said[0] ?? '';
  return `${said.slice(0, -1).join(', ')} ${say('and')} ${said[said.length - 1]}`;
}

/** The days part on its own: "every day", "weekdays", "every 3 days",
 *  "every 2 weeks on Monday", "every month on day 15". Each shape is one
 *  whole phrase, so a language can put the words in its own order. */
export function describeCheckRepeat(
  check: Pick<DoneCheck, 'repeat' | 'days' | 'everyN' | 'everyUnit' | 'startsOn'>,
  say: SayWords = sayAsWritten,
): string {
  if (check.repeat === 'days') return describeReminderDays(check.days, say);
  const unit = cleanEveryUnit(check.everyUnit);
  const n = cleanEveryN(check.everyN, unit);
  const start = parseDayKey(check.startsOn);
  const entry = CHECK_EVERY_UNITS.find((each) => each.key === unit) ?? CHECK_EVERY_UNITS[0];
  if (unit === 'day' || !start) return n === 1 ? say(`every ${entry.label}`) : say(`every {count} ${entry.plural}`, { count: n });
  if (unit === 'week') {
    const weekday = say(DAY_NAMES[start.getDay()]);
    return n === 1
      ? say('every week on {weekday}', { weekday })
      : say('every {count} weeks on {weekday}', { count: n, weekday });
  }
  return n === 1
    ? say('every month on day {day}', { day: start.getDate() })
    : say('every {count} months on day {day}', { count: n, day: start.getDate() });
}

/** The whole schedule in one line: "8am and 8pm, every day." */
export function describeCheckSchedule(
  check: Pick<DoneCheck, 'times' | 'repeat' | 'days' | 'everyN' | 'everyUnit' | 'startsOn'>,
  say: SayWords = sayAsWritten,
): string {
  return `${describeCheckTimes(check.times, say)}, ${describeCheckRepeat(check, say)}.`;
}

/**
 * Every time a thing should speak between the start of today and the
 * horizon, in order. The time due now is included when it has already gone
 * by and is still open, since that is the one its follow-ups hang from;
 * earlier times today that a later one has replaced are left out, because
 * the 8am reminder has nothing more to say once it is 8pm. A time already
 * checked off (done early counts) is left out too.
 *
 * Nothing at all for a thing switched off, with its reminder off, or that a
 * routine walks past: the routine's own reminder covers it, so it never
 * speaks twice.
 */
export function nextCheckReminderTimes(check: DoneCheck, now: Date, withinDays: number, inRoutine = false): Date[] {
  if (!check.active || !check.reminderOn || inRoutine) return [];
  const current = currentOccurrence(check, now);
  const added = addedMoment(check);
  const times: Date[] = [];
  for (let offset = 0; offset <= withinDays; offset += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    for (const at of occurrencesOn(check, day)) {
      if (at.getTime() < added - 60_000) continue;
      const key = dueKey(at);
      if (check.lastDueAt && key <= check.lastDueAt) continue;
      if (at.getTime() <= now.getTime() && (!current || at.getTime() !== current.getTime())) continue;
      times.push(at);
    }
  }
  return times;
}

// ---------------------------------------------------------- what Home reads

/** Which occasion the clock is currently in, or null when it is the middle
 *  of the day and no routine is the obvious one.
 *
 *  A person's own occasions are checked before the built-in four, so a
 *  Work that runs 9 to 5 wins over Morning between 9 and 11 rather than
 *  losing to it. Two of the person's own covering the same hour are
 *  settled by the order they put them in, which is the only answer they
 *  have a say in. */
export function suggestedOccasion(now: Date, custom: CustomOccasion[] = []): RoutineOccasion | null {
  const hour = now.getHours();
  for (const entry of occasionChoices(custom)) {
    if (!entry.hours) continue;
    const { from, to } = entry.hours;
    const inside = from <= to ? hour >= from && hour < to : hour >= from || hour < to;
    if (inside) return entry.key;
  }
  return null;
}

/**
 * Active routines with whichever one fits the clock first, everything else
 * in the order it was put in. Leaving the house never leads, because it has
 * no hour: a list that guessed at it would be wrong most of the day.
 */
export function orderRoutinesForNow(
  routines: Routine[],
  now: Date,
  custom: CustomOccasion[] = [],
): Routine[] {
  const fits = suggestedOccasion(now, custom);
  const byPosition = routines.filter((routine) => routine.active).sort((a, b) => a.position - b.position);
  if (!fits) return byPosition;
  return [
    ...byPosition.filter((routine) => routine.occasion === fits),
    ...byPosition.filter((routine) => routine.occasion !== fits),
  ];
}

/** Whether a routine has been finished since the start of today, which is
 *  the only window that means anything for a morning or bedtime walk. */
export function routineDoneToday(routine: Routine, now: Date): boolean {
  if (!routine.lastCompletedAt) return false;
  const then = new Date(routine.lastCompletedAt);
  if (Number.isNaN(then.getTime())) return false;
  return then.getTime() >= startOfLocalDay(now).getTime();
}

/** The line under a routine's name, on Home and in the list. */
export function describeRoutineStanding(routine: Routine, now: Date): string {
  const count = routine.steps.length;
  const steps = count === 1 ? '1 step' : `${count} steps`;
  if (count === 0) return 'No steps yet. Add the first one to make this walkable.';
  if (routine.lastCompletedAt && routineDoneToday(routine, now)) {
    return `${steps}. Finished ${describeMarkMoment(routine.lastCompletedAt, now)}.`;
  }
  if (!routine.lastCompletedAt) return `${steps}. Not walked yet.`;
  return `${steps}. Last finished ${describeMarkMoment(routine.lastCompletedAt, now)}.`;
}

/** "Step 3 of 7". Stated once rather than built at each call site, so the
 *  three places that show progress cannot drift apart. */
export function routineProgressLabel(index: number, total: number): string {
  if (total <= 0) return '';
  const shown = Math.min(Math.max(index + 1, 1), total);
  return `Step ${shown} of ${total}`;
}

// ------------------------------------------- the reminder that starts one
//
// 2026-09-17, and it closes the one honest hole in everything above: a
// routine could only ever be remembered by the person who built it. The
// thing somebody needs held for them is not the order of the steps, which
// this already holds. It is the moment.
//
// What a reminder is here, stated once so nothing drifts: a time of day, on
// the days of the week they picked, that puts a notification on the phone.
// Tapping it opens the walk at step one. It does not walk anything by
// itself and it does not tick anything off, because a notification cannot
// know whether anyone got up.
//
// The days are numbers, 0 for Sunday, exactly as Date.getDay() returns
// them, so the one place they are compared needs no conversion. An empty
// list means every day: a routine given a time and no days is a daily one,
// which is what most of them turn out to be.

export const REMINDER_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const ALL_REMINDER_DAYS = [0, 1, 2, 3, 4, 5, 6];

const WEEKDAY_SET = [1, 2, 3, 4, 5];
const WEEKEND_SET = [0, 6];

function sameDays(days: number[], other: number[]): boolean {
  return days.length === other.length && other.every((day) => days.includes(day));
}

/** 'HH:mm' or null. Anything else, including an hour of 24 or a minute of
 *  60, comes back null rather than being nudged into range, because a
 *  reminder at a time nobody chose is worse than no reminder. */
export function cleanReminderTime(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** The stored form is a plain comma list. Sorted, with duplicates and
 *  anything out of range dropped, so the row can be read back with no
 *  further checking anywhere else. */
export function parseReminderDays(raw: string | null | undefined): number[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  const days = raw
    .split(',')
    .map((piece) => Number(piece.trim()))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return [...new Set(days)].sort((a, b) => a - b);
}

/** Null for every day, which is both the default and the shortest thing to
 *  store for the commonest case. */
export function serializeReminderDays(days: number[]): string | null {
  const cleaned = parseReminderDays(days.join(','));
  if (cleaned.length === 0 || cleaned.length === 7) return null;
  return cleaned.join(',');
}

/** Turning the last day off means every day rather than no days, because a
 *  reminder set for nothing is a reminder that silently never speaks. */
export function toggleReminderDay(days: number[], day: number): number[] {
  const current = parseReminderDays(days.join(','));
  const on = current.length === 0 ? [...ALL_REMINDER_DAYS] : current;
  const next = on.includes(day) ? on.filter((one) => one !== day) : [...on, day];
  return parseReminderDays(next.join(','));
}

/** '7am', '7:15am', '12pm'. The same voice formatHour speaks in, with the
 *  minutes left off when there are none. */
export function formatReminderClock(time: string): string {
  const cleaned = cleanReminderTime(time);
  if (!cleaned) return '';
  const [hour, minute] = cleaned.split(':').map(Number);
  const base = formatHour(hour);
  if (minute === 0) return base;
  const suffix = base.slice(-2);
  return `${base.slice(0, -2)}:${String(minute).padStart(2, '0')}${suffix}`;
}

/** 'every day', 'weekdays', 'weekends', or the days themselves. */
export function describeReminderDays(days: number[], say: SayWords = sayAsWritten): string {
  const cleaned = parseReminderDays(days.join(','));
  if (cleaned.length === 0 || cleaned.length === 7) return say('every day');
  if (sameDays(cleaned, WEEKDAY_SET)) return say('weekdays');
  if (sameDays(cleaned, WEEKEND_SET)) return say('weekends');
  return cleaned.map((day) => say(REMINDER_DAY_NAMES[day])).join(', ');
}

/** A reminder exists only when it is switched on AND has a time. Both are
 *  checked in one place so that switching it off keeps the time for when it
 *  is switched back on. */
export function hasRoutineReminder(routine: Routine): boolean {
  return routine.reminderOn && cleanReminderTime(routine.reminderTime) !== null;
}

export function reminderFiresOnDay(routine: Routine, date: Date): boolean {
  if (!hasRoutineReminder(routine)) return false;
  const days = parseReminderDays(routine.reminderDays.join(','));
  return days.length === 0 || days.includes(date.getDay());
}

/** The line under a routine that has one. Null for one that does not, so
 *  the row says nothing at all rather than saying there is no reminder. */
export function describeRoutineReminder(routine: Routine): string | null {
  const time = cleanReminderTime(routine.reminderTime);
  if (!time) return null;
  const when = `${formatReminderClock(time)}, ${describeReminderDays(routine.reminderDays)}`;
  if (!routine.reminderOn) return `A nudge at ${when}, switched off.`;
  return `Nudges at ${when}.`;
}

/**
 * Every moment this routine should speak between now and the horizon, in
 * order. Local wall-clock time throughout, so a reminder set for seven is at
 * seven in whatever place the phone is standing, not seven where it was set.
 *
 * Today is skipped when the routine has already been walked today, which is
 * the difference between a reminder and a nag: somebody who got up at six and
 * did the whole thing does not need to be told at seven to start it.
 */
export function nextReminderTimes(routine: Routine, now: Date, withinDays: number): Date[] {
  if (!hasRoutineReminder(routine)) return [];
  const time = cleanReminderTime(routine.reminderTime);
  if (!time) return [];
  const [hour, minute] = time.split(':').map(Number);
  const alreadyWalked = routineDoneToday(routine, now);
  const times: Date[] = [];
  for (let offset = 0; offset <= withinDays; offset += 1) {
    const day = startOfLocalDay(now);
    day.setDate(day.getDate() + offset);
    if (!reminderFiresOnDay(routine, day)) continue;
    if (offset === 0 && alreadyWalked) continue;
    const fireAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0);
    if (fireAt.getTime() <= now.getTime()) continue;
    times.push(fireAt);
  }
  return times;
}

export type ChecksSummary = { total: number; waiting: number; done: number; notYet: number };

export function summarizeChecks(checks: DoneCheck[], now: Date): ChecksSummary {
  let waiting = 0;
  let done = 0;
  let notYet = 0;
  for (const check of checks) {
    if (!check.active) continue;
    const standing = checkStanding(check, now);
    if (standing.done === null) notYet += 1;
    else if (standing.done) done += 1;
    else waiting += 1;
  }
  return { total: waiting + done + notYet, waiting, done, notYet };
}

/**
 * The card's own line. Says nothing at all when nothing is waiting, because
 * a card announcing "0 to record" every morning is noise, the same call the
 * capture inbox already makes about an empty inbox.
 */
export function describeChecksSummary(summary: ChecksSummary): string | null {
  if (summary.total === 0) return null;
  if (summary.waiting === 0) return null;
  const things = summary.waiting === 1 ? '1 thing' : `${summary.waiting} things`;
  return `${things} not recorded yet.`;
}

// ------------------------------------------- the checks a routine ticks off
//
// 2026-09-17, direct instruction: "Did I Do it should be related to
// Routines, not treated separately. While they are walking through a
// routine, they are also checking off things that they need to do while
// running the routine."
//
// So a check is not a second list living next to the routines. It is the
// part of a routine that is worth being able to look up afterwards, and
// the record reads that way: grouped under the routine that ticks it off,
// with the ones nothing walks past kept together at the end.

/** The checks a routine ticks off, in step order, each named once however
 *  many steps point at it. */
export function checkIdsInRoutine(routine: Routine): string[] {
  const ids: string[] = [];
  for (const step of [...routine.steps].sort((a, b) => a.position - b.position)) {
    if (step.checkId && !ids.includes(step.checkId)) ids.push(step.checkId);
  }
  return ids;
}

/** The routine that ticks a check off, or null for one nothing walks past.
 *  The earliest routine when more than one does, because a heading has to
 *  pick one and there is no better answer than the order the person put
 *  their routines in. */
export function routineForCheck(checkId: string, routines: Routine[]): Routine | null {
  const ordered = [...routines].sort((a, b) => a.position - b.position);
  return ordered.find((routine) => checkIdsInRoutine(routine).includes(checkId)) ?? null;
}

export type CheckGroup = {
  /** Null for the group of checks no routine touches. */
  routine: Routine | null;
  heading: string;
  checks: DoneCheck[];
};

export const LOOSE_CHECKS_HEADING = 'Not part of a routine';

/**
 * Checks grouped under the routine that ticks them off. Groups come out in
 * the order their first check appears rather than in routine order, so the
 * list keeps whatever order the person put the checks in: sorted by routine
 * instead, moving one check would silently move a whole heading with it.
 */
export function groupChecksByRoutine(checks: DoneCheck[], routines: Routine[]): CheckGroup[] {
  const ordered = [...routines].sort((a, b) => a.position - b.position);
  const groups: CheckGroup[] = [];
  const loose: DoneCheck[] = [];
  for (const check of checks) {
    const routine = routineForCheck(check.id, ordered);
    if (!routine) {
      loose.push(check);
      continue;
    }
    const existing = groups.find((group) => group.routine?.id === routine.id);
    if (existing) existing.checks.push(check);
    else groups.push({ routine, heading: routine.name, checks: [check] });
  }
  if (loose.length > 0) groups.push({ routine: null, heading: LOOSE_CHECKS_HEADING, checks: loose });
  return groups;
}

/** The line under a check saying where it gets ticked off, or null when
 *  nothing walks past it and the only way it is ever recorded is a tap. */
export function describeCheckRoutine(checkId: string, routines: Routine[]): string | null {
  const routine = routineForCheck(checkId, routines);
  return routine ? `Ticked off while walking ${routine.name}.` : null;
}

// ---------------------------------------------------------------- reordering

/**
 * Move a step and hand back the whole list renumbered from zero, so the
 * saved positions never develop gaps or ties. An out of range index gives
 * the list back untouched rather than throwing, since the only caller is a
 * finger on an arrow at the end of a list.
 */
export function moveRoutineStep(steps: RoutineStep[], fromIndex: number, toIndex: number): RoutineStep[] {
  if (fromIndex === toIndex) return steps;
  if (fromIndex < 0 || fromIndex >= steps.length) return steps;
  if (toIndex < 0 || toIndex >= steps.length) return steps;
  const next = [...steps];
  const [held] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, held);
  return next.map((step, index) => ({ ...step, position: index }));
}
