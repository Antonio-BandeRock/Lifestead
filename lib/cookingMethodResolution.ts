// Which reference-database row a builder ingredient should actually be
// scored against, given how the person said they were going to cook it.
//
// 2026-09-01, from a direct observation: "Broccoli (boiled) nutrients aren't
// going to be tallied the same as raw. It can't be used for their nutrient
// value unless they actually boil it and tell the app that they boiled it."
//
// The bug underneath that: every builder asks about preparation twice, in two
// different vocabularies, and only one of the two answers affects any data.
// FoodLookup's own prep picker chooses the reference row, which is what
// nutrients and condition scores are read from. The builder's separate Cook
// Prep field is stored beside it as description and read by nothing. So an
// ingredient picked as "Broccoli (raw)" and then marked Boiled kept raw
// nutrients on a boiled dish, silently, with both answers visible on screen
// and disagreeing.
//
// This module holds the pure half: what a builder's cooking word means in
// terms of the reference database's own prep_method vocabulary. The lookup
// that acts on it is resolveFoodForCookingMethod in lib/db.ts.

// What the stated cooking method implies about which row to use.
//
// 'unconstrained' is a real answer rather than a gap: 'N/A' genuinely says
// nothing, and a few methods ('Fermented', 'Chilled/Frozen') have no honest
// counterpart in this database's prep vocabulary. Forcing those toward a
// cooked row would be inventing a claim, so they leave the row alone.
export type CookingMethodIntent = 'raw' | 'cooked' | 'unconstrained';

// Maps each builder's own cooking word to the prep_method this database
// actually uses. The 11 builders each carry their own COOKING_METHODS list
// (a fermentation has 'Fermented', a soup has 'Simmered', a sauce has
// 'Reduced'), so this covers the union of all of them rather than any single
// builder's list.
//
// Three of these are deliberate approximations rather than exact matches,
// named here rather than left to be discovered: 'Simmered' and 'Reduced' both
// map to Boiled, because both are food held in liquid at heat and this
// database has no separate row for either; 'Toasted' maps to Baked as the
// nearest dry-heat method. All three only decide which cooked row is
// PREFERRED, and any cooked row is the fallback regardless, so the cost of
// getting one of them slightly wrong is small. That fallback rests on a
// finding already verified on 2026-08-27: every ingredient checked scored
// identically across its own non-Raw variants.
//
// 2026-09-19: 'Braised' and 'Stewed' joined that same Boiled group, for the
// same reason, while side dishes were being added. Both were already in the
// curated recipe corpus, 30 ingredient rows between them, and both were
// falling through to 'unconstrained', which left a braised cabbage scored
// against the raw cabbage row. That is the exact bug this module exists to
// fix, sitting inside the module's own lookup table.
const COOKED_METHOD_TO_PREP: Record<string, string> = {
  'sautéed': 'Fried',
  'sauteed': 'Fried',
  'pan-fried': 'Fried',
  'deep-fried': 'Fried',
  'stir-fried': 'Fried',
  steamed: 'Steamed',
  boiled: 'Boiled',
  simmered: 'Boiled',
  braised: 'Boiled',
  stewed: 'Boiled',
  poached: 'Boiled',
  reduced: 'Boiled',
  baked: 'Baked',
  toasted: 'Baked',
  roasted: 'Roasted',
  grilled: 'Grilled',
};

export function cookingMethodIntent(cookingMethod: string | null | undefined): CookingMethodIntent {
  const key = (cookingMethod ?? '').trim().toLowerCase();
  if (!key || key === 'n/a') return 'unconstrained';
  if (key === 'raw') return 'raw';
  if (COOKED_METHOD_TO_PREP[key]) return 'cooked';
  return 'unconstrained';
}

// The prep_method to try first for a cooked method, or null where the method
// is not one this maps.
export function preferredPrepMethodFor(cookingMethod: string | null | undefined): string | null {
  const key = (cookingMethod ?? '').trim().toLowerCase();
  return COOKED_METHOD_TO_PREP[key] ?? null;
}

// A row with no prep_method at all, or one tagged Raw, is raw for this
// purpose. 10,750 visible rows in this database carry no prep_method, so
// treating an untagged row as "not raw" would send most foods hunting for a
// cooked variant that does not exist.
export function isRawPrepMethod(prepMethod: string | null | undefined): boolean {
  const key = (prepMethod ?? '').trim().toLowerCase();
  return key === '' || key === 'raw' || key === 'unprepared';
}

