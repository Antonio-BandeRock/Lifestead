// Reading and writing Interests > Learn (2026-10-30, Learn part 6a). Every
// decision about a card's schedule is in lib/learnSchedule.ts with no
// database; this keeps the answers. See learn_reviews in lib/db.ts.

import { getDatabase } from './db';
import { localDayOf } from './interests';
import type { GoneReview } from './learnHowItHasGone';
import { LEARN_KINDS, type LearnKind } from './learnKinds';
import { readLearnGrade, type LearnGrade, type LearnReview } from './learnSchedule';

function newId(): string {
  return `learn_review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Every answer ever kept, which is what both the schedule and things you now know are worked out from. */
export async function listLearnReviews(): Promise<LearnReview[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ cardId: string; day: string; grade: string; answeredAt: string }>(
    'SELECT card_id AS cardId, day, grade, answered_at AS answeredAt FROM learn_reviews ORDER BY answered_at',
  );
  return rows.map((row) => ({ ...row, grade: readLearnGrade(row.grade) }));
}

/** Every answer with its deck, the kind of card and whether its check matched, for How It Has Gone. */
export async function listGoneReviews(): Promise<GoneReview[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ deckId: string; cardId: string; day: string; grade: string; kind: string | null; matched: number | null }>(
    'SELECT deck_id AS deckId, card_id AS cardId, day, grade, kind, matched FROM learn_reviews ORDER BY answered_at',
  );
  return rows.map((row) => ({
    deckId: row.deckId,
    cardId: row.cardId,
    day: row.day,
    grade: readLearnGrade(row.grade),
    kind: row.kind && (LEARN_KINDS as string[]).includes(row.kind) ? (row.kind as LearnKind) : null,
    matched: row.matched === null || row.matched === undefined ? null : row.matched === 1,
  }));
}

/** Keeps one answer. Answers are never changed or removed. */
export async function addLearnReview(
  deckId: string,
  cardId: string,
  grade: LearnGrade,
  kind: LearnKind | null = null,
  matched: boolean | null = null,
): Promise<LearnReview> {
  const db = await getDatabase();
  const answeredAt = new Date().toISOString();
  const day = localDayOf(answeredAt);
  await db.runAsync(
    'INSERT INTO learn_reviews (id, deck_id, card_id, grade, day, answered_at, kind, matched) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    newId(),
    deckId,
    cardId,
    grade,
    day,
    answeredAt,
    kind,
    matched === null ? null : matched ? 1 : 0,
  );
  return { cardId, day, grade, answeredAt };
}
