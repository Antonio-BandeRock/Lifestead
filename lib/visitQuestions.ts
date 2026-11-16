// Questions for one visit (K4 of the competitive build plan, 2026-11-16).
//
// A question belongs to one appointment, in the person's words, in the order
// they put it. It is ticked once it was asked, and the answer they were given
// is written under it afterwards. A Health note from Capture can be brought in
// as a question; the note itself stays as it was, and only the question
// remembers which note it came from, so the same note is not offered twice.
//
// One page per appointment, printed or saved as a PDF: the visit, what was
// recorded since the last visit with that provider (the counts Before an
// Appointment on Insights shows), and every question with room to write the
// answer. Every sentence is a count and a date; what a result or a change
// means is a question for the visit, never something this page says.
//
// Pure. The reads and writes are lib/visitQuestionsDb.ts, checked by
// scripts/test_visit_questions.js.
import { shortDate } from './eatingVariety';
import { plural } from './readingBands';
import { labLine, treatmentChanges, type VisitFlare, type VisitLab, type VisitTreatment } from './sinceLastVisit';

export type Translate = (english: string, values?: Readonly<Record<string, string | number>>) => string;

const asIs: Translate = (english, values) =>
  values ? english.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole)) : english;

export type VisitQuestion = {
  id: string;
  appointmentId: string;
  text: string;
  position: number;
  asked: boolean;
  answer: string | null;
  /** The Capture note it was brought in from, or null when typed here. */
  captureNoteId: string | null;
  createdAt: string;
};

/** Long enough for a question with its context, short enough to print. */
export const MAX_QUESTION_LENGTH = 500;

/** The words as given, without the spaces and line breaks a keyboard or
 *  dictation leaves at the ends and in between. Nothing else is changed. */
export function cleanQuestionText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_QUESTION_LENGTH);
}

export function orderQuestions(questions: VisitQuestion[]): VisitQuestion[] {
  return [...questions].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/** The position a question added now takes: after every question there. */
export function nextPosition(questions: VisitQuestion[]): number {
  return questions.reduce((highest, question) => Math.max(highest, question.position), -1) + 1;
}

/**
 * Move one question a place up or down. Returns every question's position
 * afterwards, numbered from 0 in the new order, so two questions that once
 * shared a position cannot keep swapping into the same place. Null when the
 * question is already at that end.
 */
export function moveQuestion(questions: VisitQuestion[], id: string, direction: 'up' | 'down'): { id: string; position: number }[] | null {
  const ordered = orderQuestions(questions);
  const from = ordered.findIndex((question) => question.id === id);
  if (from < 0) return null;
  const to = direction === 'up' ? from - 1 : from + 1;
  if (to < 0 || to >= ordered.length) return null;
  const moved = [...ordered];
  [moved[from], moved[to]] = [moved[to], moved[from]];
  return moved.map((question, position) => ({ id: question.id, position }));
}

/** The opener's words: how many, and how many were asked. */
export function questionsLabel(questions: VisitQuestion[], tr: Translate = asIs): string {
  if (questions.length === 0) return tr('Questions');
  const asked = questions.filter((question) => question.asked).length;
  if (asked === 0) return tr('Questions ({count})', { count: questions.length });
  return tr('Questions ({count}, {asked} asked)', { count: questions.length, asked });
}

export type NoteToOffer = { id: string; text: string; createdAt: string };

/**
 * Health notes from Capture that could be brought in: not marked done, and
 * not already a question for any visit. Newest first.
 */
export function notesToOffer(
  notes: { id: string; text: string; createdAt: string; status: string; destination: string | null }[],
  broughtIn: ReadonlySet<string>,
): NoteToOffer[] {
  return notes
    .filter((note) => note.destination === 'health' && note.status !== 'done' && !broughtIn.has(note.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ id, text, createdAt }) => ({ id, text, createdAt }));
}

/** What removing an appointment does to its questions, in words, and where
 *  they can go instead. Only questions not yet asked are worth moving. */
