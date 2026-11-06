// What lib/learnCourseDevOnly.ts becomes in the store build: no courses, so
// their cards never enter that bundle. See metro.config.js.

import type { BundledCourse } from '../learnCourseFile';

export const DEV_ONLY_COURSES: BundledCourse[] = [];
