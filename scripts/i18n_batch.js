// Moves the app's words into a language's table one batch at a time
// (2026-10-26, Spanish first).
//
//   node scripts/i18n_batch.js make [--chars 25000] [--foods]
//     Writes the next batch of untranslated English to the scratch folder as
//     part-NN.txt (foods-NN.txt), one "id|English" per line, a line break written \n.
//     --foods takes the next food-name parts instead (see FOOD PARTS below).
//
//   node scripts/i18n_batch.js merge NN [--foods]
//     Reads part-NN.es.txt (foods-NN.es.txt), one "id|translation" per line ("id|=" keeps
//     the English as it is, for a name or a word Spanish shares), checks
//     each line keeps the English's {name}s and <0> tags and has no dash in
//     place of punctuation, and writes lib/translations/es/part-NN.ts (or
//     foods-NN.ts), then rebuilds lib/translations/es/index.ts.
//
//   --reading does the same for the reading (lib/digest: the conditions,
//     Health Literacy, Earth Matters, Horticulture and the recipes), one
//     "key|English" per line where key is lib/readingKey.ts's fingerprint,
//     taken entry by entry so a batch reads as whole entries, and writes
//     reading-NN.ts. Paper titles in the citations stay as published.
//
//   node scripts/i18n_batch.js status
//     How much is left, by priority group.
//
// Batches go in priority order: the screens first, then the sentences the
// app builds, then the how-tos and Your Story, then the crop guides and the
// exercise library, and the release notes last.
//
// FOOD PARTS. A food's name in the reference database ("Apple, raw, with
// skin") is translated by its parts, split at ", ", so 19,629 names need
// 14,714 parts. The parts are read from assets/data/foods_reference.db,
// opened read only; neither database is ever written for translation.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const { extractAll } = require('./i18n_extract');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'lib', 'translations', 'es');
const SCRATCH = process.env.I18N_SCRATCH
  || 'C:/Users/TonyR/AppData/Local/Temp/claude/c--Dev-lifestead-app/1c0237dc-d481-4c0f-8a0a-681cbe502cdc/scratchpad/i18n';

const PRIORITY = [
  (file) => /^(app|components|constants|hooks)\//.test(file) && !/releaseNotes/.test(file),
  (file) => /^lib\//.test(file) && !/(toolHowTos|yourStory|cropProblems|cropSigns|cropGuides|plantNutrients|sowingTraditions|exerciseLibrary)/.test(file),
  (file) => /(toolHowTos|yourStory)/.test(file),
  (file) => /(cropProblems|cropSigns|cropGuides|plantNutrients|sowingTraditions|exerciseLibrary)/.test(file),
  () => true,
];

function readPart(file) {
  const text = fs.readFileSync(file, 'utf8');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return JSON.parse(text.slice(start, end + 1));
}

/** Everything already in the table: the parts plus the entries in es.ts. */
function existing() {
  const done = new Map();
  if (fs.existsSync(OUT_DIR)) {
    for (const name of fs.readdirSync(OUT_DIR)) {
      if (/^(part|foods|reading)-\d+\.ts$/.test(name)) {
        for (const [k, v] of Object.entries(readPart(path.join(OUT_DIR, name)))) done.set(k, v);
      }
    }
  }
  const hand = fs.readFileSync(path.join(ROOT, 'lib', 'translations', 'es.ts'), 'utf8');
  for (const match of hand.matchAll(/^\s+(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|(\w+)):/gm)) {
    done.set((match[1] ?? match[2] ?? match[3]).replace(/\\(.)/g, '$1'), '');
  }
  return done;
}

function foodParts() {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(path.join(ROOT, 'assets', 'data', 'foods_reference.db'), { readOnly: true });
  const counts = new Map();
  const rows = db.prepare('SELECT name, base_name, short_name FROM foods WHERE hidden = 0').all();
  for (const row of rows) {
    for (const name of new Set([row.name, row.base_name, row.short_name])) {
      if (!name) continue;
      for (const part of name.split(', ')) {
        const p = part.trim();
        if (/[A-Za-z]{2}/.test(p)) counts.set(p, (counts.get(p) ?? 0) + 1);
      }
    }
  }
  db.close();
  return counts;
}

const escape = (text) => text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n');
const unescape = (text) => text.replace(/\\(n|\\)/g, (_, c) => (c === 'n' ? '\n' : '\\'));

