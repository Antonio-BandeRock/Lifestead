// Reading and writing projects (2026-10-30). What a project says about
// itself is decided in lib/projects.ts with no database; this carries out
// the changes. See projects and project_steps in lib/db.ts.

import { getDatabase } from './db';
import {
  cleanProjectText,
  nextPosition,
  planStepMove,
  type Project,
  type ProjectArea,
  type ProjectStatus,
  type ProjectStep,
} from './projects';

type ProjectRow = {
  id: string;
  name: string;
  about: string | null;
  area: string;
  linkKind: string | null;
  linkId: string | null;
  status: string;
  pausedAt: string | null;
  pausedNote: string | null;
  finishedAt: string | null;
  stoppedAt: string | null;
  dueOn: string | null;
  createdAt: string;
};

type StepRow = {
  id: string;
  projectId: string;
  text: string;
  position: number;
  parked: number;
  waitingOn: string | null;
  dueOn: string | null;
  doneAt: string | null;
  createdAt: string;
};

const PROJECT_COLUMNS = `id, name, about, area, link_kind AS linkKind, link_id AS linkId, status, paused_at AS pausedAt, paused_note AS pausedNote,
  finished_at AS finishedAt, stopped_at AS stoppedAt, due_on AS dueOn, created_at AS createdAt`;
const STEP_COLUMNS = `id, project_id AS projectId, text, position, parked, waiting_on AS waitingOn, due_on AS dueOn,
  done_at AS doneAt, created_at AS createdAt`;

const AREAS: ProjectArea[] = ['life', 'interests', 'garden', 'upkeep', 'work'];
const STATUSES: ProjectStatus[] = ['active', 'paused', 'finished', 'stopped'];

function fromProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    about: row.about,
    area: AREAS.includes(row.area as ProjectArea) ? (row.area as ProjectArea) : 'life',
    linkKind: row.linkKind,
    linkId: row.linkId,
    status: STATUSES.includes(row.status as ProjectStatus) ? (row.status as ProjectStatus) : 'active',
    pausedAt: row.pausedAt,
    pausedNote: row.pausedNote,
    finishedAt: row.finishedAt,
    stoppedAt: row.stoppedAt,
    dueOn: row.dueOn,
    createdAt: row.createdAt,
  };
}

function fromStepRow(row: StepRow): ProjectStep {
  return {
    id: row.id,
    projectId: row.projectId,
    text: row.text,
    position: row.position,
    parked: row.parked === 1,
    waitingOn: row.waitingOn,
    dueOn: row.dueOn,
    doneAt: row.doneAt,
    createdAt: row.createdAt,
  };
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanOrNull(text: string | null | undefined): string | null {
  const cleaned = text ? text.trim() : '';
  return cleaned ? cleaned : null;
}

/** Every project in one area, or every one. */
export async function listProjects(area: ProjectArea | 'everything'): Promise<Project[]> {
  const db = await getDatabase();
  const rows =
    area === 'everything'
      ? await db.getAllAsync<ProjectRow>(`SELECT ${PROJECT_COLUMNS} FROM projects ORDER BY created_at ASC`)
      : await db.getAllAsync<ProjectRow>(`SELECT ${PROJECT_COLUMNS} FROM projects WHERE area = ? ORDER BY created_at ASC`, area);
  return rows.map(fromProjectRow);
}

/** Every step of the given projects, or of every project. */
export async function listProjectSteps(projectIds?: string[]): Promise<ProjectStep[]> {
  const db = await getDatabase();
  if (projectIds && projectIds.length === 0) return [];
  const rows = projectIds
    ? await db.getAllAsync<StepRow>(
        `SELECT ${STEP_COLUMNS} FROM project_steps WHERE project_id IN (${projectIds.map(() => '?').join(', ')})`,
        ...projectIds,
      )
    : await db.getAllAsync<StepRow>(`SELECT ${STEP_COLUMNS} FROM project_steps`);
  return rows.map(fromStepRow);
}

export async function getProjectStep(id: string): Promise<ProjectStep | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<StepRow>(`SELECT ${STEP_COLUMNS} FROM project_steps WHERE id = ?`, id);
  return row ? fromStepRow(row) : null;
}

export type ProjectInput = {
  name: string;
  about?: string | null;
  area: ProjectArea;
  dueOn: string | null;
  /** Left out, an edit keeps the link it had; null clears it. */
  link?: { kind: string; id: string } | null;
};

export async function addProject(input: ProjectInput): Promise<string> {
  const db = await getDatabase();
  const id = newId('project');
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO projects (id, name, about, area, link_kind, link_id, status, due_on, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    id,
    cleanProjectText(input.name),
    cleanOrNull(input.about),
    input.area,
    input.link?.kind ?? null,
    input.link?.id ?? null,
    input.dueOn,
    now,
    now,
  );
  return id;
}

export async function updateProject(id: string, input: ProjectInput): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE projects SET name = ?, about = ?, area = ?, due_on = ?, updated_at = ? WHERE id = ?',
    cleanProjectText(input.name),
    cleanOrNull(input.about),
    input.area,
    input.dueOn,
    new Date().toISOString(),
    id,
  );
  if (input.link !== undefined) {
    await db.runAsync(
      'UPDATE projects SET link_kind = ?, link_id = ? WHERE id = ?',
      input.link?.kind ?? null,
      input.link?.id ?? null,
      id,
    );
  }
}

