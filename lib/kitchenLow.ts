// When something in Life > Kitchen is running low (2026-11-13).
//
// Direct request, 2026-11-13: does the app "inform them when it is running
// low based on usage and ask if it should be added to the grocery list? If
// it does not yet do that, it should be able to." Tony's answers to how:
// both an amount the person sets ("tell me when it gets down to") and an
// estimate of the days left from how fast it has been used, the estimate
// only once there is enough use to go on and always called an estimate; told
// both by a notification answered on the lock screen and by a mark in the
// Kitchen and on the grocery list.
//
// Pure, with no database and no expo import, so scripts/test_kitchen_low.js
// can check every reading without a phone. lib/kitchenLowDb.ts does the reads
// and writes.
//
// A food, not a kitchen row. Every purchase becomes a row of its own, so the
// rate of use and the amount the person set belong to the food: its category
// and name, the pair the grocery list and the recipes already match on.
//
// What this never does: guess. A use in grams says nothing about a stock
// counted in cans, so uses in another unit are left out rather than
// converted; fewer than three uses, or uses spread over less than a week, give
// no estimate at all rather than a confident number drawn from two meals.

export const LOW_DAYS = 5;
export const MIN_USES = 3;
export const MIN_SPAN_DAYS = 7;
export const RATE_WINDOW_DAYS = 60;

const DAY_MS = 86_400_000;

/** A sentence and the values it carries, so the screen can translate it. */
export type Words = { en: string; values?: Record<string, string | number> };

export type KitchenUse = { amount: number; unit: string; usedAt: string };

export type LowMark = { belowAmount: number | null; unit: string };

export type LowReading = {
  usedUp: boolean;
  byMark: boolean;
  byEstimate: boolean;
  low: boolean;
  daysLeft: number | null;
  /** How many uses the estimate rests on, 0 when there is none. */
  usesCounted: number;
  /** Why it reads as low, in order, empty when it does not. */
  lines: Words[];
};

export function foodKey(category: string, foodName: string): string {
  return `${category.trim().toLowerCase()}|${foodName.trim().toLowerCase()}`;
}

