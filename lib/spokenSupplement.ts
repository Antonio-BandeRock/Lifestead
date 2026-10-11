// Reading a supplement label said aloud or typed into rows for My Meds
// (voice step 4, 1.0.66.22). Tony, asking for voice everywhere: "This will
// be extremely useful for entering the ingredients of a multivitamin."
//
// "Vitamin D3 25 micrograms, zinc 11 milligrams, B12 500 mcg as
// methylcobalamin" becomes three rows, each a nutrient code, an amount, a
// unit and the words that named its form. Speech rarely carries commas, so
// a piece is also cut after every amount and unit, and the words after a
// unit belong to the next nutrient unless they start with "as" or "in the
// form of".
//
// Nothing is guessed. A piece with no amount, no unit, no recognised
// nutrient, or two nutrients before one amount comes back in notUnderstood
// with the reason, and the screen lists it for the person to enter by hand.
// The rows fill the form only; nothing is saved until Add supplement.
//
// Pure, no React and no database, so scripts/test_spoken_supplement.js can
// check it under node. Form names are matched by matchSupplementForm against
// the list the caller reads from supplement_forms.

export type SpokenSupplementUnit = 'mg' | 'mcg' | 'g' | 'IU';

export type SpokenSupplementRow = {
  spokenText: string;
  nutrientCode: string;
  amount: number;
  unit: SpokenSupplementUnit;
  /** The words that named a form ("methylcobalamin", "glycinate"), or null. */
  formWords: string | null;
};

export type SpokenSupplementReading = {
  rows: SpokenSupplementRow[];
  notUnderstood: { spokenText: string; reason: string }[];
};

type Alias = { words: string; code: string; form?: string };

// Each nutrient by the names a label or a person uses for it. A name that is
// itself a form (methylcobalamin, folic acid) carries that form along.
const ALIAS_TABLE: [string, string[], Record<string, string>?][] = [
  ['vitamin_a', ['vitamin a', 'retinol', 'retinyl palmitate', 'retinyl acetate', 'beta carotene']],
  ['vitamin_c', ['vitamin c', 'ascorbic acid', 'ascorbate', 'sodium ascorbate', 'calcium ascorbate']],
  [
    'vitamin_d',
    ['vitamin d'],
    { 'vitamin d3': 'd3', 'vitamin d2': 'd2', d3: 'd3', d2: 'd2', cholecalciferol: 'cholecalciferol', ergocalciferol: 'ergocalciferol' },
  ],
  ['vitamin_e', ['vitamin e', 'tocopherol', 'tocopherols', 'tocopheryl', 'd alpha tocopherol', 'dl alpha tocopherol', 'tocopheryl acetate']],
  [
    'vitamin_k',
    ['vitamin k', 'vitamin k2', 'k2', 'menaquinone'],
    { 'vitamin k1': 'k1', k1: 'k1', phylloquinone: 'phylloquinone', mk7: 'mk7', mk4: 'mk4', 'k2 mk7': 'mk7', 'k2 mk4': 'mk4', 'vitamin k2 mk7': 'mk7', 'vitamin k2 mk4': 'mk4' },
  ],
  ['thiamin_b1', ['thiamin', 'thiamine', 'thiamine hcl', 'thiamine mononitrate', 'benfotiamine', 'vitamin b1', 'b1']],
  ['riboflavin_b2', ['riboflavin', 'vitamin b2', 'b2', 'riboflavin 5 phosphate']],
  ['niacin_b3', ['niacin', 'niacinamide', 'nicotinamide', 'nicotinic acid', 'vitamin b3', 'b3']],
  ['pantothenic_acid_b5', ['pantothenic acid', 'pantothenate', 'calcium pantothenate', 'd calcium pantothenate', 'vitamin b5', 'b5']],
  ['vitamin_b6', ['vitamin b6', 'b6', 'pyridoxine', 'pyridoxine hcl', 'pyridoxal', 'pyridoxal 5 phosphate', 'p5p']],
  ['biotin_b7', ['biotin', 'vitamin b7', 'b7', 'vitamin h']],
  [
    'folate_b9',
    ['folate', 'vitamin b9', 'b9'],
    { 'folic acid': 'folic acid', methylfolate: 'methylfolate', 'l methylfolate': 'methylfolate', '5 mthf': 'methylfolate', mthf: 'methylfolate' },
  ],
  [
    'vitamin_b12',
    ['vitamin b12', 'b12', 'cobalamin', 'hydroxocobalamin', 'adenosylcobalamin'],
    { methylcobalamin: 'methylcobalamin', cyanocobalamin: 'cyanocobalamin' },
  ],
  ['choline', ['choline', 'choline bitartrate', 'choline chloride']],
  ['inositol', ['inositol', 'myo inositol']],
  ['calcium', ['calcium']],
  ['copper', ['copper', 'cupric oxide', 'copper gluconate']],
  ['iodine', ['iodine', 'iodide'], { 'potassium iodide': 'potassium iodide', kelp: 'kelp' }],
  ['iron', ['iron'], { 'ferrous sulfate': 'ferrous sulfate', 'ferrous bisglycinate': 'bisglycinate', 'ferrous fumarate': 'ferrous fumarate', 'ferrous gluconate': 'ferrous gluconate' }],
  ['magnesium', ['magnesium']],
  ['manganese', ['manganese']],
  ['phosphorus', ['phosphorus', 'phosphate']],
  ['potassium', ['potassium']],
  ['selenium', ['selenium'], { selenomethionine: 'selenomethionine', 'l selenomethionine': 'selenomethionine', 'sodium selenite': 'sodium selenite' }],
  ['sodium', ['sodium', 'salt']],
  ['zinc', ['zinc']],
  ['glycine', ['glycine']],
  ['caffeine', ['caffeine']],
  ['lycopene', ['lycopene']],
  ['protein', ['protein']],
  ['fiber_total', ['fiber', 'fibre', 'dietary fiber', 'dietary fibre']],
  ['carbohydrate', ['carbohydrate', 'carbohydrates', 'carbs', 'total carbohydrate']],
  ['sugars_total', ['sugar', 'sugars', 'total sugars']],
  ['fat_total', ['fat', 'total fat']],
];

