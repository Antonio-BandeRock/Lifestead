// Language basics held to the developer build (2026-11-05). metro.config.js swaps this
// file for lib/variantStubs/learnCourseDevOnly.ts in the store and tester builds.
// Basic Spanish for English Speakers stays here until Tony confirms the school whose
// lessons it follows is fine with it reaching other people, since testers are
// other people. Moving it to lib/learnCoursesBundled.ts is all that opening it
// up takes; nothing else names it.

import type { BundledCourse, Course, CourseDeck } from './learnCourseFile';
import type { LanguageOutline } from './languageBasics';
import spanishForEnglish from '../assets/courses/es-for-en.deck.json';

export const DEV_ONLY_COURSES: BundledCourse[] = [
  {
    deck: spanishForEnglish.deck as CourseDeck,
    fingerprint: spanishForEnglish.fingerprint,
     
    load: () => require('../assets/courses/es-for-en.json') as Course,
     
    loadOutline: () => require('../assets/courses/es-for-en.outline.json') as LanguageOutline,
  },
];
