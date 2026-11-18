// Lactose intolerance on the food allergies list (Tony, 2026-11-18).
//
// It is not an allergy: an allergy is the immune system reacting to milk
// protein, while lactose intolerance is too little of the enzyme lactase to
// digest milk sugar. It sits on the same list because that list is what
// every food check reads, but it matches differently. Butter, ghee and aged
// hard cheese carry very little lactose (NIDDK, "Eating, Diet, & Nutrition
// for Lactose Intolerance"), and plant milks carry none, so only the foods
// that carry a meaningful amount are matched. Pure: no imports, checked by
// scripts/test_lactose.js.

/** The Profile chip's name, and what the interview offers. */
export const LACTOSE_INTOLERANCE = 'Lactose intolerance';

/** The reading that explains the difference between the two dairy reactions. */
export const LACTOSE_READING_ID = 'problem-conventional-dairy';

const ALIASES = new Set(['lactose', 'lactose intolerance', 'lactose intolerant', 'lactose sensitivity']);

/** Whether an entry on the food allergies list means lactose intolerance. */
export function isLactoseEntry(name: string): boolean {
  return ALIASES.has(name.trim().toLowerCase().replace(/\s+/g, ' '));
}

/** Foods and ingredients that carry a meaningful amount of lactose. */
export const LACTOSE_TERMS: readonly string[] = [
  'milk', 'whole milk', 'skim milk', 'nonfat milk', 'lowfat milk', 'milk powder', 'dry milk', 'milk solids',
  'condensed milk', 'evaporated milk', 'buttermilk', 'cream', 'heavy cream', 'half and half', 'sour cream',
  'whipped cream', 'ice cream', 'whey', 'lactose', 'yogurt', 'yoghurt', 'kefir', 'ricotta', 'cottage cheese',
  'cream cheese', 'mascarpone', 'queso fresco', 'panela', 'requesón', 'requeson', 'paneer', 'quark', 'leche',
  'crema', 'cajeta', 'dulce de leche',
];

// A plant milk or a cream that is not dairy, named just before the word.
const NOT_DAIRY_BEFORE =
  /\b(almond|oat|soy|soya|coconut|rice|cashew|hemp|pea|macadamia|hazelnut|flax|quinoa|plant|nut|vegan|non-dairy|nondairy)[\s-]*$/i;

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The first lactose-carrying word the text holds, or null. */
export function findLactose(text: string): string | null {
  const longestFirst = [...LACTOSE_TERMS].sort((a, b) => b.length - a.length);
  for (const term of longestFirst) {
    const pattern = new RegExp(`(^|[^\\p{L}])(${escape(term)})(?![\\p{L}])`, 'giu');
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const start = match.index + match[1].length;
      const before = text.slice(0, start);
      const after = text.slice(start + match[2].length);
      if (/^[\s-]*free\b/i.test(after)) continue;
      if (/\blactose[\s-]*free[\s,]*$/i.test(before) || /\bsin\s+lactosa\b/i.test(after)) continue;
      if (NOT_DAIRY_BEFORE.test(before)) continue;
      if (/^[\s,]*(of|de)\s+(tartar|coco|almendra|arroz|soya|avena)\b/i.test(after)) continue;
      if (/^[\s,]*\(?(almond|oat|soy|soya|coconut|rice|cashew|hemp|plant)/i.test(after)) continue;
      return match[2];
    }
  }
  return null;
}

/**
 * The entry on the food allergies list that this food or ingredient name
 * matches, or null. Lactose intolerance matches by what carries lactose;
 * every other entry keeps the plain word match the app has always used.
 */
export function allergyMatchIn(name: string, allergies: readonly string[]): string | null {
  const lower = name.toLowerCase();
  return (
    allergies.find((entry) => {
      const word = entry.trim();
      if (!word) return false;
      if (isLactoseEntry(word)) return findLactose(name) !== null;
      return lower.includes(word.toLowerCase());
    }) ?? null
  );
}