/**
 * Moves a project to a new state. Pausing keeps the note of where it was
 * left off; going again clears the pause and its note, since the steps
 * already hold the record. Finishing and stopping each keep their moment,
 * and going again from either clears it.
 */
export async function setProjectStatus(id: string, status: ProjectStatus, pausedNote?: string | null): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  if (status === 'paused') {
    await db.runAsync(
      `UPDATE projects SET status = 'paused', paused_at = ?, paused_note = ?, finished_at = NULL, stopped_at = NULL, updated_at = ?
        WHERE id = ?`,
      now,
      cleanOrNull(pausedNote),
      now,
      id,
    );
  } else if (status === 'finished') {
    await db.runAsync(
      `UPDATE projects SET status = 'finished', finished_at = ?, stopped_at = NULL, updated_at = ? WHERE id = ?`,
      now,
      now,
      id,
    );
  } else if (status === 'stopped') {
    await db.runAsync(
      `UPDATE projects SET status = 'stopped', stopped_at = ?, finished_at = NULL, updated_at = ? WHERE id = ?`,
      now,
      now,
      id,
    );
  } else {
    await db.runAsync(
      `UPDATE projects SET status = 'active', paused_at = NULL, paused_note = NULL, finished_at = NULL, stopped_at = NULL,
        updated_at = ? WHERE id = ?`,
      now,
      id,
    );
  }
}

/** Removes a project and its own steps, and nothing else. */
export async function deleteProject(id: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM project_steps WHERE project_id = ?', id);
    await db.runAsync('DELETE FROM projects WHERE id = ?', id);
  });
}

export type StepInput = {
  text: string;
  waitingOn?: string | null;
  dueOn?: string | null;
  parked?: boolean;
};

export async function addProjectStep(projectId: string, input: StepInput): Promise<string> {
  const db = await getDatabase();
  const id = newId('projstep');
  const now = new Date().toISOString();
  const steps = await listProjectSteps([projectId]);
  await db.runAsync(
    `INSERT INTO project_steps (id, project_id, text, position, parked, waiting_on, due_on, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    projectId,
    cleanProjectText(input.text),
    nextPosition(steps),
    input.parked ? 1 : 0,
    cleanOrNull(input.waitingOn),
    input.dueOn ?? null,
    now,
    now,
  );
  await touchProject(projectId);
  return id;
}

export async function updateProjectStep(id: string, input: StepInput): Promise<void> {
  const db = await getDatabase();
  const step = await getProjectStep(id);
  if (!step) return;
  await db.runAsync(
    'UPDATE project_steps SET text = ?, waiting_on = ?, due_on = ?, updated_at = ? WHERE id = ?',
    cleanProjectText(input.text),
    cleanOrNull(input.waitingOn),
    input.dueOn ?? null,
    new Date().toISOString(),
    id,
  );
  await touchProject(step.projectId);
}

/** Done, or open again. */
export async function setProjectStepDone(id: string, done: boolean): Promise<void> {
  const db = await getDatabase();
  const step = await getProjectStep(id);
  if (!step) return;
  const now = new Date().toISOString();
  await db.runAsync('UPDATE project_steps SET done_at = ?, updated_at = ? WHERE id = ?', done ? now : null, now, id);
  await touchProject(step.projectId);
}

/** Kept for later, or back into the plan at its end. */
export async function setProjectStepParked(id: string, parked: boolean): Promise<void> {
  const db = await getDatabase();
  const step = await getProjectStep(id);
  if (!step) return;
  const now = new Date().toISOString();
  const position = parked ? step.position : nextPosition(await listProjectSteps([step.projectId]));
  await db.runAsync(
    'UPDATE project_steps SET parked = ?, position = ?, updated_at = ? WHERE id = ?',
    parked ? 1 : 0,
    position,
    now,
    id,
  );
  await touchProject(step.projectId);
}

/** One place up or down in the plan. Returns false when it cannot move. */
export async function moveProjectStep(id: string, direction: -1 | 1): Promise<boolean> {
  const step = await getProjectStep(id);
  if (!step) return false;
  const steps = await listProjectSteps([step.projectId]);
  const positions = planStepMove(steps, id, direction);
  if (!positions) return false;
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const [stepId, position] of positions) {
      await db.runAsync('UPDATE project_steps SET position = ?, updated_at = ? WHERE id = ?', position, now, stepId);
    }
  });
  await touchProject(step.projectId);
  return true;
}

export async function deleteProjectStep(id: string): Promise<void> {
  const db = await getDatabase();
  const step = await getProjectStep(id);
  if (!step) return;
  await db.runAsync('DELETE FROM project_steps WHERE id = ?', id);
  await touchProject(step.projectId);
}

/** A change to a step is a change to its project, for the merge. */
async function touchProject(projectId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE projects SET updated_at = ? WHERE id = ?', new Date().toISOString(), projectId);
}
