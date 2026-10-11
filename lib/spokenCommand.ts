// What a spoken note asks for, if it asks for anything (step 3 of the voice
// order, 1.0.66.21). "Remind me to call the pharmacy tomorrow at 10" is a
// reminder; "count down 2 hours 30 minutes for the bread" is a timer;
// "the passport comes on the 15th" is a note that mentions a day.
//
// THE RULES IT KEEPS.
//   - A reminder is set outright only when the words name a clock time ("at
//     10", "3:30 pm", "noon", "in 20 minutes"). A day with no time, or a
//     loose time ("this evening", "tonight", "soon", "later"), comes back as
//     a question with the closest reading offered as one tap, never applied.
//   - A note that mentions a day without asking for a reminder only ever
//     gets an offer. Nothing is set by itself.
//   - The reading is always shown in full beside what it did, so a wrong one
//     is seen, and every caller gives an Undo.
//
// Dates come from lib/plainDate.ts, the same reader Capture's box uses, so a
// day reads the same whether it was typed or said.
//
// Pure: no database, no React. scripts/test_spoken_command.js checks it.

import { describePlainDate, dateKey, readPlainDates, type PlainDate } from './plainDate';
import type { RepeatConfig } from './repeatRule';

/** One moment a reminder could be set for, with the words that describe it. */
export type SpokenWhen = { scheduledFor: string; label: string };

export type SpokenCommand =
  /** A reminder with a definite time. */
  | { kind: 'reminder'; title: string; when: SpokenWhen; repeat: RepeatConfig; every: string | null }
  /** A reminder asked for without a definite time. `unclear` names what was
   *  missing, and `offers` holds the closest readings, possibly none. */
  | { kind: 'reminderAsk'; title: string; unclear: string; offers: SpokenWhen[]; repeat: RepeatConfig; every: string | null }
  /** A countdown in hours and minutes, counted from the moment it was said. */
  | { kind: 'timer'; title: string | null; minutes: number }
  /** A countdown in whole days. */
  | { kind: 'days'; title: string | null; days: number }
  /** No command. `offers` holds days the words mention, for a one-tap
   *  reminder, and is empty when they mention none. */
  | { kind: 'note'; offers: SpokenWhen[] };

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_PATTERN = WEEKDAYS.join('|');

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, 'forty five': 45, 'forty-five': 45,
  fifty: 50, sixty: 60, ninety: 90,
};
const NUMBER_PATTERN = `\\d+(?:\\.\\d+)?|${Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length).join('|')}`;

/** The longest countdown a spoken timer may set: a year in minutes. */
const MAX_TIMER_MINUTES = 366 * 24 * 60;
/** How many day offers a note may carry. */
const MAX_NOTE_OFFERS = 2;
const DEFAULT_HOUR = '09:00';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function readNumber(word: string): number | null {
  if (/^\d+(?:\.\d+)?$/.test(word)) return Number(word);
  return NUMBER_WORDS[word] ?? null;
}

function clockLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

