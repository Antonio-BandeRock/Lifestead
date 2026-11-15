// Reading one day for Life > Did I Do It. The rules are in lib/didIDoIt.ts.
//
// done_check_marks.marked_at, routine_runs.started_at, routine_run_steps
// .answered_at and todo_doings.done_at are UTC, so each window reaches a day
// past the local day at both ends and buildLookBackDay keeps only the local
// day (the local-day rule, CLAUDE.md). A day is read whole: nothing here
// stops at a count.

import { getDatabase } from './db';
import { getRoutines } from './routinesDb';
import { shiftDay, buildLookBackDay, type LookBackDay } from './didIDoIt';

export async function getLookBackDay(day: string): Promise<LookBackDay> {
  const db = await getDatabase();
  const from = `${shiftDay(day, -1)}T00:00:00`;
  const until = `${shiftDay(day, 2)}T00:00:00`;
  const [routines, marks, runs, runSteps, tasks] = await Promise.all([
    getRoutines(),
    db.getAllAsync<{ checkId: string; checkName: string; markedAt: string; via: string; routineId: string | null }>(
      `SELECT m.check_id AS checkId, c.name AS checkName, m.marked_at AS markedAt, m.via AS via, m.routine_id AS routineId
         FROM done_check_marks m JOIN done_checks c ON c.id = m.check_id
        WHERE m.marked_at >= ? AND m.marked_at < ?`,
      from,
      until,
    ),
    db.getAllAsync<{ id: string; routineId: string; routineName: string | null; startedAt: string; completedAt: string | null; stepsDone: number | null; stepsTotal: number | null }>(
      `SELECT id, routine_id AS routineId, routine_name AS routineName, started_at AS startedAt,
              completed_at AS completedAt, steps_done AS stepsDone, steps_total AS stepsTotal
         FROM routine_runs WHERE started_at >= ? AND started_at < ?`,
      from,
      until,
    ),
    db.getAllAsync<{ runId: string; stepText: string; checkId: string | null; position: number; answer: string; answeredAt: string }>(
      `SELECT s.run_id AS runId, s.step_text AS stepText, s.check_id AS checkId, s.position AS position,
              s.answer AS answer, s.answered_at AS answeredAt
         FROM routine_run_steps s JOIN routine_runs r ON r.id = s.run_id
        WHERE r.started_at >= ? AND r.started_at < ?`,
      from,
      until,
    ),
    db.getAllAsync<{ todoId: string; title: string; doneAt: string }>(
      `SELECT d.todo_id AS todoId, t.title AS title, d.done_at AS doneAt
         FROM todo_doings d JOIN todos t ON t.id = d.todo_id
        WHERE d.kind = 'done' AND d.done_at >= ? AND d.done_at < ?`,
      from,
      until,
    ),
  ]);
  return buildLookBackDay({
    day,
    routines,
    marks,
    runs: runs.map((run) => ({
      ...run,
      routineName: run.routineName ?? '',
      stepsDone: run.stepsDone ?? 0,
      stepsTotal: run.stepsTotal ?? 0,
    })),
    runSteps,
    tasks,
  });
}
