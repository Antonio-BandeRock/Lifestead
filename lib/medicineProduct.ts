// A supplement or medicine looked up by its retail barcode (2026-11-18).
//
// openFDA holds only U.S. drug labels, so a bottle bought in Mexico (or
// anywhere else) has nothing there. Open Food Facts and its two sister
// databases, Open Products Facts and Open Beauty Facts, hold what the
// people who use them typed in from packages: many supplements are there,
// with a name, a brand, the ingredients and a nutrition table. Free,
// published, no key. Only the barcode is sent.
//
// What comes back is never the maker's word, so the screen says who typed
// it, and a miss says so with nothing shown in its place. Kept free of
// runtime imports so scripts/test_medicine_product.js can load it.

export type ProductSource = 'Open Food Facts' | 'Open Products Facts' | 'Open Beauty Facts';

export type ProductAmount = { key: string; label: string; amount: number; unit: string; shown: string };

export type MedicineProduct = {
  code: string;
  source: ProductSource;
  name: string;
  brand: string | null;
  ingredients: string | null;
  servingSize: string | null;
  /** Whether the amounts are per serving or per 100 g (when no serving figures were typed in). */
  basis: 'serving' | '100g';
  amounts: ProductAmount[];
};

export const PRODUCT_SOURCES: { base: string; source: ProductSource }[] = [
  { base: 'https://world.openfoodfacts.org/api/v2/product', source: 'Open Food Facts' },
  { base: 'https://world.openproductsfacts.org/api/v2/product', source: 'Open Products Facts' },
  { base: 'https://world.openbeautyfacts.org/api/v2/product', source: 'Open Beauty Facts' },
];

const FIELDS =
  'product_name,product_name_es,product_name_en,brands,ingredients_text,ingredients_text_es,ingredients_text_en,serving_size,nutriments';

export function productUrl(base: string, code: string): string {
  return `${base}/${encodeURIComponent(code)}.json?fields=${FIELDS}`;
}

/** In label order: the words a supplement label uses, so the parser reads them back. */
const NUTRIENTS: { key: string; label: string; energy?: boolean }[] = [
  { key: 'energy-kcal', label: 'Calories', energy: true },
  { key: 'proteins', label: 'Protein' },
  { key: 'carbohydrates', label: 'Carbohydrate' },
  { key: 'sugars', label: 'Sugars' },
  { key: 'fat', label: 'Fat' },
  { key: 'fiber', label: 'Fiber' },
  { key: 'vitamin-a', label: 'Vitamin A' },
  { key: 'vitamin-c', label: 'Vitamin C' },
  { key: 'vitamin-d', label: 'Vitamin D' },
  { key: 'vitamin-e', label: 'Vitamin E' },
  { key: 'vitamin-k', label: 'Vitamin K' },
  { key: 'vitamin-b1', label: 'Thiamin' },
  { key: 'vitamin-b2', label: 'Riboflavin' },
  { key: 'vitamin-pp', label: 'Niacin' },
  { key: 'vitamin-b6', label: 'Vitamin B6' },
  { key: 'vitamin-b9', label: 'Folate' },
  { key: 'folates', label: 'Folate' },
  { key: 'vitamin-b12', label: 'Vitamin B12' },
  { key: 'biotin', label: 'Biotin' },
  { key: 'pantothenic-acid', label: 'Pantothenic acid' },
  { key: 'choline', label: 'Choline' },
  { key: 'calcium', label: 'Calcium' },
  { key: 'iron', label: 'Iron' },
  { key: 'phosphorus', label: 'Phosphorus' },
  { key: 'iodine', label: 'Iodine' },
  { key: 'magnesium', label: 'Magnesium' },
  { key: 'zinc', label: 'Zinc' },
  { key: 'selenium', label: 'Selenium' },
  { key: 'copper', label: 'Copper' },
  { key: 'manganese', label: 'Manganese' },
  { key: 'chromium', label: 'Chromium' },
  { key: 'molybdenum', label: 'Molybdenum' },
  { key: 'sodium', label: 'Sodium' },
  { key: 'potassium', label: 'Potassium' },
  { key: 'caffeine', label: 'Caffeine' },
];

