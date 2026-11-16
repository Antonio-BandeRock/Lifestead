// The tester's review every 90 days (2026-11-15, direct instruction), in
// place of access simply ending after 90 days.
//
// "Instead of the app just no longer working for the testers after 90 days,
// make it so they have to report on their experience with the app after 90
// days." Three reviews, each over one 90-day period:
//   1. Round 1 covers the period from the day this device was approved. It
//      asks about every tab and lens used in that time, two scales each
//      ("Easy to use" and "Useful to me", 1 to 5) and a note that can be
//      spoken, and lists what has not been tried yet, asking for it to be.
//   2. Rounds 2 and 3 first ask about the changes made to the app from what
//      the tester said before (lib/testerReviewChanges.ts), then go on to
//      the tabs and lenses used in that period.
//   3. Sending the review (by email to testers@ghostead.com) starts the next
//      period at that moment. After the third, the tester version stops
//      calling itself one: no more reviews, no tester wording, and the device
//      keeps a mark that the tester and their partner use the app free.
//
// The review opens two weeks before its day, and on the day the app is
// covered by it until it is sent (the owner's choice). Records are never
// touched: a cover only hides them.
//
// Which tabs and lenses were used comes from lens_use_days, a day-by-day
// record of every lens opened on this device (lib/lensUseDb.ts), kept for
// the person's own history whatever version they run. For round 1 a lens
// with records made in it also counts, since the day-by-day record started
// after the first testers did.
//
// Pure, no runtime import, so scripts/test_tester_review.js checks it in
// plain node.

export const REVIEW_PERIOD_DAYS = 90;
/** Days before the day a review is due that it can be started. */
export const REVIEW_OPENS_DAYS_BEFORE = 14;
export const REVIEW_ROUNDS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

// ---- The catalog: every tab and every lens on it ----

export type ReviewTab = { path: string; title: string };

// In menu order (constants/tabs.ts), with Profile after the tabs.
export const REVIEW_TABS: readonly ReviewTab[] = [
  { path: '/', title: 'Home' },
  { path: '/life', title: 'Life' },
  { path: '/food', title: 'Food' },
  { path: '/garden', title: 'Garden' },
  { path: '/interests', title: 'Interests' },
  { path: '/schedule', title: 'Schedules' },
  { path: '/log', title: 'Signals' },
  { path: '/insights', title: 'Insights' },
  { path: '/trends', title: 'Trends' },
  { path: '/reports', title: 'Reports' },
  { path: '/profile', title: 'Profile' },
];

export type ReviewItem = {
  /** `${tab}#${lens}`, or `${tab}#` for the tab as a whole. */
  id: string;
  tab: string;
  /** The lens key, or null for the tab as a whole. */
  lens: string | null;
  label: string;
};

export type LensPlace = { tab: string; key: string; label: string };

export function itemId(tab: string, lens: string | null): string {
  return `${tab}#${lens ?? ''}`;
}

/**
 * Every tab, each followed by its lenses, from the lens directory
 * (lib/voiceLensDirectory.ts, written from each tab's own lens list, so a
 * lens added to a tab is in the review without anyone listing it here).
 * Home's cards are not lenses and Home is asked about as one tab.
 */
export function reviewCatalog(directory: readonly LensPlace[]): ReviewItem[] {
  const out: ReviewItem[] = [];
  for (const tab of REVIEW_TABS) {
    out.push({ id: itemId(tab.path, null), tab: tab.path, lens: null, label: tab.title });
    if (tab.path === '/') continue;
    const seen = new Set<string>();
    for (const place of directory) {
      if (place.tab !== tab.path || seen.has(place.key)) continue;
      seen.add(place.key);
      out.push({ id: itemId(tab.path, place.key), tab: tab.path, lens: place.key, label: place.label });
    }
  }
  return out;
}

export function tabTitle(path: string): string {
  return REVIEW_TABS.find((tab) => tab.path === path)?.title ?? path;
}

// ---- Where this device is in the three rounds ----

export type SentReview = {
  round: number;
  sentAt: number;
  /** The ids rated in that review, so a later one knows what was asked. */
  rated: string[];
};

export type ReviewProgress = {
  /** Set when a review is sent; null until the first is, when the period
   *  starts on the day this device was approved. */
  periodStart: number | null;
  sent: SentReview[];
  /** When the third review was sent, ms. */
  graduatedAt: number | null;
};

export const EMPTY_PROGRESS: ReviewProgress = { periodStart: null, sent: [], graduatedAt: null };

export function currentRound(progress: ReviewProgress): number {
  return Math.min(progress.sent.length + 1, REVIEW_ROUNDS);
}

export function isGraduated(progress: ReviewProgress): boolean {
  return progress.graduatedAt !== null || progress.sent.length >= REVIEW_ROUNDS;
}

