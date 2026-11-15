// Reads which lenses have not been used yet (lib/untriedLenses.ts). One
// "is there a row" query per check, each stopping at the first row.
//
// A lens whose records are in a closed vault, or whose table cannot be
// read, is left off the list: not knowing is no reason to say it was never
// used.
import { getDatabase } from './db';
import { UNTRIED_LENSES, UNTRIED_TAB_PATHS, usedQuery, type UntriedTabPath } from './untriedLenses';

export type UntriedByTab = Record<UntriedTabPath, string[]>;

export async function loadUntriedLenses(): Promise<UntriedByTab> {
  const db = await getDatabase();
  const result = {} as UntriedByTab;
  for (const path of UNTRIED_TAB_PATHS) {
    const untried: string[] = [];
    for (const def of UNTRIED_LENSES[path]) {
      let used = false;
      for (const check of def.used) {
        try {
          const row = await db.getFirstAsync<{ found: number }>(usedQuery(check));
          if (row) {
            used = true;
            break;
          }
        } catch {
          used = true;
          break;
        }
      }
      if (!used) untried.push(def.lens);
    }
    result[path] = untried;
  }
  return result;
}