const ALIASES: Alias[] = ALIAS_TABLE.flatMap(([code, plain, withForm]) => [
  ...plain.map((words) => ({ words, code })),
  ...Object.entries(withForm ?? {}).map(([words, form]) => ({ words, code, form })),
])
  // Longest first, so "calcium pantothenate" is B5 rather than calcium and
  // "potassium iodide" is iodine rather than potassium.
  .sort((a, b) => b.words.length - a.words.length);

// Words on a label that name no nutrient and no form.
const FILLER = new Set([
  'vitamin', 'as', 'from', 'the', 'of', 'a', 'an', 'per', 'serving', 'each', 'tablet', 'tablets', 'capsule', 'capsules',
  'softgel', 'softgels', 'scoop', 'contains', 'dfe', 'rae', 'ne', 'elemental', 'total', 'amount', 'daily', 'value',
  'with', 'in', 'form', 'and', 'or', 'it', 'has', 'there', 'is', 'are', 'mg', 'mcg', 'g', 'iu',
]);

const UNIT_PATTERN = /(\d+(?:\.\d+)?)\s*(mg|mcg|g|iu)\b/g;

/** Lowercases and spells every unit one way, so the reading below has one
 *  shape to deal with. Exported for the test. */
export function normalizeSpokenLabel(text: string): string {
  let s = ` ${text.toLowerCase()} `;
  s = s.replace(/[µμ]g\b/g, 'mcg');
  // Thousands separators before any splitting on commas: "1,000 IU".
  s = s.replace(/(\d),(\d{3})\b/g, '$1$2');
  s = s.replace(/(\d)\s+point\s+(\d)/g, '$1.$2');
  // A percent of daily value is not an amount of the nutrient.
  s = s.replace(/\d+(?:\.\d+)?\s*(?:%|percent)/g, ' ');
  s = s.replace(/\binternational\s+units?\b|\bi\.?\s?u\.?(?=\s|$)/g, 'iu');
  s = s.replace(/\bmilli\s?grams?\b|\bmgs\b/g, 'mg');
  s = s.replace(/\bmicro\s?grams?\b|\bmcgs\b|\bug\b/g, 'mcg');
  s = s.replace(/\bgrams?\b|\bgm\b/g, 'g');
  // "B 12", "B-12", "D 3", "K 2", "MK-7", unless the number is an amount.
  s = s.replace(/\b(b|d|k|mk)[\s-](\d{1,2})\b(?!\s*(?:\.\d|\d|mg|mcg|g|iu)\b)/g, '$1$2');
  s = s.replace(/[()[\]:]/g, ' ');
  s = s.replace(/-/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

function splitPieces(normalized: string): string[] {
  return normalized
    .split(/[,;\n]|\.(?!\d)|\band\b|\bthen\b|\bplus\b|\balso\b|\bnext\b/)
    .map((piece) => piece.trim())
    .filter(Boolean);
}

function wordsOf(text: string): string[] {
  return text.split(' ').filter(Boolean);
}

/** Every alias found in the text as whole words, longest first, none
 *  overlapping. */
function findAliases(text: string): { alias: Alias; start: number; end: number }[] {
  const words = wordsOf(text);
  const taken = new Array(words.length).fill(false);
  const found: { alias: Alias; start: number; end: number }[] = [];
  for (const alias of ALIASES) {
    const aw = alias.words.split(' ');
    for (let i = 0; i + aw.length <= words.length; i++) {
      let hit = true;
      for (let j = 0; j < aw.length; j++) {
        if (taken[i + j] || words[i + j] !== aw[j]) {
          hit = false;
          break;
        }
      }
      if (!hit) continue;
      for (let j = 0; j < aw.length; j++) taken[i + j] = true;
      found.push({ alias, start: i, end: i + aw.length });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

function meaningful(words: string[]): string[] {
  return words.filter((word) => !FILLER.has(word) && !/^\d/.test(word));
}

const FORM_LEAD = /^(?:as|in the form of|from)\s+/;

type Chunk = { name: string; amount: number | null; unit: SpokenSupplementUnit | null; form: string | null };

// One piece can hold several amounts when nothing was said between them:
// "vitamin d 25 mcg zinc 11 mg". Each amount closes a chunk; what follows a
// unit opens the next, unless it starts with "as", in which case it names
// the form up to where the next nutrient's name begins.
function chunksOf(piece: string): Chunk[] {
  const found = [...piece.matchAll(UNIT_PATTERN)].map((match) => ({
    index: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
    amount: Number(match[1]),
    unit: (match[2] === 'iu' ? 'IU' : match[2]) as SpokenSupplementUnit,
  }));
  if (found.length === 0) {
    const bare = piece.match(/(\d+(?:\.\d+)?)/);
    return [{ name: piece, amount: bare ? Number(bare[1]) : null, unit: null, form: null }];
  }
  // "25 mcg (1000 IU)": the same amount said twice, nothing between. The
  // first stands and the second is passed over.
  const amounts: typeof found = [];
  for (const match of found) {
    const previous = amounts[amounts.length - 1];
    if (previous) {
      const gap = piece.slice(previous.end, match.index).trim();
      if (meaningful(wordsOf(gap)).length === 0 && !FORM_LEAD.test(gap)) {
        previous.end = match.end;
        continue;
      }
    }
    amounts.push(match);
  }

  const leading = piece.slice(0, amounts[0].index).trim();
  const trailing = piece.slice(amounts[amounts.length - 1].end).trim();
  // "25 mcg vitamin d 11 mg zinc": each name follows its amount.
  const amountFirst =
    findAliases(leading).length === 0 && !FORM_LEAD.test(trailing) && findAliases(trailing).length > 0;

  const chunks: Chunk[] = [];
  let name = leading;
  for (let i = 0; i < amounts.length; i++) {
    const amount = amounts[i];
    const isLast = i === amounts.length - 1;
    let after = piece.slice(amount.end, isLast ? piece.length : amounts[i + 1].index).trim();
    let form: string | null = null;
    let nextName = '';
    if (amountFirst) {
      chunks.push({ name: after.replace(FORM_LEAD, ''), amount: amount.amount, unit: amount.unit, form: null });
      continue;
    }
    if (FORM_LEAD.test(after)) {
      after = after.replace(FORM_LEAD, '');
      if (isLast) {
        form = after || null;
      } else {
        // The form runs up to where the next nutrient's name begins: "as
        // methylcobalamin zinc 11 mg" ends the form at zinc.
        const words = wordsOf(after);
        const next = findAliases(after).find((alias) => alias.start > 0);
        const cutAt = next ? next.start : words.length;
        form = words.slice(0, cutAt).join(' ') || null;
        nextName = words.slice(cutAt).join(' ');
      }
    } else if (!isLast) {
      nextName = after;
    } else if (after) {
      // Words after the last amount, with a name already before it, are a
      // form when they name one ("zinc 15 mg picolinate").
      form = meaningful(wordsOf(after)).join(' ') || null;
    }
    chunks.push({ name, amount: amount.amount, unit: amount.unit, form });
    name = nextName;
  }
  return chunks;
}

/** The piece as the screen says it back: name, amount, unit and form. */
function describeChunk(chunk: Chunk): string {
  return [
    meaningful(wordsOf(chunk.name)).length ? chunk.name.trim() : '',
    chunk.amount != null ? `${chunk.amount}${chunk.unit ? ` ${chunk.unit}` : ''}` : '',
    chunk.form ? `as ${chunk.form}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Reads a spoken or typed label into rows and the pieces it could not
 *  read, with the reason for each. */
export function readSpokenSupplementLabel(transcript: string): SpokenSupplementReading {
  const reading: SpokenSupplementReading = { rows: [], notUnderstood: [] };
  for (const piece of splitPieces(normalizeSpokenLabel(transcript))) {
    for (const chunk of chunksOf(piece)) {
      const aliases = findAliases(chunk.name);
      const spokenText = describeChunk(chunk) || piece;
      if (aliases.length === 0) {
        // Label headings ("supplement facts", "serving size 1 capsule") name
        // nothing and carry no unit; they are passed over without comment.
        // A piece with an amount and a unit is reported.
        if (chunk.unit) {
          reading.notUnderstood.push({ spokenText, reason: 'No nutrient this app tracks was recognised in it.' });
        }
        continue;
      }
      const codes = new Set(aliases.map((a) => a.alias.code));
      if (codes.size > 1) {
        reading.notUnderstood.push({
          spokenText,
          reason: 'More than one nutrient was named before one amount, so it was left for you to enter.',
        });
        continue;
      }
      if (chunk.amount == null) {
        reading.notUnderstood.push({ spokenText, reason: 'No amount was heard for it.' });
        continue;
      }
      if (!chunk.unit) {
        reading.notUnderstood.push({ spokenText, reason: 'No unit (mg, mcg, g or IU) was heard after the amount.' });
        continue;
      }
      const nameWords = wordsOf(chunk.name);
      const afterName = meaningful(nameWords.slice(aliases[aliases.length - 1].end));
      const formParts = [...new Set([...aliases.map((a) => a.alias.form), chunk.form, afterName.length ? afterName.join(' ') : null])].filter(
        (part): part is string => !!part && part.trim().length > 0,
      );
      reading.rows.push({
        spokenText,
        nutrientCode: aliases[0].alias.code,
        amount: chunk.amount,
        unit: chunk.unit,
        formWords: formParts.length ? formParts.join(' ') : null,
      });
    }
  }
  return reading;
}

function compact(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** The one form in the list every form word appears in, or null when none
 *  does or more than one does. "d3" finds "Vitamin D3 (cholecalciferol)",
 *  "glycinate" finds "Magnesium glycinate / bisglycinate". */
export function matchSupplementForm(formWords: string, formNames: string[]): string | null {
  const words = wordsOf(formWords.toLowerCase().replace(/-/g, ' ')).filter((word) => !FILLER.has(word));
  if (words.length === 0) return null;
  const hits = formNames.filter((name) => {
    const target = compact(name);
    return words.every((word) => target.includes(compact(word)));
  });
  return hits.length === 1 ? hits[0] : null;
}
