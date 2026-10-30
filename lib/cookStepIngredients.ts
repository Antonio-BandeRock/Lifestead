// Which ingredients a cook mode step uses, with their amounts, so a step
// reads in full without leaving cook mode to look back at the list
// (direct instruction, 2026-10-30: "the directions on each step needs to
// have all of the instructions contained so the person doesn't have to
// leave the cook mode to look back").
//
// Steps are written the way cooks write them, "Melt half the butter",
// "Add the onion, garlic and mushrooms", and the amounts live on the
// ingredient list. This reads each ingredient line for the words a step
// would call it by and lists, under the step, every line the step names,
// in the order the step names them, with "half" or "the rest" when the
// step says so. It works on any recipe's lines (System Recipes, a
// builder's own recipe, an imported one), since all it needs is the text.
//
// It errs on the side of listing: a step that names "the oil" lists every
// oil on the list, because a line shown that the step did not mean costs a
// glance, and a line missed sends the cook back out. Cook mode also keeps
// the whole list one tap away for anything this misses.
//
// Pure, with one pure import, so scripts/test_cook_step_ingredients.js
// checks it against every System Recipe without a phone.
import { parseIngredientLine } from './recipeImport';

export type CookIngredientLine = {
  text: string;
  /** Digest id of a recipe made first, which cook mode can open in place. */
  makeFirst?: string | null;
};

export type StepPortion = 'half' | 'rest' | 'third' | 'quarter';

export type StepIngredient = {
  line: CookIngredientLine;
  /** Position on the recipe's ingredient list. */
  index: number;
  portion: StepPortion | null;
};

// Words on an ingredient line that say how it is cut, cooked, sized or
// measured, which a step never uses to name the food.
const NOT_A_NAME = new Set(
  (
    'fresh raw common plain salted unsalted whole ground dried dry chopped finely roughly coarsely sliced diced minced ' +
    'crushed grated peeled cut piece wedge slice sprig cloves clove large small medium big little with without skin ' +
    'skinless boneless bone the and for into about optional cooked uncooked boiled baked fried roasted steamed toasted ' +
    'extra virgin tap few handful pinch taste packed soft softened melted cold warm hot room temperature thin thick thinly ' +
    'halved quartered inch inches tbsp tsp teaspoon tablespoon cup gram kg ml litre liter ounce pound serving made first ' +
    'fett plus more divided trimmed rinsed drained washed beaten lightly well until each other kind type style red green ' +
    'white black yellow brown golden dark light fine coarse shredded julienned cubed cube mashed pureed blanched soaked ' +
    'deseeded seeded cored stemmed pitted shelled unpeeled frozen canned tinned jarred bottled homemade store bought ' +
    'organic natural pure regular standard prepared ready mix not database stick stalk head bunch can jar tin package ' +
    'packet bag also some any all your their this that from per day long short ripe unripe young old new mature lean ' +
    'fat free low reduced sodium sweetened unsweetened flavored flavoured enriched fortified instant quick rolled ' +
    // A form a food comes in: the word in front names it (cumin seed, bay
    // leaf, chili flakes, garlic powder, lemon juice).
    'seed leaf flake powder juice zest'
  ).split(' '),
);

// Words that name a kind of thing more than one food is: "the sauce" or
// "the oil" in a step. On a line with a word in front ("fish sauce",
// "sesame oil") the step has to say both words, or the bare word with no
// other line of that kind it could mean.
const KIND_WORDS = new Set('sauce stock broth paste oil vinegar water wine milk cream syrup'.split(' '));

const PORTION_WORDS: [RegExp, StepPortion][] = [
  [/^half$/, 'half'],
  [/^(remaining|rest)$/, 'rest'],
  [/^third$/, 'third'],
  [/^quarter$/, 'quarter'],
];

