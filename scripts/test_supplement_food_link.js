// Checks the oils in lib/supplementIngredients.ts that are counted from a
// food record (Tony, 2026-11-27): every linked record is in the app's food
// database under the name given, the label's amount becomes the right
// number of grams, the share is the record's amount per 100 g scaled to
// those grams, and a nutrient the label lists itself is never counted a
// second time from the record. Reads the food database, changes nothing.
// Exits non-zero on any failure.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ts = require('typescript');

function load(relPath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    throw new Error(`${relPath} must stay free of runtime imports (${name})`);
  });
  return module.exports;
}

const s = load('lib/supplementIngredients.ts');
const DB = path.join(__dirname, '..', 'assets', 'data', 'foods_reference.db');
const SQLITE = fs.existsSync('C:/Users/TonyR/AppData/Local/Android/Sdk/platform-tools/sqlite3.exe')
  ? 'C:/Users/TonyR/AppData/Local/Android/Sdk/platform-tools/sqlite3.exe'
  : 'sqlite3';
const q = (sql) => JSON.parse(execFileSync(SQLITE, ['-readonly', '-json', DB, sql]).toString() || '[]');

let failures = 0;
function check(label, ok, detail) {
  if (ok) return;
  failures++;
  console.log(`FAIL ${label}${detail !== undefined ? `  ${JSON.stringify(detail)}` : ''}`);
}
const near = (a, b) => Math.abs(a - b) < 1e-9;

// Every linked record exists, under the name given, with nutrient rows.
const linked = s.SUPPLEMENT_INGREDIENTS.filter((item) => item.food);
check('five oils are linked', linked.length === 5, linked.map((item) => item.code));
for (const item of linked) {
  const { foodId, source, foodName } = item.food;
  const found = q(`select name from foods where food_id = ${Number(foodId)} and source = '${source.replace(/'/g, "''")}'`);
  check(`${item.code}: record ${foodId} ${source} exists`, found.length === 1);
  check(`${item.code}: record is named "${foodName}"`, found[0]?.name === foodName, found[0]?.name);
  const rows = q(`select count(*) as n from food_nutrients where food_id = ${Number(foodId)} and source = '${source.replace(/'/g, "''")}'`);
  check(`${item.code}: record has nutrient amounts`, (rows[0]?.n ?? 0) > 0);
  check(`${item.code}: ingredientFood finds it`, s.ingredientFood(item.code) === item.food);
  check(`${item.code}: no amount is given for antioxidants`, !/\d/.test(item.food.alsoCarries?.replace(/omega.?3|a fifth/gi, '') ?? ''), item.food.alsoCarries);
}
check('an oil with no record has no link', s.ingredientFood('krill_oil') === null);
check('a vitamin has no link', s.ingredientFood('vitamin_d') === null);

// The label amount as grams.
check('1000 mg is 1 g', near(s.labelAmountInGrams(1000, 'mg'), 1));
check('2 g is 2 g', near(s.labelAmountInGrams(2, 'g'), 2));
check('500000 mcg is 0.5 g', near(s.labelAmountInGrams(500000, 'mcg'), 0.5));
check('IU is not a weight', s.labelAmountInGrams(1000, 'IU') === null);
check('ml is not a weight', s.labelAmountInGrams(5, 'ml') === null);

// The share, and the label winning.
const per100g = { energy_kcal: 900, vitamin_k: 112, epa: 10 };
const share = s.linkedFoodShare(1, per100g, new Set(['pumpkin_seed_oil']));
check('1 g of a 900 kcal per 100 g oil is 9 kcal', near(share.energy_kcal, 9), share);
check('1 g of 112 mcg per 100 g is 1.12 mcg', near(share.vitamin_k, 1.12), share);
const labelled = s.linkedFoodShare(1, per100g, new Set(['fish_oil', 'epa']));
check('a nutrient on the label is not counted from the record', !('epa' in labelled), labelled);
check('the rest still is', near(labelled.energy_kcal, 9), labelled);
check('no grams, no share', Object.keys(s.linkedFoodShare(0, per100g, new Set())).length === 0);

// Pumpkin seed oil, the case Tony asked about, from the database itself.
const pumpkin = Object.fromEntries(
  q(`select nutrient_code as code, amount_per_100g as amount from food_nutrients where food_id = 10763 and source = 'Germany_BLS'`).map((r) => [r.code, r.amount]),
);
const capsule = s.linkedFoodShare(s.labelAmountInGrams(1000, 'mg'), pumpkin, new Set(['pumpkin_seed_oil']));
check('a 1,000 mg pumpkin seed oil capsule adds 1/100 of the record', near(capsule.vitamin_k, pumpkin.vitamin_k / 100), { capsule: capsule.vitamin_k, record: pumpkin.vitamin_k });

if (failures) {
  console.log(`${failures} failure(s)`);
  process.exit(1);
}
console.log(`supplement food links: all checks pass (${linked.length} oils)`);
