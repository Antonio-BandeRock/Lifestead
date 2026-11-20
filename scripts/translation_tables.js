// Reads a language's words for the scripts (2026-11-20).
//
// Since 1.0.95.1 the words live outside the app code, as data files under
// assets/translations/<language>/ (part-NNN.words for the app's words,
// foods-NNN.words for the parts of food names, reading-NNN.words for the
// reading, keyed by lib/readingKey.ts's fingerprint). Each file is a JSON
// object, one entry per line. The phone reads them through
// lib/translationLoad.ts; an update downloads only the files that changed.
// The entries written by hand stay in code (lib/translations/es.ts) and win
// over a file.
//
// A new language is a folder of its own beside es/, a table of hand-written
// entries, a dates file and one line in lib/translations/languages.ts;
// scripts/i18n_batch.js writes its files and its list.

/* global __dirname */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORD_FILE = /^(part|foods|reading)-\d+\.words$/;

function translationDir(language) {
  return path.join(ROOT, 'assets', 'translations', language);
}

function wordFiles(language) {
  const dir = translationDir(language);
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => WORD_FILE.test(name)).sort() : [];
}

// A file edited by hand can end its last entry with a comma, which JSON
// does not allow; that one slip is forgiven here and reported by the checks.
function readWordsFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(text.replace(/,(\s*)\}\s*$/, '$1}'));
  }
}

function loadTs(file) {
  const ts = require('typescript');
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, () => ({}));
  return module.exports;
}

/** The hand-written entries in code, which win over a file. */
function byHand(language) {
  const file = path.join(ROOT, 'lib', 'translations', `${language}.ts`);
  const exported = loadTs(file);
  return exported[`${language.toUpperCase()}_BY_HAND`] ?? {};
}

/** Every table of a language, merged the way the phone merges them. */
function loadTables(language) {
  const dir = translationDir(language);
  const parts = {};
  const foods = {};
  const reading = {};
  for (const name of wordFiles(language)) {
    const into = name.startsWith('foods') ? foods : name.startsWith('reading') ? reading : parts;
    Object.assign(into, readWordsFile(path.join(dir, name)));
  }
  return { words: { ...parts, ...byHand(language) }, foods, reading };
}

module.exports = { translationDir, wordFiles, readWordsFile, loadTables, byHand, WORD_FILE };
