// What was changed in the app because of what testers said in a review
// (2026-11-15), asked about first in each tester's next review
// (changesToAsk in lib/testerReview.ts).
//
// Add an entry in the same pass as any change made from a review's answers:
// the day it reaches testers, the review ids it is about (`${tab}#${lens}`,
// as lib/testerReview.ts makes them, e.g. '/life#groceryList', or none for
// the whole app), and what changed in plain words a tester will recognise.
// A tester is asked only about changes to something they rated before, so a
// change listed with the wrong ids is never asked about.
//
// An entry's id is never reused for different words.
import type { ReviewChange } from './testerReview';

export const TESTER_REVIEW_CHANGES: readonly ReviewChange[] = [];
