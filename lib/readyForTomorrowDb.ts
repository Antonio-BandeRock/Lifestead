// Reading for Ready for Tomorrow (Q60), and the two small things it saves:
// that a start was made, and a start-ahead time of the person's. The rules
// and the words are in lib/readyForTomorrow.ts.
import { dayStartMs, localDayOf, type DayTimelineItem } from './dayTimeline';
import { loadDayTimeline } from './dayTimelineDb';
import { getDatabase, getDayMealAndDoseTimeline, getMealComponentDisplayInfo, getMealFavorite } from './db';
import { doseFoodNotes, doseReminderLine } from './doseMealTiming';
import { BATCH_DAYS, dishKey, MAX_PREP_HOURS, type OwnLead, type PrepDish, type PrepMeal, type TomorrowExtras } from './readyForTomorrow';
import { recipeIdsWithPrep, type PrepKind } from './recipePrep';

type MealRow = { id: string; title: string; at: string; favoriteId: string | null; recipeIds: string | null };
type NamedRecipes = { nameOf: Map<string, string>; idOf: Map<string, string> };

/** The recipes that need a start ahead, with their names, read once: they
 *  only change with the food database, which restarts the app. */
let namedRecipes: Promise<NamedRecipes> | null = null;

async function readNamedRecipes(): Promise<NamedRecipes> {
  const db = await getDatabase();
  const ids = recipeIdsWithPrep();
  const rows = await db.getAllAsync<{ id: string; name: string }>(
    `SELECT id, name FROM curated_recipes WHERE id IN (${ids.map(() => '?').join(',')})`,
    ...ids,
  );
  return {
    nameOf: new Map(rows.map((row) => [row.id, row.name])),
    idOf: new Map(rows.map((row) => [dishKey(row.name), row.id])),
  };
}

function recipesWithPrep(): Promise<NamedRecipes> {
  if (!namedRecipes) {
    namedRecipes = readNamedRecipes().catch((error) => {
      namedRecipes = null;
      throw error;
    });
  }
  return namedRecipes;
}

async function favoriteDishNames(favoriteId: string): Promise<string[]> {
  const favorite = await getMealFavorite(favoriteId);
  if (!favorite) return [];
  const names: string[] = [];
  for (const component of favorite.components) {
    const info = await getMealComponentDisplayInfo(component.componentType, component.componentId);
    if (info?.name) names.push(info.name);
  }
  return names;
}

function idsFrom(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    // A slot that cannot be read falls back to the meal's name.
    return [];
  }
}

/** Planned meals near enough to matter, with the dishes in each. */
export async function readPrepMeals(now: number): Promise<PrepMeal[]> {
  const db = await getDatabase();
  const recipes = await recipesWithPrep();
  const today = localDayOf(now);
  const rows = await db.getAllAsync<MealRow>(
    `SELECT s.id AS id, s.title AS title, s.scheduled_for AS at, s.source_favorite_id AS favoriteId, p.recipe_ids_json AS recipeIds
       FROM schedule_items s LEFT JOIN meal_plan_slots p ON p.schedule_item_id = s.id
      WHERE s.item_type = 'meal' AND s.status <> 'skipped' AND s.leftover_of IS NULL
        AND s.scheduled_for >= ? AND s.scheduled_for < ?
      ORDER BY s.scheduled_for`,
    localDayOf(dayStartMs(today, -BATCH_DAYS)),
    localDayOf(dayStartMs(today, MAX_PREP_HOURS / 24 + 2)),
  );
  const favorites = new Map<string, Promise<string[]>>();
  const meals = new Map<string, PrepMeal>();
  for (const row of rows) {
    const at = Date.parse(row.at);
    if (!Number.isFinite(at)) continue;
    const dishes: PrepDish[] = [];
    for (const id of idsFrom(row.recipeIds)) {
      const name = recipes.nameOf.get(id);
      if (name) dishes.push({ name, recipeId: id });
    }
    const names = [row.title];
    if (row.favoriteId) {
      let read = favorites.get(row.favoriteId);
      if (!read) {
        read = favoriteDishNames(row.favoriteId);
        favorites.set(row.favoriteId, read);
      }
      names.push(...(await read));
    }
    for (const name of names) dishes.push({ name, recipeId: recipes.idOf.get(dishKey(name)) ?? null });
    const before = meals.get(row.id);
    if (before) before.dishes.push(...dishes);
    else meals.set(row.id, { scheduleItemId: row.id, at, title: row.title, dishes });
  }
  return [...meals.values()];
}

