// Sessions on an interest (2026-10-30, Interests stage 2): time spent doing
// it, typed afterwards or kept by a timer, with an optional note, project
// and where it was left off. Pure: no database, no clock read except the one
// passed in, so scripts/test_interest_sessions.js checks all of it.
//
// Nothing here counts a run of days, compares one week with another or says
// how much is enough. A session is a record of time given to something, and
// a week with none is a week with none, never a week missed.

import { cleanInterestText, formatInterestDay, localDayOf, readStartedOn } from './interests';

export type InterestSession = {
  id: string;
  interestId: string;
  projectId: string | null;
  /** The local day it happened, 'YYYY-MM-DD'. */
  doneOn: string;
  /** When the timer started, for a timed session. */
  startedAt: string | null;
  /** How long, or null when it was not timed. */
  minutes: number | null;
  note: string | null;
  leftOff: string | null;
  /** A timer still going. Read only by the timer band, never counted. */
  running: boolean;
  createdAt: string;
};

/** A day is the most a single session can be. */
export const MAX_SESSION_MINUTES = 24 * 60;

/**
 * Reads how long it took, as somebody would say it: "45", "45 min",
 * "1h 20m", "1:20", "1.5 hours", "an hour", "half an hour". Empty means
 * not timed. Anything else is not read, so the form asks again.
 */
export function readDuration(words: string): { ok: boolean; minutes: number | null } {
  const text = cleanInterestText(words).toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return { ok: true, minutes: null };
  let minutes: number | null = null;
  let match: RegExpMatchArray | null;
  if ((match = text.match(/^(\d+(?:\.\d+)?)$/))) minutes = Number(match[1]);
  else if ((match = text.match(/^(\d{1,2}):(\d{2})$/)) && Number(match[2]) < 60) minutes = Number(match[1]) * 60 + Number(match[2]);
  else if (text === 'an hour' || text === 'one hour' || text === 'hour') minutes = 60;
  else if (text === 'half an hour' || text === 'half hour') minutes = 30;
  else if (text === 'an hour and a half' || text === 'hour and a half') minutes = 90;
  else {
    const parts = text.match(/^(?:(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours))?\s*(?:(\d+)\s*(?:m|min|mins|minute|minutes))?$/);
    if (parts && (parts[1] || parts[2])) minutes = Number(parts[1] ?? 0) * 60 + Number(parts[2] ?? 0);
  }
  if (minutes === null || !Number.isFinite(minutes)) return { ok: false, minutes: null };
  const rounded = Math.round(minutes);
  if (rounded < 1 || rounded > MAX_SESSION_MINUTES) return { ok: false, minutes: null };
  return { ok: true, minutes: rounded };
}

/** "45 minutes", "1 hour", "2 hours 5 minutes". */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const h = hours === 1 ? '1 hour' : `${hours} hours`;
  const m = rest === 1 ? '1 minute' : `${rest} minutes`;
  if (hours === 0) return m;
  if (rest === 0) return h;
  return `${h} ${m}`;
}

/** What a stopped timer comes to, at least a minute. */
export function timerMinutes(startedAt: string, now: Date): number {
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return 1;
  const minutes = Math.round((now.getTime() - start) / 60000);
  return Math.min(MAX_SESSION_MINUTES, Math.max(1, minutes));
}

function clockOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours < 12 ? 'am' : 'pm';
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelve}:${minutes} ${suffix}`;
}

/** "Started 3:05 pm, 25 minutes so far." A timer left from another day says the day. */
export function describeTimer(startedAt: string, now: Date): string {
  const so = timerMinutes(startedAt, now);
  const day = localDayOf(startedAt);
  const when = day === localDayOf(now.toISOString()) ? clockOf(startedAt) : `${clockOf(startedAt)} on ${formatInterestDay(day)}`;
  return `Started ${when}, ${formatMinutes(so)} so far.`;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function shiftDay(day: string, by: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d + by);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function weekdayOf(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/**
 * The day a session happened, as somebody would say it afterwards: empty or
 * "today", "yesterday", "3 days ago", a weekday (the most recent one, today
 * included), "28 October", "October 28", or a whole date. A day that has not
 * come yet is not read.
 */
export function readSessionDay(words: string, today: string): { ok: boolean; day: string | null } {
  const text = cleanInterestText(words).toLowerCase().replace(/,/g, '').replace(/^(last|on)\s+/, '');
  if (!text || text === 'today') return { ok: true, day: today };
  if (text === 'yesterday') return { ok: true, day: shiftDay(today, -1) };
  let match: RegExpMatchArray | null;
  if ((match = text.match(/^(\d{1,3}) days? ago$/))) return { ok: true, day: shiftDay(today, -Number(match[1])) };
  const weekday = text.length >= 3 ? WEEKDAYS.findIndex((name) => name.startsWith(text)) : -1;
  if (weekday >= 0) {
    const back = (weekdayOf(today) - weekday + 7) % 7;
    return { ok: true, day: shiftDay(today, -back) };
  }
  const monthOf = (word: string) => (word.length >= 3 ? MONTHS.findIndex((month) => month.startsWith(word)) : -1);
  let month = -1;
  let date = 0;
  if ((match = text.match(/^(\d{1,2})\s+([a-z]+)$/)) && monthOf(match[2]) >= 0) {
    month = monthOf(match[2]);
    date = Number(match[1]);
  } else if ((match = text.match(/^([a-z]+)\s+(\d{1,2})$/)) && monthOf(match[1]) >= 0) {
    month = monthOf(match[1]);
    date = Number(match[2]);
  }
  if (month >= 0) {
    if (date < 1 || date > 31) return { ok: false, day: null };
    const pad = (n: number) => String(n).padStart(2, '0');
    let year = Number(today.slice(0, 4));
    let day = `${year}-${pad(month + 1)}-${pad(date)}`;
    // "28 December" said in January is last December.
    if (day > today) {
      year -= 1;
      day = `${year}-${pad(month + 1)}-${pad(date)}`;
    }
    return { ok: true, day };
  }
  const whole = readStartedOn(words, today);
  if (whole.ok && whole.startedOn && whole.startedOn.length === 10) return { ok: true, day: whole.startedOn };
  return { ok: false, day: null };
}

/** "Today", "Yesterday", or "28 October 2026". */
export function describeSessionDay(day: string, today: string): string {
  if (day === today) return 'Today';
  if (day === shiftDay(today, -1)) return 'Yesterday';
  return formatInterestDay(day);
}

/** The line under a session: its day, how long, and the project it was for. */
export function describeSessionLine(session: Pick<InterestSession, 'doneOn' | 'minutes'>, today: string, projectName?: string | null): string {
  const parts = [describeSessionDay(session.doneOn, today), session.minutes === null ? 'not timed' : formatMinutes(session.minutes)];
  if (projectName) parts.push(projectName);
  return parts.join(' · ');
}

/** Finished sessions by month, newest first, a running timer left out. */
export function groupSessionsByMonth<T extends Pick<InterestSession, 'doneOn' | 'running' | 'createdAt'>>(
  sessions: readonly T[],
): { month: string; label: string; sessions: T[] }[] {
  const sorted = sessions
    .filter((session) => !session.running)
    .slice()
    .sort((a, b) => b.doneOn.localeCompare(a.doneOn) || b.createdAt.localeCompare(a.createdAt));
  const groups: { month: string; label: string; sessions: T[] }[] = [];
  for (const session of sorted) {
    const month = session.doneOn.slice(0, 7);
    let group = groups[groups.length - 1];
    if (!group || group.month !== month) {
      const [y, m] = month.split('-').map(Number);
      const label = `${MONTHS[m - 1].charAt(0).toUpperCase()}${MONTHS[m - 1].slice(1)} ${y}`;
      group = { month, label, sessions: [] };
      groups.push(group);
    }
    group.sessions.push(session);
  }
  return groups;
}

/**
 * What a month of sessions comes to, in plain counts: "4 sessions, 3 hours
 * 10 minutes timed". Untimed sessions are counted, never given a length.
 */
export function describeSessionTotal(sessions: readonly Pick<InterestSession, 'minutes' | 'running'>[]): string {
  const done = sessions.filter((session) => !session.running);
  const timed = done.filter((session) => session.minutes !== null);
  const minutes = timed.reduce((sum, session) => sum + (session.minutes ?? 0), 0);
  const count = done.length === 1 ? '1 session' : `${done.length} sessions`;
  if (timed.length === 0) return count;
  return `${count}, ${formatMinutes(minutes)} timed`;
}

// --- the practice reminder ---------------------------------------------------

/** Weekday numbers as Date.getDay() gives them, stored "1,3,5". */
export function readPracticeDays(stored: string | null): number[] {
  if (!stored) return [];
  return [...new Set(stored.split(',').map((part) => Number(part.trim())))]
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    .sort((a, b) => a - b);
}

export function writePracticeDays(days: readonly number[]): string | null {
  const clean = readPracticeDays(days.join(','));
  return clean.length ? clean.join(',') : null;
}

/** 'HH:MM' from what was typed: "7", "7pm", "19:30", "7:30 am". */
export function readPracticeTime(words: string): string | null {
  const text = words.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  if (minutes > 59) return null;
  if (match[3]) {
    if (hours < 1 || hours > 12) return null;
    if (match[3] === 'pm' && hours !== 12) hours += 12;
    if (match[3] === 'am' && hours === 12) hours = 0;
  } else if (hours > 23) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** "7:30 pm" from 'HH:MM'. */
export function formatPracticeTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h < 12 ? 'am' : 'pm';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:${String(m).padStart(2, '0')} ${suffix}`;
}

