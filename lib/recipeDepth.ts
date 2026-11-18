// Live, on-device version of the same real depth every curated recipe
// carries (safeForConditions, conditionCautions, dietTags, stage-advisory
// notes) -- 2026-08-25, direct instruction after being asked whether the
// Food builders wire into all of this the same way curated recipes do
// (they didn't): "The builders all absolutely must match the depth as is
// provided to the recipes, and it should happen every time the user
// creates anything." Piloted on Side Builder first, per direct follow-up:
// "Pilot it on Side Builder first, choice to create the report or not but
// both paths route to saving it" -- the computation below always runs
// either way; what's optional is only whether the person actually looks
// at a report of it before saving (see components/RecipeDepthReport.tsx).
//
// This is orchestration over already-real, already-live primitives, not
// new scoring logic: getFoodScoresForCondition/getFoodScores (this file's
// own already-established condition-aware queries), isFlaggedTier/
// tierSeverity (lib/sixDimensionsReference.ts, the same tier vocabulary
// every dimension scorecard in this app already uses), and
// getConditionStageAdvisory (lib/conditionStageAdvisory.ts, the same
// per-ingredient dispatcher every Food builder's live preview already
// calls for the 6 staged conditions). The one real exception: the tier-
// caution wording and diet-tag rule constants below are a second,
// faithful copy of scripts/compute_recipe_condition_data.js's and
// scripts/compute_recipe_diet_tags.js's own constants, since a plain Node
// script can't import a .ts module without its own build step. A future
// change to either rule set needs updating in both places -- named
// directly here rather than hidden, matching the same accepted
// duplication this project already carries between those two scripts and
// their own real TS sources.

import { getConditionStages, getFoodScores, getFoodScoresForCondition, type MealIngredientInput } from './db';
import { getConditionStageAdvisory, type ConditionStageAdvisory } from './conditionStageAdvisory';
import { isFlaggedTier, tierSeverity, type TierSeverity } from './sixDimensionsReference';
import type { RecipeDietTag } from './digest/types';

// One real dimension's own worst severity for a condition, across this
// whole dish -- 2026-08-25, direct correction: "for Hashimoto's it should
// show how it does not cause problems or does cause them for the D1-D6."
// "D1-D6" is genuinely Hashimoto's own real 6-dimension framework, checked
// directly against the live database rather than assumed: every other
// tracked condition has its own, differently-named real dimension set (2
// to 5 real dimensions, not 6, and never called "D1-D6") -- see
// computeDimensionBreakdown's own comment for the full reasoning, this
// type is deliberately generic across whichever real dimension labels a
// given condition actually owns.
export type DimensionSeverity = { dimension: string; severity: TierSeverity };

export type RecipeDepthResult = {
  safeForConditions: string[];
  conditionCautions: Record<string, { severity: 'yellow' | 'red'; note: string }>;
  dietTags: RecipeDietTag[];
  stageNotes: ConditionStageAdvisory[];
  // conditionCode -> that condition's own real dimensions, each with this
  // dish's worst severity across every ingredient -- the data a per-
  // condition dimension chart (RecipeDepthReport's own DimensionRadar)
  // actually plots.
  dimensionBreakdown: Record<string, DimensionSeverity[]>;
};

// ---------------------------------------------------------------------
// Condition safety + cautions -- faithful port of the real logic in
// scripts/compute_recipe_condition_data.js (see that file's own header
// comment for the full reasoning behind severity tiers, near-universal
// exclusions, and absolute exclusions).

// Two sub-criteria that fire on roughly half of all 26,000+ foods in this
// database (a background signal, not a real per-dish concern) -- excluded
// from recipe-level cautions the same way the curated-recipe compute
// script already excludes them.
const NEAR_UNIVERSAL_SUB_CRITERIA = new Set(['Selenium & Zn synergy', 'Iron Presence']);

