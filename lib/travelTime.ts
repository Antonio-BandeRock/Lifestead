// Travel and dose times (A7). Every dose time in schedule_items is a
// wall-clock string with no zone ('YYYY-MM-DDTHH:MM'), which is what "shift
// to local" means: 7:00 AM rings at 7:00 AM wherever the phone is. A med set
// to keep home time instead reads that string on the home zone's clock, so
// the reminder rings at the same moment it would have rung at home.
//
// Pure, no React and no database, so scripts/test_travel_time.js can check
// it on a PC. Zone arithmetic goes through Intl; where the engine cannot do
// it every function answers null and the reminder stays on the local clock,
// which is what the app did before A7.

// Q14 (1.0.91.10) added 'step': the reminder starts where it rang before a
// change of time zone and moves toward the local clock a little each day,
// the way a body clock does.
export type TravelMode = 'local' | 'home' | 'step';

export const TRAVEL_MODES: { mode: TravelMode; label: string; detail: string }[] = [
  {
    mode: 'local',
    label: 'Move to local time',
    detail: 'The reminder rings at the same clock time wherever you are.',
  },
  {
    mode: 'home',
    label: 'Keep home time',
    detail: 'The reminder rings at the moment it would ring at home, whatever the clock says where you are.',
  },
  {
    mode: 'step',
    label: 'Move a step each day',
    detail: 'After a change of time zone the reminder rings when it rang before, then moves up to 2 hours a day until it matches the local clock.',
  },
];

// How far a stepped reminder moves in a day, in minutes.
export const STEP_MINUTES = 120;

export const TRAVEL_LEAD =
  'Which of these suits a med across time zones is a question for your prescriber. This only moves when the reminder rings; it never changes a dose.';

export function parseTravelMode(value: string | null | undefined): TravelMode {
  return value === 'home' || value === 'step' ? value : 'local';
}

// The zone the phone is set to right now, or null where the engine cannot say.
export function currentZone(): string | null {
  try {
    const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof zone === 'string' && zone ? zone : null;
  } catch {
    return null;
  }
}