// ------------------------------------------- start-ahead times of the person's

export async function listOwnLeads(): Promise<OwnLead[]> {
  const db = await getDatabase();
  return db.getAllAsync<OwnLead>('SELECT dish_key AS key, name, kind, hours FROM prep_leads ORDER BY dish_key');
}

export async function saveOwnLead(name: string, kind: PrepKind, hours: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO prep_leads (dish_key, name, kind, hours, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(dish_key) DO UPDATE SET name = excluded.name, kind = excluded.kind, hours = excluded.hours, updated_at = excluded.updated_at`,
    dishKey(name),
    name.trim(),
    kind,
    hours,
    new Date().toISOString(),
  );
}

export async function removeOwnLead(key: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM prep_leads WHERE dish_key = ?', key);
}

/** The dishes a start-ahead time can be given to: every favorite and every
 *  planned meal, each name once. */
export async function listDishNames(now: number): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM favorites WHERE name IS NOT NULL AND auto_generated = 0
     UNION SELECT title FROM schedule_items WHERE item_type = 'meal' AND scheduled_for >= ?`,
    localDayOf(now),
  );
  const byKey = new Map<string, string>();
  for (const { name } of rows) {
    const key = dishKey(name);
    if (key && !byKey.has(key)) byKey.set(key, name.trim());
  }
  return [...byKey.values()];
}

// ------------------------------------------------------- starts marked done

export async function readPrepMarks(): Promise<Map<string, string>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; markedAt: string }>('SELECT id, marked_at AS markedAt FROM prep_marks');
  return new Map(rows.map((row) => [row.id, row.markedAt]));
}

export async function markPrep(key: string, done: boolean): Promise<void> {
  const db = await getDatabase();
  if (!done) {
    await db.runAsync('DELETE FROM prep_marks WHERE id = ?', key);
    return;
  }
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO prep_marks (id, marked_at, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET marked_at = excluded.marked_at, updated_at = excluded.updated_at`,
    key,
    now,
    now,
  );
}

// --------------------------------------------------------------- everything

async function readTomorrowExtras(day: string): Promise<TomorrowExtras> {
  const doseLines = new Map<string, string>();
  const appointmentNotes = new Map<string, string>();
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; notes: string }>(
    "SELECT id, notes FROM schedule_items WHERE item_type = 'appointment' AND notes IS NOT NULL AND substr(scheduled_for, 1, 10) = ?",
    day,
  );
  for (const row of rows) appointmentNotes.set(row.id, row.notes);
  const data = await getDayMealAndDoseTimeline(day);
  if (data.meals.length > 0) {
    for (const dose of data.doses) {
      const line = doseReminderLine(doseFoodNotes(dose, data.meals, data.rules, data.nutrientNames));
      if (line) doseLines.set(dose.id, line);
    }
  }
  return { doseLines, appointmentNotes };
}

export type ReadyData = {
  items: DayTimelineItem[];
  meals: PrepMeal[];
  own: OwnLead[];
  marks: Map<string, string>;
  extras: TomorrowExtras;
};

export async function readReady(now: number): Promise<ReadyData> {
  const tomorrow = localDayOf(dayStartMs(localDayOf(now), 1));
  const [view, meals, own, marks, extras] = await Promise.all([
    loadDayTimeline(now),
    readPrepMeals(now),
    listOwnLeads(),
    readPrepMarks(),
    readTomorrowExtras(tomorrow),
  ]);
  return { items: view.items, meals, own, marks, extras };
}
