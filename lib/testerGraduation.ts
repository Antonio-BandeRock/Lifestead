// Where this device is in the tester's three reviews (lib/testerReview.ts),
// and whether it still calls itself a tester version.
//
// Kept apart from lib/testerReviewState.ts, which reads the database, so the
// lists that are worked out at startup (lib/visualPreferences.ts) can ask
// without bringing the database in with them.
//
// A plain file beside the app's other per-device files, like the recent
// lenses (lib/recentLenses.ts): it belongs to this device, never travels
// through sync or a backup, and is read at once at startup, so a tester who
// has sent all three reviews never sees the tester wording flash up first.
import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { isTesterBuild } from './appVariant';
import { EMPTY_PROGRESS, isGraduated, type ReviewProgress } from './testerReview';

const PROGRESS_FILE = 'tester_review.json';

function cleanProgress(raw: unknown): ReviewProgress {
  if (!raw || typeof raw !== 'object') return EMPTY_PROGRESS;
  const value = raw as Partial<ReviewProgress>;
  const sent = Array.isArray(value.sent)
    ? value.sent
        .filter((entry) => entry && typeof entry.round === 'number' && typeof entry.sentAt === 'number')
        .map((entry) => ({
          round: entry.round,
          sentAt: entry.sentAt,
          rated: Array.isArray(entry.rated) ? entry.rated.filter((id): id is string => typeof id === 'string') : [],
        }))
    : [];
  return {
    periodStart: typeof value.periodStart === 'number' ? value.periodStart : null,
    sent,
    graduatedAt: typeof value.graduatedAt === 'number' ? value.graduatedAt : null,
  };
}

function readProgress(): ReviewProgress {
  try {
    const file = new File(Paths.document, PROGRESS_FILE);
    if (!file.exists) return EMPTY_PROGRESS;
    return cleanProgress(JSON.parse(file.textSync()));
  } catch {
    return EMPTY_PROGRESS;
  }
}

let progress: ReviewProgress | null = null;
const listeners = new Set<() => void>();

export function getReviewProgress(): ReviewProgress {
  if (progress === null) progress = readProgress();
  return progress;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Keeps the progress; throws when it cannot be written, so a review is
 *  never counted as sent without it. */
export function setReviewProgress(next: ReviewProgress): void {
  new File(Paths.document, PROGRESS_FILE).write(JSON.stringify(next));
  progress = next;
  listeners.forEach((listener) => listener());
}

export function useTesterReview(): ReviewProgress {
  return useSyncExternalStore(subscribe, getReviewProgress, getReviewProgress);
}

/**
 * Whether the app still calls itself a tester version. After the third
 * review is sent it does not: no tester wording, no watermark, no reviews.
 * The device keeps the mark (graduatedAt) that its tester and their partner
 * use Lifestead free, which is why the paid features stay on
 * (lib/entitlement.ts).
 */
export function testerChromeShown(): boolean {
  return isTesterBuild() && !isGraduated(getReviewProgress());
}

export function useTesterChrome(): boolean {
  const current = useTesterReview();
  return isTesterBuild() && !isGraduated(current);
}

/** The free-for-life mark: when the third review was sent, or null. Read by
 *  the paid tiers and the Partner link once they are built. */
export function freeForLifeSince(): number | null {
  const current = getReviewProgress();
  if (!isTesterBuild() || !isGraduated(current)) return null;
  return current.graduatedAt ?? current.sent[current.sent.length - 1]?.sentAt ?? null;
}
