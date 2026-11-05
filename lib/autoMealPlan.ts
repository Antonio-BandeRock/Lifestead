// Plan My Meals for Me (2026-11-04, direct instruction: "All automatic ways in
// the app to get them to a grocery list need to start with the setup
// information about how they need to eat, and any conditions they might
// have ... Let the user choose how much of their schedule they want to
// automatically fill at one time.").
//
// The same generator Schedules > Meal Plan runs, fed the same way: the
// conditions and eating style from Profile, a linked partner's conditions
// through resolvePlanningScope, everybody at the table through
// resolveHouseholdEaters, the meals left open and the standing usual meals,
// and the dishes that use what is in the kitchen. Nothing here is a second
// meal planner; it is Generate and Add to Schedule pressed in one go, with
// no calorie range, budget or sugar limit, since those are choices the Meal
// Plan form asks for and this way in does not.
//
// How many days to fill and how often the person shops are two different
// choices: filling 14 days and shopping every 3 is the ordinary case, and the
// grocery list is built for the shopping days only. Both are remembered in
// app_meta so the next list starts from them.
import {
  addDaysToLocalDate,
  getCuisinePreferences,
  getDatabase,
  getDietPreferences,
  getUserConditions,
  hasStandingHydrationRoutine,
  scheduleHydrationRemindersForDay,
  setUpMealPlan,
} from './db';
import { dailyMealPlanToMealPlanDay, generateMealPlanDays, getDailyMealPlanWaterGapMl } from './dailyMealPlan';
import { resolveHouseholdEaters } from './householdEaters';
import { withStandingMeals } from './mealPack';
import { planCuisines, planDietTags, splitDietPreferences } from './mealPlanDiet';
import { getOnHandDishes } from './onHandDb';
import { resolvePlanningScope } from './partnerPlanning';
import { getOpenMealRules, listUsualMeals } from './usualMealDb';

/** How many days of the schedule one press fills, up to the generator's six weeks. */
export const FILL_DAY_OPTIONS = [3, 7, 14, 21, 28, 42] as const;
export const DEFAULT_FILL_DAYS = 7;
export const DEFAULT_SHOP_DAYS = 3;

const FILL_DAYS_KEY = 'auto_plan_fill_days';
const SHOP_DAYS_KEY = 'grocery_shop_days';
const KITCHEN_FIRST_KEY = 'auto_plan_kitchen_first';

export type AutoPlanSettings = { fillDays: number; shopDays: number; kitchenFirst: boolean };

export type AutoPlanResult = {
  /** Meals put on the schedule. */
  scheduled: number;
  /** Meals left as they were because something was already planned. */
  skipped: number;
  /** Days the generator could not make a full breakfast, lunch and dinner for. */
  incompleteDays: number;
  hydrationReminders: number;
  startDate: string;
  days: number;
};

function localToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

async function readMeta(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', key);
  return row?.value ?? null;
}

async function writeMeta(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    value,
    new Date().toISOString(),
  );
}

function wholeNumberIn(value: string | null, allowed: readonly number[], fallback: number): number {
  const parsed = value == null ? NaN : Number(value);
  return allowed.includes(parsed) ? parsed : fallback;
}

export async function getAutoPlanSettings(shopDayOptions: readonly number[]): Promise<AutoPlanSettings> {
  const [fill, shop, kitchen] = await Promise.all([readMeta(FILL_DAYS_KEY), readMeta(SHOP_DAYS_KEY), readMeta(KITCHEN_FIRST_KEY)]);
  return {
    fillDays: wholeNumberIn(fill, FILL_DAY_OPTIONS, DEFAULT_FILL_DAYS),
    shopDays: wholeNumberIn(shop, shopDayOptions, DEFAULT_SHOP_DAYS),
    kitchenFirst: kitchen !== '0',
  };
}

export async function saveAutoPlanSettings(settings: AutoPlanSettings): Promise<void> {
  await writeMeta(FILL_DAYS_KEY, String(settings.fillDays));
  await writeMeta(SHOP_DAYS_KEY, String(settings.shopDays));
  await writeMeta(KITCHEN_FIRST_KEY, settings.kitchenFirst ? '1' : '0');
}

/** Plans the given number of days from today on Profile's answers and puts them on the schedule. */
export async function planAndScheduleMeals(input: { days: number; kitchenFirst: boolean }): Promise<AutoPlanResult> {
  const days = Math.max(1, Math.min(42, Math.round(input.days)));
  const startDate = localToday();
  const [codes, tags, cuisineNames, openRules, usual] = await Promise.all([
    getUserConditions(),
    getDietPreferences(),
    getCuisinePreferences(),
    getOpenMealRules(),
    listUsualMeals(),
  ]);
  const diet = splitDietPreferences(tags, cuisineNames);
  const dietPreferences = planDietTags(diet);
  const scope = await resolvePlanningScope({ myConditionCodes: codes, today: new Date().toISOString().slice(0, 10) });
  const household = await resolveHouseholdEaters(scope, dietPreferences);
  const onHandDishes = input.kitchenFirst ? await getOnHandDishes() : null;
  const plans = await generateMealPlanDays({
    conditionCodes: scope.conditionCodes,
    dietPreferences,
    cuisines: planCuisines(diet),
    carbLevel: 'any',
    days,
    startDate,
    household,
    openMeals: withStandingMeals(openRules, usual),
    onHand: onHandDishes && onHandDishes.size > 0 ? onHandDishes : undefined,
  });
  const mealPlanDays = plans
    .map((result, index) => dailyMealPlanToMealPlanDay(result, index + 1))
    .filter((day): day is NonNullable<typeof day> => day !== null);
  const { scheduled, skipped } = mealPlanDays.length > 0 ? await setUpMealPlan(startDate, mealPlanDays) : { scheduled: 0, skipped: 0 };
  // The same water reminders Add to Schedule leaves, and for the same reason
  // left out when a standing hydration routine already covers every day.
  let hydrationReminders = 0;
  if (mealPlanDays.length > 0 && !(await hasStandingHydrationRoutine())) {
    for (let index = 0; index < plans.length; index += 1) {
      hydrationReminders += await scheduleHydrationRemindersForDay(addDaysToLocalDate(startDate, index), getDailyMealPlanWaterGapMl(plans[index]));
    }
  }
  return { scheduled, skipped, incompleteDays: plans.length - mealPlanDays.length, hydrationReminders, startDate, days };
}
