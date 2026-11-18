// Runs lib/sharedSupply.ts without a phone: one bottle two partners take
// from, counted once between them (Tony, 2026-11-18: "So if something is 1
// tablet at 1000 mcg split between 2 people once per day, they each get 500
// mcg and the count of the pills goes down only by one.").
//
// The rules checked:
//
//  1. Half a tablet each, once a day, takes one tablet a day off the bottle.
//  2. A whole tablet each takes two a day; different amounts add up.
//  3. Only doses at or after the count come off it, from either person, so a
//     recount on one phone works even while the other's line is older.
//  4. With somebody unscheduled the pace comes from both people's marks over
//     the last two weeks, never from the scheduled person alone.
//  5. The merged walk stops at the shorter of the two.
//  6. The words name who takes how much, say when the partner's figures are
//     from an earlier day, and never judge an amount.
//
// Run with: node scripts/test_shared_supply.js
// Exits non-zero on any failure.

/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const cache = new Map();
function load(relPath) {
  const full = path.join(__dirname, '..', relPath);
  if (cache.has(full)) return cache.get(full).exports;
  const source = fs.readFileSync(full, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  cache.set(full, module);
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    if (!name.startsWith('.')) throw new Error(`unexpected import ${name}`);
    return load(path.join(path.dirname(relPath), name + '.ts'));
  });
  return module.exports;
}

const M = load('lib/medSupply.ts');
const S = load('lib/sharedSupply.ts');

let failures = 0;
let checks = 0;
function check(label, actual, expected) {
  checks += 1;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures += 1;
    console.log(`FAIL ${label}\n  expected ${JSON.stringify(expected)}\n  got      ${JSON.stringify(actual)}`);
  }
}
function ok(label, cond) {
  check(label, !!cond, true);
}

const today = '2026-11-18';
const now = '2026-11-18T12:00';
const through = M.addDays(today, 366);

function daily(units, from = today, days = 366) {
  const out = [];
  for (let i = 0; i < days; i += 1) out.push({ date: M.addDays(from, i), units });
  return out;
}
function marks(units, fromDay, toDay, time = '08:00') {
  const out = [];
  for (let d = fromDay; d <= toDay; d = M.addDays(d, 1)) out.push({ at: `${d}T${time}`, units });
  return out;
}
const bottle = { id: 'b1', name: 'Vitamin B12', unit: 'tablets', onHand: 60, countedAt: '2026-11-10T09:00', leadDays: 7 };
function use(who, mine, extra) {
  return { who, mine, taken: [], ahead: daily(0.5), through, ends: false, updatedAt: '2026-11-18T07:00:00Z', ...extra };
}

// 1. Half a tablet each, once a day: one tablet a day off the bottle.
{
  const taken = marks(0.5, '2026-11-11', '2026-11-18'); // 8 doses each since the count
  const input = S.combineSharedSupply({
    bottle,
    uses: [use('you', true, { taken }), use('Lisa', false, { taken })],
    today,
    now,
  });
  check('1 per dose is 1', input.perDose, 1);
  check('1 taken since count, both people', input.takenSinceCount, 8);
  check('1 due this week is one a day', input.dueNext7Days, 7);
  const reading = M.readSupply(input);
  check('1 remaining', reading.remaining, 52);
  check('1 runs out after 52 more tablets', reading.runsOutOn, M.addDays(today, 52));
  check('1 days left', reading.daysLeft, 52);
}

// 2. A whole tablet each, and different amounts.
{
  const whole = S.combineSharedSupply({
    bottle,
    uses: [use('you', true, { ahead: daily(1) }), use('Lisa', false, { ahead: daily(1) })],
    today,
    now,
  });
  check('2 whole each, two a day', whole.dueNext7Days, 14);
  check('2 whole each runs out in 30 days', M.readSupply(whole).daysLeft, 30);
  const mixed = S.combineSharedSupply({
    bottle,
    uses: [use('you', true, { ahead: daily(1) }), use('Lisa', false, { ahead: daily(0.5) })],
    today,
    now,
  });
  check('2 one and a half a day', mixed.dueNext7Days, 10.5);
  check('2 mixed runs out in 40 days', M.readSupply(mixed).daysLeft, 40);
}

