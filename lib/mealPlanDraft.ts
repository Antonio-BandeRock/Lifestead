// The meal plan on Schedules > Meal Plan, kept until a new one replaces it
// (2026-11-12, direct report: an update wiped a six-week plan that was only
// held in the screen's memory, and "When it goes live for everyone else to
// test, it cannot cause a problem like that").
//
// One row in app_meta. It travels with sync and backups like any other
// record, since a plan made on one device is the same person's plan on the
// other. Putting the plan on the calendar copies its meals into the schedule
// and leaves this row alone: the plan stays on screen afterwards, as it
// always has, until Generate makes a new one.

import { getDatabase } from './db';
import type { DailyMealPlanResult } from './dailyMealPlan';
import type { PlanEater } from './householdPlan';
import type { PlanDiet } from './mealPlanDiet';
import type { OpenMealRule } from './openMeals';
import type { PlanningScope } from './partnerPlanning';

export const MEAL_PLAN_DRAFT_META_KEY = 'meal_plan_draft';

export type MealPlanDraft = {
  v: 1;
  savedAt: string;
  generatedStart: string | null;
  scheduleDate: string;
  plannedOpenRules: OpenMealRule[];
  planningScope: PlanningScope | null;
  planHousehold: PlanEater[] | null;
  plannedDiet: PlanDiet | null;
  plans: DailyMealPlanResult[];
};

/** Reads a stored draft, or null when there is none or it cannot be read. Pure, for the tests. */
export function parseMealPlanDraft(value: string | null | undefined): MealPlanDraft | null {
  if (!value) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const draft = parsed as Partial<MealPlanDraft>;
  if (draft.v !== 1 || !Array.isArray(draft.plans) || draft.plans.length === 0) return null;
  if (typeof draft.scheduleDate !== 'string') return null;
  return {
    v: 1,
    savedAt: typeof draft.savedAt === 'string' ? draft.savedAt : '',
    generatedStart: typeof draft.generatedStart === 'string' ? draft.generatedStart : null,
    scheduleDate: draft.scheduleDate,
    plannedOpenRules: Array.isArray(draft.plannedOpenRules) ? draft.plannedOpenRules : [],
    planningScope: draft.planningScope && typeof draft.planningScope === 'object' ? draft.planningScope : null,
    planHousehold: Array.isArray(draft.planHousehold) ? draft.planHousehold : null,
    plannedDiet: draft.plannedDiet && typeof draft.plannedDiet === 'object' ? draft.plannedDiet : null,
    plans: draft.plans,
  };
}

export async function loadMealPlanDraft(): Promise<MealPlanDraft | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', MEAL_PLAN_DRAFT_META_KEY);
  return parseMealPlanDraft(row?.value);
}

export async function saveMealPlanDraft(draft: Omit<MealPlanDraft, 'v' | 'savedAt'>): Promise<void> {
  if (draft.plans.length === 0) return;
  const db = await getDatabase();
  const savedAt = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    MEAL_PLAN_DRAFT_META_KEY,
    JSON.stringify({ v: 1, savedAt, ...draft }),
    savedAt,
  );
}
