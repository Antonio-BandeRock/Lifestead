// Interests > Money (2026-10-30, Interests stage 5).
//
// What has gone out on an interest and what has come in from it, each on
// the day it happened: a class paid for, a club's dues, a stall fee, a
// commission, a sale at a market. One table, interest_money, with a
// direction of 'out' or 'in'.
//
// A price kept on something in Supplies & Equipment or Collections is
// already money that went out, so those are read from interest_things
// rather than entered twice. Only a price with a day (got_on) is counted
// in a year, the same as Trends > What It Costs counts only money recorded
// against a day, and a price with no day is said to be left out rather
// than guessed into a year. A wish is not money spent until Got It.
//
// Nothing here calls money in a profit or a loss, judges what an interest
// costs, or suggests it should earn: an interest that only ever costs
// money is as much an interest as one that pays. The arithmetic for
// whether one could pay is in lib/couldThisPay.ts, and only runs when the
// person opens it. scripts/test_interest_money.js checks every sentence.
//
// Pure: lib/interestMoneyDb.ts reads and writes.

import { formatThingCost, readCost, type InterestThing } from './interestThings';

export type MoneyDirection = 'out' | 'in';

export type MoneyEntry = {
  id: string;
  interestId: string;
  direction: MoneyDirection;
  amount: number;
  /** YYYY-MM-DD, the day it went out or came in. */
  onDay: string;
  /** What it was for or what was sold: "Pottery class", "Two bowls". */
  what: string;
  /** Who it was paid to or came from (optional). */
  who: string | null;
  note: string | null;
  createdAt: string;
};

export const MONEY_DIRECTION_LABELS: Record<MoneyDirection, string> = {
  out: 'Went Out',
  in: 'Came In',
};

export function readMoneyDirection(direction: string | null | undefined): MoneyDirection {
  return direction === 'in' ? 'in' : 'out';
}

/** An amount as typed, which must be more than nothing: "12", "$12.50", "12,50". */
export function readMoneyAmount(words: string): number | null {
  const read = readCost(words);
  if (!read.ok || read.cost === null || read.cost <= 0) return null;
  return read.cost;
}

export function formatMoney(amount: number): string {
  return amount === 0 ? '$0' : formatThingCost(amount);
}

/** "On Saturday, 3 March 2024" is too long for a row; "3 Mar 2024". */
export function formatMoneyDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return day;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[m - 1]} ${y}`;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function monthHeading(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[(m || 1) - 1]} ${y}`;
}

/** The caption under an entry: the day, who, and the note. */
export function describeMoneyLine(entry: MoneyEntry): string {
  const parts = [formatMoneyDay(entry.onDay)];
  if (entry.who) parts.push(entry.direction === 'in' ? `from ${entry.who}` : `to ${entry.who}`);
  if (entry.note) parts.push(entry.note);
  return parts.join(' · ');
}

/** The figure on the row: "$40 out", "$120 in". */
export function describeMoneyFigure(entry: MoneyEntry): string {
  return `${formatMoney(entry.amount)} ${entry.direction === 'in' ? 'in' : 'out'}`;
}

export type MoneyMonth = {
  month: string;
  entries: MoneyEntry[];
  out: number;
  in: number;
};

/** One interest's entries by month, newest month first, newest day first inside it. */
export function groupMoneyByMonth(entries: readonly MoneyEntry[]): MoneyMonth[] {
  const months = new Map<string, MoneyEntry[]>();
  for (const entry of entries) {
    const month = entry.onDay.slice(0, 7);
    const list = months.get(month) ?? [];
    list.push(entry);
    months.set(month, list);
  }
  return [...months.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, list]) => {
      const sorted = [...list].sort((a, b) => b.onDay.localeCompare(a.onDay) || b.createdAt.localeCompare(a.createdAt));
      return {
        month,
        entries: sorted,
        out: sum(sorted.filter((entry) => entry.direction === 'out')),
        in: sum(sorted.filter((entry) => entry.direction === 'in')),
      };
    });
}

