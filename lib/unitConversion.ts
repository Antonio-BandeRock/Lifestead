// Converts a logged meal-ingredient quantity ("2 tbsp", "6 oz") into grams,
// which is what lib/nutrientAnalysis.ts's sumFoodNutrientTotals needs to
// scale a food's per-100g nutrient values.
//
// Mass units convert exactly -- no food-specific data needed, it's just
// unit math. Volume units genuinely need a food's density (g/mL) to become
// a weight, and that's where this stays deliberately narrow: a handful of
// real physical/food-science density constants cover liquids that are
// uniform enough across a whole category (water-based beverages, oils and
// fats). Solid foods measured by volume ("1 cup chopped broccoli", "1
// medium apple") vary far too much by cut, ripeness, and packing for a
// single constant to be honest -- USDA's own household-measure gram
// weights for those are empirically weighed per food, not computed from a
// formula. Since 2026-11-10 the reference database carries those weighed
// figures for the foods recipes measure by spoon or cup (food_volume_weights,
// from USDA FoodData Central SR Legacy food_portion), passed in as
// options.gramsPerMl. Guessing a category-average density for solids would
// be exactly the kind of fabricated, uncited figure this project has
// deliberately avoided everywhere else -- so a solid with no weighed figure
// still returns an explicit "not supported" result instead of a silently
// wrong number.

export type MassUnit = 'g' | 'kg' | 'oz' | 'lb';
// pint/quart/gallon added 2026-08-02, alongside the liquid-builders' own
// Units picker no longer branching on the person's profile measurement
// system (see BeverageBuilder.tsx's own unitsForSystem comment) -- real
// liquid quantities (a batch of kombucha, a jug of iced tea) commonly run
// past a single cup/liter. US customary values throughout, matching the
// fl_oz conversion already established here (not UK imperial, which uses a
// different fl oz).
export type VolumeUnit = 'ml' | 'l' | 'tsp' | 'tbsp' | 'fl_oz' | 'cup' | 'pint' | 'quart' | 'gallon';
export type MeasurementUnit = MassUnit | VolumeUnit;

export const MASS_UNITS: readonly MassUnit[] = ['g', 'kg', 'oz', 'lb'];
export const VOLUME_UNITS: readonly VolumeUnit[] = ['ml', 'l', 'tsp', 'tbsp', 'fl_oz', 'cup', 'pint', 'quart', 'gallon'];

function isMassUnit(unit: string): unit is MassUnit {
  return (MASS_UNITS as readonly string[]).includes(unit);
}

function isVolumeUnit(unit: string): unit is VolumeUnit {
  return (VOLUME_UNITS as readonly string[]).includes(unit);
}

const MASS_TO_GRAMS: Record<MassUnit, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

const VOLUME_TO_ML: Record<VolumeUnit, number> = {
  ml: 1,
  l: 1000,
  tsp: 4.92892,
  tbsp: 14.7868,
  fl_oz: 29.5735,
  cup: 236.588,
  pint: 473.176,
  quart: 946.353,
  gallon: 3785.41,
};

export type DensityClass = 'water_like' | 'oil_fat' | 'granular_salt';

// Real, citable physical/food-science density constants -- deliberately
// the only classes uniform enough to trust a single number across an
// entire food category.
//
// granular_salt, 2026-11-09 (owner's instruction: salt added to something
// in a dish has to be counted in the salt a person eats). Salt sits in
// the Herbs category, which has no density, so every "1 tsp salt" in a
// recipe used to convert to nothing and its sodium was silently left out.
// USDA FoodData Central, SR Legacy "Salt, table" (NDB 2047): 1 tsp = 6.0 g,
// 1 tbsp = 18.0 g, which is 1.217 g/mL. Coarse and flaked salts weigh less
// per spoon, so for them this counts somewhat more salt than was eaten,
// the safer side for someone limiting it. It is never inferred from the
// category: lib/db.ts's conversionOptionsFor passes it only for a food
// whose own sodium figure says it is salt.
const DENSITY_G_PER_ML: Record<DensityClass, number> = {
  water_like: 1.0, // water, juice, coffee/tea, milk, most beverages, diluted alcohol
  oil_fat: 0.92, // cooking oils and solid fats (butter, lard, shortening) cluster in a narrow ~0.90-0.92 g/mL band regardless of physical state at room temperature
  granular_salt: 18.0 / 14.7868,
};

// Whether a food is salt, judged by its own sodium per 100 g. Pure salt is
// about 39,000 mg; seasoned and herb salts sit above 30,000. Reduced-sodium
// mineral salts fall to 20,000 to 26,000, so between 20,000 and 30,000 the
// name has to say salt too, which keeps out baking soda (about 27,000 mg)
// and stock powder, whose spoon weighs something else.
export function isSaltBySodium(sodiumMgPer100g: number | null | undefined, names: (string | null | undefined)[]): boolean {
  if (sodiumMgPer100g == null || !Number.isFinite(sodiumMgPer100g)) return false;
  if (sodiumMgPer100g >= 30000) return true;
  if (sodiumMgPer100g < 20000) return false;
  return names.some((name) => !!name && /salt/i.test(name));
}

