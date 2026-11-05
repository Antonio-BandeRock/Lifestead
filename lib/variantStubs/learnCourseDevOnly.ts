// What lib/learnCourseDevOnly.ts becomes in the store and tester builds:
// no courses, so their cards never enter those bundles. See metro.config.js.

import type { BundledCourse } from '../learnCourseFile';

export const DEV_ONLY_COURSES: BundledCourse[] = [];