function text(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().replace(/\s+/g, ' ') : null;
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function round(n: number): string {
  if (n >= 100) return String(Math.round(n));
  if (n >= 10) return String(Math.round(n * 10) / 10);
  return String(Math.round(n * 100) / 100);
}

/** A mass given in grams, shown the way a label shows it. */
export function gramsShown(grams: number): { amount: number; unit: string; shown: string } {
  if (grams >= 1) return { amount: Number(round(grams)), unit: 'g', shown: `${round(grams)} g` };
  if (grams >= 0.001) return { amount: Number(round(grams * 1000)), unit: 'mg', shown: `${round(grams * 1000)} mg` };
  return { amount: Number(round(grams * 1e6)), unit: 'mcg', shown: `${round(grams * 1e6)} mcg` };
}

/** Reads one answer from an Open Facts database. Null when it holds nothing usable. */
export function productFromResponse(data: unknown, code: string, source: ProductSource): MedicineProduct | null {
  const body = data as { status?: unknown; product?: Record<string, unknown> } | null;
  if (!body || body.status !== 1 || !body.product || typeof body.product !== 'object') return null;
  const p = body.product;
  const name = text(p.product_name_es) ?? text(p.product_name) ?? text(p.product_name_en);
  const ingredients = text(p.ingredients_text_es) ?? text(p.ingredients_text) ?? text(p.ingredients_text_en);
  const n = (p.nutriments && typeof p.nutriments === 'object' ? p.nutriments : {}) as Record<string, unknown>;
  const perServing = NUTRIENTS.some((x) => num(n[`${x.key}_serving`]) !== null);
  const suffix = perServing ? '_serving' : '_100g';
  const amounts: ProductAmount[] = [];
  const seen = new Set<string>();
  for (const x of NUTRIENTS) {
    if (seen.has(x.label)) continue;
    const v = num(n[`${x.key}${suffix}`]);
    if (v === null || v <= 0) continue;
    seen.add(x.label);
    if (x.energy) {
      amounts.push({ key: x.key, label: x.label, amount: Number(round(v)), unit: 'kcal', shown: `${round(v)} kcal` });
    } else {
      amounts.push({ key: x.key, label: x.label, ...gramsShown(v) });
    }
  }
  if (!name && !ingredients && amounts.length === 0) return null;
  return {
    code,
    source,
    name: name ?? code,
    brand: text(p.brands),
    ingredients,
    servingSize: text(p.serving_size),
    basis: perServing ? 'serving' : '100g',
    amounts,
  };
}

/**
 * Label text the supplement parser (lib/spokenSupplement.ts) reads back:
 * one amount per line when the figures are per serving. Figures per 100 g
 * are not a dose, so only the ingredients are offered then.
 */
export function labelTextFromProduct(product: MedicineProduct): string {
  const lines: string[] = [];
  if (product.basis === 'serving') {
    for (const a of product.amounts) {
      if (a.unit === 'kcal') continue;
      lines.push(`${a.label} ${a.shown}`);
    }
  }
  if (product.ingredients) lines.push(product.ingredients);
  return lines.join('\n');
}

export function productBasisNote(product: MedicineProduct): string {
  if (product.basis === 'serving') {
    return product.servingSize ? `Per serving (${product.servingSize}).` : 'Per serving.';
  }
  return 'Per 100 g, since no amounts per serving were typed in. That is not one dose.';
}

export function productRetrievalStatement(product: MedicineProduct, retrievedAtIso: string): string {
  const d = new Date(retrievedAtIso);
  const when = Number.isNaN(d.getTime())
    ? retrievedAtIso
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `From ${product.source}, retrieved ${when}. Only the code ${product.code} was sent.`;
}

/** The spellings worth asking for: a 12-digit UPC is often kept with a leading zero. */
export function codeSpellings(code: string): string[] {
  const out = [code];
  if (code.length === 12) out.push(`0${code}`);
  if (code.length === 13 && code.startsWith('0')) out.push(code.slice(1));
  return out;
}

/** What one database said about a code. */
export type DatabaseAnswer = {
  source: ProductSource;
  outcome: 'found' | 'empty' | 'not_found' | 'error' | 'unreachable';
  /** The HTTP status when the database answered with an error. */
  status?: number;
  /** The product name it holds, when found. */
  name?: string;
};

export type ProductLookup = {
  /** The first database in order that holds something usable, or null. */
  product: MedicineProduct | null;
  /** Every database asked, in order, with what it said (Tony, 2026-11-19). */
  answers: DatabaseAnswer[];
};

/** Reads one database answer body into its outcome, keeping a usable product. */
export function answerFromResponse(
  data: unknown,
  code: string,
  source: ProductSource,
): { answer: DatabaseAnswer; product: MedicineProduct | null } {
  const body = data as { status?: unknown } | null;
  if (!body || body.status !== 1) return { answer: { source, outcome: 'not_found' }, product: null };
  const product = productFromResponse(data, code, source);
  if (!product) return { answer: { source, outcome: 'empty' }, product: null };
  return { answer: { source, outcome: 'found', name: product.name }, product };
}

/** Asks one database every spelling of the code; the best answer wins. */
async function askOne(base: string, source: ProductSource, code: string): Promise<{ answer: DatabaseAnswer; product: MedicineProduct | null }> {
  let best: { answer: DatabaseAnswer; product: MedicineProduct | null } = { answer: { source, outcome: 'unreachable' }, product: null };
  const rank = { found: 4, empty: 3, not_found: 2, error: 1, unreachable: 0 };
  for (const spelling of codeSpellings(code)) {
    let next: { answer: DatabaseAnswer; product: MedicineProduct | null };
    try {
      const response = await fetch(productUrl(base, spelling));
      if (response.status === 404) next = { answer: { source, outcome: 'not_found' }, product: null };
      else if (!response.ok) next = { answer: { source, outcome: 'error', status: response.status }, product: null };
      else next = answerFromResponse(await response.json(), code, source);
    } catch {
      next = { answer: { source, outcome: 'unreachable' }, product: null };
    }
    if (rank[next.answer.outcome] > rank[best.answer.outcome]) best = next;
    if (best.answer.outcome === 'found') break;
  }
  return best;
}

/**
 * Asks all three databases at once and keeps every answer, so the screen
 * can say what each one said. The product shown is the first found, in the
 * order Open Food Facts, Open Products Facts, Open Beauty Facts.
 */
export async function lookUpMedicineProduct(code: string): Promise<ProductLookup> {
  const results = await Promise.all(PRODUCT_SOURCES.map(({ base, source }) => askOne(base, source, code)));
  const shown = results.find((r) => r.product)?.product ?? null;
  return { product: shown, answers: results.map((r) => r.answer) };
}

/**
 * One line per database asked, in order, saying what it answered for this
 * code. The one whose entry is shown says so; another that also holds the
 * code says it was not the one shown.
 */
export function databaseAnswerLines(lookup: ProductLookup, code: string): string[] {
  const shownFrom = lookup.product?.source ?? null;
  return lookup.answers.map((a) => {
    switch (a.outcome) {
      case 'found':
        return a.source === shownFrom
          ? `${a.source}: found ${a.name ?? code}. This is the entry shown.`
          : `${a.source}: also has an entry (${a.name ?? code}). It is not the one shown; ${shownFrom} was asked first.`;
      case 'empty':
        return `${a.source}: has an entry for ${code}, but nobody typed in a name, ingredients or amounts.`;
      case 'not_found':
        return `${a.source}: no entry for ${code}.`;
      case 'error':
        return `${a.source}: answered with an error (status ${a.status ?? 'unknown'}), so its answer is not known.`;
      default:
        return `${a.source}: could not be reached, so its answer is not known.`;
    }
  });
}

/** True when no database answered at all, which reads as a connection problem. */
export function noDatabaseAnswered(lookup: ProductLookup): boolean {
  return lookup.answers.every((a) => a.outcome === 'unreachable');
}