// Deliberately a short, named list: a condition where a flagged tier
// means "never actually safe," not "a matter of degree." Celiac's own
// relationship to gluten is the one real, established case today -- see
// compute_recipe_condition_data.js's own comment for why this app's other
// gluten/dairy flags (Hashimoto's included) stay ordinary cautions
// instead.
const ABSOLUTE_EXCLUSIONS: { conditionCode: string; subCriterion: string; tier: string }[] = [
  { conditionCode: 'celiac', subCriterion: 'Gluten', tier: 'High Risk' },
];

function isAbsoluteExclusion(conditionCode: string, subCriterion: string, tier: string): boolean {
  return ABSOLUTE_EXCLUSIONS.some(
    (exclusion) =>
      exclusion.conditionCode === conditionCode && exclusion.subCriterion === subCriterion && exclusion.tier === tier,
  );
}

const TIER_CAUTION_EXPLANATIONS: Record<string, string> = {
  Goitrogenic: 'Goitrogens can interfere with thyroid iodine uptake; cooking substantially reduces this for most foods.',
  'Use Carefully': 'This may need portion awareness or a doctor’s guidance.',
  'Excess Risk': 'Eating a lot of this could push the level above a healthy range.',
  'Mild Risk': 'A modest, generally minor concern.',
  'High Risk': 'A significant, well-documented concern.',
  Disruptive: 'This may work against or interfere with the process being measured.',
  High: 'A meaningfully high level for this measure.',
  'Very High': 'The highest tier used for this measure.',
  Inhibiting: 'This may reduce or block the process being measured.',
  Imbalanced: 'The ratio being measured skews unfavorably here.',
  Present: 'A measurable amount is present.',
  Moderate: 'A moderate level for this measure.',
  Natural: 'A naturally occurring form, treated differently from an industrially produced one.',
};

const TIER_CAUTION_QUALIFIERS: { pattern: RegExp; phrase: string }[] = [
  { pattern: /\(Raw\)/i, phrase: ' in its raw form' },
  { pattern: /\(Cooked\)/i, phrase: ' after cooking' },
];

function buildCautionSentence(baseName: string, subCriterion: string, tier: string): string {
  const baseWord = tier.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const explanation = TIER_CAUTION_EXPLANATIONS[baseWord] ?? `Rated ${tier} for this factor.`;
  const alreadyNamesForm = /\((raw|cooked)\)/i.test(baseName);
  const qualifier = alreadyNamesForm ? '' : (TIER_CAUTION_QUALIFIERS.find(({ pattern }) => pattern.test(tier))?.phrase ?? '');
  return `${baseName}: rated ${tier} for ${subCriterion.toLowerCase()}${qualifier}. ${explanation}`;
}

function isNoteworthyForRecipe(subCriterion: string, tier: string): boolean {
  if (NEAR_UNIVERSAL_SUB_CRITERIA.has(subCriterion)) return false;
  return isFlaggedTier(tier);
}

function splitFoodId(foodId: string | undefined): { foodId: number; source: string } | null {
  if (!foodId) return null;
  const [foodIdStr, source] = foodId.split('|');
  const parsed = Number(foodIdStr);
  if (!source || Number.isNaN(parsed)) return null;
  return { foodId: parsed, source };
}

// Same "worst wins" reduction Insights' own 6 Dimensions lens already uses
// (app/(tabs)/insights.tsx's own worstTierSeverity) -- a faithful, small
// duplicate rather than importing from a screen file, red beats yellow
// beats green beats unknown, so one real concern anywhere in a dimension
// is never masked by everything else in it being fine or unassessed.
const DIMENSION_SEVERITY_RANK: Record<TierSeverity, number> = { unknown: 0, green: 1, yellow: 2, red: 3 };

function worseSeverity(a: TierSeverity, b: TierSeverity): TierSeverity {
  return DIMENSION_SEVERITY_RANK[b] > DIMENSION_SEVERITY_RANK[a] ? b : a;
}

