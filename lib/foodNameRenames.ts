// Carrying a person's records over to the food names of a new reference
// database (2026-11-17, the swap to the unified database).
//
// Most records point at a food by its id, and the ids survive the swap. A
// few point at a food only by its name and category: a kitchen item, a
// grocery line, a low-stock mark and its usage log, a safe food, a food
// trial. When the unified database renamed "Strawberry" to "Strawberries"
// or folded "Salmon Fillet (Raw)" into "Chum salmon", those records would
// stop matching anything. This moves each one to the name the food now
// shows under, the same way for every table:
//
//   - only a name that maps to ONE food is moved; where an old name was
//     split across several new foods, the one that took most of its rows
//     wins, and a tie goes to the shorter name ("Raspberries" over
//     "Frozen raspberries");
//   - a table without a category column moves a name only when every
//     category that held it agrees on where it went;
//   - a name that is still a shown food is never moved, so a record moves
//     at most once;
//   - a key column that is unique (a safe food, a low-stock mark) is moved
//     with UPDATE OR IGNORE, so when the person already has the new name
//     too, the old row stays as it was. Nothing is deleted.
//
// It runs once per REFERENCE_DB_VERSION (FOOD_NAMES_MOVED_KEY in app_meta,
// a device-local key), after the new file is imported. A run refused
// because another device holds the session is simply tried again on the
// next launch.

export interface ReferenceNameRow {
  category: string;
  base_name: string;
  hidden: number;
  listing_name: string | null;
  original_category: string | null;
  original_base_name: string | null;
}

export interface FoodNameTarget {
  category: string;
  name: string;
}

export interface FoodRenames {
  /** Keyed by renameKey(oldCategory, oldName). */
  byCategory: Map<string, FoodNameTarget>;
  /** Keyed by the old name alone, only where every category agrees. */
  byName: Map<string, FoodNameTarget>;
}

export const FOOD_NAMES_MOVED_KEY = 'food_names_moved_for';

export function renameKey(category: string, name: string): string {
  return `${category}\u0000${name}`;
}

/** Works out where each old (category, name) went. Pure. */
export function buildFoodRenames(rows: readonly ReferenceNameRow[]): FoodRenames {
  const shownCategories = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.hidden) continue;
    let set = shownCategories.get(row.base_name);
    if (!set) {
      set = new Set();
      shownCategories.set(row.base_name, set);
    }
    set.add(row.category);
  }

  const targetOf = (row: ReferenceNameRow): FoodNameTarget | null => {
    if (!row.hidden) return { category: row.category, name: row.base_name };
    if (!row.listing_name) return null;
    const cats = shownCategories.get(row.listing_name);
    if (!cats) return null;
    if (cats.has(row.category)) return { category: row.category, name: row.listing_name };
    if (cats.size === 1) return { category: [...cats][0], name: row.listing_name };
    return null;
  };

  // old key -> target key -> rows
  const votes = new Map<string, Map<string, { target: FoodNameTarget; count: number }>>();
  const oldNameCategories = new Map<string, Set<string>>();
  for (const row of rows) {
    const oldCategory = row.original_category ?? row.category;
    const oldName = row.original_base_name ?? row.base_name;
    let cats = oldNameCategories.get(oldName);
    if (!cats) {
      cats = new Set();
      oldNameCategories.set(oldName, cats);
    }
    cats.add(oldCategory);
    const target = targetOf(row);
    if (!target) continue;
    const key = renameKey(oldCategory, oldName);
    let byTarget = votes.get(key);
    if (!byTarget) {
      byTarget = new Map();
      votes.set(key, byTarget);
    }
    const tKey = renameKey(target.category, target.name);
    const vote = byTarget.get(tKey);
    if (vote) vote.count += 1;
    else byTarget.set(tKey, { target, count: 1 });
  }

  const byCategory = new Map<string, FoodNameTarget>();
  for (const [key, byTarget] of votes) {
    const best = [...byTarget.values()].sort(
      (a, b) => b.count - a.count || a.target.name.length - b.target.name.length || a.target.name.localeCompare(b.target.name),
    )[0];
    if (renameKey(best.target.category, best.target.name) === key) continue;
    // A name that is still a shown food stays put, even when the food that
    // used to carry it was renamed ("Sea cucumber" became "Japanese sea
    // cucumber" while "Sea Cucumber (Raw)" became "Sea cucumber"). Moving
    // it would send a record on twice, once now and again next version.
    const [oldCategory, oldName] = key.split('\u0000');
    if (shownCategories.get(oldName)?.has(oldCategory)) continue;
    byCategory.set(key, best.target);
  }

  const byName = new Map<string, FoodNameTarget>();
  for (const [oldName, cats] of oldNameCategories) {
    if (shownCategories.has(oldName)) continue;
    let agreed: FoodNameTarget | null = null;
    let ok = true;
    for (const cat of cats) {
      const target = byCategory.get(renameKey(cat, oldName));
      if (!target || (agreed && agreed.name !== target.name)) {
        ok = false;
        break;
      }
      agreed = target;
    }
    if (ok && agreed && agreed.name !== oldName) byName.set(oldName, agreed);
  }

  return { byCategory, byName };
}

