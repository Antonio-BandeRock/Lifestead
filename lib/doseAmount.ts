// How much of a pill, capsule or scoop one dose is (Tony, 2026-11-18).
//
// "For a dose a half a capsule isn't allowed. Sometimes people need to break
// pills in half or even quarters." Every box where a person types how much
// one dose is reads it through parseDoseAmount, so a half or a quarter is
// accepted however it is written: 0.5, .5, 0,5 (a comma is the decimal mark
// in Spanish), 1/2, 1 1/2, ½, 1½, ¼ and ¾. formatDoseAmount writes it back
// the way a person says it, so a stored 0.5 shows as ½.
//
// Pure, with no React Native import, so scripts/test_dose_amount.js runs it
// under Node.

const VULGAR: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 };

/**
 * The amount typed, as a number. null when the box is empty, NaN when it
 * holds something that is not an amount, or an amount below zero.
 */
export function parseDoseAmount(text: string): number | null {
  let s = text.trim();
  if (!s) return null;
  let total = 0;
  // A vulgar fraction character, alone or after a whole number ("1½").
  const last = s.slice(-1);
  if (VULGAR[last] !== undefined) {
    total += VULGAR[last];
    s = s.slice(0, -1).trim();
    if (!s) return total;
  }
  // A mixed number written with a slash ("1 1/2"), or a plain fraction ("1/2").
  const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed && total === 0) {
    const den = Number(mixed[3]);
    return den > 0 ? Number(mixed[1]) + Number(mixed[2]) / den : NaN;
  }
  const fraction = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction && total === 0) {
    const den = Number(fraction[2]);
    return den > 0 ? Number(fraction[1]) / den : NaN;
  }
  // A decimal, with a comma or a point.
  if (!/^\d*[.,]?\d*$/.test(s) || s === '.' || s === ',') return NaN;
  const value = Number(s.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value + total : NaN;
}

const SHOWN: readonly [number, string][] = [
  [0.25, '¼'],
  [0.5, '½'],
  [0.75, '¾'],
];

/** A dose amount the way a person says it: 0.5 as ½, 1.5 as 1½, 0.25 as ¼. */
export function formatDoseAmount(amount: number): string {
  const whole = Math.floor(amount);
  const part = amount - whole;
  if (part > 1e-9) {
    const named = SHOWN.find(([value]) => Math.abs(value - part) < 1e-6);
    if (named) return whole > 0 ? `${whole}${named[1]}` : named[1];
    return String(Number(amount.toFixed(3)));
  }
  return String(whole);
}

// Units of measure are written the same for one or many ("2 mg", "5 ml").
const MEASURE_UNITS = new Set(['mg', 'mcg', 'µg', 'ug', 'g', 'kg', 'ml', 'l', 'iu', 'ui', 'oz', 'fl oz', 'tsp', 'tbsp', 'cfu', '%']);

/** "tablets" as "tablet": the name for one of something, however it was typed. */
export function unitSingular(unit: string): string {
  const typed = unit.trim();
  if (MEASURE_UNITS.has(typed.toLowerCase())) return typed;
  if (/[^aeiou]ies$/i.test(typed)) return typed.slice(0, -3) + 'y';
  if (/(ch|sh|x|ss)es$/i.test(typed)) return typed.slice(0, -2);
  if (/[^s]s$/i.test(typed) && typed.length > 3) return typed.slice(0, -1);
  return typed;
}

/** "tablet" as "tablets": the name for more than one, typed either way, never "capsuless". */
export function unitPlural(unit: string): string {
  const typed = unit.trim();
  if (MEASURE_UNITS.has(typed.toLowerCase())) return typed;
  const one = unitSingular(typed);
  if (/[^aeiou]y$/i.test(one)) return one.slice(0, -1) + 'ies';
  if (/(s|x|ch|sh)$/i.test(one)) return one + 'es';
  return one + 's';
}

/** A unit takes the plural for anything but exactly one, a half included ("½ capsule"). */
export function doseIsSingular(amount: number): boolean {
  return amount > 0 && amount <= 1;
}

/** "½ capsule", "2 capsules": how much one dose or one day is, with its unit. */
export function doseWithUnit(amount: number, unit: string): string {
  if (!unit.trim()) return formatDoseAmount(amount);
  return `${formatDoseAmount(amount)} ${doseIsSingular(amount) ? unitSingular(unit) : unitPlural(unit)}`;
}
