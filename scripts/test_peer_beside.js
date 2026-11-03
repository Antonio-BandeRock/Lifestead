// Runs lib/peerBeside.ts: what each partner shares about themselves, shown
// beside the other person's records under their name, read only (1.0.80.3).
//
// The risks, in order:
//
//  1. A SWITCH THAT IS OFF STILL SENDS. Whatever is switched off has to go as
//     null, so the other phone clears its copy, whatever the caller read.
//  2. A CLOSED VAULT WIPES THE OTHER PHONE. A kind switched on that could not
//     be read this time is left out, so the other phone keeps what it has.
//  3. AN OLDER PHONE'S PAYLOAD CLEARS EVERYTHING. No beside part at all means
//     nothing is said, never that everything was taken away.
//  4. MALFORMED INPUT MUST NOT THROW, and nothing past the declared fields of
//     each kind is kept.
//
// Run with: node scripts/test_peer_beside.js
// Exits non-zero on any failure.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const LIB = path.join(__dirname, '..', 'lib');

function loadModule(name, cache = new Map()) {
  if (cache.has(name)) return cache.get(name);
  const source = fs.readFileSync(path.join(LIB, `${name}.ts`), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: `${name}.ts`,
  });
  const module = { exports: {} };
  cache.set(name, module.exports);
  const localRequire = (request) => {
    if (!request.startsWith('./')) throw new Error(`lib/${name}.ts reaches outside lib: ${request}`);
    return loadModule(request.slice(2), cache);
  };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, localRequire);
  cache.set(name, module.exports);
  return module.exports;
}

const {
  BESIDE_KINDS, BESIDE_TITLES,
  cleanBesidePart, besidePartToSend, besideHasAnything, besideRows, besideFreshness,
} = loadModule('peerBeside');

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
function checkTrue(label, actual) { check(label, actual === true, true); }

const money = (amount) => `$${amount.toFixed(2)}`;
const ALL_OFF = Object.fromEntries(BESIDE_KINDS.map((kind) => [kind, false]));

const MEDS = [{ name: 'Levothyroxine', kind: 'prescription', amount: '50 mcg', frequency: 'daily', times: ['07:00', '07:00', 'bad'] }];
const EMERGENCY = {
  drugAllergies: 'Penicillin', bloodType: 'O+', devices: null, doctorName: 'Dr. Ruiz', doctorPhone: '555-0100',
  hospital: null, language: 'Spanish', directiveLocation: null,
  contacts: [{ name: 'Lisa', relationship: 'Wife', phone: '555-0101', primary: true }, { name: 'No phone' }],
};

// --- 1. Off goes as null ------------------------------------------------------
{
  const sent = besidePartToSend(ALL_OFF, { meds: MEDS, emergency: EMERGENCY });
  check('every kind switched off goes as null, whatever was read', sent,
    Object.fromEntries(BESIDE_KINDS.map((kind) => [kind, null])));
}

// --- 2. On but unreadable is left out ------------------------------------------
{
  const sent = besidePartToSend({ ...ALL_OFF, meds: true, emergency: true }, { meds: MEDS });
  checkTrue('a kind switched on and read goes', Array.isArray(sent.meds));
  checkTrue('a kind switched on but not read this time is left out', !('emergency' in sent));
  check('the times sent are sorted, once each, and only clock times', sent.meds[0].times, ['07:00']);
  const empty = besidePartToSend({ ...ALL_OFF, meds: true }, { meds: [] });
  check('an emptied list still goes, since emptied is news', empty.meds, []);
}

// --- 3. An older phone ------------------------------------------------------------
{
  check('no beside part at all says nothing', cleanBesidePart(undefined), undefined);
  check('a beside part that is not an object says nothing', cleanBesidePart('junk'), undefined);
  check('a kind not mentioned is not mentioned back', cleanBesidePart({ meds: null }), { meds: null });
}