/** The new (category, name) for a stored pair, or null to leave it. */
export function movedName(
  renames: FoodRenames,
  category: string | null | undefined,
  name: string,
): FoodNameTarget | null {
  if (category) return renames.byCategory.get(renameKey(category, name)) ?? null;
  return renames.byName.get(name) ?? null;
}

interface MinimalDb {
  getAllAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]>;
  runAsync(sql: string, ...params: (string | number | null)[]): Promise<unknown>;
}

/** Rows a run touched, from expo-sqlite's { changes } (1 when it does not say). */
function touched(result: unknown): number {
  const changes = (result as { changes?: unknown } | null)?.changes;
  return typeof changes === 'number' ? changes : 1;
}

/** Tables holding a food by its name, with or without a category beside it. */
const NAMED_FOOD_TABLES = [
  'meal_items',
  'side_ingredients',
  'salad_ingredients',
  'smoothie_ingredients',
  'fermentation_ingredients',
  'beverage_ingredients',
  'snack_ingredients',
  'baked_goods_ingredients',
  'soup_ingredients',
  'sauce_ingredients',
  'handheld_ingredients',
  'dessert_ingredients',
  'kitchen_items',
  'grocery_list_items',
  'food_trials',
  'trial_series_items',
] as const;

function lowerKey(category: string, name: string): string {
  return `${category.trim().toLowerCase()}|${name.trim().toLowerCase()}`;
}

/** Moves every name-keyed record. Returns how many rows changed. */
export async function moveFoodNames(db: MinimalDb, renames: FoodRenames): Promise<number> {
  let changed = 0;

  for (const table of NAMED_FOOD_TABLES) {
    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    if (!columns.some((c) => c.name === 'food_name')) continue;
    const hasCategory = columns.some((c) => c.name === 'category');
    const rows = await db.getAllAsync<{ rid: number; food_name: string; category: string | null }>(
      `SELECT rowid AS rid, food_name, ${hasCategory ? 'category' : 'NULL AS category'} FROM ${table}`,
    );
    for (const row of rows) {
      if (!row.food_name) continue;
      const target = movedName(renames, hasCategory ? row.category : null, row.food_name);
      if (!target) continue;
      const result = hasCategory
        ? await db.runAsync(`UPDATE ${table} SET food_name = ?, category = ? WHERE rowid = ?`, target.name, target.category, row.rid)
        : await db.runAsync(`UPDATE ${table} SET food_name = ? WHERE rowid = ?`, target.name, row.rid);
      changed += touched(result);
    }
  }

  // A safe food: food_key is the lowercased name and the primary key.
  const safe = await db.getAllAsync<{ food_key: string; food_name: string; category: string | null }>(
    'SELECT food_key, food_name, category FROM my_safe_foods',
  );
  for (const row of safe) {
    const target = movedName(renames, row.category, row.food_name);
    if (!target) continue;
    changed += touched(await db.runAsync(
      'UPDATE OR IGNORE my_safe_foods SET food_key = ?, food_name = ?, category = ? WHERE food_key = ?',
      target.name.trim().toLowerCase(),
      target.name,
      row.category ? target.category : null,
      row.food_key,
    ));
  }

  // A low-stock mark and the usage log behind it share one key,
  // "category|name" lowercased (foodKey in lib/kitchenLow.ts).
  const keyMoves = new Map<string, string>();
  const marks = await db.getAllAsync<{ id: string; food_key: string; food_name: string; category: string }>(
    'SELECT id, food_key, food_name, category FROM kitchen_low_marks',
  );
  for (const row of marks) {
    const target = movedName(renames, row.category || null, row.food_name);
    if (!target) continue;
    const newKey = lowerKey(target.category, target.name);
    keyMoves.set(row.food_key, newKey);
    changed += touched(await db.runAsync(
      'UPDATE OR IGNORE kitchen_low_marks SET food_key = ?, food_name = ?, category = ? WHERE id = ?',
      newKey,
      target.name,
      target.category,
      row.id,
    ));
  }
  const usageKeys = await db.getAllAsync<{ food_key: string }>('SELECT DISTINCT food_key FROM kitchen_usage_log');
  if (usageKeys.length > 0) {
    // The log keeps only the lowercased key, so the renames are matched
    // against it case-blind. Where two old spellings lowercase alike and
    // went different ways, neither is used.
    const lowered = new Map<string, string | null>();
    for (const [key, target] of renames.byCategory) {
      const [cat, name] = key.split('\u0000');
      const from = lowerKey(cat, name);
      const to = lowerKey(target.category, target.name);
      lowered.set(from, lowered.has(from) && lowered.get(from) !== to ? null : to);
    }
    for (const [from, to] of keyMoves) lowered.set(from, to);
    for (const { food_key } of usageKeys) {
      const newKey = lowered.get(food_key);
      if (!newKey || newKey === food_key) continue;
      changed += touched(await db.runAsync('UPDATE kitchen_usage_log SET food_key = ? WHERE food_key = ?', newKey, food_key));
    }
  }

  return changed;
}
