// Interests > Learn, the kinds of question a card can be (2026-10-30, Learn
// part 6b). Pure, with no imports, so scripts/test_learn.js checks it
// without a phone. components/LearnCardView.tsx draws each kind.
//
// Every kind ends the same way: the answer side shows, and the person says
// how it went with the same four buttons, because they know better than any
// check whether a right pick was a guess. A check only tells them what the
// answer is and, for a pick that is not it, why not. Nothing is counted
// across cards, and no wording says an answer was wrong: a pick that is not
// the answer reads "Not this one" with its reason.
//
// The kinds:
//   flip      question, then answer (the default)
//   choice    pick one; every option carries why it is or is not the answer
//   estimate  the same as choice, offered as a best guess in words, never a number to type
//   case      a short story first, then a choice about it
//   blank     type the missing word or words into the gap
//   order     put the items in order, then see the order and why
//   pairs     match the tiles on the left to the tiles on the right
//   explain   say or type it in your words, then read the answer beside it

export type LearnKind = 'flip' | 'choice' | 'estimate' | 'case' | 'blank' | 'order' | 'pairs' | 'explain';

export const LEARN_KINDS: LearnKind[] = ['flip', 'choice', 'estimate', 'case', 'blank', 'order', 'pairs', 'explain'];

/** One option of a choice, an estimate or a case, with why it is or is not the answer. */
export type LearnOption = { text: string; why: string };

/** The parts a card carries beyond its front and back, by kind. */
export type LearnCardParts = {
  kind?: LearnKind;
  /** choice, estimate, case: the options, and which one is the answer. */
  options?: LearnOption[];
  answer?: number;
  /** case: the story read before the question. */
  story?: string;
  /** blank: what counts as filling the gap, written in the front as ____. */
  accept?: string[];
  /** order: the items in their right order. */
  items?: string[];
  /** pairs: what goes with what. */
  pairs?: { left: string; right: string }[];
};

export const BLANK = '____';

export function kindOf(card: LearnCardParts): LearnKind {
  return card.kind ?? 'flip';
}

/** Lower case, accents and punctuation gone, spaces squeezed, so a typed answer is read kindly. */
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(the|a|an|el|la|los|las|un|una) /, '');
}

export function checkBlank(accept: string[], typed: string): boolean {
  const said = normalizeAnswer(typed);
  if (!said) return false;
  return accept.some((answer) => normalizeAnswer(answer) === said);
}

/** A small seeded shuffle, so the same card shows its tiles the same way all day. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function random(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The indexes 0..n-1 in a shuffled order fixed by the seed. With more than
 * one item the result is never the right order, so ordering is never done
 * before it starts.
 */
export function shuffledIndexes(n: number, seed: string): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  const next = random(hash(seed));
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (n > 1 && order.every((value, i) => value === i)) order.push(order.shift() as number);
  return order;
}

/** Which places in an order the person put together hold the right item. */
export function orderPlaces(rightOrder: string[], chosen: string[]): boolean[] {
  return rightOrder.map((item, i) => chosen[i] === item);
}

export function orderIsRight(rightOrder: string[], chosen: string[]): boolean {
  return chosen.length === rightOrder.length && orderPlaces(rightOrder, chosen).every(Boolean);
}

/** Whether a left tile and a right tile belong together. */
export function isPair(pairs: { left: string; right: string }[], left: string, right: string): boolean {
  return pairs.some((pair) => pair.left === left && pair.right === right);
}

/** The line shown over a pick, with its reason. */
export function describePick(option: LearnOption, isAnswer: boolean): string {
  return isAnswer ? `That is it. ${option.why}` : `Not this one. ${option.why}`;
}

export function describeBlank(right: boolean, accept: string[]): string {
  return right ? 'That is it.' : `The gap holds "${accept[0]}".`;
}

export function describeOrder(right: boolean): string {
  return right ? 'That is the order.' : 'This is the order:';
}

export const PAIRS_NOT_A_PAIR = 'Those two do not go together. Try another.';
export const PAIRS_ALL_MATCHED = 'Every tile has its pair.';

/** The heading over a card, by kind, so each says what it asks of you. */
export const KIND_PROMPTS: Record<LearnKind, string> = {
  flip: 'Answer it in your head, then turn it over.',
  choice: 'Pick one.',
  estimate: 'Make your best guess.',
  case: 'Read what happened, then pick one.',
  blank: 'Fill in the gap.',
  order: 'Tap them in order, first to last.',
  pairs: 'Tap a tile on the left, then the one it goes with.',
  explain: 'Say or type it in your words, then turn it over to read it beside yours.',
};

/** What is wrong with a card's parts for its kind, empty when it is fine. */
export function cardProblems(card: LearnCardParts & { front: string; back: string }): string[] {
  const problems: string[] = [];
  const kind = kindOf(card);
  if (!LEARN_KINDS.includes(kind)) problems.push(`unknown kind ${kind}`);
  if (kind === 'choice' || kind === 'estimate' || kind === 'case') {
    const options = card.options ?? [];
    if (options.length < 2) problems.push('fewer than two options');
    if (card.answer === undefined || card.answer < 0 || card.answer >= options.length) problems.push('answer is not one of the options');
    if (options.some((option) => !option.text || !option.why)) problems.push('an option has no reason');
    if (new Set(options.map((option) => option.text)).size !== options.length) problems.push('two options say the same');
  }
  if (kind === 'case' && !card.story) problems.push('a case has no story');
  if (kind === 'blank') {
    if (!card.front.includes(BLANK)) problems.push('a blank card has no gap');
    if (!card.accept || card.accept.length === 0) problems.push('a blank card accepts nothing');
  }
  if (kind === 'order') {
    const items = card.items ?? [];
    if (items.length < 3) problems.push('fewer than three items to order');
    if (new Set(items).size !== items.length) problems.push('two items say the same');
  }
  if (kind === 'pairs') {
    const pairs = card.pairs ?? [];
    if (pairs.length < 3) problems.push('fewer than three pairs');
    if (new Set(pairs.map((p) => p.left)).size !== pairs.length || new Set(pairs.map((p) => p.right)).size !== pairs.length) {
      problems.push('a tile appears twice');
    }
  }
  return problems;
}