async function computeConditionSafetyAndCautions(
  ingredients: MealIngredientInput[],
  trackedConditions: { code: string; name: string }[],
): Promise<Pick<RecipeDepthResult, 'safeForConditions' | 'conditionCautions' | 'dimensionBreakdown'>> {
  const safeForConditions: string[] = [];
  const conditionCautions: RecipeDepthResult['conditionCautions'] = {};
  const dimensionBreakdown: RecipeDepthResult['dimensionBreakdown'] = {};

  const resolved = ingredients
    .map((ingredient) => {
      const split = splitFoodId(ingredient.foodId);
      return split ? { ...split, foodName: ingredient.foodName } : null;
    })
    .filter((ingredient): ingredient is { foodId: number; source: string; foodName: string } => ingredient !== null);

  for (const condition of trackedConditions) {
    type Hit = { baseName: string; subCriterion: string; tier: string; severity: 'yellow' | 'red'; excluded: boolean };
    const hits: Hit[] = [];
    // Every real dimension this condition actually scores anything under,
    // in the order first encountered -- a Map (not a plain object) so that
    // order is preserved, since a chart reads better with a stable axis
    // order than one that reshuffles between renders.
    const dimensionSeverities = new Map<string, TierSeverity>();

    for (const ingredient of resolved) {
      const scores = await getFoodScoresForCondition(ingredient.foodId, ingredient.source, condition.code);
      for (const score of scores) {
        // The dimension chart wants every real severity (green and
        // unknown included, not just flagged ones) -- excluded here only
        // for the same near-universal, background-signal sub-criteria
        // the caution logic below already excludes, so the two views of
        // this same dish never quietly disagree about what counts.
        if (!NEAR_UNIVERSAL_SUB_CRITERIA.has(score.subCriterion)) {
          const severity = tierSeverity(score.tier);
          const current = dimensionSeverities.get(score.dimension) ?? 'unknown';
          dimensionSeverities.set(score.dimension, worseSeverity(current, severity));
        }

        if (!isNoteworthyForRecipe(score.subCriterion, score.tier)) continue;
        const severity = tierSeverity(score.tier);
        if (severity !== 'yellow' && severity !== 'red') continue;
        hits.push({
          baseName: ingredient.foodName,
          subCriterion: score.subCriterion,
          tier: score.tier,
          severity,
          excluded: isAbsoluteExclusion(condition.code, score.subCriterion, score.tier),
        });
      }
    }

    dimensionBreakdown[condition.code] = Array.from(dimensionSeverities.entries()).map(([dimension, severity]) => ({
      dimension,
      severity,
    }));

    // A genuine, never-safe-at-any-dose match: invisible for this
    // condition entirely, no safeForConditions entry and no caution --
    // matching how the curated-recipe compute script treats the same
    // case (see ABSOLUTE_EXCLUSIONS' own comment above).
    if (hits.some((hit) => hit.excluded)) continue;

    if (hits.length === 0) {
      safeForConditions.push(condition.code);
      continue;
    }

    const worst = hits.find((hit) => hit.severity === 'red') ?? hits[0];
    conditionCautions[condition.code] = {
      severity: worst.severity,
      note: buildCautionSentence(worst.baseName, worst.subCriterion, worst.tier),
    };
  }

  return { safeForConditions, conditionCautions, dimensionBreakdown };
}

// G26, 2026-09-27: the same condition check, run when a person's own
// recipe opens, against every condition anyone in the household tracks.
// Reads only; nothing is written back to the saved record.
export async function computeConditionChecks(
  ingredients: Pick<MealIngredientInput, 'foodId' | 'foodName' | 'category'>[],
  conditions: { code: string; name: string }[],
): Promise<Pick<RecipeDepthResult, 'safeForConditions' | 'conditionCautions'>> {
  const { safeForConditions, conditionCautions } = await computeConditionSafetyAndCautions(
    ingredients.map((ingredient) => ({ ...ingredient, quantity: 0, unit: '' })),
    conditions,
  );
  return { safeForConditions, conditionCautions };
}