function nextNumber(prefix) {
  fs.mkdirSync(SCRATCH, { recursive: true });
  let n = 1;
  const taken = new Set([
    ...fs.readdirSync(SCRATCH),
    ...(fs.existsSync(OUT_DIR) ? fs.readdirSync(OUT_DIR) : []),
  ]);
  const pad = (i) => String(i).padStart(3, '0');
  while (taken.has(`${prefix}-${pad(n)}.txt`) || taken.has(`${prefix}-${pad(n)}.ts`)) n += 1;
  return pad(n);
}

// Fields nothing on screen reads, so their strings never go in the table.
// The meal rules' citation is kept for whoever reads the code; Compare Two
// shows compare.source instead.
const NOT_SHOWN = [{ file: 'lib/nutrientPairRules.ts', property: 'citation' }];
const sourceLines = new Map();

function notShown(file, line) {
  const rule = NOT_SHOWN.find((r) => r.file === file);
  if (!rule) return false;
  if (!sourceLines.has(file)) sourceLines.set(file, fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/));
  const lines = sourceLines.get(file);
  const here = new RegExp(`^\\s*${rule.property}:`);
  return here.test(lines[line - 1] ?? '') || here.test(lines[line - 2] ?? '');
}

function pending(foods) {
  const done = existing();
  const parts = foodParts();
  if (foods) {
    return [...parts].filter(([k]) => !done.has(k)).sort((a, b) => b[1] - a[1]).map(([k]) => ({ key: k, group: 0 }));
  }
  const keys = extractAll();
  const out = [];
  const seen = new Set();
  for (const [raw, info] of keys) {
    const key = raw.trim();
    if (!key || seen.has(key) || done.has(key) || parts.has(key)) continue;
    seen.add(key);
    const file = info.where.replace(/:\d+$/, '');
    if (notShown(file.replace(/\\/g, '/'), Number(info.where.split(':').pop()))) continue;
    const group = PRIORITY.findIndex((test) => test(file));
    out.push({ key, group, where: info.where, file, line: Number(info.where.split(':').pop()) });
  }
  out.sort((a, b) => a.group - b.group || a.file.localeCompare(b.file) || a.line - b.line);
  return out;
}

// THE READING. Every entry in lib/digest, loaded by transpiling it, with
// the strings a person reads taken field by field. Ids, links, keys the
// code tests and the paper titles in citations are left out.
const READING_SKIP = /^(id|category|overallTier|linkedCuratedRecipeId|linkedBuilderType|relatedIds|citations\.(url|source)|recipeCard\.safeForConditions|recipeCard\.dietTags|recipeCard\.conditionCautions\.\w+\.severity|recipeCard\.ingredients\.(foodId|category)|recipeCard\.checkIngredients\..*|relatedFoodNames)$/;
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

function readingPieces() {
  const { ALL_DIGEST_ENTRIES } = loadTs(path.join(ROOT, 'lib', 'digest', 'index'));
  const { readingKey } = loadTs(path.join(ROOT, 'lib', 'readingKey'));
  const seen = new Set();
  const out = [];
  const walk = (value, at) => {
    if (typeof value === 'string') {
      if (READING_SKIP.test(at) || !/[A-Za-z]{2}/.test(value)) return;
      const id = readingKey(value);
      if (!seen.has(id)) {
        seen.add(id);
        out.push({ id, key: value });
      }
    } else if (Array.isArray(value)) value.forEach((item) => walk(item, at));
    else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(v, at ? `${at}.${k}` : k);
  };
  for (const entry of ALL_DIGEST_ENTRIES) walk(entry, '');
  return out;
}

function readingPending() {
  const done = new Set();
  if (fs.existsSync(OUT_DIR)) {
    for (const name of fs.readdirSync(OUT_DIR)) {
      if (/^reading-\d+\.ts$/.test(name)) for (const k of Object.keys(readPart(path.join(OUT_DIR, name)))) done.add(k);
    }
  }
  const words = existing();
  return readingPieces().filter((item) => !done.has(item.id) && !words.has(item.key));
}

function make(chars, foods, reading) {
  const list = reading ? readingPending() : pending(foods);
  const prefix = reading ? 'reading' : foods ? 'foods' : 'part';
  const number = nextNumber(prefix);
  const lines = [];
  let size = 0;
  for (const item of list) {
    if (size > 0 && size + item.key.length > chars) break;
    lines.push(`${reading ? item.id : lines.length + 1}|${escape(item.key)}`);
    size += item.key.length;
  }
  const file = path.join(SCRATCH, `${prefix}-${number}.txt`);
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
  console.log(`${file}: ${lines.length} lines, ${size} characters; ${list.length - lines.length} left after it.`);
}

