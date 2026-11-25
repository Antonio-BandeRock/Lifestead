// Reading and writing to-dos (C10). What an answer does is decided in
// lib/todos.ts (planTodoAnswer) with no database; this carries it out. See
// todos and todo_doings in lib/db.ts.

import { getDatabase } from './db';
import type { RepeatConfig } from './repeatRule';
import { planTodoAnswer, type Todo, type TodoAnswerPlan, type TodoArea, type TodoDoingKind } from './todos';
import { cleanLabel, cleanStepText, nextStepPosition, type TodoStep } from './todoExtras';

type TodoRow = {
  id: string;
  title: string;
  notes: string | null;
  area: string;
  dueOn: string | null;
  dueTime: string | null;
  anchorOn: string | null;
  repeatJson: string | null;
  doneAt: string | null;
  closedAs: string | null;
  createdAt: string;
};

const COLUMNS = `id, title, notes, area, due_on AS dueOn, due_time AS dueTime, anchor_on AS anchorOn, repeat_json AS repeatJson,
  done_at AS doneAt, closed_as AS closedAs, created_at AS createdAt`;

function parseRepeat(json: string | null): RepeatConfig | null {
  if (!json) return null;
  try {
    const value = JSON.parse(json) as RepeatConfig;
    return value && typeof value.type === 'string' && value.type !== 'none' ? value : null;
  } catch {
    return null;
  }
}

function fromRow(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    area: row.area === 'work' ? 'work' : 'personal',
    dueOn: row.dueOn,
    dueTime: row.dueOn && row.dueTime ? row.dueTime : null,
    anchorOn: row.anchorOn,
    repeat: parseRepeat(row.repeatJson),
    doneAt: row.doneAt,
    closedAs: row.closedAs === 'let_go' ? 'let_go' : row.closedAs === 'done' ? 'done' : null,
    createdAt: row.createdAt,
  };
}

/** Every to-do in one area, or both. Done ones from the last 60 days come
 *  too, so the Done fold has something to show without the list growing
 *  for ever; older ones stay in the table as the record. */
export async function listTodos(area: TodoArea | 'everything'): Promise<Todo[]> {
  const db = await getDatabase();
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const where = area === 'everything' ? '' : 'AND area = ?';
  const rows = await db.getAllAsync<TodoRow>(
    `SELECT ${COLUMNS} FROM todos WHERE (done_at IS NULL OR done_at >= ?) ${where} ORDER BY created_at ASC`,
    ...(area === 'everything' ? [since] : [since, area]),
  );
  return rows.map(fromRow);
}

/** The open ones, for reminders and Home. */
export async function listOpenTodos(): Promise<Todo[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TodoRow>(`SELECT ${COLUMNS} FROM todos WHERE done_at IS NULL ORDER BY created_at ASC`);
  return rows.map(fromRow);
}

export async function getTodo(id: string): Promise<Todo | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TodoRow>(`SELECT ${COLUMNS} FROM todos WHERE id = ?`, id);
  return row ? fromRow(row) : null;
}

export type TodoInput = {
  title: string;
  notes?: string | null;
  area: TodoArea;
  dueOn: string | null;
  /** 'HH:MM', kept only beside a day. */
  dueTime?: string | null;
  repeat: RepeatConfig | null;
};

function timeOf(input: TodoInput): string | null {
  return input.dueOn && input.dueTime && /^\d{2}:\d{2}$/.test(input.dueTime) ? input.dueTime : null;
}

export async function addTodo(input: TodoInput): Promise<string> {
  const db = await getDatabase();
  const id = `todo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const repeat = input.repeat && input.repeat.type !== 'none' && input.dueOn ? input.repeat : null;
  const notes = input.notes && input.notes.trim() ? input.notes.trim() : null;
  await db.runAsync(
    `INSERT INTO todos (id, title, notes, area, due_on, due_time, anchor_on, repeat_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.title.trim(),
    notes,
    input.area,
    input.dueOn,
    timeOf(input),
    repeat ? input.dueOn : null,
    repeat ? JSON.stringify(repeat) : null,
    now,
    now,
  );
  return id;
}