export type ReviewPeriod = { start: number; due: number; opens: number };

export function reviewPeriod(progress: ReviewProgress, approvedAt: number): ReviewPeriod {
  const start = progress.periodStart ?? approvedAt;
  const due = start + REVIEW_PERIOD_DAYS * DAY_MS;
  return { start, due, opens: due - REVIEW_OPENS_DAYS_BEFORE * DAY_MS };
}

export type ReviewPhase =
  | { kind: 'graduated' }
  /** Not yet open: the review can wait. */
  | { kind: 'quiet'; round: number; period: ReviewPeriod; daysLeft: number }
  /** Two weeks or less to go: it can be started now. */
  | { kind: 'open'; round: number; period: ReviewPeriod; daysLeft: number }
  /** The day has come: the app is covered until it is sent. */
  | { kind: 'due'; round: number; period: ReviewPeriod };

/**
 * Where the review stands. `latestSeen` is the latest time this device has
 * seen, so setting the clock back cannot put a review off.
 */
export function reviewPhase(progress: ReviewProgress, approvedAt: number, now: number, latestSeen = 0): ReviewPhase {
  if (isGraduated(progress)) return { kind: 'graduated' };
  const round = currentRound(progress);
  const period = reviewPeriod(progress, approvedAt);
  const at = Math.max(now, latestSeen);
  if (at >= period.due) return { kind: 'due', round, period };
  const daysLeft = Math.ceil((period.due - at) / DAY_MS);
  return at >= period.opens ? { kind: 'open', round, period, daysLeft } : { kind: 'quiet', round, period, daysLeft };
}

/** The progress after a review is sent: the next period starts now. */
export function afterSending(progress: ReviewProgress, round: number, rated: readonly string[], now: number): ReviewProgress {
  const sent = [...progress.sent.filter((entry) => entry.round !== round), { round, sentAt: now, rated: [...rated] }].sort(
    (a, b) => a.round - b.round,
  );
  return {
    periodStart: now,
    sent,
    graduatedAt: sent.length >= REVIEW_ROUNDS ? now : progress.graduatedAt,
  };
}

// ---- What was used ----

export type LensUseRow = { tab: string; lens: string; day: string };

