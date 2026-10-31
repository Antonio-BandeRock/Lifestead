// Report a Problem, the tester version's way of telling us something (tester
// plan T4, 2026-10-31). Direct request: "a report a problem button
// everywhere and always available on every screen ... It then has sections of
// the place they are reporting a problem with, and then they can record using
// a mic to say what the problem is that happened, or even provide a wish list
// idea to be added or changed."
//
// A report goes out as an email from the tester's own email app to
// PROBLEM_REPORT_ADDRESS, the same way a person would write one by hand: no
// server of ours receives it, and nothing leaves the phone until the tester
// presses Send in their email app, where they can read every word first.
//
// This file is the shape of a report and the words in it, with no React and
// no device calls, so scripts/test_problem_report.js can check it in Node.
// components/ReportProblemHost.tsx draws the sheet, lib/reportProblem.ts is
// how a band's long press reaches it, lib/crashNote.ts keeps what went wrong
// when the app closed by itself, and lib/problemReportSend.ts hands the email
// over.

export const PROBLEM_REPORT_ADDRESS = 'testers@ghostead.com';

export type ProblemReportKind = 'problem' | 'wish' | 'change';

export const PROBLEM_REPORT_KINDS: readonly ProblemReportKind[] = ['problem', 'wish', 'change'];

export const PROBLEM_REPORT_LABELS: Record<ProblemReportKind, string> = {
  problem: 'Something went wrong',
  wish: 'A wish or an idea',
  change: 'Something to change',
};

export const PROBLEM_REPORT_CAPTIONS: Record<ProblemReportKind, string> = {
  problem: 'What you did, what you expected, and what happened instead.',
  wish: 'Something you would like the app to do that it does not do yet.',
  change: 'Something the app does that would work better another way.',
};

export type ProblemReportPlace = {
  tab: string | null;
  lens: string | null;
  bandTitle: string | null;
};

export type ProblemReport = {
  kind: ProblemReportKind;
  place: ProblemReportPlace;
  body: string;
  version: string;
  device: string;
  // What went wrong when the app last closed by itself, when the tester
  // chose to send it.
  crash: string | null;
  sentAt: Date;
};

// The longest a crash is allowed to make an email. A stack past this is the
// same few frames repeated, and some email apps refuse a very long link.
export const CRASH_TEXT_LIMIT = 3000;
const BODY_LIMIT = 6000;

/** Where a report is about, said the way somebody would say it. */
export function describeProblemPlace(place: ProblemReportPlace): string {
  const where = [place.tab, place.lens].filter((part): part is string => Boolean(part)).join(' > ');
  if (place.bandTitle && where) return `${where}, the ${place.bandTitle} band`;
  if (place.bandTitle) return `The ${place.bandTitle} band`;
  return where || 'Not one place in particular';
}

/** What is missing before a report can go, or null when it can. */
export function problemReportProblem(body: string, crash: string | null): string | null {
  if (body.trim().length > 0 || crash) return null;
  return 'Say what happened, or what you would like, first. Type it, or tap the mic and say it.';
}

/** The stack and message of an error, cut to a length an email can carry. */
export function formatCrash(error: unknown, when: Date): string {
  let text: string;
  if (error instanceof Error) {
    text = `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
  } else {
    text = String(error);
  }
  const stamped = `${when.toISOString()}\n${text}`;
  return stamped.length > CRASH_TEXT_LIMIT ? `${stamped.slice(0, CRASH_TEXT_LIMIT)}\n(cut short)` : stamped;
}

function localStamp(when: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())} ${pad(when.getHours())}:${pad(when.getMinutes())}`;
}

/** The subject and body of the email a report goes out as. */
export function composeProblemReport(report: ProblemReport): { subject: string; body: string } {
  const where = describeProblemPlace(report.place);
  const subject = `Lifestead Test ${report.version}: ${PROBLEM_REPORT_LABELS[report.kind]}, ${where}`.slice(0, 160);
  const lines = [
    report.body.trim() || '(Nothing written. The app closed by itself, and what went wrong is below.)',
    '',
    `Kind: ${PROBLEM_REPORT_LABELS[report.kind]}`,
    `Where: ${where}`,
    `Version: ${report.version}`,
    `Device: ${report.device}`,
    `Written: ${localStamp(report.sentAt)}`,
  ];
  if (report.crash) lines.push('', 'When the app closed by itself:', report.crash);
  const body = lines.join('\n');
  return { subject, body: body.length > BODY_LIMIT ? `${body.slice(0, BODY_LIMIT)}\n(cut short)` : body };
}

/** The mailto link that opens a report in the tester's email app. */
export function problemReportMailto(report: ProblemReport): string {
  const { subject, body } = composeProblemReport(report);
  // Line breaks as CRLF, which every email app reads as a new line.
  const encoded = encodeURIComponent(body.replace(/\r?\n/g, '\r\n'));
  return `mailto:${PROBLEM_REPORT_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encoded}`;
}

/** The whole report as plain text, for when no email app opened. */
export function problemReportPlainText(report: ProblemReport): string {
  const { subject, body } = composeProblemReport(report);
  return `To: ${PROBLEM_REPORT_ADDRESS}\nSubject: ${subject}\n\n${body}`;
}