/** Changes what a to-do says and when. Changing the day or the repeat
 *  starts the pattern again from the new day. */
export async function updateTodo(id: string, input: TodoInput): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const repeat = input.repeat && input.repeat.type !== 'none' && input.dueOn ? input.repeat : null;
  const notes = input.notes && input.notes.trim() ? input.notes.trim() : null;
  await db.runAsync(
    `UPDATE todos SET title = ?, notes = ?, area = ?, due_on = ?, due_time = ?, anchor_on = ?, repeat_json = ?, updated_at = ?
      WHERE id = ?`,
    input.title.trim(),
    notes,
    input.area,
    input.dueOn,
    timeOf(input),
    repeat ? input.dueOn : null,
    repeat ? JSON.stringify(repeat) : null,
    now,
    id,
  );
}

/** Answers a to-do: done, or let go. Returns what was decided so the
 *  screen can say it back. */
export async function answerTodo(id: string, kind: TodoDoingKind, today: string): Promise<{ todo: Todo; plan: TodoAnswerPlan } | null> {
  const todo = await getTodo(id);
  if (!todo || todo.doneAt) return null;
  const plan = planTodoAnswer(todo, kind, today);
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    if (plan.doing) {
      await db.runAsync(
        `INSERT INTO todo_doings (id, todo_id, due_on, kind, done_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        `tododoing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        id,
        plan.doing.dueOn,
        plan.doing.kind,
        now,
        now,
        now,
      );
    }
    if (plan.closes) {
      await db.runAsync('UPDATE todos SET done_at = ?, closed_as = ?, updated_at = ? WHERE id = ?', now, kind, now, id);
    } else {
      await db.runAsync('UPDATE todos SET due_on = ?, updated_at = ? WHERE id = ?', plan.nextDueOn, now, id);
      // Moving on to the next day starts its steps fresh (Q47).
      await db.runAsync('UPDATE todo_steps SET done_at = NULL, updated_at = ? WHERE todo_id = ? AND done_at IS NOT NULL', now, id);
    }
  });
  return { todo, plan };
}

/** Done from a reminder's button. */
export async function markTodoDone(id: string, today: string): Promise<void> {
  await answerTodo(id, 'done', today);
}

/** Opens a closed to-do again. Its doings stay: what was done was done. */
export async function reopenTodo(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE todos SET done_at = NULL, closed_as = NULL, updated_at = ? WHERE id = ?', now, id);
}

/** Removes a to-do with the record of its doings, its steps and its
 *  labels. Nothing else refers to any of them. */
export async function deleteTodo(id: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM todo_doings WHERE todo_id = ?', id);
    await db.runAsync('DELETE FROM todo_steps WHERE todo_id = ?', id);
    await db.runAsync('DELETE FROM todo_labels WHERE todo_id = ?', id);
    await db.runAsync('DELETE FROM todos WHERE id = ?', id);
  });
}

// --- Steps under a to-do (Q47) -----------------------------------------------