function capitalise(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

// --- Durations ---------------------------------------------------------------

/**
 * A spoken length of time at the start of the words: "2 hours 30 minutes",
 * "an hour and a half", "half an hour", "90 min", "3 days and 4 hours".
 * Answers the minutes and how many characters it used, or null.
 */
export function readDuration(words: string): { minutes: number; used: number } | null {
  const lower = words.toLowerCase();
  let at = 0;
  let minutes = 0;
  let parts = 0;
  const unitMinutes = (unit: string) => (unit.startsWith('d') ? 1440 : unit.startsWith('h') ? 60 : 1);
  for (;;) {
    const rest = lower.slice(at);
    const half = /^half an? (hour|hr)\b/.exec(rest);
    if (half) {
      minutes += 30;
      parts += 1;
      at += half[0].length;
    } else {
      const part = new RegExp(`^(${NUMBER_PATTERN})(?:\\s+and a half)?\\s*(days?|hours?|hrs?|minutes?|mins?)\\b(\\s+and a half)?`).exec(rest);
      if (!part) break;
      const n = readNumber(part[1]);
      if (n === null) break;
      const halfMore = /and a half/.test(part[0]) ? 0.5 : 0;
      minutes += (n + halfMore) * unitMinutes(part[2]);
      parts += 1;
      at += part[0].length;
    }
    const joiner = /^(?:\s*,\s*|\s+and\s+|\s+)(?=half an? |\d|[a-z])/.exec(lower.slice(at));
    if (!joiner) break;
    // Only step over the joiner when another length follows it.
    const after = lower.slice(at + joiner[0].length);
    if (!new RegExp(`^(?:half an? (?:hour|hr)\\b|(?:${NUMBER_PATTERN})(?:\\s+and a half)?\\s*(?:days?|hours?|hrs?|minutes?|mins?)\\b)`).test(after)) break;
    at += joiner[0].length;
  }
  if (parts === 0) return null;
  return { minutes: Math.round(minutes), used: at };
}

/** "2 hours 30 minutes", "1 hour", "45 minutes", "3 days 4 hours". */
export function describeDuration(minutes: number): string {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const pieces: string[] = [];
  if (days) pieces.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  if (hours) pieces.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (mins || pieces.length === 0) pieces.push(`${mins} ${mins === 1 ? 'minute' : 'minutes'}`);
  return pieces.join(' ');
}

// --- Times of day --------------------------------------------------------

// A clock time somebody said outright. Each of these is also taken out of
// the words that become the reminder's title.
const CLOCK_PATTERNS = [
  // "at 8 o'clock" as a whole, so "o'clock" is not left in the title.
  /\b(?:at\s+|by\s+)?\d{1,2}\s*o['’]?\s?clock\b/,
  /\b(?:at\s+|by\s+)?\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)(?![a-z])/,
  /\b(?:at\s+|by\s+)?\d{1,2}:\d{2}\b/,
  /\b(?:at|by)\s+\d{1,2}\b(?!\s*(?:days?|weeks?|months?|years?|%))/,
  /\b(?:at\s+|by\s+)?(?:noon|midday|midnight)\b/,
  /\bin\s+(?:\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|half an)\s+(?:minute|min|hour|hr)s?\b/,
];

// A time of day too loose to set a reminder by, with the hour offered for it.
// Null means there is nothing to offer from the words alone.
const LOOSE_TIMES: { pattern: RegExp; hour: string | null }[] = [
  { pattern: /\b(?:in the |this |tomorrow )?morning\b/, hour: '09:00' },
  { pattern: /\b(?:in the |this |tomorrow )?afternoon\b/, hour: '15:00' },
  { pattern: /\b(?:in the |this |tomorrow )?evening\b/, hour: '19:00' },
  { pattern: /\btonight\b/, hour: '19:00' },
  { pattern: /\b(?:at |before )?bedtime\b|\bbefore bed\b/, hour: null },
  { pattern: /\bafter work\b/, hour: null },
  { pattern: /\b(?:later(?: on| today)?|soon|sometime|at some point)\b/, hour: null },
];

function hasClock(lower: string): boolean {
  return CLOCK_PATTERNS.some((pattern) => pattern.test(lower));
}

function looseTime(lower: string): { words: string; hour: string | null } | null {
  for (const { pattern, hour } of LOOSE_TIMES) {
    const match = pattern.exec(lower);
    if (match) return { words: match[0].trim(), hour };
  }
  return null;
}

// --- Repeats -----------------------------------------------------------------

function readEvery(lower: string): { repeat: RepeatConfig; every: string; matched: string } | null {
  const day = /\bevery\s*(?:single\s+)?day\b|\bdaily\b/.exec(lower);
  if (day) return { repeat: { type: 'daily', endType: 'indefinite' }, every: 'every day', matched: day[0] };
  const workday = /\bevery\s+weekday\b|\bon weekdays\b/.exec(lower);
  if (workday) {
    return { repeat: { type: 'weekly', endType: 'indefinite', weekdays: [1, 2, 3, 4, 5] }, every: 'every weekday', matched: workday[0] };
  }
  const named = new RegExp(`\\bevery\\s+((?:${WEEKDAY_PATTERN})(?:\\s*(?:,|and|,\\s*and)\\s*(?:${WEEKDAY_PATTERN}))*)\\b`).exec(lower);
  if (named) {
    const days = [...new Set(named[1].split(/\s*(?:,|and)\s*/).map((word) => WEEKDAYS.indexOf(word.trim())).filter((d) => d >= 0))].sort();
    const names = days.map((d) => WEEKDAY_LABELS[d]);
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
    return { repeat: { type: 'weekly', endType: 'indefinite', weekdays: days }, every: `every ${list}`, matched: named[0] };
  }
  return null;
}

// The first day a repeat lands on at the given time: today when that time
// is still ahead and today is one of its days, otherwise the next one.
function firstRepeatDay(repeat: RepeatConfig, time: string, now: Date): string {
  const [h, m] = time.split(':').map(Number);
  for (let offset = 0; offset < 8; offset += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, h, m);
    if (day.getTime() <= now.getTime()) continue;
    if (repeat.type === 'weekly' && !(repeat.weekdays ?? []).includes(day.getDay())) continue;
    return dateKey(day);
  }
  return dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
}

