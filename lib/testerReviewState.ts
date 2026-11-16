// Keeping the tester's review (lib/testerReview.ts holds the rules): where
// this device is in the three rounds, the answers written so far, gathering
// what was used, and sending.
//
// The progress lives in lib/testerGraduation.ts; the answers written so far
// in a plain file beside it, which belongs to this device and never travels
// through sync or a backup.
//
// The answers leave by email to the testers inbox, the way the ease-of-use
// answers do (lib/usabilitySurveyState.ts), so no server ever holds them.
// Pressing Send starts the next 90 days (the owner's choice, 2026-11-15).
import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import { Linking } from 'react-native';
import { APP_VERSION } from '../constants/version';
import { isDesktopApp } from './desktop/bridge';
import { t } from './i18n';
import { listLensUse } from './lensUseDb';
import { PROBLEM_REPORT_ADDRESS } from './problemReport';
import {
  afterSending,
  changesToAsk,
  currentRound,
  emptyDraft,
  itemId,
  reviewCatalog,
  reviewEmail,
  reviewPeriod,
  reviewSections,
  usedIds,
  type ReviewChange,
  type ReviewDraft,
  type ReviewItem,
  type ReviewPeriod,
} from './testerReview';
import { getReviewProgress, setReviewProgress } from './testerGraduation';
import { TESTER_REVIEW_CHANGES } from './testerReviewChanges';
import { loadUntriedLenses } from './untriedLensesDb';
import { UNTRIED_LENSES, UNTRIED_TAB_PATHS } from './untriedLenses';
import { VOICE_LENS_DIRECTORY } from './voiceLensDirectory';

const DRAFT_FILE = 'tester_review_draft.json';

function readJson(name: string): unknown {
  try {
    const file = new File(Paths.document, name);
    if (!file.exists) return null;
    return JSON.parse(file.textSync());
  } catch {
    return null;
  }
}

function writeJson(name: string, value: unknown): void {
  new File(Paths.document, name).write(JSON.stringify(value));
}

// ---- The answers written so far ----

function cleanDraft(raw: unknown, round: number): ReviewDraft {
  if (!raw || typeof raw !== 'object') return emptyDraft(round);
  const value = raw as Partial<ReviewDraft>;
  if (value.round !== round) return emptyDraft(round);
  return {
    round,
    items: value.items && typeof value.items === 'object' ? value.items : {},
    changes: value.changes && typeof value.changes === 'object' ? value.changes : {},
    general: typeof value.general === 'string' ? value.general : '',
  };
}

/** The answers kept for this round, or none yet. */
export function readReviewDraft(round: number): ReviewDraft {
  return cleanDraft(readJson(DRAFT_FILE), round);
}

let draftTimer: ReturnType<typeof setTimeout> | null = null;

/** Keeps the answers as they are written, a moment after the last change. */
export function keepReviewDraft(draft: ReviewDraft): void {
  if (draftTimer) clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    draftTimer = null;
    try {
      writeJson(DRAFT_FILE, draft);
    } catch (error) {
      console.warn('[testerReview] could not keep the answers written so far', error);
    }
  }, 400);
}

function clearReviewDraft(): void {
  if (draftTimer) clearTimeout(draftTimer);
  draftTimer = null;
  try {
    const file = new File(Paths.document, DRAFT_FILE);
    if (file.exists) file.delete();
  } catch {
    // An old draft is ignored anyway once its round has passed.
  }
}

// ---- What this review asks about ----

export type ReviewContent = {
  round: number;
  period: ReviewPeriod;
  rate: ReviewItem[];
  untried: ReviewItem[];
  changes: ReviewChange[];
};

/** Lenses with records made in them, as review ids. */
async function lensesWithRecords(): Promise<string[]> {
  const untried = await loadUntriedLenses();
  const out: string[] = [];
  for (const path of UNTRIED_TAB_PATHS) {
    const notYet = new Set(untried[path]);
    for (const def of UNTRIED_LENSES[path]) if (!notYet.has(def.lens)) out.push(itemId(path, def.lens));
  }
  return out;
}

/** Works out what the current round asks about, from the day-by-day record. */
export async function gatherReview(approvedAt: number, now: number): Promise<ReviewContent> {
  const current = getReviewProgress();
  const round = currentRound(current);
  const period = reviewPeriod(current, approvedAt);
  const catalog = reviewCatalog(VOICE_LENS_DIRECTORY);
  const [rows, withRecords] = await Promise.all([listLensUse(), lensesWithRecords().catch(() => [] as string[])]);
  // Round 1 also counts a lens with records in it, since the day-by-day
  // record started after the first testers did. Later rounds go by the
  // record alone, which knows when.
  const periodUsed = usedIds(catalog, rows, period.start, now, round === 1 ? withRecords : []);
  const everUsed = usedIds(catalog, rows, 0, now, withRecords);
  const { rate, untried } = reviewSections(catalog, periodUsed, everUsed);
  const changes = round === 1 ? [] : changesToAsk(TESTER_REVIEW_CHANGES, current);
  return { round, period, rate, untried, changes };
}

// ---- Sending ----

export type ReviewSendResult = 'opened' | 'copied' | 'failed';

/**
 * Opens the email app with the answers written in, or copies them where
 * none opens. Either way the review counts as sent and the next 90 days
 * start now; after the third, the device stops calling itself a tester.
 */
export async function sendReview(content: ReviewContent, draft: ReviewDraft, name: string, now: number): Promise<ReviewSendResult> {
  const { subject, body } = reviewEmail({
    name,
    round: content.round,
    period: content.period,
    now,
    device: isDesktopApp() ? 'a computer' : 'a phone',
    version: APP_VERSION,
    rate: content.rate,
    untried: content.untried,
    changes: content.changes,
    draft,
  });
  let result: ReviewSendResult = 'failed';
  try {
    await Linking.openURL(`mailto:${PROBLEM_REPORT_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\n/g, '\r\n'))}`);
    result = 'opened';
  } catch (error) {
    console.warn('[testerReview] no email app opened', error);
    try {
      await Clipboard.setStringAsync(`${PROBLEM_REPORT_ADDRESS}\n${subject}\n\n${body}`);
      result = 'copied';
    } catch {
      result = 'failed';
    }
  }
  if (result === 'failed') return result;
  try {
    setReviewProgress(afterSending(getReviewProgress(), content.round, content.rate.map((item) => item.id), now));
    clearReviewDraft();
  } catch (error) {
    console.warn('[testerReview] could not keep that the review was sent', error);
    return 'failed';
  }
  return result;
}

export function reviewSentText(result: ReviewSendResult, graduated: boolean): string {
  if (result === 'failed') return t('The review could not be sent or copied. Your answers are still here, so try again in a moment.');
  const how =
    result === 'opened'
      ? t('Your email app has the review written in. Press send there and it reaches the developer.')
      : t('No email app opened, so the review is copied. Paste it into an email to {address}.', { address: PROBLEM_REPORT_ADDRESS });
  return graduated
    ? `${how} ${t('That was the third review. Thank you: Lifestead is yours and your partner’s to use free from now on.')}`
    : `${how} ${t('Your next 90 days start today.')}`;
}
