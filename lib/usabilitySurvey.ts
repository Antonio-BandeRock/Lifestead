// The ten ease-of-use questions testers answer once (2026-11-12, direct
// instruction: "Option 1", the questionnaire inside the tester app).
//
// The questions are the System Usability Scale (John Brooke, 1986), free to
// use, with "system" read as "app" and "cumbersome" read as "awkward", the two
// substitutions the published work on the scale accepts (Bangor, Kortum and
// Miller 2008; Finstad 2006, who found "cumbersome" confused people whose
// first language is not English). The wording is otherwise kept, since the
// score is only comparable with other apps' scores when the questions match.
//
// Each answer is 1 (strongly disagree) to 5 (strongly agree). Odd questions
// are worded for the app and even ones against it, so the score turns the
// even ones round before adding: the published average across apps is about
// 68 out of 100.
//
// Pure, for scripts/test_usability_survey.js. Keeping the answers, the
// timing and the email are in lib/usabilitySurveyState.ts.

export const USABILITY_QUESTIONS: readonly string[] = [
  'I think that I would like to use this app frequently.',
  'I found the app unnecessarily complex.',
  'I thought the app was easy to use.',
  'I think that I would need the support of a technical person to be able to use this app.',
  'I found the various functions in this app were well integrated.',
  'I thought there was too much inconsistency in this app.',
  'I would imagine that most people would learn to use this app very quickly.',
  'I found the app very awkward to use.',
  'I felt very confident using the app.',
  'I needed to learn a lot of things before I could get going with this app.',
];

export const USABILITY_SCALE: readonly string[] = ['Strongly disagree', 'Disagree', 'Neither', 'Agree', 'Strongly agree'];

/** Days of use before the questions are first offered. */
export const SURVEY_AFTER_DAYS = 14;
/** Days "Not now" waits before offering again. */
export const SURVEY_SNOOZE_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export type SurveyAnswers = readonly (number | null)[];

export function answersComplete(answers: SurveyAnswers): boolean {
  return answers.length === USABILITY_QUESTIONS.length && answers.every((a) => a !== null && a >= 1 && a <= 5);
}

/** The score out of 100, or null until all ten are answered. */
export function usabilityScore(answers: SurveyAnswers): number | null {
  if (!answersComplete(answers)) return null;
  let sum = 0;
  answers.forEach((answer, index) => {
    const a = answer as number;
    sum += index % 2 === 0 ? a - 1 : 5 - a;
  });
  return sum * 2.5;
}

export type SurveyState = {
  /** When this device first opened past the tester door with the survey in place, ms. */
  firstSeen: number | null;
  /** When it was sent, ms. */
  sentAt: number | null;
  /** "Not now" holds it until this time, ms. */
  snoozedUntil: number | null;
  /** "Don't ask again". */
  declined: boolean;
};

export function surveyDue(state: SurveyState, now: number): boolean {
  if (state.sentAt !== null || state.declined || state.firstSeen === null) return false;
  if (now - state.firstSeen < SURVEY_AFTER_DAYS * DAY_MS) return false;
  if (state.snoozedUntil !== null && now < state.snoozedUntil) return false;
  return true;
}

export function snoozeUntil(now: number): number {
  return now + SURVEY_SNOOZE_DAYS * DAY_MS;
}

export function daysUsed(firstSeen: number | null, now: number): number {
  return firstSeen === null ? 0 : Math.max(0, Math.floor((now - firstSeen) / DAY_MS));
}
