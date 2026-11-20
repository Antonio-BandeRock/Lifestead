// The meal being put together in Meal Builder, kept while the person is away
// making one of its dishes (Tony, 2026-11-19): "after naming it, it should
// be asking me to start the first side dish that will be added to the meal
// and that side dish is created and automatically added to the meal, and
// then it asks what is the next side dish... until the person says the meal
// is done... When the meal is done, it should then ask if there is anything
// else that needs to be added to the meal, such as a drink."
//
// Meal Builder is unmounted whenever the Food tab switches to a builder, so
// what it held would be lost on the way to making a dish. This keeps it in
// memory for the life of the app, never on disk: a meal half put together
// is not a record until it is logged or scheduled.
//
// Pure: no database, no React, so scripts/test_meal_in_progress.js can check
// the rules without either.
import type { MealComponentType } from './db';

// Where the guided questions have reached. 'dishes' asks for the first and
// next dish, 'extras' asks whether anything else goes with the meal (a drink,
// say), and 'done' shows the meal with its Log and Schedule buttons.
export type MealPhase = 'dishes' | 'extras' | 'done';

export type MealInProgressDish = {
  key: string;
  componentType: MealComponentType;
  componentId: string;
  name: string;
  servings: number;
  yourSharePercent: number;
};

export type MealInProgress = {
  name: string;
  mealType: string | null;
  identityConfirmed: boolean;
  components: MealInProgressDish[];
  phase: MealPhase;
  // The kind of dish a builder is making for this meal right now. Set by
  // "Make a new dish"; the builder's save hands the dish back to the meal
  // only when its kind matches.
  waitingFor: MealComponentType | null;
};

let current: MealInProgress | null = null;

export function getMealInProgress(): MealInProgress | null {
  return current;
}

export function setMealInProgress(meal: MealInProgress | null): void {
  current = meal;
}

// The meal as Meal Builder holds it, keeping whatever builder it is waiting
// on: Meal Builder writes its state back on every change and must not wipe
// the wait a "Make a new dish" press has just set.
export function saveMealInProgress(meal: Omit<MealInProgress, 'waitingFor'>): void {
  current = { ...meal, waitingFor: current?.waitingFor ?? null };
}

export function waitForDish(kind: MealComponentType): void {
  if (current) current = { ...current, waitingFor: kind };
}

export function stopWaiting(): void {
  if (current) current = { ...current, waitingFor: null };
}

// True when a builder that has just saved a dish of this kind should hand
// it straight to the meal rather than ask what to do with it.
export function mealIsWaitingFor(kind: MealComponentType): boolean {
  return !!current && current.identityConfirmed && current.waitingFor === kind;
}

// Nothing worth keeping: never named, nothing added.
export function isEmptyMeal(meal: Omit<MealInProgress, 'waitingFor'>): boolean {
  return !meal.identityConfirmed && !meal.name.trim() && !meal.mealType && meal.components.length === 0;
}
