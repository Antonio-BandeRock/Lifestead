// Where a person stands in a course and what a sitting offers (2026-11-05). Pure,
// worked out each time from the cards and the replayed answers, with nothing
// stored but the units opened by hand.
//
// Counts of what is ready are shown on the course screens, a written exception
// to Learn's rule of never counting what waits, by direct request. The words
// stay "ready": nothing here is overdue or late, and a missed day changes
// nothing but what is ready the next time.

import type { CourseCard } from './learnCourseFile';
import { isLearned, type CourseCardState } from './learnCourseSchedule';

export const DEFAULT_DAILY_NEW = 15;
export const COURSE_SITTING_SIZE = 20;
/** A long list of ready cards still leaves room for this many new ones. */
const NEW_KEPT_ROOM = 5;
/** The share of a unit's Core cards to have learned before the next unit opens. */
export const UNIT_OPENS_AT = 0.8;

export type CourseStates = Map<string, CourseCardState>;

export type UnitStanding = {
  unit: number;
  name: string;
  total: number;
  learned: number;
  ready: number;
  fresh: number;
  coreTotal: number;
  coreLearned: number;
  open: boolean;
  openedByHand: boolean;
};

export function isReady(state: CourseCardState | undefined, today: string): boolean {
  return !!state && state.readyOn <= today;
}

function unitNumbers(cards: CourseCard[]): number[] {
  return [...new Set(cards.map((card) => card.unit))].sort((a, b) => a - b);
}

/** The first unit is open, a unit whose Core cards are 80% learned opens the next, and any unit can be opened by hand. */
export function openUnits(cards: CourseCard[], states: CourseStates, openedByHand: number[]): Set<number> {
  const units = unitNumbers(cards);
  const open = new Set<number>(openedByHand);
  if (units.length > 0) open.add(units[0]);
  units.forEach((unit, index) => {
    if (!open.has(unit) || index + 1 >= units.length) return;
    const core = cards.filter((card) => card.unit === unit && card.status === 'Core');
    const learned = core.filter((card) => isLearned(states.get(card.id))).length;
    if (core.length === 0 || learned / core.length >= UNIT_OPENS_AT) open.add(units[index + 1]);
  });
  return open;
}

export function unitStandings(cards: CourseCard[], states: CourseStates, openedByHand: number[], today: string): UnitStanding[] {
  const open = openUnits(cards, states, openedByHand);
  return unitNumbers(cards).map((unit) => {
    const inUnit = cards.filter((card) => card.unit === unit);
    const core = inUnit.filter((card) => card.status === 'Core');
    return {
      unit,
      name: inUnit[0]?.unitName ?? '',
      total: inUnit.length,
      learned: inUnit.filter((card) => isLearned(states.get(card.id))).length,
      ready: inUnit.filter((card) => isReady(states.get(card.id), today)).length,
      fresh: inUnit.filter((card) => !states.has(card.id)).length,
      coreTotal: core.length,
      coreLearned: core.filter((card) => isLearned(states.get(card.id))).length,
      open: open.has(unit),
      openedByHand: openedByHand.includes(unit),
    };
  });
}

/** How many new cards today still has room for. Worked out from the answers, so no counter can drift. */
export function newLeftToday(states: CourseStates, today: string, dailyLimit: number): number {
  let started = 0;
  for (const state of states.values()) if (state.firstDay === today) started++;
  return Math.max(0, dailyLimit - started);
}

export type CourseFilter = {
  unit?: number | null;
  group?: string | null;
  type?: string | null;
  status?: string | null;
  source?: string | null;
};

export function matchesFilter(card: CourseCard, filter: CourseFilter): boolean {
  if (filter.unit != null && card.unit !== filter.unit) return false;
  if (filter.group != null && card.group !== filter.group) return false;
  if (filter.type != null && card.type !== filter.type) return false;
  if (filter.status != null && card.status !== filter.status) return false;
  if (filter.source != null && card.source !== filter.source) return false;
  return true;
}

export function hasFilter(filter: CourseFilter): boolean {
  return Object.values(filter).some((value) => value != null);
}

export type FilterChoices = { units: { value: number; label: string }[]; groups: string[]; types: string[]; statuses: string[]; sources: string[] };

/** What each filter can pick from. A field that is the same on every card narrows nothing, so it offers nothing. */
export function filterChoices(cards: CourseCard[]): FilterChoices {
  const distinct = (read: (card: CourseCard) => string) => {
    const seen = new Set<string>();
    for (const card of cards) {
      const value = read(card);
      if (value) seen.add(value);
    }
    return seen.size > 1 ? [...seen] : [];
  };
  const units = new Map<number, string>();
  for (const card of cards) if (!units.has(card.unit)) units.set(card.unit, card.unitName);
  return {
    units: units.size > 1 ? [...units.entries()].sort((a, b) => a[0] - b[0]).map(([value, label]) => ({ value, label })) : [],
    groups: distinct((card) => card.group).sort((a, b) => a.localeCompare(b)),
    types: distinct((card) => card.type).sort((a, b) => a.localeCompare(b)),
    statuses: distinct((card) => card.status),
    sources: distinct((card) => card.source),
  };
}

