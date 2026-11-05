// The courses that ship with the app (2026-11-05). A course's Deck sheet is a small
// file of its own, so the library can list every course without reading a card,
// and the cards are required only when one opens. A new bundled course is one more
// entry here; nothing else names any course.

import type { BundledCourse, Course, CourseDeck } from './learnCourseFile';
import { DEV_ONLY_COURSES } from './learnCourseDevOnly';
import englishForSpanish from '../assets/courses/en-for-es.deck.json';

const EVERY_BUILD: BundledCourse[] = [
  {
    deck: englishForSpanish.deck as CourseDeck,
    fingerprint: englishForSpanish.fingerprint,
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- required only when the course opens, so its cards are never parsed at startup.
    load: () => require('../assets/courses/en-for-es.json') as Course,
  },
];

export function bundledCourses(): BundledCourse[] {
  return [...EVERY_BUILD, ...DEV_ONLY_COURSES];
}

export function bundledCourse(id: string): BundledCourse | null {
  return bundledCourses().find((course) => course.deck.id === id) ?? null;
}