// --- Titles ------------------------------------------------------------------

// What is left of the words once the when has been taken out: "to call the
// pharmacy tomorrow at 10" becomes "Call the pharmacy".
function titleFrom(body: string, remove: string[]): string {
  let text = ` ${body} `;
  for (const piece of remove) {
    if (!piece) continue;
    const index = text.toLowerCase().indexOf(piece.toLowerCase());
    if (index >= 0) text = `${text.slice(0, index)} ${text.slice(index + piece.length)}`;
  }
  for (const pattern of [...CLOCK_PATTERNS, ...LOOSE_TIMES.map((loose) => loose.pattern)]) {
    const match = new RegExp(pattern.source, 'i').exec(text);
    if (match) text = `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`;
  }
  text = text.replace(/\s+/g, ' ').trim();
  // Words left hanging where a day or a time was taken out from beside them.
  for (let pass = 0; pass < 3; pass += 1) {
    text = text
      .replace(/^(?:to|about|that|of|on|at|by|for|in|i need to|i have to|i must|we need to)\s+/i, '')
      .replace(/\s+(?:on|at|by|for|from|the)$/i, '')
      .replace(/[\s,.;:!?]+$/, '')
      .replace(/^[\s,.;:]+/, '')
      .trim();
  }
  return capitalise(text);
}

// --- Days a note mentions ---------------------------------------------------

function offerFor(found: PlainDate, fallback: string, now: Date): SpokenWhen | null {
  const withTime = { ...found, time: found.time ?? fallback };
  const scheduledFor = `${withTime.date}T${withTime.time}`;
  const [y, mo, d] = withTime.date.split('-').map(Number);
  const [h, m] = withTime.time.split(':').map(Number);
  if (new Date(y, mo - 1, d, h, m).getTime() <= now.getTime()) return null;
  return { scheduledFor, label: describePlainDate(withTime, now) };
}

function noteOffers(text: string, now: Date): SpokenWhen[] {
  const offers: SpokenWhen[] = [];
  for (const found of readPlainDates(text, now, 'future')) {
    if (!found.matched && !found.time) continue;
    const offer = offerFor(found, DEFAULT_HOUR, now);
    if (offer && !offers.some((o) => o.scheduledFor === offer.scheduledFor)) offers.push(offer);
    if (offers.length === MAX_NOTE_OFFERS) break;
  }
  return offers;
}

// --- The reader -------------------------------------------------------------

const LEAD_IN = /^(?:(?:ok(?:ay)?|hey|please|so|um+|uh+)[\s,]+)*/i;

function readTimer(lower: string, original: string): SpokenCommand | null {
  const start =
    /^(?:set|start)\s+(?:a|an|the|me a)?\s*(?:timer|countdown|count down|counter)\s+(?:for|of)?\s*/.exec(lower) ??
    /^count\s*down\s+(?:from\s+)?(?:for\s+)?/.exec(lower) ??
    /^timer\s+(?:for\s+)?/.exec(lower);
  if (!start) return null;
  const length = readDuration(lower.slice(start[0].length));
  if (!length || length.minutes <= 0 || length.minutes > MAX_TIMER_MINUTES) return null;
  const rest = original.slice(start[0].length + length.used);
  const title = titleFrom(rest.replace(/^\s*(?:for|to|until|till|on|:|-)\s+/i, ''), []) || null;
  if (length.minutes % 1440 === 0) return { kind: 'days', title, days: length.minutes / 1440 };
  return { kind: 'timer', title, minutes: length.minutes };
}

