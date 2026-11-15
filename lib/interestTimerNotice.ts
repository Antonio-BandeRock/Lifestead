// The notification that stays up while a timer runs on Interests > Sessions
// (2026-11-15). Until then a running timer showed only on the Sessions lens,
// so one started and then forgotten ran on unseen until the lens was opened
// again. It carries one button, Stop and Keep, which works on a locked phone
// like every other notification button (lib/reminderActions.ts): the press is
// kept in a plain file holding the session id and the moment it was pressed,
// and the session is stopped at that moment once the records can be opened.
// Throw Away stays on the lens, since a press on the lock screen that throws
// time away cannot be taken back.
//
// Pure on purpose, so scripts/test_interest_sessions.js can check it without
// a phone. lib/reminderNotifications.ts posts it and answers the press.

import { clockOf } from './interestSessions';

export const INTEREST_TIMER_PREFIX = 'inside-story-interest-timer-';
export const INTEREST_TIMER_FILE_NAME = 'interest-timer-stops.json';

export function interestTimerIdentifier(sessionId: string): string {
  return INTEREST_TIMER_PREFIX + sessionId;
}

export function sessionIdFromTimerIdentifier(identifier: string): string | null {
  return identifier.startsWith(INTEREST_TIMER_PREFIX) ? identifier.slice(INTEREST_TIMER_PREFIX.length) || null : null;
}

/** The words on the notification. With details hidden on the lock screen the
 *  interest is not named. */
export function interestTimerText(
  interestName: string | null,
  startedAt: string,
  hidden: boolean,
): { title: { en: string; values?: Record<string, string> }; body: { en: string; values?: Record<string, string> } } {
  const clock = clockOf(startedAt);
  const title = hidden || !interestName ? { en: 'A timer is running' } : { en: 'Timer running: {name}', values: { name: interestName } };
  const body = clock
    ? { en: 'Started at {clock}. Stop and Keep saves the time so far as a session.', values: { clock } }
    : { en: 'Stop and Keep saves the time so far as a session.' };
  return { title, body };
}

/** Stop presses not yet written, by session id, each with when it was pressed. */
export type InterestTimerStops = Record<string, number>;

export function addTimerStop(stops: InterestTimerStops, sessionId: string, pressedAtMs: number): InterestTimerStops {
  if (!sessionId || stops[sessionId] !== undefined) return stops;
  return { ...stops, [sessionId]: pressedAtMs };
}

export function parseTimerStops(text: string): InterestTimerStops {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const stops: InterestTimerStops = {};
    for (const [id, at] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof at === 'number' && Number.isFinite(at)) stops[id] = at;
    }
    return stops;
  } catch {
    return {};
  }
}
