// Inside Knowledge, the Home card for Interests > Learn (2026-10-31, Learn
// part 6e). It says the one figure Learn keeps on its lens, things you now
// know, a count that only grows, and which decks have cards back for their
// day, by name and with no count of what is waiting. Never a share, never a
// day missed, never anything that asks to be kept up. Pure, so
// scripts/test_learn.js reads it without a phone.

import type { LearnDeck } from './learnDecks';
import { countKnown, describeKnown, describeReadyDay, planSitting, type LearnReview } from './learnSchedule';

type Translate = (text: string, values?: Record<string, string | number>) => string;
const plain: Translate = (text, values) => (values ? text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? '')) : text);

export type InsideKnowledge = {
  /** The things you now know line, the same words Learn uses. */
  known: string;
  /** What is back today, or when the next card comes back, or how to start. */
  ready: string;
  /** Titles of the decks with a card back for its day, in deck order. */
  readyDecks: string[];
};

function listInWords(names: string[], t: Translate): string {
  if (names.length === 1) return names[0];
  return t('{first} and {last}', { first: names.slice(0, -1).join(', '), last: names[names.length - 1] });
}

export function insideKnowledge(decks: LearnDeck[], reviews: LearnReview[], today: string, t: Translate = plain): InsideKnowledge {
  const answered = new Set(reviews.map((review) => review.cardId));
  const readyDecks: string[] = [];
  let nextOn: string | null = null;
  for (const deck of decks) {
    const ids = deck.cards.map((card) => card.id);
    if (!ids.some((id) => answered.has(id))) continue;
    const sitting = planSitting(ids, reviews, today);
    if (sitting.readyCount > 0) readyDecks.push(t(deck.title));
    else if (sitting.nextReadyOn && (nextOn === null || sitting.nextReadyOn < nextOn)) nextOn = sitting.nextReadyOn;
  }
  // Left in English here: the Text that shows it translates the same pattern Learn shows.
  const known = describeKnown(countKnown(reviews));
  let ready: string;
  if (readyDecks.length > 0) ready = t('Cards are back for their day in {decks}.', { decks: listInWords(readyDecks, t) });
  else if (answered.size === 0) ready = t('Learn has ready-made decks to start whenever you like, a few cards at a time.');
  else if (nextOn) ready = t('The next cards come back {when}. New cards are there whenever you want them.', { when: t(describeReadyDay(nextOn, today)) });
  else ready = t('New cards are there whenever you want them.');
  return { known, ready, readyDecks };
}
