// Interests, the tenth tab (2026-10-30). An interest is something a person
// enjoys thinking, reading or learning about; a hobby is practising it. The
// two are stages of one record, never two things: nothing is copied or
// moved when someone starts practising, the same record simply has
// Practising turned on, and turning it off again leaves the whole history.
//
// Four stages, in any mix at once: Following, Practising, Sharing and
// Earning. Nothing here suggests an interest should move to the next one,
// since plenty of people want a hobby to stay a hobby and earning from
// something loved can change how it feels. Every turn on or off is kept as
// a dated line in interest_stage_changes, append-only, so the record shows
// how an interest grew without anybody writing it down.
//
// Stepping back keeps everything (retired_at); deleting is only offered for
// an interest nothing else refers to. No hours totals, no streaks, no
// scores, no "most active": scripts/test_interests.js sweeps every sentence
// here for words that rank or judge.
//
// Everything here is pure; lib/interestsDb.ts reads and writes.

import { sortByLabel } from './choiceOrder';

export type InterestStage = 'following' | 'practising' | 'sharing' | 'earning';
export const INTEREST_STAGES: InterestStage[] = ['following', 'practising', 'sharing', 'earning'];

export const INTEREST_STAGE_LABELS: Record<InterestStage, string> = {
  following: 'Following',
  practising: 'Practising',
  sharing: 'Sharing',
  earning: 'Earning',
};

/** What each stage means, said once where the stages are chosen. */
export const INTEREST_STAGE_LINES: Record<InterestStage, string> = {
  following: 'Reading, watching, saving pages and keeping up with it.',
  practising: 'Doing it: time spent, projects, the things you use.',
  sharing: 'With other people: a club, friends, shows, teaching, giving work away.',
  earning: 'It brings money in: things sold, lessons, commissions, repairs.',
};

export type Interest = {
  id: string;
  name: string;
  /** A built-in kind's code, or the words of a kind the person named. */
  kind: string | null;
  about: string | null;
  stages: Record<InterestStage, boolean>;
  /** When it started, as exactly as the person said: 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD'. */
  startedOn: string | null;
  /** Where it was left off, read first when it is opened again. */
  leftOff: string | null;
  leftOffAt: string | null;
  /** Stepped back from. Everything is kept. */
  retiredAt: string | null;
  createdAt: string;
};

export type InterestStageChange = {
  id: string;
  interestId: string;
  stage: InterestStage;
  turnedOn: boolean;
  /** 'YYYY-MM-DD', the local day it changed. */
  changedOn: string;
};

// Kinds of interest. A name list, so it reads alphabetically, with the kinds
// the person has named merged in (kindChoices). "Collecting" is a kind of
// its own because a collection is the whole of some people's interest.
export const INTEREST_KINDS: { code: string; label: string }[] = [
  { code: 'art', label: 'Art & drawing' },
  { code: 'building', label: 'Building & woodworking' },
  { code: 'collecting', label: 'Collecting' },
  { code: 'cooking', label: 'Cooking & baking' },
  { code: 'crafts', label: 'Crafts & sewing' },
  { code: 'dance', label: 'Dance' },
  { code: 'games', label: 'Games & puzzles' },
  { code: 'history', label: 'History' },
  { code: 'languages', label: 'Languages' },
  { code: 'music', label: 'Music' },
  { code: 'nature', label: 'Nature & the outdoors' },
  { code: 'photography', label: 'Photography & film' },
  { code: 'reading', label: 'Reading & writing' },
  { code: 'science', label: 'Science' },
  { code: 'sport', label: 'Sport & fitness' },
  { code: 'technology', label: 'Technology' },
  { code: 'travel', label: 'Travel' },
  { code: 'vehicles', label: 'Vehicles & machines' },
];

const KIND_LABEL = new Map(INTEREST_KINDS.map((kind) => [kind.code, kind.label]));

/** The words for a kind: a built-in's label, or the person's own words. */
export function kindLabel(kind: string | null): string | null {
  if (!kind) return null;
  return KIND_LABEL.get(kind) ?? kind;
}

export function isBuiltInKind(kind: string | null): boolean {
  return !!kind && KIND_LABEL.has(kind);
}

