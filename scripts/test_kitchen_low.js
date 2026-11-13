// Checks lib/kitchenLow.ts, telling somebody when something in Life > Kitchen
// is running low and asking whether to add it to the grocery list
// (2026-11-13).
//
// What it holds to: no estimate from fewer than three uses or from uses
// spread over less than a week; uses in another unit are left out, never
// converted; uses older than the window are left out; the amount the person
// set counts only in the stock's unit; used up reads as low with no estimate;
// the estimate always says it is an estimate and how many uses it rests on;
// Not yet waits three days, Add to list waits two weeks, and a restock starts
// a fresh run at once; Add to list is kept once until the records can be
// opened; with reminders saying only their kind, the food's name stays off
// the notification; and no sentence uses a dash for punctuation.
//
// Exits non-zero on any failure.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(relPath, allowed = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    if (allowed[name]) return allowed[name];
    throw new Error(`${relPath} must stay free of runtime imports (asked for ${name})`);
  });
  return module.exports;
}

const k = load('lib/kitchenLow.ts');

let failures = 0;
let checks = 0;
function check(label, ok) {
  checks += 1;
  if (ok) return;
  failures += 1;
  console.error('FAIL', label);
}

const DAY = 86_400_000;
const now = new Date('2026-11-13T12:00:00Z');
const ago = (days) => new Date(now.getTime() - days * DAY).toISOString();
const taken = (amount, unit, days) => ({ amount, unit, usedAt: ago(days) });

// --- The estimate ---------------------------------------------------------
check('no uses, no estimate', k.estimateDaysLeft([], 500, 'g', now) === null);
check('two uses, no estimate', k.estimateDaysLeft([taken(100, 'g', 10), taken(100, 'g', 2)], 500, 'g', now) === null);
check(
  'three uses inside a week, no estimate',
  k.estimateDaysLeft([taken(100, 'g', 6), taken(100, 'g', 3), taken(100, 'g', 1)], 500, 'g', now) === null,
);
const steady = [taken(100, 'g', 10), taken(100, 'g', 5), taken(100, 'g', 1)];
const e = k.estimateDaysLeft(steady, 150, 'g', now);
check('three uses over ten days give an estimate', e != null && e.usesCounted === 3);
check('the rate is the total over the days since the first use', e != null && Math.abs(e.daysLeft - 5) < 1e-9);
check(
  'a use in another unit is left out, not converted',
  k.estimateDaysLeft([taken(100, 'g', 10), taken(1, 'cup', 5), taken(100, 'g', 1)], 150, 'g', now) === null,
);
check('the unit matches without regard to case or spaces', k.estimateDaysLeft(steady.map((u) => ({ ...u, unit: ' G ' })), 150, 'g', now) != null);
check(
  'a use older than the window is left out',
  k.estimateDaysLeft([taken(100, 'g', k.RATE_WINDOW_DAYS + 5), taken(100, 'g', 5), taken(100, 'g', 1)], 150, 'g', now) === null,
);
check('a use dated in the future is left out', k.estimateDaysLeft([taken(100, 'g', -3), taken(100, 'g', 10), taken(100, 'g', 1)], 150, 'g', now) === null);

// --- Reading a food -------------------------------------------------------
const plenty = k.readLow({ remaining: 2000, unit: 'g', mark: null, uses: steady, now });
check('plenty left is not low', !plenty.low && plenty.lines.length === 0);
check('plenty left still carries its days for the row', plenty.daysLeft != null && plenty.daysLeft > k.LOW_DAYS);

const soon = k.readLow({ remaining: 150, unit: 'g', mark: null, uses: steady, now });
check('five days left reads as low by the estimate', soon.low && soon.byEstimate && !soon.byMark);
check('the estimate says it is an estimate', soon.lines.some((line) => /An estimate from your last \{uses\} uses\./.test(line.en)));
check('the estimate names how many uses', soon.lines.some((line) => line.values && line.values.uses === 3));

const marked = k.readLow({ remaining: 2, unit: 'cans', mark: { belowAmount: 2, unit: 'cans' }, uses: [], now });
check('at the amount set reads as low by the mark', marked.low && marked.byMark && !marked.byEstimate);
check('the mark line carries what is left and the amount set', marked.lines[0].values.left === '2' && marked.lines[0].values.mark === '2');
const markOtherUnit = k.readLow({ remaining: 200, unit: 'g', mark: { belowAmount: 2, unit: 'cans' }, uses: [], now });
check('an amount set in another unit does not count', !markOtherUnit.low);
const markNull = k.readLow({ remaining: 1, unit: 'g', mark: { belowAmount: null, unit: 'g' }, uses: [], now });
check('a mark row with no amount does not count', !markNull.low);