// 2026-11-11: a preserved or dried form is never "the cooked version" of a
// food. Before this, any row that was not Raw counted as cooked, so a
// simmered tomato was scored as sun-dried tomato (about 14 times the
// potassium, iron and magnesium per 100 g), sauteed tofu as freeze-dried
// koyadofu, a raw banana as dried banana and baked salmon as canned salmon.
// Whole days of meals read past the upper limit for iron, magnesium,
// manganese and niacin because of it.
//
// Such a row is still the right answer when the cooking text itself names
// that form ("canned"), and it stays reachable as a last resort when it is
// the only row a food has.
const PRESERVED_PREP_METHODS = new Set([
  'dried',
  'canned',
  'frozen',
  'deep-frozen',
  'pickled',
  'mashed (dehydrated)',
  'marinated',
  'in unsalted water',
]);

const PRESERVED_NAME_WORDS: { pattern: RegExp; stem: string }[] = [
  { pattern: /\bsun[- ]dried\b/i, stem: 'dried' },
  { pattern: /\bfreeze[- ]dried\b/i, stem: 'dried' },
  { pattern: /\bdried\b/i, stem: 'dried' },
  { pattern: /\bdehydrated\b/i, stem: 'dehydrated' },
  { pattern: /\bdry\b(?![- ](roasted|heat))/i, stem: 'dry' },
  { pattern: /\bcanned\b/i, stem: 'canned' },
  { pattern: /\bfrozen\b/i, stem: 'frozen' },
  { pattern: /\bpickled\b/i, stem: 'pickled' },
  { pattern: /\bpowder(ed)?\b/i, stem: 'powder' },
  { pattern: /\bconcentrate[ds]?\b/i, stem: 'concentrate' },
  { pattern: /\bin (heavy |light |extra light )?syrup\b/i, stem: 'syrup' },
  { pattern: /\bin brine\b/i, stem: 'brine' },
  { pattern: /\bsmoked\b/i, stem: 'smoked' },
  { pattern: /\bsalted\b/i, stem: 'salted' },
];

// True when this row is a preserved, dried or concentrated form of the food
// that the stated cooking text does not ask for.
export function isUnaskedPreservedForm(
  prepMethod: string | null | undefined,
  name: string | null | undefined,
  cookingMethod: string | null | undefined,
): boolean {
  const asked = (cookingMethod ?? '').toLowerCase();
  const prep = (prepMethod ?? '').trim().toLowerCase();
  if (PRESERVED_PREP_METHODS.has(prep)) {
    const stem = prep.split(/[ (]/)[0].replace('deep-', '');
    if (!asked.includes(stem)) return true;
  }
  const text = name ?? '';
  for (const word of PRESERVED_NAME_WORDS) {
    if (word.pattern.test(text) && !asked.includes(word.stem)) return true;
  }
  return false;
}

// 2026-11-11: which cooked row stands for a food, when a base name holds
// many. "Chicken, broilers or fryers" holds 100 rows, from whole bird to
// skin only, battered or stewed. Before this the first cooked row in table
// order won whenever none carried the exact prep word, so a poached whole
// chicken was scored as battered fried chicken with giblets, a simmered veal
// breast as its separable fat, and a braised thigh as an oven-fried one.
//
// The rule, in order: a row whose prep matches the cooking word (Boiled also
// matches Stewed, Simmered, Poached and moist heat, the same family the map
// above already groups); then the row whose name shares the most words with
// the row the ingredient started on, so a whole bird stays a whole bird and
// a thigh a thigh; then table order, which is the person's table order. A
// coated row (batter, breaded, flour) or a separable-fat row is never chosen
// unless the cooking word or the starting row names it, while any other row
// is left.
const PREP_FAMILY: Record<string, string[]> = {
  boiled: ['boiled', 'stewed', 'simmered', 'poached', 'moist heat', 'braised'],
  fried: ['fried', 'sauteed', 'sautéed'],
  roasted: ['roasted', 'baked'],
  baked: ['baked', 'roasted'],
  grilled: ['grilled', 'broiled'],
  steamed: ['steamed'],
};

const COOKING_WORDS = new Set([
  'raw', 'cooked', 'boiled', 'stewed', 'simmered', 'poached', 'braised', 'moist', 'heat', 'roasted', 'baked',
  'grilled', 'broiled', 'fried', 'sauteed', 'steamed', 'without', 'with', 'fat', 'salt', 'drained', 'and', 'or',
  'oven', 'pan', 'unprepared', 'prepared',
]);

function nameWords(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')
      .split(/[^a-z\u00c0-\u024f]+/)
      .filter((w) => w.length > 1 && !COOKING_WORDS.has(w)),
  );
}

