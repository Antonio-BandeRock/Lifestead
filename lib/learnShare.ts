// Interests > Learn, sharing a deck a person made (2026-10-31, Learn part 6e).
// A deck travels as one more kind of payload inside the same signed .is
// envelope a recipe uses (lib/sharing.ts), so the receiving phone checks the
// signature before anything here reads it. Nothing in this file touches the
// database or the file system: it builds what is sent, and it reads what
// arrives with no trust in it, card by card, keeping only what would pass the
// card form (draftProblem) and counting the rest.
//
// Only the cards travel. The answers behind them, the schedule and what the
// person now knows stay with the person who made the deck.

import { LEARN_KINDS, type LearnKind } from './learnKinds';
import { draftProblem, emptyDraft, rowToDraft, type CardDraft, type MyCardRow, type MyDeckRow } from './learnMyDecks';

/** The most cards one shared deck carries, the same as one table import. */
export const SHARE_DECK_CARD_LIMIT = 2000;
/** Photos travel small; past this many the rest of the cards go without theirs, so the file stays one a message can carry. */
export const SHARE_DECK_PHOTO_LIMIT = 40;
/** A shared photo is at most about 60 KB, which is 80,000 characters of base64; anything far past that is not one of ours. */
const PHOTO_BASE64_MAX = 120_000;
const TEXT_MAX = 4000;

export type SharedCard = CardDraft & { photoBase64?: string };

export type ShareDeckPayload = {
  kind: 'deck';
  title: string;
  about: string;
  cards: SharedCard[];
};

/** What is sent: the deck's words and its cards in order, with a photo on as many as the limit allows. */
export function buildDeckPayload(deck: MyDeckRow, rows: MyCardRow[], photos: Map<string, string>): ShareDeckPayload {
  let photosLeft = SHARE_DECK_PHOTO_LIMIT;
  const cards = rows.slice(0, SHARE_DECK_CARD_LIMIT).map((row) => {
    const draft: SharedCard = rowToDraft(row);
    const photo = photos.get(row.id);
    if (photo && photosLeft > 0) {
      draft.photoBase64 = photo;
      photosLeft -= 1;
    }
    return draft;
  });
  return { kind: 'deck', title: deck.title, about: deck.about, cards };
}

/** How many of a deck's cards have a photo that would be left behind, so the sender is told before it goes. */
export function photosLeftBehind(photoCount: number): number {
  return Math.max(0, photoCount - SHARE_DECK_PHOTO_LIMIT);
}

/** The shape check lib/sharing.ts makes before the signature is verified. */
export function isDeckPayloadShape(payload: unknown): payload is ShareDeckPayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Partial<ShareDeckPayload>;
  return (
    p.kind === 'deck' &&
    typeof p.title === 'string' &&
    p.title.trim().length > 0 &&
    Array.isArray(p.cards) &&
    p.cards.length > 0 &&
    p.cards.length <= SHARE_DECK_CARD_LIMIT
  );
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, TEXT_MAX) : '';
}

function list<T>(value: unknown, read: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const item of value.slice(0, 50)) {
    const read1 = read(item);
    if (read1 !== null) out.push(read1);
  }
  return out;
}

function photo(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > PHOTO_BASE64_MAX) return undefined;
  return /^[A-Za-z0-9+/]+=*$/.test(value) ? value : undefined;
}

/** One card as it arrived, read into a draft the card form would accept, or null. */
export function readSharedCard(value: unknown): SharedCard | null {
  if (!value || typeof value !== 'object') return null;
  const c = value as Record<string, unknown>;
  if (typeof c.kind !== 'string' || !LEARN_KINDS.includes(c.kind as LearnKind)) return null;
  const draft: SharedCard = {
    ...emptyDraft(c.kind as LearnKind),
    front: text(c.front),
    back: text(c.back),
    thinking: c.thinking === true,
    story: text(c.story),
    options: list(c.options, (o) => (o && typeof o === 'object' ? { text: text((o as Record<string, unknown>).text), why: text((o as Record<string, unknown>).why) } : null)),
    answer: typeof c.answer === 'number' && Number.isInteger(c.answer) && c.answer >= 0 ? c.answer : 0,
    accept: text(c.accept),
    items: list(c.items, (i) => (typeof i === 'string' ? i.slice(0, TEXT_MAX) : null)),
    pairs: list(c.pairs, (p) => (p && typeof p === 'object' ? { left: text((p as Record<string, unknown>).left), right: text((p as Record<string, unknown>).right) } : null)),
  };
  if (draft.kind === 'choice' || draft.kind === 'estimate' || draft.kind === 'case') {
    if (draft.answer >= draft.options.length) return null;
  }
  if (draftProblem(draft) !== null) return null;
  const picture = photo(c.photoBase64);
  if (picture) draft.photoBase64 = picture;
  return draft;
}

export type ReadShare = { title: string; about: string; cards: SharedCard[]; skipped: number };

/** Everything that arrived, read card by card; a card that would not pass the form is counted, never kept. */
export function readSharedDeck(payload: ShareDeckPayload): ReadShare {
  const cards: SharedCard[] = [];
  let skipped = 0;
  for (const value of payload.cards.slice(0, SHARE_DECK_CARD_LIMIT)) {
    const card = readSharedCard(value);
    if (card) cards.push(card);
    else skipped += 1;
  }
  return { title: text(payload.title).trim().slice(0, 120), about: text(payload.about).trim(), cards, skipped };
}

/** The lines the receiving screen shows under the deck's name. */
export function describeSharedDeck(read: ReadShare, t: (text: string, values?: Record<string, string | number>) => string): string[] {
  const lines: string[] = [];
  const photos = read.cards.filter((card) => card.photoBase64).length;
  lines.push(read.cards.length === 1 ? t('1 card.') : t('{n} cards.', { n: read.cards.length }));
  if (photos > 0) lines.push(photos === 1 ? t('1 of them has a photo.') : t('{n} of them have a photo.', { n: photos }));
  if (read.skipped > 0) {
    lines.push(
      read.skipped === 1
        ? t('1 card in the file could not be read and is left out.')
        : t('{n} cards in the file could not be read and are left out.', { n: read.skipped }),
    );
  }
  return lines;
}
