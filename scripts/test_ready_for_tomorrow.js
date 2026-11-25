// Checks Ready for Tomorrow (Q60): what has to be started tonight and what
// does not, the start-ahead times of the person's, what tomorrow lists, what
// a closed vault keeps off it, and what the evening reminder says.
//
// Run with: node scripts/test_ready_for_tomorrow.js
// Exits non-zero on any failure.

/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const read = (relPath) => fs.readFileSync(path.join(ROOT, relPath), 'utf8');

const PURE = {
  './dayTimeline': 'lib/dayTimeline.ts',
  './recipePrep': 'lib/recipePrep.ts',
};
const loaded = new Map();
function load(relPath) {
  if (loaded.has(relPath)) return loaded.get(relPath);
  const { outputText } = ts.transpileModule(read(relPath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    if (!PURE[name]) throw new Error(`${relPath} must stay free of other imports (asked for ${name})`);
    return load(PURE[name]);
  });
  loaded.set(relPath, module.exports);
  return module.exports;
}

const R = load('lib/readyForTomorrow.ts');
const PREP = load('lib/recipePrep.ts');

let failures = 0;
let checks = 0;
function check(label, actual, wanted) {
  checks += 1;
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    failures += 1;
    console.log(`FAIL ${label}: got ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`);
  }
}
const tr = (english, values) => english.replace(/\{(\w+)\}/g, (_, key) => String(values?.[key] ?? ''));
const at = (day, hour, minute = 0) => new Date(2026, 10, day, hour, minute).getTime();
const now = at(24, 18);
const meal = (id, when, name, recipeId = null) => ({ scheduleItemId: id, at: when, title: name, dishes: [{ name, recipeId }] });
const lead = (name, hours, kind = 'soak') => ({ key: R.dishKey(name), name, kind, hours });
const plan = (meals, own = [], marks = {}, when = now) => R.planPrep(meals, own, new Map(Object.entries(marks)), when);
const names = (lines) => lines.map((line) => line.dish);

// --- 1. Which starts are tonight's --------------------------------------------
check('12 hours before lunch is tonight', names(plan([meal('m', at(25, 12), 'Beans')], [lead('beans', 12)]).tonight), ['Beans']);
check('4 hours before dinner is tomorrow', names(plan([meal('m', at(25, 18), 'Beans')], [lead('Beans', 4)]).tomorrow), ['Beans']);
check('a start before 8 in the morning is tonight', names(plan([meal('m', at(25, 10), 'Beans')], [lead('Beans', 3)]).tonight), ['Beans']);
check('a start at 8 is tomorrow', names(plan([meal('m', at(25, 11), 'Beans')], [lead('Beans', 3)]).tomorrow), ['Beans']);
check('days ahead waits its turn', plan([meal('m', at(29, 12), 'Beans')], [lead('Beans', 24)]), { tonight: [], tomorrow: [] });
check('days ahead with a long lead is tonight', names(plan([meal('m', at(27, 20), 'Kraut')], [lead('Kraut', 72)]).tonight), ['Kraut']);
check('no lead, nothing', plan([meal('m', at(25, 12), 'Toast')]), { tonight: [], tomorrow: [] });
check('a meal already past', plan([meal('m', at(24, 12), 'Beans')], [lead('Beans', 12)]).tonight, []);
check('a meal tonight too late to start', plan([meal('m', at(24, 20), 'Beans')], [lead('Beans', 12)]).tonight, []);
check('a meal tonight still in time', names(plan([meal('m', at(24, 22), 'Beans')], [lead('Beans', 2)]).tonight), ['Beans']);
check('a dish twice in one meal shows once', plan([{ scheduleItemId: 'm', at: at(25, 12), title: 'x', dishes: [{ name: 'Beans', recipeId: null }, { name: ' beans ', recipeId: null }] }], [lead('Beans', 12)]).tonight.length, 1);

// --- 2. How it is timed -------------------------------------------------------
const timing = (hours, hour) => plan([meal('m', at(25, hour), 'Beans')], [lead('Beans', hours)]).tonight[0].timing;
check('there is time', timing(12, 12), 'ahead');
check('best started earlier today', timing(24, 12), 'today');
check('needed longer than is left', timing(40, 12), 'short');
const detail = (hours, hour) => R.prepDetail(plan([meal('m', at(25, hour), 'Beans')], [lead('Beans', hours)]).tonight[0], now, tr);
for (const [hours, hour] of [[12, 12], [24, 12], [40, 12]]) {
  check(`${hours} hours never says late or behind`, /\blate\b|behind|missed|forgot|should/i.test(detail(hours, hour)), false);
}

