#!/usr/bin/env node
// Paragraphs in the reading (1.0.87.8). Every long text a reading entry opens
// (summary, and a problem food's problem and mechanism) is written in
// paragraphs separated by one blank line. Checks:
//   1. a text of 600 characters or more has at least one paragraph break;
//   2. no paragraph runs past 1,100 characters;
//   3. a break is exactly one blank line ("\n\n"), with no space beside it,
//      no single line break and no run of three;
//   4. no paragraph starts in the middle of a sentence (with a small letter);
//   5. the Spanish for a text, when there is one, has the same number of
//      paragraphs as the English, none past 1,350 characters.
// node scripts/test_reading_paragraphs.js           the whole check
// node scripts/test_reading_paragraphs.js --list    every failing entry, not the first 20
/* global __dirname */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NEEDS_BREAK = 600;
const MAX_PARAGRAPH = 1100;
// Spanish runs about a fifth longer than the English it follows, so its
// paragraphs get a higher ceiling and it is not asked to break on its own.
const MAX_PARAGRAPH_ES = 1350;
const FIELDS = ['summary', 'problem', 'mechanism'];

const transpiled = new Map();
function loadTs(abs) {
  const ts = require('typescript');
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

const { ALL_DIGEST_ENTRIES } = loadTs(path.join(ROOT, 'lib/digest/index'));
const { readingKey } = loadTs(path.join(ROOT, 'lib/readingKey'));

// The Spanish reading pieces, read straight from the generated tables.
const spanish = new Map();
const esDir = path.join(ROOT, 'lib/translations/es');
for (const name of fs.readdirSync(esDir).filter((n) => n.startsWith('reading-'))) {
  for (const line of fs.readFileSync(path.join(esDir, name), 'utf8').split(/\r?\n/)) {
    const m = /^ "([0-9a-z]+)": (".*"),?$/.exec(line);
    if (m) spanish.set(m[1], JSON.parse(m[2]));
  }
}

function problemsWith(text, language) {
  const out = [];
  if (/(^|[^\n])\n([^\n]|$)|\n{3,}/.test(text)) {
    out.push(`${language}: a break that is not exactly one blank line`);
  }
  if (/ \n|\n /.test(text)) out.push(`${language}: a space beside a break`);
  const paragraphs = text.split('\n\n');
  const max = language === 'Spanish' ? MAX_PARAGRAPH_ES : MAX_PARAGRAPH;
  if (language === 'English' && text.length >= NEEDS_BREAK && paragraphs.length < 2) out.push(`${language}: ${text.length} characters with no paragraph break`);
  paragraphs.forEach((p, i) => {
    if (p.length > max) out.push(`${language}: paragraph ${i + 1} runs ${p.length} characters`);
    if (i > 0 && /^[a-záéíóúñ]/.test(p)) out.push(`${language}: paragraph ${i + 1} starts mid-sentence: "${p.slice(0, 40)}"`);
  });
  return { out, count: paragraphs.length };
}

const failures = [];
let texts = 0;
let paragraphs = 0;
let withSpanish = 0;
for (const entry of ALL_DIGEST_ENTRIES) {
  if (entry.linkedCuratedRecipeId) continue;
  for (const field of FIELDS) {
    const text = entry[field];
    if (typeof text !== 'string' || !text) continue;
    texts++;
    const en = problemsWith(text, 'English');
    paragraphs += en.count;
    const issues = [...en.out];
    const es = spanish.get(readingKey(text));
    if (es !== undefined) {
      withSpanish++;
      const sp = problemsWith(es, 'Spanish');
      issues.push(...sp.out);
      if (sp.count !== en.count) issues.push(`Spanish has ${sp.count} paragraphs, English ${en.count}`);
    }
    for (const issue of issues) failures.push(`${entry.id} (${field}): ${issue}`);
  }
}

console.log(`${texts} reading texts, ${paragraphs} paragraphs, ${withSpanish} with Spanish.`);
if (failures.length) {
  const shown = process.argv.includes('--list') ? failures : failures.slice(0, 20);
  for (const f of shown) console.log(`  ${f}`);
  if (shown.length < failures.length) console.log(`  ...and ${failures.length - shown.length} more (--list for all)`);
  console.log(`FAIL: ${failures.length} problem(s).`);
  process.exit(1);
}
console.log('OK: every long reading text is in paragraphs, and the Spanish matches.');