function readReminder(lower: string, original: string, now: Date): SpokenCommand | null {
  const start = /^(?:remind me|set (?:a |me a )?reminder|make (?:a )?reminder|reminder)\b[\s,:]*/.exec(lower);
  if (!start) return null;
  const body = original.slice(start[0].length).trim();
  // "8 o'clock" and "by 8 o'clock" read as "at 8", which is how the
  // date reader knows a time of day.
  const bodyLower = body
    .toLowerCase()
    .replace(/(\b(?:at|by)\s+)?(\d{1,2})\s*o['’]?\s?clock\b/g, (_whole, _before: string | undefined, hour: string) => `at ${hour} o’clock`);

  const every = readEvery(bodyLower);
  const withoutEvery = every ? bodyLower.replace(every.matched, ' ') : bodyLower;
  const found = readPlainDates(withoutEvery, now, 'future');
  const first = found[0] ?? null;
  const loose = looseTime(withoutEvery);
  const clock = hasClock(withoutEvery);
  const dateWords = found.map((f) => f.matched).filter(Boolean);
  const title = titleFrom(body, [every?.matched ?? '', ...dateWords]) || 'Reminder';
  const repeat: RepeatConfig = every?.repeat ?? { type: 'none' };

  if (clock && first?.time) {
    if (every) {
      const date = firstRepeatDay(every.repeat, first.time, now);
      return {
        kind: 'reminder',
        title,
        when: { scheduledFor: `${date}T${first.time}`, label: `${capitalise(every.every)} at ${clockLabel(first.time)}` },
        repeat,
        every: every.every,
      };
    }
    const when = offerFor(first, first.time, now);
    if (when) return { kind: 'reminder', title, when, repeat, every: null };
    return { kind: 'reminderAsk', title, unclear: 'That time has already gone by today.', offers: [], repeat, every: null };
  }

  // No clock time. Say what is missing, and offer the closest reading.
  const hour = loose?.hour ?? DEFAULT_HOUR;
  const offers: SpokenWhen[] = [];
  if (every) {
    const date = firstRepeatDay(every.repeat, hour, now);
    offers.push({ scheduledFor: `${date}T${hour}`, label: `${capitalise(every.every)} at ${clockLabel(hour)}` });
  } else if (first?.matched) {
    const offer = offerFor({ ...first, time: loose?.hour ?? null }, hour, now);
    if (offer) offers.push(offer);
  } else if (loose?.hour) {
    // "This evening" with no day: today if the hour is still ahead, else tomorrow.
    const offer = offerFor({ date: dateKey(now), time: loose.hour, matched: loose.words }, loose.hour, now)
      ?? offerFor({ date: dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)), time: loose.hour, matched: loose.words }, loose.hour, now);
    if (offer) offers.push(offer);
  }
  let unclear: string;
  if (loose) unclear = `"${capitalise(loose.words)}" is not a time to set a reminder by.`;
  else if (first?.matched || every) unclear = 'No time of day was said.';
  else unclear = 'No day or time was said.';
  return { kind: 'reminderAsk', title, unclear, offers, repeat, every: every?.every ?? null };
}

/** What the words ask for. Anything that is not a reminder or a timer is a note. */
export function readSpokenCommand(text: string, now: Date): SpokenCommand {
  if (typeof text !== 'string' || !text.trim()) return { kind: 'note', offers: [] };
  const original = text.trim().replace(LEAD_IN, '');
  const lower = original.toLowerCase();
  return readTimer(lower, original) ?? readReminder(lower, original, now) ?? { kind: 'note', offers: noteOffers(text, now) };
}

/** The moment a timer said at `saidAt` ends, as an ISO string. */
export function timerEndsAt(saidAt: Date, minutes: number): string {
  return new Date(saidAt.getTime() + minutes * 60_000).toISOString();
}

/** "3:40 PM", or "Tomorrow at 3:40 PM" when the timer runs past midnight. */
export function describeTimerEnd(endsAt: string, now: Date): string {
  const end = new Date(endsAt);
  const time = clockLabel(`${pad(end.getHours())}:${pad(end.getMinutes())}`);
  if (dateKey(end) === dateKey(now)) return time;
  return describePlainDate({ date: dateKey(end), time: `${pad(end.getHours())}:${pad(end.getMinutes())}`, matched: '' }, now);
}
