// Checks for lib/mealInProgress.ts, the meal kept while the person is away
// making one of its dishes (2026-11-19).
//
// The rule that matters: a builder hands its new dish straight to the meal
// only when the meal is named and waiting for exactly that kind of dish, and
// Meal Builder writing its state back never wipes that wait.
//
// Run: node scripts/test_meal_in_progress.js
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const SOURCE = path.join(__dirname, '..', 'lib', 'mealInProgress.ts');

function loadModule() {
  const source = fs.readFileSync(SOURCE, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: 'mealInProgress.ts',
  });
  const module = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'module', 'require', outputText)(module.exports, module, () => ({}));
  return module.exports;
}

const store = loadModule();

let passed = 0;
let failed = 0;
function check(label, condition) {
  if (condition) passed += 1;
  else {
    failed += 1;
    console.log(`FAIL  ${label}`);
  }
}

const named = { name: 'Sunday Dinner', mealType: 'dinner', identityConfirmed: true, components: [], phase: 'dishes' };

check('starts empty', store.getMealInProgress() === null);
check('nothing waits with no meal', store.mealIsWaitingFor('side') === false);
store.waitForDish('side');
check('waiting needs a meal first', store.getMealInProgress() === null);

store.saveMealInProgress(named);
check('saved meal reads back', store.getMealInProgress().name === 'Sunday Dinner');
check('a fresh save waits for nothing', store.getMealInProgress().waitingFor === null);

store.waitForDish('side');
check('waits for the kind asked', store.mealIsWaitingFor('side') === true);
check('not for another kind', store.mealIsWaitingFor('salad') === false);

store.saveMealInProgress({ ...named, components: [{ key: 'a', componentType: 'salad', componentId: 's1', name: 'Greens', servings: 2, yourSharePercent: 50 }] });
check('writing back keeps the wait', store.mealIsWaitingFor('side') === true);
check('writing back keeps the dishes', store.getMealInProgress().components.length === 1);

store.stopWaiting();
check('stopping clears the wait', store.mealIsWaitingFor('side') === false);
check('stopping keeps the meal', store.getMealInProgress().name === 'Sunday Dinner');

store.saveMealInProgress({ ...named, identityConfirmed: false });
store.waitForDish('soup');
check('an unnamed meal is not handed dishes', store.mealIsWaitingFor('soup') === false);

check('empty meal is empty', store.isEmptyMeal({ name: ' ', mealType: null, identityConfirmed: false, components: [], phase: 'dishes' }) === true);
check('a named meal is not empty', store.isEmptyMeal({ ...named, identityConfirmed: false }) === false);

store.setMealInProgress(null);
check('cleared', store.getMealInProgress() === null);

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
