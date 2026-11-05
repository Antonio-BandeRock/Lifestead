// Courses held to the developer build (2026-11-05). metro.config.js swaps this
// file for lib/variantStubs/learnCourseDevOnly.ts in the store and tester builds.
// Spanish for English Speakers stays here until Tony confirms the school whose
// lessons it follows is fine with it reaching other people, since testers are
// other people. Moving it to lib/learnCoursesBundled.ts is all that opening it
// up takes; nothing else names it.

import type { BundledCourse, Course, CourseDeck } from './learnCourseFile';
import spanishForEnglish from '../assets/courses/es-for-en.deck.json';

export const DEV_ONLY_COURSES: BundledCourse[] = [
  {
    deck: spanishForEnglish.deck as CourseDeck,
    fingerprint: spanishForEnglish.fingerprint,
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- required only when the course opens, so its cards are never parsed at startup.
    load: () => require('../assets/courses/es-for-en.json') as Course,
  },
];
