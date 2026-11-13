// The reads and writes behind lib/kitchenLow.ts: what in the kitchen is
// running low, the "tell me when it gets down to" amount, and putting a food
// on the grocery list from the Kitchen, the list or a notification.
import { getDatabase } from './db';
import { addGroceryListItem, createHandGroceryList, getActiveGroceryList, getGroceryListItems } from './groceryDb';
import type { KitchenItemKind } from './kitchenDb';
import { foodKey, readLow, RATE_WINDOW_DAYS, sameUnit, type KitchenUse, type LowMark, type LowReading } from './kitchenLow';

export type KitchenFoodReading = {
  key: string;
  foodName: string;
  category: string;
  foodId: string | null;
  kind: KitchenItemKind;
  unit: string;
  remaining: number;
  reading: LowReading;
  markId: string | null;
  mark: LowMark | null;
};

type ItemRow = {
  id: string;
  category: string;
  foodName: string;
  foodId: string | null;
  kind: string;
  unit: string;
  left: number;
  addedAt: string;
};

type MarkRow = { id: string; foodKey: string; foodName: string; category: string; belowAmount: number | null; unit: string };

/**
 * Every food in kitchen_items that still has some left, or that ran out
 * within the estimate's window, read for whether it is low. Garden pickings
 * and ferments are left out: they have a harvest of their own and are not
 * bought again from a shop.
 */
export async function readKitchenFoods(now: Date = new Date()): Promise<KitchenFoodReading[]> {
  const db = await getDatabase();
  const since = new Date(now.getTime() - RATE_WINDOW_DAYS * 86_400_000).toISOString();
  const [rows, uses, marks] = await Promise.all([
    db.getAllAsync<ItemRow>(
      `SELECT id, category, food_name AS foodName, food_id AS foodId, kind, unit,
              quantity_remaining AS left, added_at AS addedAt
       FROM kitchen_items ORDER BY added_at DESC`,
    ),
    db.getAllAsync<KitchenUse & { foodKey: string }>(
      'SELECT food_key AS foodKey, amount, unit, used_at AS usedAt FROM kitchen_usage_log WHERE used_at >= ?',
      since,
    ),
    db.getAllAsync<MarkRow>(
      'SELECT id, food_key AS foodKey, food_name AS foodName, category, below_amount AS belowAmount, unit FROM kitchen_low_marks',
    ),
  ]);

  const usesByKey = new Map<string, KitchenUse[]>();
  for (const use of uses) {
    const list = usesByKey.get(use.foodKey) ?? [];
    list.push(use);
    usesByKey.set(use.foodKey, list);
  }
  const markByKey = new Map(marks.map((mark) => [mark.foodKey, mark]));

  // Newest row first, so the first row met for a food names its unit.
  const byKey = new Map<string, ItemRow[]>();
  for (const row of rows) {
    const key = foodKey(row.category, row.foodName);
    const list = byKey.get(key) ?? [];
    list.push(row);
    byKey.set(key, list);
  }

  const out: KitchenFoodReading[] = [];
  for (const [key, items] of byKey) {
    const withSome = items.filter((item) => item.left > 0);
    const foodUses = usesByKey.get(key) ?? [];
    // A food used up long ago and never bought again is not news.
    if (withSome.length === 0 && foodUses.length === 0) continue;
    const newest = withSome[0] ?? items[0];
    const unit = newest.unit;
    const remaining = withSome.filter((item) => sameUnit(item.unit, unit)).reduce((sum, item) => sum + item.left, 0);
    const markRow = markByKey.get(key) ?? null;
    const mark: LowMark | null = markRow ? { belowAmount: markRow.belowAmount, unit: markRow.unit } : null;
    out.push({
      key,
      foodName: newest.foodName,
      category: newest.category,
      foodId: newest.foodId,
      kind: newest.kind === 'non_food' ? 'non_food' : 'food',
      unit,
      remaining,
      reading: readLow({ remaining, unit, mark, uses: foodUses, now }),
      markId: markRow?.id ?? null,
      mark,
    });
  }
  return out;
}

