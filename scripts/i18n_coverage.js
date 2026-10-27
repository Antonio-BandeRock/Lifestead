// How much of the app's words a language table holds (2026-10-26).
//
//   node scripts/i18n_coverage.js            totals per folder for Spanish
//   node scripts/i18n_coverage.js --missing app/profile.tsx
//                                            the English still missing in
//                                            one file or folder, one per line
//   node scripts/i18n_coverage.js --where [path]
//                                            the same, each with the file, line
//                                            and source it comes from
//   node scripts/i18n_coverage.js --json out.json [path]
//                                            the missing English as a JSON
//                                            array, ready to be translated
//
// What it counts is what lib/i18n.ts translates without a file changing:
// words written in JSX, read the way Babel hands them to a Text (lines
// joined with one space, entities decoded), plus the `title` and `label`
// of tab and lens lists, which reach a Text from a constant. A sentence
// assembled from pieces in JSX is counted once per piece of text, since
// that is how it reaches the Text until it becomes one t() call.
//
// It also checks the table itself, and exits non-zero when it is wrong: an
// entry whose {name} placeholders differ from its English, or one that is
// empty. Words in the reading (lib/digest) are left out of the totals here;
// they are a separate stage.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const FOLDERS = ['app', 'components', 'constants', 'hooks', 'lib'];
const SKIP = [path.join('lib', 'digest'), path.join('lib', 'translations'), path.join('lib', 'desktop')];

// Loads es.ts together with the part files it imports from lib/translations/es,
// which is where nearly the whole table lives.
function loadModule(file, stubs = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const requireRelative = (name) => {
    if (stubs[name]) return stubs[name];
    if (!name.startsWith('.')) return {};
    const base = path.join(path.dirname(file), name);
    const found = [base + '.ts', path.join(base, 'index.ts')].find((candidate) => fs.existsSync(candidate));
    return found ? loadModule(found, stubs) : {};
  };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, requireRelative);
  return module.exports;
}

function loadTable() {
  return loadModule(path.join(ROOT, 'lib', 'translations', 'es.ts')).ES;
}

// lib/i18n.ts itself, so a sentence is counted the way the app looks it up.
function loadLookup() {
  const stubs = {
    react: { cloneElement: (element) => element, isValidElement: () => false },
    './language': { getLanguage: () => 'es' },
  };
  return loadModule(path.join(ROOT, 'lib', 'i18n.ts'), stubs).hasTranslation;
}

const ENTITIES = { apos: "'", quot: '"', amp: '&', lt: '<', gt: '>', nbsp: ' ', rsquo: '’', lsquo: '‘', hellip: '…' };
function decode(text) {
  return text.replace(/&(#x?[0-9a-f]+|\w+);/gi, (whole, name) => {
    if (name[0] === '#') {
      const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name] ?? whole;
  });
}

// Babel's cleanJSXElementLiteralChild, which decides the string a Text gets.
function jsxString(raw) {
  const lines = raw.split(/\r\n|\n|\r/);
  let last = 0;
  lines.forEach((line, index) => {
    if (/[^ \t]/.test(line)) last = index;
  });
  let out = '';
  lines.forEach((line, index) => {
    const isFirst = index === 0;
    const isLast = index === lines.length - 1;
    let trimmed = line.replace(/\t/g, ' ');
    if (!isFirst) trimmed = trimmed.replace(/^[ ]+/, '');
    if (!isLast) trimmed = trimmed.replace(/[ ]+$/, '');
    if (trimmed) {
      if (index !== last) trimmed += ' ';
      out += trimmed;
    }
  });
  return decode(out);
}

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);
    if (SKIP.some((skip) => rel === skip || rel.startsWith(skip + path.sep))) continue;
    if (entry.isDirectory()) walk(full, files);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) files.push(full);
  }
}

// A Text whose children mix words and values reaches lib/i18n.ts as one
// sentence, so it is counted as one: each value becomes {} and a value that
// is one of two quoted words ('day' or 'days', '' or 's') gives a sentence
// for each, since the table needs an entry for each.
const MAX_VARIANTS = 8;
function literalOf(expression) {
  if (!expression) return null;
  if (ts.isParenthesizedExpression(expression)) return literalOf(expression.expression);
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return [expression.text];
  // ` · ${label}` keeps its words, so the middle dot it adds is seen.
  if (ts.isTemplateExpression(expression)) {
    return [expression.head.text + expression.templateSpans.map((span) => '{}' + span.literal.text).join('')];
  }
  if (ts.isConditionalExpression(expression)) {
    const a = literalOf(expression.whenTrue);
    const b = literalOf(expression.whenFalse);
    if (a && b) return [...a, ...b];
  }
  return null;
}

