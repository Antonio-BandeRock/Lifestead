// Which country's food table supplies a food's numbers first (1.0.86.7).
//
// Owner's instruction, 2026-11-11: "US should always come first unless the
// user, in their profile switches to any of the other sources to be used
// first. If that happens, US becomes the gap filler. The reason the US should
// always come first is because there are far more entries in that database
// than all of the others."
//
// So the order is always: the chosen table, then USDA, then every other
// table. With the default (USDA) that is simply USDA first. A table chosen
// here never hides another; it only decides whose number is read first when
// two tables both measured the same food, and every other table's number
// stays visible under "What other countries list" on the food itself.
//
// This module holds only the state and the order, with no database import,
// so lib/db.ts can read it synchronously without a require cycle. Loading
// and saving the choice live in lib/db.ts (loadFoodSourcePreference,
// saveFoodSourcePreference), next to the queries that read it.

import { useSyncExternalStore } from 'react';

export type FoodSourceKey =
  | 'USDA'
  | 'Canada_CNF'
  | 'UK_CoFID'
  | 'Germany_BLS'
  | 'France_Ciqual'
  | 'Norway_Matvaretabellen'
  | 'Sweden_Livsmedelsverket'
  | 'Japan_MEXT'
  | 'Australia_AFCD';

export const DEFAULT_FOOD_SOURCE: FoodSourceKey = 'USDA';

// Every table a person can put first, with the country named the way the
// chooser shows it. USDA leads; the rest follow alphabetically by country.
export const FOOD_SOURCE_CHOICES: { key: FoodSourceKey; country: string; table: string }[] = [
  { key: 'USDA', country: 'United States', table: 'USDA FoodData Central' },
  { key: 'Australia_AFCD', country: 'Australia', table: 'Australian Food Composition Database' },
  { key: 'Canada_CNF', country: 'Canada', table: 'Canadian Nutrient File' },
  { key: 'France_Ciqual', country: 'France', table: 'Ciqual' },
  { key: 'Germany_BLS', country: 'Germany', table: 'German Nutrient Database (BLS)' },
  { key: 'Japan_MEXT', country: 'Japan', table: 'Standard Tables of Food Composition in Japan' },
  { key: 'Norway_Matvaretabellen', country: 'Norway', table: 'Matvaretabellen' },
  { key: 'Sweden_Livsmedelsverket', country: 'Sweden', table: 'Swedish Food Agency database' },
  { key: 'UK_CoFID', country: 'United Kingdom', table: 'Composition of Foods Integrated Dataset' },
];

const VALID = new Set<string>(FOOD_SOURCE_CHOICES.map((choice) => choice.key));

export function isFoodSourceKey(value: unknown): value is FoodSourceKey {
  return typeof value === 'string' && VALID.has(value);
}

// After the chosen table and USDA, the others in a fixed order: Canada's table
// is the closest to USDA's in method and coverage, then the larger European
// tables, then the rest. Fixed so the same food always gives the same answer.
const AFTER_USDA: FoodSourceKey[] = [
  'Canada_CNF',
  'Germany_BLS',
  'Sweden_Livsmedelsverket',
  'France_Ciqual',
  'Norway_Matvaretabellen',
  'Japan_MEXT',
  'Australia_AFCD',
  'UK_CoFID',
];

/** Every table in the order its numbers are read, for a given first choice. */
export function foodSourceOrder(preferred: FoodSourceKey): FoodSourceKey[] {
  const order: FoodSourceKey[] = [preferred];
  if (preferred !== 'USDA') order.push('USDA');
  for (const key of AFTER_USDA) if (!order.includes(key)) order.push(key);
  return order;
}

/**
 * Where a source stands in the order, lower first. 'Derived' rows are USDA
 * figures copied onto a few spirits no table measures separately, so they
 * rank with USDA. An unknown source goes last.
 */
export function foodSourceRank(source: string, preferred: FoodSourceKey = getPreferredFoodSource()): number {
  const order = foodSourceOrder(preferred);
  const key = source === 'Derived' ? 'USDA' : source;
  const index = order.indexOf(key as FoodSourceKey);
  return index === -1 ? order.length : index;
}

/**
 * The same rank as a SQL CASE expression over a `source` column, for ORDER BY.
 * Every value inlined here comes from the fixed list above, never from input.
 */
export function foodSourceRankSql(column = 'source', preferred: FoodSourceKey = getPreferredFoodSource()): string {
  const order = foodSourceOrder(preferred);
  const whens = order.map((key, index) => `WHEN '${key}' THEN ${index}`);
  const usdaIndex = order.indexOf('USDA');
  whens.push(`WHEN 'Derived' THEN ${usdaIndex}`);
  return `CASE ${column} ${whens.join(' ')} ELSE ${order.length} END`;
}

/** True when a row's numbers come from somewhere other than the first-choice table. */
export function isOutsidePreferredSource(source: string, preferred: FoodSourceKey = getPreferredFoodSource()): boolean {
  return foodSourceRank(source, preferred) !== 0;
}

let current: FoodSourceKey = DEFAULT_FOOD_SOURCE;
const listeners = new Set<() => void>();

export function getPreferredFoodSource(): FoodSourceKey {
  return current;
}

/** Called by lib/db.ts after loading or saving the choice. */
export function setPreferredFoodSourceInMemory(next: FoodSourceKey): void {
  if (next === current) return;
  current = next;
  listeners.forEach((listener) => listener());
}

export function subscribeToFoodSourcePreference(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useFoodSourcePreference(): FoodSourceKey {
  return useSyncExternalStore(subscribeToFoodSourcePreference, getPreferredFoodSource, getPreferredFoodSource);
}

export function countryForFoodSource(source: string): string {
  if (source === 'Derived') return 'United States';
  return FOOD_SOURCE_CHOICES.find((choice) => choice.key === source)?.country ?? source;
}