// --- 3. Start-ahead times of the person's -------------------------------------
const table = PREP.PREP_TABLE.find(([, hours]) => hours === 12);
const recipe = table[2][0];
check('a recipe in the table', names(plan([meal('m', at(25, 12), 'Dish', recipe)]).tonight), ['Dish']);
check('the person’s time is used in its place', names(plan([meal('m', at(25, 18), 'Dish', recipe)], [lead('dish', 4)]).tomorrow), ['Dish']);
check('0 means nothing to start', plan([meal('m', at(25, 12), 'Dish', recipe)], [lead('dish', 0)]).tonight, []);
check('no name', R.ownLeadProblem('  ', '3', tr), 'Pick or type the dish first.');
check('no hours', R.ownLeadProblem('a', '', tr), 'Type how many hours ahead it has to be started, or 0 when it does not.');
check('words for hours', R.ownLeadProblem('a', 'soon', tr) === null, false);
check('too long', R.ownLeadProblem('a', '1441', tr), 'The longest is 1440 hours, which is 60 days.');
check('0 is fine', R.ownLeadProblem('a', '0', tr), null);
check('a comma for a point', R.hoursFrom('1,5'), 1.5);

// --- 4. A batch dish is started once ------------------------------------------
const kraut = [meal('a', at(27, 20), 'Kraut'), meal('b', at(28, 20), 'Kraut')];
check('only the first of a batch', plan(kraut, [lead('Kraut', 72)], {}, at(25, 18)).tonight.map((l) => l.key), ['a|kraut']);

// --- 5. Marked done -----------------------------------------------------------
const beans = [meal('m', at(25, 12), 'Beans')];
const key = R.markKey('m', 'Beans');
check('marked stays, done', plan(beans, [lead('Beans', 12)], { [key]: new Date(now).toISOString() }).tonight[0].done, true);
check('marks travel through a notification', R.splitMarkKeys(R.joinMarkKeys([key, 'n|rice, red'])), [key, 'n|rice, red']);
check('a date is not a mark', R.splitMarkKeys('2026-11-24'), []);

// --- 6. Tomorrow --------------------------------------------------------------
const item = (id, kind, title, when, more = {}) => ({ id, kind, title, caption: null, start: when, end: null, day: more.day ?? '2026-11-25', allDay: false, status: 'planned', route: { pathname: '/schedule' }, ...more });
const items = [
  item('schedule:d', 'dose', 'Levothyroxine', at(25, 7)),
  item('schedule:v', 'appointment', 'Dentist', at(25, 15)),
  item('due:b', 'due', 'Water bill', at(25, 0), { allDay: true }),
  item('schedule:x', 'meal', 'Skipped lunch', at(25, 12), { status: 'skipped' }),
  item('schedule:t', 'meal', 'Today', at(24, 20), { day: '2026-11-24' }),
];
const extras = { doseLines: new Map([['d', 'Breakfast carries iron']]), appointmentNotes: new Map([['v', 'Bring the card']]) };
const lines = R.tomorrowLines(items, now, extras);
check('any time first, then the clock', lines.map((l) => l.title), ['Water bill', 'Levothyroxine', 'Dentist']);
check('what to bring', lines[2].notes, ['Bring the card']);
check('the dose’s food line', lines[1].notes, ['Breakfast carries iron']);
check('a closed vault keeps doses off', R.tomorrowLines(items, now, extras, ['medications']).map((l) => l.kind), ['due', 'appointment']);
check('a closed vault keeps appointments off', R.tomorrowLines(items, now, extras, ['appointments']).map((l) => l.kind), ['due', 'dose']);

// --- 7. The reminder ----------------------------------------------------------
const said = R.readyReminder(plan(beans, [lead('Beans', 12)]).tonight, lines, tr);
check('says the start and what is due', [said.body.startsWith('Start the soaking for Beans.'), said.body.includes('Water bill'), said.body.includes('Dentist')], [true, true, true]);
check('never names a dose', said.body.includes('Levothyroxine'), false);
check('quiet with nothing', R.readyReminder([], [], tr), null);
check('quiet once marked', R.readyReminder(plan(beans, [lead('Beans', 12)], { [key]: new Date(now).toISOString() }).tonight, [], tr), null);
check('quiet with only a dose', R.readyReminder([], lines.filter((l) => l.kind === 'dose'), tr), null);

// --- 8. The evening time ------------------------------------------------------
check('before six', R.isReadyTime(new Date(2026, 10, 24, 17, 59), '18:00'), false);
check('at six', R.isReadyTime(new Date(2026, 10, 24, 18, 0), '18:00'), true);

// --- 9. The table -------------------------------------------------------------
const seen = new Set();
for (const [kind, hours, ids] of PREP.PREP_TABLE) {
  check(`${kind} ${hours} is in range`, hours > 0 && hours <= R.MAX_PREP_HOURS, true);
  check(`${kind} has a sentence`, typeof PREP.PREP_SENTENCES[kind], 'string');
  for (const id of ids) {
    check(`${id} is listed once`, seen.has(id), false);
    seen.add(id);
  }
}
const forbidden = /[—–]| -- |\breal\b|\bgenuine|\bown\b|should|late\b|behind/i;
for (const text of [...Object.values(PREP.PREP_SENTENCES), ...Object.values(PREP.PREP_KIND_LABELS)]) check(`"${text}" reads plainly`, forbidden.test(text), false);

console.log(`${checks} checks, ${failures} failures`);
process.exit(failures ? 1 : 0);