function stepId(): string {
  return `todostep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Every step of these to-dos, keyed by to-do. Read by the to-dos shown,
 *  so it is as long as they are. */
export async function listStepsFor(todoIds: readonly string[]): Promise<Map<string, TodoStep[]>> {
  const result = new Map<string, TodoStep[]>();
  if (todoIds.length === 0) return result;
  const db = await getDatabase();
  const rows = await db.getAllAsync<TodoStep>(
    `SELECT id, todo_id AS todoId, text, position, done_at AS doneAt, created_at AS createdAt
       FROM todo_steps WHERE todo_id IN (${todoIds.map(() => '?').join(', ')})
      ORDER BY position ASC, created_at ASC`,
    ...todoIds,
  );
  for (const row of rows) result.set(row.todoId, [...(result.get(row.todoId) ?? []), row]);
  return result;
}

export async function addTodoStep(todoId: string, text: string): Promise<boolean> {
  const words = cleanStepText(text);
  if (!words) return false;
  const db = await getDatabase();
  const existing = (await listStepsFor([todoId])).get(todoId) ?? [];
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO todo_steps (id, todo_id, text, position, done_at, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?, ?)',
    stepId(), todoId, words, nextStepPosition(existing), now, now,
  );
  return true;
}

/** Several steps at once, in the order given, after any already there. */
export async function addTodoSteps(todoId: string, texts: readonly string[]): Promise<void> {
  const words = texts.map(cleanStepText).filter(Boolean);
  if (words.length === 0) return;
  const db = await getDatabase();
  const first = nextStepPosition((await listStepsFor([todoId])).get(todoId) ?? []);
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO todo_steps (id, todo_id, text, position, done_at, created_at, updated_at) VALUES ${words.map(() => '(?, ?, ?, ?, NULL, ?, ?)').join(', ')}`,
    ...words.flatMap((text, index) => [stepId(), todoId, text, first + index, now, now]),
  );
}

export async function setTodoStepDone(id: string, done: boolean): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE todo_steps SET done_at = ?, updated_at = ? WHERE id = ?', done ? now : null, now, id);
}

export async function renameTodoStep(id: string, text: string): Promise<boolean> {
  const words = cleanStepText(text);
  if (!words) return false;
  const db = await getDatabase();
  await db.runAsync('UPDATE todo_steps SET text = ?, updated_at = ? WHERE id = ?', words, new Date().toISOString(), id);
  return true;
}

export async function reorderTodoSteps(order: readonly { id: string; position: number }[]): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const step of order) await db.runAsync('UPDATE todo_steps SET position = ?, updated_at = ? WHERE id = ?', step.position, now, step.id);
  });
}

export async function deleteTodoStep(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM todo_steps WHERE id = ?', id);
}

// --- Labels on to-dos (Q47) --------------------------------------------------

/** The labels on these to-dos, keyed by to-do. */
export async function listLabelsFor(todoIds: readonly string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (todoIds.length === 0) return result;
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ todoId: string; label: string }>(
    `SELECT todo_id AS todoId, label FROM todo_labels WHERE todo_id IN (${todoIds.map(() => '?').join(', ')}) ORDER BY created_at ASC`,
    ...todoIds,
  );
  for (const row of rows) result.set(row.todoId, [...(result.get(row.todoId) ?? []), row.label]);
  return result;
}

/** Every label on any to-do, open or closed, so a label typed again with
 *  other capitals takes the spelling already in use. */
export async function listAllTodoLabels(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ label: string }>('SELECT DISTINCT label FROM todo_labels');
  return rows.map((row) => row.label);
}

/** Puts exactly these labels on a to-do: new ones added, ones no longer
 *  given taken off, the rest left as they were. */
export async function setTodoLabels(todoId: string, labels: readonly string[]): Promise<void> {
  const wanted = new Map<string, string>();
  for (const label of labels) {
    const clean = cleanLabel(label);
    if (clean && !wanted.has(clean.toLocaleLowerCase())) wanted.set(clean.toLocaleLowerCase(), clean);
  }
  const db = await getDatabase();
  const now = new Date().toISOString();
  const current = await db.getAllAsync<{ id: string; label: string }>('SELECT id, label FROM todo_labels WHERE todo_id = ?', todoId);
  await db.withTransactionAsync(async () => {
    for (const row of current) {
      const key = row.label.toLocaleLowerCase();
      if (wanted.has(key)) wanted.delete(key);
      else await db.runAsync('DELETE FROM todo_labels WHERE id = ?', row.id);
    }
    for (const label of wanted.values()) {
      await db.runAsync(
        'INSERT INTO todo_labels (id, todo_id, label, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        `todolabel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, todoId, label, now, now,
      );
    }
  });
}
