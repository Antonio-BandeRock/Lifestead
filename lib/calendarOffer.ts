// Events on the phone's calendar offered to Appointments (direct request,
// 2026-11-02: "it would be very useful to provide the calendar event
// notifications. The app itself is supposed to help the adhd person and
// autistic person fill the gaps").
//
// Somebody who keeps a calendar already wrote the appointment down once, and
// Schedules > Appointments only knew about it if they opened the import and
// picked it by hand. So the reminder reconcile looks at the calendar itself:
// an event in the next two weeks that no appointment is linked to, and that
// was never offered, comes up as a notification asking whether to add it.
// Nothing is added without a press, and every event is asked about once.
//
// THE RULES IT KEEPS.
//   - It only reads a calendar the person already let the app read, from
//     Appointments' import. The reconcile never asks for the permission.
//   - All-day events are left out (birthdays, holidays), the same as the
//     import, since an appointment has an hour.
//   - Three offers a day at most, nearest first, between 9 in the morning
//     and 9 at night, so a full calendar comes up a few at a time rather
//     than all at once on the first day.
//   - All three buttons work on the locked phone (1.0.67.1). Add to
//     Appointments keeps the event's id and start in a plain file beside
//     the backup offer's; the next time the app is open the event is read
//     again from the calendar and written as an appointment linked to it,
//     so the file never holds what the event is called or where it is.
//   - A repeating event shares one id across its days, so it is asked about
//     once, and adding it adds the day that was offered.
//
// Pure apart from the file at the bottom, which scripts/test_calendar_offer.js
// stubs.

import { File, Paths } from 'expo-file-system';
import { t } from './i18n';

export const CALENDAR_OFFER_PREFIX = 'inside-story-calendar-offer-';
export const CALENDAR_OFFER_FILE_NAME = 'calendar-offer.json';
export const CALENDAR_OFFER_WINDOW_DAYS = 14;
export const CALENDAR_OFFERS_PER_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
/** How long an answered event is remembered after it has gone by. */
const REMEMBER_PAST_DAYS = 30;

export type CalendarEventLike = {
  id: string;
  title: string;
  /** ISO. */
  startDate: string;
  endDate: string;
  location: string | null;
  notes: string | null;
};

export type CalendarOfferState = {
  /** Event id to when it was offered and when it starts, both epoch ms. */
  offered: Record<string, { at: number; startsAt: number }>;
  /** Add to Appointments pressed, waiting for the app to be open. */
  toAdd: { eventId: string; startsAt: number }[];
  /** Stop Asking pressed, waiting to turn the switch off in Profile > Reminders. */
  stopWaiting: boolean;
};

export const EMPTY_CALENDAR_OFFER_STATE: CalendarOfferState = { offered: {}, toAdd: [], stopWaiting: false };

/**
 * The events to offer now, nearest first: starting later than now and
 * within the window, not linked to an appointment, never offered, and no
 * more than the day's room allows.
 */
export function eventsToOffer<T extends CalendarEventLike>(
  events: readonly T[],
  linkedIds: ReadonlySet<string>,
  state: CalendarOfferState,
  now: Date,
): T[] {
  if (state.stopWaiting) return [];
  const hour = now.getHours();
  if (hour < 9 || hour >= 21) return [];
  const at = now.getTime();
  const offeredToday = Object.values(state.offered).filter((offer) => at - offer.at < DAY_MS).length;
  const room = CALENDAR_OFFERS_PER_DAY - offeredToday;
  if (room <= 0) return [];
  const until = at + CALENDAR_OFFER_WINDOW_DAYS * DAY_MS;
  const seen = new Set<string>();
  return events
    .filter((event) => {
      const starts = Date.parse(event.startDate);
      if (!Number.isFinite(starts) || starts <= at || starts > until) return false;
      if (linkedIds.has(event.id) || state.offered[event.id] || seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    })
    .sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate))
    .slice(0, room);
}

/** The state with these events marked offered, and long-past ones forgotten. */
export function markOffered(state: CalendarOfferState, events: readonly CalendarEventLike[], now: Date): CalendarOfferState {
  const at = now.getTime();
  const offered: CalendarOfferState['offered'] = {};
  for (const [id, offer] of Object.entries(state.offered)) {
    if (offer.startsAt >= at - REMEMBER_PAST_DAYS * DAY_MS) offered[id] = offer;
  }
  for (const event of events) offered[event.id] = { at, startsAt: Date.parse(event.startDate) };
  return { ...state, offered };
}