// --- 4. Malformed input -------------------------------------------------------------
{
  const read = cleanBesidePart({
    meds: [{ name: '  ', kind: 'prescription' }, 'junk', { name: 'Vitamin D', kind: 'supplement', notes: 'private', times: 'x' }],
    emergency: [1, 2],
    appointments: [{ when: 'tomorrow', title: 'GP' }, { when: '2026-11-04T09:30:00', title: 'Endocrinologist', notes: 'x' }],
    accounts: [{ name: 'Checking', kind: 'checking', balance: 'lots', accountNumber: '123' }],
    budgets: { budgets: [{ category: 'Groceries', monthlyLimit: 400 }, { category: 'No limit' }], goals: [{ name: 'Emergency fund' }] },
    insurance: { plans: [{ name: 'Plan A', yearStart: '2026-01-01', deductible: 1500 }], healthAccounts: [{ kind: 'hsa' }] },
  });
  check('a med with no name and a med that is not an object are dropped, and notes never kept',
    read.meds, [{ name: 'Vitamin D', kind: 'supplement', amount: null, frequency: null, times: [] }]);
  check('an emergency card that is a list reads as null', read.emergency, null);
  check('an appointment with no date is dropped, and notes are never kept',
    read.appointments, [{ when: '2026-11-04T09:30:00', title: 'Endocrinologist', type: null, provider: null, place: null, status: 'planned' }]);
  check('a balance that is not a number reads as 0, and an account number is never kept',
    read.accounts, [{ name: 'Checking', kind: 'checking', balance: 0, apr: null, minimumPayment: null }]);
  check('a budget with no limit is dropped', read.budgets.budgets, [{ category: 'Groceries', monthlyLimit: 400 }]);
  check('a goal with only a name is kept as active', read.budgets.goals, [{ name: 'Emergency fund', reason: null, targetDate: null, status: 'active' }]);
  check('a health account with no plan year is dropped', read.insurance.healthAccounts, []);
  let threw = false;
  try {
    cleanBesidePart({ meds: { not: 'a list' }, emergency: 'x', budgets: null, insurance: 7 });
  } catch {
    threw = true;
  }
  check('nonsense of every shape does not throw', threw, false);
}

// --- Whether there is anything to show ---------------------------------------------
{
  check('an empty list has nothing', besideHasAnything('meds', []), false);
  check('a card with only a contact has something', besideHasAnything('emergency', {
    drugAllergies: null, bloodType: null, devices: null, doctorName: null, doctorPhone: null,
    hospital: null, language: null, directiveLocation: null, contacts: [{ name: 'A', relationship: null, phone: '1', primary: false }],
  }), true);
  check('a blank card has nothing', besideHasAnything('emergency', {
    drugAllergies: null, bloodType: null, devices: null, doctorName: null, doctorPhone: null,
    hospital: null, language: null, directiveLocation: null, contacts: [],
  }), false);
  check('budgets with only a goal have something', besideHasAnything('budgets', { budgets: [], goals: [{ name: 'x' }] }), true);
  check('null has nothing', besideHasAnything('insurance', null), false);
}

// --- What draws -----------------------------------------------------------------------
{
  const meds = cleanBesidePart({ meds: MEDS }).meds;
  check('a med reads with its kind, amount, how often and when',
    besideRows('meds', meds, money), [{ title: 'Levothyroxine', caption: 'Prescription, 50 mcg, daily, at 07:00' }]);
  const card = cleanBesidePart({ emergency: EMERGENCY }).emergency;
  check('a card draws only the facts it has, then the contacts, first to call marked',
    besideRows('emergency', card, money).map((row) => row.title),
    ['Drug allergies', 'Blood type', 'Doctor', 'Language', 'Lisa, first to call']);
  check('the doctor carries the phone number', besideRows('emergency', card, money)[2].caption, 'Dr. Ruiz, 555-0100');
  const budgets = cleanBesidePart({ budgets: { budgets: [{ category: 'Groceries', monthlyLimit: 400 }], goals: [{ name: 'Trip', targetDate: '2027-06-01' }] } }).budgets;
  check('a budget names its monthly limit and a goal its date',
    besideRows('budgets', budgets, money).map((row) => row.caption), ['$400.00 a month', 'by 2027-06-01']);
  const words = (english, values) => `[${english}]${values ? JSON.stringify(values) : ''}`;
  check('every caption word goes through the translator',
    besideRows('meds', meds, money, words)[0].caption, '[Prescription], 50 mcg, daily, [at {times}]{"times":"07:00"}');
  for (const kind of BESIDE_KINDS) {
    checkTrue(`${kind} has a title naming the person`, BESIDE_TITLES[kind].includes('{name}'));
  }
}

// --- Freshness ---------------------------------------------------------------------------
{
  check('sent today', besideFreshness('2026-11-03T08:00:00.000Z', '2026-11-03'), 'Read only, sent from their phone today.');
  check('sent before', besideFreshness('2026-11-01T08:00:00.000Z', '2026-11-03'), 'Read only, sent from their phone on 2026-11-01.');
  check('no date it can read', besideFreshness('junk', '2026-11-03'), 'Read only, from their phone.');
}

if (failures) {
  console.error(`\n${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`${checks}/${checks} checks passed`);