/**
 * The kind picker's choices: the built-ins and every kind the person has
 * named on an interest, in one alphabetical list. A named kind lives on the
 * interests that use it, so one nothing uses any more leaves the list by
 * itself and can never be orphaned.
 */
export function kindChoices(interests: readonly Pick<Interest, 'kind'>[]): { label: string; value: string }[] {
  const own = new Set<string>();
  for (const interest of interests) {
    if (interest.kind && !isBuiltInKind(interest.kind)) own.add(interest.kind);
  }
  return sortByLabel([
    ...INTEREST_KINDS.map((kind) => ({ label: kind.label, value: kind.code })),
    ...[...own].map((words) => ({ label: words, value: words })),
  ]);
}

/** The person's named kinds, for Rename. */
export function ownKinds(interests: readonly Pick<Interest, 'kind'>[]): string[] {
  const own = new Set<string>();
  for (const interest of interests) {
    if (interest.kind && !isBuiltInKind(interest.kind)) own.add(interest.kind);
  }
  return [...own].sort((a, b) => a.localeCompare(b));
}

export function cleanInterestText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function noStages(): Record<InterestStage, boolean> {
  return { following: false, practising: false, sharing: false, earning: false };
}

/** The stages turned on, in their natural order. */
export function activeStages(interest: Pick<Interest, 'stages'>): InterestStage[] {
  return INTEREST_STAGES.filter((stage) => interest.stages[stage]);
}

