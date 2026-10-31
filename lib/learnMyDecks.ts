// Interests > Learn, decks a person makes (2026-10-30, Learn part 6e).
// Pure, with type-only imports, so scripts/test_learn.js checks it without a
// phone. lib/learnMyDecksDb.ts keeps the rows and
// components/LearnDeckEditor.tsx draws the form.
//
// Making a deck is part of Individual (decision 2026-10-06: Learn's
// ready-made decks are on Free, making your own is paid). A deck made while
// the plan was on stays open to study on Free, since nothing a person
// recorded is ever locked away from them; only making and changing wait.
//
// A card is kept as a draft of plain strings while it is typed, and becomes
// a LearnCard only when every part its kind needs is there. What is missing
// is said in plain words (draftProblem), shown through explainNotYet.
//
// Removing follows the open-list rule: a card or deck with answers behind it
// is retired, so learn_reviews never names a card that has gone, and
// Things You Now Know never shrinks. One with no answers is deleted.

import { BLANK, type LearnKind } from './learnKinds';
import type { LearnCard, LearnDeck } from './learnDecks';

/** The prefix every card and deck a person makes carries, so its id never meets a ready-made one. */
export const MY_DECK_PREFIX = 'my-';

/**
 * What a card's photo is kept under in the photo layer (lib/media.ts), so it
 * travels between the person's devices with every other photo. A photo shows
 * on the front, above the question.
 */
export const LEARN_CARD_OWNER_KIND = 'learn_card';

export type CardDraft = {
  kind: LearnKind;
  front: string;
  back: string;
  thinking: boolean;
  /** case: the story read before the question. */
  story: string;
  /** choice, estimate, case: each option with why it is or is not the answer. */
  options: { text: string; why: string }[];
  answer: number;
  /** blank: answers that fill the gap, one per line. */
  accept: string;
  /** order: the items in their right order. */
  items: string[];
  /** pairs: what goes with what. */
  pairs: { left: string; right: string }[];
};

export type MyCardRow = {
  id: string;
  deckId: string;
  kind: string;
  front: string;
  back: string;
  thinking: boolean;
  parts: string;
  position: number;
};

export type MyDeckRow = { id: string; title: string; about: string };

/** The kinds offered when making a card, with how each is named in the picker. */
export const KIND_LABELS: Record<LearnKind, string> = {
  flip: 'Question and answer',
  choice: 'Pick one',
  estimate: 'Best guess',
  case: 'A short case, then pick one',
  blank: 'Fill the gap',
  order: 'Put in order',
  pairs: 'Match the pairs',
  explain: 'Explain it in your words',
};