export function removalWords(
  questions: VisitQuestion[],
  nextVisit: { title: string; day: string } | null,
  tr: Translate = asIs,
): { message: string; canMove: boolean } {
  const waiting = questions.filter((question) => !question.asked).length;
  if (questions.length === 0) return { message: '', canMove: false };
  if (waiting > 0 && nextVisit) {
    return {
      message: tr('It has {questions}. The {waiting} not asked yet can move to {title} on {day}, or go with it.', {
        questions: plural(questions.length, tr('question'), tr('questions')),
        waiting,
        title: nextVisit.title,
        day: shortDate(nextVisit.day),
      }),
      canMove: true,
    };
  }
  return { message: tr('Its {questions} and their answers go with it.', { questions: plural(questions.length, tr('question'), tr('questions')) }), canMove: false };
}

// ---------------------------------------------------------------------------
// What was recorded since the last visit with this provider
// ---------------------------------------------------------------------------

export type PageAppointment = {
  id: string;
  title: string;
  scheduledFor: string;
  providerName: string | null;
  location: string | null;
  appointmentType: string | null;
  status: string;
};

export type PageInputs = {
  appointment: PageAppointment;
  /** Every appointment, to find the one before this with the same provider. */
  appointments: { scheduledFor: string; title: string; providerName: string | null; status: string }[];
  labs: VisitLab[];
  flares: VisitFlare[];
  treatments: VisitTreatment[];
  questions: VisitQuestion[];
};

export type SinceSection = { heading: string; summary: string; lines: string[] };

function providerOf(appointment: { title: string; providerName: string | null }): string {
  return (appointment.providerName || appointment.title).trim().toLowerCase();
}

/** The day the record starts from: the last visit with this provider before
 *  this one, or 90 days before it when none is recorded. */
export function sinceDay(input: Pick<PageInputs, 'appointment' | 'appointments'>): { day: string; previous: boolean } {
  const day = input.appointment.scheduledFor.slice(0, 10);
  const key = providerOf(input.appointment);
  const previous = input.appointments
    .filter((other) => other.status !== 'cancelled' && providerOf(other) === key && other.scheduledFor.slice(0, 10) < day)
    .sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor))[0];
  if (previous) return { day: previous.scheduledFor.slice(0, 10), previous: true };
  const start = new Date(`${day}T12:00:00`);
  start.setDate(start.getDate() - 90);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { day: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`, previous: false };
}

export function buildSinceSections(input: PageInputs, tr: Translate = asIs): { since: string; sections: SinceSection[] } {
  const visitDay = input.appointment.scheduledFor.slice(0, 10);
  const { day, previous } = sinceDay(input);
  const since = previous
    ? tr('Recorded since the last visit on {day}.', { day: shortDate(day) })
    : tr('Recorded in the 90 days before this visit, since no earlier visit with {who} is recorded.', {
        who: input.appointment.providerName || input.appointment.title,
      });
  const within = (date: string) => date.slice(0, 10) > day && date.slice(0, 10) <= visitDay;

  const labs = input.labs.filter((lab) => within(lab.testedAt));
  const flares = input.flares.filter((flare) => within(flare.loggedAt));
  const changes = treatmentChanges(input.treatments, day, visitDay);

  return {
    since,
    sections: [
      {
        heading: tr('Lab results'),
        summary: labs.length > 0 ? plural(labs.length, tr('result'), tr('results')) : tr('None recorded.'),
        lines: labs.map((lab) => `${lab.displayName}: ${labLine(lab)} · ${shortDate(lab.testedAt.slice(0, 10))}`),
      },
      {
        heading: tr('Flares'),
        summary: flares.length > 0 ? plural(flares.length, tr('flare'), tr('flares')) : tr('None logged.'),
        lines: flares.map((flare) => [shortDate(flare.loggedAt.slice(0, 10)), flare.notes].filter(Boolean).join(': ')),
      },
      {
        heading: tr('Medicine and supplement changes'),
        summary: changes.length > 0 ? plural(changes.length, tr('change'), tr('changes')) : tr('None recorded.'),
        lines: changes.map((change) => [change.title, change.caption].filter(Boolean).join(' · ')),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function timeOf(scheduledFor: string): string {
  const [hourText, minute = '00'] = (scheduledFor.split('T')[1] ?? '').split(':');
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return '';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 === 0 ? 12 : hour % 12}:${minute.slice(0, 2)} ${suffix}`;
}