/** "Following and practising", or "No stage chosen" when no stage is on. */
export function describeStages(interest: Pick<Interest, 'stages'>): string {
  const labels = activeStages(interest).map((stage) => INTEREST_STAGE_LABELS[stage].toLowerCase());
  if (labels.length === 0) return 'No stage chosen';
  const joined = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "3 March 2026" from 'YYYY-MM-DD'. */
export function formatInterestDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return day;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "2019", "March 2026" or "3 March 2026", as exactly as it was said. */
export function formatStartedOn(started: string): string {
  const [y, m, d] = started.split('-').map(Number);
  if (!y) return started;
  if (!m) return String(y);
  if (!d) return `${MONTHS[m - 1]} ${y}`;
  return formatInterestDay(started);
}

/**
 * Reads "since when" as the person typed it: a year ("2019"), a month and
 * year ("March 2024", "3/2024"), or a whole day ("3 March 2024",
 * "2024-03-03"). Empty means not said. Anything else is not read, so the
 * form can ask again rather than store a guess.
 */
export function readStartedOn(words: string, today: string): { ok: boolean; startedOn: string | null } {
  const text = cleanInterestText(words).toLowerCase().replace(/,/g, '');
  if (!text) return { ok: true, startedOn: null };
  const pad = (n: number) => String(n).padStart(2, '0');
  const monthOf = (word: string) => (word.length >= 3 ? MONTHS.findIndex((month) => month.toLowerCase().startsWith(word)) : -1);
  let result: string | null = null;
  let match: RegExpMatchArray | null;
  if ((match = text.match(/^(\d{4})$/))) result = match[1];
  else if ((match = text.match(/^(\d{4})-(\d{1,2})$/))) result = `${match[1]}-${pad(Number(match[2]))}`;
  else if ((match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) result = `${match[1]}-${pad(Number(match[2]))}-${pad(Number(match[3]))}`;
  else if ((match = text.match(/^(\d{1,2})\/(\d{4})$/))) result = `${match[2]}-${pad(Number(match[1]))}`;
  else if ((match = text.match(/^([a-z]+)\s+(\d{4})$/)) && monthOf(match[1]) >= 0) result = `${match[2]}-${pad(monthOf(match[1]) + 1)}`;
  else if ((match = text.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/)) && monthOf(match[2]) >= 0)
    result = `${match[3]}-${pad(monthOf(match[2]) + 1)}-${pad(Number(match[1]))}`;
  else if ((match = text.match(/^([a-z]+)\s+(\d{1,2})\s+(\d{4})$/)) && monthOf(match[1]) >= 0)
    result = `${match[3]}-${pad(monthOf(match[1]) + 1)}-${pad(Number(match[2]))}`;
  if (!result) return { ok: false, startedOn: null };
  const [y, m, d] = result.split('-').map(Number);
  if (y < 1900 || (m !== undefined && (m < 1 || m > 12)) || (d !== undefined && (d < 1 || d > 31))) return { ok: false, startedOn: null };
  // Something that has not started yet is not a "since".
  if (result.localeCompare(today.slice(0, result.length)) > 0) return { ok: false, startedOn: null };
  return { ok: true, startedOn: result };
}

/** The local day of an ISO moment, so an evening change is not tomorrow's. */
export function localDayOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The one line under an interest's name: its kind and its stages, then when
 * it started if that is known. Never how much, how often or how well.
 */
export function describeInterestLine(interest: Interest): string {
  const parts: string[] = [];
  const kind = kindLabel(interest.kind);
  if (kind) parts.push(kind);
  parts.push(describeStages(interest));
  if (interest.startedOn) parts.push(`since ${formatStartedOn(interest.startedOn)}`);
  if (interest.retiredAt) parts.push(`stepped back ${formatInterestDay(localDayOf(interest.retiredAt))}`);
  return parts.join(' · ');
}

/** "Left off 12 October 2026: the second verse." */
export function describeLeftOff(interest: Pick<Interest, 'leftOff' | 'leftOffAt'>): string | null {
  if (!interest.leftOff) return null;
  const when = interest.leftOffAt ? ` ${formatInterestDay(localDayOf(interest.leftOffAt))}` : '';
  return `Where you left off${when}: ${interest.leftOff}`;
}

/**
 * The history, newest first, as sentences: "Started practising, 4 May 2026".
 * A stage turned off reads as stepping back from it, which is a choice, not
 * a loss.
 */
export function describeStageHistory(changes: readonly InterestStageChange[]): string[] {
  return [...changes]
    .sort((a, b) => (a.changedOn === b.changedOn ? 0 : a.changedOn < b.changedOn ? 1 : -1))
    .map((change) => {
      const stage = INTEREST_STAGE_LABELS[change.stage].toLowerCase();
      const verb = change.turnedOn ? `Started ${stage}` : `Stepped back from ${stage}`;
      return `${verb}, ${formatInterestDay(change.changedOn)}`;
    });
}

/**
 * Which stage changes a save makes, comparing the stages before with the
 * stages after. A new interest has no "before", so every stage it starts
 * with is written as starting that day.
 */
export function stageChangesBetween(
  before: Record<InterestStage, boolean> | null,
  after: Record<InterestStage, boolean>,
): { stage: InterestStage; turnedOn: boolean }[] {
  const changes: { stage: InterestStage; turnedOn: boolean }[] = [];
  for (const stage of INTEREST_STAGES) {
    const was = before ? before[stage] : false;
    if (was !== after[stage]) changes.push({ stage, turnedOn: after[stage] });
  }
  return changes;
}

/** Interests still followed first, alphabetically, then the stepped back. */
export function groupInterests(interests: readonly Interest[]): { current: Interest[]; steppedBack: Interest[] } {
  const byName = (a: Interest, b: Interest) => a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  return {
    current: interests.filter((interest) => !interest.retiredAt).sort(byName),
    steppedBack: interests.filter((interest) => interest.retiredAt).sort(byName),
  };
}

/** Choices for "which interest" pickers: current ones, alphabetically. */
export function interestChoices(interests: readonly Interest[], keepId?: string | null): { label: string; value: string }[] {
  return sortByLabel(
    interests
      .filter((interest) => !interest.retiredAt || interest.id === keepId)
      .map((interest) => ({ label: interest.name, value: interest.id })),
  );
}

// How the tab explains itself, in plain words. The shape is the owner's:
// "you can have an interest in architecture just by looking at buildings,
// but your hobby might be sketching them."
export const INTERESTS_EXPLAINED: { heading: string; body: string }[] = [
  {
    heading: 'An interest',
    body: 'Something you enjoy thinking about, reading about or learning about. You can follow architecture just by looking at buildings.',
  },
  {
    heading: 'A hobby',
    body: 'When you practise it. Sketching the buildings is the hobby. Hobbies are the heart of this tab.',
  },
  {
    heading: 'And it can grow',
    body: 'Into a skill, a body of work, a collection, friends who share it, something you teach, and for some people a source of income. Or it can stay exactly what it is.',
  },
  {
    heading: 'One record',
    body: 'Each interest is one record. Turn its stages on or off as it changes, and the dates are kept for you. Stepping back from one keeps everything.',
  },
];
