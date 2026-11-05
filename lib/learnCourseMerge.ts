// What happens when a course is imported over itself (2026-11-05). Everything
// is settled by Card ID: a new ID is added, changed text updates the card, an
// ID no longer in the file is archived rather than deleted, and one that comes
// back is restored. Progress lives in learn_reviews under the Card ID, so
// nothing here can touch it, and archived cards simply stop being offered.
//
// A bundled course needs no stored copy of itself: its cards come from the app,
// so a card a later version drops is one with answers and no card, which is what
// archived means here. lib/learnCoursesDb.ts works that out when it opens one.

import type { CourseCard } from './learnCourseFile';

export type CourseMerge = {
  cards: CourseCard[];
  archived: CourseCard[];
  added: number;
  changed: number;
  archivedNow: number;
  restored: number;
};

function sameCard(a: CourseCard, b: CourseCard): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function mergeCourseCards(current: CourseCard[], archived: CourseCard[], incoming: CourseCard[]): CourseMerge {
  const currentById = new Map(current.map((card) => [card.id, card]));
  const archivedById = new Map(archived.map((card) => [card.id, card]));
  const incomingIds = new Set(incoming.map((card) => card.id));
  let added = 0;
  let changed = 0;
  let restored = 0;
  for (const card of incoming) {
    const before = currentById.get(card.id);
    if (before) {
      if (!sameCard(before, card)) changed++;
    } else if (archivedById.has(card.id)) {
      restored++;
    } else {
      added++;
    }
  }
  const nowGone = current.filter((card) => !incomingIds.has(card.id));
  return {
    cards: [...incoming].sort((a, b) => a.seq - b.seq),
    archived: [...archived.filter((card) => !incomingIds.has(card.id)), ...nowGone],
    added,
    changed,
    archivedNow: nowGone.length,
    restored,
  };
}

type Translate = (text: string, values?: Record<string, string | number>) => string;
const plain: Translate = (text, values) => (values ? text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? '')) : text);

/** What an import did, in words, ending with the part somebody worries about. */
export function describeCourseMerge(merge: Pick<CourseMerge, 'added' | 'changed' | 'archivedNow' | 'restored'>, t: Translate = plain): string {
  const parts: string[] = [];
  if (merge.added > 0) parts.push(merge.added === 1 ? t('1 new card') : t('{n} new cards', { n: merge.added }));
  if (merge.changed > 0) parts.push(merge.changed === 1 ? t('1 card changed') : t('{n} cards changed', { n: merge.changed }));
  if (merge.restored > 0) parts.push(merge.restored === 1 ? t('1 card back') : t('{n} cards back', { n: merge.restored }));
  if (merge.archivedNow > 0) parts.push(merge.archivedNow === 1 ? t('1 card put away') : t('{n} cards put away', { n: merge.archivedNow }));
  if (parts.length === 0) return t('Nothing in this course changed.');
  return t('{changes}. What you have studied stays as it was.', { changes: parts.join(', ') });
}
