// Projects, app-wide (2026-10-30). A project is something bigger than one
// task: a bathroom to retile, a quilt, a raised bed to build, a course to
// finish. It holds its steps in order, and the one thing the screen puts
// first is the next step, because the question a person brings to a project
// they put down three weeks ago is "what was I doing next".
//
// Life > Projects shows every one; the area a project belongs to (Interests,
// Garden, Upkeep, Work) shows its own. A step can be waiting on someone or
// something, in which case it is not the next thing to do and says what it
// is waiting for, and a step can be kept for later (the parking lot), where
// ideas go so they stop taking up room without becoming part of the plan.
//
// Three states besides going: paused, with a note of where it was left off,
// finished, and stopped. Stopped is kept as history exactly as finished is,
// and nothing here calls it failed, given up or abandoned; deciding not to
// carry on is a decision, not a fault. No percentage of steps done, no
// streak and no score: a count of the steps still to do, which is what
// helps, and nothing more. scripts/test_projects.js holds all of it,
// including a sweep for words that judge.
//
// Everything here is pure; lib/projectsDb.ts reads and writes.

import { formatTodoDay } from './todos';

export type ProjectArea = 'life' | 'interests' | 'garden' | 'upkeep' | 'work';
export type ProjectStatus = 'active' | 'paused' | 'finished' | 'stopped';

export const PROJECT_AREAS: ProjectArea[] = ['life', 'interests', 'garden', 'upkeep', 'work'];
export const PROJECT_AREA_LABELS: Record<ProjectArea, string> = {
  life: 'Life',
  interests: 'Interests',
  garden: 'Garden',
  upkeep: 'Upkeep',
  work: 'Work',
};

export type Project = {
  id: string;
  name: string;
  about: string | null;
  area: ProjectArea;
  status: ProjectStatus;
  /** When it was paused, and the note of where it was left off. */
  pausedAt: string | null;
  pausedNote: string | null;
  finishedAt: string | null;
  stoppedAt: string | null;
  /** 'YYYY-MM-DD', the day it is meant to be done by, if it has one. */
  dueOn: string | null;
  createdAt: string;
};

export type ProjectStep = {
  id: string;
  projectId: string;
  text: string;
  position: number;
  /** Kept for later: an idea held so it stops taking up room, not part of
   *  the plan until it is moved back. */
  parked: boolean;
  /** Who or what the step is waiting on, or null. */
  waitingOn: string | null;
  dueOn: string | null;
  doneAt: string | null;
  createdAt: string;
};

export type StepState = 'open' | 'waiting' | 'parked' | 'done';

export function stepState(step: ProjectStep): StepState {
  if (step.doneAt) return 'done';
  if (step.parked) return 'parked';
  if (step.waitingOn && step.waitingOn.trim()) return 'waiting';
  return 'open';
}

function byPosition(a: ProjectStep, b: ProjectStep): number {
  return a.position - b.position || a.createdAt.localeCompare(b.createdAt);
}

/** The steps of one project, in the order the screen lists them: the plan
 *  (open and waiting, by position), then what is kept for later, then what
 *  is done, most recently done first. */
export function orderSteps(steps: ProjectStep[]): ProjectStep[] {
  const plan = steps.filter((step) => !step.doneAt && !step.parked).sort(byPosition);
  const later = steps.filter((step) => !step.doneAt && step.parked).sort(byPosition);
  const done = steps.filter((step) => step.doneAt).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''));
  return [...plan, ...later, ...done];
}

/** The first step in the plan that is not done and not waiting on anything. */
export function nextStep(steps: ProjectStep[]): ProjectStep | null {
  return steps.filter((step) => stepState(step) === 'open').sort(byPosition)[0] ?? null;
}

/** Steps still to do: open and waiting, never the ones kept for later. */
export function stepsLeft(steps: ProjectStep[]): number {
  return steps.filter((step) => {
    const state = stepState(step);
    return state === 'open' || state === 'waiting';
  }).length;
}

