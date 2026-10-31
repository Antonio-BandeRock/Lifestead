// Interests > Learn, the schedule underneath every deck (2026-10-30, Learn
// part 6a). Pure, with no imports, so scripts/test_learn.js checks it
// without a phone.
//
// The schedule is SM-2, the method Piotr Wozniak published for SuperMemo in
// 1987 and the one most flashcard apps still start from: each answer moves
// a card's ease up or down, a card recalled comes back after a longer gap
// each time, and a card not recalled starts again from one day. Nothing
// stores a card's schedule. It is worked out each time by replaying the
// card's answers in order, so the answers (learn_reviews, append-only) are
// the only record and nothing can drift out of step with them.
//
// Two things this app adds, both on purpose:
// 1. Only the first answer to a card on a day moves its schedule. Seeing a
//    missed card again later in the same sitting is practice, and counting
//    it would make a card look learned after one sitting.
// 2. A card waiting longer than its gap is simply ready. Nothing here counts
//    how late it is, and no wording anywhere says a card was missed.
//
// "Things you now know" is a card recalled on two separate days. It is
// counted from the answers alone, so it never goes down: forgetting a card
// later brings it back for review and leaves the count where it was.

/** How an answer went, in the words the buttons use. */
export type LearnGrade = 'notYet' | 'withEffort' | 'knewIt' | 'easily';

export const LEARN_GRADES: LearnGrade[] = ['notYet', 'withEffort', 'knewIt', 'easily'];

export const LEARN_GRADE_LABELS: Record<LearnGrade, string> = {
  notYet: 'Not Yet',
  withEffort: 'With Effort',
  knewIt: 'Knew It',
  easily: 'Easily',
};

/** SM-2's quality score for each answer, on its 0 to 5 scale. */
const QUALITY: Record<LearnGrade, number> = { notYet: 1, withEffort: 3, knewIt: 4, easily: 5 };

export function readLearnGrade(value: string): LearnGrade {
  return (LEARN_GRADES as string[]).includes(value) ? (value as LearnGrade) : 'notYet';
}

export function isRecalled(grade: LearnGrade): boolean {
  return QUALITY[grade] >= 3;
}

/** One answer to one card. day is the local calendar day, YYYY-MM-DD. */
export type LearnReview = { cardId: string; day: string; grade: LearnGrade; answeredAt: string };

export type CardState = {
  /** How many recalls in a row since the last Not Yet. */
  repetitions: number;
  /** Days until the card is ready again, from lastDay. */
  interval: number;
  ease: number;
  lastDay: string | null;
  /** The day the card is ready again; null for a card never answered. */
  readyOn: string | null;
  /** Separate days on which the card was recalled. */
  recalledDays: number;
};

const START_EASE = 2.5;
const LOWEST_EASE = 1.3;

export function newCardState(): CardState {
  return { repetitions: 0, interval: 0, ease: START_EASE, lastDay: null, readyOn: null, recalledDays: 0 };
}

/** Adds whole days to a YYYY-MM-DD day, as a calendar day, never through a clock time. */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Whole calendar days from one day to another. */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/** One SM-2 step. */
export function stepCard(state: CardState, grade: LearnGrade, day: string): CardState {
  const q = QUALITY[grade];
  const ease = Math.max(LOWEST_EASE, state.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  let repetitions: number;
  let interval: number;
  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions = state.repetitions + 1;
    interval = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(state.interval * ease);
  }
  return {
    repetitions,
    interval,
    ease: Math.round(ease * 1000) / 1000,
    lastDay: day,
    readyOn: addDays(day, interval),
    recalledDays: state.recalledDays,
  };
}

/**
 * Replays one card's answers into its state. Answers may come in any order;
 * only the first on each day moves the schedule, and every day with a recall
 * counts toward knowing it.
 */
export function replayCard(reviews: LearnReview[]): CardState {
  const ordered = [...reviews].sort((a, b) => (a.answeredAt < b.answeredAt ? -1 : a.answeredAt > b.answeredAt ? 1 : 0));
  let state = newCardState();
  const scheduledDays = new Set<string>();
  const recalledDays = new Set<string>();
  for (const review of ordered) {
    if (isRecalled(review.grade)) recalledDays.add(review.day);
    if (scheduledDays.has(review.day)) continue;
    scheduledDays.add(review.day);
    state = stepCard(state, review.grade, review.day);
  }
  return { ...state, recalledDays: recalledDays.size };
}

/** A card is known once it has been recalled on two separate days. */
export const KNOWN_AFTER_DAYS = 2;

export function groupReviewsByCard(reviews: LearnReview[]): Map<string, LearnReview[]> {
  const byCard = new Map<string, LearnReview[]>();
  for (const review of reviews) {
    const list = byCard.get(review.cardId);
    if (list) list.push(review);
    else byCard.set(review.cardId, [review]);
  }
  return byCard;
}

