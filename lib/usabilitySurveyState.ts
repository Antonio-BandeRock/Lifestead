// Keeping the ease-of-use questions' timing and sending the answers
// (lib/usabilitySurvey.ts holds the questions and the arithmetic).
//
// Kept in the secure store beside the tester's other keys, so it belongs to
// this device: a phone and a computer are each asked once, since a person can
// find one easier than the other.
//
// The answers leave by email to the testers inbox, the way an access request
// does, so no server ever holds them. The email carries the ten numbers, the
// score, how many days the app has been in use, the version and whether it
// is a phone or a computer. Nothing from the person's records is in it.
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import { Linking } from 'react-native';
import { APP_VERSION } from '../constants/version';
import { isDesktopApp } from './desktop/bridge';
import { t } from './i18n';
import { PROBLEM_REPORT_ADDRESS } from './problemReport';
import {
  daysUsed,
  snoozeUntil,
  usabilityScore,
  USABILITY_QUESTIONS,
  USABILITY_SCALE,
  type SurveyAnswers,
  type SurveyState,
} from './usabilitySurvey';

const STATE_KEY = 'usability_survey_v1';

const EMPTY: SurveyState = { firstSeen: null, sentAt: null, snoozedUntil: null, declined: false };

export async function loadSurveyState(): Promise<SurveyState> {
  try {
    const raw = await SecureStore.getItemAsync(STATE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<SurveyState>;
    return {
      firstSeen: typeof parsed.firstSeen === 'number' ? parsed.firstSeen : null,
      sentAt: typeof parsed.sentAt === 'number' ? parsed.sentAt : null,
      snoozedUntil: typeof parsed.snoozedUntil === 'number' ? parsed.snoozedUntil : null,
      declined: parsed.declined === true,
    };
  } catch {
    return EMPTY;
  }
}

async function saveSurveyState(state: SurveyState): Promise<void> {
  await SecureStore.setItemAsync(STATE_KEY, JSON.stringify(state)).catch(() => {});
}

/** Starts the fourteen days on the first open that has the survey in it. */
export async function noteSurveyFirstSeen(state: SurveyState, now: number): Promise<SurveyState> {
  if (state.firstSeen !== null) return state;
  const next = { ...state, firstSeen: now };
  await saveSurveyState(next);
  return next;
}

export async function snoozeSurvey(state: SurveyState, now: number): Promise<void> {
  await saveSurveyState({ ...state, snoozedUntil: snoozeUntil(now) });
}

export async function declineSurvey(state: SurveyState): Promise<void> {
  await saveSurveyState({ ...state, declined: true });
}

/** The email, in English whatever the app's language, so every tester's
 *  answers read the same way in the inbox. */
export function surveyEmail(answers: SurveyAnswers, name: string, firstSeen: number | null, now: number): { subject: string; body: string } {
  const score = usabilityScore(answers);
  const who = name.trim() || 'a tester';
  const lines = USABILITY_QUESTIONS.map((question, index) => {
    const a = answers[index] as number;
    return `${index + 1}. ${question}\n   ${a} (${USABILITY_SCALE[a - 1]})`;
  });
  const body = [
    `Ease-of-use answers from ${who}`,
    '',
    `Score: ${score} out of 100`,
    `Days using the app: ${daysUsed(firstSeen, now)}`,
    `Device: ${isDesktopApp() ? 'a computer' : 'a phone'}`,
    `Version: ${APP_VERSION}`,
    '',
    ...lines,
    '',
    'Only these answers are in this email. Nothing from the app is in it.',
  ].join('\n');
  return { subject: `Lifestead ease of use from ${who}`, body };
}

export type SendResult = 'opened' | 'copied' | 'failed';

/** Opens the email app with the answers written in. Where none opens, the
 *  answers are copied instead. Either way the survey counts as sent. */
export async function sendSurvey(state: SurveyState, answers: SurveyAnswers, name: string, now: number): Promise<SendResult> {
  const { subject, body } = surveyEmail(answers, name, state.firstSeen, now);
  let result: SendResult = 'failed';
  try {
    await Linking.openURL(
      `mailto:${PROBLEM_REPORT_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\n/g, '\r\n'))}`,
    );
    result = 'opened';
  } catch (error) {
    console.warn('[usabilitySurvey] no email app opened', error);
    try {
      await Clipboard.setStringAsync(`${PROBLEM_REPORT_ADDRESS}\n${subject}\n\n${body}`);
      result = 'copied';
    } catch {
      result = 'failed';
    }
  }
  if (result !== 'failed') await saveSurveyState({ ...state, sentAt: now });
  return result;
}

export function sendResultText(result: SendResult): string {
  if (result === 'opened') return t('Your email app has the answers written in. Press send there and they reach the developer.');
  if (result === 'copied') return t('No email app opened, so the answers are copied. Paste them into an email to {address}.', { address: PROBLEM_REPORT_ADDRESS });
  return t('The answers could not be sent or copied. They are still here, so try again in a moment.');
}