/** One notification per event, so a short, stable identifier from its id. */
export function calendarOfferIdentifier(eventId: string): string {
  let hash = 5381;
  for (let i = 0; i < eventId.length; i += 1) hash = ((hash * 33) ^ eventId.charCodeAt(i)) >>> 0;
  return CALENDAR_OFFER_PREFIX + hash.toString(36);
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "today at 3:00 pm", "tomorrow at 9:30 am", "Friday, November 7 at 2:00 pm". */
export function describeWhen(startDate: string, now: Date): string {
  const start = new Date(startDate);
  const hour = start.getHours();
  const time = `${hour % 12 === 0 ? 12 : hour % 12}:${String(start.getMinutes()).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`;
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (sameDay(start, now)) return t('today at {time}', { time });
  if (sameDay(start, tomorrow)) return t('tomorrow at {time}', { time });
  return t('{weekday}, {month} {day} at {time}', {
    weekday: t(WEEKDAYS[start.getDay()]),
    month: t(MONTHS[start.getMonth()]),
    day: start.getDate(),
    time,
  });
}

/**
 * The words. With reminders set to say only their kind (Profile > App Lock),
 * the event's name stays off the locked screen and only the day is said.
 */
export function calendarOfferText(event: CalendarEventLike, now: Date, kindOnly: boolean): { title: string; body: string } {
  const when = describeWhen(event.startDate, now);
  if (kindOnly) {
    return {
      title: t('An event on your calendar'),
      body: t('Your calendar has something {when}. Add it to Appointments so it is reminded about with everything else?', { when }),
    };
  }
  return {
    title: t('Add {title} to Appointments?', { title: event.title }),
    body: t('Your calendar has {title} {when}. Add to Appointments puts it with the rest of your day, linked to the calendar.', {
      title: event.title,
      when,
    }),
  };
}

/** What kind of appointment the event's name says it is, or Other. */
export function appointmentTypeFromTitle(title: string): string {
  if (/\b(?:labs?|lab work|bloodwork|blood work|blood tests?|blood draw)\b/i.test(title)) return 'lab_draw';
  if (/\b(?:nutritionist|dietitian|dietician)\b/i.test(title)) return 'nutritionist';
  if (/\b(?:trainer|personal training|training session)\b/i.test(title)) return 'trainer';
  if (/\b(?:doctor|dr\.?|physician|gp|dentist|surgeon|specialist|check-?up|clinic|[a-z]+ologist|nurse practitioner)(?![a-z])/i.test(title)) {
    return 'doctor';
  }
  return 'other';
}

/** The event's length in minutes, when it is a sensible one. */
export function eventMinutes(event: CalendarEventLike): number | null {
  const span = Math.round((Date.parse(event.endDate) - Date.parse(event.startDate)) / 60000);
  return span >= 1 && span <= 1440 ? span : null;
}

/** 'YYYY-MM-DDTHH:mm' in local time, the way an appointment is stored. */
export function localDateTimeOf(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** What a press does to the state; the add itself is written later. */
export function answerCalendarOffer(
  state: CalendarOfferState,
  actionIdentifier: string,
  eventId: string,
  startsAt: number,
): CalendarOfferState {
  if (actionIdentifier === 'calendarAdd' && eventId && !state.toAdd.some((item) => item.eventId === eventId)) {
    return { ...state, toAdd: [...state.toAdd, { eventId, startsAt }] };
  }
  if (actionIdentifier === 'calendarStop') return { ...state, stopWaiting: true };
  return state;
}

export function parseCalendarOfferState(text: string): CalendarOfferState | null {
  try {
    const parsed = JSON.parse(text) as Partial<CalendarOfferState>;
    const offered: CalendarOfferState['offered'] = {};
    if (parsed.offered && typeof parsed.offered === 'object') {
      for (const [id, offer] of Object.entries(parsed.offered)) {
        if (offer && typeof offer.at === 'number' && typeof offer.startsAt === 'number') offered[id] = offer;
      }
    }
    const toAdd = Array.isArray(parsed.toAdd)
      ? parsed.toAdd.filter((item) => item && typeof item.eventId === 'string' && typeof item.startsAt === 'number')
      : [];
    return { offered, toAdd, stopWaiting: parsed.stopWaiting === true };
  } catch {
    return null;
  }
}

export function readCalendarOfferState(): CalendarOfferState {
  try {
    const file = new File(Paths.document, CALENDAR_OFFER_FILE_NAME);
    if (file.exists) return parseCalendarOfferState(file.textSync()) ?? { ...EMPTY_CALENDAR_OFFER_STATE };
  } catch (error) {
    console.error('[calendarOffer] the offer file could not be read', error);
  }
  return { ...EMPTY_CALENDAR_OFFER_STATE };
}

export function writeCalendarOfferState(state: CalendarOfferState): void {
  try {
    const file = new File(Paths.document, CALENDAR_OFFER_FILE_NAME);
    if (!file.exists) file.create();
    file.write(JSON.stringify(state));
  } catch (error) {
    console.error('[calendarOffer] the offer file could not be written', error);
  }
}
