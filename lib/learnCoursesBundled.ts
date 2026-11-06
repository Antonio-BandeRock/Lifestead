// The sets of language basics that ship with the app (2026-11-05). A set's Deck sheet
// is a small file of its own, so the Languages lens can list every set without reading
// a card, and the cards and outline are required only when asked for. A new set is one
// more entry here; nothing else names any set.

import type { BundledCourse, Course, CourseDeck } from './learnCourseFile';
import type { LanguageOutline } from './languageBasics';
import englishForSpanish from '../assets/courses/en-for-es.deck.json';
import spanishForEnglish from '../assets/courses/es-for-en.deck.json';

const BUNDLED: BundledCourse[] = [
  {
    deck: englishForSpanish.deck as CourseDeck,
    fingerprint: englishForSpanish.fingerprint,
     
    load: () => require('../assets/courses/en-for-es.json') as Course,
     
    loadOutline: () => require('../assets/courses/en-for-es.outline.json') as LanguageOutline,
  },
  {
    deck: spanishForEnglish.deck as CourseDeck,
    fingerprint: spanishForEnglish.fingerprint,
     
    load: () => require('../assets/courses/es-for-en.json') as Course,
     
    loadOutline: () => require('../assets/courses/es-for-en.outline.json') as LanguageOutline,
  },
];

export function bundledCourses(): BundledCourse[] {
  return BUNDLED;
}

export function bundledCourse(id: string): BundledCourse | null {
  return bundledCourses().find((course) => course.deck.id === id) ?? null;
}
