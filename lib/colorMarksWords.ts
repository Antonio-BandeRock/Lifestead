// What Marks with Colors does, in one place (2026-11-24). Read by Profile's
// card and by the quick-access sheet (components/ColorMarksSheet.tsx), so the
// two never describe it differently.

export const COLOR_MARKS_INTRO =
  'For anyone who is color blind, or who finds some colors hard to tell apart. Where color is the only thing giving a meaning, a short word or a small mark is added beside it. The colors stay exactly as they are.';

export const COLOR_MARKS_PARTS: { title: string; text: string }[] = [
  {
    title: 'Charts',
    text: 'A flare is marked F and a food reaction R, a sale price is marked S, and a nutrient says whether it is on target. Dimension charts say Green, Yellow or Red.',
  },
  {
    title: 'Your day',
    text: 'On the Your Day drawing, what is logged carries a check mark, what was skipped a cross, and what has passed without being logged an exclamation mark. UV and air quality say how high they are.',
  },
  {
    title: 'Reading and meal plans',
    text: 'The colored dot on an entry is written out, such as Strong evidence, and so is the dot on each day of a meal plan.',
  },
];