// ---------------------------------------------------------------------
// Stage-specific advisory notes -- reuses the already-live, already-
// shared per-ingredient dispatcher every Food builder's own live preview
// already calls (lib/conditionStageAdvisory.ts), just aggregated across a
// whole ingredient list instead of one food at a time.

async function computeStageNotes(
  ingredients: MealIngredientInput[],
  trackedConditions: { code: string; name: string }[],
): Promise<ConditionStageAdvisory[]> {
  const trackedCodes = new Set(trackedConditions.map((condition) => condition.code));
  const declaredStages = await getConditionStages();
  const relevantStages = Object.fromEntries(Object.entries(declaredStages).filter(([code]) => trackedCodes.has(code)));
  if (Object.keys(relevantStages).length === 0) return [];

  const resolved = ingredients
    .map((ingredient) => {
      const split = splitFoodId(ingredient.foodId);
      return split ? { ...split, foodName: ingredient.foodName } : null;
    })
    .filter((ingredient): ingredient is { foodId: number; source: string; foodName: string } => ingredient !== null);

  // 2026-08-25, direct report: "it listed the same warning twice... we
  // don't want to list it twice, we want to list the ingredients that
  // each match it." getConditionStageAdvisory produces the identical
  // {title, message} pair whenever two different ingredients trip the
  // exact same real advisory (its own wording is generic, never tied to
  // one specific ingredient) -- deduping by that exact pair and naming
  // every ingredient that actually matched is the real fix, not just
  // hiding the repeat.
  const notesByKey = new Map<string, { title: string; message: string; ingredientNames: string[] }>();
  for (const ingredient of resolved) {
    const scores = await getFoodScores(ingredient.foodId, ingredient.source);
    const advisory = getConditionStageAdvisory(scores, relevantStages);
    if (!advisory) continue;
    const key = `${advisory.title}|${advisory.message}`;
    const existing = notesByKey.get(key);
    if (existing) {
      existing.ingredientNames.push(ingredient.foodName);
    } else {
      notesByKey.set(key, { title: advisory.title, message: advisory.message, ingredientNames: [ingredient.foodName] });
    }
  }

  return Array.from(notesByKey.values()).map(({ title, message, ingredientNames }) => ({
    title,
    message: `${message} Matches: ${ingredientNames.join(', ')}.`,
  }));
}

// ---------------------------------------------------------------------
// Diet-compatibility tags -- faithful port of scripts/
// compute_recipe_diet_tags.js's own classifyRecipe (see that file's
// header comment for the full, auditable rule set this mirrors).
// Ingredient matching is by exact base_name, the same real column
// curated_recipe_ingredients.base_name uses -- MealIngredientInput's own
// foodName is already the raw base_name here (SideBuilder's own live
// preview builds it from ingredient.resolved.baseName, not a display
// summary string), the same convention this reuses.

// Rebuilt 2026-11-17 for the unified database, whose foods carry plain
// names ("Chickpeas", "Beef top sirloin") in place of the source tables'
// names. Each rule now reads the name by pattern, so every shown food is
// covered and not only the 300 recipes the old lists were drawn from.

// WCRF's red meat: muscle meat from a mammal, and the processed meats made
// from it. Fat and offal from those animals count too, since a dish using
// them is not the poultry-or-fish-only dish flexitarian means. Game and
// sea mammals (rabbit, seal, whale) are mammals too.
const RED_MEAT_PATTERN =
  /\b(beef|beefalo|bison|buffalo|wagyu|veal|lamb|mutton|pork|inobuta|goat|venison|deer|elk|moose|caribou|reindeer|muskox|antelope|kangaroo|camel|horse(?! mackerel)|boar|rabbit|hare|squirrel|muskrat|beaver|bear|seal|walrus|whale|beluga|narwhal|bowhead|sea lion|muktuk|bacon|ham|prosciutto|pancetta|salami|pepperoni|chorizo|mortadella|bologna|bresaola|capicola|coppa|pastrami|kasseler|eisbein|bratwurst|knackwurst|kielbasa|mettwurst|hot dog|sausage|salt pork|tallow|lard|fatback)\b/i;