/** The local calendar day of a time, YYYY-MM-DD. */
export function localDay(ms: number): string {
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The review ids used between two times (both ends' days included), from
 * the day-by-day record plus `alsoUsed` (lenses with records, round 1).
 * A tab counts once any lens on it was used, and Home always counts, since
 * the app opens on it.
 */
export function usedIds(
  catalog: readonly ReviewItem[],
  rows: readonly LensUseRow[],
  from: number,
  to: number,
  alsoUsed: readonly string[] = [],
): Set<string> {
  const first = localDay(from);
  const last = localDay(to);
  const known = new Set(catalog.map((item) => item.id));
  const used = new Set<string>();
  const add = (id: string) => {
    if (!known.has(id)) return;
    used.add(id);
    const tab = id.slice(0, id.indexOf('#'));
    used.add(itemId(tab, null));
  };
  for (const row of rows) {
    if (row.day < first || row.day > last) continue;
    add(itemId(row.tab, row.lens === '' ? null : row.lens));
  }
  alsoUsed.forEach(add);
  used.add(itemId('/', null));
  return used;
}

export type ReviewSections = {
  /** What this review asks about, in catalog order. */
  rate: ReviewItem[];
  /** Lenses never used on this device, in catalog order. */
  untried: ReviewItem[];
};

/**
 * `periodUsed` is what was used in this period; `everUsed` what was used
 * at any time on this device. A tab as a whole is never listed as untried:
 * its lenses are.
 */
export function reviewSections(catalog: readonly ReviewItem[], periodUsed: ReadonlySet<string>, everUsed: ReadonlySet<string>): ReviewSections {
  const rate = catalog.filter((item) => periodUsed.has(item.id));
  const untried = catalog.filter((item) => item.lens !== null && !everUsed.has(item.id) && !periodUsed.has(item.id));
  return { rate, untried };
}

// ---- What changed from what the tester said ----

export type ReviewChange = {
  id: string;
  /** The day the change reached testers, YYYY-MM-DD. */
  date: string;
  /** The review ids it is about; empty means the whole app. */
  items: readonly string[];
  /** What changed, in plain words. */
  text: string;
};

/**
 * The changes to ask about first in a round after the first: those made
 * since the last review was sent, about something the tester rated then
 * (or about the whole app).
 */
export function changesToAsk(changes: readonly ReviewChange[], progress: ReviewProgress): ReviewChange[] {
  const last = progress.sent[progress.sent.length - 1];
  if (!last) return [];
  const since = localDay(last.sentAt);
  const rated = new Set(progress.sent.flatMap((entry) => entry.rated));
  return changes.filter((change) => change.date >= since && (change.items.length === 0 || change.items.some((id) => rated.has(id))));
}

// ---- The answers ----

export const EASE_SCALE: readonly string[] = ['Very hard', 'Hard', 'In between', 'Easy', 'Very easy'];
export const USEFUL_SCALE: readonly string[] = ['Not useful', 'A little useful', 'Somewhat useful', 'Useful', 'Very useful'];
export const CHANGE_SCALE: readonly string[] = ['Worse', 'A little worse', 'About the same', 'Better', 'Much better'];

export type ItemAnswer = {
  ease: number | null;
  useful: number | null;
  /** "Hardly used it": answers the item without the two scales. */
  hardly: boolean;
  note: string;
};

export type ChangeAnswer = { score: number | null; note: string };

export type ReviewDraft = {
  round: number;
  items: Record<string, ItemAnswer>;
  changes: Record<string, ChangeAnswer>;
  /** Anything else, and what got in the way of trying the rest. */
  general: string;
};

export const EMPTY_ITEM: ItemAnswer = { ease: null, useful: null, hardly: false, note: '' };

export function emptyDraft(round: number): ReviewDraft {
  return { round, items: {}, changes: {}, general: '' };
}

function onScale(value: number | null): boolean {
  return value !== null && Number.isInteger(value) && value >= 1 && value <= 5;
}

export function itemAnswered(answer: ItemAnswer | undefined): boolean {
  if (!answer) return false;
  return answer.hardly || (onScale(answer.ease) && onScale(answer.useful));
}

/** What is still unanswered, for the Send button to name. */
export function stillToAnswer(draft: ReviewDraft, rate: readonly ReviewItem[], changes: readonly ReviewChange[]): { items: ReviewItem[]; changes: ReviewChange[] } {
  return {
    items: rate.filter((item) => !itemAnswered(draft.items[item.id])),
    changes: changes.filter((change) => !onScale(draft.changes[change.id]?.score ?? null)),
  };
}

// ---- The email ----

export type ReviewEmailInput = {
  name: string;
  round: number;
  period: ReviewPeriod;
  now: number;
  device: string;
  version: string;
  rate: readonly ReviewItem[];
  untried: readonly ReviewItem[];
  changes: readonly ReviewChange[];
  draft: ReviewDraft;
};

function itemName(item: ReviewItem): string {
  return item.lens === null ? `${item.label} (the tab as a whole)` : `${tabTitle(item.tab)} > ${item.label}`;
}

/** In English whatever the app's language, so every review reads the same
 *  way in the inbox. Nothing from the person's records is in it. */
export function reviewEmail(input: ReviewEmailInput): { subject: string; body: string } {
  const who = input.name.trim() || 'a tester';
  const lines: string[] = [
    `Review ${input.round} of ${REVIEW_ROUNDS} from ${who}`,
    '',
    `Period: ${localDay(input.period.start)} to ${localDay(input.now)}`,
    `Device: ${input.device}`,
    `Version: ${input.version}`,
  ];
  if (input.changes.length > 0) {
    lines.push('', 'CHANGES MADE FROM THE LAST REVIEW');
    for (const change of input.changes) {
      const answer = input.draft.changes[change.id];
      const score = answer?.score ?? null;
      lines.push(`- ${change.text}`, `  ${score === null ? 'not answered' : `${score} (${CHANGE_SCALE[score - 1]})`}`);
      if (answer?.note.trim()) lines.push(`  Note: ${answer.note.trim()}`);
    }
  }
  lines.push('', 'WHAT WAS USED (easy to use, useful to me, 1 to 5)');
  for (const item of input.rate) {
    const answer = input.draft.items[item.id] ?? EMPTY_ITEM;
    const scores = answer.hardly
      ? 'hardly used it'
      : `easy ${answer.ease ?? '-'}, useful ${answer.useful ?? '-'}`;
    lines.push(`- ${itemName(item)}: ${scores}`);
    if (answer.note.trim()) lines.push(`  Note: ${answer.note.trim()}`);
  }
  lines.push('', `NOT TRIED YET (${input.untried.length})`);
  if (input.untried.length === 0) lines.push('Every lens has been tried.');
  for (const tab of REVIEW_TABS) {
    const here = input.untried.filter((item) => item.tab === tab.path);
    if (here.length > 0) lines.push(`${tab.title}: ${here.map((item) => item.label).join(', ')}`);
  }
  if (input.draft.general.trim()) lines.push('', 'ANYTHING ELSE', input.draft.general.trim());
  lines.push('', 'Only these answers are in this email. Nothing recorded in the app is in it.');
  return { subject: `Lifestead review ${input.round} of ${REVIEW_ROUNDS} from ${who}`, body: lines.join('\n') };
}
