// Checks lib/spokenAppointment.ts (step 5 of the voice order, 1.0.66.23): an
// appointment said in one sentence, read into the form's boxes. Nothing is
// guessed: no clock time leaves the time empty, no type word leaves the type,
// and a name is swapped for an earlier one only when exactly one fits. Pure,
// so it runs here rather than on a phone. Exits non-zero on any failure.

// eslint-config-expo lints this repo as app code, which has no __dirname.
/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(relPath, stubs = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    if (name in stubs) return stubs[name];
    throw new Error(`${relPath} must stay free of runtime imports (${name})`);
  });
  return module.exports;
}

const plainDate = load('lib/plainDate.ts');
const repeatRule = load('lib/repeatRule.ts');
const planSentence = load('lib/planSentence.ts', { './plainDate': plainDate, './repeatRule': repeatRule });
const spokenCommand = load('lib/spokenCommand.ts', { './plainDate': plainDate, './repeatRule': {} });
const s = load('lib/spokenAppointment.ts', { './planSentence': planSentence, './spokenCommand': spokenCommand });

let failures = 0;
let total = 0;
function check(name, actual, expected) {
  total += 1;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures += 1;
    console.log(`FAIL  ${name}\n      expected ${e}\n      got      ${a}`);
  }
}

// Saturday 10 October 2026, ten in the morning.
const now = new Date(2026, 9, 10, 10, 0);
const vocab = {
  providers: ['Dr. Ana Lopez', 'Dr. Mark Chen', 'Dr. Mary Chen'],
  places: ['Main Street Clinic', 'Quest Lab, Avenida Mexico'],
};
const pick = (r) => r && { title: r.title, type: r.appointmentType, date: r.date, time: r.time, who: r.providerName, where: r.location, minutes: r.minutes };

let r = s.readSpokenAppointment('Dentist with Dr. Lopez next Tuesday at 3:30 pm at the Main Street clinic for 45 minutes', now, vocab);
check('full sentence', pick(r), { title: 'Dentist', type: 'doctor', date: '2026-10-13', time: '15:30', who: 'Dr. Ana Lopez', where: 'Main Street Clinic', minutes: 45 });
check('full sentence: nothing left over', r.unsettled, []);

r = s.readSpokenAppointment('blood work at Quest Lab on Monday at 8 am', now, vocab);
check('lab, known place', pick(r), { title: 'Blood work', type: 'lab_draw', date: '2026-10-12', time: '08:00', who: null, where: 'Quest Lab, Avenida Mexico', minutes: null });

r = s.readSpokenAppointment('endocrinologist Thursday', now, vocab);
check('day without time leaves time empty', [r.date, r.time, r.appointmentType], ['2026-10-15', null, 'doctor']);
check('and says so', r.unsettled.some((line) => /No clock time/.test(line)), true);

r = s.readSpokenAppointment('dietitian Tuesday morning', now, vocab);
check('morning is not a clock time', [r.type, r.appointmentType, r.time, r.date], [undefined, 'nutritionist', null, '2026-10-13']);
check('morning said so', r.unsettled.some((line) => /“morning” is not a clock time/.test(line)), true);

r = s.readSpokenAppointment('checkup with Dr. Chen tomorrow at 11', now, vocab);
check('two Chens: kept as said', [r.providerName, r.time, r.date], ['Dr. Chen', '11:00', '2026-10-11']);
check('two Chens: said why', r.unsettled.some((line) => /all fit/.test(line)), true);

r = s.readSpokenAppointment('session with my trainer Friday at 6 pm for an hour and a half', now, vocab);
check('trainer', [r.appointmentType, r.providerName, r.time, r.minutes], ['trainer', 'My trainer', '18:00', 90]);

r = s.readSpokenAppointment('haircut', now, vocab);
check('no day, no type', [r.title, r.date, r.time, r.appointmentType], ['Haircut', null, null, null]);
check('both said', [r.unsettled.some((l) => /No day/.test(l)), r.unsettled.some((l) => /type was left/.test(l))], [true, true]);

r = s.readSpokenAppointment('physio every Wednesday at 4', now, vocab);
check('repeat: first visit only', [r.date, r.time], ['2026-10-14', '16:00']);
check('repeat: said', r.unsettled.some((l) => /one visit at a time/.test(l)), true);

r = s.readSpokenAppointment('Dr. Lopez at 10 am', now, vocab);
check('time today without at-place', [r.time, r.location, r.appointmentType], ['10:00', null, 'doctor']);

check('blank', s.readSpokenAppointment('   ', now, vocab), null);

const m = s.matchKnownName('lopez', vocab.providers);
check('match one', m, { name: 'Dr. Ana Lopez' });
check('match none', s.matchKnownName('Smith', vocab.providers), null);

console.log(`${total - failures} of ${total} passed`);
if (failures) process.exit(1);
