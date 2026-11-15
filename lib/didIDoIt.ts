// Did I Do It: one day looked back on, made only of what was checked off.
//
// Direct instruction, 2026-11-15: "Did I do it should only be looking back
// at tasks that the user has checked off having been done. That's the whole
// point of it. It tracks individual tasks they created, as well as multiple
// tasks grouped into a routine. Did I Do It should show them a list of their
// individual tasks, and each routine with its tasks being a sub
// characteristic of them, but not with all tasks from each of their routines
// listed within the individual one time or daily tasks."
//
// So a day comes out in two parts that never share a line:
//   1. On their own: things on the Checklist no routine walks past, and
//      the To Do List, each with the times it was checked off.
//   2. Each routine: its walks that day, with the steps done on each walk
//      under it, plus any of its things checked off outside a walk.
// Nothing that was not checked off appears, and nothing is counted against
// the person: a thing missing from the day is simply not listed.
//
// Pure, so scripts/test_did_i_do_it.js can check it with no database. The
// reading is lib/didIDoItDb.ts and the screen components/DidIDoItLookBack.tsx.

import { localDayKey, routineForCheck, type Routine } from './routines';

export type LookBackMark = {
  checkId: string;
  checkName: string;
  /** UTC ISO. */
  markedAt: string;
  via: string;
  routineId: string | null;
};

export type LookBackRun = {
  id: string;
  routineId: string;
  routineName: string;
  startedAt: string;
  completedAt: string | null;
  stepsDone: number;
  stepsTotal: number;
};

export type LookBackRunStep = {
  runId: string;
  stepText: string;
  checkId: string | null;
  position: number;
  answer: string;
  answeredAt: string;
};

export type LookBackTaskDone = {
  todoId: string;
  title: string;
  doneAt: string;
};

export type LookBackItem = {
  key: string;
  name: string;
  kind: 'check' | 'task';
  /** UTC ISO, earliest first. */
  times: string[];
};

export type LookBackWalk = {
  runId: string;
  startedAt: string;
  finished: boolean;
  stepsTotal: number;
  /** The steps done on this walk, in walk order. Null for a walk from
   *  before each step was kept, which has only its count. */
  steps: { text: string; at: string }[] | null;
  stepsDone: number;
};

export type LookBackRoutine = {
  routineId: string;
  name: string;
  walks: LookBackWalk[];
  /** Its things checked off outside a walk (from the Checklist or a
   *  reminder), or on a walk from before each step was kept. */
  outsideWalks: LookBackItem[];
};

export type LookBackDay = {
  day: string;
  onTheirOwn: LookBackItem[];
  routines: LookBackRoutine[];
};

function onDay(iso: string, day: string): boolean {
  const date = new Date(iso);
  return !Number.isNaN(date.getTime()) && localDayKey(date) === day;
}

function addTime(map: Map<string, LookBackItem>, key: string, name: string, kind: LookBackItem['kind'], at: string) {
  const item = map.get(key);
  if (item) item.times.push(at);
  else map.set(key, { key, name, kind, times: [at] });
}

function sortItems(items: LookBackItem[]): LookBackItem[] {
  for (const item of items) item.times.sort();
  return items.sort((a, b) => (a.times[0] < b.times[0] ? -1 : a.times[0] > b.times[0] ? 1 : a.name.localeCompare(b.name)));
}

/**
 * One local day. The inputs may reach past the day at both ends (the stamps
 * are UTC, so the reader takes a day either side); anything not on `day`
 * is dropped here.
 */
export function buildLookBackDay(input: {
  day: string;
  marks: LookBackMark[];
  runs: LookBackRun[];
  runSteps: LookBackRunStep[];
  tasks: LookBackTaskDone[];
  routines: Routine[];
}): LookBackDay {
  const { day, routines } = input;
  const runs = input.runs.filter((run) => onDay(run.startedAt, day));
  const runIds = new Set(runs.map((run) => run.id));
  const stepsByRun = new Map<string, LookBackRunStep[]>();
  for (const step of input.runSteps) {
    if (!runIds.has(step.runId)) continue;
    const list = stepsByRun.get(step.runId) ?? [];
    list.push(step);
    stepsByRun.set(step.runId, list);
  }

  // A check a walk with step records already lists, per routine, so its
  // mark from that walk is not said a second time under the routine.
  const listedOnAWalk = new Set<string>();
  for (const run of runs) {
    for (const step of stepsByRun.get(run.id) ?? []) {
      if (step.answer === 'done' && step.checkId) listedOnAWalk.add(`${run.routineId}|${step.checkId}`);
    }
  }

  const loose = new Map<string, LookBackItem>();
  const outside = new Map<string, Map<string, LookBackItem>>();
  const routineNames = new Map<string, string>();
  for (const routine of routines) routineNames.set(routine.id, routine.name);
  for (const run of runs) if (!routineNames.has(run.routineId)) routineNames.set(run.routineId, run.routineName);

  for (const mark of input.marks) {
    if (!onDay(mark.markedAt, day)) continue;
    const routineId = mark.routineId ?? routineForCheck(mark.checkId, routines)?.id ?? null;
    if (!routineId) {
      addTime(loose, `check:${mark.checkId}`, mark.checkName, 'check', mark.markedAt);
      continue;
    }
    if (mark.via === 'routine' && listedOnAWalk.has(`${routineId}|${mark.checkId}`)) continue;
    const map = outside.get(routineId) ?? new Map<string, LookBackItem>();
    addTime(map, `check:${mark.checkId}`, mark.checkName, 'check', mark.markedAt);
    outside.set(routineId, map);
  }

  for (const task of input.tasks) {
    if (!onDay(task.doneAt, day)) continue;
    addTime(loose, `task:${task.todoId}`, task.title, 'task', task.doneAt);
  }

  const routineIds = new Set<string>([...runs.map((run) => run.routineId), ...outside.keys()]);
  const order = new Map(routines.map((routine) => [routine.id, routine.position]));
  const lookBackRoutines: LookBackRoutine[] = [...routineIds]
    .map((routineId) => {
      const walks = runs
        .filter((run) => run.routineId === routineId)
        .sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1))
        .map((run): LookBackWalk => {
          const recorded = stepsByRun.get(run.id);
          const steps = recorded
            ? recorded
                .filter((step) => step.answer === 'done')
                .sort((a, b) => a.position - b.position)
                .map((step) => ({ text: step.stepText, at: step.answeredAt }))
            : null;
          return {
            runId: run.id,
            startedAt: run.startedAt,
            finished: run.completedAt != null,
            stepsTotal: run.stepsTotal,
            steps,
            stepsDone: steps ? steps.length : run.stepsDone,
          };
        })
        // A walk opened and put down before anything was done holds nothing
        // checked off, so it is not part of the look back.
        .filter((walk) => walk.stepsDone > 0);
      return {
        routineId,
        name: routineNames.get(routineId) || 'A routine',
        walks,
        outsideWalks: sortItems([...(outside.get(routineId)?.values() ?? [])]),
      };
    })
    .filter((routine) => routine.walks.length > 0 || routine.outsideWalks.length > 0)
    .sort((a, b) => (order.get(a.routineId) ?? 1e9) - (order.get(b.routineId) ?? 1e9) || a.name.localeCompare(b.name));

  return { day, onTheirOwn: sortItems([...loose.values()]), routines: lookBackRoutines };
}

/** The days either side of `day`, as local day keys. */
export function shiftDay(day: string, by: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDayKey(new Date(y, m - 1, d + by));
}
