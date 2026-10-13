// Test data, 2026-10-13. Direct request: "start with a blank database,
// create the entries for everything ... so there is enough data for testing
// and reporting", for one made-up person: Hashimoto's, prostate problems,
// autism and ADHD, with five months behind today and one month ahead.
//
// Everything goes in through the same writers a person's taps reach, never
// a second creation path, so a screen reads these rows exactly as it would
// read anybody's. Nothing is random: every pattern cycles by day offset, so
// Start Fresh on the desktop's "Test data" version and opening it again
// gives the same records on the same days relative to today.
//
// Reached only from the desktop's Test data version (desktop/versions.js),
// through components/TestDataFiller.tsx, and only when that copy is empty.

import {
  addFamilyMember,
  addFoodAllergy,
  addNeuroProfile,
  addOwnLabTest,
  createFoodTrial,
  createGardenPlanting,
  createGardenPlot,
  createMealFromComponents,
  createPersonalRule,
  createPrescriptionTreatment,
  createSupplementTreatment,
  createTherapySession,
  createTrialSeries,
  recordFermentationHarvest,
  recordTrialStep,
  scheduleFoodTrialCheckins,
  setUpMealPlan,
  setUserNutrientWeekdayTarget,
  getCuratedRecipe,
  getCuratedRecipeStrainIds,
  getDatabase,
  recordBodyMeasurement,
  recordCheckin,
  recordExercise,
  recordGardenHarvest,
  recordHarvestUsage,
  recordLabResult,
  recordStepCount,
  recordSymptomAssessment,
  resolveFoodTrial,
  saveBakedGoods,
  saveBeverage,
  saveDessert,
  saveFermentation,
  saveHandheld,
  saveMealFavorite,
  saveSalad,
  saveSauce,
  saveSide,
  saveSmoothie,
  saveSnack,
  saveSoup,
  scheduleAppointment,
  scheduleGardenTask,
  scheduleMeal,
  schedulePrescriptionDose,
  scheduleSupplementDose,
  setConditionStage,
  setDietPreferenceSelected,
  setMySafeFood,
  setUserNutrientTargetOverride,
  setFermentationBatchStrains,
  setFoodRestrictionSelected,
  setUserConditionSelected,
  setUserProfile,
  settlePastScheduledMeals,
  startFermentationBatch,
  type MealComponentSelection,
  type MealComponentType,
} from './db';
import { addBeat, markYourStorySeen } from './yourStoryDb';
import { ALL_BEATS } from './yourStory';
import { setYourStoryAnswer } from './yourStoryInterviewDb';
import { addBowelEntry } from './bowelDb';
import { saveNocturiaNight } from './nocturiaDb';
import { saveMorningCheckin } from './morningCheckinDb';
import { addTrackerEntry, createCustomTracker } from './customTrackersDb';
import { addFlareContributor } from './flareContextDb';
import { saveTreatmentSupply } from './medDetailsDb';
import { addKitchenItem } from './kitchenDb';
import { setBudget, upsertAccount } from './financeAccountsDb';
import { createEntry, createRecurring } from './financeDb';
import { addGoalContribution, addGoalCost, createGoal } from './financeGoalsDb';
import { createMedicalBill, upsertHealthAccount, upsertInsurancePlan } from './financeHealthDb';
import { recordBenefitUse, saveWorkCheckin, upsertBenefit } from './workDb';
import { createUpkeepPlace, markUpkeepDone, upsertUpkeepItem } from './upkeepDb';
import { addRoutineStep, createDoneCheck, createRoutine, markDoneCheck, markRoutineRunProgress, startRoutineRun } from './routinesDb';
import { addTodo, markTodoDone } from './todosDb';
import { addCountdown } from './countdownDb';
import { saveEmergencyProfile, upsertEmergencyContact } from './emergencyDb';
import { createCaptureNote, setCaptureNoteDestination } from './captureNotesDb';
import { addPlantingEvent } from './plantingEventsDb';
import { addCompostEvent, createCompostPile } from './compostDb';
import { addSeedTest, addSeedUse, newSeedPacketId, saveSeedPacket } from './seedInventoryDb';
import { createGardenCostKind, recordGrowingCost, saveGardenCostGroup } from './gardenMoneyDb';
import { addElectricityBill, addGrowEquipment } from './growSetupDb';
import { addGardenReading } from './growingConditionsDb';
import { addGardenCountdown } from './gardenCountdownDb';
import { addCropPlan, recordCropStep } from './cropPlanDb';
import { dailyMealPlanToMealPlanDay, generateMealPlanDays } from './dailyMealPlan';
import { saveWeekOfMeals } from './savedWeeksDb';
import { packMeal } from './mealPackDb';
import { pickForToday } from './todayPicksDb';
import { saveTravelMode } from './travelTimeDb';
import { saveLayoutPatch } from './bedLayoutDb';
import { saveMeasurePlan } from './measuringPlanDb';
import { getPlateOfferForMeal, keepPlateUses } from './plateSourceDb';
import { addGroceryListItem, createHandGroceryList } from './groceryDb';
import { logWidgetGlass } from './widgetData';
import { addCalendarNote } from './calendarNotesDb';
import { addWorkoutStep, createWorkout, saveWorkoutSession } from './workoutsDb';
import { getExercisePlan, markPlanDone, saveExercisePlan } from './exercisePlanDb';
import { addUsualMeal } from './usualMealDb';
import { recordDisposition } from './harvestTradeDb';

export const TEST_DATA_PAST_DAYS = 150;
export const TEST_DATA_FUTURE_DAYS = 30;

/** app_meta key set once the copy has been filled, so it fills only once. */
export const TEST_DATA_FILLED_KEY = 'test_data_filled';