const gone = k.readLow({ remaining: 0, unit: 'g', mark: { belowAmount: 100, unit: 'g' }, uses: steady, now });
check('used up reads as low', gone.low && gone.usedUp);
check('used up says only that', gone.lines.length === 1 && gone.lines[0].en === 'Used up.');
check('used up carries no estimate', gone.daysLeft === null);

check('under a day is said as less than a day', /^Less than a day/.test(k.daysLeftWords(0.4, 4).en));
check('one day is said in the singular', /^About 1 day left/.test(k.daysLeftWords(1.2, 4).en));
check('several days carry the count', k.daysLeftWords(3.6, 4).values.days === 4);

// --- Asking -----------------------------------------------------------------
const t0 = now.getTime();
check('never asked may ask', k.mayAsk(undefined, 1, t0));
check('just asked may not ask again', !k.mayAsk({ at: t0, answer: 'asked', remaining: 1 }, 1, t0 + DAY));
check('Not yet asks again after three days', k.mayAsk({ at: t0, answer: 'notYet', remaining: 1 }, 1, t0 + k.NOT_YET_DAYS * DAY));
check('Not yet waits before then', !k.mayAsk({ at: t0, answer: 'notYet', remaining: 1 }, 1, t0 + 2 * DAY));
check('Add to list waits two weeks', !k.mayAsk({ at: t0, answer: 'added', remaining: 1 }, 1, t0 + 10 * DAY));
check('Add to list asks again after two weeks', k.mayAsk({ at: t0, answer: 'added', remaining: 1 }, 1, t0 + k.ADDED_QUIET_DAYS * DAY));
check('a restock starts a fresh run at once', k.mayAsk({ at: t0, answer: 'added', remaining: 1 }, 5, t0 + DAY));

const asked = { entries: { m1: { at: t0, answer: 'asked', remaining: 1 } }, toAdd: [] };
const added = k.answerKitchenLowOffer(asked, 'kitchenAdd', 'm1', t0 + 1000);
check('Add to list is kept to be written', added.toAdd.join() === 'm1' && added.entries.m1.answer === 'added');
check('Add to list keeps what was left when asked', added.entries.m1.remaining === 1);
check('a second press is kept once', k.answerKitchenLowOffer(added, 'kitchenAdd', 'm1', t0 + 2000).toAdd.length === 1);
const notYet = k.answerKitchenLowOffer(asked, 'kitchenNotYet', 'm1', t0 + 1000);
check('Not yet adds nothing', notYet.toAdd.length === 0 && notYet.entries.m1.answer === 'notYet');
check('a press with no id changes nothing', k.answerKitchenLowOffer(asked, 'kitchenAdd', '', t0) === asked);

const round = k.parseKitchenLowState(JSON.stringify(added));
check('the state file reads back', round && round.toAdd.join() === 'm1' && round.entries.m1.answer === 'added');
check('a broken file reads as nothing', k.parseKitchenLowState('{nope') === null);
const cleaned = k.parseKitchenLowState(JSON.stringify({ entries: { a: { at: 1, answer: 'odd', remaining: 1 } }, toAdd: [3, 'b'] }));
check('unknown answers and ids that are not text are dropped', Object.keys(cleaned.entries).length === 0 && cleaned.toAdd.join() === 'b');

const shown = k.lowOfferText('Black beans', soon, false);
check('the notification names the food', shown.title.values.food === 'Black beans' && /running low/.test(shown.title.en));
check('used up is said as used up', /used up/.test(k.lowOfferText('Rice', gone, false).title.en));
const hidden = k.lowOfferText('Black beans', soon, true);
check('with detail hidden the food is never named', !JSON.stringify(hidden).includes('Black beans'));

// --- Keys -------------------------------------------------------------------
check('a food key ignores case and spaces at the ends', k.foodKey(' Legumes ', 'Black Beans ') === 'legumes|black beans');
check('amounts drop trailing zeros', k.formatAmount(2) === '2' && k.formatAmount(1.256) === '1.26');

// --- Wording ----------------------------------------------------------------
const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'kitchenLow.ts'), 'utf8');
const sentences = [...source.matchAll(/en: '([^']*)'/g)].map((m) => m[1]);
check('there are sentences to check', sentences.length >= 8);
for (const sentence of sentences) {
  check(`no dash for punctuation in "${sentence}"`, !/[–—]| -- | - /.test(sentence));
}

if (failures > 0) {
  console.error(`${failures} of ${checks} checks failed.`);
  process.exit(1);
}
console.log(`test_kitchen_low: all ${checks} checks passed`);
