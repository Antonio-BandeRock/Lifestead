// Reading and writing the decks a person makes in Interests > Learn
// (2026-10-30, Learn part 6e). Every decision is in lib/learnMyDecks.ts;
// see learn_my_decks and learn_my_cards in lib/db.ts.

import { getDatabase } from './db';
import {
  buildMyDeck,
  draftParts,
  LEARN_CARD_OWNER_KIND,
  MY_DECK_PREFIX,
  planCardRemoval,
  planDeckRemoval,
  type CardDraft,
  type MyCardRow,
  type MyDeckRow,
  type RemovalPlan,
} from './learnMyDecks';
import type { LearnDeck } from './learnDecks';
import { buildDeckPayload, SHARE_DECK_PHOTO_LIMIT, type ReadShare, type ShareDeckPayload } from './learnShare';

function newId(what: 'deck' | 'card'): string {
  return `${MY_DECK_PREFIX}${what}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type CardSql = { id: string; deckId: string; kind: string; front: string; back: string; thinking: number; parts: string; position: number };

function toRow(row: CardSql): MyCardRow {
  return { ...row, thinking: row.thinking === 1 };
}

export async function listMyDeckRows(): Promise<MyDeckRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<MyDeckRow>(
    'SELECT id, title, about FROM learn_my_decks WHERE retired_at IS NULL ORDER BY created_at',
  );
}

export async function listMyCardRows(deckId?: string): Promise<MyCardRow[]> {
  const db = await getDatabase();
  const sql =
    'SELECT id, deck_id AS deckId, kind, front, back, thinking, parts, position FROM learn_my_cards WHERE retired_at IS NULL' +
    (deckId ? ' AND deck_id = ?' : '') +
    ' ORDER BY position, created_at';
  const rows = deckId ? await db.getAllAsync<CardSql>(sql, deckId) : await db.getAllAsync<CardSql>(sql);
  return rows.map(toRow);
}

/** Every deck the person made and still keeps, as the study view draws it. */
export async function listMyDecks(): Promise<LearnDeck[]> {
  const [decks, cards] = await Promise.all([listMyDeckRows(), listMyCardRows()]);
  return decks.map((deck) => buildMyDeck(deck, cards.filter((card) => card.deckId === deck.id)));
}

export async function addMyDeck(title: string, about: string): Promise<string> {
  const db = await getDatabase();
  const id = newId('deck');
  await db.runAsync('INSERT INTO learn_my_decks (id, title, about) VALUES (?, ?, ?)', id, title.trim(), about.trim());
  return id;
}

export async function updateMyDeck(id: string, title: string, about: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE learn_my_decks SET title = ?, about = ?, updated_at = datetime('now') WHERE id = ?",
    title.trim(),
    about.trim(),
    id,
  );
}

/** An id for a card not kept yet, so a photo can be added to it while it is written. */
export function newMyCardId(): string {
  return newId('card');
}

/**
 * Keeps a card. Returns its id. Changing a card keeps its id, so its schedule
 * carries on; a new card takes `newCardId` when the form handed one out.
 */
export async function saveMyCard(deckId: string, draft: CardDraft, cardId?: string, newCardId?: string): Promise<string> {
  const db = await getDatabase();
  const parts = JSON.stringify(draftParts(draft));
  const front = draft.front.trim();
  const back = draft.back.trim();
  const thinking = draft.thinking ? 1 : 0;
  if (cardId) {
    await db.runAsync(
      "UPDATE learn_my_cards SET kind = ?, front = ?, back = ?, thinking = ?, parts = ?, updated_at = datetime('now') WHERE id = ?",
      draft.kind,
      front,
      back,
      thinking,
      parts,
      cardId,
    );
    return cardId;
  }
  const id = newCardId ?? newId('card');
  const last = await db.getFirstAsync<{ top: number | null }>('SELECT MAX(position) AS top FROM learn_my_cards WHERE deck_id = ?', deckId);
  await db.runAsync(
    'INSERT INTO learn_my_cards (id, deck_id, kind, front, back, thinking, parts, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    id,
    deckId,
    draft.kind,
    front,
    back,
    thinking,
    parts,
    (last?.top ?? -1) + 1,
  );
  return id;
}

async function answeredCardIds(): Promise<Set<string>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ cardId: string }>('SELECT DISTINCT card_id AS cardId FROM learn_reviews');
  return new Set(rows.map((row) => row.cardId));
}

export async function planRemovingMyCard(cardId: string): Promise<RemovalPlan> {
  return planCardRemoval(cardId, await answeredCardIds());
}

export async function planRemovingMyDeck(deckId: string): Promise<RemovalPlan> {
  const cards = await listMyCardRows(deckId);
  return planDeckRemoval(
    cards.map((card) => card.id),
    await answeredCardIds(),
  );
}

/** A deleted card takes its photo with it; a card put away keeps it, with its answers. */
export async function forgetPhotos(cardIds: string[]): Promise<void> {
  if (cardIds.length === 0) return;
  const { removePhotosOf } = await import('./mediaDb');
  for (const id of cardIds) await removePhotosOf(LEARN_CARD_OWNER_KIND, id).catch(() => undefined);
}

/** Keeps every card an import made ready, in the order of the table. Returns how many were kept. */
export async function saveImportedCards(deckId: string, drafts: CardDraft[]): Promise<number> {
  const db = await getDatabase();
  let kept = 0;
  await db.withTransactionAsync(async () => {
    for (const draft of drafts) {
      await saveMyCard(deckId, draft);
      kept += 1;
    }
  });
  return kept;
}

/**
 * A deck gathered for sending: its words, its cards in order, and the photos
 * on as many cards as travel (lib/learnShare.ts). A photo whose file has not
 * reached this device yet, or that cannot be made small enough, goes without.
 * Also says how many cards had a photo, so the sender can be told what stays.
 */
export async function gatherDeckToShare(deckId: string): Promise<{ payload: ShareDeckPayload; photoCount: number } | null> {
  const deck = (await listMyDeckRows()).find((row) => row.id === deckId);
  if (!deck) return null;
  const cards = await listMyCardRows(deckId);
  const [{ ensureMediaHere, listMediaFor, mediaFile }, { prepareSharePhoto }] = await Promise.all([import('./mediaDb'), import('./mealPhotos')]);
  const photos = new Map<string, string>();
  let photoCount = 0;
  for (const card of cards) {
    const item = (await listMediaFor(LEARN_CARD_OWNER_KIND, card.id).catch(() => []))[0];
    if (!item) continue;
    photoCount += 1;
    if (photos.size >= SHARE_DECK_PHOTO_LIMIT) continue;
    try {
      if (!(await ensureMediaHere(item))) continue;
      const base64 = await prepareSharePhoto((await mediaFile(item.fileName)).uri);
      if (base64) photos.set(card.id, base64);
    } catch {
      // The card goes without its photo.
    }
  }
  return { payload: buildDeckPayload(deck, cards, photos), photoCount };
}

/**
 * Keeps a deck that arrived from somebody else as a deck of this person's, so
 * it can be studied, changed and shared on like any other. Returns the new
 * deck's id and how many photos could not be kept.
 */
export async function addSharedDeck(read: ReadShare): Promise<{ deckId: string; photosMissed: number }> {
  const db = await getDatabase();
  let deckId = '';
  const photos: { cardId: string; base64: string }[] = [];
  await db.withTransactionAsync(async () => {
    deckId = await addMyDeck(read.title, read.about);
    for (const card of read.cards) {
      const { photoBase64, ...draft } = card;
      const cardId = await saveMyCard(deckId, draft);
      if (photoBase64) photos.push({ cardId, base64: photoBase64 });
    }
  });
  let photosMissed = 0;
  if (photos.length > 0) {
    const [{ keepPhoto }, { Directory, File, Paths }] = await Promise.all([import('./mediaDb'), import('expo-file-system')]);
    for (const photo of photos) {
      try {
        const dir = new Directory(Paths.cache, 'learn-shares');
        dir.create({ intermediates: true, idempotent: true });
        const file = new File(dir, `${photo.cardId}.jpg`);
        file.write(photo.base64, { encoding: 'base64' });
        // The size is not known here, and a shared photo is small on purpose, so the smallest-photo check is not asked.
        const kept = await keepPhoto(file.uri, 0, 0, { kind: LEARN_CARD_OWNER_KIND, id: photo.cardId }, { deleteSource: true });
        if (kept.status !== 'added') photosMissed += 1;
      } catch {
        photosMissed += 1;
      }
    }
  }
  return { deckId, photosMissed };
}

export async function removeMyCard(cardId: string): Promise<RemovalPlan> {
  const db = await getDatabase();
  const plan = await planRemovingMyCard(cardId);
  if (plan === 'delete') {
    await db.runAsync('DELETE FROM learn_my_cards WHERE id = ?', cardId);
    await forgetPhotos([cardId]);
  }
  else await db.runAsync("UPDATE learn_my_cards SET retired_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", cardId);
  return plan;
}

export async function removeMyDeck(deckId: string): Promise<RemovalPlan> {
  const db = await getDatabase();
  const plan = await planRemovingMyDeck(deckId);
  if (plan === 'delete') {
    const cards = await listMyCardRows(deckId);
    await db.runAsync('DELETE FROM learn_my_cards WHERE deck_id = ?', deckId);
    await forgetPhotos(cards.map((card) => card.id));
    await db.runAsync('DELETE FROM learn_my_decks WHERE id = ?', deckId);
  } else {
    await db.runAsync("UPDATE learn_my_decks SET retired_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", deckId);
  }
  return plan;
}