function plain(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith('ves')) return `${word.slice(0, -3)}f`;
  if (word.length > 4 && /(oes|ches|shes|sses|xes)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

// Words a step and a line use for the same thing: a step says "the hot
// broth" for a line reading "Rinderbrühe (Beef Stock)" or "Brodo Vegetale".
const SAME_AS: Record<string, string> = {
  broth: 'stock',
  bouillon: 'stock',
  brodo: 'stock',
  caldo: 'stock',
  fumet: 'stock',
  fond: 'stock',
};

function sameAs(word: string): string {
  if (word.endsWith('bruhe')) return 'stock';
  return SAME_AS[word] ?? word;
}

function wordsOf(text: string): string[] {
  return plain(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map(stem)
    .map(sameAs);
}

type LineKeys = {
  /** Single words that name the food on their own. */
  words: string[];
  /** A modifier and kind word the step has to say together ("fish sauce"). */
  pairs: [string, string][];
  /** Kind words this line is ("oil" for olive oil). */
  kinds: string[];
  seasoning: boolean;
};

function keysFor(text: string): LineKeys {
  const parsed = parseIngredientLine(text);
  const source = parsed.isHeader ? '' : `${parsed.foodText || parsed.original}, ${parsed.prepNote}`;
  const keys: LineKeys = { words: [], pairs: [], kinds: [], seasoning: false };
  for (const segment of source.split(/[,;()]/)) {
    const named = wordsOf(segment).filter((word) => word.length >= 3 && !/^\d/.test(word) && !NOT_A_NAME.has(word));
    named.forEach((word, at) => {
      if (word === 'salt' || word === 'pepper') keys.seasoning = true;
      if (KIND_WORDS.has(word)) {
        keys.kinds.push(word);
        if (at > 0) keys.pairs.push([named[at - 1], word]);
        else keys.words.push(word);
      } else if (!keys.words.includes(word)) {
        keys.words.push(word);
      }
    });
  }
  // A line that is only a modifier and a kind word ("fish sauce") is named
  // by the pair; its modifier alone ("fish") names some other line.
  const modifiers = new Set(keys.pairs.map(([modifier]) => modifier));
  if (keys.pairs.length > 0 && keys.words.every((word) => modifiers.has(word))) {
    keys.words = keys.words.filter((word) => !modifiers.has(word));
  }
  return keys;
}

function portionBefore(stepWords: string[], at: number): StepPortion | null {
  for (let back = 1; back <= 4 && at - back >= 0; back += 1) {
    const word = stepWords[at - back];
    for (const [pattern, portion] of PORTION_WORDS) if (pattern.test(word)) return portion;
    if (word === 'and' || word === 'then') break;
  }
  return null;
}

/**
 * Every ingredient line a step names, in the order the step names them.
 * Lines with nothing that names a food (a header, an empty line) are never
 * listed.
 */
export function ingredientsForStep(step: string, lines: CookIngredientLine[]): StepIngredient[] {
  const stepWords = wordsOf(step);
  const keys = lines.map((line) => keysFor(line.text));
  const kindCount = new Map<string, number>();
  for (const key of keys) for (const kind of new Set(key.kinds)) kindCount.set(kind, (kindCount.get(kind) ?? 0) + 1);

  const found: { at: number; item: StepIngredient }[] = [];
  keys.forEach((key, index) => {
    let at = -1;
    const note = (position: number) => {
      if (position >= 0 && (at === -1 || position < at)) at = position;
    };
    for (const word of key.words) note(stepWords.indexOf(word));
    for (const [modifier, kind] of key.pairs) {
      for (let i = 1; i < stepWords.length; i += 1) {
        if (stepWords[i] === kind && stepWords[i - 1] === modifier) {
          note(i - 1);
          break;
        }
      }
    }
    // "Heat the oil": a bare kind word names every line of that kind, so
    // long as the step did not name a different modifier in front of it.
    for (const kind of key.kinds) {
      for (let i = 0; i < stepWords.length; i += 1) {
        if (stepWords[i] !== kind) continue;
        const before = i > 0 ? stepWords[i - 1] : '';
        const namesAnother = keys.some((other, o) => o !== index && other.pairs.some(([m, k]) => k === kind && m === before));
        if (!namesAnother && ((kindCount.get(kind) ?? 0) > 0)) {
          note(i);
          break;
        }
      }
    }
    if (key.seasoning) {
      const season = stepWords.findIndex((word) => word === 'season' || word === 'seasoning' || word === 'seasoned');
      note(season);
    }
    if (at >= 0) found.push({ at, item: { line: lines[index], index, portion: portionBefore(stepWords, at) } });
  });
  return found.sort((a, b) => a.at - b.at || a.item.index - b.item.index).map((entry) => entry.item);
}

// "Blend everything", "Add all the ingredients": every line. "Everything
// else", "the remaining ingredients": every line no earlier step listed.
const EVERY_LINE = /\b(everything|all (?:of )?the ingredients|all ingredients)\b(?!\s+else)/i;
const EVERY_OTHER_LINE =
  /\b(everything else|all (?:of )?the (?:other|remaining) ingredients|(?:the )?remaining ingredients|the rest of the ingredients|the other ingredients)\b/i;

/**
 * The lines listed under every step of a recipe, in step order. A step
 * that says everything lists every line, and one that says everything
 * else lists every line no earlier step listed.
 */
export function ingredientsForSteps(steps: string[], lines: CookIngredientLine[]): StepIngredient[][] {
  const listedSoFar = new Set<number>();
  return steps.map((step) => {
    const named = ingredientsForStep(step, lines);
    let extra: number[] = [];
    if (EVERY_OTHER_LINE.test(step)) {
      const here = new Set(named.map((item) => item.index));
      extra = lines.map((_, index) => index).filter((index) => !listedSoFar.has(index) && !here.has(index));
    } else if (EVERY_LINE.test(step)) {
      const here = new Set(named.map((item) => item.index));
      extra = lines.map((_, index) => index).filter((index) => !here.has(index));
    }
    const all = [...named, ...extra.filter((index) => lines[index].text.trim()).map((index) => ({ line: lines[index], index, portion: null }))];
    for (const item of all) listedSoFar.add(item.index);
    return all;
  });
}

export function portionLabel(portion: StepPortion): string {
  switch (portion) {
    case 'half':
      return 'half of it';
    case 'rest':
      return 'the rest of it';
    case 'third':
      return 'a third of it';
    case 'quarter':
      return 'a quarter of it';
  }
}
