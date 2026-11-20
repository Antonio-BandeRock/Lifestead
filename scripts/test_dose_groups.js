// Runs lib/doseGroups.ts: meds and supplements taken at the same time, with
// one reminder for all of them (2026-11-20).
//
// The rules checked:
//
//  1. A dose is in a group only when its med is a live member AND its time is
//     the group's time; a retired group or a retired member holds nothing.
//  2. The grouping offer: two or more ungrouped meds sharing a time, never a
//     time already declined, never a med already grouped at that time.
//  3. The suggested name follows the time of day.
//  4. Pair notes: a timing rule between two things in the group reads as
//     'separate' with its hours, a concurrent-use caution as 'together', a
//     rule that cannot be checked is left out, and the same med twice is
//     never a pair.
//  5. Which one to move: a supplement before an OTC item, never a
//     prescription, and null when both are prescriptions.
//  6. Where it goes: another group's time first when that time clears every
//     rule, otherwise the rule's separation away; a time beside a meal that
//     competes with it is passed over; never before 6 a.m. or after 10 p.m.;
//     and no suggestion at all for a prescription or a 'together' note.
//  7. The ids a group reminder carries split back out exactly.
//
// Run with: node scripts/test_dose_groups.js
// Exits non-zero on any failure.

/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadModule(relPath, deps = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    if (deps[name]) return deps[name];
    throw new Error(`unexpected import ${name}`);
  });
  return module.exports;
}

const N = loadModule('lib/nutrientAnalysis.ts');
const T = loadModule('lib/timeOfDay.ts');
const D = loadModule('lib/doseMealTiming.ts', { './nutrientAnalysis': N, './timeOfDay': T });
const G = loadModule('lib/doseGroups.ts', { './doseMealTiming': D, './timeOfDay': T });

let failures = 0;
let checks = 0;
function check(label, actual, expected) {
  checks += 1;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures += 1;
    console.error(`FAIL  ${label}`);
    console.error(`      expected ${JSON.stringify(expected)}`);
    console.error(`      got      ${JSON.stringify(actual)}`);
  }
}

// --- Fixtures ----------------------------------------------------------------

function dose(overrides) {
  return {
    id: 'd1',
    time: '08:00',
    treatmentId: 't1',
    treatmentName: 'Levothyroxine',
    treatmentType: 'prescription',
    status: 'planned',
    doseLabel: '75 mcg',
    nutrientCodes: [],
    genericName: 'levothyroxine',
    ...overrides,
  };
}

const levo = dose({});
const calcium = dose({ id: 'd2', treatmentId: 't2', treatmentName: 'Calcium citrate', treatmentType: 'supplement', doseLabel: '500 mg', nutrientCodes: ['calcium'], genericName: null });
const iron = dose({ id: 'd3', treatmentId: 't3', treatmentName: 'Iron bisglycinate', treatmentType: 'supplement', doseLabel: '25 mg', nutrientCodes: ['iron'], genericName: null });
const ibuprofen = dose({ id: 'd4', treatmentId: 't4', treatmentName: 'Ibuprofen', treatmentType: 'otc', doseLabel: '200 mg', genericName: 'ibuprofen' });
const metformin = dose({ id: 'd5', treatmentId: 't5', treatmentName: 'Metformin', genericName: 'metformin' });

// Copied in shape from interaction_rules in the live reference database.
const levoCalcium = {
  id: 'levothyroxine_calcium_timing', ruleType: 'timing_separation', checkable: true,
  subjectAKind: 'prescription', subjectA: 'levothyroxine', subjectBKind: 'nutrient', subjectB: 'calcium',
  minSeparationHours: 4, severity: 'caution', title: 'Levothyroxine and calcium',
  guidance: 'Calcium binds levothyroxine in the gut.', citation: 'Singh N et al., Thyroid 2001', mechanism: null,
};
const calciumIron = {
  id: 'calcium_iron_timing', ruleType: 'timing_separation', checkable: true,
  subjectAKind: 'nutrient', subjectA: 'calcium', subjectBKind: 'nutrient', subjectB: 'iron',
  minSeparationHours: 2, severity: 'note', title: 'Calcium and iron',
  guidance: 'Calcium and iron compete for absorption.', citation: 'Lonnerdal B, J Nutr 2010', mechanism: null,
};
const metforminLevo = {
  id: 'metformin_levothyroxine', ruleType: 'concurrent_use_caution', checkable: true,
  subjectAKind: 'prescription', subjectA: 'metformin', subjectBKind: 'prescription', subjectB: 'levothyroxine',
  minSeparationHours: null, severity: 'note', title: 'Metformin and levothyroxine',
  guidance: 'Metformin can lower TSH.', citation: 'Cappelli C et al., 2009', mechanism: null,
};
const rules = [levoCalcium, calciumIron, metforminLevo];

const morning = { id: 'g1', name: 'Morning', timeOfDay: '08:00', retiredAt: null };
const evening = { id: 'g2', name: 'Evening', timeOfDay: '19:00', retiredAt: null };
const old = { id: 'g3', name: 'Old', timeOfDay: '08:00', retiredAt: '2026-11-01' };
const members = [
  { id: 'm1', groupId: 'g1', treatmentId: 't1', retiredAt: null },
  { id: 'm2', groupId: 'g1', treatmentId: 't2', retiredAt: null },
  { id: 'm3', groupId: 'g1', treatmentId: 't3', retiredAt: '2026-11-10' },
  { id: 'm4', groupId: 'g3', treatmentId: 't4', retiredAt: null },
];

// --- 1. Membership ------------------------------------------------------------

