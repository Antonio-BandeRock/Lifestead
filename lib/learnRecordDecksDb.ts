// Gathers what lib/learnRecordDecks.ts makes the record decks from (Learn
// part 6d). Each read stands alone: one that fails, such as records the
// vault has closed, leaves its deck out rather than the lens.

import { listGardenPlantings, getMealItemsInWindow } from './db';
import { CROP_PROBLEMS } from './cropProblems';
import { findCropGuide } from './cropGuides';
import { rulesConcerningMyMeds } from './interactionRules';
import { listInterestSessions } from './interestSessionsDb';
import { listInterests } from './interestsDb';
import { addDays } from './learnSchedule';
import { buildRecordDecks, type CropInput, type GuessInputs, type MedRuleInput, type Translate } from './learnRecordDecks';
import type { LearnDeck } from './learnDecks';

async function quietly<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch {
    return fallback;
  }
}

async function readMeals(day: string): Promise<Pick<GuessInputs, 'foodDays' | 'mealDays'>> {
  const items = await getMealItemsInWindow(`${addDays(day, -29)}T00:00`, `${day}T23:59`);
  const daysByFood = new Map<string, Set<string>>();
  const mealDays = new Set<string>();
  for (const item of items) {
    const eatenOn = item.eatenAt.slice(0, 10);
    mealDays.add(eatenOn);
    const name = (item.dishName || item.foodName || '').trim();
    if (!name) continue;
    const set = daysByFood.get(name) ?? new Set<string>();
    set.add(eatenOn);
    daysByFood.set(name, set);
  }
  return {
    foodDays: [...daysByFood.entries()].map(([name, days]) => ({ name, days: days.size })),
    mealDays: mealDays.size,
  };
}

async function readGarden(): Promise<{ crops: CropInput[]; plantings: GuessInputs['plantings'] }> {
  const growing = (await listGardenPlantings()).filter((planting) => planting.status === 'growing');
  const crops: CropInput[] = [];
  const plantings: GuessInputs['plantings'] = [];
  const seen = new Set<string>();
  for (const planting of [...growing].reverse()) {
    const guide = findCropGuide(planting.foodName);
    plantings.push({ name: guide?.name ?? planting.foodName, plantedAt: planting.plantedAt });
    if (!guide || seen.has(guide.key)) continue;
    seen.add(guide.key);
    const problems = CROP_PROBLEMS[guide.key] ?? [];
    if (problems.length >= 2) crops.push({ key: guide.key, name: guide.name, problems });
  }
  return { crops, plantings };
}

async function readInterests(day: string): Promise<GuessInputs['interestMinutes']> {
  const since = addDays(day, -89);
  const [sessions, interests] = await Promise.all([listInterestSessions(), listInterests()]);
  const minutes = new Map<string, number>();
  for (const session of sessions) {
    if (session.doneOn < since || session.doneOn > day || !session.minutes) continue;
    minutes.set(session.interestId, (minutes.get(session.interestId) ?? 0) + session.minutes);
  }
  return interests
    .filter((interest) => minutes.has(interest.id))
    .map((interest) => ({ name: interest.name, minutes: minutes.get(interest.id) ?? 0 }));
}

export async function loadRecordDecks(day: string, t: Translate): Promise<LearnDeck[]> {
  const [meds, meals, garden, interestMinutes] = await Promise.all([
    quietly<MedRuleInput[]>(rulesConcerningMyMeds, []),
    quietly(() => readMeals(day), { foodDays: [], mealDays: 0 }),
    quietly(readGarden, { crops: [], plantings: [] }),
    quietly(() => readInterests(day), []),
  ]);
  return buildRecordDecks(
    {
      meds,
      crops: garden.crops,
      guess: { ...meals, plantings: garden.plantings, interestMinutes },
    },
    t,
  );
}