function sentencesOf(element) {
  const children = element.children;
  if (children.some((child) => ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child))) return null;
  const hasValue = children.some((child) => ts.isJsxExpression(child) && child.expression && !literalOf(child.expression));
  const hasChoice = children.some((child) => ts.isJsxExpression(child) && literalOf(child.expression)?.length > 1);
  if (!hasValue && !hasChoice) return null;
  let variants = [''];
  for (const child of children) {
    let options;
    if (ts.isJsxText(child)) options = [jsxString(child.text)];
    else if (ts.isJsxExpression(child)) options = child.expression ? literalOf(child.expression) ?? ['{}'] : [''];
    else options = [''];
    const next = [];
    for (const start of variants) for (const option of options) next.push(start + option);
    variants = next.slice(0, MAX_VARIANTS);
  }
  const out = [...new Set(variants.map((variant) => variant.trim()))].filter((variant) => /[A-Za-z]/.test(variant.replace(/\{\}/g, '')));
  return out.length ? out : null;
}

function wordsIn(file) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found = [];
  const visit = (node) => {
    if (ts.isJsxElement(node)) {
      const sentences = sentencesOf(node);
      if (sentences) {
        const at = `${path.relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
        const code = node.getText().replace(/\s+/g, ' ').slice(0, 400);
        for (const sentence of sentences) found.push({ sentence, at, code });
        node.children.forEach((child) => {
          if (!ts.isJsxText(child)) visit(child);
        });
        return;
      }
    }
    if (ts.isJsxText(node)) {
      const text = jsxString(node.text);
      if (/[A-Za-z]/.test(text)) found.push({ sentence: text.trim(), at: `${path.relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`, code: text.trim() });
    } else if (
      ts.isPropertyAssignment(node) &&
      (ts.isIdentifier(node.name) && (node.name.text === 'label' || node.name.text === 'title')) &&
      ts.isStringLiteral(node.initializer) &&
      /[A-Za-z]/.test(node.initializer.text) &&
      isInTabOrLensList(node)
    ) {
      found.push(node.initializer.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function isInTabOrLensList(node) {
  for (let up = node.parent; up; up = up.parent) {
    if (ts.isVariableDeclaration(up) && ts.isIdentifier(up.name)) return /LENS|TAB_ROUTES|LENSES/.test(up.name.text);
  }
  return false;
}

function placeholders(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(',');
}

const args = process.argv.slice(2);
const missingAt = args.indexOf('--missing');
const jsonAt = args.indexOf('--json');
const whereAt = args.indexOf('--where');
const scope = whereAt >= 0 ? args[whereAt + 1] : missingAt >= 0 ? args[missingAt + 1] : jsonAt >= 0 ? args[jsonAt + 2] : undefined;

const table = loadTable();
let problems = 0;
for (const [english, spanish] of Object.entries(table)) {
  if (!spanish.trim()) {
    console.log(`EMPTY  ${JSON.stringify(english)}`);
    problems += 1;
  } else if (placeholders(english) !== placeholders(spanish)) {
    console.log(`PLACEHOLDERS DIFFER  ${JSON.stringify(english)} -> ${JSON.stringify(spanish)}`);
    problems += 1;
  }
}

const files = [];
for (const folder of FOLDERS) walk(path.join(ROOT, folder), files);

// A sentence is covered when lib/i18n.ts finds it, with a number standing in
// for each value. A value that is itself words is looked up on its own at
// run time, so a number is the case the table has to cover.
const hasTranslation = loadLookup();
const hasSentence = (sentence) => hasTranslation('es', sentence.replace(/{}/g, '7'));
const has = (item) => hasSentence(typeof item === 'string' ? item : item.sentence);
const totals = {};
const missing = new Set();
const where = new Map();
for (const file of files) {
  const rel = path.relative(ROOT, file);
  const top = rel.split(path.sep)[0];
  const inScope = !scope || rel === path.normalize(scope) || rel.startsWith(path.normalize(scope) + path.sep);
  totals[top] = totals[top] || { strings: new Set(), done: new Set() };
  for (const item of wordsIn(file)) {
    const text = typeof item === 'string' ? item : item.sentence;
    totals[top].strings.add(text);
    if (has(item)) totals[top].done.add(text);
    else if (inScope) {
      missing.add(text);
      if (typeof item !== 'string' && !where.has(text)) where.set(text, `${item.at}  ${item.code}`);
    }
  }
}

if (whereAt >= 0) {
  for (const text of missing) console.log(`${text}
    ${where.get(text) ?? ''}`);
} else if (missingAt >= 0) {
  for (const text of missing) console.log(text);
} else if (jsonAt >= 0) {
  fs.writeFileSync(args[jsonAt + 1], JSON.stringify([...missing], null, 2) + '\n');
  console.log(`${missing.size} missing written to ${args[jsonAt + 1]}`);
} else {
  let all = 0;
  let done = 0;
  for (const [top, { strings, done: covered }] of Object.entries(totals)) {
    all += strings.size;
    done += covered.size;
    console.log(`${top.padEnd(11)} ${String(covered.size).padStart(6)} of ${String(strings.size).padStart(6)} distinct pieces in Spanish`);
  }
  console.log(`${'all'.padEnd(11)} ${String(done).padStart(6)} of ${String(all).padStart(6)}; ${Object.keys(table).length} entries in the table`);
}
if (problems > 0) {
  console.log(`\n${problems} problem(s) in the Spanish table.`);
  process.exit(1);
}
