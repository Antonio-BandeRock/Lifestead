// The things that belong to an interest (2026-10-30, Interests stage 3):
// supplies and equipment it uses, what is collected for it, and what is
// wished for. One record kind in one table (interest_things), because a
// wished-for thing that arrives becomes a supply or part of a collection
// without being typed again: Got It changes its kind and keeps the day it
// was first wished for.
//
// A price is what was paid, kept so stage 5 (Money) can read it. Nothing
// here values a collection, says what it is worth, or suggests buying the
// next thing, and nothing ranks one interest's things against another's.
// Something no longer kept is moved under No Longer Have It with
// everything it had (retired_at); removing is for a thing typed by mistake.
// scripts/test_interest_things.js checks every sentence here.
//
// Everything here is pure; lib/interestThingsDb.ts reads and writes.

import { formatStartedOn } from './interests';

export type ThingKind = 'supply' | 'collection' | 'wish';
export const THING_KINDS: ThingKind[] = ['supply', 'collection', 'wish'];

export type InterestThing = {
  id: string;
  interestId: string;
  kind: ThingKind;
  name: string;
  /** What it is, in the person's words. */
  about: string | null;
  /** How many, as said: "3", "2 tubes", "a box". */
  amount: string | null;
  /** Where it is kept. Not used on a wish. */
  place: string | null;
  /** Paid, or for a wish what it costs. Null when no price was kept, never 0 unless it was free. */
  cost: number | null;
  /** The shop, the person or the link it came from or would come from. */
  source: string | null;
  /** How it came: bought, a gift, found, made, traded. Free words. */
  cameBy: string | null;
  /** When it was got, as exactly as said: 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD'. */
  gotOn: string | null;
  /** A set inside a collection: "Mexican coins", "1960s Hot Wheels". */
  setName: string | null;
  /** The day it was first wished for, kept when a wish is got. */
  wishedOn: string | null;
  /** No longer had. Everything is kept. */
  retiredAt: string | null;
  createdAt: string;
};

export const THING_LENS_TITLES: Record<ThingKind, string> = {
  supply: 'Supplies & Equipment',
  collection: 'Collections',
  wish: 'Wish List',
};

/** "1 supply", "3 things in collections", "2 wishes". */
export function countThings(kind: ThingKind, n: number): string {
  if (kind === 'supply') return n === 1 ? '1 supply or piece of equipment' : `${n} supplies and pieces of equipment`;
  if (kind === 'collection') return n === 1 ? '1 thing in a collection' : `${n} things in collections`;
  return n === 1 ? '1 thing wished for' : `${n} things wished for`;
}

/**
 * A price as typed: "12", "$12.50", "12,50", "free". Empty is no price.
 * A comma followed by exactly two digits is a decimal comma; any other
 * comma separates thousands.
 */
export function readCost(words: string): { ok: boolean; cost: number | null } {
  const text = words.trim().toLowerCase();
  if (!text) return { ok: true, cost: null };
  if (text === 'free' || text === 'nothing' || text === 'gratis') return { ok: true, cost: 0 };
  let digits = text.replace(/^(about|around|roughly|~)\s*/, '').replace(/[$€£¥\s]/g, '').replace(/(mxn|usd|eur|gbp|pesos?|dollars?)$/, '');
  if (/^\d+,\d{2}$/.test(digits)) digits = digits.replace(',', '.');
  else digits = digits.replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(digits)) return { ok: false, cost: null };
  const cost = Number(digits);
  if (!Number.isFinite(cost) || cost > 10000000) return { ok: false, cost: null };
  return { ok: true, cost };
}

export function formatThingCost(cost: number): string {
  if (cost === 0) return 'free';
  const [whole, cents] = cost.toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return cents === '00' ? `$${grouped}` : `$${grouped}.${cents}`;
}

/** 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD' in words, read the same way as when an interest started. */
export function formatGotOn(gotOn: string): string {
  return formatStartedOn(gotOn);
}

/** The caption under a thing's name, joined with dots, empty parts left out. */
export function describeThingLine(thing: InterestThing): string {
  const parts: string[] = [];
  if (thing.amount) parts.push(thing.amount);
  if (thing.kind === 'wish') {
    if (thing.cost !== null) parts.push(thing.cost === 0 ? 'free' : `about ${formatThingCost(thing.cost)}`);
    if (thing.source) parts.push(`from ${thing.source}`);
    return parts.join(' · ');
  }
  if (thing.place) parts.push(thing.place);
  if (thing.gotOn) parts.push(`got ${formatGotOn(thing.gotOn)}`);
  if (thing.cameBy) parts.push(thing.cameBy);
  if (thing.cost !== null) parts.push(thing.cost === 0 ? 'free' : formatThingCost(thing.cost));
  return parts.join(' · ');
}