export const PRACTICE_DAY_PILLS: { day: number; label: string }[] = [1, 2, 3, 4, 5, 6, 0].map((day) => ({ day, label: SHORT_WEEKDAYS[day] }));

/** "Every day at 7:30 pm", "Monday, Wednesday and Friday at 7:30 pm", or null when none is set. */
export function describePractice(days: readonly number[], time: string | null): string | null {
  if (!days.length || !time) return null;
  const at = formatPracticeTime(time);
  if (days.length === 7) return `Every day at ${at}`;
  const ordered = [1, 2, 3, 4, 5, 6, 0].filter((day) => days.includes(day)).map((day) => WEEKDAY_LABELS[day]);
  const named = ordered.length === 1 ? ordered[0] : `${ordered.slice(0, -1).join(', ')} and ${ordered[ordered.length - 1]}`;
  return `${named} at ${at}`;
}

/** Whether a practice reminder falls on this local day. */
export function practiceFallsOn(days: readonly number[], day: string): boolean {
  return days.includes(weekdayOf(day));
}

/** The reminder's wording: an offer of time, never a nudge about missing it. */
export function practiceReminderText(interestName: string, leftOff: string | null): { title: string; body: string } {
  return {
    title: `Time for ${interestName}`,
    body: leftOff ? `Where you left off: ${leftOff}` : 'Your practice time, if today suits.',
  };
}

/** Whether today already has a session for this interest, so Done adds nothing twice. */
export function hasSessionOn(sessions: readonly Pick<InterestSession, 'interestId' | 'doneOn' | 'running'>[], interestId: string, day: string): boolean {
  return sessions.some((session) => session.interestId === interestId && session.doneOn === day && !session.running);
}

/** The practice reminder's moments from now through the days ahead, on the
 *  chosen weekdays at the chosen time, in the phone's local time. Today's
 *  is included only while it is still ahead. */
export function practiceFireTimes(days: readonly number[], time: string | null, now: Date, lookaheadDays: number): Date[] {
  if (!time || days.length === 0) return [];
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return [];
  const out: Date[] = [];
  for (let offset = 0; offset <= lookaheadDays; offset += 1) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hours, minutes, 0, 0);
    if (!days.includes(at.getDay())) continue;
    if (at.getTime() <= now.getTime()) continue;
    out.push(at);
  }
  return out;
}