export function describeStepsLeft(count: number): string {
  if (count === 0) return 'Nothing left in the plan';
  return count === 1 ? '1 step left' : `${count} steps left`;
}

function dayDifference(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** A day in a few words. One gone by is named as the day it was, never as
 *  late. */
export function describeProjectDay(dueOn: string, today: string): string {
  const diff = dayDifference(today, dueOn);
  if (diff === 0) return 'For today';
  if (diff === 1) return 'For tomorrow';
  if (diff < 0) return `Its day was ${formatTodoDay(dueOn, today)}`;
  return `For ${formatTodoDay(dueOn, today)}`;
}

/** 'YYYY-MM-DD' of a stored ISO moment, on the local calendar. */
export function localDayOfMoment(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The lines under a project's name, first to last. A going project leads
 * with its next step, or what it is waiting on when every step in the plan
 * is waiting; a paused one says since when; a finished or stopped one says
 * when. The note of where it was left off is shown by the screen on a line
 * of its own (describeLeftOff), since it is the person's words.
 */
export function describeProjectLines(project: Project, steps: ProjectStep[], today: string): string[] {
  const own = steps.filter((step) => step.projectId === project.id);
  const lines: string[] = [];
  if (project.status === 'finished') {
    lines.push(project.finishedAt ? `Finished ${formatTodoDay(localDayOfMoment(project.finishedAt), today)}` : 'Finished');
    return lines;
  }
  if (project.status === 'stopped') {
    lines.push(
      project.stoppedAt
        ? `Stopped ${formatTodoDay(localDayOfMoment(project.stoppedAt), today)}, kept as a record`
        : 'Stopped, kept as a record',
    );
    return lines;
  }
  if (project.status === 'paused') {
    lines.push(project.pausedAt ? `Paused since ${formatTodoDay(localDayOfMoment(project.pausedAt), today)}` : 'Paused');
  }
  const next = nextStep(own);
  if (next) {
    lines.push(`Next: ${next.text}`);
  } else {
    const waiting = own.filter((step) => stepState(step) === 'waiting').sort(byPosition);
    if (waiting.length > 0) lines.push(`Waiting on ${waiting[0].waitingOn!.trim()}`);
    else if (own.some((step) => step.doneAt)) lines.push('Every step in the plan is done');
    else lines.push('No steps yet');
  }
  const left = stepsLeft(own);
  const meta: string[] = [];
  if (left > 0) meta.push(describeStepsLeft(left));
  if (project.dueOn) meta.push(describeProjectDay(project.dueOn, today));
  if (meta.length > 0) lines.push(meta.join(' · '));
  return lines;
}

/** The person's note from pausing, as a line of its own. */
export function describeLeftOff(project: Project): string | null {
  if (project.status !== 'paused' || !project.pausedNote || !project.pausedNote.trim()) return null;
  return `Where you left off: ${project.pausedNote.trim()}`;
}

/** The muted line under a step. */
export function describeStepCaption(step: ProjectStep, today: string): string | null {
  const parts: string[] = [];
  const state = stepState(step);
  if (state === 'done') parts.push(`Done ${formatTodoDay(localDayOfMoment(step.doneAt!), today)}`);
  if (state === 'waiting') parts.push(`Waiting on ${step.waitingOn!.trim()}`);
  if (state !== 'done' && step.dueOn) parts.push(describeProjectDay(step.dueOn, today));
  return parts.length > 0 ? parts.join(' · ') : null;
}

// --- Grouping -----------------------------------------------------------------

export type ProjectGroupKey = ProjectStatus;

export const PROJECT_GROUP_LABELS: Record<ProjectGroupKey, string> = {
  active: 'In progress',
  paused: 'Paused',
  finished: 'Finished',
  stopped: 'Stopped',
};

const GROUP_ORDER: ProjectGroupKey[] = ['active', 'paused', 'finished', 'stopped'];

export type ProjectGroup = { key: ProjectGroupKey; label: string; projects: Project[] };

/**
 * Projects in their groups. Going ones with a day come first, soonest day
 * first, then the rest by when they were started; paused ones by when they
 * were paused, longest first, so the one put down earliest is not buried;
 * finished and stopped ones most recent first. Empty groups are left out.
 */
export function groupProjects(projects: Project[]): ProjectGroup[] {
  const groups: ProjectGroup[] = [];
  for (const key of GROUP_ORDER) {
    const inGroup = projects.filter((project) => project.status === key);
    if (inGroup.length === 0) continue;
    if (key === 'active') {
      inGroup.sort((a, b) => {
        if (a.dueOn && b.dueOn) return a.dueOn.localeCompare(b.dueOn);
        if (a.dueOn) return -1;
        if (b.dueOn) return 1;
        return a.createdAt.localeCompare(b.createdAt);
      });
    } else if (key === 'paused') {
      inGroup.sort((a, b) => (a.pausedAt ?? '').localeCompare(b.pausedAt ?? ''));
    } else {
      const at = (project: Project) => (key === 'finished' ? project.finishedAt : project.stoppedAt) ?? '';
      inGroup.sort((a, b) => at(b).localeCompare(at(a)));
    }
    groups.push({ key, label: PROJECT_GROUP_LABELS[key], projects: inGroup });
  }
  return groups;
}

/** Positions after moving one step of the plan up or down, as id to new
 *  position, or null when it cannot move that way. Only the plan (open and
 *  waiting steps) is reordered; later and done steps keep theirs. */
export function planStepMove(steps: ProjectStep[], stepId: string, direction: -1 | 1): Map<string, number> | null {
  const plan = steps.filter((step) => !step.doneAt && !step.parked).sort(byPosition);
  const index = plan.findIndex((step) => step.id === stepId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= plan.length) return null;
  const moved = [...plan];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  const positions = new Map<string, number>();
  moved.forEach((step, i) => positions.set(step.id, i + 1));
  return positions;
}

/** The position for a new step at the end of the plan. */
export function nextPosition(steps: ProjectStep[]): number {
  return steps.reduce((max, step) => Math.max(max, step.position), 0) + 1;
}

// --- Reminders and the day timeline -----------------------------------------------

export type ProjectReminder = {
  sourceId: string;
  title: string;
  detail: string | null;
  dueOn: string;
  /** A step's reminder carries Done; a project's own day does not, since
   *  finishing a project is said on the project. */
  markable: boolean;
};

/**
 * What raises a reminder: a step in the plan of a going project, given a
 * day, and a going project's own day. A paused project raises nothing,
 * because pausing is how a person says not now. Days already gone by are
 * left out, the same as a task's: the step stays in its plan.
 */
export function projectReminders(projects: Project[], steps: ProjectStep[], today: string): ProjectReminder[] {
  const going = new Map(projects.filter((project) => project.status === 'active').map((project) => [project.id, project]));
  const reminders: ProjectReminder[] = [];
  for (const project of going.values()) {
    if (!project.dueOn || project.dueOn < today) continue;
    const next = nextStep(steps.filter((step) => step.projectId === project.id));
    reminders.push({
      sourceId: project.id,
      title: project.name,
      detail: next ? `Next: ${next.text}` : null,
      dueOn: project.dueOn,
      markable: false,
    });
  }
  for (const step of steps) {
    const project = going.get(step.projectId);
    if (!project || step.doneAt || step.parked || !step.dueOn || step.dueOn < today) continue;
    reminders.push({
      sourceId: step.id,
      title: step.text,
      detail: project.name,
      dueOn: step.dueOn,
      markable: true,
    });
  }
  return reminders;
}

/** A name or a step worth keeping: some letters, trimmed, and not endless. */
export function cleanProjectText(text: string, max = 200): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}
