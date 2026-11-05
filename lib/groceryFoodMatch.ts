// What a typed or spoken grocery item is in the foods database (2026-11-04,
// direct instruction: "The items typed in and spoken in should be matched
// with the database"). A line written under the database's name and
// category matches the kitchen and the recipes by that pair, the same as a
// line built from the schedule, where "tomatos" typed in a hurry matched
// nothing at all.
//
// Two outcomes and never a guess past them. One food plainly named is a
// match and goes on the list under its database name. Anything less sure
// comes back as up to four close foods to choose from, with Keep as Typed
// beside them on the screen, since a brand or a dish the database has never
// heard of is a fine thing to buy.
//
// Pure, with no React and no database, so scripts/test_grocery_food_match.js
// checks it without a phone. The foods are food_purchase_forms, the set the
// grocery list and the kitchen already group on.
import { foodDisplayName } from './ingredientShortName';

export type MatchableFood = { category: string; baseName: string };

export type FoodMatch<T extends MatchableFood> =
  | { kind: 'match'; food: T }
  | { kind: 'choose'; options: T[] }
  | { kind: 'none' };

/** At most this many foods are offered when the name is not plain enough. */
export const MATCH_OPTION_LIMIT = 4;

// Words that say how a food is kept or cut, never which food it is.
const STATE_WORDS = new Set([
  'raw', 'fresh', 'dry', 'dried', 'ground', 'whole', 'plain', 'loose', 'frozen', 'canned', 'cooked',
  'boiled', 'unsalted', 'salted', 'lowfat', 'nonfat', 'fat', 'free', 'without', 'with', 'skin',
  'and', 'or', 'of', 'the', 'a', 'an', 'in', 'for', 'some', 'bag', 'jar', 'can', 'bottle',
]);

function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.endsWith('oes')) return word.slice(0, -2);
  if (/(ches|shes|sses|xes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('ss')) return word;
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

/** Lower case, no accents or punctuation, each word made singular. */
export function normalizeFoodWords(text: string): string[] {
  return stripAccents(text.toLowerCase())
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(singular);
}

function phrase(text: string): string {
  return normalizeFoodWords(text).join(' ');
}

function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      best = Math.min(best, current[j]);
    }
    if (best > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
}

// Every way a food is named. Its names proper are its short name, its full
// name, each name in brackets and whatever the translate function gives for
// the short name. Each comma part ("cloves" in "Spices, cloves, ground") is a
// weaker name, since "chicken" in "Chicken, broiler, thigh" is not the thigh.
type FoodNames = { names: string[]; parts: string[] };

function namesOf(food: MatchableFood, translate?: (english: string) => string): FoodNames {
  const short = foodDisplayName(food.baseName);
  const listed = food.baseName.includes(',');
  // A full name written as a list ("Dressing, mayonnaise, whole egg type") is
  // only its parts, so "egg" finds the egg before the mayonnaise.
  const names = new Set<string>(listed ? [phrase(short)] : [phrase(short), phrase(food.baseName)]);
  for (const inside of food.baseName.match(/\(([^)]*)\)/g) ?? []) {
    for (const part of inside.slice(1, -1).split(',')) names.add(phrase(part));
  }
  if (translate) {
    const translated = translate(short);
    if (translated && translated !== short) names.add(phrase(translated));
  }
  names.delete('');
  const parts = new Set<string>();
  const commaParts = food.baseName.replace(/\([^)]*\)/g, ' ').split(',');
  if (commaParts.length > 1) {
    for (const part of commaParts) {
      const words = normalizeFoodWords(part).filter((word) => !STATE_WORDS.has(word));
      if (words.length > 0 && !names.has(words.join(' '))) parts.add(words.join(' '));
    }
  }
  return { names: Array.from(names), parts: Array.from(parts) };
}

function scoreNames(typed: string, typedWords: string[], names: string[]): number {
  let best = 0;
  for (const name of names) {
    if (name === typed) return 100;
    const words = name.split(' ');
    if (typedWords.length > 0 && typedWords.every((word) => words.includes(word))) {
      // Every word typed is in this name: "green bean" in "snap bean green bean".
      best = Math.max(best, words.length === typedWords.length ? 90 : 60);
      continue;
    }
    if (typed.length >= 3 && words.some((word) => word.startsWith(typed))) best = Math.max(best, 45);
    const limit = typed.length >= 7 ? 2 : typed.length >= 4 ? 1 : 0;
    if (limit > 0) {
      if (typed.length >= 5 && editDistance(typed, name, limit) <= limit) best = Math.max(best, 70);
      else if (typedWords.length === 1 && words.some((word) => editDistance(typed, word, limit) <= limit)) best = Math.max(best, 40);
    }
  }
  return best;
}

function score(typed: string, typedWords: string[], food: FoodNames): number {
  const byName = scoreNames(typed, typedWords, food.names);
  const byPart = scoreNames(typed, typedWords, food.parts);
  // A comma part named exactly is worth less than a name, and a part merely
  // containing the words comes just after a name containing them.
  return Math.max(byName, byPart >= 90 ? 80 : Math.min(byPart, 55));
}

/** What a typed name is in the foods given: one plain match, foods to choose from, or nothing close. */
export function matchFoodName<T extends MatchableFood>(
  typed: string,
  foods: readonly T[],
  translate?: (english: string) => string,
): FoodMatch<T> {
  const typedWords = normalizeFoodWords(typed).filter((word) => !STATE_WORDS.has(word));
  const typedPhrase = typedWords.join(' ');
  if (!typedPhrase) return { kind: 'none' };
  const scored = foods
    .map((food) => ({ food, score: score(typedPhrase, typedWords, namesOf(food, translate)) }))
    .filter((entry) => entry.score >= 40)
    .sort((a, b) => b.score - a.score || foodDisplayName(a.food.baseName).length - foodDisplayName(b.food.baseName).length);
  if (scored.length === 0) return { kind: 'none' };
  const [top, second] = scored;
  // A plain match: the food's name itself with no second food named the same
  // way, or one comma part or one close spelling with no other food carrying
  // the words at all.
  if (top.score >= 90 && !(second && second.score >= 90)) return { kind: 'match', food: top.food };
  if (top.score >= 70 && !(second && second.score >= 55)) return { kind: 'match', food: top.food };
  return { kind: 'choose', options: scored.slice(0, MATCH_OPTION_LIMIT).map((entry) => entry.food) };
}
