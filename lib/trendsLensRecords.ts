// Which Trends lenses have nothing recorded behind them yet, 1.0.87.7
// (ease-of-use pass, fix 4). Those lenses fold into one closed line at the
// foot of the Trends menu, "Nothing recorded yet (n)", so a new person sees
// the few lenses that can show them something rather than 31 tiles.
//
// Only lenses whose source is plain and certain are listed. A lens left out
// of SOURCES never folds: folding a lens that does hold records would hide
// them, which is the worse mistake, so anything read from many places
// (Pattern Finder, Compare Two, What It Costs, Your Life in Squares) or from
// a phone service (Movement) always shows.
//
// Reads one row per table at most and nothing about what the row says.
import { getDatabase } from './db';

type Source = { table: string; where?: string };

const MEALS: Source = { table: 'meals', where: "meal_type <> 'beverage'" };

export const TRENDS_LENS_SOURCES: Readonly<Record<string, readonly Source[]>> = {
  nutrients: [MEALS],
  sixDs: [MEALS],
  variety: [MEALS],
  eatingWindow: [MEALS],
  planned: [MEALS, { table: 'schedule_items', where: "item_type = 'meal'" }],
  hydration: [{ table: 'meals', where: "meal_type = 'beverage'" }],
  reactions: [{ table: 'wellbeing_checkins', where: "checkin_type IN ('post_meal', 'food_trial_daily')" }, { table: 'food_trials' }],
  ferments: [{ table: 'fermentation_batches' }],
  symptoms: [{ table: 'wellbeing_checkins' }],
  weight: [{ table: 'body_measurements', where: "measurement_type = 'weight'" }],
  bloodPressure: [{ table: 'body_measurements', where: "measurement_type LIKE 'blood_pressure%'" }],
  labs: [{ table: 'lab_results' }],
  cycle: [{ table: 'cycle_days' }],
  doses: [{ table: 'schedule_items', where: "item_type IN ('prescription', 'supplement', 'otc')" }],
  care: [{ table: 'schedule_items', where: "item_type = 'appointment'" }],
  therapyResponse: [{ table: 'therapy_sessions' }],
  workouts: [{ table: 'exercise_logs' }],
  groceries: [{ table: 'grocery_list_items' }],
  keepingUp: [
    { table: 'done_check_marks' },
    { table: 'routine_runs' },
    { table: 'upkeep_doings' },
    { table: 'todo_doings' },
    { table: 'capture_notes' },
  ],
  work: [{ table: 'work_checkins' }],
  harvest: [{ table: 'garden_harvests' }],
  conditions: [{ table: 'garden_readings' }],
  trackers: [{ table: 'custom_tracker_entries' }],
};

async function hasAny(source: Source): Promise<boolean> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ found: number }>(
      `SELECT EXISTS(SELECT 1 FROM ${source.table}${source.where ? ` WHERE ${source.where}` : ''}) AS found`,
    );
    return Boolean(row?.found);
  } catch {
    // A table missing on an older install, or a locked database: treat it
    // as holding something, so the lens stays in plain sight.
    return true;
  }
}

// The lens keys with nothing recorded behind any of their sources.
export async function listEmptyTrendsLenses(): Promise<Set<string>> {
  const empty = new Set<string>();
  const cache = new Map<string, Promise<boolean>>();
  await Promise.all(
    Object.entries(TRENDS_LENS_SOURCES).map(async ([lens, sources]) => {
      const found = await Promise.all(
        sources.map((source) => {
          const id = `${source.table}|${source.where ?? ''}`;
          if (!cache.has(id)) cache.set(id, hasAny(source));
          return cache.get(id)!;
        }),
      );
      if (!found.some(Boolean)) empty.add(lens);
    }),
  );
  return empty;
}
