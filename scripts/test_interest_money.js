// Checks lib/interestMoney.ts (Interests > Money): reading an amount, the
// lines under an entry, months and years, prices on supplies and collected
// things counted in their year without a second entry, a wish never counted,
// a price with no day left out and said so, and that nothing said here calls
// an interest a profit or a loss or pushes it toward paying.
// Run: node scripts/test_interest_money.js
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
    throw new Error(`lib/interestMoney.ts must stay pure, asked for ${name}`);
  });
  cache[file] = m.exports;
  return m.exports;
}
const M = load('interestMoney');

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

// --- amounts ----------------------------------------------------------------------
check('plain amount', M.readMoneyAmount('12') === 12);
check('dollar sign and cents', M.readMoneyAmount('$12.50') === 12.5);
check('comma cents', M.readMoneyAmount('12,50') === 12.5);
check('thousands', M.readMoneyAmount('1,200') === 1200);
check('nothing is not an amount', M.readMoneyAmount('0') === null && M.readMoneyAmount('free') === null);
check('empty is not an amount', M.readMoneyAmount('') === null);
check('words are not an amount', M.readMoneyAmount('a lot') === null);
check('direction reads', M.readMoneyDirection('in') === 'in' && M.readMoneyDirection('x') === 'out' && M.readMoneyDirection(null) === 'out');
check('money format', M.formatMoney(0) === '$0' && M.formatMoney(1234.5) === '$1,234.50' && M.formatMoney(40) === '$40');
check('day format', M.formatMoneyDay('2024-03-03') === '3 Mar 2024', M.formatMoneyDay('2024-03-03'));
check('month heading', M.monthHeading('2026-10') === 'October 2026');

function entry(over) {
  return {
    id: 'x', interestId: 'i1', direction: 'out', amount: 40, onDay: '2026-10-03', what: 'Clay',
    who: null, note: null, createdAt: '2026-10-03T10:00:00Z', ...over,
  };
}
check('bare line', M.describeMoneyLine(entry({})) === '3 Oct 2026');
check('out line names who it went to', M.describeMoneyLine(entry({ who: 'The studio', note: 'two bags' })) === '3 Oct 2026 · to The studio · two bags');
check('in line names who it came from', M.describeMoneyLine(entry({ direction: 'in', who: 'A neighbour' })) === '3 Oct 2026 · from A neighbour');
check('figure out', M.describeMoneyFigure(entry({})) === '$40 out');
check('figure in', M.describeMoneyFigure(entry({ direction: 'in', amount: 120 })) === '$120 in');

// --- months ---------------------------------------------------------------------------
const entries = [
  entry({ id: 'a', onDay: '2026-09-10', amount: 25 }),
  entry({ id: 'b', onDay: '2026-10-01', amount: 40 }),
  entry({ id: 'c', onDay: '2026-10-20', amount: 100, direction: 'in' }),
  entry({ id: 'd', onDay: '2025-12-31', amount: 10.1 }),
  entry({ id: 'e', onDay: '2025-12-31', amount: 0.2 }),
];
const months = M.groupMoneyByMonth(entries);
check('months newest first', same(months.map((m) => m.month), ['2026-10', '2026-09', '2025-12']), months.map((m) => m.month));
check('newest day first in a month', same(months[0].entries.map((e) => e.id), ['c', 'b']));
check('month sums', months[0].out === 40 && months[0].in === 100);
check('sums round to cents', months[2].out === 10.3, months[2].out);

// --- years with things ----------------------------------------------------------------
function thing(over) {
  return { id: 't', interestId: 'i1', kind: 'supply', name: 'Wheel', cost: 300, gotOn: '2026-05-01', ...over };
}
const things = [
  thing({ id: 't1' }),
  thing({ id: 't2', kind: 'collection', cost: 20, gotOn: '2026' }),
  thing({ id: 't3', kind: 'wish', cost: 900, gotOn: '2026-01-01' }),
  thing({ id: 't4', cost: 15, gotOn: null }),
  thing({ id: 't5', cost: 0, gotOn: '2026-02-02' }),
  thing({ id: 't6', cost: null, gotOn: '2024-02-02' }),
];
const { years, noDay } = M.moneyByYear(entries, things);
check('years newest first', same(years.map((y) => y.year), ['2026', '2025']), years.map((y) => y.year));
check('2026 entered out and in', years[0].out === 65 && years[0].in === 100, years[0]);
check('things with a day counted in their year, wishes and free left out', years[0].things === 320 && years[0].thingCount === 2, years[0]);
check('a price with no day is counted apart', noDay === 1, noDay);
check('a thing with no price makes no year', !years.some((y) => y.year === '2024'));
const y26 = M.describeMoneyYear(years[0]);
check('year in words', y26 === 'In 2026, $385 went out and $100 came in. $320 of it is the price kept on 2 supplies and collected things.', y26);
const y25 = M.describeMoneyYear(years[1]);
check('a year with only money out', y25 === 'In 2025, $10.30 went out.', y25);
check('a year with only money in', M.describeMoneyYear({ year: '2024', out: 0, in: 50, things: 0, thingCount: 0 }) === 'In 2024, $50 came in.');
check('one thing reads singular', M.describeMoneyYear({ year: '2024', out: 0, in: 0, things: 8, thingCount: 1 }).endsWith('price kept on 1 supply or collected thing.'));
check('no day: none says nothing', M.describeNoDay(0) === null);
check('no day: one', M.describeNoDay(1).startsWith('1 supply or collected thing has'));
check('no day: several', M.describeNoDay(3).startsWith('3 supplies and collected things have'));

// --- groups and counts ------------------------------------------------------------------
const names = { i1: 'pottery', i2: 'Birding' };
const groups = M.groupMoneyByInterest([entry({ interestId: 'i1' }), entry({ interestId: 'i2' }), entry({ interestId: 'i1' })], (id) => names[id]);
check('groups alphabetically, case-blind', same(groups.map((g) => g.interestName), ['Birding', 'pottery']));
check('group sizes', groups[1].entries.length === 2);
check('count words', M.countMoney(1) === '1 amount kept' && M.countMoney(4) === '4 amounts kept');
check('saved words', M.describeMoneySaved({ amount: 120, direction: 'in', what: 'Two bowls' }, 'Pottery') === 'Two bowls: $120 came in, kept under Pottery.');
check('labels', M.MONEY_DIRECTION_LABELS.out === 'Went Out' && M.MONEY_DIRECTION_LABELS.in === 'Came In');

// --- what is never said -------------------------------------------------------------------
const FORBIDDEN = [
  'profit', 'loss', 'worth', 'should', 'ought to', 'earn', 'waste', 'too much', 'expensive', 'cheap',
  'streak', 'score', 'rating', 'percent', 'well done', 'great job', 'keep it up', 'best', 'goal', 'you need',
  'genuine', 'honestly', '—', '–',
];
const sources = ['lib/interestMoney.ts', 'components/InterestMoneySection.tsx'];
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

console.log(`${pass + fail} checks, ${fail} failures`);
process.exit(fail ? 1 : 0);
