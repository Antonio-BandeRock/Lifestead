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
  '{count} could not be opened. {why}': 'No se pudieron abrir {count}. {why}',
  '"{name}" will be removed for good.': '"{name}" se quitará para siempre.',
  '{spent} of {limit}': '{spent} de {limit}',
  'Started {date}': 'Empezó el {date}',
  '{hour}:{value} AM': '{hour}:{value} a. m.',
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

const { readingKey } = load('lib/readingKey.ts', {});
const searchLanguage = load('lib/digest/searchLanguage.ts', {});
const READING_EN = 'Selenium lowers thyroid antibodies in several trials.';

const { t, translateIn, translateChildren, hasTranslation } = load('lib/i18n.ts', {
  './language': { getLanguage: () => language },
  './readingKey': { readingKey },
  './digest/searchLanguage': searchLanguage,
  './translations/esDates': load('lib/translations/esDates.ts', {}),
  './translations/es': { ES: TABLE, ES_FOODS: { Apple: 'Manzana', raw: 'cruda', 'with skin': 'con cáscara' }, ES_READING: { [readingKey(READING_EN)]: 'El selenio baja los anticuerpos tiroideos en varios ensayos.' } },
  react: require('react'),
});

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : ` (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`}`);
}

check('the reading is found by its fingerprint', translateIn('es', READING_EN), 'El selenio baja los anticuerpos tiroideos en varios ensayos.');
check('a fingerprint is the same every time', readingKey(READING_EN), readingKey(String(READING_EN)));
check('changed English no longer matches its old reading', readingKey(READING_EN) === readingKey(`${READING_EN} `), false);
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
check('two values', translateIn('es', 'From May 3 to May 9'), 'Del 3 may al 9 may');
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
check('a value at both ends', translateIn('es', '3 could not be opened. Save'), 'No se pudieron abrir 3. Guardar');
check('a value glued to its first mark', translateIn('es', '"Basil" will be removed for good.'), '"Basil" se quitará para siempre.');
check('a short loose pattern never turns a word inside a sentence', translateIn('es', 'Meds as of noon'), 'Meds as of noon');
check('a short date', translateIn('es', 'Oct 26'), '26 oct');
check('a long date with its year', translateIn('es', 'October 26, 2026'), '26 de octubre de 2026');
check('a weekday and a date', translateIn('es', 'Mon 26 Oct'), 'Lun 26 oct');
check('a month and year', translateIn('es', 'October 2026'), 'Octubre de 2026');
check('a date inside a sentence', translateIn('es', 'Started Oct 3'), 'Empezó el 3 oct');
check('a date with a time', translateIn('es', 'Oct 26, 7:45 AM'), '26 oct, 7:45 a. m.');
check('one full stop after a time', translateIn('es', '7:45 AM.'), '7:45 a. m.');
check('a price keeps its dollar sign', translateIn('es', 'Started $$5'), 'Empezó el $$5');
language = 'en';
check('t in English fills values', t('{count} meals', { count: 1 }), '1 meals');

// The real table: every entry has words, and its {name}s match the English.
const parts = load('lib/translations/es/index.ts', new Proxy({}, {
  has: () => true,
  get: (_, name) => load(`lib/translations/es/${name.replace('./', '')}.ts`, {}),
}));
const { ES, ES_READING } = load('lib/translations/es.ts', { './es/index': parts });
let badReading = 0;
for (const spanish of Object.values(ES_READING)) {
  if (!spanish.trim() || /[–—]| -- /.test(spanish)) {
    badReading += 1;
    console.log(`FAIL reading entry ${JSON.stringify(spanish.slice(0, 80))}`);
  }
}
check(`the Spanish reading's ${Object.keys(ES_READING).length} entries are well formed`, badReading, 0);
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

// Search Reading reads the words on screen as well as the English beneath.
language = 'es';
const searching = searchLanguage.readingTranslator();
check('the search is handed the language', searching && searching.language(), 'es');
check('the search finds a translated piece of the reading', searching && searching.translate(READING_EN), 'El selenio baja los anticuerpos tiroideos en varios ensayos.');
check('the search is told when nothing is written yet', searching && searching.translate('Plant a seed'), undefined);
language = 'en';
check('in English the search adds nothing', searching && searching.translate(READING_EN), undefined);
language = 'es';

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
