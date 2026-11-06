// Language basics held out of the store build. metro.config.js swaps this file for
// lib/variantStubs/learnCourseDevOnly.ts there. The developer and Test versions both
// carry it, because they stay matched until the app goes to testers (direct
// instruction, 2026-11-06). Basic Spanish for English Speakers stays here until Tony
// confirms the school whose lessons it follows is fine with it reaching other people.
// Before anybody but Tony and Lisa gets Test, decide whether it comes out of Test
// (step 2 of docs/tester-kit/sharing-plan.md). Moving it to lib/learnCoursesBundled.ts
// is all that opening it up takes; nothing else names it.

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
