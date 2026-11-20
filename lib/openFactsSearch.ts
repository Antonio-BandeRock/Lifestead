// Finding a product in Open Food Facts by its name, and reading a product's
// name in whatever language it was typed in (1.0.95.2, Tony 2026-11-20).
//
// A barcode Open Food Facts has never seen finds nothing, and many Mexican
// products were entered under a Spanish name only (product_name_es) with the
// plain product_name left empty, so the app counted them as missing. Both
// are fixed here: the name is read from the app's language first, then the
// plain field, then any other language, and a product can be searched for by
// the words on its package, with the person's own country first.
//
// The search service (search.openfoodfacts.org, checked live 2026-11-20)
// sends no header letting a browser read it, so on the computer it is asked
// through the desktop app's page reader, as Import Recipe does. Only the
// words typed and the country are sent.

import * as Localization from 'expo-localization';
import { getDesktopBridge, isDesktopApp } from './desktop/bridge';
import { getLanguage } from './language';
import { firstBrand, localizedField, localizedFieldList } from './offText';

export { firstBrand, localizedField };

export const OFF_SEARCH_URL = 'https://search.openfoodfacts.org/search';
export const OFF_SEARCH_LIMIT = 12;

type Product = Record<string, unknown>;

function text(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return null;
}

// The countries the app is meant to ship in, plus Latin America, by the code
// a phone reports and the tag Open Food Facts files products under.
const COUNTRY_TAGS: Record<string, string> = {
  MX: 'en:mexico', US: 'en:united-states', CA: 'en:canada', GB: 'en:united-kingdom', AU: 'en:australia',
  ES: 'en:spain', FR: 'en:france', DE: 'en:germany', FI: 'en:finland', NO: 'en:norway', SE: 'en:sweden',
  JP: 'en:japan', AR: 'en:argentina', CL: 'en:chile', CO: 'en:colombia', PE: 'en:peru', EC: 'en:ecuador',
  VE: 'en:venezuela', UY: 'en:uruguay', PY: 'en:paraguay', BO: 'en:bolivia', GT: 'en:guatemala',
  CR: 'en:costa-rica', PA: 'en:panama', HN: 'en:honduras', SV: 'en:el-salvador', NI: 'en:nicaragua',
  DO: 'en:dominican-republic', CU: 'en:cuba', PR: 'en:puerto-rico',
};

export function countryTagFor(region: string | null | undefined): string | null {
  return region ? (COUNTRY_TAGS[region.toUpperCase()] ?? null) : null;
}

/** The person's country as Open Food Facts tags it, from the phone's region. */
export function personCountryTag(): string | null {
  try {
    return countryTagFor(Localization.getLocales()[0]?.regionCode);
  } catch {
    return null;
  }
}

export function offSearchUrl(words: string, countryTag: string | null, language: string): string {
  const q = countryTag ? `${words} countries_tags:"${countryTag}"` : words;
  const langs = language === 'en' ? 'en' : `${language},en`;
  const fields = `code,${localizedFieldList('product_name')},brands,countries_tags,quantity`;
  return `${OFF_SEARCH_URL}?q=${encodeURIComponent(q)}&langs=${langs}&page_size=${OFF_SEARCH_LIMIT}&fields=${fields}`;
}

export type FoundProduct = { code: string; name: string; brand: string | null; quantity: string | null; inYourCountry: boolean };

/** The service's answer read into rows: only those with a code and a name. */
export function readSearchHits(body: unknown, language: string, inYourCountry: boolean): FoundProduct[] {
  const hits = (body as { hits?: unknown } | null)?.hits;
  if (!Array.isArray(hits)) return [];
  const rows: FoundProduct[] = [];
  for (const hit of hits) {
    if (!hit || typeof hit !== 'object') continue;
    const p = hit as Product;
    const code = text(p.code);
    const name = localizedField(p, 'product_name', language);
    if (!code || !/^\d{8,14}$/.test(code) || !name) continue;
    rows.push({ code, name, brand: firstBrand(p.brands), quantity: text(p.quantity), inYourCountry });
  }
  return rows;
}

/** The person's country first, then the rest of the world, each code once. */
export function mergeHits(local: FoundProduct[], world: FoundProduct[]): FoundProduct[] {
  const seen = new Set<string>();
  const out: FoundProduct[] = [];
  for (const row of [...local, ...world]) {
    if (seen.has(row.code)) continue;
    seen.add(row.code);
    out.push(row);
  }
  return out.slice(0, OFF_SEARCH_LIMIT);
}

async function getJson(url: string): Promise<unknown> {
  if (isDesktopApp()) {
    const web = getDesktopBridge().web;
    if (!web) throw new Error('no page reader');
    return JSON.parse((await web.fetchPage(url)).text);
  }
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`status ${response.status}`);
  return response.json();
}

export type SearchOutcome =
  | { kind: 'found'; products: FoundProduct[]; countryTag: string | null }
  | { kind: 'none'; countryTag: string | null }
  | { kind: 'unreachable' };

/** Searches Open Food Facts for the words on a package, the person's country first. */
export async function searchOpenFoodFacts(words: string): Promise<SearchOutcome> {
  const clean = words.replace(/["\\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return { kind: 'none', countryTag: null };
  const language = getLanguage();
  const countryTag = personCountryTag();
  let local: FoundProduct[] = [];
  let world: FoundProduct[] = [];
  let answered = false;
  if (countryTag) {
    try {
      local = readSearchHits(await getJson(offSearchUrl(clean, countryTag, language)), language, true);
      answered = true;
    } catch {
      // The search without the country still runs.
    }
  }
  if (local.length < OFF_SEARCH_LIMIT) {
    try {
      world = readSearchHits(await getJson(offSearchUrl(clean, null, language)), language, false);
      answered = true;
    } catch {
      // Said below when neither search answered.
    }
  }
  if (!answered) return { kind: 'unreachable' };
  const products = mergeHits(local, world);
  return products.length ? { kind: 'found', products, countryTag } : { kind: 'none', countryTag };
}

export function searchNoneMessage(words: string): string {
  return `Open Food Facts has nothing under "${words.trim()}". Try fewer words, the brand alone, or the name as the package prints it.`;
}

export const SEARCH_UNREACHABLE_MESSAGE = 'Could not reach Open Food Facts, so nothing was searched. Check the connection and try again.';

export function searchCaption(countryTag: string | null): string {
  return countryTag
    ? 'From Open Food Facts, filled in by the people who use it. Those sold in your country come first. Pick the one whose package matches yours.'
    : 'From Open Food Facts, filled in by the people who use it. Pick the one whose package matches yours.';
}

// Adding a product Open Food Facts does not have (item 4, Tony 2026-11-20).
// Lifestead does not send it for the person: Open Food Facts asks each
// contributor to sign in and add photos, and its own app does that best.
export const ADD_TO_OPEN_FOOD_FACTS_URL = 'https://world.openfoodfacts.org/contribute';
export const ADD_TO_OPEN_FOOD_FACTS_STEPS =
  "Open Food Facts is filled in by the people who use it, and anyone can add a product. Install the Open Food Facts app, scan the barcode, and it asks for a photo of the front, the ingredients and the nutrition table, then reads them for you. Once it is there, scanning the barcode in Lifestead finds it for everyone. Lifestead does not send anything to Open Food Facts for you.";
