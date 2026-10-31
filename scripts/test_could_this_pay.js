// Checks lib/couldThisPay.ts (Interests > Money > Could This Pay?): what
// the records hold for one interest or several, reading numbers, shares and
// times as typed, the month worked out, sales to cover the monthly costs,
// what to have put by, every number used listed, and that nothing said here
// tells anyone to start, carry on or stop, calls a result a profit or a
// loss, or gives a tax figure.
// Run: node scripts/test_could_this_pay.js
/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const cache = {};
function load(rel) {
  const file = path.join(__dirname, '..', 'lib', `${rel}.ts`);
  if (cache[file]) return cache[file];
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const m = { exports: {} };
  cache[file] = m.exports;
  new Function('module', 'exports', 'require', outputText)(m, m.exports, (name) => {
    if (name.startsWith('./')) return load(name.slice(2));
    throw new Error(`lib/couldThisPay.ts must stay pure, asked for ${name}`);
  });
  cache[file] = m.exports;
  return m.exports;
}
const P = load('couldThisPay');

let pass = 0;
let fail = 0;
function check(name, ok, detail) {
  if (ok) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ''}`);
  }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- reading what was typed ---------------------------------------------------------
check('plain number', P.readPayNumber('25').value === 25);
check('dollars and cents', P.readPayNumber('$25.50').value === 25.5);
check('comma cents', P.readPayNumber('25,50').value === 25.5);
check('thousands', P.readPayNumber('1,200').value === 1200);
check('pesos', P.readPayNumber('300 pesos').value === 300);
check('empty is nothing, and fine', same(P.readPayNumber(''), { ok: true, value: null }));
check('words are not a number', P.readPayNumber('a lot').ok === false);
check('share with a sign', P.readPayPercent('15%').value === 15);
check('share over 100 is refused', P.readPayPercent('120').ok === false);
check('plain minutes', P.readPayMinutes('45').value === 45);
check('hours', P.readPayMinutes('1.5 hours').value === 90);
check('hours and minutes', P.readPayMinutes('1 hour, 45 minutes').value === 105);
check('clock form', P.readPayMinutes('1:30').value === 90);
check('Spanish hours', P.readPayMinutes('2 horas').value === 120);
check('unreadable time', P.readPayMinutes('a while').ok === false);
check('every field has a label and a placeholder', P.PAY_FIELDS.every((f) => P.PAY_FIELD_LABELS[f] && P.PAY_FIELD_PLACEHOLDERS[f]));
check('an unreadable field is named', (P.unreadablePayField({ feePercent: 'lots' }) || '').startsWith('Fees taken from each sale'));
check('nothing unreadable', P.unreadablePayField({ price: '25' }) === null);
check('a price is needed', (P.missingForPay({ perMonth: '3' }) || '').includes('price'));
check('how many is needed', (P.missingForPay({ price: '3' }) || '').includes('how many'));
check('nothing worked out without them', P.workOutPay({ price: '3' }) === null);

// --- the month worked out -------------------------------------------------------------
const words = {
  price: '25',
  perMonth: '20',
  materialsEach: '8',
  minutesEach: '1 hour',
  feePercent: '10%',
  overheadMonth: '50',
  runningMinutesMonth: '10 hours',
  taxPercent: '25',
  wantMonth: '300',
  startingCosts: '500',
  livingMonth: '2000',
  slowMonths: '3',
};
const r = P.workOutPay(words);
check('comes in', r.comesIn === 500, r.comesIn);
check('left before tax', r.leftBeforeTax === 240, r.leftBeforeTax);
check('left after the set-aside', r.leftOver === 180, r.leftOver);
check('hours', r.hours === 30, r.hours);
check('an hour', r.perHour === 6, r.perHour);
check('sales to cover the monthly costs', r.coverSales === 4, r.coverSales);
check('sales for the month wanted', r.wantSales === 32, r.wantSales);
check('to have put by', r.putBy === 6500, r.putBy);
check('first line', r.lines[0] === 'At $25 each and 20 a month, $500 comes in a month.', r.lines[0]);
check('costs line', r.lines[1] === 'Taking out materials $160, fees $50, monthly costs $50 leaves $240 before tax.', r.lines[1]);
check('set-aside line', r.lines[2] === 'Setting 25% of that aside for tax, $60, leaves $180 a month.', r.lines[2]);
check('hours line', r.lines[3] === 'That is 30 hours a month, which works out to $6 an hour.', r.lines[3]);
check('put-by line', r.lines.some((l) => l.startsWith('Starting costs of $500 and 3 months of $2,000 living costs come to $6,500')), r.lines);
check('the tax share is said to be a choice', r.assumptions.some((a) => a.includes('the share you chose, not a tax figure')));
check('limits end with where to ask', r.limits[r.limits.length - 1].includes('An accountant or the tax office'));
check('limits say the sums cannot tell who will buy', r.limits[0].includes('cannot say whether people will buy'));

const bare = P.workOutPay({ price: '10', perMonth: '5' });
check('bare: all of it left', bare.leftOver === 50 && bare.lines[1].startsWith('With no costs given'), bare.lines);
check('bare: no time, no hourly figure', bare.perHour === null && bare.lines.some((l) => l.startsWith('No time was given')));
check('bare: every empty field said', bare.assumptions.filter((a) => a.includes('so none') || a.startsWith('No ') || a.startsWith('Nothing is set aside')).length >= 6, bare.assumptions);
check('bare: no put-by', bare.putBy === null);

const under = P.workOutPay({ price: '5', perMonth: '10', materialsEach: '6', overheadMonth: '20', minutesEach: '30' });
check('under: nothing left is said plainly', under.lines[1].includes('more than comes in, so nothing is left'), under.lines[1]);
check('under: no sales cover it', under.coverSales === null && under.lines.some((l) => l.includes('no number of sales covers')));
check('under: no hourly figure', under.perHour === null && under.lines.some((l) => l.includes('nothing left over to divide')));
check('under: no set-aside on nothing', under.leftOver === under.leftBeforeTax);

// --- what the records hold --------------------------------------------------------------
const entries = [
  { id: 'a', interestId: 'i1', direction: 'out', amount: 40, onDay: '2026-03-01', what: 'Clay' },
  { id: 'b', interestId: 'i1', direction: 'in', amount: 120, onDay: '2026-04-01', what: 'Bowls' },
  { id: 'c', interestId: 'i2', direction: 'out', amount: 15, onDay: '2025-01-01', what: 'Seeds' },
  { id: 'd', interestId: 'i3', direction: 'out', amount: 999, onDay: '2020-01-01', what: 'Other' },
];
const things = [
  { id: 't1', interestId: 'i1', kind: 'supply', cost: 300, gotOn: '2026-02-01' },
  { id: 't2', interestId: 'i1', kind: 'wish', cost: 900, gotOn: null },
  { id: 't3', interestId: 'i2', kind: 'collection', cost: 0, gotOn: null },
];
const sessions = [
  { interestId: 'i1', doneOn: '2026-02-10', minutes: 600, running: false },
  { interestId: 'i1', doneOn: '2026-02-11', minutes: null, running: false },
  { interestId: 'i1', doneOn: '2026-02-12', minutes: 30, running: true },
];
const one = P.gatherPayRecords(['i1'], entries, things, sessions);
check('one interest: out', one.out === 40 && one.thingsOut === 300 && one.thingCount === 1, one);
check('one interest: in', one.in === 120);
check('one interest: time, running timer left out', one.minutes === 600 && one.untimed === 1, one);
check('one interest: first day', one.firstDay === '2026-02-01', one.firstDay);
const both = P.gatherPayRecords(['i1', 'i2'], entries, things, sessions);
check('two together', both.out === 55 && both.firstDay === '2025-01-01', both);
const lines = P.describePayRecords(one);
check('records in words', lines[1] === '$340 went out and $120 came in.', lines);
check('records: hourly from records', lines.some((l) => l === 'What went out is more than what came in, by $22 for each hour kept.'), lines);
check('records: untimed said', lines.some((l) => l.startsWith('1 session has no length')));
check('records: only what is kept', lines[lines.length - 1] === 'Anything not kept in the app is not in these sums.');
check('nothing kept, nothing said', P.describePayRecords(P.gatherPayRecords(['zz'], entries, things, sessions)).length === 0);

// --- keeping ----------------------------------------------------------------------------
check('key is order-blind', P.worksheetKey(['b', 'a', 'b']) === 'a,b');
check('kept words read back', same(P.readPayWords(JSON.stringify({ price: '3', junk: 4, perMonth: 2 })), { price: '3' }));
check('bad kept words read as empty', same(P.readPayWords('{oops'), {}));

// --- what is never said -------------------------------------------------------------------
const FORBIDDEN = [
  'profit', 'loss', 'viable', 'worth', 'should', 'ought to', 'earn', 'waste', 'too much', 'expensive', 'cheap',
  'you can do it', 'go for it', 'give up', 'quit', 'risky', 'good idea', 'bad idea', 'success', 'fail',
  'streak', 'score', 'rating', 'well done', 'great job', 'keep it up', 'best', 'you need', 'must',
  'genuine', 'honestly', 'real ', '—', '–',
];
const sources = ['lib/couldThisPay.ts', 'components/CouldThisPaySection.tsx'];
for (const rel of sources) {
  const source = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')
    .split('\n')
    .filter((row) => !row.trim().startsWith('//') && !row.trim().startsWith('*') && !row.trim().startsWith('/*'))
    .join('\n');
  const re = /'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`|>([^<>{}\n]*[A-Za-z][^<>{}\n]*)</g;
  let match;
  while ((match = re.exec(source))) {
    const value = match[1] ?? match[2] ?? match[3];
    if (!value || !/[A-Za-z]{3,} [A-Za-z]/.test(value)) continue;
    const lower = value.toLowerCase();
    for (const word of FORBIDDEN) {
      if (lower.includes(word)) check(`"${word}" stays out of ${rel}: "${value.slice(0, 60)}"`, false);
    }
  }
}
for (const line of [...r.lines, ...r.assumptions, ...r.limits, ...lines, ...under.lines]) {
  for (const word of FORBIDDEN) if (line.toLowerCase().includes(word)) check(`"${word}" stays out of "${line.slice(0, 60)}"`, false);
}

console.log(`${pass + fail} checks, ${fail} failures`);
process.exit(fail ? 1 : 0);
