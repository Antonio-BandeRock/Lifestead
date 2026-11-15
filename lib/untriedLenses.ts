// Not Tried Yet (2026-11-15): in each tab's group on Home, the lenses on
// that tab that have not been used yet for what they do.
//
// Direct instructions, the same day, in place of the One Next Thing card:
// "It should be related to the user having not actually used a lense yet
// for its function", not to whether it has been opened ("They could just be
// persusing around and looking and then open everything"), and "Instead of
// Still to Set Up, it should elude to the functions they have not yet used
// for the function they provide", since none of it is needed for the app to
// run.
//
// So a lens counts as used once a record made with it exists, and nothing
// here notes a lens being opened. A lens that keeps no record of its own (a
// reading lens, a lookup, Trends, Reports, a tool that only reads what other
// lenses wrote) has no entry and is never listed. A row leaves the list by
// itself once something is recorded there, and the card goes when the list
// is empty. No count, no percentage, nothing that grades.
//
// Pure, no runtime import, so scripts/test_untried_lenses.js checks it in
// plain node, tables and columns included.

export type UsedCheck = {
  table: string;
  /** Narrows the table to the rows this lens writes. */
  where?: string;
};

export type UntriedLensDef = {
  lens: string;
  /** Any one of these having a row means the lens has been used. */
  used: UsedCheck[];
};

export type UntriedTabPath = '/life' | '/food' | '/garden' | '/interests' | '/schedule' | '/log' | '/insights';

export const UNTRIED_TAB_PATHS: readonly UntriedTabPath[] = ['/life', '/food', '/garden', '/interests', '/schedule', '/log', '/insights'];

// The route parameter each tab reads to open a lens (the same ones
// lib/lifeSquares.ts uses).
export const UNTRIED_LENS_PARAM: Record<UntriedTabPath, string> = {
  '/life': 'openLifeLens',
  '/food': 'openFoodLens',
  '/garden': 'openGardenLens',
  '/interests': 'openInterestsLens',
  '/schedule': 'openScheduleLens',
  '/log': 'openSignalsLens',
  '/insights': 'openInsightsLens',
};

