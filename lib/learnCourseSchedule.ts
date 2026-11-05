// The schedule of a course card (2026-11-05): FSRS through ts-fsrs, for courses
// only. The decks in Learn stay on lib/learnSchedule.ts.
//
// As everywhere in Learn nothing stores a schedule: it is worked out by
// replaying the answers kept for a card, which never change, so two devices
// that hold the same answers arrive at the same schedule whichever order the
// answers reached them in. Three settings follow from that and from Learn
// working in days:
//   - fuzz is off, since a random nudge would differ between replays;
//   - short-term steps are off, since a card comes back on a day, not an hour;
//   - each answer is dated at noon UTC on the day it belongs to, so the clock
//     time and the time zone of the answer change nothing.
//
// The rule from Learn holds: only the first answer of a day moves the schedule.
// A card answered Not Yet comes back once at the end of the sitting, and that
// second answer leaves the schedule where it is, though it does count as a day
// the card was recalled.

import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs';
import { KNOWN_AFTER_DAYS, isRecalled, type LearnGrade, type LearnReview } from './learnSchedule';

const SCHEDULER = fsrs(generatorParameters({ enable_fuzz: false, enable_short_term: false }));

const RATING: Record<LearnGrade, Grade> = {
  notYet: Rating.Again,
  withEffort: Rating.Hard,
  knewIt: Rating.Good,
  easily: Rating.Easy,
};

export type CourseCardState = {
  /** The day this card comes back. */
  readyOn: string;
  /** The first day it was answered, which is the day it stopped being new. */
  firstDay: string;
  /** Separate days it was recalled on. */
  recalledDays: number;
  answers: number;
};

function noonOf(day: string): Date {
  return new Date(`${day}T12:00:00.000Z`);
}

function dayOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Answers in one order whichever device kept them first: by time, then by what was said. */
function byAnswerOrder(a: LearnReview, b: LearnReview): number {
  if (a.answeredAt !== b.answeredAt) return a.answeredAt < b.answeredAt ? -1 : 1;
  return a.grade < b.grade ? -1 : a.grade > b.grade ? 1 : 0;
}

/** One card's standing, from its answers. Null for a card never answered. */
export function replayCourseCard(reviews: LearnReview[]): CourseCardState | null {
  if (reviews.length === 0) return null;
  const ordered = [...reviews].sort(byAnswerOrder);
  let card: Card | null = null;
  let lastDay = '';
  let readyOn = '';
  const recalled = new Set<string>();
  for (const review of ordered) {
    if (isRecalled(review.grade)) recalled.add(review.day);
    if (review.day === lastDay) continue;
    // Days only ever move forward: an answer dated before the last one (a
    // phone clock set wrong) counts as recalled but does not rewind the card.
    if (lastDay && review.day < lastDay) continue;
    const at = noonOf(review.day);
    card = SCHEDULER.next(card ?? createEmptyCard(at), at, RATING[review.grade]).card;
    lastDay = review.day;
    readyOn = dayOf(card.due);
  }
  return { readyOn, firstDay: ordered[0].day, recalledDays: recalled.size, answers: ordered.length };
}

export function replayCourse(reviews: LearnReview[]): Map<string, CourseCardState> {
  const byCard = new Map<string, LearnReview[]>();
  for (const review of reviews) {
    const list = byCard.get(review.cardId);
    if (list) list.push(review);
    else byCard.set(review.cardId, [review]);
  }
  const states = new Map<string, CourseCardState>();
  for (const [id, list] of byCard) {
    const state = replayCourseCard(list);
    if (state) states.set(id, state);
  }
  return states;
}

/** Learned means what Things You Now Know means: recalled on two separate days. */
export function isLearned(state: CourseCardState | undefined): boolean {
  return !!state && state.recalledDays >= KNOWN_AFTER_DAYS;
}
