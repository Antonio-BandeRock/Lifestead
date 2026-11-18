// One bottle two partners take from, counted once between them.
//
// Tony, 2026-11-18: "People who are setup as partners will most likely have
// supplements they both take, and their amounts per bottle of them is going
// to be shared between the two people. We need to be able to identify that
// somehow, and be able to see the total of them per both people, not just
// count against only one of them. So if something is 1 tablet at 1000 mcg
// split between 2 people once per day, they each get 500 mcg and the count
// of the pills goes down only by one." Asked after: both ways of sharing
// (half a tablet each, or a whole one each, or different amounts), one
// partner shares and the other accepts, and the bottle shows pills left and
// days left at both people's pace.
//
// HOW IT HOLDS TOGETHER. Each person's med stays their own: its nutrients,
// its dose, its schedule, and how much of the bottle one of their doses
// uses (half a tablet is 0.5). The bottle is a record of its own
// (shared_supplies) that crosses between the two phones once somebody marks
// it shared, the way a household chore does. Beside it each person's phone
// writes one line of use (shared_supply_use): the doses they marked taken
// and the doses ahead on their schedule, in units of the bottle and nothing
// else, never a nutrient, a note or a name of anything else they take.
// Every phone then reads the bottle the same way: the count minus what both
// people marked taken since it, and the days left walked over both people's
// doses ahead. So the low reminder reaches both phones from the same sum.
//
// Pure, no imports beyond lib/medSupply.ts, so scripts/test_shared_supply.js
// checks it without a phone. The reading and writing is
// lib/sharedSupplyDb.ts.
import type { DoseAhead, ScheduleAhead, SupplyInput } from './medSupply';
import { addDays } from './medSupply';

/** One dose marked taken, in units of the bottle. `at` is local "YYYY-MM-DDTHH:mm". */
export type TakenDose = { at: string; units: number };

/** One person's line of use on a bottle, as it crossed or as written here. */
export type SharedUse = {
  /** Who it is, as this phone says it: "you", or the partner's name. */
  who: string;
  mine: boolean;
  /** Doses marked taken, from at least the count onward. */
  taken: TakenDose[];
  /**
   * The doses ahead on their schedule. Null when they have nothing on the
   * schedule, so the pace falls back to the last two weeks of marks.
   */
  ahead: DoseAhead[] | null;
  /** The last day their schedule was walked to, when it was. */
  through: string | null;
  /** Whether their schedule ends (no series goes on past the doses given). */
  ends: boolean;
  /** When their phone last wrote this line, ISO. */
  updatedAt: string;
};

export type SharedBottle = {
  id: string;
  name: string;
  unit: string | null;
  onHand: number | null;
  countedAt: string | null;
  leadDays: number;
};

const sum = (doses: readonly { units: number }[]) => doses.reduce((total, dose) => total + dose.units, 0);

/**
 * What lib/medSupply.ts's readSupply needs, for a bottle both people take
 * from. Everything is in units of the bottle, so perDose is 1: the
 * per-person amount was already applied when each line of use was written.
 */
export function combineSharedSupply(input: {
  bottle: SharedBottle;
  uses: readonly SharedUse[];
  today: string;
  now: string;
}): SupplyInput {
  const { bottle, uses, today, now } = input;
  const countedAt = bottle.countedAt;
  const since = (dose: TakenDose) => countedAt !== null && dose.at >= countedAt && dose.at <= now;
  const weekEnd = addDays(today, 7);
  const fortnightAgo = addDays(today, -14);

  const takenSinceCount = sum(uses.flatMap((use) => use.taken.filter(since)));
  const takenPast14Days = sum(
    uses.flatMap((use) => use.taken.filter((dose) => dose.at.slice(0, 10) >= fortnightAgo && dose.at.slice(0, 10) < today)),
  );

  // The schedule is walked only when everybody taking from the bottle has
  // one. With somebody unscheduled, walking the others alone would make the
  // bottle last longer than it will, so the pace comes from both people's
  // marks over the last two weeks instead.
  const everyoneScheduled = uses.length > 0 && uses.every((use) => use.ahead !== null);
  let schedule: ScheduleAhead | null = null;
  let dueNext7Days = 0;
  if (everyoneScheduled) {
    // Both walks are cut at the shorter one, so one person's doses never
    // run on past the end of the other's and make the bottle last longer.
    const throughs = uses.map((use) => use.through).filter((d): d is string => !!d);
    const through = throughs.length > 0 ? throughs.reduce((a, b) => (a < b ? a : b)) : null;
    const doses = uses
      .flatMap((use) => use.ahead ?? [])
      .filter((dose) => dose.date >= today && (through === null || dose.date <= through))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    dueNext7Days = sum(doses.filter((dose) => dose.date < weekEnd));
    if (doses.length > 0) {
      schedule = {
        doses,
        through: through ?? doses[doses.length - 1].date,
        ends: uses.every((use) => use.ends),
        tapered: false,
        unconverted: null,
      };
    }
  }

  return {
    onHand: bottle.onHand,
    unit: bottle.unit,
    perDose: 1,
    countedAt,
    takenSinceCount,
    dueNext7Days,
    takenPast14Days,
    today,
    leadDays: bottle.leadDays,
    schedule,
  };
}

function amount(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/**
 * The words added under a shared bottle's reading: who takes from it and
 * how much a day, and, when the partner's line is more than a day old, that
 * their doses are counted as of then. Never says anybody takes too much or
 * too little.
 */
export function describeSharedUse(input: {
  uses: readonly SharedUse[];
  unit: string | null;
  today: string;
  /** The partner's name, for a bottle nobody else has joined yet. */
  partnerName: string | null;
}): string {
  const { uses, unit, today, partnerName } = input;
  const what = unit?.trim() || 'of it';
  const others = uses.filter((use) => !use.mine);
  const parts: string[] = [];
  for (const use of [...uses.filter((u) => u.mine), ...others]) {
    const week = (use.ahead ?? []).filter((dose) => dose.date >= today && dose.date < addDays(today, 7));
    const perDay = use.ahead !== null && week.length > 0 ? sum(week) / 7 : null;
    const name = use.mine ? 'You take' : `${use.who} takes`;
    parts.push(perDay === null ? `${name} from it with no times set yet.` : `${name} about ${amount(perDay)} ${what} a day.`);
  }
  if (others.length === 0) {
    parts.push(
      partnerName
        ? `Shared with ${partnerName}, who has not said yet which of their meds it is.`
        : 'Shared, and nobody else takes from it yet.',
    );
  }
  for (const use of others) {
    const day = use.updatedAt.slice(0, 10);
    if (day && day < addDays(today, -1)) {
      parts.push(`${use.who}'s doses are counted as of ${day}, the last time their phone was in step with yours.`);
    }
  }
  return parts.join(' ');
}
