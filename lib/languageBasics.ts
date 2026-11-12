// Interests > Languages, the sums behind it (2026-11-05). Pure, worked out each time
// from the cards, the hand-written outline and the answers kept in learn_reviews.
//
// A set of basics is what to learn first, so the rest gets easier: 26 plainly named
// units, each divided into plainly named decks. Nothing here names a language, so a
// new set is one more data file. See components/LanguagesSection.tsx.
//
// THE LADDER replaces FSRS for this material. FSRS's Good always lengthens the wait,
// so it has no way to say "keep this in the same rotation", and that is what the
// middle indicator means. A card stands on a step of LADDER_DAYS: + moves it down a
// step and brings it back once at the end of the sitting, = keeps the step, - moves
// it up. Only the first answer of a day moves it, and days only move forward, so
// answers replay to the same place on every device whatever order they arrived in.
//
// A DECK is a unit plus a group ("3|Rules: ser"). Groups are not contiguous along
// Seq and the same group name recurs across units, so the unit is part of the key,
// and a deck takes its place from its first card.

import type { CourseCard, CourseDeck } from './learnCourseFile';
import type { LearnGrade, LearnReview } from './learnSchedule';

export const LADDER_DAYS = [1, 2, 4, 7, 14, 30, 60, 120];
/** Where a card's very first answer starts from: + gives 1 day, = gives 2, - gives 4. */
export const LADDER_START = 1;
export const SITTING_SIZE = 20;
export const DEFAULT_DAILY_NEW = 15;

/** Units studied together, kept so Home can offer them again. */
export type StudyGroup = { units: number[]; order: 'learning' | 'random' };

/** How many studied groups a set keeps. A new one goes first and an equal one moves up. */
export const STUDY_GROUP_LIMIT = 6;

export function withStudyGroup(groups: StudyGroup[], group: StudyGroup): StudyGroup[] {
  const units = [...new Set(group.units)].sort((a, b) => a - b);
  const same = (other: StudyGroup) => other.units.length === units.length && other.units.every((unit, index) => unit === units[index]);
  return [{ units, order: group.order }, ...groups.filter((other) => !same(other))].slice(0, STUDY_GROUP_LIMIT);
}

export type LadderState = { step: number; readyOn: string; firstDay: string; lastDay: string; answers: number };
export type LadderStates = Map<string, LadderState>;

/** The three indicators on a card, as the grade strings already stored. An older With Effort answer reads as the same rotation. */
export type LanguageIndicator = 'more' | 'same' | 'less';
export const INDICATOR_GRADES: Record<LanguageIndicator, LearnGrade> = { more: 'notYet', same: 'knewIt', less: 'easily' };

function stepAfter(step: number, grade: LearnGrade): number {
  if (grade === 'notYet') return Math.max(0, step - 1);
  if (grade === 'easily') return Math.min(LADDER_DAYS.length - 1, step + 1);
  return step;
}

function addDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

/** Where one card stands, or null if it was never answered. */
export function replayLadderCard(reviews: LearnReview[]): LadderState | null {
  if (reviews.length === 0) return null;
  const inOrder = [...reviews].sort(
    (a, b) => a.day.localeCompare(b.day) || a.answeredAt.localeCompare(b.answeredAt) || a.grade.localeCompare(b.grade),
  );
  let state = null as LadderState | null;
  for (const review of inOrder) {
    if (!state) {
      const step = stepAfter(LADDER_START, review.grade);
      state = { step, readyOn: addDays(review.day, LADDER_DAYS[step]), firstDay: review.day, lastDay: review.day, answers: 1 };
    } else if (review.day === state.lastDay) {
      state = { ...state, answers: state.answers + 1 };
    } else {
      const step = stepAfter(state.step, review.grade);
      state = { ...state, step, readyOn: addDays(review.day, LADDER_DAYS[step]), lastDay: review.day, answers: state.answers + 1 };
    }
  }
  return state;
}