// Wheat and its relatives (spelt, durum, einkorn, emmer, khorasan), rye,
// barley and triticale, and what is made from them. Oats count as gluten
// free by the usual labelling convention; buckwheat is not wheat, and
// anything named gluten-free is left out. Soy sauce is brewed with wheat;
// tamari is the wheat-free one.
const GLUTEN_PATTERN =
  /\b(wheat|spelt|durum|einkorn|emmer|khorasan|frik|bulgur|couscous|rye|barley|triticale|seitan|udon|somen|wonton|graham|malt)\b|^(semolina|pasta|dried pasta|fresh pasta|fresh egg pasta|egg noodles|white flour|bread flour|cake flour|pastry flour|enriched white flour|high-protein white flour|enriched high-protein white flour|soy sauce)$/i;

// Beans, peas, lentils and the soy foods, eaten as the protein of a dish.
const PROTEIN_LEGUME_PATTERN = /\b(tofu|koyadofu|tempeh|natto|yuba|beans|chickpeas|lentils|peas|soybeans|lupin|edamame)\b/i;

// Strained yogurt, cottage cheese, quark, skyr and cheese, apart from the
// soft spreading cheeses (cream cheese, mascarpone) that carry little protein.
const HIGH_PROTEIN_DAIRY_PATTERN = /\b(greek yogurt|cottage cheese|quark|skyr|paneer|cheese|cheddar|emmental|parmesan|gruyere|halloumi|queso)\b/i;
const LOW_PROTEIN_CHEESE_PATTERN = /cream cheese|mascarpone|creme cherie/i;

// Tomatoes, white potatoes, eggplant, tomatillos, and the capsicum peppers
// (bell, chili, paprika, cayenne), plus goji. Sweet potato is not a
// nightshade, and black, white and sansho pepper come from other plants.
const NIGHTSHADE_PATTERN =
  /\b(tomato|tomatoes|tomatillo|potato|potatoes|eggplant|bell pepper|chili|chile|hot peppers|banana pepper|hungarian pepper|serrano pepper|shishito|pasilla|paprika|cayenne|goji)\b/i;
const NOT_NIGHTSHADE_PATTERN = /sweet potato|tomato seed oil/i;

// Sugar refined from cane or beet. Honey, maple and whole cane sugar stay
// allowed, the usual Paleo reading.
const REFINED_SUGARS = new Set(['White sugar', 'Brown sugar', 'Powdered sugar', 'Raw sugar', 'Rock sugar', 'Vanilla sugar']);

function hasCategory(ingredients: MealIngredientInput[], category: string): boolean {
  return ingredients.some((ingredient) => ingredient.category === category);
}
function hasIngredient(ingredients: MealIngredientInput[], category: string, baseName: string): boolean {
  return ingredients.some((ingredient) => ingredient.category === category && ingredient.foodName === baseName);
}
function hasNameMatch(ingredients: MealIngredientInput[], pattern: RegExp): boolean {
  return ingredients.some((ingredient) => pattern.test(ingredient.foodName));
}
function hasAnyFromSet(ingredients: MealIngredientInput[], names: Set<string>): boolean {
  return ingredients.some((ingredient) => names.has(ingredient.foodName));
}
function hasRedMeat(ingredients: MealIngredientInput[]): boolean {
  return ingredients.some(
    (ingredient) => (ingredient.category === 'Meat' || ingredient.category === 'Fats') && RED_MEAT_PATTERN.test(ingredient.foodName),
  );
}
function hasGluten(ingredients: MealIngredientInput[]): boolean {
  return ingredients.some((ingredient) => !/gluten-free/i.test(ingredient.foodName) && GLUTEN_PATTERN.test(ingredient.foodName));
}
function hasProteinLegume(ingredients: MealIngredientInput[]): boolean {
  return ingredients.some(
    (ingredient) => (ingredient.category === 'Legume' || ingredient.foodName === 'Edamame' || ingredient.foodName === 'Frozen edamame') && PROTEIN_LEGUME_PATTERN.test(ingredient.foodName),
  );
}
function hasHighProteinDairy(ingredients: MealIngredientInput[]): boolean {
  return ingredients.some(
    (ingredient) => ingredient.category === 'Dairy' && HIGH_PROTEIN_DAIRY_PATTERN.test(ingredient.foodName) && !LOW_PROTEIN_CHEESE_PATTERN.test(ingredient.foodName),
  );
}
function hasNightshade(ingredients: MealIngredientInput[]): boolean {
  return ingredients.some((ingredient) => NIGHTSHADE_PATTERN.test(ingredient.foodName) && !NOT_NIGHTSHADE_PATTERN.test(ingredient.foodName));
}