/** The foods reading as low, used up first, then by fewest days left. */
export async function listLowKitchenFoods(now: Date = new Date()): Promise<KitchenFoodReading[]> {
  const foods = (await readKitchenFoods(now)).filter((food) => food.reading.low);
  return foods.sort((a, b) => {
    if (a.reading.usedUp !== b.reading.usedUp) return a.reading.usedUp ? -1 : 1;
    return (a.reading.daysLeft ?? Infinity) - (b.reading.daysLeft ?? Infinity);
  });
}

/** Sets or clears the "tell me when it gets down to" amount for a food. */
export async function setKitchenLowMark(input: {
  category: string;
  foodName: string;
  belowAmount: number | null;
  unit: string;
}): Promise<void> {
  const db = await getDatabase();
  const key = foodKey(input.category, input.foodName);
  const amount = input.belowAmount != null && input.belowAmount > 0 ? input.belowAmount : null;
  await db.runAsync(
    `INSERT INTO kitchen_low_marks (id, food_key, food_name, category, below_amount, unit, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(food_key) DO UPDATE SET below_amount = excluded.below_amount, unit = excluded.unit, updated_at = excluded.updated_at`,
    `low_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    key,
    input.foodName,
    input.category,
    amount,
    input.unit,
    new Date().toISOString(),
  );
}

/**
 * The id a notification carries for this food. A food with no mark yet gets
 * a row with no amount, so a press kept while the phone was locked names an
 * id and never the food.
 */
export async function lowMarkIdFor(food: { key: string; foodName: string; category: string; unit: string; markId: string | null }): Promise<string> {
  if (food.markId) return food.markId;
  const db = await getDatabase();
  const id = `low_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.runAsync(
    `INSERT OR IGNORE INTO kitchen_low_marks (id, food_key, food_name, category, below_amount, unit, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?)`,
    id,
    food.key,
    food.foodName,
    food.category,
    food.unit,
    new Date().toISOString(),
  );
  const row = await db.getFirstAsync<{ id: string }>('SELECT id FROM kitchen_low_marks WHERE food_key = ?', food.key);
  return row?.id ?? id;
}

/** The food keys already on the list being shopped and not yet ticked. */
export async function keysOnActiveList(): Promise<Set<string>> {
  const active = await getActiveGroceryList();
  if (!active) return new Set();
  const items = await getGroceryListItems(active.id);
  return new Set(items.filter((item) => !item.checked).map((item) => foodKey(item.category, item.foodName)));
}

/** Puts a food on the list being shopped, starting one when there is none.
 *  False when it was already there. */
export async function addKitchenFoodToList(food: {
  key: string;
  foodName: string;
  category: string;
  foodId: string | null;
  kind: KitchenItemKind;
}): Promise<boolean> {
  if ((await keysOnActiveList()).has(food.key)) return false;
  const active = await getActiveGroceryList();
  const listId = active ? active.id : await createHandGroceryList();
  await addGroceryListItem(listId, { foodName: food.foodName, category: food.category, foodId: food.foodId, kind: food.kind });
  return true;
}

/** The same, from the id a notification carried. */
export async function addKitchenFoodToListByMarkId(markId: string): Promise<boolean> {
  const db = await getDatabase();
  const mark = await db.getFirstAsync<MarkRow>(
    'SELECT id, food_key AS foodKey, food_name AS foodName, category, below_amount AS belowAmount, unit FROM kitchen_low_marks WHERE id = ?',
    markId,
  );
  if (!mark) return false;
  const row = await db.getFirstAsync<{ foodId: string | null; kind: string }>(
    'SELECT food_id AS foodId, kind FROM kitchen_items WHERE lower(trim(category)) || ? || lower(trim(food_name)) = ? ORDER BY added_at DESC LIMIT 1',
    '|',
    mark.foodKey,
  );
  return addKitchenFoodToList({
    key: mark.foodKey,
    foodName: mark.foodName,
    category: mark.category,
    foodId: row?.foodId ?? null,
    kind: row?.kind === 'non_food' ? 'non_food' : 'food',
  });
}
