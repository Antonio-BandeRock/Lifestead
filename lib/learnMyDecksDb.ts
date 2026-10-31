// Reading and writing the decks a person makes in Interests > Learn
// (2026-10-30, Learn part 6e). Every decision is in lib/learnMyDecks.ts;
// see learn_my_decks and learn_my_cards in lib/db.ts.

import { getDatabase } from './db';
import {
  buildMyDeck,
  draftParts,
  MY_DECK_PREFIX,
  planCardRemoval,
  planDeckRemoval,
  type CardDraft,
  type MyCardRow,
  type MyDeckRow,
  type RemovalPlan,
} from './learnMyDecks';
import type { LearnDeck } from './learnDecks';

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

/** Keeps a card. Returns its id. Changing a card keeps its id, so its schedule carries on. */
export async function saveMyCard(deckId: string, draft: CardDraft, cardId?: string): Promise<string> {
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
  const id = newId('card');
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

export async function removeMyCard(cardId: string): Promise<RemovalPlan> {
  const db = await getDatabase();
  const plan = await planRemovingMyCard(cardId);
  if (plan === 'delete') await db.runAsync('DELETE FROM learn_my_cards WHERE id = ?', cardId);
  else await db.runAsync("UPDATE learn_my_cards SET retired_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", cardId);
  return plan;
}

export async function removeMyDeck(deckId: string): Promise<RemovalPlan> {
  const db = await getDatabase();
  const plan = await planRemovingMyDeck(deckId);
  if (plan === 'delete') {
    await db.runAsync('DELETE FROM learn_my_cards WHERE deck_id = ?', deckId);
    await db.runAsync('DELETE FROM learn_my_decks WHERE id = ?', deckId);
  } else {
    await db.runAsync("UPDATE learn_my_decks SET retired_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", deckId);
  }
  return plan;
}
