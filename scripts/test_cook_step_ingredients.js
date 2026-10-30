// Checks lib/cookStepIngredients.ts, the ingredients listed under each cook
// mode step (2026-10-30):
// 1. Hand-picked steps list what they name, in the order they name it, with
//    half and the rest where the step says so, and nothing they do not.
// 2. Across every System Recipe, the share of ingredient lines that no step
//    lists stays under a ceiling, so a change to the word lists that quietly
//    drops lines fails here. Run with --missed to print the lines no step
//    lists, recipe by recipe.
//
// Pure, so it runs here rather than needing a phone. Exits non-zero on any
// failure.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const cache = new Map();
function load(relPath) {
  if (cache.has(relPath)) return cache.get(relPath);
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  cache.set(relPath, module.exports);
  const dir = path.dirname(relPath);
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (spec) => {
    if (!spec.startsWith('.')) throw new Error(`${relPath} imports ${spec}; only relative pure modules load here`);
    return load(path.join(dir, `${spec}.ts`).replace(/\\/g, '/'));
  });
  cache.set(relPath, module.exports);
  return module.exports;
}

const { ingredientsForStep, ingredientsForSteps, portionLabel } = load('lib/cookStepIngredients.ts');
const { RECIPES_ENTRIES } = load('lib/digest/recipes.ts');

let failures = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures += 1;
    console.log(`FAIL ${label}\n  expected ${e}\n  got      ${a}`);
  }
}

const listed = (step, lines) =>
  ingredientsForStep(step, lines.map((text) => ({ text }))).map((s) => (s.portion ? `${s.line.text} [${portionLabel(s.portion)}]` : s.line.text));

const poulet = [
  '60g butter, plain, salted',
  '125g pork bacon, smoked lardons',
  '700g chicken thigh (with skin), 4 legs, split',
  '150g onion, finely chopped',
  '8g garlic, 2 cloves, crushed',
  '200g mushroom, common, fresh, sliced',
  '500ml cider',
  '1 teaspoon salt',
  '½ teaspoon black pepper',
];
check(
  'half the butter, then the lardons',
  listed('Melt half the butter in a casserole and fry the lardons until golden, 5 minutes.', poulet),
  ['60g butter, plain, salted [half of it]', '125g pork bacon, smoked lardons'],
);
check(
  'season names salt and pepper, in step order after the chicken',
  listed('Season the chicken and brown it. Add the onion, garlic and mushrooms.', poulet),
  ['1 teaspoon salt', '½ teaspoon black pepper', '700g chicken thigh (with skin), 4 legs, split', '150g onion, finely chopped', '8g garlic, 2 cloves, crushed', '200g mushroom, common, fresh, sliced'],
);
check('the remaining butter', listed('Fry the apples in the remaining butter.', poulet), ['60g butter, plain, salted [the rest of it]']);

const stirFry = ['2 tablespoons fish sauce', '1 tablespoon soy sauce', '2 tablespoons sesame oil', '1 tablespoon olive oil', '300g fish fillet', '1 cumin seed'];
check('fish sauce is not the fish', listed('Add the fish and cook 3 minutes.', stirFry), ['300g fish fillet']);
check('a named pair lists only that line', listed('Stir in the fish sauce.', stirFry).includes('1 tablespoon soy sauce'), false);
check('heat the oil lists both oils', listed('Heat the oil in a wok.', stirFry), ['2 tablespoons sesame oil', '1 tablespoon olive oil']);
check('the sesame oil is not the olive oil', listed('Drizzle with the sesame oil.', stirFry), ['2 tablespoons sesame oil']);
check('the word in front of seed names it', listed('Toast the cumin.', stirFry), ['1 cumin seed']);
check('accents do not stop a match', listed('Stir in the creme fraiche.', ['100g crème fraîche, 35 % fett']), ['100g crème fraîche, 35 % fett']);
check('a step naming nothing lists nothing', listed('Serve at once.', poulet), []);

const smoothie = ['1 banana, sliced', '1 cup spinach', '1 cup almond milk'].map((text) => ({ text }));
check(
  'everything lists every line, everything else lists what no earlier step did',
  ingredientsForSteps(['Blend everything until smooth.'], smoothie).map((list) => list.map((s) => s.index)),
  [[0, 1, 2]],
);
check(
  'everything else',
  ingredientsForSteps(['Pour the almond milk into the blender.', 'Add everything else and blend.'], smoothie).map((list) => list.map((s) => s.index)),
  [[2], [0, 1]],
);

// 2. Coverage across the corpus.
let lines = 0;
let missed = 0;
const missedByRecipe = [];
for (const entry of RECIPES_ENTRIES) {
  const card = entry.recipeCard;
  if (!card || !card.instructions || card.instructions.length === 0) continue;
  const named = new Set();
  for (const list of ingredientsForSteps(card.instructions, card.ingredients)) for (const s of list) named.add(s.index);
  const unlisted = card.ingredients.filter((_, index) => !named.has(index)).map((line) => line.text);
  lines += card.ingredients.length;
  missed += unlisted.length;
  if (unlisted.length > 0) missedByRecipe.push(`${entry.title}: ${unlisted.join(' | ')}`);
}
const share = missed / lines;
console.log(`${lines} ingredient lines across System Recipes, ${missed} listed under no step (${(share * 100).toFixed(1)}%).`);
if (process.argv.includes('--missed')) console.log(missedByRecipe.join('\n'));
const CEILING = 0.05;
if (share > CEILING) {
  failures += 1;
  console.log(`FAIL more than ${CEILING * 100}% of ingredient lines are listed under no step`);
}

if (failures > 0) {
  console.log(`${failures} failure(s).`);
  process.exit(1);
}
console.log('All cook step ingredient checks pass.');
