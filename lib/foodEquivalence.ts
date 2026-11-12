// Reading one food's numbers across the national tables that measured it
// (1.0.86.7).
//
// The reference database holds ten tables, and the same food can sit in
// several of them under different names. food_equivalence (built by
// scripts/add_food_equivalence.js) gives every row a group: a USDA row and
// the rows other tables were matched to it. This module decides, for one
// picked food, which row of each table stands for it and in what order their
// numbers are read. Owner's instruction, 2026-11-11: the table chosen in
// Profile first (USDA unless another was chosen), then USDA, then the rest.
//
// Pure, with no database, so scripts/test_food_equivalence.js runs it.

import { isUnaskedPreservedForm } from './cookingMethodResolution';
import { foodSourceRank, type FoodSourceKey } from './foodSourcePreference';

export type EquivalentRow = {
  foodId: number;
  source: string;
  name: string;
  prepMethod: string | null;
};

export type NutrientAmount = { code: string; amountPer100g: number };

function saltTier(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes('without salt') || lower.includes('no salt added') || lower.includes('unsalted')) return 0;
  if (lower.includes('with salt') || lower.includes('salted')) return 2;
  return 1;
}

// One row per table, ordered by the person's table order. The picked row
// always stands for its own table. From any other table: never a dried,
// canned or otherwise preserved form unless the picked food is that form
// too, then the row whose salt matches the picked one, then the lowest id.
// 'Derived' rows count as USDA (they are USDA figures), so the two share
// one place and the picked row wins it when it is either.
export function orderEquivalentRows(self: EquivalentRow, group: EquivalentRow[], preferred: FoodSourceKey): EquivalentRow[] {
  const selfForm = `${self.prepMethod ?? ''} ${self.name}`;
  const selfSalt = saltTier(self.name);
  const tableOf = (source: string) => (source === 'Derived' ? 'USDA' : source);
  const best = new Map<string, { row: EquivalentRow; key: number[] }>();
  best.set(tableOf(self.source), { row: self, key: [-1] });
  for (const row of group) {
    if (row.foodId === self.foodId && row.source === self.source) continue;
    const table = tableOf(row.source);
    const key = [
      isUnaskedPreservedForm(row.prepMethod, row.name, selfForm) ? 1 : 0,
      Math.abs(saltTier(row.name) - selfSalt),
      row.foodId,
    ];
    const existing = best.get(table);
    if (!existing || compareKeys(key, existing.key) < 0) best.set(table, { row, key });
  }
  return [...best.values()]
    .map((entry) => entry.row)
    .sort((a, b) => foodSourceRank(a.source, preferred) - foodSourceRank(b.source, preferred));
}

function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

// Every nutrient once, from the first row in order that has it. The lead
// table is the first row with any value at all; a value from any other
// table is marked as filling a gap.
export function mergeNutrientsInOrder(
  ordered: EquivalentRow[],
  nutrientsByRow: Map<string, NutrientAmount[]>,
): { code: string; amountPer100g: number; sourceUsed: string; isSupplemented: boolean }[] {
  const lead = ordered.find((row) => (nutrientsByRow.get(rowKey(row)) ?? []).length > 0);
  const taken = new Map<string, { code: string; amountPer100g: number; sourceUsed: string; isSupplemented: boolean }>();
  for (const row of ordered) {
    for (const n of nutrientsByRow.get(rowKey(row)) ?? []) {
      if (n.amountPer100g == null || taken.has(n.code)) continue;
      taken.set(n.code, {
        code: n.code,
        amountPer100g: n.amountPer100g,
        sourceUsed: row.source,
        isSupplemented: !lead || row.source !== lead.source,
      });
    }
  }
  return [...taken.values()];
}

export function rowKey(row: { foodId: number; source: string }): string {
  return `${row.foodId}|${row.source}`;
}