// 3. Only doses at or after the count come off it.
{
  const before = [{ at: '2026-11-09T08:00', units: 1 }];
  const after = [{ at: '2026-11-10T09:00', units: 1 }, { at: '2026-11-12T08:00', units: 0.5 }];
  const future = [{ at: '2026-11-18T20:00', units: 1 }];
  const input = S.combineSharedSupply({
    bottle,
    uses: [use('you', true, { taken: [...before, ...after] }), use('Lisa', false, { taken: future })],
    today,
    now,
  });
  check('3 before the count and after now are left out', input.takenSinceCount, 1.5);
  const nothing = S.combineSharedSupply({ bottle: { ...bottle, countedAt: null, onHand: null }, uses: [use('you', true, { taken: after })], today, now });
  check('3 not counted takes nothing off', nothing.takenSinceCount, 0);
  check('3 not counted reads as not counted', M.readSupply(nothing).remaining, null);
}

// 4. Somebody unscheduled: the pace is both people's marks over two weeks.
{
  const yours = marks(1, M.addDays(today, -14), M.addDays(today, -1));
  const lisas = marks(1, M.addDays(today, -14), M.addDays(today, -1), '21:00');
  const input = S.combineSharedSupply({
    bottle,
    uses: [use('you', true, { taken: yours }), use('Lisa', false, { taken: lisas, ahead: null, through: null })],
    today,
    now,
  });
  check('4 no walk when somebody is unscheduled', input.schedule, null);
  check('4 nothing due counted from the schedule', input.dueNext7Days, 0);
  check('4 both people marks over two weeks', input.takenPast14Days, 28);
  check('4 pace is two a day', M.dailyUse(input), 2);
}

// 5. The merged walk stops at the shorter of the two.
{
  const older = M.addDays('2026-11-10', 366);
  const input = S.combineSharedSupply({
    bottle: { ...bottle, onHand: 10000 },
    uses: [use('you', true), use('Lisa', false, { ahead: daily(0.5, '2026-11-10'), through: older })],
    today,
    now,
  });
  check('5 through is the shorter walk', input.schedule.through, older);
  ok('5 no dose past it', input.schedule.doses.every((d) => d.date <= older));
  ok('5 no dose before today', input.schedule.doses.every((d) => d.date >= today));
  check('5 a long bottle covers the schedule', M.readSupply(input).runsOutOn, null);
}

// 6. The words.
{
  const words = S.describeSharedUse({
    uses: [use('you', true), use('Lisa', false, { updatedAt: '2026-11-15T07:00:00Z' })],
    unit: 'tablets',
    today,
    partnerName: 'Lisa',
  });
  ok('6 names you first', words.startsWith('You take about 0.5 tablets a day.'));
  ok('6 names the partner', words.includes('Lisa takes about 0.5 tablets a day.'));
  ok('6 says when the partner figures are older', words.includes("Lisa's doses are counted as of 2026-11-15"));
  const fresh = S.describeSharedUse({ uses: [use('you', true), use('Lisa', false)], unit: 'tablets', today, partnerName: 'Lisa' });
  ok('6 a fresh line says nothing about its day', !fresh.includes('counted as of'));
  const alone = S.describeSharedUse({ uses: [use('you', true)], unit: 'tablets', today, partnerName: 'Lisa' });
  ok('6 not joined yet says so', alone.includes('Shared with Lisa, who has not said yet which of their meds it is.'));
  const noTimes = S.describeSharedUse({ uses: [use('you', true, { ahead: null })], unit: null, today, partnerName: null });
  ok('6 no times set says so', noTimes.startsWith('You take from it with no times set yet.'));
  for (const text of [words, fresh, alone, noTimes]) {
    ok(`6 no verdict or dash: ${text}`, !/too (much|many|few|little)|should|enough of|%|—|–/.test(text));
  }
}

console.log(`${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
