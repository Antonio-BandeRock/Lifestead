#!/usr/bin/env node
/* global __dirname */
// Checks reading back the meal plan kept on Schedules > Meal Plan
// (lib/mealPlanDraft.ts, 2026-11-12). A plan that cannot be read must come
// back as nothing rather than as a broken plan, and an empty plan is never
// kept, so a blank screen can never stand in for a plan.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'mealPlanDraft.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const m = { exports: {} };
new Function('exports', 'module', 'require', outputText)(m.exports, m, (name) => {
  if (name === './db') return { getDatabase: async () => { throw new Error('no database in this test'); } };
  throw new Error(`unexpected import ${name}`);
});
const { parseMealPlanDraft } = m.exports;

let failures = 0;
function check(label, ok) {
  if (!ok) {
    failures += 1;
    console.error(`FAIL ${label}`);
  }
}

const day = { breakfast: null, lunch: [], dinner: [], healthRating: null, nutrientTotals: {}, nutrientCoverage: [], totalCarbGrams: 0, carbCeiling: null, warnings: [] };
const kept = {
  v: 1,
  savedAt: '2026-11-12T20:00:00.000Z',
  generatedStart: '2026-11-13',
  scheduleDate: '2026-11-13',
  plannedOpenRules: [],
  planningScope: null,
  planHousehold: null,
  plannedDiet: { base: null, styles: [], extras: [], cuisines: [] },
  plans: Array.from({ length: 42 }, () => day),
};

const back = parseMealPlanDraft(JSON.stringify(kept));
check('a six-week plan reads back whole', back && back.plans.length === 42 && back.generatedStart === '2026-11-13');
check('nothing stored reads as nothing', parseMealPlanDraft(null) === null && parseMealPlanDraft('') === null);
check('a damaged row reads as nothing', parseMealPlanDraft('{"v":1,"plans":[') === null);
check('an empty plan is not a plan', parseMealPlanDraft(JSON.stringify({ ...kept, plans: [] })) === null);
check('an unknown version is not guessed at', parseMealPlanDraft(JSON.stringify({ ...kept, v: 2 })) === null);
check('missing extras fall back safely', (() => {
  const r = parseMealPlanDraft(JSON.stringify({ v: 1, scheduleDate: '2026-11-13', plans: [day] }));
  return r && r.generatedStart === null && Array.isArray(r.plannedOpenRules) && r.planHousehold === null;
})());

if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log('Meal plan draft: all checks passed');
