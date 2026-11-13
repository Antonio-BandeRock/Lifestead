#!/usr/bin/env node
/* global __dirname */
// Checks the ten ease-of-use questions (lib/usabilitySurvey.ts, 2026-11-12):
// the score matches the published System Usability Scale arithmetic, an
// unfinished set has no score, and the questions come up only after two weeks,
// never again once sent or declined, and not while "Not now" is waiting.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'usabilitySurvey.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const m = { exports: {} };
new Function('exports', 'module', 'require', outputText)(m.exports, m, (name) => {
  throw new Error(`unexpected import ${name}`);
});
const { USABILITY_QUESTIONS, usabilityScore, answersComplete, surveyDue, snoozeUntil, daysUsed } = m.exports;

let failures = 0;
function check(label, ok) {
  if (!ok) {
    failures += 1;
    console.log(`FAIL: ${label}`);
  }
}

const DAY = 24 * 60 * 60 * 1000;

check('ten questions', USABILITY_QUESTIONS.length === 10);
check('best answers score 100', usabilityScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]) === 100);
check('worst answers score 0', usabilityScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]) === 0);
check('all neither scores 50', usabilityScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]) === 50);
// A worked example: odd (4,4,4,5,4) give 3+3+3+4+3 = 16, even (2,1,2,1,2) give 3+4+3+4+3 = 17, (16+17)*2.5 = 82.5
check('worked example scores 82.5', usabilityScore([4, 2, 4, 1, 4, 2, 5, 1, 4, 2]) === 82.5);
check('nine answers has no score', usabilityScore([5, 1, 5, 1, 5, 1, 5, 1, 5, null]) === null);
check('out of range is not complete', !answersComplete([6, 1, 5, 1, 5, 1, 5, 1, 5, 1]));

const start = Date.UTC(2026, 10, 1);
const fresh = { firstSeen: start, sentAt: null, snoozedUntil: null, declined: false };
check('not due on day 13', !surveyDue(fresh, start + 13 * DAY));
check('due on day 14', surveyDue(fresh, start + 14 * DAY));
check('never due before it has been seen', !surveyDue({ ...fresh, firstSeen: null }, start + 100 * DAY));
check('never due once sent', !surveyDue({ ...fresh, sentAt: start + 15 * DAY }, start + 100 * DAY));
check('never due once declined', !surveyDue({ ...fresh, declined: true }, start + 100 * DAY));
const snoozed = { ...fresh, snoozedUntil: snoozeUntil(start + 14 * DAY) };
check('not due while Not now waits', !surveyDue(snoozed, start + 16 * DAY));
check('due again after Not now', surveyDue(snoozed, start + 17 * DAY));
check('days used counts whole days', daysUsed(start, start + 14.5 * DAY) === 14);

if (failures > 0) {
  console.log(`Ease-of-use questions: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('Ease-of-use questions: all checks passed');