// "America/Mexico_City" reads as "Mexico City", "Etc/GMT+5" and "UTC" as
// themselves.
export function zoneName(zone: string): string {
  if (!zone.includes('/') || zone.startsWith('Etc/')) return zone.replace(/^Etc\//, '');
  const last = zone.split('/').pop() ?? zone;
  return last.replace(/_/g, ' ');
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(zone: string): Intl.DateTimeFormat | null {
  const cached = formatters.get(zone);
  if (cached) return cached;
  try {
    const made = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    formatters.set(zone, made);
    return made;
  } catch {
    return null;
  }
}

// The zone's wall clock at an instant, read from "MM/DD/YYYY, HH:MM", the
// shape en-US gives with every engine this app runs on.
function wallParts(ms: number, zone: string): number[] | null {
  const formatter = formatterFor(zone);
  if (!formatter) return null;
  try {
    const match = /(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{2}):(\d{2})/.exec(formatter.format(new Date(ms)));
    if (!match) return null;
    const [, month, day, year, hour, minute] = match.map(Number);
    return [year, month, day, hour === 24 ? 0 : hour, minute];
  } catch {
    return null;
  }
}

// Minutes the zone is ahead of UTC at an instant (Mexico City in winter is -360).
export function zoneOffsetMinutes(ms: number, zone: string): number | null {
  const parts = wallParts(ms, zone);
  if (!parts) return null;
  const [year, month, day, hour, minute] = parts;
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const floored = Math.floor(ms / 60_000) * 60_000;
  return Math.round((asUtc - floored) / 60_000);
}

function parseWall(wall: string): number[] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(wall);
  return match ? match.slice(1).map(Number) : null;
}

// The instant a wall-clock time falls at in a zone. Across a clock change a
// time that happens twice takes the first, and one that never happens moves
// on by the size of the change, the way a phone's alarm does.
export function instantInZone(wall: string, zone: string): number | null {
  const parts = parseWall(wall);
  if (!parts) return null;
  const [year, month, day, hour, minute] = parts;
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = zoneOffsetMinutes(guess, zone);
  if (first === null) return null;
  let ms = guess - first * 60_000;
  const second = zoneOffsetMinutes(ms, zone);
  if (second === null) return null;
  if (second !== first) {
    const retry = guess - second * 60_000;
    const third = zoneOffsetMinutes(retry, zone);
    ms = third === second ? retry : Math.min(ms, retry);
  }
  return ms;
}

const pad = (n: number) => String(n).padStart(2, '0');

// The wall clock in a zone at an instant, as 'YYYY-MM-DDTHH:MM'.
export function wallInZone(ms: number, zone: string): string | null {
  const parts = wallParts(ms, zone);
  if (!parts) return null;
  const [year, month, day, hour, minute] = parts;
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

// Away means the home clock and this one read differently right now. Two
// zone names that keep the same time (Monterrey and Mexico City) are not away.
export function isAway(homeZone: string | null, here: string | null, nowMs: number): boolean {
  if (!homeZone || !here || homeZone === here) return false;
  const home = zoneOffsetMinutes(nowMs, homeZone);
  const local = zoneOffsetMinutes(nowMs, here);
  return home !== null && local !== null && home !== local;
}

// A dose time set to keep home time, read on the clock where the phone is.
// Null when nothing moves: the med is on local time, the person is home, or
// the engine cannot work the zones out.
export function homeDoseHere(
  wall: string,
  mode: TravelMode,
  homeZone: string | null,
  here: string | null,
  nowMs: number,
): string | null {
  if (mode !== 'home' || !homeZone || !here || !isAway(homeZone, here, nowMs)) return null;
  const instant = instantInZone(wall, homeZone);
  if (instant === null) return null;
  const moved = wallInZone(instant, here);
  return moved && moved !== wall.slice(0, 16) ? moved : null;
}

// A trip: the zone the phone was on before this one, and the local day the
// change was noticed. From is null on the first day the app ever looked,
// since nothing was there before to step from.
export type TravelTrip = { from: string | null; since: string };

function dayNumber(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return match ? Math.round(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000) : null;
}

// A dose time on a stepped med, read on the clock where the phone is (Q14).
// On the day of the change it rings at the moment it rang on the old clock;
// each day after it moves up to stepMinutes toward the local time, the
// shorter way round, and once it gets there it stays. Works the same going
// away and coming home. Null when nothing moves.
export function stepDoseHere(
  wall: string,
  fromZone: string | null,
  here: string | null,
  since: string,
  stepMinutes: number = STEP_MINUTES,
): string | null {
  if (!fromZone || !here || fromZone === here) return null;
  const local = instantInZone(wall, here);
  const before = instantInZone(wall, fromZone);
  const doseDay = dayNumber(wall);
  const startDay = dayNumber(since);
  if (local === null || before === null || doseDay === null || startDay === null) return null;
  let diff = Math.round((local - before) / 60_000);
  diff = ((diff % 1440) + 1440) % 1440;
  if (diff > 720) diff -= 1440;
  if (diff === 0) return null;
  const days = Math.max(0, doseDay - startDay);
  const covered = Math.min(Math.abs(diff), Math.max(0, stepMinutes) * days);
  const remaining = diff - Math.sign(diff) * covered;
  if (remaining === 0) return null;
  const moved = wallInZone(local - remaining * 60_000, here);
  return moved && moved !== wall.slice(0, 16) ? moved : null;
}

export type TravelContext = { homeZone: string | null; here: string | null; trip: TravelTrip | null };

// The one reader every screen and the reminders share: where a dose time
// lands on this phone's clock for the med's choice. Null when it stays put.
export function doseWallHere(wall: string, mode: TravelMode, context: TravelContext, nowMs: number): string | null {
  if (mode === 'home') return homeDoseHere(wall, mode, context.homeZone, context.here, nowMs);
  if (mode === 'step' && context.trip) return stepDoseHere(wall, context.trip.from, context.here, context.trip.since);
  return null;
}

// What the phone remembers about time zones, in a plain file on the device
// (lib/travelNotice.ts): the zone it was last on, the trip that began there,
// which meds were asked about on this trip, and answers given on a locked
// phone that are still to be written. Treatment ids only, never a name.
export type TravelNoticeState = {
  zone: string | null;
  from: string | null;
  since: string;
  asked: string[];
  answers: Record<string, TravelMode>;
};

export function emptyTravelNotice(today: string): TravelNoticeState {
  return { zone: null, from: null, since: today, asked: [], answers: {} };
}

export function parseTravelNotice(text: string | null | undefined): TravelNoticeState | null {
  if (!text) return null;
  try {
    const raw = JSON.parse(text) as Partial<TravelNoticeState>;
    if (!raw || typeof raw !== 'object' || typeof raw.since !== 'string') return null;
    const answers: Record<string, TravelMode> = {};
    for (const [id, mode] of Object.entries(raw.answers ?? {})) {
      if (typeof mode === 'string') answers[id] = parseTravelMode(mode);
    }
    return {
      zone: typeof raw.zone === 'string' ? raw.zone : null,
      from: typeof raw.from === 'string' ? raw.from : null,
      since: raw.since,
      asked: Array.isArray(raw.asked) ? raw.asked.filter((id): id is string => typeof id === 'string') : [],
      answers,
    };
  } catch {
    return null;
  }
}

// Called whenever the reminders are worked out. A zone whose clock reads the
// same as the last one (Monterrey after Mexico City) is not a trip; any
// other starts one today, stepping from the zone before and asking afresh.
export function noticeZone(state: TravelNoticeState | null, here: string | null, nowMs: number, today: string): TravelNoticeState {
  const base = state ?? emptyTravelNotice(today);
  if (!here) return base;
  if (!base.zone) return { ...base, zone: here, from: null, since: today, asked: [] };
  if (base.zone === here || !isAway(base.zone, here, nowMs)) return base;
  return { ...base, zone: here, from: base.zone, since: today, asked: [] };
}

export function tripOf(state: TravelNoticeState | null): TravelTrip | null {
  return state && state.from ? { from: state.from, since: state.since } : null;
}

// The question is asked only on a trip away from home, never on the way
// back, and only for a med that has no choice saved yet.
export function shouldAskTravel(state: TravelNoticeState, homeZone: string | null, nowMs: number): boolean {
  return state.from !== null && isAway(homeZone, state.zone, nowMs);
}

export function nextToAsk(state: TravelNoticeState, unchosen: string[]): string | null {
  return unchosen.find((id) => !state.asked.includes(id) && !(id in state.answers)) ?? null;
}

export function markAsked(state: TravelNoticeState, treatmentId: string): TravelNoticeState {
  return state.asked.includes(treatmentId) ? state : { ...state, asked: [...state.asked, treatmentId] };
}

export const TRAVEL_ACTION_MODES: Record<string, TravelMode> = {
  travelHome: 'home',
  travelLocal: 'local',
  travelStep: 'step',
};

// A button press, kept until the records can be opened.
export function answerTravel(state: TravelNoticeState, actionIdentifier: string, treatmentId: string): TravelNoticeState {
  const mode = TRAVEL_ACTION_MODES[actionIdentifier];
  if (!mode || !treatmentId) return state;
  return { ...markAsked(state, treatmentId), answers: { ...state.answers, [treatmentId]: mode } };
}

export function withoutAnswers(state: TravelNoticeState, written: string[]): TravelNoticeState {
  const answers = { ...state.answers };
  for (const id of written) delete answers[id];
  return { ...state, answers };
}

type Words = { en: string; values?: Record<string, string> };

// The question on the locked phone. A hidden reminder names no med.
export function travelQuestionText(here: string, medName: string, hidden: boolean): { title: Words; body: Words } {
  return {
    title: { en: 'You are on {zone} time now', values: { zone: zoneName(here) } },
    body: hidden
      ? { en: 'When should the reminders for one of your meds ring? This moves only the reminder, never the dose.' }
      : { en: 'When should the {med} reminder ring? This moves only the reminder, never the dose.', values: { med: medName } },
  };
}

function clock(wall: string): string {
  const [hour, minute] = wall.slice(11, 16).split(':').map(Number);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${pad(minute)} ${suffix}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// " · 3:00 PM here" under a dose kept on home time, with the day named when
// the move crosses midnight.
export function hereCaption(homeWall: string, hereWall: string): string {
  const sameDay = homeWall.slice(0, 10) === hereWall.slice(0, 10);
  const day = sameDay ? '' : `${Number(hereWall.slice(8, 10))} ${MONTHS[Number(hereWall.slice(5, 7)) - 1]}, `;
  return ` · ${day}${clock(hereWall)} here`;
}

// The line under a reminder: "7:00 AM home time (Mexico City)".
export function homeTimeWords(homeWall: string, homeZone: string): string {
  return `${clock(homeWall)} home time (${zoneName(homeZone)})`;
}

export function awayLine(homeZone: string, here: string, homeCount: number, stepCount = 0): string {
  const lead = `You are on ${zoneName(here)} time, and home is ${zoneName(homeZone)}.`;
  if (homeCount === 0 && stepCount === 0) return `${lead} Every med here moves to local time, so each reminder rings at its usual clock time.`;
  if (stepCount === 0) {
    const meds = homeCount === 1 ? '1 med keeps' : `${homeCount} meds keep`;
    return `${lead} ${meds} home time; its dose rows say when that is here.`;
  }
  const parts: string[] = [];
  if (homeCount > 0) parts.push(homeCount === 1 ? '1 med keeps home time' : `${homeCount} meds keep home time`);
  parts.push(stepCount === 1 ? '1 med moves a step each day' : `${stepCount} meds move a step each day`);
  return `${lead} ${parts.join(', and ')}; the dose rows say when each rings here.`;
}

export function modeLine(mode: TravelMode, homeZone: string | null): string {
  if (mode === 'home') {
    return homeZone
      ? `Keeps home time: while you are away, the reminder rings when it is due on ${zoneName(homeZone)} time.`
      : 'Keeps home time.';
  }
  if (mode === 'step') {
    return 'Moves a step each day: after a change of time zone the reminder rings when it rang before, then moves up to 2 hours a day until it matches the local clock.';
  }
  return 'Moves to local time: the reminder rings at the same clock time wherever you are.';
}
