// Checks the grocery food-name matcher (lib/groceryFoodMatch.ts): that a
// food named plainly, in the singular or plural, with a typo, under a name in
// brackets or with a state word in front, goes on the list under its database
// name; that a name two foods share offers both rather than picking one; and
// that a brand or a dish the database does not hold comes back as nothing
// close, so the line is kept as typed.
//
// The foods are real rows of food_purchase_forms, copied here so the check
// runs without the reference database. Exits non-zero on any failure.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const cache = {};
function load(relPath) {
  if (cache[relPath]) return cache[relPath];
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  cache[relPath] = module.exports;
  const localRequire = (name) => {
    if (!name.startsWith('./')) throw new Error(`${relPath} must stay free of package imports (${name})`);
    return load(path.join(path.dirname(relPath), `${name.slice(2)}.ts`));
  };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, localRequire);
  cache[relPath] = module.exports;
  return module.exports;
}

const { matchFoodName, normalizeFoodWords } = load('lib/groceryFoodMatch.ts');

const FOODS = [
  'Dairy|Buttermilk',
  'Dairy|Chicken Egg (Raw)',
  'Dairy|Milk, whole, 3.25% milkfat, with added vitamin D',
  'Fruit|Apple',
  'Fruit|Blackberry',
  'Fruit|Blueberry',
  'Fruit|Pineapple',
  'Fruit|Raspberry',
  'Fruit|Strawberry',
  'Grain|Grains, rice, brown, long-grain, dry',
  'Grain|Grains, rice, wild, dry',
  'Grain|Oats',
  'Herbs|Pepper, black, ground',
  'Herbs|Spices, cloves, ground',
  'Legume|Black Beans',
  'Legume|Chickpeas (garbanzo beans, bengal gram)',
  'Legume|Kidney Beans',
  'Legume|Pinto Beans',
  'Meat|Chicken Breast (without skin)',
  'Meat|Chicken, broiler, thigh, meat without skin',
  'NutSeed|Coconut milk',
  'Veg|Carrot',
  'Veg|Garlic',
  'Veg|Onion',
  'Veg|Potato',
  'Veg|Red Bell Pepper',
  'Veg|Snap Beans (Green Beans)',
  'Veg|Spinach',
  'Veg|Sweet potato',
  'Veg|Tomato',
  'Veg|Yellow Bell Pepper',
].map((row) => {
  const [category, baseName] = row.split('|');
  return { category, baseName };
});

let failures = 0;
function check(label, ok, detail) {
  if (ok) return;
  failures += 1;
  console.error(`FAIL ${label}${detail ? `: ${detail}` : ''}`);
}

function describe(result) {
  if (result.kind === 'match') return `match ${result.food.baseName}`;
  if (result.kind === 'choose') return `choose ${result.options.map((food) => food.baseName).join(' / ')}`;
  return 'none';
}

function expectMatch(typed, baseName) {
  const result = matchFoodName(typed, FOODS);
  check(`"${typed}" goes on as ${baseName}`, result.kind === 'match' && result.food.baseName === baseName, describe(result));
}

function expectChoice(typed, includes) {
  const result = matchFoodName(typed, FOODS);
  const names = result.kind === 'choose' ? result.options.map((food) => food.baseName) : [];
  check(
    `"${typed}" offers ${includes.join(' and ')}`,
    result.kind === 'choose' && includes.every((name) => names.includes(name)) && names.length <= 4,
    describe(result),
  );
}

function expectNone(typed) {
  const result = matchFoodName(typed, FOODS);
  check(`"${typed}" is kept as typed`, result.kind === 'none', describe(result));
}

check('plurals fold', normalizeFoodWords('Tomatoes Berries Peaches').join(' ') === 'tomato berry peach', normalizeFoodWords('Tomatoes Berries Peaches').join(' '));
check('accents fold', normalizeFoodWords('Jalapeño Crème').join(' ') === 'jalapeno creme', normalizeFoodWords('Jalapeño Crème').join(' '));

expectMatch('tomato', 'Tomato');
expectMatch('Tomatoes', 'Tomato');
expectMatch('tomatos', 'Tomato');
expectMatch('fresh spinach', 'Spinach');
expectMatch('garlic', 'Garlic');
expectMatch('onions', 'Onion');
expectMatch('strawberries', 'Strawberry');
expectMatch('oats', 'Oats');
expectMatch('garbanzo beans', 'Chickpeas (garbanzo beans, bengal gram)');
expectMatch('chickpeas', 'Chickpeas (garbanzo beans, bengal gram)');
expectMatch('green beans', 'Snap Beans (Green Beans)');
expectMatch('black beans', 'Black Beans');
expectMatch('cloves', 'Spices, cloves, ground');
expectMatch('wild rice', 'Grains, rice, wild, dry');
expectMatch('sweet potatoes', 'Sweet potato');
expectMatch('coconut milk', 'Coconut milk');
expectMatch('carrots', 'Carrot');
expectMatch('spinnach', 'Spinach');
expectMatch('garlik', 'Garlic');

expectChoice('beans', ['Black Beans']);
expectChoice('rice', ['Grains, rice, brown, long-grain, dry', 'Grains, rice, wild, dry']);
expectChoice('bell pepper', ['Red Bell Pepper', 'Yellow Bell Pepper']);
expectChoice('chicken', ['Chicken Breast (without skin)']);
expectChoice('eggs', ['Chicken Egg (Raw)']);

expectNone('Cheerios');
expectNone('paper towels');
expectNone('');
expectNone('fresh');

if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log('grocery food matching: all checks passed');
