// Interests > Learn, How It Has Gone (2026-10-31, Learn part 6e). The one
// place in Learn that holds figures as shares of answers, by direct decision
// 2026-10-06: "we shouldn't push percentages, but we also shouldn't remove
// them. If they want them, it should be something they have to look at them
// selves by clicking the link." So these sentences are reached only through
// the How It Has Gone link at the foot of the lens, never on the lens itself,
// the Home card or a notification, and they state figures and nothing else:
// no word says how well or badly anything went. scripts/test_learn.js sweeps
// them for judging words and checks that no other Learn file holds a share.
//
// Pure, so the test reads it without a phone. Four views over the answers:
// by deck, by kind of card, by month, and, where the card had a check (a
// pick, a gap, an order or pairs), how often the check agreed with the
// answer, and how often it agreed when the person said Knew It or Easily.

import { kindOf, type LearnKind } from './learnKinds';
import type { LearnCard } from './learnDecks';
import { isRecalled, type LearnGrade } from './learnSchedule';

/** An answer as How It Has Gone reads it: matched is whether a check agreed, null where the card had none. */
export type GoneReview = { deckId: string; cardId: string; day: string; grade: LearnGrade; kind: LearnKind | null; matched: boolean | null };

type Translate = (text: string, values?: Record<string, string | number>) => string;
const plain: Translate = (text, values) => (values ? text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? '')) : text);

export const KIND_NAMES: Record<LearnKind, string> = {
  flip: 'Question and answer',
  choice: 'Pick one',
  estimate: 'Best guess',
  case: 'A case to read',
  blank: 'Fill the gap',
  order: 'Put in order',
  pairs: 'Match the pairs',
  explain: 'In your words',
};

/** A whole-number share, never a decimal that reads as more exact than a handful of answers can be. */
export function shareOf(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

export type GoneLine = { label: string; text: string };

function answersWord(n: number, t: Translate): string {
  return n === 1 ? t('1 answer') : t('{n} answers', { n });
}

function recalledLine(list: GoneReview[], t: Translate): string {
  const recalled = list.filter((review) => isRecalled(review.grade)).length;
  return t('{share}% answered With Effort, Knew It or Easily, of {answers}.', { share: shareOf(recalled, list.length), answers: answersWord(list.length, t) });
}

/** Fills in each answer's kind from the card it names when the answer was kept before kinds were. */
export function withKinds(reviews: GoneReview[], cardById: (id: string) => LearnCard | undefined): GoneReview[] {
  return reviews.map((review) => {
    if (review.kind) return review;
    const card = cardById(review.cardId);
    return { ...review, kind: card ? kindOf(card) : null };
  });
}

export function byDeck(reviews: GoneReview[], deckTitle: (id: string) => string | undefined, t: Translate = plain): GoneLine[] {
  const groups = new Map<string, GoneReview[]>();
  const gone: GoneReview[] = [];
  for (const review of reviews) {
    const title = deckTitle(review.deckId);
    if (!title) {
      gone.push(review);
      continue;
    }
    groups.set(title, [...(groups.get(title) ?? []), review]);
  }
  const lines = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, list]) => ({ label, text: recalledLine(list, t) }));
  if (gone.length > 0) lines.push({ label: t('Decks no longer here'), text: recalledLine(gone, t) });
  return lines;
}

export function byKind(reviews: GoneReview[], t: Translate = plain): GoneLine[] {
  const groups = new Map<LearnKind, GoneReview[]>();
  for (const review of reviews) {
    const kind = review.kind ?? 'flip';
    groups.set(kind, [...(groups.get(kind) ?? []), review]);
  }
  return (Object.keys(KIND_NAMES) as LearnKind[]).filter((kind) => groups.has(kind)).map((kind) => ({ label: t(KIND_NAMES[kind]), text: recalledLine(groups.get(kind)!, t) }));
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The months with answers in them, newest first, up to the last twelve. A month with none is left out rather than shown as nothing. */
export function byMonth(reviews: GoneReview[], t: Translate = plain): GoneLine[] {
  const groups = new Map<string, GoneReview[]>();
  for (const review of reviews) {
    const month = review.day.slice(0, 7);
    groups.set(month, [...(groups.get(month) ?? []), review]);
  }
  return [...groups.keys()]
    .sort()
    .reverse()
    .slice(0, 12)
    .map((month) => ({
      label: `${t(MONTHS[Number(month.slice(5, 7)) - 1])} ${month.slice(0, 4)}`,
      text: recalledLine(groups.get(month)!, t),
    }));
}

/** Where a card had a check: how often it agreed, and how often it agreed when the person said Knew It or Easily. */
export function checksLines(reviews: GoneReview[], t: Translate = plain): GoneLine[] {
  const checked = reviews.filter((review) => review.matched !== null);
  if (checked.length === 0) return [];
  const agreed = checked.filter((review) => review.matched).length;
  const lines: GoneLine[] = [
    {
      label: t('Cards with a check'),
      text: t('The pick, gap, order or pairs matched the answer in {share}% of {answers}.', { share: shareOf(agreed, checked.length), answers: answersWord(checked.length, t) }),
    },
  ];
  const sure = checked.filter((review) => review.grade === 'knewIt' || review.grade === 'easily');
  if (sure.length > 0) {
    lines.push({
      label: t('When you said Knew It or Easily'),
      text: t('The check matched the answer in {share}% of {answers}.', { share: shareOf(sure.filter((review) => review.matched).length, sure.length), answers: answersWord(sure.length, t) }),
    });
  }
  return lines;
}

export type HowItHasGone = { total: number; decks: GoneLine[]; kinds: GoneLine[]; months: GoneLine[]; checks: GoneLine[] };

export function howItHasGone(
  reviews: GoneReview[],
  deckTitle: (id: string) => string | undefined,
  cardById: (id: string) => LearnCard | undefined,
  t: Translate = plain,
): HowItHasGone {
  const all = withKinds(reviews, cardById);
  return { total: all.length, decks: byDeck(all, deckTitle, t), kinds: byKind(all, t), months: byMonth(all, t), checks: checksLines(all, t) };
}
