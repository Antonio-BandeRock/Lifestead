// Checks lib/untriedLenses.ts, Not Tried Yet in each tab's group on Home
// (2026-11-15).
//
// What it holds to: every lens listed is a lens of that tab in the tour
// (so it has a name and a line to show), every table and column a check
// reads exists in the schema code, each lens is listed once, the query
// stops at one row, and the words never count, grade or praise.
//
// Exits non-zero on any failure.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');

function load(relPath, allowed = {}) {
  const source = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
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

const untried = load('lib/untriedLenses.ts');
const story = load('lib/yourStory.ts');
const interview = load('lib/yourStoryInterview.ts', { './yourStory': story });

let checks = 0;
let failures = 0;
function check(condition, label) {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error('FAIL: ' + label);
  }
}

// The schema: every CREATE TABLE and ALTER TABLE ... ADD COLUMN in lib/.
const columns = new Map();
function addColumn(table, column) {
  if (!columns.has(table)) columns.set(table, new Set());
  if (column) columns.get(table).add(column);
}
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.tsx?$/.test(name)) continue;
    const text = fs.readFileSync(full, 'utf8');
    const create = /CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\(([\s\S]*?)\);/g;
    let m;
    while ((m = create.exec(text))) {
      addColumn(m[1]);
      for (const line of m[2].split(/,\s*\n|\n/)) {
        const col = line.trim().match(/^(\w+)\s+(INTEGER|TEXT|REAL|NUMERIC|BLOB)/i);
        if (col) addColumn(m[1], col[1]);
      }
    }
    const alter = /ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(\w+)/g;
    while ((m = alter.exec(text))) addColumn(m[1], m[2]);
  }
}
walk(path.join(ROOT, 'lib'));

const SQL_WORDS = new Set(['AND', 'OR', 'NOT', 'IN', 'LIKE', 'IS', 'NULL']);

for (const tabPath of untried.UNTRIED_TAB_PATHS) {
  const tab = interview.TOUR_TABS.find((t) => t.path === tabPath);
  check(!!tab, `${tabPath} is a tab in the tour`);
  const tourLenses = new Set((tab?.groups ?? []).flatMap((g) => g.lenses));
  check(!!untried.UNTRIED_LENS_PARAM[tabPath], `${tabPath} has a route parameter for opening a lens`);
  const seen = new Set();
  for (const def of untried.UNTRIED_LENSES[tabPath]) {
    const where = `${tabPath} ${def.lens}`;
    check(!seen.has(def.lens), `${where} is listed once`);
    seen.add(def.lens);
    check(tourLenses.has(def.lens), `${where} is a lens of that tab in TOUR_TABS`);
    check(interview.lensName(tabPath, def.lens) !== def.lens, `${where} has a name in TOUR_LENS_NAMES`);
    check(!!interview.lensLine(tabPath, def.lens), `${where} has a line in TOUR_LENS_LINES`);
    check(def.used.length > 0, `${where} has something that counts as using it`);
    for (const usedCheck of def.used) {
      check(columns.has(usedCheck.table), `${where}: table ${usedCheck.table} exists in the schema code`);
      const sql = untried.usedQuery(usedCheck);
      check(/ LIMIT 1$/.test(sql), `${where}: the query stops at one row`);
      if (usedCheck.where) {
        const names = usedCheck.where.replace(/'[^']*'/g, '').match(/[A-Za-z_]\w*/g) ?? [];
        for (const name of names) {
          if (SQL_WORDS.has(name.toUpperCase())) continue;
          check(columns.get(usedCheck.table)?.has(name), `${where}: column ${usedCheck.table}.${name} exists in the schema code`);
        }
      }
    }
    const route = untried.untriedRoute(tabPath, def.lens);
    check(route.pathname === tabPath && route.params[untried.UNTRIED_LENS_PARAM[tabPath]] === def.lens, `${where} opens on its tab at that lens`);
  }
}

// The words: nothing counted, graded or praised.
const words = [untried.UNTRIED_BAND_TITLE, untried.UNTRIED_LINE].join(' ');
check(!/\d/.test(words), 'the words carry no numbers');
check(!/(percent|%|score|streak|great|well done|should|must|behind|missing|incomplete)/i.test(words), 'the words never grade, praise or push');

// Each tab's untried key on Home is registered and sits before its tutorials.
const prefs = fs.readFileSync(path.join(ROOT, 'lib/visualPreferences.ts'), 'utf8');
const sections = fs.readFileSync(path.join(ROOT, 'lib/homeSections.ts'), 'utf8');
for (const [key, tutorials] of [
  ['untriedLife', 'tutorialsLife'],
  ['untriedFood', 'tutorialsFood'],
  ['untriedGarden', 'tutorialsGarden'],
  ['untriedInterests', 'tutorialsInterests'],
  ['untriedSchedule', 'tutorialsSchedule'],
  ['untriedSignals', 'tutorialsSignals'],
  ['untriedInsights', 'tutorialsInsights'],
]) {
  const designed = prefs.slice(prefs.indexOf('DESIGNED_HOME_SECTION_KEYS'));
  const at = designed.indexOf(`'${key}',`);
  check(at >= 0 && at < designed.indexOf(`'${tutorials}',`), `${key} is in the designed order just before ${tutorials}`);
  check(new RegExp(`${key}: '/`).test(sections), `${key} belongs to a tab on Home`);
}

console.log(`test_untried_lenses: ${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
