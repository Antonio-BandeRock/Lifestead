#!/usr/bin/env node
// The grouped lens menus, 1.0.87.7 (ease-of-use pass, fix 4). Checks:
//   1. arrangeLensMenu puts Opened lately first, keeps the tab's order,
//      folds the lenses with nothing recorded, and Simple View drops the fold;
//   2. withOpened keeps the newest first, no repeats, at most four;
//   3. every Trends and Life lens sits in exactly one group, and every
//      lens Trends folds is a lens Trends has.
// node scripts/test_lens_menu.js
/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
function loadTs(rel) {
  const out = ts.transpileModule(fs.readFileSync(path.join(ROOT, rel), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  const stub = new Proxy({}, { get: () => () => ({}) });
  new Function('exports', 'module', 'require', out)(mod.exports, mod, () => stub);
  return mod.exports;
}

const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };

const { arrangeLensMenu, OPENED_LATELY } = loadTs('lib/lensMenu.ts');
const options = [
  { key: 'a', group: 'One' },
  { key: 'b', group: 'One' },
  { key: 'c', group: 'Two' },
  { key: 'd', group: 'Two' },
];
const plain = arrangeLensMenu(options, [], undefined, false);
check(plain.rows.map((r) => r.option.key).join() === 'a,b,c,d', 'no recent and no fold returns the options unchanged');
check(plain.foldedCount === 0 && plain.folded.length === 0, 'nothing folds without emptyKeys');

const full = arrangeLensMenu(options, ['c', 'gone', 'a'], new Set(['b', 'd']), false);
check(full.rows.map((r) => r.rowKey).join() === 'recent:c,recent:a,a,c', `recent first, then the tab order without folded lenses (got ${full.rows.map((r) => r.rowKey).join()})`);
check(full.rows[0].group === OPENED_LATELY && full.rows[2].group === 'One', 'recent rows carry Opened lately, the rest keep their group');
check(full.folded.map((r) => r.option.key).join() === 'b,d' && full.foldedCount === 2, 'the empty lenses fold in tab order');
check(new Set(full.rows.map((r) => r.rowKey)).size === full.rows.length, 'every row key is unique');

const simple = arrangeLensMenu(options, ['c'], new Set(['b']), true);
check(simple.folded.length === 0 && simple.foldedCount === 1, 'Simple View leaves the fold out but still counts it');
check(!simple.rows.some((r) => r.option.key === 'b'), 'Simple View does not show a folded lens');

const { withOpened } = loadTs('lib/recentLenses.ts');
check(withOpened([], 'x').join() === 'x', 'the first lens opened');
check(withOpened(['a', 'b', 'c'], 'b').join() === 'b,a,c', 'reopening moves a lens to the front without repeating it');
check(withOpened(['a', 'b', 'c', 'd'], 'e').join() === 'e,a,b,c', 'at most four, the oldest drops off');

// Every lens in exactly one group.
function lensKeys(file, arrayName) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const start = src.indexOf(`const ${arrayName}`);
  const end = src.indexOf('\n];', start);
  return [...src.slice(start, end).matchAll(/^\s+(?:\{ )?key: '([A-Za-z]+)'/gm)].map((m) => m[1]);
}
function groupedKeys(file, groupsName) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const start = src.indexOf(`const ${groupsName}`);
  const end = src.indexOf('\n];', start);
  return [...src.slice(start, end).matchAll(/keys: \[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([A-Za-z]+)'/g)].map((k) => k[1]));
}
for (const [file, lenses, groups] of [
  ['app/(tabs)/trends.tsx', 'TRENDS_LENSES', 'TRENDS_LENS_GROUPS'],
  ['app/(tabs)/life.tsx', 'LIFE_LENSES', 'LIFE_LENS_GROUPS'],
]) {
  const keys = lensKeys(file, lenses);
  const grouped = groupedKeys(file, groups);
  check(keys.length > 0, `${file}: found the lenses`);
  for (const key of keys) {
    const n = grouped.filter((k) => k === key).length;
    check(n === 1, `${file}: ${key} is in ${n} groups`);
  }
  for (const key of grouped) check(keys.includes(key), `${file}: group names ${key}, which is not a lens`);
  if (file.includes('trends')) {
    const sources = fs.readFileSync(path.join(ROOT, 'lib/trendsLensRecords.ts'), 'utf8');
    const block = sources.slice(sources.indexOf('TRENDS_LENS_SOURCES'), sources.indexOf('\n};'));
    for (const m of block.matchAll(/^  ([A-Za-z]+): \[/gm)) check(keys.includes(m[1]), `trendsLensRecords names ${m[1]}, which is not a Trends lens`);
  }
}

if (problems.length) {
  console.log(problems.join('\n'));
  process.exit(1);
}
console.log('Lens menus: ordering, folding, Opened lately and every group check out.');