const UNASKED_ROW_WORDS: { pattern: RegExp; asked: RegExp }[] = [
  { pattern: /\b(batter|breaded|flour)\b/i, asked: /\b(batter|breaded|flour|tempura|coated)\b/i },
  { pattern: /\bseparable fat\b/i, asked: /\bseparable fat\b/i },
  { pattern: /\bskin only\b/i, asked: /\bskin only\b/i },
  { pattern: /\bgiblets\b/i, asked: /\bgiblets?\b/i },
  { pattern: /\bwith (added )?salt\b/i, asked: /\b(with salt|salted)\b/i },
];

export type CookedRowCandidate = { food_id: number; source: string; prep_method: string | null; name: string };

// Rows arrive in the person's table order. startName is the name of the row
// the ingredient started on (or its base name when that row is not known).
export function pickCookedRow<T extends CookedRowCandidate>(
  rows: T[],
  startName: string,
  cookingMethod: string | null | undefined,
  current?: { foodId: number; source: string },
  baseName?: string,
): T | undefined {
  if (rows.length === 0) return undefined;
  // Whether a coating, separable fat or salt was asked for is read from the
  // cooking word and the base name, never from the row the ingredient sits
  // on, since that row may be the wrong one this is here to correct.
  const asked = `${cookingMethod ?? ''} ${baseName ?? startName}`;
  const preferred = preferredPrepMethodFor(cookingMethod)?.toLowerCase() ?? null;
  const family = preferred ? PREP_FAMILY[preferred] ?? [preferred] : [];
  const start = nameWords(startName);
  const allowed = rows.filter((row) => !UNASKED_ROW_WORDS.some((w) => w.pattern.test(row.name) && !w.asked.test(asked)));
  const pool = allowed.length > 0 ? allowed : rows;
  let best: T | undefined;
  let bestScore = -Infinity;
  for (const row of pool) {
    const prep = `${row.prep_method ?? ''} ${row.name}`.toLowerCase();
    const prepScore = preferred && (row.prep_method ?? '').toLowerCase().includes(preferred) ? 2 : family.some((w) => prep.includes(w)) ? 1 : 0;
    const words = nameWords(row.name);
    let shared = 0;
    for (const w of words) if (start.has(w)) shared++;
    const extra = words.size - shared;
    const isCurrent = current != null && row.food_id === current.foodId && row.source === current.source;
    const askedFor = UNASKED_ROW_WORDS.some((w) => w.pattern.test(row.name) && w.asked.test(asked)) ? 20 : 0;
    const score = prepScore * 1000 + shared * 10 + askedFor - extra + (isCurrent ? 0.5 : 0);
    if (score > bestScore) {
      best = row;
      bestScore = score;
    }
  }
  return best;
}

// A recipe's free cooking text, read for whether heat is involved at all.
// 'Raw', 'N/A', 'cold', 'soaked' and the fermenting words describe a food
// served as it is, so they keep the raw or standard row.
const UNHEATED_WORDS = new Set(['raw', 'n/a', 'none', 'fresh', 'uncooked', 'cold', 'soaked', 'chilled', 'fermented', 'wild-fermented']);

export function cookingTextMeansHeated(cookingMethod: string | null | undefined): boolean {
  const key = (cookingMethod ?? '').trim().toLowerCase();
  if (!key) return false;
  return !UNHEATED_WORDS.has(key);
}

// Says plainly when the numbers being used describe a different preparation
// from the one the person stated. Returns null when the two agree, so a
// caller renders nothing rather than reassurance nobody needs.
//
// Deliberately narrower than the row-selection rule above. It fires only
// when the row is EXPLICITLY tagged raw and the person said they were
// cooking, which is a real contradiction between two things the database
// does distinguish. A row with no prep_method at all is not claiming to be
// raw, it is a food this database never split by preparation (10,750 of the
// visible rows, which is every oil, salt and spice among them), so there is
// nothing there to contradict. Without that line, every sauteed dish would
// carry a note about its olive oil, its garlic and its salt, and a section
// that cries wolf on every dish stops being read at all.
export function describePrepMismatch(
  foodName: string,
  prepMethod: string | null | undefined,
  cookingMethod: string | null | undefined,
): string | null {
  const intent = cookingMethodIntent(cookingMethod);
  if (intent === 'unconstrained') return null;
  const tag = (prepMethod ?? '').trim().toLowerCase();
  if (tag === '') return null;
  if (intent === 'raw') {
    return isRawPrepMethod(tag)
      ? null
      : `Counted as ${tag} ${foodName}: this food database has no raw version of it.`;
  }
  if (!isRawPrepMethod(tag)) return null;
  return `Counted as raw ${foodName}: this food database has no cooked version of it, so any change from cooking is not reflected.`;
}