check('a member at the group time is in it', G.groupForDose('t1', '08:00', [morning, evening], members)?.id, 'g1');
check('a member at another time is not', G.groupForDose('t1', '20:00', [morning, evening], members), null);
check('a retired member is not', G.groupForDose('t3', '08:00', [morning, evening], members), null);
check('a retired group holds nothing', G.groupForDose('t4', '08:00', [morning, old], members), null);
check('no med, no group', G.groupForDose(null, '08:00', [morning], members), null);
check('live members only', G.memberTreatmentIds('g1', members), ['t1', 't2']);
check('time from a schedule row', G.timeOfScheduled('2026-11-20T08:15'), '08:15');

// --- 2. The offer -------------------------------------------------------------

const offerDoses = [
  { treatmentId: 't1', treatmentName: 'Levothyroxine', time: '08:00' },
  { treatmentId: 't3', treatmentName: 'Iron', time: '08:00' },
  { treatmentId: 't4', treatmentName: 'Ibuprofen', time: '13:00' },
  { treatmentId: 't5', treatmentName: 'Metformin', time: '13:00' },
  { treatmentId: 't5', treatmentName: 'Metformin', time: '13:00' },
  { treatmentId: 't2', treatmentName: 'Calcium', time: '21:00' },
];
check('an offer for two ungrouped meds at a time, none for a grouped one', G.groupingOffers(offerDoses, [morning], members), [
  { time: '13:00', treatmentIds: ['t4', 't5'], names: ['Ibuprofen', 'Metformin'] },
]);
check('a declined time is not offered again', G.groupingOffers(offerDoses, [morning], members, ['13:00']), []);
check('with no groups, both shared times are offered', G.groupingOffers(offerDoses, [], []).map((offer) => offer.time), ['08:00', '13:00']);

// --- 3. Names -----------------------------------------------------------------

check('names by time of day', ['07:00', '12:00', '15:00', '19:00', '22:00'].map(G.suggestedGroupName), ['Morning', 'Midday', 'Afternoon', 'Evening', 'Bedtime']);

// --- 4. Pairs -----------------------------------------------------------------

const pairs = G.pairNotes([levo, calcium, iron, metformin], rules);
check(
  'separations first, worst first, then the together cautions',
  pairs.map((note) => [note.kind, note.ruleId, note.hours]),
  [
    ['separate', 'levothyroxine_calcium_timing', 4],
    ['separate', 'calcium_iron_timing', 2],
    ['together', 'metformin_levothyroxine', null],
  ],
);
check('a rule that cannot be checked is left out', G.pairNotes([calcium, iron], [{ ...calciumIron, checkable: false }]), []);
check('the same med twice is never a pair', G.pairNotes([calcium, { ...calcium, id: 'd9' }], [calciumIron]), []);

// --- 5. Which one moves -------------------------------------------------------

check('the supplement, not the prescription', G.doseToMove(levo, calcium)?.id, 'd2');
check('a supplement before an OTC item', G.doseToMove(ibuprofen, iron)?.id, 'd3');
check('an OTC item before a prescription', G.doseToMove(levo, ibuprofen)?.id, 'd4');
check('two prescriptions: nothing moves', G.doseToMove(levo, metformin), null);

// --- 6. Where it goes ---------------------------------------------------------

const levoCalciumNote = pairs[0];
const day = [levo, calcium, iron, metformin];
const toEvening = G.suggestMove(calcium, levoCalciumNote, day, [], rules, [morning, evening]);
check('another group first when it clears every rule', [toEvening?.to, toEvening?.joinsGroupId], ['19:00', 'g2']);
check('the why names the group and the hours', toEvening?.why.includes('Evening') && toEvening?.why.includes('4 hours'), true);

const noGroup = G.suggestMove(calcium, levoCalciumNote, day, [], rules, [morning]);
check('with no other group, the separation away', noGroup?.to, '12:00');

// A calcium-rich lunch at noon pushes it past noon.
const lunch = { id: 'm1', title: 'Lunch', time: '12:00', mealType: 'lunch', status: 'planned', nutrients: { iron: 18 }, nutrientsResolved: true };
const pastLunch = G.suggestMove(calcium, levoCalciumNote, day, [lunch], rules, [morning]);
check('a time beside a meal that competes with it is passed over', pastLunch && pastLunch.to !== '12:00', true);

const late = dose({ ...calcium, time: '21:00' });
const lateLevo = dose({ ...levo, time: '21:00' });
const lateNote = G.pairNotes([lateLevo, late], [levoCalcium])[0];
const lateMove = G.suggestMove(late, lateNote, [lateLevo, late], [], [levoCalcium], []);
check('never after 10 p.m.: it goes earlier', lateMove?.to, '17:00');

check('no suggestion for a prescription', G.suggestMove(levo, levoCalciumNote, day, [], rules, [morning, evening]), null);
check('no suggestion for a together note', G.suggestMove(calcium, pairs[2], day, [], rules, [morning, evening]), null);

// --- 7. Ids on a reminder -----------------------------------------------------

check('ids round trip', G.splitDoseIds(G.joinDoseIds(['a', 'b', 'c'])), ['a', 'b', 'c']);
check('one id is one id', G.splitDoseIds('a'), ['a']);
check('blank pieces drop out', G.splitDoseIds('a, ,b,'), ['a', 'b']);

// --- Report -------------------------------------------------------------------

if (failures > 0) {
  console.error(`\n${failures} of ${checks} checks failed.`);
  process.exit(1);
}
console.log(`All ${checks} dose group checks passed.`);