// How much of a salt line stays in the food, read from the recipe's note
// (owner's instruction, 2026-11-10: salt that goes into water which is
// then poured away is not counted). Returns the grams to count. A note
// that names an amount for the dish counts that amount; otherwise:
//   all of it into water, brine or a rinse that is poured away: nothing
//   "a little" or "a pinch" for the dish, the rest in the water: an eighth
//   "mostly" or "most" poured away: a quarter
//   split between the dish and the water: half
// Brine that is eaten with the food ("dissolved in the brine") and a
// dough's salt "plus more for the water" count in full, since the listed
// amount is what stays. The shares are a reading of the note, not a
// measurement: the UK Food Standards Agency (2006) found what pasta, rice
// and potatoes take up from salted water rises with how salty the water
// is, so no one figure fits every pot. Weight conversion is untouched,
// because a shopping list still needs the whole amount.
const SALT_ON_WATER = /\b(water|brine|soaking liquid|poaching|blanching|purging)\b/i;
const SALT_THROWN = /\b(rinsed off|poured away|drained off|soaking liquid)\b/i;

export function saltGramsKeptInDish(grams: number, note: string | null | undefined): number {
  const text = (note ?? '').trim().toLowerCase();
  if (!text) return grams;
  if (!SALT_ON_WATER.test(text) && !SALT_THROWN.test(text)) return grams;
  // The listed amount is the dish's; the water's salt was never listed.
  if (/^(?:[^,;]*,\s*)?plus (more|a handful)\b/.test(text)) return grams;
  if (/\bdissolved in the brine\b/.test(text)) return grams;
  if (/\bto draw out the water\b/.test(text)) return grams;
  // "the share taken up; the brine holds 15 g": the line already lists only
  // what the food keeps.
  if (/^the share taken up\b/.test(text)) return grams;
  // "1/2 tsp to season the chicken, the rest for the brine"
  const stated = text.match(/^(\d+(?:\/\d+)?|\d*\.\d+)\s*(tsp|tbsp)\b[^,]*,\s*the rest\b/);
  if (stated) {
    const [num, den] = stated[1].split('/').map(Number);
    const spoons = den ? num / den : num;
    return Math.min(grams, spoons * (stated[2] === 'tbsp' ? 18 : 6));
  }
  // Both halves go down the drain: purged clams and the pasta water.
  if (/purging/.test(text) && !/\b(sauce|filling|dough|pesto|eggplant|chicken)\b/.test(text)) return 0;
  if (/^(a little|a pinch)\b.*\bmost\b/.test(text) || /^a pinch for\b/.test(text)) return grams / 8;
  if (/\bonly a little reaches\b/.test(text)) return grams / 8;
  if (/\bmost(ly)?\b/.test(text)) return grams / 4;
  if (/^part for\b/.test(text) || /\band the (sauce|filling|dough)\b/.test(text)) return grams / 2;
  return 0;
}

// True when the category alone already gives volume units a density.
export function categoryHasDensity(foodCategory: string | null | undefined): boolean {
  return !!foodCategory && foodCategory in CATEGORY_DENSITY_CLASS;
}

// Only these `foods.category` values are uniform enough in density to
// resolve a densityClass automatically. Everything else (Veg, Fruit,
// Dairy, Meat, Grain, Sweets, etc.) genuinely mixes liquid and solid or
// varies too much by preparation -- the caller must pass an explicit
// densityClass or the food must be logged by weight instead.
const CATEGORY_DENSITY_CLASS: Record<string, DensityClass> = {
  Bev: 'water_like',
  Alcohol: 'water_like',
  Fats: 'oil_fat',
};

// Added 2026-08-10 for the Alcohol Content Calculator (lib/
// alcoholCalculator.ts) -- that feature needs to convert an ingredient's
// already-chosen quantity/unit (e.g. "1/2 cup") into milliliters, to
// prefill its own Volume field, without a second, hand-copied unit table.
// Deliberately narrower than convertToGrams: this only ever answers "how
// many mL," never needs a food's density, so it works for every volume
// unit unconditionally (unlike convertToGrams's own volume branch, which
// needs a densityClass first). Same normalization as lib/db.ts's own
// normalizeUnitForConversion (trim/lowercase/replace whitespace with
// underscore), so a builder's own "fl oz" (space) resolves the same way
// "fl_oz" does.
export function volumeToMl(amount: number, unit: string): number | null {
  const normalized = unit.trim().toLowerCase().replace(/\s+/g, '_');
  if (!isVolumeUnit(normalized)) return null;
  return amount * VOLUME_TO_ML[normalized];
}

export type GramConversionResult =
  | { ok: true; grams: number }
  | { ok: false; reason: 'unsupported_unit' | 'volume_needs_density' };

export function convertToGrams(
  amount: number,
  unit: MeasurementUnit,
  options: { densityClass?: DensityClass; foodCategory?: string; gramsPerMl?: number } = {},
): GramConversionResult {
  if (isMassUnit(unit)) {
    return { ok: true, grams: amount * MASS_TO_GRAMS[unit] };
  }

  if (isVolumeUnit(unit)) {
    // A food's own USDA household-measure weight (food_volume_weights, read by
    // conversionOptionsFor in lib/db.ts) wins over a category constant.
    if (!options.densityClass && options.gramsPerMl && options.gramsPerMl > 0) {
      return { ok: true, grams: amount * VOLUME_TO_ML[unit] * options.gramsPerMl };
    }
    const densityClass = options.densityClass
      ?? (options.foodCategory ? CATEGORY_DENSITY_CLASS[options.foodCategory] : undefined);

    if (!densityClass) {
      return { ok: false, reason: 'volume_needs_density' };
    }

    const milliliters = amount * VOLUME_TO_ML[unit];
    return { ok: true, grams: milliliters * DENSITY_G_PER_ML[densityClass] };
  }

  return { ok: false, reason: 'unsupported_unit' };
}