export function emptyDraft(kind: LearnKind = 'flip'): CardDraft {
  return {
    kind,
    front: '',
    back: '',
    thinking: false,
    story: '',
    options: [
      { text: '', why: '' },
      { text: '', why: '' },
    ],
    answer: 0,
    accept: '',
    items: ['', '', ''],
    pairs: [
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' },
    ],
  };
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function filled<T>(list: T[], has: (item: T) => boolean): T[] {
  return list.filter(has);
}

/**
 * The first thing a card still needs before it can be kept, in words the
 * person can act on, or null when it is ready.
 */
export function draftProblem(draft: CardDraft): string | null {
  const front = clean(draft.front);
  const back = clean(draft.back);
  if (!front) return 'The card needs a question on its front first.';
  if (!back) return 'The card needs an answer for its back first.';
  const kind = draft.kind;
  if (kind === 'case' && !clean(draft.story)) return 'A case card needs the short story that is read before the question.';
  if (kind === 'choice' || kind === 'estimate' || kind === 'case') {
    const options = draft.options;
    const typed = filled(options, (option) => clean(option.text) !== '');
    if (typed.length < 2) return 'Give at least two options to pick from.';
    const half = options.find((option) => (clean(option.text) === '') !== (clean(option.why) === ''));
    if (half) return 'Every option needs both its words and why it is or is not the answer.';
    const texts = typed.map((option) => clean(option.text).toLowerCase());
    if (new Set(texts).size !== texts.length) return 'Two options say the same thing. Change one of them.';
    const chosen = options[draft.answer];
    if (!chosen || !clean(chosen.text)) return 'Mark which option is the answer.';
  }
  if (kind === 'blank') {
    if (!front.includes(BLANK)) return `Put ${BLANK} in the question where the gap goes.`;
    if (draft.accept.split('\n').every((line) => !clean(line))) return 'Say what fills the gap, one answer per line.';
  }
  if (kind === 'order') {
    const items = filled(draft.items, (item) => clean(item) !== '').map((item) => clean(item).toLowerCase());
    if (items.length < 3) return 'Give at least three things to put in order.';
    if (new Set(items).size !== items.length) return 'Two of the things to order say the same. Change one of them.';
  }
  if (kind === 'pairs') {
    const pairs = draft.pairs;
    const half = pairs.find((pair) => (clean(pair.left) === '') !== (clean(pair.right) === ''));
    if (half) return 'Every pair needs both of its tiles.';
    const whole = filled(pairs, (pair) => clean(pair.left) !== '');
    if (whole.length < 3) return 'Give at least three pairs to match.';
    const lefts = whole.map((pair) => clean(pair.left).toLowerCase());
    const rights = whole.map((pair) => clean(pair.right).toLowerCase());
    if (new Set(lefts).size !== lefts.length || new Set(rights).size !== rights.length) {
      return 'A tile appears twice. Each tile needs different words.';
    }
  }
  return null;
}

/** The parts a kept card carries beyond its front and back, as stored. */
export function draftParts(draft: CardDraft): Record<string, unknown> {
  const kind = draft.kind;
  if (kind === 'choice' || kind === 'estimate' || kind === 'case') {
    const kept: { text: string; why: string }[] = [];
    let answer = 0;
    draft.options.forEach((option, index) => {
      if (!clean(option.text)) return;
      if (index === draft.answer) answer = kept.length;
      kept.push({ text: clean(option.text), why: clean(option.why) });
    });
    return kind === 'case' ? { options: kept, answer, story: clean(draft.story) } : { options: kept, answer };
  }
  if (kind === 'blank') return { accept: draft.accept.split('\n').map(clean).filter(Boolean) };
  if (kind === 'order') return { items: draft.items.map(clean).filter(Boolean) };
  if (kind === 'pairs') {
    return { pairs: draft.pairs.filter((pair) => clean(pair.left)).map((pair) => ({ left: clean(pair.left), right: clean(pair.right) })) };
  }
  return {};
}

const KINDS: LearnKind[] = ['flip', 'choice', 'estimate', 'case', 'blank', 'order', 'pairs', 'explain'];

function readKind(kind: string): LearnKind {
  return (KINDS as string[]).includes(kind) ? (kind as LearnKind) : 'flip';
}

function readParts(parts: string): Record<string, unknown> {
  try {
    const value = JSON.parse(parts) as unknown;
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** A stored card as the study view draws it. */
export function rowToCard(row: MyCardRow): LearnCard {
  const kind = readKind(row.kind);
  const parts = readParts(row.parts);
  const card: LearnCard = { id: row.id, front: row.front, back: row.back, thinking: row.thinking };
  if (kind !== 'flip') card.kind = kind;
  if (Array.isArray(parts.options)) card.options = parts.options as LearnCard['options'];
  if (typeof parts.answer === 'number') card.answer = parts.answer;
  if (typeof parts.story === 'string') card.story = parts.story;
  if (Array.isArray(parts.accept)) card.accept = parts.accept as string[];
  if (Array.isArray(parts.items)) card.items = parts.items as string[];
  if (Array.isArray(parts.pairs)) card.pairs = parts.pairs as LearnCard['pairs'];
  return card;
}

/** A stored card back in the form, to change it. */
export function rowToDraft(row: MyCardRow): CardDraft {
  const card = rowToCard(row);
  const draft = emptyDraft(readKind(row.kind));
  draft.front = card.front;
  draft.back = card.back;
  draft.thinking = card.thinking;
  draft.story = card.story ?? '';
  if (card.options && card.options.length > 0) draft.options = card.options.map((option) => ({ ...option }));
  draft.answer = card.answer ?? 0;
  draft.accept = (card.accept ?? []).join('\n');
  if (card.items && card.items.length > 0) draft.items = [...card.items];
  if (card.pairs && card.pairs.length > 0) draft.pairs = card.pairs.map((pair) => ({ ...pair }));
  return draft;
}

export function buildMyDeck(deck: MyDeckRow, cards: MyCardRow[]): LearnDeck {
  return {
    id: deck.id,
    title: deck.title,
    about: deck.about,
    cards: [...cards].sort((a, b) => a.position - b.position).map(rowToCard),
  };
}

/** What a deck's title still needs, or null. */
export function deckTitleProblem(title: string): string | null {
  return clean(title) ? null : 'The deck needs a name first.';
}

export type RemovalPlan = 'delete' | 'retire';

/** A card with answers behind it is retired, so its answers keep naming something. */
export function planCardRemoval(cardId: string, answeredCardIds: Set<string>): RemovalPlan {
  return answeredCardIds.has(cardId) ? 'retire' : 'delete';
}

export function planDeckRemoval(cardIds: string[], answeredCardIds: Set<string>): RemovalPlan {
  return cardIds.some((id) => answeredCardIds.has(id)) ? 'retire' : 'delete';
}

export function describeRemoval(what: 'card' | 'deck', plan: RemovalPlan): string {
  if (plan === 'delete') return what === 'card' ? 'This card has never been answered, so it is deleted.' : 'No card in this deck has been answered, so the deck is deleted.';
  return what === 'card'
    ? 'This card has been answered, so it is put away rather than deleted. It stops coming up, and what you came to know from it still counts.'
    : 'Cards in this deck have been answered, so the deck is put away rather than deleted. It stops showing here, and what you came to know from it still counts.';
}

/**
 * A plain line under a deck where fewer than half its cards ask how to weigh
 * something, since the ready-made decks keep those the majority. Null when
 * half or more do, or the deck is empty. Never a count or a score.
 */
export function describeThinkingShare(cards: { thinking: boolean }[]): string | null {
  if (cards.length === 0) return null;
  const thinking = cards.filter((card) => card.thinking).length;
  if (thinking * 2 >= cards.length) return null;
  return 'Most of these cards ask you to recall something. A card that asks why, or how sure anyone can be, can sit beside a fact and be marked as asking how to weigh it.';
}

export const MAKE_PAID_LINE =
  'Making decks is part of Individual. The ready-made decks and the decks from your records stay open on Free, and decks you made before stay open to study.';
