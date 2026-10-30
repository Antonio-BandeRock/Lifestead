// An ingredient's name cut down to what it is, for the builders' ingredient
// lists (direct request, 2026-10-30): "Grains, wheat flour, white, bread
// flour" reads as Wheat Flour, "Water, tap" as Water, "Table Salt" as Salt.
//
// The reference database names a food the way its national source does: a
// food group in front, then the food, then kind, colour, state and
// preparation, comma by comma. This keeps the food and, where the food word
// alone would say too little ("Beans", "Oil", "Chicken"), the one word that
// says which (Black Beans, Olive Oil, Chicken Thigh). Everything else is
// left for the full name, which the food's details still show.
//
// Display only: nothing is stored under the short name, and two different
// foods can share one (both waters read as Water). Pure, so
// scripts/test_ingredient_short_name.js runs it over every base name.

// A first segment that is a food group rather than a food.
const GROUP_WORDS = new Set([
  'grains',
  'grain',
  'cereals',
  'cereal',
  'nuts',
  'seeds',
  'spices',
  'spice',
  'herbs',
  'vegetables',
  'vegetable',
  'fruit',
  'fruits',
  'legumes',
  'beverages',
  'beverage',
  'dairy',
  'sweets',
  'snacks',
  'fats',
  'condiments',
  'baked products',
  'fruit juices',
  'nut',
  'alcoholic beverage',
]);

// Words that describe a food's state or grade rather than which food it is.
const DESCRIPTOR_WORDS = new Set([
  'tap',
  'table',
  'common',
  'plain',
  'fresh',
  'raw',
  'salted',
  'unsalted',
  'regular',
  'ordinary',
  'iodised',
  'iodized',
  'white',
  'whole',
  'mature seeds',
  'cooked',
  'boiled',
  'drained',
  'without salt',
  'with salt',
  'with salt added',
  'without salt added',
  'unenriched',
  'enriched',
  'bottled',
  'municipal',
  'all-purpose',
  'all purpose',
  'commercial',
  'homemade',
  'average',
  'generic',
  'ns as to form',
  'unprepared',
  'prepared',
  'canned',
  'frozen',
  'dried',
  'dry',
  'ripe',
  'broiler',
  'broilers or fryers',
  'offal and by-products',
  'powder',
  'ground',
  'unsweetened',
  'sweetened',
  'stewing',
  'roasting',
  'fryers',
]);

// The few of those also dropped from the front or end of a name written as
// one phrase ("Table Salt", "Tap water", "Okra canned"). Words like white or
// powder stay there, since White Rice and Garlic Powder are what those foods
// are.
const TRIM_WORDS = new Set(['tap', 'table', 'common', 'plain', 'fresh', 'raw', 'canned', 'frozen', 'dried', 'drained', 'cooked', 'boiled', 'salted', 'unsalted']);

// Food words that need the next word to say which one.
const NEEDS_KIND_AFTER = new Set([
  'beans',
  'bean',
  'oil',
  'milk',
  'cheese',
  'pepper',
  'peppers',
  'rice',
  'sugar',
  'vinegar',
  'juice',
  'lentils',
  'peas',
  'squash',
  'lettuce',
  'cabbage',
  'tea',
  'sauce',
  'flour',
  'yogurt',
  'yoghurt',
  'mustard',
  'mushrooms',
  'mushroom',
  'onions',
  'onion',
  'potatoes',
  'potato',
  'tomatoes',
  'tomato',
  'cream',
  'seed',
  'butter',
]);

// Food words the next word names better on its own (Pasta, spaghetti reads
// as Spaghetti; Seaweed, kelp as Kelp).
const REPLACED_BY_KIND = new Set(['pasta', 'seaweed', 'noodles', 'cereal']);

// Meats, where the next word is the cut (Chicken Thigh, Beef Mince).
const NEEDS_CUT_AFTER = new Set(['chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'veal', 'goat', 'mutton', 'venison', 'rabbit']);

// Joining words stay lower case inside a name (Chili with Beans).
const SMALL_WORDS = new Set(['and', 'or', 'with', 'of', 'in', 'on', 'the', 'a', 'au', 'ou', 'et', 'de', 'med', 'och', 'og']);

function titleCase(text: string): string {
  return text
    .split(' ')
    .filter(Boolean)
    .map((word, at) => {
      const lower = word.toLowerCase();
      if (at > 0 && SMALL_WORDS.has(lower)) return lower;
      return word.length <= 1 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function isDescriptor(segment: string): boolean {
  return DESCRIPTOR_WORDS.has(segment.toLowerCase());
}

// Drops descriptor words at either end of one segment ("Table Salt", "Tap
// water", "Savoy cabbage canned"), never the last word left.
function trimDescriptors(segment: string): string {
  const words = segment.split(' ').filter(Boolean);
  while (words.length > 1 && TRIM_WORDS.has(words[0].toLowerCase())) words.shift();
  while (words.length > 1 && TRIM_WORDS.has(words[words.length - 1].toLowerCase())) words.pop();
  return words.join(' ');
}

export function ingredientShortName(baseName: string): string {
  const original = baseName.trim();
  if (!original) return original;
  const cleaned = original
    .replace(/\([^)]*\)|［[^］]*］|\[[^\]]*\]/g, ' ')
    .replace(/[*"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  let segments = cleaned
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) return original;
  if (segments.length > 1 && GROUP_WORDS.has(segments[0].toLowerCase())) segments = segments.slice(1);

  const head = trimDescriptors(segments[0]);
  const headWords = head.split(' ');
  const last = headWords[headWords.length - 1].toLowerCase();
  // The word that says which one: the first of the next two segments that
  // is not a descriptor, used only when it is a single word.
  const kind = segments.slice(1, 3).find((segment) => !isDescriptor(segment));
  const kindWords = kind ? trimDescriptors(kind) : '';
  const oneWordKind = kindWords && !kindWords.includes(' ') && !/\d/.test(kindWords) && !isDescriptor(kindWords) ? kindWords : '';

  let name = head;
  if (headWords.length === 1 && oneWordKind) {
    if (NEEDS_KIND_AFTER.has(last)) name = `${oneWordKind} ${head}`;
    else if (NEEDS_CUT_AFTER.has(last)) name = `${head} ${oneWordKind}`;
    else if (REPLACED_BY_KIND.has(last)) name = oneWordKind;
  } else if (headWords.length === 1 && kindWords.toLowerCase().endsWith(` ${last}`)) {
    // "Peas, green peas" says it twice.
    name = kindWords;
  }
  // A few sources put the food word last: "Pink, Boiled, Salted Beans".
  const tail = segments[segments.length - 1].split(' ');
  const tailWord = tail[tail.length - 1];
  if (segments.length > 1 && /^beans?$/i.test(tailWord) && !/bean/i.test(name)) name = `${head} ${tailWord}`;
  return titleCase(name);
}
