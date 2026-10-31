// Checks lib/interestThings.ts (Interests > Supplies & Equipment,
// Collections and Wish List): reading a price as typed, the line under a
// thing, the totals, the groups and sets, where Got It points first, and that
// nothing said about a thing values it, ranks it or pushes buying more.
// Run: node scripts/test_interest_things.js
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
    throw new Error(`lib/interestThings.ts must stay pure, asked for ${name}`);
  });
  cache[file] = m.exports;
  return m.exports;
}
const T = load('interestThings');
const TODAY = '2026-10-30';

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

// --- a price, as typed ----------------------------------------------------------
const prices = [
  ['', { ok: true, cost: null }],
  ['12', { ok: true, cost: 12 }],
  ['$12.50', { ok: true, cost: 12.5 }],
  ['12,50', { ok: true, cost: 12.5 }],
  ['$1,200', { ok: true, cost: 1200 }],
  ['1,200,000', { ok: true, cost: 1200000 }],
  ['about 30', { ok: true, cost: 30 }],
  ['350 pesos', { ok: true, cost: 350 }],
  ['20 usd', { ok: true, cost: 20 }],
  ['free', { ok: true, cost: 0 }],
  ['Gratis', { ok: true, cost: 0 }],
  ['a lot', { ok: false, cost: null }],
  ['12.555', { ok: false, cost: null }],
  ['99999999', { ok: false, cost: null }],
];
for (const [words, expected] of prices) {
  const got = T.readCost(words);
  check(`price "${words}"`, same(got, expected), got);
}
check('cost free', T.formatThingCost(0) === 'free');
check('cost whole', T.formatThingCost(1200) === '$1,200', T.formatThingCost(1200));
check('cost cents', T.formatThingCost(12.5) === '$12.50', T.formatThingCost(12.5));

// --- things ---------------------------------------------------------------------
function thing(over) {
  return {
    id: 'x', interestId: 'i1', kind: 'supply', name: 'Chisel', about: null, amount: null, place: null, cost: null,
    source: null, cameBy: null, gotOn: null, setName: null, wishedOn: null, retiredAt: null, createdAt: `${TODAY}T10:00:00Z`,
    ...over,
  };
}
check('bare line is empty', T.describeThingLine(thing({})) === '');
const full = T.describeThingLine(thing({ amount: '2', place: 'Garage shelf', gotOn: '2024-03', cameBy: 'a gift', cost: 0 }));
check('supply line', full === '2 · Garage shelf · got March 2024 · a gift · free', full);
const wishLine = T.describeThingLine(thing({ kind: 'wish', cost: 40, source: 'the hardware shop', place: 'ignored' }));
check('wish line', wishLine === 'about $40 · from the hardware shop', wishLine);
const wished = T.describeWishedFor({ wishedOn: '2026-09-01' });
check('wished for', wished !== null && wished.startsWith('On the wish list from ') && wished.includes('2026'), wished);
check('never wished', T.describeWishedFor({ wishedOn: null }) === null);

// --- totals ---------------------------------------------------------------------
check('total no prices', T.describeThingsTotal([thing({}), thing({})]) === '2 supplies and pieces of equipment.');
check('total one', T.describeThingsTotal([thing({})]) === '1 supply or piece of equipment.');
const priced = T.describeThingsTotal([thing({ cost: 10 }), thing({ cost: 2.5 })]);
check('total all priced', priced === '2 supplies and pieces of equipment, $12.50 paid.', priced);
check('total all free', T.describeThingsTotal([thing({ cost: 0 })]) === '1 supply or piece of equipment, all free.');
const partial = T.describeThingsTotal([thing({ kind: 'collection', cost: 5 }), thing({ kind: 'collection' })]);
check('total partly priced', partial === '2 things in collections, $5 paid across the 1 with a price kept.', partial);
const wishes = T.describeThingsTotal([thing({ kind: 'wish', cost: 40 })]);
check('wish total says about', wishes === '1 thing wished for, about $40 in all.', wishes);

// --- groups ---------------------------------------------------------------------
const all = [
  thing({ id: 'a', name: 'saw', interestId: 'i2' }),
  thing({ id: 'b', name: 'Awl', interestId: 'i2' }),
  thing({ id: 'c', name: 'Plane', interestId: 'i1' }),
  thing({ id: 'd', name: 'Old saw', interestId: 'i1', retiredAt: '2026-10-01T00:00:00Z' }),
  thing({ id: 'e', kind: 'collection', name: 'Peso 1980', interestId: 'i3', setName: 'Mexican coins' }),
  thing({ id: 'f', kind: 'collection', name: 'Loose button', interestId: 'i3' }),
  thing({ id: 'g', kind: 'wish', name: 'Router', interestId: 'i1' }),
];
const names = { i1: 'Woodworking', i2: 'Bushcraft', i3: 'Coins' };
const groups = T.groupThings(all, 'supply', (id) => names[id]);
check('groups by interest, alphabetically', same(groups.map((g) => g.interestName), ['Bushcraft', 'Woodworking']), groups.map((g) => g.interestName));
check('things alphabetically', same(groups[0].things.map((t) => t.name), ['Awl', 'saw']));
check('retired left out', !groups[1].things.some((t) => t.id === 'd'));
check('retired listed', same(T.retiredThings(all, 'supply').map((t) => t.id), ['d']));
const coins = T.groupThings(all, 'collection', (id) => names[id]);
check('no set first', same(coins[0].sets.map((s) => s.setName), [null, 'Mexican coins']), coins[0].sets);
check('set names', same(T.setNamesFor(all, 'i3'), ['Mexican coins']));

// --- Got It ---------------------------------------------------------------------
check('collecting goes to collections', T.gotItGoesTo('collecting', all, 'i1') === 'collection');
check('mostly supplies goes to supplies', T.gotItGoesTo('building', all, 'i1') === 'supply');
check('mostly collected goes to collections', T.gotItGoesTo(null, all, 'i3') === 'collection');
check('got it words', T.describeGotIt('Router', 'supply') === 'Router is in Supplies & Equipment now, with the day it was wished for.');
check('counts', T.countThings('wish', 3) === '3 things wished for' && T.countThings('collection', 1) === '1 thing in a collection');

// --- nothing values, ranks or pushes ---------------------------------------------
const FORBIDDEN = [
  'streak', 'level', 'points', 'score', 'percent', 'well done', 'great job', 'good job', 'keep it up',
  'should', 'goal', 'earn', 'worth', 'value', 'invest', 'complete your', 'next to buy', 'you need',
  'genuine', 'honestly', '—', '–',
];
const sources = ['lib/interestThings.ts', 'components/InterestThingsSection.tsx'];
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
