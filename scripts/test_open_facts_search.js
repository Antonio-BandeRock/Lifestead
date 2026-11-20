// Checks lib/offText.ts and lib/openFactsSearch.ts (1.0.95.2, Tony
// 2026-11-20): a product's name is read in whatever language it was typed
// in, a search names only what it sends (the words and the country), the
// person's country comes first, each product is listed once, and every
// sentence says where the answer came from. Exits non-zero on any failure.

// eslint-config-expo lints this repo as app code, which has no __dirname.
/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(file, deps = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const mod = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(mod.exports, mod, (name) => {
    if (deps[name]) return deps[name];
    throw new Error(`${file} imported ${name}, which this test does not stand in for`);
  });
  return mod.exports;
}

const O = load('lib/offText.ts');
const S = load('lib/openFactsSearch.ts', {
  'expo-localization': { getLocales: () => [{ regionCode: 'MX' }] },
  './desktop/bridge': { isDesktopApp: () => false, getDesktopBridge: () => ({}) },
  './language': { getLanguage: () => 'es' },
  './offText': O,
});

let failures = 0;
let total = 0;
function check(name, actual, expected) {
  total += 1;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures += 1;
    console.log(`FAIL  ${name}\n      expected ${e}\n      got      ${a}`);
  }
}

// ---- A name in any language.
check('the app language comes first', O.localizedField({ product_name: 'Soap', product_name_es: 'Jabón' }, 'product_name', 'es'), 'Jabón');
check('then the plain field', O.localizedField({ product_name: 'Soap', product_name_fr: 'Savon' }, 'product_name', 'es'), 'Soap');
check('then English', O.localizedField({ product_name_en: 'Soap', product_name_fr: 'Savon' }, 'product_name', 'es'), 'Soap');
check('then any other language', O.localizedField({ product_name_fr: 'Savon' }, 'product_name', 'es'), 'Savon');
check('a field that is not a language is skipped', O.localizedField({ product_name_image: 'x.jpg' }, 'product_name', 'es'), null);
check('spaces are tidied', O.localizedField({ product_name_es: '  Leche   entera ' }, 'product_name', 'es'), 'Leche entera');
check('nothing is nothing', O.localizedField({}, 'product_name', 'es'), null);
check('a brand list gives its first', O.firstBrand(['', 'Lala', 'Alpura']), 'Lala');
check('a brand string gives its first', O.firstBrand('Lala, Alpura'), 'Lala');
check('no brand is null', O.firstBrand(undefined), null);
check('the field list asks for Spanish', O.localizedFieldList('product_name').split(',').includes('product_name_es'), true);

// ---- What a search sends.
check('a phone in Mexico searches Mexico first', S.personCountryTag(), 'en:mexico');
check('a region not listed has no tag', S.countryTagFor('ZZ'), null);
check('a region is read in any case', S.countryTagFor('es'), 'en:spain');
const url = S.offSearchUrl('leche lala', 'en:mexico', 'es');
check('the search goes to Open Food Facts', url.startsWith('https://search.openfoodfacts.org/search?q='), true);
check('the words and country are sent', decodeURIComponent(url.split('q=')[1].split('&')[0]), 'leche lala countries_tags:"en:mexico"');
check('Spanish then English names are asked for', url.includes('langs=es,en'), true);
check('without a country only the words are sent', decodeURIComponent(S.offSearchUrl('milk', null, 'en').split('q=')[1].split('&')[0]), 'milk');

// ---- Reading the answer.
const body = {
  hits: [
    { code: '7501020565911', product_name_es: 'Leche entera', brands: ['Lala'], quantity: '1 l' },
    { code: 'abc', product_name: 'Not a barcode' },
    { code: '7501020565928' },
    { code: '7501055900497', product_name: 'Leche deslactosada', brands: 'Alpura, Otra' },
  ],
};
const local = S.readSearchHits(body, 'es', true);
check('only rows with a barcode and a name', local.map((r) => r.code), ['7501020565911', '7501055900497']);
check('a row is read in full', local[0], { code: '7501020565911', name: 'Leche entera', brand: 'Lala', quantity: '1 l', inYourCountry: true });
check('a malformed answer is no rows', S.readSearchHits({ hits: 'x' }, 'es', false), []);
const world = S.readSearchHits({ hits: [{ code: '7501055900497', product_name: 'Leche' }, { code: '3017620422003', product_name: 'Nutella' }] }, 'es', false);
const merged = S.mergeHits(local, world);
check('the country first, each code once', merged.map((r) => r.code), ['7501020565911', '7501055900497', '3017620422003']);
check('the country row is kept over the world row', merged[1].inYourCountry, true);
check('the list stops at the limit', S.mergeHits(Array.from({ length: 20 }, (_, i) => ({ code: String(10000000 + i) })), []).length, S.OFF_SEARCH_LIMIT);

// ---- What is said.
check('nothing found names the words', S.searchNoneMessage(' leche ').includes('"leche"'), true);
check('the caption names Open Food Facts', S.searchCaption('en:mexico').includes('Open Food Facts'), true);
check('the caption says the country comes first', S.searchCaption('en:mexico').includes('your country come first'), true);
check('no country, no claim about it', S.searchCaption(null).includes('your country'), false);
check('adding a product says Lifestead sends nothing', S.ADD_TO_OPEN_FOOD_FACTS_STEPS.includes('Lifestead does not send anything'), true);
check('the add link is Open Food Facts', S.ADD_TO_OPEN_FOOD_FACTS_URL.startsWith('https://world.openfoodfacts.org/'), true);
for (const sentence of [S.searchNoneMessage('x'), S.SEARCH_UNREACHABLE_MESSAGE, S.searchCaption('en:mexico'), S.ADD_TO_OPEN_FOOD_FACTS_STEPS]) {
  check(`no safety claim: ${sentence.slice(0, 30)}`, /\b(safe|healthy|harmful)\b/i.test(sentence), false);
}

console.log(`${total - failures} of ${total} passed`);
if (failures > 0) process.exit(1);
