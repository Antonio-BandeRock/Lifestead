// Checks lib/i18n.ts, which hands the app's words through a language's
// table (2026-10-26): a missing entry shows the English, a Text's children
// are matched whole or piece by piece, the spaces round a piece survive,
// and t() fills {name} after translating. Exits non-zero on any failure.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const TABLE = {
  Save: 'Guardar',
  'Save Now': 'Guardar ahora',
  '{count} meals': '{count} comidas',
  Home: 'Inicio',
  'Logged {count} meals': '{count} comidas registradas',
  '{name} is due': 'Toca {name}',
  'Your dose': 'Tu dosis',
  'Tap <0>Save</0> to keep it.': 'Toca <0>Guardar</0> para conservarlo.',
  'Add a note': 'Agrega una nota',
  'From {start} to {end}': 'Del {start} al {end}',
};
let language = 'es';

function load(relPath, stubs) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    if (name in stubs) return stubs[name];
    throw new Error(`unexpected import ${name}`);
  });
  return module.exports;
}

const { t, translateIn, translateChildren, hasTranslation } = load('lib/i18n.ts', {
  './language': { getLanguage: () => language },
  './translations/es': { ES: TABLE, ES_FOODS: { Apple: 'Manzana', raw: 'cruda', 'with skin': 'con cáscara' } },
  react: require('react'),
});

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : ` (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`}`);
}

check('a word in the table', translateIn('es', 'Save'), 'Guardar');
check('a word not in the table stays English', translateIn('es', 'Plant a seed'), 'Plant a seed');
check('English is never looked up', translateIn('en', 'Save'), 'Save');
check('the spaces round a piece survive', translateIn('es', ' Save '), ' Guardar ');
check('t fills a value after translating', t('{count} meals', { count: 3 }), '3 comidas');
check('t leaves an unknown name as written', t('{count} meals', {}), '{count} comidas');
check('a string child', translateChildren('Home', 'es'), 'Inicio');
check('strings split by JSX are matched whole', translateChildren(['Save', ' ', 'Now'], 'es'), 'Guardar ahora');
const icon = { type: 'Icon' };
check('pieces beside an element are matched one by one', translateChildren([icon, ' Save'], 'es'), [icon, ' Guardar']);
const untouched = [icon, 'Plant'];
check('nothing to translate hands back the same children', translateChildren(untouched, 'es') === untouched, true);
check('English children are handed back as they are', translateChildren('Save', 'en'), 'Save');
check('a number child is left alone', translateChildren(42, 'es'), 42);
check('a pattern with a number', translateIn('es', 'Logged 3 meals'), '3 comidas registradas');
check('a pattern built in JSX pieces', translateChildren(['Logged ', 3, ' meals'], 'es'), '3 comidas registradas');
check('a value inside a pattern is looked up too', translateIn('es', 'Your dose is due'), 'Toca Tu dosis');
check('a value nobody translated stays as typed', translateIn('es', 'Levothyroxine is due'), 'Toca Levothyroxine');
check('two values', translateIn('es', 'From May 3 to May 9'), 'Del May 3 al May 9');
check('a trailing colon is put back', translateIn('es', 'Add a note:'), 'Agrega una nota:');
check('lines are looked up one by one', translateIn('es', 'Save\nHome'), 'Guardar\nInicio');
check('pieces round a middle dot', translateIn('es', 'Home · Logged 2 meals'), 'Inicio · 2 comidas registradas');
check('sentences are looked up one by one', translateIn('es', 'Add a note. Save Now. Plant it.'), 'Agrega una nota. Guardar ahora. Plant it.');
const React = require('react');
const bold = React.createElement('Bold', null, 'Save');
const rebuilt = translateChildren(['Tap ', bold, ' to keep it.'], 'es');
check('a nested Text is moved with its sentence', [rebuilt[0], rebuilt[1].props.children, rebuilt[2]], ['Toca ', 'Guardar', ' para conservarlo.']);
check('a food name by its parts', translateIn('es', 'Apple, raw, with skin'), 'Manzana, cruda, con cáscara');
check('a food name with a part nobody translated stays English', translateIn('es', 'Apple, dried'), 'Apple, dried');
check('hasTranslation knows a missing entry', hasTranslation('es', 'Plant a seed'), false);
language = 'en';
check('t in English fills values', t('{count} meals', { count: 1 }), '1 meals');

// The real table: every entry has words, and its {name}s match the English.
const parts = load('lib/translations/es/index.ts', new Proxy({}, {
  has: () => true,
  get: (_, name) => load(`lib/translations/es/${name.replace('./', '')}.ts`, {}),
}));
const { ES } = load('lib/translations/es.ts', { './es/index': parts });
const names = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(',');
let bad = 0;
for (const [english, spanish] of Object.entries(ES)) {
  if (!spanish.trim() || names(english) !== names(spanish)) {
    bad += 1;
    console.log(`FAIL table entry ${JSON.stringify(english)}`);
  }
  if (/[–—]| -- /.test(spanish)) {
    bad += 1;
    console.log(`FAIL a dash in place of punctuation: ${JSON.stringify(spanish)}`);
  }
}
check(`the Spanish table's ${Object.keys(ES).length} entries are well formed`, bad, 0);

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
