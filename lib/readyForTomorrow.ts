// Ready for Tomorrow (Q60, 1.0.96.4): the evening-before list. What has to
// be started tonight because of what is planned, and what tomorrow holds.
// It gathers what is already recorded; the only thing it saves is that a
// start was made, which is what keeps the reminder quiet about it.
//
// It never says somebody is behind, never counts what was missed, and never
// says anything about a dose beyond the food line Schedules already shows.
//
// Pure: it builds on two pure modules and nothing else, so
// scripts/test_ready_for_tomorrow.js runs it without a phone.
import { clockLabel, dayLabel, dayStartMs, localDayOf, type DayTimelineItem, type TimelineKind, type TimelineRoute } from './dayTimeline';
import { PREP_SENTENCES, prepLeadFor, type PrepKind } from './recipePrep';

export type Translate = (english: string, values?: Readonly<Record<string, string | number>>) => string;

const HOUR = 3_600_000;
/** A start due before this hour tomorrow is a start for tonight. */
export const TONIGHT_ENDS_HOUR = 8;
/** Nothing further ahead than 60 days is ever raised. */
export const MAX_PREP_HOURS = 1440;
/** A dish that takes days is made in a batch, so one on the schedule within
 *  these days before a meal is taken to be that batch. */
export const BATCH_DAYS = 14;

export type PrepDish = { name: string; recipeId: string | null };
export type PrepMeal = { scheduleItemId: string; at: number; title: string; dishes: PrepDish[] };
export type OwnLead = { key: string; name: string; kind: PrepKind; hours: number };

export type PrepLine = {
  key: string;
  dish: string;
  kind: PrepKind;
  hours: number;
  startBy: number;
  mealAt: number;
  mealTitle: string;
  /** ahead: there is time. today: best started earlier today. short: it
   *  needed longer than is left before today began. */
  timing: 'ahead' | 'today' | 'short';
  done: boolean;
};

export function dishKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function markKey(scheduleItemId: string, dish: string): string {
  return `${scheduleItemId}|${dishKey(dish)}`;
}

/** What has to be started tonight, and what has to be started in tomorrow's
 *  waking hours, earliest first. */