export type CourseSitting = { cardIds: string[]; readyCount: number; newCount: number };

function readyFirst(cards: CourseCard[], states: CourseStates): CourseCard[] {
  return [...cards].sort((a, b) => {
    const dayA = states.get(a.id)?.readyOn ?? '';
    const dayB = states.get(b.id)?.readyOn ?? '';
    return dayA === dayB ? a.seq - b.seq : dayA < dayB ? -1 : 1;
  });
}

/**
 * A sitting on the study path, over the whole course or one unit: what is
 * ready, then new cards strictly in Seq order and within today's limit. Ready
 * cards alone never crowd new ones out completely.
 */
export function planPathSitting(args: {
  cards: CourseCard[];
  states: CourseStates;
  today: string;
  dailyLimit: number;
  openedByHand: number[];
  unit?: number | null;
  size?: number;
}): CourseSitting {
  const { cards, states, today, dailyLimit, openedByHand, unit = null, size = COURSE_SITTING_SIZE } = args;
  const open = openUnits(cards, states, openedByHand);
  const scope = cards.filter((card) => open.has(card.unit) && (unit === null || card.unit === unit));
  const ready = readyFirst(scope.filter((card) => isReady(states.get(card.id), today)), states);
  const fresh = scope.filter((card) => !states.has(card.id)).sort((a, b) => a.seq - b.seq);
  const room = Math.min(newLeftToday(states, today, dailyLimit), fresh.length);
  const readyTake = Math.min(ready.length, size - Math.min(NEW_KEPT_ROOM, room));
  const newTake = Math.min(room, size - readyTake);
  return {
    cardIds: [...ready.slice(0, readyTake), ...fresh.slice(0, newTake)].map((card) => card.id),
    readyCount: readyTake,
    newCount: newTake,
  };
}

/**
 * A sitting from the filters, which step outside the path: everything matching,
 * open unit or not, such as all of one lesson the night before class. It does
 * not wait for a day to come round, and leaves out what was answered today so
 * pressing Study again moves on. What is ready comes first, then what has been
 * seen, then new cards in Seq order. New cards it brings in count toward today.
 */
export function planFilterSitting(cards: CourseCard[], states: CourseStates, filter: CourseFilter, today: string, answeredToday: Set<string>, size: number = COURSE_SITTING_SIZE): CourseSitting {
  const scope = cards.filter((card) => matchesFilter(card, filter) && !answeredToday.has(card.id));
  const ready = readyFirst(scope.filter((card) => isReady(states.get(card.id), today)), states);
  const later = readyFirst(scope.filter((card) => states.has(card.id) && !isReady(states.get(card.id), today)), states);
  const fresh = scope.filter((card) => !states.has(card.id)).sort((a, b) => a.seq - b.seq);
  const picked = [...ready, ...later, ...fresh].slice(0, size);
  return {
    cardIds: picked.map((card) => card.id),
    readyCount: picked.filter((card) => isReady(states.get(card.id), today)).length,
    newCount: picked.filter((card) => !states.has(card.id)).length,
  };
}

function dayHash(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mix: everything seen in the open units, stirred differently each day, leaving out what was answered today. */
export function planMixSitting(cards: CourseCard[], states: CourseStates, openedByHand: number[], today: string, answeredToday: Set<string>, size: number = COURSE_SITTING_SIZE): CourseSitting {
  const open = openUnits(cards, states, openedByHand);
  const picked = cards
    .filter((card) => open.has(card.unit) && states.has(card.id) && !answeredToday.has(card.id))
    .map((card) => ({ card, order: dayHash(`${today}${card.id}`) }))
    .sort((a, b) => a.order - b.order)
    .slice(0, size)
    .map(({ card }) => card);
  return { cardIds: picked.map((card) => card.id), readyCount: picked.filter((card) => isReady(states.get(card.id), today)).length, newCount: 0 };
}

export type CourseStats = { seen: number; learned: number; ready: number; daysStudied: number; total: number };

/** Plain counts. Days studied only ever grows, so a day away takes nothing back. */
export function courseStats(cards: CourseCard[], states: CourseStates, days: Iterable<string>, today: string): CourseStats {
  let seen = 0;
  let learned = 0;
  let ready = 0;
  for (const card of cards) {
    const state = states.get(card.id);
    if (!state) continue;
    seen++;
    if (isLearned(state)) learned++;
    if (isReady(state, today)) ready++;
  }
  return { seen, learned, ready, total: cards.length, daysStudied: new Set(days).size };
}
