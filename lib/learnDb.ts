// Reading and writing Interests > Learn (2026-10-30, Learn part 6a). Every
// decision about a card's schedule is in lib/learnSchedule.ts with no
// database; this keeps the answers. See learn_reviews in lib/db.ts.

import { getDatabase } from './db';
import { localDayOf } from './interests';
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

/** Keeps one answer. Answers are never changed or removed. */
export async function addLearnReview(deckId: string, cardId: string, grade: LearnGrade): Promise<LearnReview> {
  const db = await getDatabase();
  const answeredAt = new Date().toISOString();
  const day = localDayOf(answeredAt);
  await db.runAsync(
    'INSERT INTO learn_reviews (id, deck_id, card_id, grade, day, answered_at) VALUES (?, ?, ?, ?, ?, ?)',
    newId(),
    deckId,
    cardId,
    grade,
    day,
    answeredAt,
  );
  return { cardId, day, grade, answeredAt };
}