/**
 * Things you now know, counted from every answer ever kept, including cards
 * from a deck no longer offered, so the count only grows.
 */
export function countKnown(reviews: LearnReview[]): number {
  let known = 0;
  for (const list of groupReviewsByCard(reviews).values()) {
    const days = new Set(list.filter((review) => isRecalled(review.grade)).map((review) => review.day));
    if (days.size >= KNOWN_AFTER_DAYS) known++;
  }
  return known;
}

/** How many cards one sitting offers at most, and how many of them may be new. */
export const SITTING_SIZE = 10;
export const NEW_PER_SITTING = 5;

export type Sitting = {
  /** Card ids in the order they are offered: ready ones first, then new ones. */
  cardIds: string[];
  readyCount: number;
  newCount: number;
  /** The next day a card in this deck is ready, when none is ready today. */
  nextReadyOn: string | null;
};

/**
 * What one sitting offers from a deck today: cards whose day has come
 * (longest waiting first, since they are the likeliest to slip), then a few
 * never answered, in the deck's order.
 */
export function planSitting(cardIds: string[], reviews: LearnReview[], today: string): Sitting {
  const byCard = groupReviewsByCard(reviews);
  const ready: { id: string; readyOn: string }[] = [];
  const fresh: string[] = [];
  let nextReadyOn: string | null = null;
  for (const id of cardIds) {
    const list = byCard.get(id);
    if (!list || list.length === 0) {
      fresh.push(id);
      continue;
    }
    const state = replayCard(list);
    if (state.readyOn && state.readyOn <= today) ready.push({ id, readyOn: state.readyOn });
    else if (state.readyOn && (nextReadyOn === null || state.readyOn < nextReadyOn)) nextReadyOn = state.readyOn;
  }
  ready.sort((a, b) => (a.readyOn < b.readyOn ? -1 : a.readyOn > b.readyOn ? 1 : 0));
  const readyIds = ready.slice(0, SITTING_SIZE).map((card) => card.id);
  const room = Math.min(NEW_PER_SITTING, SITTING_SIZE - readyIds.length);
  const newIds = fresh.slice(0, Math.max(0, room));
  return { cardIds: [...readyIds, ...newIds], readyCount: readyIds.length, newCount: newIds.length, nextReadyOn };
}

/** Where a deck stands, for its row: seen, known, and what a sitting would offer. */
export type DeckStanding = { total: number; seen: number; known: number; sitting: Sitting };

export function deckStanding(cardIds: string[], reviews: LearnReview[], today: string): DeckStanding {
  const ids = new Set(cardIds);
  const mine = reviews.filter((review) => ids.has(review.cardId));
  const byCard = groupReviewsByCard(mine);
  return {
    total: cardIds.length,
    seen: byCard.size,
    known: countKnown(mine),
    sitting: planSitting(cardIds, mine, today),
  };
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A ready day in words: tomorrow, a weekday within the week, or a date. */
export function describeReadyDay(day: string, today: string): string {
  const gap = daysBetween(today, day);
  if (gap <= 0) return 'today';
  if (gap === 1) return 'tomorrow';
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (gap < 7) return `on ${WEEKDAYS[date.getUTCDay()]}`;
  return `on ${d} ${MONTHS[m - 1]}`;
}

/** The line under a deck: what is ready, with no count of anything left waiting. */
export function describeDeckReady(standing: DeckStanding, today: string): string {
  const { sitting, total, seen } = standing;
  const offered = sitting.cardIds.length;
  if (offered > 0) {
    if (seen === 0) return offered === 1 ? '1 card to start with.' : `${offered} cards to start with.`;
    return offered === 1 ? '1 card is ready when you are.' : `${offered} cards are ready when you are.`;
  }
  if (sitting.nextReadyOn) return `More cards are ready ${describeReadyDay(sitting.nextReadyOn, today)}.`;
  if (total === 0) return 'This deck has no cards yet.';
  return 'Every card here is waiting for its day.';
}

export function describeKnown(known: number): string {
  if (known === 0) return 'Things you now know show here once a card has come back to you on two separate days.';
  return known === 1 ? '1 thing you now know.' : `${known} things you now know.`;
}

/**
 * What is said when a sitting ends, which never mentions a card not
 * recalled. moreNow is how many cards another sitting would offer straight
 * away (new ones the last sitting had no room for).
 */
export function describeSittingDone(knownNow: number, moreNow: number, nextReadyOn: string | null, today: string): string {
  const head =
    moreNow > 0
      ? `That is this sitting. ${moreNow === 1 ? '1 more card is' : `${moreNow} more cards are`} ready whenever you want them.`
      : `That is every card ready for now.${nextReadyOn ? ` More are ready ${describeReadyDay(nextReadyOn, today)}.` : ''}`;
  const known = knownNow === 1 ? '1 thing you now know.' : knownNow > 1 ? `${knownNow} things you now know.` : '';
  return known ? `${head} ${known}` : head;
}