// In each tab's tour order (TOUR_TABS in lib/yourStoryInterview.ts).
export const UNTRIED_LENSES: Record<UntriedTabPath, readonly UntriedLensDef[]> = {
  '/life': [
    { lens: 'myMeds', used: [{ table: 'treatments' }] },
    { lens: 'emergency', used: [{ table: 'emergency_profile' }, { table: 'emergency_contacts' }] },
    { lens: 'conditions', used: [{ table: 'family_member_conditions' }, { table: 'curious_about_conditions' }] },
    { lens: 'finances', used: [{ table: 'finance_entries' }, { table: 'finance_recurring' }, { table: 'finance_accounts' }] },
    { lens: 'work', used: [{ table: 'work_checkins' }] },
    { lens: 'upkeep', used: [{ table: 'upkeep_items' }] },
    { lens: 'kitchen', used: [{ table: 'kitchen_items' }] },
    { lens: 'groceryList', used: [{ table: 'grocery_list_items' }] },
    { lens: 'routines', used: [{ table: 'routines' }] },
    { lens: 'didIDoIt', used: [{ table: 'done_checks' }] },
    { lens: 'lookBack', used: [{ table: 'done_check_marks' }, { table: 'routine_runs' }, { table: 'todo_doings' }] },
    { lens: 'daysUntil', used: [{ table: 'countdowns' }] },
    { lens: 'todos', used: [{ table: 'todos' }] },
    { lens: 'projects', used: [{ table: 'projects' }] },
    { lens: 'movement', used: [{ table: 'body_measurements', where: "measurement_type NOT LIKE 'blood_pressure%'" }] },
    { lens: 'workouts', used: [{ table: 'workouts' }, { table: 'workout_sessions' }] },
  ],
  '/food': [
    { lens: 'findMeal', used: [{ table: 'meals' }] },
    { lens: 'scanProduct', used: [{ table: 'scanned_products' }] },
    { lens: 'mealBuilder', used: [{ table: 'favorites', where: "item_type = 'meal' AND auto_generated = 0" }] },
    { lens: 'sideBuilder', used: [{ table: 'sides' }] },
    { lens: 'saladBuilder', used: [{ table: 'salads' }] },
    { lens: 'smoothieBuilder', used: [{ table: 'smoothies' }] },
    { lens: 'soupBuilder', used: [{ table: 'soups' }] },
    { lens: 'snackBuilder', used: [{ table: 'snacks' }] },
    { lens: 'beverageBuilder', used: [{ table: 'beverages' }] },
    { lens: 'bakedGoodsBuilder', used: [{ table: 'baked_goods' }] },
    { lens: 'saucesBuilder', used: [{ table: 'sauces' }] },
    { lens: 'handheldsBuilder', used: [{ table: 'handhelds' }] },
    { lens: 'dessertBuilder', used: [{ table: 'desserts' }] },
    { lens: 'fermentationBuilder', used: [{ table: 'fermentations' }, { table: 'fermentation_batches' }] },
    { lens: 'importRecipe', used: [{ table: 'recipe_imports' }] },
  ],
  '/garden': [
    { lens: 'seeds', used: [{ table: 'garden_seeds' }, { table: 'garden_seed_tests' }] },
    { lens: 'plotsAndPlantings', used: [{ table: 'garden_plots' }, { table: 'garden_plantings' }] },
    { lens: 'daysUntil', used: [{ table: 'garden_countdowns' }] },
    { lens: 'compost', used: [{ table: 'compost_piles' }, { table: 'compost_events' }] },
    { lens: 'growingConditions', used: [{ table: 'garden_readings' }] },
    { lens: 'harvestLog', used: [{ table: 'garden_harvests' }] },
    { lens: 'growingCosts', used: [{ table: 'garden_cost_details' }] },
  ],
  '/interests': [
    { lens: 'myInterests', used: [{ table: 'interests' }] },
    { lens: 'sessions', used: [{ table: 'interest_sessions' }] },
    { lens: 'supplies', used: [{ table: 'interest_things', where: "kind = 'supply'" }] },
    { lens: 'collections', used: [{ table: 'interest_things', where: "kind = 'collection'" }] },
    { lens: 'wishList', used: [{ table: 'interest_things', where: "kind = 'wish'" }] },
    { lens: 'library', used: [{ table: 'interest_library' }] },
    { lens: 'people', used: [{ table: 'interest_people' }] },
    { lens: 'learn', used: [{ table: 'learn_reviews', where: "kind <> 'course'" }, { table: 'learn_my_decks' }] },
    { lens: 'languages', used: [{ table: 'learn_reviews', where: "kind = 'course'" }] },
    { lens: 'money', used: [{ table: 'interest_money' }] },
    { lens: 'makingItPay', used: [{ table: 'interest_pay_worksheets' }] },
  ],
  '/schedule': [
    { lens: 'meals', used: [{ table: 'meals', where: "meal_type <> 'beverage'" }] },
    { lens: 'dailyMealPlan', used: [{ table: 'meal_plan_slots' }] },
    { lens: 'meds', used: [{ table: 'schedule_items', where: "item_type IN ('prescription', 'supplement')" }] },
    { lens: 'hydration', used: [{ table: 'meals', where: "meal_type = 'beverage'" }] },
    { lens: 'appointments', used: [{ table: 'schedule_items', where: "item_type = 'appointment'" }] },
    { lens: 'exercise', used: [{ table: 'exercise_plans' }] },
  ],
  '/log': [
    { lens: 'flares', used: [{ table: 'wellbeing_checkins', where: "checkin_type = 'flare'" }] },
    { lens: 'foodReactions', used: [{ table: 'wellbeing_checkins', where: "checkin_type = 'post_meal'" }] },
    { lens: 'newFoods', used: [{ table: 'food_trials' }] },
    { lens: 'exercise', used: [{ table: 'exercise_logs' }] },
    { lens: 'bloodPressure', used: [{ table: 'body_measurements', where: "measurement_type LIKE 'blood_pressure%'" }] },
    { lens: 'weight', used: [{ table: 'body_measurements', where: "measurement_type = 'weight'" }] },
    { lens: 'nocturia', used: [{ table: 'nocturia_nights' }] },
    { lens: 'bowel', used: [{ table: 'bowel_movements' }] },
    { lens: 'microbiome', used: [{ table: 'microbiome_tests' }] },
    { lens: 'cycle', used: [{ table: 'cycle_days' }] },
    { lens: 'therapies', used: [{ table: 'therapy_sessions' }] },
    { lens: 'generalNote', used: [{ table: 'wellbeing_checkins', where: "checkin_type IN ('general', 'stress', 'sleep', 'post_exercise')" }] },
    { lens: 'trackers', used: [{ table: 'custom_trackers' }] },
  ],
  '/insights': [
    { lens: 'safeFoods', used: [{ table: 'my_safe_foods' }] },
    { lens: 'healingStage', used: [{ table: 'user_condition_stages' }] },
    { lens: 'labs', used: [{ table: 'lab_results' }] },
  ],
};

/** The query that answers whether one check has a row. */
export function usedQuery(check: UsedCheck): string {
  return `SELECT 1 AS found FROM ${check.table}${check.where ? ` WHERE ${check.where}` : ''} LIMIT 1`;
}

export function untriedRoute(path: UntriedTabPath, lens: string): { pathname: UntriedTabPath; params: Record<string, string> } {
  return { pathname: path, params: { [UNTRIED_LENS_PARAM[path]]: lens } };
}

// THE WORDS. Not Tried Yet was Claude's choice of name; Tony can rename it.
export const UNTRIED_BAND_TITLE = 'Not Tried Yet';
export const UNTRIED_LINE =
  'What this tab can do that you have not used yet. Tap one to go there. Each leaves this list once you record something with it.';