export function buildVisitPageHtml(input: PageInputs, tr: Translate = asIs): string {
  const { appointment } = input;
  const questions = orderQuestions(input.questions);
  const { since, sections } = buildSinceSections(input, tr);
  const e = escapeHtml;
  const when = [shortDate(appointment.scheduledFor.slice(0, 10)), timeOf(appointment.scheduledFor)].filter(Boolean).join(', ');
  const meta = [when, appointment.providerName, appointment.location].filter(Boolean).map((part) => e(String(part))).join(' · ');

  const sinceHtml = sections
    .map(
      (section) => `
      <div class="since">
        <h3>${e(section.heading)}: <span>${e(section.summary)}</span></h3>
        ${section.lines.length > 0 ? `<ul>${section.lines.map((line) => `<li>${e(line)}</li>`).join('')}</ul>` : ''}
      </div>`,
    )
    .join('');

  const questionsHtml =
    questions.length === 0
      ? `<p class="muted">${e(tr('No questions written for this visit yet. The lines below are for writing them by hand.'))}</p>${'<div class="answer"></div>'.repeat(4)}`
      : questions
          .map(
            (question, index) => `
      <div class="question">
        <p class="q"><span class="box">${question.asked ? '&#10003;' : ''}</span>${index + 1}. ${e(question.text)}</p>
        ${question.answer ? `<p class="a">${e(question.answer)}</p>` : '<div class="answer"></div><div class="answer"></div>'}
      </div>`,
          )
          .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>${e(appointment.title)}</title><style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 40px; font-family: -apple-system, "Helvetica Neue", Roboto, Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #1f2a2e; background: #ffffff; }
  h1 { font-size: 18pt; margin: 0 0 2px; color: #2f6f73; }
  h2 { font-size: 12.5pt; margin: 18px 0 6px; color: #2f6f73; border-bottom: 1px solid #c9d6d6; padding-bottom: 3px; }
  h3 { font-size: 10.5pt; margin: 6px 0 2px; }
  h3 span { font-weight: normal; }
  ul { margin: 0 0 4px 18px; padding: 0; font-size: 10pt; }
  .meta, .muted { color: #5b6b70; font-size: 10pt; margin: 0; }
  .question { margin: 0 0 10px; page-break-inside: avoid; }
  .q { margin: 0 0 4px; font-weight: 600; }
  .a { margin: 0 0 0 26px; }
  .box { display: inline-block; width: 14px; height: 14px; border: 1px solid #5b6b70; margin-right: 8px; text-align: center; line-height: 13px; font-size: 10pt; vertical-align: -2px; }
  .answer { border-bottom: 1px solid #c9d6d6; height: 22px; margin-left: 26px; }
  footer { margin-top: 18px; font-size: 9pt; color: #5b6b70; }
</style></head><body>
  <h1>${e(appointment.title)}</h1>
  <p class="meta">${meta}</p>
  <h2>${e(tr('Since the last visit'))}</h2>
  <p class="muted">${e(since)}</p>
  ${sinceHtml}
  <h2>${e(tr('Questions'))}</h2>
  ${questionsHtml}
  <h2>${e(tr('Anything else said at the visit'))}</h2>
  ${'<div class="answer" style="margin-left:0"></div>'.repeat(4)}
  <footer>${e(tr('Made with Lifestead from what was recorded on this device. The ranges are the ones the lab printed.'))}</footer>
</body></html>`;
}
