// The foods a menu's recipes use (Just Make a List, 2026-11-04, direct
// instruction: "'Just make a list' needs to ask them what kind of menu should
// it follow."). A list made by hand keeps the menu it was asked for, and the
// list offers the foods the recipes on that menu call for, most used first,
// so somebody writing a list from memory has the menu's staples in front of
// them without planning a single meal.
//
// The recipes are the ones the meal generator would draw on for the same
// conditions and menu (recipesForMenu in lib/dailyMealPlan.ts), so a food
// offered here is never one the plan would leave out. Water, salt to taste
// and anything else not bought (isNonPurchasableIngredient) is never offered.
import { getReferenceDatabase, getUserConditions } from './db';
import { recipesForMenu } from './dailyMealPlan';
import { isNonPurchasableIngredient } from './groceryList';
import { planCuisines, planDietTags, type PlanDiet } from './mealPlanDiet';

export type MenuFood = {
  category: string;
  baseName: string;
  /** How many of the menu's recipes use it. */
  recipeCount: number;
};

/** The most foods offered at once, so the band stays a row of chips and not a catalogue. */
export const MENU_FOOD_LIMIT = 24;

/** The foods the menu's recipes use, most used first, for the person's conditions. */
export async function getMenuFoods(menu: PlanDiet, limit = MENU_FOOD_LIMIT): Promise<{ foods: MenuFood[]; recipeCount: number }> {
  const conditionCodes = await getUserConditions();
  const recipes = recipesForMenu(conditionCodes, planDietTags(menu), planCuisines(menu));
  const ids = Array.from(new Set(recipes.map((entry) => entry.linkedCuratedRecipeId)));
  if (ids.length === 0) return { foods: [], recipeCount: 0 };
  const db = await getReferenceDatabase();
  const counts = new Map<string, MenuFood & { recipes: Set<string> }>();
  // SQLite allows a few hundred bound values; the corpus is a few hundred
  // recipes, so they go in slices.
  for (let start = 0; start < ids.length; start += 200) {
    const slice = ids.slice(start, start + 200);
    const rows = await db.getAllAsync<{ recipe_id: string; category: string; base_name: string }>(
      `SELECT recipe_id, category, base_name FROM curated_recipe_ingredients WHERE recipe_id IN (${slice.map(() => '?').join(', ')})`,
      ...slice,
    );
    for (const row of rows) {
      if (isNonPurchasableIngredient(row.base_name)) continue;
      const key = `${row.category}|${row.base_name}`;
      const held = counts.get(key) ?? { category: row.category, baseName: row.base_name, recipeCount: 0, recipes: new Set<string>() };
      held.recipes.add(row.recipe_id);
      held.recipeCount = held.recipes.size;
      counts.set(key, held);
    }
  }
  const foods = Array.from(counts.values())
    .sort((a, b) => b.recipeCount - a.recipeCount || a.baseName.localeCompare(b.baseName))
    .slice(0, limit)
    .map(({ category, baseName, recipeCount }) => ({ category, baseName, recipeCount }));
  return { foods, recipeCount: ids.length };
}