export type TestDataProgress = (step: string, done: number, total: number) => void;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dayFrom(offset: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

/** YYYY-MM-DD, offset days from today. */
function day(offset: number): string {
  const d = dayFrom(offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local YYYY-MM-DDTHH:mm, offset days from today. */
function at(offset: number, hour: number, minute = 0): string {
  return `${day(offset)}T${pad(hour)}:${pad(minute)}`;
}

/** A Date at a local time, offset days from today. */
function dateOf(offset: number, hour: number, minute = 0): Date {
  const d = dayFrom(offset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** ISO (UTC) stamp of a local time, for the columns that store one. */
function iso(offset: number, hour: number, minute = 0): string {
  return dateOf(offset, hour, minute).toISOString();
}

// Several writers build their id from Date.now() alone, so a loop writing
// rows back to back waits a little between them to keep every id distinct.
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 2));
}

/** Same day offset always gives the same pick. */
function cycle<T>(list: readonly T[], offset: number): T {
  return list[((offset % list.length) + list.length) % list.length];
}

const PAST = TEST_DATA_PAST_DAYS;
const FUTURE = TEST_DATA_FUTURE_DAYS;

// ---------------------------------------------------------------------------
// Meals, from curated recipes saved through the builders' save functions.

type Component = { componentType: MealComponentType; componentId: string };
type RecipeRef = [string, MealComponentType];
type Favorite = { id: string; components: MealComponentSelection[] };

async function saveRecipe(recipeId: string, type: MealComponentType): Promise<Component | null> {
  const recipe = await getCuratedRecipe(recipeId);
  if (!recipe) return null;
  const payload = {
    name: recipe.name,
    servings: recipe.servings,
    servingSizeAmount: recipe.servingSizeAmount,
    servingSizeUnit: recipe.servingSizeUnit,
    ingredients: recipe.ingredients,
    instructions: [] as string[],
  };
  let id: string;
  switch (type) {
    case 'side': ({ id } = await saveSide(payload)); break;
    case 'salad': ({ id } = await saveSalad(payload)); break;
    case 'smoothie': ({ id } = await saveSmoothie(payload)); break;
    case 'fermentation': {
      ({ id } = await saveFermentation(payload));
      const strains = await getCuratedRecipeStrainIds(recipeId);
      if (strains.length > 0) await setFermentationBatchStrains(id, strains);
      break;
    }
    case 'beverage': ({ id } = await saveBeverage(payload)); break;
    case 'snack': ({ id } = await saveSnack(payload)); break;
    case 'bakedGoods': ({ id } = await saveBakedGoods(payload)); break;
    case 'soup': ({ id } = await saveSoup(payload)); break;
    case 'sauce': ({ id } = await saveSauce(payload)); break;
    case 'handheld': ({ id } = await saveHandheld(payload)); break;
    case 'dessert': ({ id } = await saveDessert(payload)); break;
    default: {
      const unhandled: never = type;
      throw new Error(`Test data: no builder for ${String(unhandled)}`);
    }
  }
  return { componentType: type, componentId: id };
}

const BREAKFASTS: [string, RecipeRef[]][] = [
  ['Green smoothie and oat cookies', [['curated_smoothie_green_glow', 'smoothie'], ['curated_baked_banana_oat_cookies', 'bakedGoods']]],
  ['Potatoes, golden milk and yogurt', [['curated_side_herb_roasted_potatoes', 'side'], ['curated_bev_golden_milk', 'beverage'], ['curated_ferment_plain_yogurt', 'fermentation']]],
  ['Berry smoothie and a biscuit', [['curated_smoothie_berry_antioxidant', 'smoothie'], ['curated_baked_buttermilk_biscuits', 'bakedGoods']]],
  ['Yogurt and trail mix', [['curated_ferment_probiotic_yogurt', 'fermentation'], ['curated_snack_trail_mix', 'snack']]],
  ['Iron smoothie, toast and tonic', [['curated_smoothie_iron_vitamin_c', 'smoothie'], ['curated_baked_whole_wheat_bread', 'bakedGoods'], ['curated_bev_ginger_turmeric_tonic', 'beverage']]],
];
const LUNCHES: [string, RecipeRef[]][] = [
  ['Chickpea salad and tomato soup', [['curated_salad_mediterranean_chickpea_feta', 'salad'], ['curated_soup_tomato_basil', 'soup']]],
  ['Chicken sandwich and broccoli', [['curated_handheld_grilled_chicken_sandwich', 'handheld'], ['curated_side_lemon_garlic_broccoli', 'side'], ['curated_sauce_basic_tomato', 'sauce']]],
  ['Quinoa salad and lentil soup', [['curated_salad_southwest_quinoa_black_bean', 'salad'], ['curated_soup_red_lentil', 'soup']]],
  ['Turkey wrap and kale salad', [['curated_handheld_turkey_avocado_wrap', 'handheld'], ['curated_salad_kale_citrus_iron', 'salad']]],
  ['Sweet potato tacos and slaw', [['curated_handheld_black_bean_sweet_potato_tacos', 'handheld'], ['curated_salad_sesame_ginger_slaw', 'salad']]],
];
const DINNERS: [string, RecipeRef[]][] = [
  ['Stir-fry with pesto and squash soup', [['curated_side_rainbow_stir_fry', 'side'], ['curated_sauce_simple_pesto', 'sauce'], ['curated_soup_butternut_squash', 'soup']]],
  ['Egg salad wraps and spinach salad', [['curated_handheld_egg_salad_lettuce_wraps', 'handheld'], ['curated_salad_spinach_strawberry_almond', 'salad'], ['curated_dessert_baked_cinnamon_apples', 'dessert']]],
  ['Chicken soup and cauliflower mash', [['curated_soup_chicken_vegetable', 'soup'], ['curated_side_garlic_mashed_cauliflower', 'side'], ['curated_salad_beet_walnut_arugula', 'salad'], ['curated_ferment_sauerkraut', 'fermentation']]],
  ['Turkey wrap and garlic spinach', [['curated_handheld_turkey_avocado_wrap', 'handheld'], ['curated_side_sauteed_spinach_garlic', 'side'], ['curated_dessert_mixed_berry_chia_pudding', 'dessert']]],
  ['Roast potatoes with tahini', [['curated_side_herb_roasted_potatoes', 'side'], ['curated_sauce_tahini_lemon', 'sauce'], ['curated_bev_iced_green_tea_mint', 'beverage'], ['curated_ferment_kombucha', 'fermentation']]],
];
const SNACKS: [string, RecipeRef[]][] = [
  ['Apple and almond butter', [['curated_snack_apple_almond_butter', 'snack']]],
  ['Berries and yogurt', [['curated_snack_berries_yogurt', 'snack']]],
  ['Roasted chickpeas', [['curated_snack_roasted_chickpeas', 'snack']]],
];

async function favoritesFor(
  list: [string, RecipeRef[]][],
  mealType: string,
  cache: Map<string, Component | null>,
): Promise<Favorite[]> {
  const out: Favorite[] = [];
  for (const [name, refs] of list) {
    const components: MealComponentSelection[] = [];
    for (const [recipeId, type] of refs) {
      if (!cache.has(recipeId)) cache.set(recipeId, await saveRecipe(recipeId, type));
      const part = cache.get(recipeId);
      if (part) components.push({ ...part, yourSharePercent: 100 });
    }
    if (components.length === 0) continue;
    await tick();
    const saved = await saveMealFavorite({ name, mealType, components });
    out.push({ id: saved.id, components });
  }
  if (out.length === 0) throw new Error(`Test data: no ${mealType} recipe could be resolved.`);
  return out;
}

async function fillMeals(progress: (step: string) => void): Promise<void> {
  progress('Saving dishes from recipes');
  const cache = new Map<string, Component | null>();
  const breakfast = await favoritesFor(BREAKFASTS, 'breakfast', cache);
  const lunch = await favoritesFor(LUNCHES, 'lunch', cache);
  const dinner = await favoritesFor(DINNERS, 'dinner', cache);
  const snack = await favoritesFor(SNACKS, 'snack', cache);

  await addUsualMeal({ mealType: 'breakfast', kind: 'home', source: 'favorite', name: BREAKFASTS[3][0], favoriteId: breakfast[3 % breakfast.length].id });
  await addUsualMeal({ mealType: 'lunch', kind: 'out', source: 'typed', name: 'Soup and a roll from the cafe', place: 'Corner cafe', foods: ['Lentil soup', 'Bread roll'] });

  async function plan(fav: Favorite, title: string, mealType: string, offset: number, hour: number, minute: number) {
    await scheduleMeal({ title, mealType, scheduledFor: at(offset, hour, minute), sourceFavoriteId: fav.id, components: fav.components });
  }

  progress('Planning five months of meals');
  for (let offset = -PAST; offset <= -1; offset += 1) {
    await plan(cycle(breakfast, offset), 'Breakfast', 'breakfast', offset, 8, 0);
    await plan(cycle(lunch, offset), 'Lunch', 'lunch', offset, 12, 30);
    await plan(cycle(dinner, offset), 'Dinner', 'dinner', offset, 18, 30);
    // An afternoon snack most days, not every day.
    if (offset % 4 !== 0) await plan(cycle(snack, offset), 'Snack', 'snack', offset, 15, 30);
  }
  progress('Turning the past plan into meals eaten');
  await settlePastScheduledMeals();

  for (const [fav, name, type, hour, minute] of [
    [cycle(breakfast, 0), 'Breakfast', 'breakfast', 8, 0],
    [cycle(lunch, 0), 'Lunch', 'lunch', 12, 30],
  ] as const) {
    await tick();
    await createMealFromComponents({ name, mealType: type, eatenAt: at(0, hour, minute), isImmediate: false, components: fav.components });
  }

  progress('Planning the month ahead');
  // The last week ahead comes from the Meal Plan generator, the way a person
  // pressing Set Up My Plan would fill it; the weeks before it are planned
  // by hand from the saved dishes.
  const generatedFrom = FUTURE - 6;
  const generated = (
    await generateMealPlanDays({
      conditionCodes: ['hashimotos', 'prostate_health'],
      dietPreferences: ['Gluten-Free'],
      carbLevel: 'any',
      days: 7,
      startDate: day(generatedFrom),
    })
  )
    .map((result, index) => dailyMealPlanToMealPlanDay(result, index + 1))
    .filter((planDay): planDay is NonNullable<typeof planDay> => planDay !== null);
  const byHandUntil = generated.length > 0 ? generatedFrom - 1 : FUTURE;
  for (let offset = 1; offset <= FUTURE; offset += 1) {
    if (offset <= byHandUntil) {
      await plan(cycle(breakfast, offset), 'Breakfast', 'breakfast', offset, 8, 0);
      await plan(cycle(lunch, offset), 'Lunch', 'lunch', offset, 12, 30);
      await plan(cycle(dinner, offset), 'Dinner', 'dinner', offset, 18, 30);
    }
    if (offset % 4 !== 0) await plan(cycle(snack, offset), 'Snack', 'snack', offset, 15, 30);
  }
  if (generated.length > 0) await setUpMealPlan(day(generatedFrom), generated);
  await plan(cycle(dinner, 0), 'Dinner', 'dinner', 0, 18, 30);

  progress('A saved week and packed lunches');
  await saveWeekOfMeals(day(3), 'Easy week');
  await packMeal(day(1), 'lunch', { source: 'leftovers', dinnerName: cycle(DINNERS, 0)[0], dinnerId: null });
  await tick();
  await packMeal(day(2), 'lunch', { source: 'typed', name: 'Rice bowl from the deli', kind: 'out', place: 'Deli on Main', foods: ['Rice', 'Chicken', 'Cucumber'] });

  progress('Glasses of water');
  const glassHours = [7, 10, 13, 15, 17, 20];
  for (let offset = -PAST; offset <= 0; offset += 1) {
    // Five to seven a day, fewer on a cycle of busier days.
    const count = offset === 0 ? 3 : 4 + (Math.abs(offset) % 3);
    for (let i = 0; i < count; i += 1) {
      await tick();
      await logWidgetGlass(dateOf(offset, glassHours[i] ?? 21, 10 + i));
    }
  }
}

// ---------------------------------------------------------------------------
// Who the person is, and the setup answers, so setup is finished.

async function fillProfile(): Promise<void> {
  await setUserProfile({
    firstName: 'Sam',
    lastName: 'Test',
    sex: 'male',
    birthDate: '1968-04-17',
    hasHashimotos: true,
    heightCm: 178,
    activityLevel: 'light',
  });
  await setUserConditionSelected('hashimotos', true);
  await setUserConditionSelected('prostate_health', true);
  await addNeuroProfile('autism');
  await addNeuroProfile('adhd');
  await setConditionStage('hashimotos', 'gut_repair');
  await setDietPreferenceSelected('gluten_free', true);
  await addFoodAllergy('Shellfish');
  // Off nightshades while they come back one at a time (the trial series).
  await setFoodRestrictionSelected('nightshade', true);
  for (const beat of ALL_BEATS) await addBeat(beat);
  // The setup parts of Your Story read as already looked at.
  for (const key of ['beats', 'aboutYou', 'conditions', 'allergies', 'eatingStyle', 'neuro'] as const) await markYourStorySeen(key, day(-PAST));
  await setYourStoryAnswer('startTab', '/');
  await setYourStoryAnswer('homeView', 'full');
  await setYourStoryAnswer('backup', 'notNow');
  await setYourStoryAnswer('security', 'notNow');
  await setYourStoryAnswer('guidedTour', 'hidden');
}

// ---------------------------------------------------------------------------
// Signals: check-ins, flares, sleep, bowel, nocturia, trackers, assessments.

const FLARE_TAGS = [
  ['fatigue', 'brain_fog'],
  ['joint_pain', 'fatigue'],
  ['bloating', 'constipation'],
  ['overstimulated', 'headache'],
  ['fatigue', 'temperature_sensitivity'],
  ['brain_fog', 'couldnt_get_started'],
];
const FLARE_CAUSES = ['poor_sleep', 'stress', 'sensory_load', 'food_drink', 'routine_change', 'med_change'];

async function fillSignals(progress: (step: string) => void): Promise<void> {
  progress('Flares and check-ins');
  for (let offset = -PAST; offset <= 0; offset += 1) {
    const n = Math.abs(offset);
    // A flare every five to nine days, a little milder in the last two months.
    if (n % 7 === 3 || n % 11 === 5) {
      await tick();
      const tags = cycle(FLARE_TAGS, n);
      const severity = n > 60 ? 3 + (n % 2) : 2 + (n % 2);
      const id = await recordCheckin({
        loggedAt: at(offset, 16, 10),
        checkinType: 'flare',
        valence: 'negative',
        severity,
        severityTen: severity * 2,
        tags,
        bodyRegions: tags.includes('joint_pain') ? ['knee', 'hand'] : tags.includes('headache') ? ['head'] : undefined,
        notes: n % 3 === 0 ? 'Had to lie down for an hour.' : undefined,
      });
      await addFlareContributor(id, cycle(FLARE_CAUSES, n));
    }
    // After-meal notes on about half the days.
    if (n % 2 === 0) {
      await tick();
      const bad = n % 6 === 0;
      await recordCheckin({
        loggedAt: at(offset, 13, 30),
        checkinType: 'post_meal',
        valence: bad ? 'negative' : 'positive',
        foodName: cycle(LUNCHES, offset)[0],
        tags: bad ? ['bloating', 'gas'] : ['digestion_calm'],
      });
    }
    // A mood note most evenings.
    if (n % 3 !== 1) {
      await tick();
      const low = n % 9 === 0;
      await recordCheckin({
        loggedAt: at(offset, 20, 45),
        checkinType: low ? 'stress' : 'general',
        valence: low ? 'negative' : n % 5 === 0 ? 'neutral' : 'positive',
        mood: low ? 2 : 3 + (n % 3 === 0 ? 1 : 0),
        energy: low ? 2 : 3,
        stress: low ? 4 : 2,
        tags: low ? ['overstimulated', 'irritable'] : n % 4 === 0 ? ['hyperfocused'] : ['calm_good_mood'],
      });
    }
    // Morning sleep and energy.
    await saveMorningCheckin({
      existingId: null,
      sleepQuality: 2 + (n % 4 === 0 ? 0 : n % 3),
      energy: 2 + (n % 3),
      notes: n % 10 === 0 ? 'Woke twice to use the bathroom.' : '',
      at: dateOf(offset, 7, 20),
    });
    // Nights up to pee, a little fewer as the months go on.
    if (offset < 0) {
      await saveNocturiaNight({ nightOf: day(offset), times: (n > 75 ? 2 : 1) + (n % 3 === 0 ? 1 : 0), firstWake: n % 2 === 0 ? '02:40' : '03:15', notes: null });
    }
    // Bowel entries, most days.
    if (n % 5 !== 2) {
      await tick();
      await addBowelEntry({
        occurredAt: iso(offset, 7, 45),
        bristolType: n % 6 === 0 ? 2 : 4,
        urgency: n % 8 === 0 ? 1 : 0,
        blood: 0,
        pain: n % 6 === 0 ? 1 : 0,
        note: null,
      });
    }
  }

  progress('Own trackers');
  const meltdowns = await createCustomTracker({ name: 'Sensory overload', kind: 'scale', unit: null });
  const focus = await createCustomTracker({ name: 'Focused work', kind: 'duration', unit: 'minutes' });
  for (let offset = -PAST; offset <= 0; offset += 1) {
    const n = Math.abs(offset);
    await tick();
    await addTrackerEntry({ trackerId: meltdowns, value: 1 + (n % 4), loggedAt: at(offset, 19, 0), notes: null });
    if (n % 7 !== 0 && n % 7 !== 6) {
      await tick();
      await addTrackerEntry({ trackerId: focus, value: 40 + (n % 5) * 20, loggedAt: at(offset, 17, 0), notes: null });
    }
  }

  progress('Questionnaires');
  for (let offset = -PAST + 2; offset <= 0; offset += 14) {
    const step = Math.floor((offset + PAST) / 14);
    const hypo = ['hypo_fatigue', 'hypo_cold_intolerance', 'hypo_dry_skin', 'hypo_hair_loss', 'hypo_constipation', 'hypo_weight_gain', 'hypo_muscle_aches', 'hypo_brain_fog', 'hypo_swelling', 'hypo_slowed_movement', 'hypo_voice_changes', 'hypo_joint_pain', 'hypo_hearing_changes'];
    const ipss = ['prostate_incomplete_emptying', 'prostate_frequency', 'prostate_intermittency', 'prostate_urgency', 'prostate_weak_stream', 'prostate_straining', 'prostate_nocturia'];
    const well = ['wellbeing_cheerful', 'wellbeing_calm', 'wellbeing_energetic', 'wellbeing_rested', 'wellbeing_engaged'];
    await tick();
    await recordSymptomAssessment({
      completedAt: at(offset, 19, 30),
      responses: [
        ...hypo.map((itemCode, i) => ({ itemCode, value: Math.max(0, Math.min(4, 3 - Math.floor(step / 4) + ((i + step) % 2) - (i > 9 ? 1 : 0))) })),
        ...ipss.map((itemCode, i) => ({ itemCode, value: Math.max(0, Math.min(5, 3 - Math.floor(step / 5) + (i % 3 === 0 ? 1 : 0) - (i === 2 ? 1 : 0))) })),
        ...well.map((itemCode, i) => ({ itemCode, value: Math.min(5, 2 + Math.floor(step / 4) + (i % 2)) })),
      ],
    });
  }

  progress('Food trials and rules');
  const cleared = await createFoodTrial({ foodName: 'Oat porridge', startedAt: at(-40, 9), observationDays: 3 });
  await resolveFoodTrial(cleared.id, 'cleared', 'Nothing came up over the three days.');
  await tick();
  const flagged = await createFoodTrial({ foodName: 'Cow\'s milk', startedAt: at(-20, 9), observationDays: 3 });
  await resolveFoodTrial(flagged.id, 'flagged', 'Bloated both afternoons.');
  await tick();
  const sourdough = await createFoodTrial({ foodName: 'Sourdough bread', startedAt: at(-2, 9), observationDays: 3 });
  await scheduleFoodTrialCheckins({ foodTrialId: sourdough.id, foodName: 'Sourdough bread', firstScheduledFor: `${day(-2)}T20:00`, observationDays: 3 });
  await tick();
  const eggs = await createFoodTrial({ foodName: 'Eggs', startedAt: at(-12, 9), observationDays: 3, design: 'stepped' });
  await recordTrialStep(eggs.id, 'small');
  await recordTrialStep(eggs.id, 'medium');
  await tick();
  await createTrialSeries({
    name: 'Nightshades, one at a time',
    observationDays: 3,
    conditionCode: 'hashimotos',
    foods: [{ foodName: 'Tomato' }, { foodName: 'Sweet pepper' }, { foodName: 'Potato' }],
  });

  for (const [foodName, verdict, note] of [
    ['Oat porridge', 'safe', 'Cleared in a trial.'],
    ['Sweet potato', 'safe', null],
    ['Cow\'s milk', 'avoid', 'Bloated both afternoons of the trial.'],
    ['Sourdough bread', 'unsure', 'Trial running.'],
  ] as const) {
    await setMySafeFood({ foodName, verdict, note });
  }
  await setUserNutrientTargetOverride('magnesium', 420, null);
  // More protein on the two workout days.
  await setUserNutrientWeekdayTarget('protein', 1, 110, null);
  await setUserNutrientWeekdayTarget('protein', 4, 110, null);
}

// ---------------------------------------------------------------------------
// Body: labs, weight, blood pressure, steps, exercise, therapy.

async function fillBody(progress: (step: string) => void): Promise<void> {
  progress('Lab results');
  const psa = await addOwnLabTest('PSA', 'ng/mL');
  const draws: [number, [string, number, string, number, number][]][] = [
    [-145, [['tsh', 6.4, 'mIU/L', 0.4, 4.5], ['free_t4', 0.85, 'ng/dL', 0.8, 1.8], ['free_t3', 2.4, 'pg/mL', 2.0, 4.4], ['tpo_ab', 340, 'IU/mL', 0, 35], ['ferritin', 28, 'ng/mL', 15, 150], ['vitamin_d_test', 21, 'ng/mL', 30, 100], [psa, 3.9, 'ng/mL', 0, 4]]],
    [-90, [['tsh', 4.6, 'mIU/L', 0.4, 4.5], ['free_t4', 1.0, 'ng/dL', 0.8, 1.8], ['free_t3', 2.7, 'pg/mL', 2.0, 4.4], ['tpo_ab', 280, 'IU/mL', 0, 35], ['vitamin_d_test', 29, 'ng/mL', 30, 100]]],
    [-35, [['tsh', 2.9, 'mIU/L', 0.4, 4.5], ['free_t4', 1.2, 'ng/dL', 0.8, 1.8], ['free_t3', 3.0, 'pg/mL', 2.0, 4.4], ['tpo_ab', 210, 'IU/mL', 0, 35], ['ferritin', 41, 'ng/mL', 15, 150], ['vitamin_d_test', 36, 'ng/mL', 30, 100], [psa, 3.6, 'ng/mL', 0, 4]]],
  ];
  for (const [offset, values] of draws) {
    for (const [testCode, value, unit, low, high] of values) {
      await tick();
      await recordLabResult({ testCode, value, unit, labRangeLow: low, labRangeHigh: high, testedAt: day(offset), labName: 'Valley Lab' });
    }
  }

  progress('Weight, blood pressure and steps');
  for (let offset = -PAST; offset <= 0; offset += 1) {
    const n = Math.abs(offset);
    if (n % 3 === 0) {
      await tick();
      const wobble = ((n * 7) % 5 - 2) * 0.15;
      await recordBodyMeasurement({ loggedAt: at(offset, 7, 5), measurementType: 'weight', value: Math.round((88.5 - (PAST - n) * 0.02 + wobble) * 10) / 10, unit: 'kg' });
    }
    if (n % 7 === 1) {
      for (const [type, value] of [['blood_pressure_systolic', 134 - Math.floor((PAST - n) / 20) + (n % 3)], ['blood_pressure_diastolic', 86 - Math.floor((PAST - n) / 30)]] as const) {
        await tick();
        await recordBodyMeasurement({ loggedAt: at(offset, 8, 0), measurementType: type, value, unit: 'mmHg' });
      }
    }
    if (offset < 0) await recordStepCount(day(offset), 4200 + ((n * 37) % 9) * 650, 'manual');
  }

  progress('Exercise and therapy');
  const kinds = ['walking', 'yoga', 'swimming', 'strength'];
  for (let offset = -PAST; offset <= 0; offset += 1) {
    const n = Math.abs(offset);
    if (n % 7 === 0 || n % 7 === 2 || n % 7 === 4) {
      await tick();
      await recordExercise({ loggedAt: at(offset, 17, 30), exerciseType: cycle(kinds, n), durationMinutes: 25 + (n % 4) * 10, intensity: n % 3 === 0 ? 'moderate' : 'light' });
    }
  }
  progress('Workouts and exercise plans');
  const workout = await createWorkout('Back and legs', 'Gentle, for the lower back.');
  const steps: [string, number, number | null, number | null][] = [
    ['glute-bridge', 3, 12, null],
    ['sit-to-stand', 3, 10, null],
    ['wall-squat', 2, null, 30],
    ['calf-raise', 2, 15, null],
  ];
  const stepIds: string[] = [];
  for (const [exerciseId, sets, reps, seconds] of steps) {
    stepIds.push(await addWorkoutStep(workout, { source: 'library', exerciseId, sets, reps, seconds, perSide: false, weight: null, weightUnit: null, restSeconds: 45, note: null }));
  }
  await saveExercisePlan(null, {
    workoutId: workout,
    activity: '',
    startsOn: day(-PAST + 7),
    atTime: '17:30',
    minutes: '25',
    repeat: { type: 'weekly', weekdays: [1, 4], endType: 'indefinite' },
    remind: false,
    note: '',
  });
  const walkPlan = await saveExercisePlan(null, {
    workoutId: null,
    activity: 'Walk by the river',
    startsOn: day(-PAST + 3),
    atTime: '07:30',
    minutes: '30',
    repeat: { type: 'weekly', weekdays: [6], endType: 'indefinite' },
    remind: false,
    note: '',
  });
  const walk = await getExercisePlan(walkPlan);
  for (let offset = -PAST + 7; offset <= 0; offset += 1) {
    const weekday = dayFrom(offset).getDay();
    const n = Math.abs(offset);
    if ((weekday === 1 || weekday === 4) && n % 5 !== 2) {
      await tick();
      await saveWorkoutSession({
        workoutId: workout,
        workoutName: 'Back and legs',
        startedAt: iso(offset, 17, 30),
        finishedAt: iso(offset, 17, 55),
        minutes: 25,
        intensity: 'light',
        notes: '',
        note: null,
        sets: steps.flatMap(([exerciseId, sets, reps, seconds], index) =>
          Array.from({ length: sets }, (_, s) => ({
            stepId: stepIds[index],
            exerciseName: exerciseId.replace(/-/g, ' '),
            setNumber: s + 1,
            side: null,
            measure: reps === null ? ('time' as const) : ('reps' as const),
            plannedReps: reps,
            plannedSeconds: seconds,
            plannedWeight: null,
            weightUnit: null,
            status: n % 6 === 0 && s === sets - 1 ? ('skipped' as const) : ('done' as const),
            reps,
            seconds,
            weight: null,
          })),
        ),
      });
    }
    if (walk && weekday === 6 && n % 3 !== 1) await markPlanDone(walk, 'Walk by the river', day(offset));
  }

  for (let offset = -PAST + 10; offset <= 0; offset += 21) {
    await tick();
    await createTherapySession({ performedAt: at(offset, 11), therapyType: 'physical_therapy', practitioner: 'Coastline Physio', bodyFocus: 'Lower back', durationMinutes: 45, cost: 60 });
  }
}

// ---------------------------------------------------------------------------
// Meds and supplements, appointments, rules.

async function fillMeds(progress: (step: string) => void): Promise<void> {
  progress('Medicines and doses');
  const levo = await createPrescriptionTreatment({ name: 'Levothyroxine', genericName: 'levothyroxine', doseAmount: 75, doseUnit: 'mcg', frequency: 'once daily' });
  await tick();
  const tamsulosin = await createPrescriptionTreatment({ name: 'Tamsulosin', genericName: 'tamsulosin', doseAmount: 0.4, doseUnit: 'mg', frequency: 'once daily' });
  await tick();
  const selenium = await createSupplementTreatment({ name: 'Selenium', unitsPerDay: 1, servingUnitLabel: 'capsule', ingredients: [{ nutrientCode: 'selenium', supplementForm: 'selenomethionine', amountPerUnit: 200, unit: 'mcg' }] });
  await tick();
  const vitD = await createSupplementTreatment({ name: 'Vitamin D3', unitsPerDay: 1, servingUnitLabel: 'softgel', ingredients: [{ nutrientCode: 'vitamin_d', amountPerUnit: 50, unit: 'mcg' }] });
  await tick();
  const magnesium = await createSupplementTreatment({ name: 'Magnesium glycinate', unitsPerDay: 2, servingUnitLabel: 'capsule', ingredients: [{ nutrientCode: 'magnesium', supplementForm: 'glycinate', amountPerUnit: 120, unit: 'mg' }] });

  const total = PAST + FUTURE + 1;
  const repeat = { type: 'daily' as const, endType: 'count' as const, count: total };
  await schedulePrescriptionDose({ treatmentId: levo, title: 'Levothyroxine', scheduledFor: at(-PAST, 6, 30), repeat });
  await schedulePrescriptionDose({ treatmentId: tamsulosin, title: 'Tamsulosin', scheduledFor: at(-PAST + 40, 21, 0), repeat: { ...repeat, count: total - 40 } });
  await scheduleSupplementDose({ treatmentId: selenium, title: 'Selenium', scheduledFor: at(-PAST, 12, 45), repeat });
  await scheduleSupplementDose({ treatmentId: vitD, title: 'Vitamin D3', scheduledFor: at(-PAST + 60, 12, 45), repeat: { ...repeat, count: total - 60 } });
  await scheduleSupplementDose({ treatmentId: magnesium, title: 'Magnesium glycinate', scheduledFor: at(-PAST, 21, 30), repeat });

  await saveTreatmentSupply(levo, { onHand: 24, unit: 'tablets', perDose: 1, leadDays: 7 });
  await saveTreatmentSupply(tamsulosin, { onHand: 9, unit: 'capsules', perDose: 1, leadDays: 7 });
  await saveTreatmentSupply(selenium, { onHand: 52, unit: 'capsules', perDose: 1, leadDays: 10 });
  await saveTreatmentSupply(vitD, { onHand: 80, unit: 'softgels', perDose: 1, leadDays: 10 });
  await saveTreatmentSupply(magnesium, { onHand: 30, unit: 'capsules', perDose: 2, leadDays: 10 });
  // Levothyroxine keeps home time when travelling, since the gap before
  // breakfast is what matters.
  await saveTravelMode(levo, 'home');

  // Past doses read as taken at their time, except a missed one every so
  // often, the way a real record has gaps.
  const db = await getDatabase();
  const pastDoses = await db.getAllAsync<{ id: string; scheduledFor: string }>(
    `SELECT id, scheduled_for AS scheduledFor FROM schedule_items
      WHERE item_type IN ('prescription', 'supplement') AND scheduled_for < ? ORDER BY scheduled_for`,
    at(0, 0, 0),
  );
  for (const [index, dose] of pastDoses.entries()) {
    if (index % 23 === 7) continue;
    await db.runAsync(`UPDATE schedule_items SET status = 'logged', updated_at = ? WHERE id = ?`, new Date(dose.scheduledFor).toISOString(), dose.id);
  }

  progress('Appointments and rules');
  const appointments: [number, string, string, string][] = [
    [-120, 'Endocrinology', 'Dr. Ana Ruiz', 'Discuss TSH and starting dose.'],
    [-88, 'Urology', 'Dr. Lee Park', 'Urinary symptoms at night, PSA result.'],
    [-60, 'Primary care', 'Dr. Mia Chen', 'Blood pressure check.'],
    [-30, 'Endocrinology', 'Dr. Ana Ruiz', 'Review the latest labs.'],
    [-8, 'Dentist', 'Bay Dental', 'Cleaning.'],
    [9, 'Urology', 'Dr. Lee Park', 'Follow-up on tamsulosin.'],
    [24, 'Endocrinology', 'Dr. Ana Ruiz', 'Bring the last two lab reports.'],
  ];
  for (const [offset, title, provider, notes] of appointments) {
    await tick();
    const id = await scheduleAppointment({ title, scheduledFor: at(offset, 10, 30), appointmentType: title === 'Dentist' ? 'dentist' : 'doctor', location: 'Main Street Clinic', providerName: provider, notes });
    if (offset < 0) await db.runAsync(`UPDATE schedule_items SET status = 'completed', updated_at = ? WHERE id = ?`, iso(offset, 11, 30), id);
  }

  await tick();
  await createPersonalRule({ description: 'Take levothyroxine with water only and wait an hour before coffee or food.', source: 'doctor', linkType: 'treatment', linkValue: levo, linkLabel: 'Levothyroxine' });
  await tick();
  await createPersonalRule({ description: 'Keep selenium and vitamin D at lunch, well away from the morning thyroid dose.', source: 'self', linkType: 'none' });
  await tick();
  await createPersonalRule({ description: 'No fluids after 8 in the evening on work nights.', source: 'doctor', linkType: 'treatment', linkValue: tamsulosin, linkLabel: 'Tamsulosin' });
}

// ---------------------------------------------------------------------------
// Kitchen, grocery, fermentation.

async function fillKitchen(progress: (step: string) => void): Promise<void> {
  progress('Kitchen and grocery list');
  const items: [string, number, string, string, string, number | null][] = [
    ['Eggs', 10, 'count', 'Dairy & Eggs', 'Fridge', 12],
    ['Spinach, raw', 200, 'g', 'Vegetables', 'Fridge', 4],
    ['Brown rice', 1.5, 'kg', 'Grains', 'Pantry', null],
    ['Rolled oats', 800, 'g', 'Grains', 'Pantry', null],
    ['Chickpeas, dried', 1, 'kg', 'Legumes', 'Pantry', null],
    ['Chicken thighs', 900, 'g', 'Meat', 'Freezer', 60],
    ['Frozen berries', 500, 'g', 'Fruit', 'Freezer', 90],
    ['Olive oil', 750, 'ml', 'Oils', 'Pantry', null],
    ['Brazil nuts', 200, 'g', 'Nuts & Seeds', 'Pantry', 120],
    ['Plain yogurt', 500, 'g', 'Dairy & Eggs', 'Fridge', 6],
  ];
  for (const [foodName, quantity, unit, category, location, useIn] of items) {
    await tick();
    await addKitchenItem({ foodName, quantity, unit, category, location, useBy: useIn === null ? null : day(useIn), source: 'purchase' });
  }
  await tick();
  await addKitchenItem({ foodName: 'Dish soap', quantity: 1, unit: 'bottle', kind: 'non_food', location: 'Under the sink' });

  const list = await createHandGroceryList();
  for (const [foodName, quantity, unit, category] of [
    ['Sweet potatoes', 1, 'kg', 'Vegetables'],
    ['Avocados', 3, 'count', 'Fruit'],
    ['Salmon fillets', 2, 'count', 'Fish'],
    ['Lemons', 4, 'count', 'Fruit'],
    ['Almond butter', 1, 'jar', 'Nuts & Seeds'],
  ] as const) {
    await tick();
    await addGroceryListItem(list, { foodName, quantity, unit, category });
  }

  progress('Fermentation batches');
  const db = await getDatabase();
  const ferments = await db.getAllAsync<{ id: string; name: string }>('SELECT id, name FROM fermentations ORDER BY name');
  for (const [index, ferment] of ferments.entries()) {
    await tick();
    const batch = await startFermentationBatch({ fermentationId: ferment.id, fermentationName: ferment.name });
    const started = -50 + index * 14;
    await db.runAsync('UPDATE fermentation_batches SET started_at = ?, created_at = ? WHERE id = ?', iso(started, 10), iso(started, 10), batch).catch(() => undefined);
    // The batches started long enough ago have been bottled.
    if (started <= -14) {
      await tick();
      await recordFermentationHarvest({ fermentationBatchId: batch, fermentationId: ferment.id, drinkName: ferment.name, readyAt: iso(started + 10, 18), quantity: 1.5, unit: 'L' });
    }
  }
}

// ---------------------------------------------------------------------------
// Money and work.

async function fillMoney(progress: (step: string) => void): Promise<void> {
  progress('Accounts, bills and spending');
  const checking = await upsertAccount({ name: 'Checking', kind: 'checking', balance: 2840 });
  await upsertAccount({ name: 'Savings', kind: 'savings', balance: 6200 });
  await upsertAccount({ name: 'Credit card', kind: 'credit_card', balance: 640, apr: 22.9, minimumPayment: 35 });

  const bills: [string, string, number, number][] = [
    ['Rent', 'housing', 1350, 1],
    ['Electricity', 'utilities', 85, 12],
    ['Internet', 'utilities', 60, 18],
    ['Phone', 'utilities', 45, 22],
    ['Car insurance', 'transport', 110, 5],
  ];
  for (const [name, category, amount, dayOfMonth] of bills) {
    await tick();
    await createRecurring({ direction: 'expense', name, category, amount, rule: { kind: 'dayOfMonth', months: 1, day: dayOfMonth }, autopay: true });
  }
  await tick();
  await createRecurring({ direction: 'income', name: 'Pay', category: 'pay', amount: 1900, rule: { kind: 'twiceMonthly', day1: 1, day2: 15 } });

  for (const [category, limit] of [['groceries', 600], ['eating_out', 120], ['health', 200], ['fun', 100]] as const) await setBudget(category, limit);

  const spend: [string, number, string][] = [
    ['groceries', 92, 'Weekly shop'],
    ['groceries', 38, 'Market vegetables'],
    ['eating_out', 24, 'Lunch out'],
    ['health', 18, 'Pharmacy'],
    ['transport', 46, 'Fuel'],
    ['fun', 15, 'Book'],
  ];
  for (let offset = -PAST; offset <= 0; offset += 1) {
    const n = Math.abs(offset);
    if (n % 3 !== 0) continue;
    const [category, amount, description] = cycle(spend, n / 3);
    await tick();
    await createEntry({ occurredOn: day(offset), direction: 'expense', amount: amount + (n % 7), category, description, paidFromAccountId: checking });
  }
  for (let offset = -PAST; offset <= 0; offset += 1) {
    const d = dayFrom(offset);
    if (d.getDate() === 1 || d.getDate() === 15) {
      await tick();
      await createEntry({ occurredOn: day(offset), direction: 'income', amount: 1900, category: 'pay', description: 'Pay' });
    }
  }

  const goal = await createGoal({ name: 'Raised garden beds', reason: 'Grow more of what we eat.', targetDate: day(FUTURE + 60) });
  const cost = await addGoalCost({ goalId: goal, kind: 'money', label: 'Lumber and soil', target: 600 });
  for (const [offset, amount] of [[-120, 100], [-90, 80], [-60, 120], [-30, 90], [-5, 60]] as const) {
    await tick();
    await addGoalContribution({ costId: cost, occurredOn: day(offset), amount });
  }

  progress('Insurance and medical bills');
  const year = new Date().getFullYear();
  await upsertInsurancePlan({ name: 'Blue Valley PPO', yearStart: `${year}-01-01`, deductible: 1500, outOfPocketMax: 5000 });
  await upsertHealthAccount({ kind: 'hsa', planYear: String(year), contributed: 1800, spent: 420 });
  const medBills: [number, string, string, number, number, number, number, 'unpaid' | 'paid' | 'disputed' | 'denied', string][] = [
    [-120, 'Main Street Clinic', 'Endocrinology visit', 280, 190, 150, 40, 'paid', 'hashimotos'],
    [-145, 'Valley Lab', 'Thyroid panel and PSA', 420, 210, 168, 42, 'paid', 'hashimotos'],
    [-88, 'Main Street Clinic', 'Urology visit', 310, 205, 164, 41, 'paid', 'prostate_health'],
    [-35, 'Valley Lab', 'Thyroid panel and PSA', 420, 210, 0, 210, 'disputed', 'hashimotos'],
    [-30, 'Main Street Clinic', 'Endocrinology visit', 280, 190, 150, 40, 'unpaid', 'hashimotos'],
  ];
  for (const [offset, provider, description, billed, allowed, insurancePaid, youOwe, status, conditionCode] of medBills) {
    await tick();
    await createMedicalBill({ serviceDate: day(offset), provider, description, billed, allowed, insurancePaid, youOwe, status, conditionCode });
  }

  progress('Work');
  const pto = await upsertBenefit({ name: 'Paid time off', kind: 'days', total: 18, used: 0, resets: 'yearly' });
  await recordBenefitUse(pto, 3);
  const wellness = await upsertBenefit({ name: 'Wellness allowance', kind: 'allowance', total: 500, used: 0, resets: 'yearly' });
  await recordBenefitUse(wellness, 120);
  await upsertBenefit({ name: 'Counselling sessions', kind: 'sessions', total: 6, used: 2, resets: 'yearly' });
  await upsertBenefit({ name: 'Retirement match', kind: 'match', resets: 'never' });
  for (let offset = -PAST; offset <= 0; offset += 7) {
    const n = Math.abs(offset);
    await saveWorkCheckin({ date: day(offset), autonomy: 3 + (n % 2), competence: 4, relatedness: 2 + (n % 3), drain: n % 4 === 0 ? 4 : 2, note: n % 4 === 0 ? 'Open-plan office was loud all week.' : undefined });
  }
}

// ---------------------------------------------------------------------------
// Life: upkeep, routines, checks, todos, counters, emergency, capture, family.

async function fillLife(progress: (step: string) => void): Promise<void> {
  progress('Upkeep');
  const workshop = await createUpkeepPlace('Workshop');
  const upkeep: Parameters<typeof upsertUpkeepItem>[0][] = [
    { name: 'Replace furnace filter', category: 'home', cadence: 'recurring', intervalMonths: 3, lastDoneOn: day(-100) },
    { name: 'Smoke alarm batteries', category: 'home', cadence: 'recurring', intervalMonths: 12, lastDoneOn: day(-200) },
    { name: 'Oil change', category: 'vehicle', cadence: 'recurring', intervalMonths: 6, lastDoneOn: day(-140), place: workshop },
    { name: 'Driving licence', category: 'document', cadence: 'expires', expiresOn: day(75), renewable: true },
    { name: 'Passport', category: 'document', cadence: 'expires', expiresOn: day(400), renewable: true },
  ];
  for (const item of upkeep) {
    await tick();
    const id = await upsertUpkeepItem(item);
    if (item.name === 'Replace furnace filter') await markUpkeepDone(id, day(-10));
    if (item.name === 'Oil change') await markUpkeepDone(id, day(-50));
  }

  progress('Routines and checks');
  const db = await getDatabase();
  const pills = await createDoneCheck('Morning pill', 'daily');
  const backDoor = await createDoneCheck('Back door locked', 'daily');
  const bins = await createDoneCheck('Bins out', 'weekly');
  if (!pills || !backDoor || !bins) throw new Error('Test data: a check could not be made.');
  const routines: [string, string, string[], string | null][] = [
    ['Morning', 'morning', ['Levothyroxine with water', 'Shower', 'Check the day\'s calendar', 'Breakfast after an hour'], pills],
    ['Bedtime', 'bedtime', ['Back door locked', 'Phone on charge', 'Magnesium', 'Lights low by 10'], backDoor],
    ['Leaving the house', 'leaving', ['Keys', 'Wallet', 'Phone', 'Headphones'], null],
  ];
  const routineIds: [string, string, number][] = [];
  for (const [name, occasion, steps, checkId] of routines) {
    const id = await createRoutine(name, occasion);
    if (!id) continue;
    for (const [i, text] of steps.entries()) await addRoutineStep(id, text, null, i === 0 ? checkId : null, i === 1 ? 10 : null);
    routineIds.push([id, name, steps.length]);
  }
  for (let offset = -PAST; offset <= 0; offset += 1) {
    const n = Math.abs(offset);
    if (n % 9 !== 4) await markDoneCheck(pills, 'tap', null, iso(offset, 6, 30));
    if (n % 6 !== 2) await markDoneCheck(backDoor, 'tap', null, iso(offset, 22, 15));
    if (dayFrom(offset).getDay() === 2) await markDoneCheck(bins, 'tap', null, iso(offset, 19, 0));
    for (const [id, name, total] of routineIds) {
      if (name === 'Leaving the house' && dayFrom(offset).getDay() % 6 === 0) continue;
      if (n % 5 === 3 && name === 'Bedtime') continue;
      const runId = await startRoutineRun(id, name, total, null);
      const done = n % 8 === 0 ? total - 1 : total;
      await markRoutineRunProgress(runId, { stepsDone: done, stepsSkipped: total - done, step: null, position: total });
      const hour = name === 'Morning' ? 6 : name === 'Bedtime' ? 22 : 8;
      await db.runAsync('UPDATE routine_runs SET started_at = ? WHERE id = ?', iso(offset, hour, 20), runId);
    }
  }
  await db.runAsync('UPDATE routines SET created_at = ?', iso(-PAST - 2, 9)).catch(() => undefined);
  await db.runAsync('UPDATE done_checks SET created_at = ?', iso(-PAST - 2, 9)).catch(() => undefined);
  // The two checks chosen for today on Home.
  await pickForToday(day(0), pills);
  await pickForToday(day(0), bins);

  progress('To-dos and counters');
  const todos: [string, 'personal' | 'work', number | null, boolean][] = [
    ['Book the eye test', 'personal', -40, true],
    ['Renew library card', 'personal', -12, true],
    ['Send the quarterly report', 'work', -3, true],
    ['Call about the disputed lab bill', 'personal', 2, false],
    ['Order more tamsulosin', 'personal', 4, false],
    ['Sort the garage shelves', 'personal', null, false],
    ['Ask for a quieter desk', 'work', 10, false],
  ];
  for (const [title, area, due, done] of todos) {
    await tick();
    const id = await addTodo({ title, area, dueOn: due === null ? null : day(due), repeat: null });
    if (done && due !== null) await markTodoDone(id, day(due));
  }
  await tick();
  await addTodo({ title: 'Water the house plants', area: 'personal', dueOn: day(1), repeat: { type: 'weekly', weekdays: [dayFrom(1).getDay()] } });
  await addCountdown({ name: 'Holiday at the coast', about: 'Booked and paid.', startedOn: day(-20), days: 20 + 45 });
  await tick();
  await addCountdown({ name: 'Three months on tamsulosin', about: 'Recheck with the urologist.', startedOn: day(-110), days: 90 });

  progress('Emergency card and notes');
  await saveEmergencyProfile({
    drugAllergies: 'Sulfa drugs',
    bloodType: 'O+',
    doctorName: 'Dr. Mia Chen',
    doctorPhone: '555-0142',
    preferredHospital: 'Valley General',
    language: 'English',
    otherNotes: 'Autistic: please speak plainly and give a moment to answer. Loud rooms make it harder to talk.',
  });
  await upsertEmergencyContact({ name: 'Jordan Test', relationship: 'Sister', phone: '555-0199', primary: true });
  await upsertEmergencyContact({ name: 'Riley Test', relationship: 'Friend', phone: '555-0177' });

  const notes: [string, number, 'typed' | 'spoken', Parameters<typeof setCaptureNoteDestination>[1]][] = [
    ['Spare house key is in the blue tin on the shelf by the door', -130, 'typed', 'place'],
    ['Buy more Brazil nuts', -40, 'spoken', 'shopping'],
    ['Ask Dr. Ruiz whether to take selenium with food', -33, 'spoken', 'health'],
    ['Winter tyres are in the garage loft', -70, 'typed', 'place'],
    ['Idea: a quiet corner in the garden with a bench', -15, 'typed', 'garden'],
    ['Electric bill looked high this month', -6, 'spoken', 'money'],
    ['Look up a weighted blanket', -1, 'typed', null],
  ];
  for (const [text, offset, source, destination] of notes) {
    await tick();
    const id = await createCaptureNote(text, source, dateOf(offset, 14));
    if (id && destination) await setCaptureNoteDestination(id, destination);
  }
  for (const [offset, text] of [[3, 'Pick up prescription'], [12, 'Lisa\'s birthday dinner'], [-5, 'Took the afternoon off']] as const) {
    await tick();
    await addCalendarNote(at(offset, 9), text);
  }

  progress('Family');
  await addFamilyMember({ name: 'Jordan', relationship: 'sister', conditionCodes: ['hashimotos'], includeInMealPlan: false });
  await tick();
  await addFamilyMember({ name: 'Pat', relationship: 'father', conditionCodes: ['prostate_health', 'type_2_diabetes'], includeInMealPlan: false });
  await tick();
  await addFamilyMember({ name: 'Casey', relationship: 'partner', conditionCodes: [], includeInMealPlan: true, allergies: ['Peanuts'] });
}

// ---------------------------------------------------------------------------
// Garden.

const CROPS: [string, number, string, number, number][] = [
  // name, food_id, source, days after planting to harvest, area index
  ['Kale, raw', 910, 'USDA', 55, 0],
  ['Tomato raw', 10670, 'Germany_BLS', 75, 0],
  ['Beans, snap, green, raw', 2450, 'USDA', 55, 0],
  ['Garlic, raw', 1719, 'USDA', 200, 1],
  ['Spinach, raw', 951, 'USDA', 40, 1],
  ['Carrot raw', 10676, 'Germany_BLS', 70, 1],
  ['Basil raw', 10647, 'Germany_BLS', 30, 2],
  ['Lettuce, cos, raw', 27854, 'Australia_AFCD', 45, 2],
  ['Strawberry raw', 10388, 'Germany_BLS', 90, 1],
  ['Zucchini, fruit, raw', 8690, 'Japan_MEXT', 50, 0],
];

async function fillGarden(progress: (step: string) => void): Promise<void> {
  progress('Garden areas and plantings');
  const plots: string[] = [];
  plots.push(await createGardenPlot({ name: 'Back bed', locationType: 'outdoor', sunlightExposure: 'full_sun', length: 4, width: 1.2, sizeUnit: 'meters', zone: '9b', growingMedium: 'Raised bed, compost and loam' }));
  await tick();
  plots.push(await createGardenPlot({ name: 'Side bed', locationType: 'outdoor', sunlightExposure: 'partial_shade', length: 3, width: 1, sizeUnit: 'meters', zone: '9b', growingMedium: 'In-ground, mulched' }));
  await tick();
  plots.push(await createGardenPlot({ name: 'Kitchen shelf', locationType: 'indoor', length: 1, width: 0.4, sizeUnit: 'meters', growingMedium: 'Pots', lightSource: 'led' }));

  const plantings: { id: string; plot: string; name: string; foodId: number; source: string; planted: number; ready: number }[] = [];
  for (const [i, [name, foodId, source, grow, plotIndex]] of CROPS.entries()) {
    const planted = -140 + i * 9;
    const plot = plots[plotIndex];
    await tick();
    const id = await createGardenPlanting({
      plotId: plot,
      foodId,
      source,
      foodName: name,
      plantedAt: day(planted),
      expectedHarvestStart: day(planted + grow),
      expectedHarvestEnd: day(planted + grow + 40),
    });
    plantings.push({ id, plot, name, foodId, source, planted, ready: planted + grow });
  }
  await tick();
  await createGardenPlanting({ plotId: plots[1], foodId: 961, source: 'USDA', foodName: 'Squash, winter, acorn, raw', plantedAt: day(14), status: 'planned' });
  await tick();
  await createGardenPlanting({ plotId: plots[0], foodId: 2597, source: 'USDA', foodName: 'Peppers, sweet, red, raw', plantedAt: day(20), status: 'planned' });

  progress('Watering, harvests and tasks');
  const kinds = ['watered', 'weeded', 'mulched', 'fed', 'pest_seen', 'pest_handled', 'staked', 'thinned'] as const;
  for (const [i, p] of plantings.entries()) {
    for (let offset = p.planted + 3; offset <= 0; offset += 6) {
      await addPlantingEvent({ plantingId: p.id, plotId: p.plot, occurredOn: day(offset), kind: cycle(kinds, i + offset) });
    }
    for (let offset = p.ready; offset <= 0; offset += 7) {
      await tick();
      const harvest = await recordGardenHarvest({ plantingId: p.id, plotId: p.plot, foodId: p.foodId, source: p.source, foodName: p.name, harvestedAt: day(offset), quantity: 150 + ((offset * 13) % 5) * 60, unit: 'g' });
      if (offset % 2 === 0) await recordHarvestUsage(harvest, 100);
      else if (i === 1 && offset % 3 === 0) {
        await recordDisposition({ occurredOn: day(offset), kind: 'given', inventoryId: `garden:${harvest}`, foodName: p.name, quantityGiven: 100, unit: 'g', withWhom: 'Jordan', recipientKind: 'person' });
      }
    }
  }
  for (let offset = -PAST + 5; offset <= FUTURE; offset += 10) {
    await tick();
    await scheduleGardenTask({ title: offset % 20 === 5 ? 'Feed with compost tea' : 'Check for slugs', scheduledFor: at(offset, 8), plotId: cycle(plots, offset) });
  }

  progress('Compost, seeds and costs');
  const pile = await createCompostPile({ name: 'Bay one', kind: 'bin', startedOn: day(-PAST), location: 'Behind the shed' });
  for (let offset = -PAST; offset <= 0; offset += 5) {
    const n = Math.abs(offset);
    await addCompostEvent({ pileId: pile, occurredOn: day(offset), kind: n % 15 === 0 ? 'turned' : 'added', material: n % 2 === 0 ? 'Kitchen scraps' : 'Dry leaves', materialClass: n % 2 === 0 ? 'green' : 'brown', amount: 3, unit: 'L', moisture: 'damp' });
  }
  for (const [name, foodId, source, variety, days] of [
    ['Tomato raw', 10670, 'Germany_BLS', 'San Marzano', 1460],
    ['Kale, raw', 910, 'USDA', 'Lacinato', 1460],
    ['Basil raw', 10647, 'Germany_BLS', 'Genovese', 1095],
  ] as const) {
    await saveSeedPacket(newSeedPacketId(), { foodId, source, foodName: name, variety, fromWhere: 'Local seed library', packedOn: day(-200), amount: 40, amountUnit: 'seeds', packetDays: days, notes: null });
    await tick();
  }
  const costs: [number, number, string, Parameters<typeof recordGrowingCost>[0]['kind'], number][] = [
    [-148, 24, 'Seeds', 'seeds_starts', 0],
    [-146, 60, 'Compost delivery', 'soil_amendments', 0],
    [-120, 18, 'Mulch', 'soil_amendments', 1],
    [-90, 35, 'Hand tools', 'tools_equipment', 0],
    [-60, 12, 'Netting', 'pest_disease', 1],
  ];
  for (const [offset, amount, description, kind, plotIndex] of costs) {
    await tick();
    await recordGrowingCost({ occurredOn: day(offset), amount, description, kind, plotId: plots[plotIndex] });
  }
  await addGrowEquipment({ plotId: plots[2], kind: 'light', name: 'Shelf grow light', quantity: 1, watts: 36, hoursPerDay: 14, onTimer: true, lightType: 'led', purchase: { amount: 45, occurredOn: day(-140) } });
  for (let offset = -PAST; offset <= 0; offset += 4) {
    const n = Math.abs(offset);
    await addGardenReading({ plotId: plots[0], plantingId: null, measurement: 'soil_moisture', value: 30 + (n % 5) * 4, unit: '%', measuredOn: day(offset) });
    if (n % 8 === 0) await addGardenReading({ plotId: plots[0], plantingId: null, measurement: 'rain', value: (n % 3) * 4, unit: 'mm', measuredOn: day(offset) });
  }
  await addGardenCountdown({ plotId: plots[1], plantingId: plantings[3].id, name: 'Garlic ready to lift', startedOn: day(plantings[3].planted), days: 200 });
  const tomatoPlan = await addCropPlan('tomato', plots[0]);
  await recordCropStep(tomatoPlan, 'indoors', day(-30), 'prepped', day(-28));
  await addCropPlan('lettuce', plots[2]);

  progress('Seeds, layout and measuring');
  const db = await getDatabase();
  const seeds = await db.getAllAsync<{ id: string }>('SELECT id FROM garden_seeds ORDER BY id');
  for (const [i, seed] of seeds.entries()) {
    await addSeedTest({ seedId: seed.id, testedOn: day(-160 + i), sown: 10, sprouted: 7 + (i % 3) });
    await addSeedUse({ seedId: seed.id, plantingId: plantings[i]?.id ?? null, usedOn: day(-140 + i * 9), amount: 6 });
  }
  // Where each planting in the back bed sits, in centimetres on the 400 by
  // 120 bed: four patches along it, two rows deep.
  const backBed = plantings.filter((p) => p.plot === plots[0]);
  for (const [i, p] of backBed.entries()) {
    await saveLayoutPatch(plots[0], { plantingId: p.id, x: (i % 4) * 100, y: (Math.floor(i / 4) % 2) * 60, w: 100, h: 60 });
  }
  await saveMeasurePlan(plots[0], [
    { measurement: 'soil_moisture', scope: 'area' },
    { measurement: 'rain', scope: 'area' },
  ]);

  progress('Electricity and cost groups');
  // The shelf light added a little to each bill after it went in.
  for (let month = 0; month < 5; month += 1) {
    const start = -PAST - 30 + month * 30;
    await tick();
    await addElectricityBill({ periodStart: day(start), periodEnd: day(start + 29), kwh: month === 0 ? 410 : 432 + month * 2, amount: month === 0 ? 82 : 87 + month, beforeGrow: month === 0 });
  }
  const potting = await createGardenCostKind('Potting mix');
  if (potting) await recordGrowingCost({ occurredOn: day(-135), amount: 14, description: 'Potting mix', kind: potting, plotId: plots[2] });
  await saveGardenCostGroup({ name: 'The two outdoor beds', memberIds: [plots[0], plots[1]] });

  progress('Garden food on the plate');
  // Meals from the last month that the garden fed, the way the offer after
  // saving a meal records them.
  const recentMeals = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM meals WHERE eaten_at >= ? ORDER BY eaten_at DESC LIMIT 60',
    day(-30),
  );
  let fed = 0;
  for (const meal of recentMeals) {
    const offer = await getPlateOfferForMeal(meal.id);
    if (!offer || offer.offers.length === 0) continue;
    await keepPlateUses(meal.id, offer.offers, offer.usedOn);
    fed += 1;
    if (fed >= 6) break;
  }
}

// ---------------------------------------------------------------------------

/** Fills an empty database with the test person's five months behind and
 *  one month ahead. Takes several minutes; progress says which part. */
export async function fillTestData(onProgress: TestDataProgress): Promise<void> {
  const parts: [string, (progress: (step: string) => void) => Promise<void>][] = [
    ['About the person', async () => fillProfile()],
    ['Meals and water', fillMeals],
    ['Signals', fillSignals],
    ['Body', fillBody],
    ['Medicines', fillMeds],
    ['Kitchen', fillKitchen],
    ['Money and work', fillMoney],
    ['Life', fillLife],
    ['Garden', fillGarden],
  ];
  for (const [index, [label, run]] of parts.entries()) {
    onProgress(label, index, parts.length);
    await run((step) => onProgress(step, index, parts.length));
  }
  const db = await getDatabase();
  await db.runAsync('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)', TEST_DATA_FILLED_KEY, new Date().toISOString());
  onProgress('Done', parts.length, parts.length);
}

export async function isTestDataFilled(): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', TEST_DATA_FILLED_KEY);
  return !!row;
}