export function replayLadder(reviews: LearnReview[]): LadderStates {
  const byCard = new Map<string, LearnReview[]>();
  for (const review of reviews) {
    const kept = byCard.get(review.cardId);
    if (kept) kept.push(review);
    else byCard.set(review.cardId, [review]);
  }
  const states: LadderStates = new Map();
  for (const [cardId, kept] of byCard) {
    const state = replayLadderCard(kept);
    if (state) states.set(cardId, state);
  }
  return states;
}

/** How many new cards a day's limit still leaves, worked out from the answers. */
export function newLeftToday(states: LadderStates, today: string, dailyLimit: number): number {
  let started = 0;
  for (const state of states.values()) if (state.firstDay === today) started++;
  return Math.max(0, dailyLimit - started);
}

/** Today's stirring: the same all day, different tomorrow. */
export function dayHash(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export type SittingOrder = 'learning' | 'random';

export type SittingPlanInput = {
  /** The selected units' cards, or one deck's. */
  cards: CourseCard[];
  states: LadderStates;
  today: string;
  order: SittingOrder;
  /** How many new cards may start. A deck chosen by hand passes null, which ignores the limit. */
  newLeft: number | null;
  /** Cards already answered today, left out of going over. */
  answeredToday: Set<string>;
};

export type SittingPlan = {
  cardIds: string[];
  /** Nothing was waiting, so these are offered anyway. The screen says so. */
  goingOver: boolean;
};

function arrange(cards: CourseCard[], order: SittingOrder, today: string): CourseCard[] {
  if (order === 'random') {
    return cards
      .map((card) => ({ card, stir: dayHash(`${today}${card.id}`) }))
      .sort((a, b) => a.stir - b.stir)
      .map(({ card }) => card);
  }
  return [...cards].sort((a, b) => a.seq - b.seq);
}

export function planSitting({ cards, states, today, order, newLeft, answeredToday }: SittingPlanInput): SittingPlan {
  const ready = cards.filter((card) => {
    const state = states.get(card.id);
    return !!state && state.readyOn <= today;
  });
  const fresh = [...cards].filter((card) => !states.has(card.id)).sort((a, b) => a.seq - b.seq);
  // New cards always arrive in Seq, even in a random sitting: the limit decides which, and the order only stirs them after.
  const allowedNew = newLeft === null ? fresh : fresh.slice(0, newLeft);
  const pool = [...ready, ...allowedNew];
  if (pool.length > 0) {
    return { cardIds: arrange(pool, order, today).slice(0, SITTING_SIZE).map((card) => card.id), goingOver: false };
  }
  const seen = cards.filter((card) => states.has(card.id));
  const notToday = seen.filter((card) => !answeredToday.has(card.id));
  const over = notToday.length > 0 ? notToday : seen.length > 0 ? seen : fresh;
  return { cardIds: arrange(over, order, today).slice(0, SITTING_SIZE).map((card) => card.id), goingOver: over.length > 0 };
}

// ---- Units and decks ----

export type LanguageOutline = {
  id: string;
  units: Record<string, { name: string; description: string }>;
  groups: Record<string, { name: string; links: Record<string, string> }>;
};

export type LanguageDeck = { key: string; unit: number; group: string; name: string; firstSeq: number; cards: CourseCard[] };
export type LanguageUnit = { unit: number; name: string; description: string; decks: LanguageDeck[]; cards: CourseCard[] };

export function deckKeyOf(card: Pick<CourseCard, 'unit' | 'group'>): string {
  return `${card.unit}|${card.group}`;
}

/** Every unit in learning order, each with its decks in the order they begin. */
export function unitsOf(cards: CourseCard[], outline: LanguageOutline): LanguageUnit[] {
  const decks = new Map<string, LanguageDeck>();
  for (const card of [...cards].sort((a, b) => a.seq - b.seq)) {
    const key = deckKeyOf(card);
    const deck = decks.get(key);
    if (deck) deck.cards.push(card);
    else decks.set(key, { key, unit: card.unit, group: card.group, name: outline.groups[key]?.name ?? card.group, firstSeq: card.seq, cards: [card] });
  }
  const units = new Map<number, LanguageUnit>();
  for (const deck of decks.values()) {
    const unit = units.get(deck.unit);
    if (unit) {
      unit.decks.push(deck);
      unit.cards.push(...deck.cards);
    } else {
      const named = outline.units[String(deck.unit)];
      units.set(deck.unit, { unit: deck.unit, name: named?.name ?? deck.cards[0].unitName, description: named?.description ?? '', decks: [deck], cards: [...deck.cards] });
    }
  }
  return [...units.values()].sort((a, b) => a.unit - b.unit);
}

/** The units that are on, in learning order and named from the outline alone, so Home never reads a card. */
export function unitsTurnedOn(outline: LanguageOutline, turnedOn: number[]): { unit: number; name: string }[] {
  const on = new Set(turnedOn);
  return Object.keys(outline.units)
    .map(Number)
    .filter((unit) => on.has(unit))
    .sort((a, b) => a - b)
    .map((unit) => ({ unit, name: outline.units[String(unit)].name }));
}

// ---- The information icon ----

export type DeckLink = { name: string; why: string };
export type DeckRule = { target: string; native: string };

export type DeckInfo = {
  /** Earlier decks this one builds on, with at least one answer. */
  worked: DeckLink[];
  /** Earlier decks this one builds on, with none yet. */
  notYet: DeckLink[];
  /** Rule cards elsewhere in the unit. */
  rules: DeckRule[];
  /** A unit with no other rule falls back to what the deck's own cards say to remember. */
  remember: string[];
};

export function deckInfo(deckKey: string, cards: CourseCard[], outline: LanguageOutline, answered: Set<string>): DeckInfo {
  const links = outline.groups[deckKey]?.links ?? {};
  const worked: DeckLink[] = [];
  const notYet: DeckLink[] = [];
  for (const [key, why] of Object.entries(links)) {
    const link = { name: outline.groups[key]?.name ?? key, why };
    if (cards.some((card) => deckKeyOf(card) === key && answered.has(card.id))) worked.push(link);
    else notYet.push(link);
  }
  const inDeck = cards.filter((card) => deckKeyOf(card) === deckKey);
  const unit = inDeck[0]?.unit;
  const rules = cards
    .filter((card) => card.unit === unit && card.type === 'Rule' && deckKeyOf(card) !== deckKey)
    .sort((a, b) => a.seq - b.seq)
    .map((card) => ({ target: card.target, native: card.native }));
  const remember = rules.length > 0 ? [] : [...new Set(inDeck.map((card) => card.remember.trim()).filter(Boolean))];
  return { worked, notYet, rules, remember };
}

// ---- How one card fits ----
//
// Asked for 2026-11-11: How This Fits on a turned card says only what that card's own
// words touch, never the unit's whole list of rules or the deck's links, which every
// card in a deck would repeat. Two ways a rule card counts as touching a card:
//   1. a word on the card's front or back is in the rule's pattern, and the word is
//      uncommon across the set (under 4% of cards), so "es" or "the" ties nothing;
//   2. on a verb card, its forms take the same endings as the rule's pattern, once the
//      stem is taken off both (llevaré against trabajaré: é, ás, á, emos, án).
// Only rules from this card's unit or earlier count, so nothing points ahead.

/** A rule a card uses, and the word on the card that ties it there (empty when its endings do). */
export type CardRule = { target: string; native: string; word: string };
export type CardFits = { remember: string; rules: CardRule[] };

const CARD_RULE_LIMIT = 3;
const COMMON_SHARE = 0.04;
// Subject words sit beside every verb form, and the helper forms beside every perfect,
// so they are never what ties a card to a rule.
const NEVER_TIES = new Set([
  'yo', 'tú', 'él', 'ella', 'usted', 'le', 'nosotros', 'nosotras', 'ellos', 'ellas', 'ustedes', 'que', 'no', 'me', 'te', 'se', 'nos',
  'i', 'you', 'he', 'she', 'we', 'they', 'it', 'will', 'would', 'have', 'has', 'had', 'was', 'were', 'am', 'is', 'are', 'do', 'does', "don't", "doesn't", 'not',
]);

function wordsOf(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[¿?¡!.,;:()[\]→·/…"“”'’=+✗✓@_]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !/^\d+$/.test(word));
}

function commonPrefix(words: string[]): string {
  if (words.length === 0) return '';
  let prefix = words[0];
  for (const word of words) while (!word.startsWith(prefix)) prefix = prefix.slice(0, -1);
  return prefix;
}

/** A verb card's forms with the subject words taken off, and its base form. */
function verbForms(card: CourseCard): { base: string; forms: string[] } | null {
  if (card.type !== 'Verb') return null;
  const [head, ...rest] = card.target.split('\n');
  const base = wordsOf(head.split('·')[0])[0] ?? '';
  const forms = wordsOf(rest.join(' ')).filter((word) => !NEVER_TIES.has(word));
  return base && forms.length >= 3 ? { base, forms } : null;
}

/** How many of a card's forms end the way the rule's pattern ends, the stem taken off both. */
function endingsShared(verb: { base: string; forms: string[] }, pattern: string[]): number {
  const words = pattern.filter((word) => !NEVER_TIES.has(word));
  if (words.length < 3) return 0;
  const stem = commonPrefix(words);
  if (stem.length < 2) return 0;
  const ruleEndings = new Set(words.map((word) => word.slice(stem.length)));
  let best = 0;
  // The future keeps the whole base form and the present drops its last two letters,
  // so the card's stem is tried both ways.
  for (const cardStem of [verb.base, verb.base.replace(/se$/, '').slice(0, -2)]) {
    const own = verb.forms.filter((form) => form.startsWith(cardStem)).map((form) => form.slice(cardStem.length));
    best = Math.max(best, new Set(own.filter((ending) => ruleEndings.has(ending))).size);
  }
  return best;
}

const wordCounts = new WeakMap<CourseCard[], Map<string, number>>();
function countsFor(cards: CourseCard[]): Map<string, number> {
  const known = wordCounts.get(cards);
  if (known) return known;
  const counts = new Map<string, number>();
  for (const card of cards) for (const word of new Set([...wordsOf(card.target), ...wordsOf(card.exampleTarget)])) counts.set(word, (counts.get(word) ?? 0) + 1);
  wordCounts.set(cards, counts);
  return counts;
}

export function cardFits(card: CourseCard, cards: CourseCard[]): CardFits {
  const counts = countsFor(cards);
  const common = Math.max(2, cards.length * COMMON_SHARE);
  const own = new Set(wordsOf(card.target).filter((word) => !NEVER_TIES.has(word)));
  const verb = verbForms(card);
  const found: { rank: number; seq: number; rule: CardRule }[] = [];
  for (const other of cards) {
    if (other.type !== 'Rule' || other.id === card.id || other.unit > card.unit) continue;
    const pattern = wordsOf(other.target);
    const shared = pattern.filter((word) => own.has(word) && (counts.get(word) ?? 0) < common);
    const rule = { target: other.target, native: other.native };
    if (shared.length > 0) {
      const rarest = shared.reduce((a, b) => ((counts.get(a) ?? 0) <= (counts.get(b) ?? 0) ? a : b));
      found.push({ rank: counts.get(rarest) ?? 0, seq: other.seq, rule: { ...rule, word: rarest } });
    } else if (verb && other.unit === card.unit && endingsShared(verb, pattern) >= Math.min(4, verb.forms.length)) {
      found.push({ rank: cards.length, seq: other.seq, rule: { ...rule, word: '' } });
    }
  }
  const rules = found
    .sort((a, b) => a.rank - b.rank || a.seq - b.seq)
    .slice(0, CARD_RULE_LIMIT)
    .map((item) => item.rule);
  return { remember: card.remember.trim(), rules };
}

export function cardHasFits(fits: CardFits): boolean {
  return fits.remember.length > 0 || fits.rules.length > 0;
}

// ---- Which sets a person sees ----

/** The language in a code, so es-MX and es_ES are both es. */
export function languagePart(code: string): string {
  return code.trim().split(/[-_]/)[0].toLowerCase();
}

/** Only the sets taught from the language the person speaks. */
export function setsForLanguage<T extends { deck: Pick<CourseDeck, 'nativeCode'> }>(sets: T[], appLanguage: string): T[] {
  const language = languagePart(appLanguage);
  return sets.filter((set) => languagePart(set.deck.nativeCode ?? '') === language);
}