function sum(entries: readonly MoneyEntry[]): number {
  return Math.round(entries.reduce((total, entry) => total + entry.amount, 0) * 100) / 100;
}

export type MoneyYear = {
  year: string;
  /** Entered on Money as gone out. */
  out: number;
  in: number;
  /** Prices with a day kept on Supplies & Equipment and Collections. */
  things: number;
  thingCount: number;
};

/**
 * One interest's money by year, newest first: what was entered on Money,
 * and beside it the prices kept on its supplies and collections that have
 * a day. Things with a price and no day are counted in noDay.
 */
export function moneyByYear(
  entries: readonly MoneyEntry[],
  things: readonly InterestThing[],
): { years: MoneyYear[]; noDay: number } {
  const years = new Map<string, MoneyYear>();
  const yearOf = (year: string) => {
    const found = years.get(year) ?? { year, out: 0, in: 0, things: 0, thingCount: 0 };
    years.set(year, found);
    return found;
  };
  for (const entry of entries) {
    const year = yearOf(entry.onDay.slice(0, 4));
    if (entry.direction === 'in') year.in += entry.amount;
    else year.out += entry.amount;
  }
  let noDay = 0;
  for (const thing of things) {
    if (thing.kind === 'wish' || thing.cost === null || thing.cost <= 0) continue;
    if (!thing.gotOn || !/^\d{4}/.test(thing.gotOn)) {
      noDay += 1;
      continue;
    }
    const year = yearOf(thing.gotOn.slice(0, 4));
    year.things += thing.cost;
    year.thingCount += 1;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    years: [...years.values()]
      .map((year) => ({ ...year, out: round(year.out), in: round(year.in), things: round(year.things) }))
      .sort((a, b) => b.year.localeCompare(a.year)),
    noDay,
  };
}

/** One year in words: "In 2026, $340 went out and $200 came in. $120 of it went on 3 supplies and collected things." */
export function describeMoneyYear(year: MoneyYear): string {
  const out = Math.round((year.out + year.things) * 100) / 100;
  const parts: string[] = [];
  if (out > 0 && year.in > 0) parts.push(`In ${year.year}, ${formatMoney(out)} went out and ${formatMoney(year.in)} came in.`);
  else if (out > 0) parts.push(`In ${year.year}, ${formatMoney(out)} went out.`);
  else parts.push(`In ${year.year}, ${formatMoney(year.in)} came in.`);
  if (year.thingCount > 0) {
    const things = year.thingCount === 1 ? '1 supply or collected thing' : `${year.thingCount} supplies and collected things`;
    parts.push(`${formatMoney(year.things)} of it is the price kept on ${things}.`);
  }
  return parts.join(' ');
}

export function describeNoDay(noDay: number): string | null {
  if (noDay === 0) return null;
  return noDay === 1
    ? '1 supply or collected thing has a price and no day it was got, so it is left out of the years above.'
    : `${noDay} supplies and collected things have a price and no day they were got, so they are left out of the years above.`;
}

export type MoneyGroup = {
  interestId: string;
  interestName: string;
  entries: MoneyEntry[];
};

/** Entries grouped by interest, interests alphabetically. */
export function groupMoneyByInterest(entries: readonly MoneyEntry[], interestName: (id: string) => string): MoneyGroup[] {
  const groups = new Map<string, MoneyEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.interestId) ?? [];
    list.push(entry);
    groups.set(entry.interestId, list);
  }
  return [...groups.entries()]
    .map(([interestId, list]) => ({ interestId, interestName: interestName(interestId), entries: list }))
    .sort((a, b) => a.interestName.localeCompare(b.interestName, undefined, { sensitivity: 'base' }));
}

export function countMoney(n: number): string {
  return n === 1 ? '1 amount kept' : `${n} amounts kept`;
}

/** What is said back after saving. */
export function describeMoneySaved(entry: Pick<MoneyEntry, 'amount' | 'direction' | 'what'>, interestName: string): string {
  return `${entry.what}: ${formatMoney(entry.amount)} ${entry.direction === 'in' ? 'came in' : 'went out'}, kept under ${interestName}.`;
}
