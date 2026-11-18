// Checks the retail-barcode product lookup for medicines and supplements
// (2026-11-18): that an Open Facts answer is read into a name, brand,
// ingredients and amounts per serving, that a miss is null with nothing
// in its place, that the label text built from it is read back by the
// supplement parser, and that only the code is sent. Exits non-zero on
// any failure.

// eslint-config-expo lints this repo as app code, which has no __dirname.
/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(file) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const mod = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(mod.exports, mod, (name) => {
    throw new Error(`${file} must stay free of runtime imports (${name})`);
  });
  return mod.exports;
}

const P = load('lib/medicineProduct.ts');
const S = load('lib/spokenSupplement.ts');

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

const answer = {
  status: 1,
  product: {
    product_name: 'Vitamin D3 + K2',
    product_name_es: 'Vitamina D3 + K2',
    brands: 'Nature Lab',
    ingredients_text_es: 'Colecalciferol, menaquinona-7, aceite de oliva, cápsula de gelatina.',
    serving_size: '1 cápsula',
    nutriments: {
      'vitamin-d_serving': 0.000025,
      'vitamin-k_serving': 0.0001,
      'calcium_serving': 0.25,
      'energy-kcal_serving': 5,
      'salt_serving': 0.01,
      'vitamin-d_100g': 0.002,
    },
  },
};
const p = P.productFromResponse(answer, '7501234567890', 'Open Food Facts');
check('the Spanish name comes first', p.name, 'Vitamina D3 + K2');
check('the brand is read', p.brand, 'Nature Lab');
check('the Spanish ingredients are read', p.ingredients, 'Colecalciferol, menaquinona-7, aceite de oliva, cápsula de gelatina.');
check('amounts per serving are used when any are typed in', p.basis, 'serving');
check('grams become the unit a label uses', p.amounts.map((a) => a.shown), ['5 kcal', '25 mcg', '100 mcg', '250 mg']);
check('salt is not shown beside sodium', p.amounts.some((a) => a.key === 'salt'), false);
check('the basis says per serving with its size', P.productBasisNote(p), 'Per serving (1 cápsula).');

const text = P.labelTextFromProduct(p);
const read = S.readSpokenSupplementLabel(text);
const codes = read.rows.map((i) => `${i.nutrientCode} ${i.amount} ${i.unit}`).sort();
check('the supplement parser reads the amounts back', codes, ['calcium 250 mg', 'vitamin_d 25 mcg', 'vitamin_k 100 mcg']);

const per100 = P.productFromResponse(
  { status: 1, product: { product_name: 'Polvo', nutriments: { 'proteins_100g': 80, 'iron_100g': 0.012 } } },
  '12345678',
  'Open Products Facts',
);
check('without serving figures the amounts are per 100 g', per100.basis, '100g');
check('per 100 g says it is not one dose', P.productBasisNote(per100).includes('not one dose'), true);
check('per 100 g amounts are not offered as a dose', P.labelTextFromProduct(per100), '');

check('a miss is null', P.productFromResponse({ status: 0, status_verbose: 'product not found' }, '1', 'Open Food Facts'), null);
check('an entry with nothing in it is null', P.productFromResponse({ status: 1, product: { brands: '' } }, '1', 'Open Food Facts'), null);
check('a 12-digit code is also asked with a leading zero', P.codeSpellings('012345678905'), ['012345678905', '0012345678905']);
check('only the code and the field list are sent', P.productUrl(P.PRODUCT_SOURCES[0].base, '7501234567890').split('?')[0], 'https://world.openfoodfacts.org/api/v2/product/7501234567890.json');
check('the three databases are asked in order', P.PRODUCT_SOURCES.map((s) => s.source), ['Open Food Facts', 'Open Products Facts', 'Open Beauty Facts']);
check('the retrieval line names the source and the code', P.productRetrievalStatement(p, '2026-11-18T12:00:00Z').startsWith('From Open Food Facts, retrieved November 18, 2026. Only the code 7501234567890 was sent.'), true);

console.log(`${total - failures} of ${total} passed`);
if (failures > 0) process.exit(1);
