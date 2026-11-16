// How hard an activity felt, and how the person was the morning after a
// bigger day (Q20, 1.0.91.8). Pure: no database, no React, so
// scripts/test_pacing.js can load it.
//
// Effort sits beside intensity on an exercise log. Intensity (light,
// moderate, vigorous) says what the activity was; effort says how it landed
// on the person that day. The same walk can be Easy one week and Very hard
// the next, which is the thing pacing is about.
//
// The morning-after answer lives on the morning's sleep check-in row and is
// about the day before. Nothing here says one thing caused another: Trends >
// Pacing lays the answers beside the bigger days and leaves the reading to
// the person.

export type EffortLevel = 'easy' | 'moderate' | 'hard' | 'very_hard';

export const EFFORT_QUESTION = 'How hard did it feel?';

export const EFFORT_LEVELS: readonly { key: EffortLevel; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'hard', label: 'Hard' },
  { key: 'very_hard', label: 'Very hard' },
];

export function asEffort(raw: unknown): EffortLevel | null {
  return raw === 'easy' || raw === 'moderate' || raw === 'hard' || raw === 'very_hard' ? raw : null;
}

export function effortLabel(effort: EffortLevel): string {
  return EFFORT_LEVELS.find((level) => level.key === effort)?.label ?? effort;
}

/** Hard and Very hard make a day a bigger day on their own. */
export function isHarderEffort(effort: EffortLevel | null | undefined): boolean {
  return effort === 'hard' || effort === 'very_hard';
}

/** The words a list row shows after the activity: "felt hard". */
export function effortWords(effort: EffortLevel): string {
  return `felt ${effortLabel(effort).toLowerCase()}`;
}

export type MorningAfter = 'better' | 'same' | 'worse' | 'crashed';

export const MORNING_AFTER_QUESTION = 'Yesterday was a bigger day. How are you this morning?';

export const MORNING_AFTER_LEVELS: readonly { key: MorningAfter; label: string }[] = [
  { key: 'better', label: 'Better' },
  { key: 'same', label: 'Same' },
  { key: 'worse', label: 'Worse' },
  { key: 'crashed', label: 'Crashed' },
];

export function asMorningAfter(raw: unknown): MorningAfter | null {
  return raw === 'better' || raw === 'same' || raw === 'worse' || raw === 'crashed' ? raw : null;
}

export function morningAfterLabel(answer: MorningAfter): string {
  return MORNING_AFTER_LEVELS.find((level) => level.key === answer)?.label ?? answer;
}

/** Why a day counts as bigger, in the words the question's caption uses. */
export type BiggerDayReason = 'effort' | 'steps' | 'minutes';

export function biggerDayReasonWords(reasons: readonly BiggerDayReason[]): string {
  const parts: string[] = [];
  if (reasons.includes('effort')) parts.push('an activity you rated hard');
  if (reasons.includes('steps')) parts.push('more steps than your usual');
  if (reasons.includes('minutes')) parts.push('more exercise minutes than your usual');
  if (parts.length === 0) return '';
  if (parts.length === 1) return `Yesterday had ${parts[0]}.`;
  return `Yesterday had ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}.`;
}