export function sameUnit(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** A number as a person writes it: no trailing zeros, at most two places. */
export function formatAmount(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * Days left at the rate this food has been used, or null when there is not
 * enough use to go on. The rate is everything used in the window, in the
 * stock's unit, spread over the days since the first of those uses, so a food
 * nobody has touched for a while reads as lasting longer rather than keeping
 * the pace of a busy week.
 */
export function estimateDaysLeft(
  uses: readonly KitchenUse[],
  remaining: number,
  unit: string,
  now: Date,
): { daysLeft: number; usesCounted: number } | null {
  const nowMs = now.getTime();
  const since = nowMs - RATE_WINDOW_DAYS * DAY_MS;
  const kept = uses.filter((use) => {
    const at = Date.parse(use.usedAt);
    return use.amount > 0 && sameUnit(use.unit, unit) && Number.isFinite(at) && at >= since && at <= nowMs;
  });
  if (kept.length < MIN_USES) return null;
  const first = Math.min(...kept.map((use) => Date.parse(use.usedAt)));
  const spanDays = (nowMs - first) / DAY_MS;
  if (spanDays < MIN_SPAN_DAYS) return null;
  const total = kept.reduce((sum, use) => sum + use.amount, 0);
  const perDay = total / spanDays;
  if (!(perDay > 0)) return null;
  return { daysLeft: Math.max(0, remaining) / perDay, usesCounted: kept.length };
}

/** "About 4 days left", worded for the estimate it is. */
export function daysLeftWords(daysLeft: number, usesCounted: number): Words {
  if (daysLeft < 1) {
    return { en: 'Less than a day left at the rate it has been used. An estimate from your last {uses} uses.', values: { uses: usesCounted } };
  }
  const days = Math.round(daysLeft);
  return days === 1
    ? { en: 'About 1 day left at the rate it has been used. An estimate from your last {uses} uses.', values: { uses: usesCounted } }
    : { en: 'About {days} days left at the rate it has been used. An estimate from your last {uses} uses.', values: { days, uses: usesCounted } };
}

/** Whether this food reads as low, and why, in words. */
export function readLow(input: {
  remaining: number;
  unit: string;
  mark: LowMark | null;
  uses: readonly KitchenUse[];
  now: Date;
}): LowReading {
  const { remaining, unit, mark, uses, now } = input;
  const usedUp = remaining <= 0;
  const byMark =
    !usedUp && mark != null && mark.belowAmount != null && mark.belowAmount > 0 && sameUnit(mark.unit, unit) && remaining <= mark.belowAmount;
  const estimate = usedUp ? null : estimateDaysLeft(uses, remaining, unit, now);
  const byEstimate = estimate != null && estimate.daysLeft <= LOW_DAYS;
  const lines: Words[] = [];
  if (usedUp) lines.push({ en: 'Used up.' });
  if (byMark && mark && mark.belowAmount != null) {
    lines.push({
      en: 'Down to {left} {unit}, at or under the {mark} {unit} you set.',
      values: { left: formatAmount(remaining), mark: formatAmount(mark.belowAmount), unit },
    });
  }
  if (byEstimate && estimate) lines.push(daysLeftWords(estimate.daysLeft, estimate.usesCounted));
  return {
    usedUp,
    byMark,
    byEstimate,
    low: usedUp || byMark || byEstimate,
    daysLeft: estimate ? estimate.daysLeft : null,
    usesCounted: estimate ? estimate.usesCounted : 0,
    lines,
  };
}

// --- The notification -------------------------------------------------------
//
// One food at a time, asked once. "Not yet" asks again after NOT_YET_DAYS if
// it is still low; "Add to list" puts it on the list being shopped and does
// not ask again until the kitchen has been restocked and it runs low again,
// or after ADDED_QUIET_DAYS if it never was. A notification cleared without
// an answer counts as Not yet.

export const NOT_YET_DAYS = 3;
export const ADDED_QUIET_DAYS = 14;

export type LowOfferEntry = {
  /** When it was last asked or answered, ms. */
  at: number;
  answer: 'asked' | 'notYet' | 'added';
  /** What was left when it was asked, in the stock's unit. */
  remaining: number;
};

/** Whether this food may be asked about now. */
export function mayAsk(entry: LowOfferEntry | undefined, remaining: number, nowMs: number): boolean {
  if (!entry) return true;
  // Restocked since it was asked: a fresh run starts.
  if (remaining > entry.remaining) return true;
  const quietDays = entry.answer === 'added' ? ADDED_QUIET_DAYS : NOT_YET_DAYS;
  return nowMs - entry.at >= quietDays * DAY_MS;
}

/** The notification's words. With detail hidden it never names the food. */
export function lowOfferText(foodName: string, reading: LowReading, hidden: boolean): { title: Words; body: Words } {
  if (hidden) {
    return {
      title: { en: 'Something in your kitchen is running low' },
      body: { en: 'Add it to the grocery list?' },
    };
  }
  return {
    title: reading.usedUp ? { en: '{food} is used up', values: { food: foodName } } : { en: '{food} is running low', values: { food: foodName } },
    body: { en: 'Add it to the grocery list?' },
  };
}

/** What the notification buttons are answering, kept in a plain file so a
 *  press on a locked phone is kept until the records can be opened. Only the
 *  mark id is held, never a food's name. */
export type KitchenLowOfferState = {
  entries: Record<string, LowOfferEntry>;
  toAdd: string[];
};

export const EMPTY_KITCHEN_LOW_STATE: KitchenLowOfferState = { entries: {}, toAdd: [] };

export function answerKitchenLowOffer(
  state: KitchenLowOfferState,
  actionIdentifier: string,
  markId: string,
  nowMs: number,
): KitchenLowOfferState {
  if (!markId) return state;
  const before = state.entries[markId];
  const remaining = before ? before.remaining : 0;
  if (actionIdentifier === 'kitchenAdd') {
    return {
      entries: { ...state.entries, [markId]: { at: nowMs, answer: 'added', remaining } },
      toAdd: state.toAdd.includes(markId) ? state.toAdd : [...state.toAdd, markId],
    };
  }
  // Not yet, or the notification cleared without an answer.
  return { ...state, entries: { ...state.entries, [markId]: { at: nowMs, answer: 'notYet', remaining } } };
}

export function parseKitchenLowState(text: string): KitchenLowOfferState | null {
  try {
    const parsed = JSON.parse(text) as Partial<KitchenLowOfferState>;
    const entries: Record<string, LowOfferEntry> = {};
    if (parsed.entries && typeof parsed.entries === 'object') {
      for (const [id, entry] of Object.entries(parsed.entries)) {
        if (
          entry &&
          typeof entry.at === 'number' &&
          typeof entry.remaining === 'number' &&
          (entry.answer === 'asked' || entry.answer === 'notYet' || entry.answer === 'added')
        ) {
          entries[id] = entry;
        }
      }
    }
    const toAdd = Array.isArray(parsed.toAdd) ? parsed.toAdd.filter((id): id is string => typeof id === 'string') : [];
    return { entries, toAdd };
  } catch {
    return null;
  }
}