// Exported, 2026-08-26 -- lib/foodPersonalization.ts reuses this exact
// rule set for a single food at a time (a real, correct degenerate case of
// the same computation: a one-ingredient "dish"), rather than a second,
// drifting copy of the same category/base-name classification rules for
// Insights' own tools.
export function computeDietTags(ingredients: MealIngredientInput[]): RecipeDietTag[] {
  const tags: RecipeDietTag[] = [];

  const hasMeat = hasCategory(ingredients, 'Meat');
  const hasDairy = hasCategory(ingredients, 'Dairy');
  const hasEgg = hasNameMatch(ingredients, /\begg\b/i);
  let baseTag: RecipeDietTag;
  if (hasMeat) baseTag = 'Omnivore';
  else if (hasDairy || hasEgg) baseTag = 'Vegetarian';
  else baseTag = 'Vegan';
  tags.push(baseTag);

  const onlyLighterMeat = hasMeat && !hasRedMeat(ingredients);
  if (baseTag === 'Vegan' || baseTag === 'Vegetarian' || onlyLighterMeat) {
    tags.push('Plant-Based/Flexitarian');
  }

  const hasOliveOil = hasIngredient(ingredients, 'Fats', 'Olive oil');
  if (hasOliveOil && !hasRedMeat(ingredients)) {
    tags.push('Mediterranean');
  }

  if (!hasGluten(ingredients)) {
    tags.push('Gluten-Free');
  }

  if (!hasDairy) {
    tags.push('Dairy-Free');
  }

  const hasGrain = hasCategory(ingredients, 'Grain');
  const hasLegume = hasCategory(ingredients, 'Legume');
  const hasBaked = hasCategory(ingredients, 'Baked');
  const hasRefinedSugar = hasAnyFromSet(ingredients, REFINED_SUGARS);
  const hasGrainProduct = hasGrain || hasBaked || hasCategory(ingredients, 'PastaNoodles') || hasGluten(ingredients);
  const isPaleo = !hasGrainProduct && !hasLegume && !hasDairy && !hasRefinedSugar;
  if (isPaleo) tags.push('Paleo');

  if (isPaleo) {
    const hasNutSeed = hasCategory(ingredients, 'NutSeed');
    if (!hasEgg && !hasNutSeed && !hasNightshade(ingredients)) tags.push('AIP');
  }

  if (hasMeat || hasProteinLegume(ingredients) || hasEgg || hasHighProteinDairy(ingredients)) tags.push('High-Protein');

  return tags;
}

// ---------------------------------------------------------------------
// The one real entry point every Food builder should call, once ingredients
// are final and before persisting -- the computation itself is never
// optional (see this file's own header comment); a builder's own UI is
// free to show or skip a report of the result.
export async function computeRecipeDepth(
  ingredients: MealIngredientInput[],
  trackedConditions: { code: string; name: string }[],
): Promise<RecipeDepthResult> {
  const [{ safeForConditions, conditionCautions, dimensionBreakdown }, stageNotes] = await Promise.all([
    computeConditionSafetyAndCautions(ingredients, trackedConditions),
    computeStageNotes(ingredients, trackedConditions),
  ]);
  const dietTags = computeDietTags(ingredients);
  return { safeForConditions, conditionCautions, dietTags, stageNotes, dimensionBreakdown };
}