/** Said when a wish was got: how long it was wished for, in plain words. */
export function describeWishedFor(thing: Pick<InterestThing, 'wishedOn'>): string | null {
  if (!thing.wishedOn) return null;
  return `On the wish list from ${formatGotOn(thing.wishedOn)}`;
}

/** What a group of things comes to: how many, and what was paid where a price was kept. */
export function describeThingsTotal(things: readonly InterestThing[]): string {
  const kind = things[0]?.kind ?? 'supply';
  const count = countThings(kind, things.length);
  const priced = things.filter((thing) => thing.cost !== null);
  if (priced.length === 0) return `${count}.`;
  const sum = priced.reduce((total, thing) => total + (thing.cost ?? 0), 0);
  const amount = kind === 'wish' ? `about ${formatThingCost(sum)} in all` : `${formatThingCost(sum)} paid`;
  if (priced.length === things.length) return `${count}, ${sum === 0 ? 'all free' : amount}.`;
  return `${count}, ${amount} across the ${priced.length} with a price kept.`;
}

export type ThingGroup = {
  interestId: string;
  interestName: string;
  /** For a collection, the things grouped by set, a thing with no set first. */
  sets: { setName: string | null; things: InterestThing[] }[];
  things: InterestThing[];
};

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

/**
 * Things of one kind grouped by interest, interests alphabetically, things
 * alphabetically inside. Things no longer had are left out; see retiredThings.
 */
export function groupThings(
  things: readonly InterestThing[],
  kind: ThingKind,
  interestName: (id: string) => string,
): ThingGroup[] {
  const groups = new Map<string, InterestThing[]>();
  for (const thing of things) {
    if (thing.kind !== kind || thing.retiredAt) continue;
    const list = groups.get(thing.interestId) ?? [];
    list.push(thing);
    groups.set(thing.interestId, list);
  }
  return [...groups.entries()]
    .map(([interestId, list]) => {
      const sorted = [...list].sort(byName);
      const setNames = [...new Set(sorted.map((thing) => thing.setName))].sort((a, b) =>
        a === null ? -1 : b === null ? 1 : a.localeCompare(b, undefined, { sensitivity: 'base' }),
      );
      return {
        interestId,
        interestName: interestName(interestId),
        things: sorted,
        sets: setNames.map((setName) => ({ setName, things: sorted.filter((thing) => thing.setName === setName) })),
      };
    })
    .sort((a, b) => a.interestName.localeCompare(b.interestName, undefined, { sensitivity: 'base' }));
}

/** Things of one kind no longer had, alphabetically. */
export function retiredThings(things: readonly InterestThing[], kind: ThingKind): InterestThing[] {
  return things.filter((thing) => thing.kind === kind && thing.retiredAt).sort(byName);
}

/** Set names already used on an interest's collection, for picking again. */
export function setNamesFor(things: readonly InterestThing[], interestId: string): string[] {
  return [...new Set(things.filter((thing) => thing.interestId === interestId && thing.kind === 'collection' && thing.setName).map((thing) => thing.setName as string))].sort(
    (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
}

/**
 * Where a got wish goes first: a collection when the interest is collecting
 * or already has one, otherwise supplies. Both are offered; this is only
 * which is named first.
 */
export function gotItGoesTo(interestKind: string | null, things: readonly InterestThing[], interestId: string): 'supply' | 'collection' {
  if (interestKind === 'collecting') return 'collection';
  const here = things.filter((thing) => thing.interestId === interestId && !thing.retiredAt);
  const collected = here.filter((thing) => thing.kind === 'collection').length;
  const supplies = here.filter((thing) => thing.kind === 'supply').length;
  return collected > supplies ? 'collection' : 'supply';
}

/** What is said back after Got It. */
export function describeGotIt(name: string, to: 'supply' | 'collection'): string {
  return to === 'collection' ? `${name} is in Collections now, with the day it was wished for.` : `${name} is in Supplies & Equipment now, with the day it was wished for.`;
}
