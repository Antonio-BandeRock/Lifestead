#!/usr/bin/env node
// The "In short" line on every reading entry (1.0.87.7). Checks:
//   1. every reading entry except recipes has a line;
//   2. every line names an entry that exists, in the file for its category;
//   3. every line reads at Flesch-Kincaid grade 8 or under;
//   4. no dash used as punctuation, and none of the filler words.
// node scripts/test_in_short.js                 the whole check
// node scripts/test_in_short.js --category gout  one category only
// node scripts/test_in_short.js --missing        list entries with no line
/* global __dirname */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAX_GRADE = 8;

let transpiled = null;
function loadTs(abs) {
  const ts = require('typescript');
  transpiled = transpiled ?? new Map();
  if (transpiled.has(abs)) return transpiled.get(abs).exports;
  const file = [`${abs}.ts`, `${abs}.tsx`, path.join(abs, 'index.ts'), abs].find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!file) return {};
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  transpiled.set(abs, mod);
  const stub = new Proxy({}, { get: () => () => ({}) });
  new Function('exports', 'module', 'require', out)(mod.exports, mod, (name) =>
    name.startsWith('.') ? loadTs(path.resolve(path.dirname(file), name)) : stub,
  );
  return mod.exports;
}

// The same syllable count and grade the ease-of-use report used.
function syllables(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}
function grade(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const words = text.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  if (!words.length) return 0;
  const syl = words.reduce((a, w) => a + syllables(w), 0);
  return 0.39 * (words.length / sentences.length) + 11.8 * (syl / words.length) - 15.59;
}

const args = process.argv.slice(2);
const only = args.includes('--category') ? args[args.indexOf('--category') + 1] : null;
const listMissing = args.includes('--missing');

const { ALL_DIGEST_ENTRIES } = loadTs(path.join(ROOT, 'lib', 'digest', 'index'));
const byId = new Map(ALL_DIGEST_ENTRIES.map((e) => [e.id, e]));
const DIR = path.join(ROOT, 'lib', 'digest', 'inShort');
const problems = [];
let checked = 0;

for (const name of fs.readdirSync(DIR).filter((n) => n.endsWith('.ts') && n !== 'index.ts')) {
  const category = name.replace(/\.ts$/, '');
  if (only && only !== category) continue;
  const { LINES } = loadTs(path.join(DIR, category));
  for (const [id, line] of Object.entries(LINES ?? {})) {
    checked++;
    const entry = byId.get(id);
    if (!entry) { problems.push(`${category}: ${id}: no such entry`); continue; }
    if (entry.category !== category) problems.push(`${category}: ${id}: the entry is in ${entry.category}`);
    const g = grade(line);
    if (g > MAX_GRADE) problems.push(`${category}: ${id}: grade ${g.toFixed(1)}: ${line}`);
    if (/[–—]| -- | - /.test(line)) problems.push(`${category}: ${id}: a dash: ${line}`);
    if (/\b(real|really|genuine|genuinely)\b/i.test(line)) problems.push(`${category}: ${id}: a filler word: ${line}`);
    if (!/[.!?]$/.test(line.trim())) problems.push(`${category}: ${id}: does not end a sentence: ${line}`);
  }
}

const isRecipe = (e) => e.category === 'recipes' || Boolean(e.recipeCard);
const missing = ALL_DIGEST_ENTRIES.filter((e) => !isRecipe(e) && !e.inShort && (!only || e.category === only));
if (listMissing) for (const e of missing) console.log(`${e.category}\t${e.id}`);
if (missing.length) problems.push(`${missing.length} reading entr${missing.length === 1 ? 'y has' : 'ies have'} no In short line (--missing lists them)`);

if (problems.length) {
  console.log(problems.join('\n'));
  console.log(`\n${problems.length} problem(s) across ${checked} line(s).`);
  process.exit(1);
}
console.log(`All ${checked} In short lines pass, and every reading entry has one.`);
