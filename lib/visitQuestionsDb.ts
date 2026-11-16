// Reads and writes for questions tied to one visit (K4). The rules and every
// sentence are lib/visitQuestions.ts.
import { listCaptureNotes } from './captureNotesDb';
import { getDatabase } from './db';
import { loadVisitRecords } from './trendsMoreDb';
import {
  cleanQuestionText,
  moveQuestion,
  nextPosition,
  notesToOffer,
  orderQuestions,
  type NoteToOffer,
  type PageAppointment,
  type PageInputs,
  type VisitQuestion,
} from './visitQuestions';

type Row = {
  id: string;
  appointmentId: string;
  text: string;
  position: number;
  asked: number;
  answer: string | null;
  captureNoteId: string | null;
  createdAt: string;
};

const COLUMNS = `id, appointment_id AS appointmentId, text, position, asked, answer,
  capture_note_id AS captureNoteId, created_at AS createdAt`;

function fromRow(row: Row): VisitQuestion {
  return { ...row, asked: row.asked === 1 };
}

export async function listVisitQuestions(appointmentId: string): Promise<VisitQuestion[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>(`SELECT ${COLUMNS} FROM visit_questions WHERE appointment_id = ?`, appointmentId);
  return orderQuestions(rows.map(fromRow));
}

/** Questions for several appointments in one read, keyed by appointment. */
export async function listVisitQuestionsFor(appointmentIds: string[]): Promise<Map<string, VisitQuestion[]>> {
  const found = new Map<string, VisitQuestion[]>();
  if (appointmentIds.length === 0) return found;
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${COLUMNS} FROM visit_questions WHERE appointment_id IN (${appointmentIds.map(() => '?').join(', ')})`,
    ...appointmentIds,
  );
  for (const row of rows) {
    const list = found.get(row.appointmentId) ?? [];
    list.push(fromRow(row));
    found.set(row.appointmentId, list);
  }
  for (const [key, list] of found) found.set(key, orderQuestions(list));
  return found;
}

export async function addVisitQuestion(appointmentId: string, text: string, captureNoteId: string | null = null): Promise<boolean> {
  const words = cleanQuestionText(text);
  if (!words) return false;
  const db = await getDatabase();
  const existing = await listVisitQuestions(appointmentId);
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO visit_questions (id, appointment_id, text, position, asked, answer, capture_note_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, NULL, ?, ?, ?)`,
    `visitq_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    appointmentId,
    words,
    nextPosition(existing),
    captureNoteId,
    now,
    now,
  );
  return true;
}

export async function updateVisitQuestionText(id: string, text: string): Promise<boolean> {
  const words = cleanQuestionText(text);
  if (!words) return false;
  const db = await getDatabase();
  await db.runAsync(`UPDATE visit_questions SET text = ?, updated_at = ? WHERE id = ?`, words, new Date().toISOString(), id);
  return true;
}

export async function setVisitQuestionAsked(id: string, asked: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE visit_questions SET asked = ?, updated_at = ? WHERE id = ?`, asked ? 1 : 0, new Date().toISOString(), id);
}

/** The answer given, or null to clear it. Writing an answer ticks the
 *  question as asked, since it was. */
export async function setVisitQuestionAnswer(id: string, answer: string | null): Promise<void> {
  const db = await getDatabase();
  const words = answer ? answer.replace(/[ \t]+/g, ' ').trim() : '';
  const now = new Date().toISOString();
  if (words) {
    await db.runAsync(`UPDATE visit_questions SET answer = ?, asked = 1, updated_at = ? WHERE id = ?`, words, now, id);
  } else {
    await db.runAsync(`UPDATE visit_questions SET answer = NULL, updated_at = ? WHERE id = ?`, now, id);
  }
}

export async function moveVisitQuestion(appointmentId: string, id: string, direction: 'up' | 'down'): Promise<void> {
  const positions = moveQuestion(await listVisitQuestions(appointmentId), id, direction);
  if (!positions) return;
  const db = await getDatabase();
  const now = new Date().toISOString();
  for (const { id: questionId, position } of positions) {
    await db.runAsync(`UPDATE visit_questions SET position = ?, updated_at = ? WHERE id = ?`, position, now, questionId);
  }
}

/** Removing one question the person chose to remove. */
export async function removeVisitQuestion(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM visit_questions WHERE id = ?`, id);
}

/** The questions not asked yet move to another visit, after its own. */
export async function moveUnaskedQuestions(fromAppointmentId: string, toAppointmentId: string): Promise<void> {
  const [from, to] = await Promise.all([listVisitQuestions(fromAppointmentId), listVisitQuestions(toAppointmentId)]);
  const db = await getDatabase();
  const now = new Date().toISOString();
  let position = nextPosition(to);
  for (const question of from.filter((q) => !q.asked)) {
    await db.runAsync(
      `UPDATE visit_questions SET appointment_id = ?, position = ?, updated_at = ? WHERE id = ?`,
      toAppointmentId,
      position,
      now,
      question.id,
    );
    position += 1;
  }
}

/** Every question of an appointment the person is removing, removed with it. */
export async function removeQuestionsOf(appointmentId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM visit_questions WHERE appointment_id = ?`, appointmentId);
}

/** Health notes from Capture not yet brought in to any visit. */
export async function listNotesToOffer(): Promise<NoteToOffer[]> {
  const db = await getDatabase();
  const [notes, used] = await Promise.all([
    listCaptureNotes(365),
    db.getAllAsync<{ id: string }>(`SELECT capture_note_id AS id FROM visit_questions WHERE capture_note_id IS NOT NULL`),
  ]);
  return notesToOffer(notes, new Set(used.map((row) => row.id)));
}

/** Everything the printed page reads for one appointment. */
export async function loadVisitPageInputs(appointment: PageAppointment): Promise<PageInputs> {
  const [records, questions] = await Promise.all([
    loadVisitRecords(appointment.scheduledFor.slice(0, 10)),
    listVisitQuestions(appointment.id),
  ]);
  return {
    appointment,
    appointments: records.appointments,
    labs: records.labs,
    flares: records.flares,
    treatments: records.treatments,
    questions,
  };
}