const names = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const tags = (text) => [...text.matchAll(/<\/?(\d+)\/?>/g)].map((m) => m[0]).sort().join(',');

function merge(number) {
  const reading = process.argv.includes('--reading');
  const prefix = reading ? 'reading' : process.argv.includes('--foods') ? 'foods' : 'part';
  const source = fs.readFileSync(path.join(SCRATCH, `${prefix}-${number}.txt`), 'utf8').split('\n').filter(Boolean);
  const english = new Map(source.map((line) => {
    const at = line.indexOf('|');
    return [line.slice(0, at), unescape(line.slice(at + 1))];
  }));
  const answers = fs.readFileSync(path.join(SCRATCH, `${prefix}-${number}.es.txt`), 'utf8').split('\n').filter((l) => l.trim());
  const out = {};
  const problems = [];
  for (const line of answers) {
    const at = line.indexOf('|');
    const id = line.slice(0, at).trim();
    let spanish = unescape(line.slice(at + 1)).trim();
    const en = english.get(id);
    if (en === undefined) { problems.push(`${id}: no such line`); continue; }
    if (spanish === '=') spanish = en;
    if (!spanish) problems.push(`${id}: empty`);
    else if (names(en) !== names(spanish)) problems.push(`${id}: {names} differ: ${en} => ${spanish}`);
    else if (tags(en) !== tags(spanish)) problems.push(`${id}: tags differ: ${en} => ${spanish}`);
    else if (/[–—]| -- /.test(spanish) && !/[–—]| -- /.test(en)) problems.push(`${id}: a dash: ${spanish}`);
    else out[reading ? id : en] = spanish;
  }
  const missing = [...english.keys()].filter((id) => !answers.some((l) => l.startsWith(`${id}|`)));
  if (missing.length) problems.push(`missing ids: ${missing.join(' ')}`);
  if (problems.length) {
    console.log(problems.join('\n'));
    console.log(`\n${problems.length} problem(s); nothing written.`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const target = path.join(OUT_DIR, `${prefix}-${number}.ts`);
  fs.writeFileSync(target, `// Generated by scripts/i18n_batch.js merge; edit the line here or in es.ts.\n/* eslint-disable */\nexport const PART: Readonly<Record<string, string>> = ${JSON.stringify(out, null, 1)};\n`);
  writeIndex();
  console.log(`${target}: ${Object.keys(out).length} entries.`);
}

function writeIndex() {
  const files = fs.readdirSync(OUT_DIR).filter((n) => /^(part|foods|reading)-\d+\.ts$/.test(n)).sort();
  const parts = files.filter((n) => n.startsWith('part'));
  const foods = files.filter((n) => n.startsWith('foods'));
  const readings = files.filter((n) => n.startsWith('reading'));
  const ident = (n) => n.replace(/\.ts$/, '').replace('-', '_').toUpperCase();
  const lines = [
    '// Generated by scripts/i18n_batch.js; lists every part file.',
    ...files.map((n) => `import { PART as ${ident(n)} } from './${n.replace(/\.ts$/, '')}';`),
    '',
    `export const ES_PARTS: Readonly<Record<string, string>> = Object.assign({}, ${parts.map(ident).join(', ') || '{}'});`,
    `export const ES_FOODS: Readonly<Record<string, string>> = Object.assign({}, ${foods.map(ident).join(', ') || '{}'});`,
    `export const ES_READING: Readonly<Record<string, string>> = Object.assign({}, ${readings.map(ident).join(', ') || '{}'});`,
    '',
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'index.ts'), lines.join('\n'));
}

function status() {
  for (const foods of [false, true]) {
    const list = pending(foods);
    const by = new Map();
    for (const item of list) by.set(item.group, (by.get(item.group) ?? 0) + item.key.length);
    console.log(foods ? 'food parts:' : 'words:', list.length, 'keys', [...by].map(([g, c]) => `group ${g + 1}: ${c}`).join(', '));
  }
  const left = readingPending();
  const chars = left.reduce((n, item) => n + item.key.length, 0);
  console.log('reading:', left.length, 'pieces,', chars, 'characters left of', readingPieces().length, 'pieces');
}

const [command, arg] = process.argv.slice(2);
if (command === 'make') {
  const at = process.argv.indexOf('--chars');
  make(at >= 0 ? Number(process.argv[at + 1]) : 25000, process.argv.includes('--foods'), process.argv.includes('--reading'));
} else if (command === 'merge') merge(String(arg).padStart(3, '0'));
else if (command === 'index') writeIndex();
else if (command === 'status') status();
else console.log('make | merge NN | status | index');