export function planPrep(
  meals: PrepMeal[],
  own: OwnLead[],
  marks: ReadonlyMap<string, string>,
  now: number,
): { tonight: PrepLine[]; tomorrow: PrepLine[] } {
  const today = localDayOf(now);
  const todayStart = dayStartMs(today);
  const tomorrowStart = dayStartMs(today, 1);
  const tonightEnds = tomorrowStart + TONIGHT_ENDS_HOUR * HOUR;
  const tomorrowEnds = dayStartMs(today, 2);
  const ownByKey = new Map(own.map((lead) => [lead.key, lead]));
  const inOrder = [...meals].sort((a, b) => a.at - b.at);
  const tonight: PrepLine[] = [];
  const tomorrow: PrepLine[] = [];

  for (const meal of inOrder) {
    if (meal.at <= now) continue;
    const seen = new Set<string>();
    for (const dish of meal.dishes) {
      const key = dishKey(dish.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const lead = ownByKey.get(key) ?? (dish.recipeId ? prepLeadFor(dish.recipeId) : null);
      if (!lead || lead.hours <= 0 || lead.hours > MAX_PREP_HOURS) continue;
      if (lead.hours >= 48 && hasEarlierBatch(inOrder, meal, key)) continue;
      const startBy = meal.at - lead.hours * HOUR;
      if (startBy >= tomorrowEnds) continue;
      // A meal still to come today is tonight's business only while it can
      // still be started on time.
      if (meal.at < tomorrowStart && startBy < now) continue;
      const markedAt = marks.get(markKey(meal.scheduleItemId, dish.name));
      const done = markedAt !== undefined;
      if (done && startBy < todayStart && localDayOf(Date.parse(markedAt)) !== today) continue;
      const line: PrepLine = {
        key: markKey(meal.scheduleItemId, dish.name),
        dish: dish.name.trim(),
        kind: lead.kind,
        hours: lead.hours,
        startBy,
        mealAt: meal.at,
        mealTitle: meal.title,
        timing: startBy >= now ? 'ahead' : startBy >= todayStart ? 'today' : 'short',
        done,
      };
      (startBy < tonightEnds ? tonight : tomorrow).push(line);
    }
  }
  const order = (a: PrepLine, b: PrepLine) => a.startBy - b.startBy || a.mealAt - b.mealAt;
  return { tonight: tonight.sort(order), tomorrow: tomorrow.sort(order) };
}

function hasEarlierBatch(meals: PrepMeal[], meal: PrepMeal, key: string): boolean {
  const from = meal.at - BATCH_DAYS * 24 * HOUR;
  return meals.some(
    (other) => other.at >= from && other.at < meal.at && other.dishes.some((dish) => dishKey(dish.name) === key),
  );
}

// ------------------------------------------------------------------ words

export function lengthWords(hours: number, tr: Translate): string {
  if (hours >= 48 && hours % 24 === 0) return tr('{count} days', { count: hours / 24 });
  return hours === 1 ? tr('1 hour') : tr('{count} hours', { count: hours });
}

export function prepSentence(line: PrepLine, tr: Translate): string {
  return tr(PREP_SENTENCES[line.kind], { dish: tr(line.dish) });
}

/** A day and a time, such as "Tomorrow, 6pm". */
export function whenWords(ms: number, now: number, tr: Translate): string {
  return `${tr(dayLabel(localDayOf(ms), localDayOf(now)))}, ${clockLabel(ms)}`;
}

export function prepDetail(line: PrepLine, now: number, tr: Translate): string {
  const values = { length: lengthWords(line.hours, tr), when: whenWords(line.startBy, now, tr) };
  if (line.timing === 'short') return tr('It needs {length}, and the meal is sooner than that.', values);
  if (line.timing === 'today') return tr('It needs {length}. Best started by {when}.', values);
  return tr('It needs {length}. Start by {when}.', values);
}

export function prepMealWords(line: PrepLine, now: number, tr: Translate): string {
  return [tr(line.mealTitle), whenWords(line.mealAt, now, tr)].filter(Boolean).join(' · ');
}

// --------------------------------------------------------------- tomorrow

const TOMORROW_KINDS: TimelineKind[] = ['meal', 'dose', 'appointment', 'reminder', 'garden', 'routine', 'due', 'countdown', 'calendar'];
/** What the reminder speaks for when nothing has to be started. */
const DUE_KINDS: TimelineKind[] = ['appointment', 'due', 'countdown'];

export type TomorrowLine = {
  id: string;
  kind: TimelineKind;
  title: string;
  /** Null for something with no time. */
  at: number | null;
  notes: string[];
  route: TimelineRoute;
};

export type TomorrowExtras = {
  /** The food line a dose already has, by schedule row id. */
  doseLines: ReadonlyMap<string, string>;
  /** The notes on an appointment, by schedule row id: what to bring. */
  appointmentNotes: ReadonlyMap<string, string>;
};

/** The lines a closed vault keeps off the screen. */
export function keptClosed(kind: TimelineKind, closedCategories: readonly string[]): boolean {
  if (kind === 'dose') return closedCategories.includes('medications');
  if (kind === 'appointment') return closedCategories.includes('appointments');
  return false;
}

export function tomorrowLines(
  items: DayTimelineItem[],
  now: number,
  extras: TomorrowExtras,
  closedCategories: readonly string[] = [],
): TomorrowLine[] {
  const day = localDayOf(dayStartMs(localDayOf(now), 1));
  return items
    .filter((item) => item.day === day && item.status === 'planned' && TOMORROW_KINDS.includes(item.kind) && !keptClosed(item.kind, closedCategories))
    .map((item) => {
      const rowId = item.id.startsWith('schedule:') ? item.id.slice('schedule:'.length) : item.id;
      const added = item.kind === 'dose' ? extras.doseLines.get(rowId) : item.kind === 'appointment' ? extras.appointmentNotes.get(rowId) : undefined;
      return {
        id: item.id,
        kind: item.kind,
        title: item.title,
        at: item.allDay ? null : item.start,
        notes: [item.caption, added].filter((line): line is string => Boolean(line && line.trim())),
        route: item.route,
      };
    })
    .sort((a, b) => (a.at ?? -1) - (b.at ?? -1) || a.title.localeCompare(b.title));
}

/** Routines still ahead tonight. */
export function tonightRoutines(items: DayTimelineItem[], now: number): DayTimelineItem[] {
  const today = localDayOf(now);
  return items
    .filter((item) => item.kind === 'routine' && item.day === today && item.status === 'planned' && !item.allDay && item.start > now)
    .sort((a, b) => a.start - b.start);
}

// --------------------------------------------------------------- reminder

export const READY_NOTIFICATION_TITLE = 'Ready for Tomorrow';

/** What the evening reminder says, or null when there is nothing to start
 *  and nothing due. Doses are never named: each has a reminder already. */
export function readyReminder(
  tonight: PrepLine[],
  lines: TomorrowLine[],
  tr: Translate,
): { body: string; markKeys: string[] } | null {
  const starts = tonight.filter((line) => !line.done);
  const due = lines.filter((line) => DUE_KINDS.includes(line.kind));
  if (starts.length === 0 && due.length === 0) return null;
  const parts: string[] = [];
  for (const line of starts) parts.push(`${prepSentence(line, tr)}.`);
  if (due.length > 0) {
    parts.push(tr('Tomorrow: {list}.', { list: due.map((line) => (line.at === null ? tr(line.title) : `${tr(line.title)} (${clockLabel(line.at)})`)).join(', ') }));
  }
  return { body: parts.join(' '), markKeys: starts.map((line) => line.key) };
}

// A dish name may hold a comma, so the keys a notification carries are kept
// apart by a line break, which dishKey never leaves in a name.
export function joinMarkKeys(keys: string[]): string {
  return keys.join('\n');
}

export function splitMarkKeys(joined: string): string[] {
  return joined.split('\n').filter((key) => key.includes('|'));
}

/** Whether the Home band shows yet: from the person's evening time on. */
export function isReadyTime(now: Date, time: string): boolean {
  const [hour, minute] = time.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() >= hour * 60 + minute;
}

// ------------------------------------------- start-ahead times of the person's

/** Why a start-ahead time cannot be saved yet, or null when it can. */
export function ownLeadProblem(name: string, hoursText: string, tr: Translate): string | null {
  if (!dishKey(name)) return tr('Pick or type the dish first.');
  const hours = hoursFrom(hoursText);
  if (hours === null) return tr('Type how many hours ahead it has to be started, or 0 when it does not.');
  if (hours > MAX_PREP_HOURS) return tr('The longest is {count} hours, which is 60 days.', { count: MAX_PREP_HOURS });
  return null;
}

export function hoursFrom(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  const hours = Number(trimmed);
  return trimmed && Number.isFinite(hours) && hours >= 0 ? hours : null;
}
