// What a screen reader says for a chart (lib/chartWords.ts) and a button
// (lib/spokenControl.ts). Build plan Q10 and Q35, 2026-11-24.
/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(file, fakes = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const out = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exported = {};
  new Function('exports', 'require', out)(exported, (name) => fakes[name]);
  return exported;
}
const t = (english, values = {}) => english.replace(/\{(\w+)\}/g, (w, k) => (k in values ? String(values[k]) : w));
const words = load('lib/chartWords.ts', { './i18n': { t } });
const spoken = load('lib/spokenControl.ts');

let failed = 0;
function check(name, got, want) {
  const a = JSON.stringify(got);
  const b = JSON.stringify(want);
  if (a === b) return;
  failed++;
  console.log(`FAIL ${name}\n  got  ${a}\n  want ${b}`);
}
const has = (name, text, part, yes = true) => check(`${name}: ${part}`, text.includes(part), yes);

const say = (v) => String(v);
const base = { say, bucket: 'day', breakGapDays: null };
const p = (date, value) => ({ date, value });
check('empty', words.trendChartWords({ ...base, points: [] }), 'Nothing recorded to chart.');
check('one', words.trendChartWords({ ...base, points: [p('2026-03-04', 5)] }), 'Chart of one point: 5 on Mar 4.');
const gapped = words.trendChartWords({ ...base, points: [p('2026-03-01', 5), p('2026-03-02', 7), p('2026-03-03', 2), p('2026-03-09', 4)] });
has('gap', gapped, 'Line chart of 4 points.');
has('gap', gapped, 'The lowest is 2, on Mar 3.');
has('gap', gapped, 'The highest is 7, on Mar 2.');
has('gap', gapped, 'Nothing recorded between Mar 3 and Mar 9.');
check('a gap is never a zero', /\b0\b/.test(gapped), false);
const weekly = words.trendChartWords({ ...base, bucket: 'week', points: [p('2026-03-01', 1), p('2026-03-08', 1), p('2026-03-15', 1)] });
has('weekly', weekly, '3 weekly averages');
has('weekly', weekly, 'Every point is 1.');
has('weekly has no gaps', weekly, 'Nothing recorded', false);
has('two years say the year', words.trendChartWords({ ...base, points: [p('2025-12-31', 1), p('2026-01-01', 2)] }), 'Dec 31, 2025');
const many = [1, 2, 3].map((n) => p(`2026-03-0${n}`, 1)).concat([9, 15, 21, 27].map((n) => p(`2026-03-${String(n).padStart(2, '0')}`, 1)));
has('more gaps counted', words.trendChartWords({ ...base, breakGapDays: 1, points: many }), 'Other stretches with nothing recorded: 1.');

check('day empty', words.dayArcWords([]), 'Nothing is on your day.');
check('day', words.dayArcWords([{ title: 'Lunch', time: '12:00 PM', state: 'done' }, { title: 'Dose', time: '1:00 PM', state: 'late' }]),
  '2 things are on your day. Lunch at 12:00 PM, logged. Dose at 1:00 PM, time passed and not logged.');
check('dimensions', words.dimensionChartWords([{ dimension: 'D1', severity: 'green' }, { dimension: 'D2', severity: 'unknown' }]), 'Dimension chart. D1: Green. D2: Not assessed.');
check('ring', words.ringWords({ label: 'Iron', percent: 41.6, supplementPercent: 10 }), 'Iron: 42%. 10% came from a supplement.');

// No sentence says what a reading should be.
for (const banned of ['too low', 'too high', 'ideal', 'optimal', 'normal', 'should']) {
  has('no verdicts', fs.readFileSync(path.join(__dirname, '../lib/chartWords.ts'), 'utf8').split('\n').filter((l) => /t\('/.test(l)).join('\n'), banned, false);
}

const el = (props) => ({ props });
const press = () => {};
const word = el({ children: 'Meals' });
const c = (props) => spoken.spokenControl({ onPress: press, ...props }, '#0ff');
check('plain', c({ children: word }), { role: 'button', state: {} });
check('open fold', c({ children: [word, el({ name: 'chevron-up' })] }), { role: 'button', state: { expanded: true } });
check('closed fold', c({ children: [word, el({ name: 'chevron-down' })] }), { role: 'button', state: { expanded: false } });
check('an arrow alone is not a fold', c({ children: el({ name: 'chevron-down' }) }), { role: 'button', state: {} });
check('ticked', c({ children: [el({ name: 'checkbox' }), word] }), { role: 'checkbox', state: { checked: true } });
check('not ticked', c({ children: [el({ name: 'square-outline' }), word] }), { role: 'checkbox', state: { checked: false } });
check('chosen pill', c({ style: [{ borderRadius: 999 }, { backgroundColor: '#0ff' }], children: word }), { role: 'button', state: { selected: true } });
check('pill not chosen', c({ style: [{ borderRadius: 999, backgroundColor: '#000' }, false], children: word }), { role: 'button', state: {} });
check('a state the screen gave wins', c({ accessibilityState: { expanded: false }, children: [word, el({ name: 'chevron-up' })] }), { role: 'button', state: {} });
check("an inner button's icon stays its own", c({ children: [word, el({ onPress: press, children: el({ name: 'checkbox' }) })] }), { role: 'button', state: {} });
check('backdrop', spoken.isSpokenButton({ onPress: press, accessible: false }), false);

if (failed) {
  console.log(`${failed} failed`);
  process.exit(1);
}
console.log('All screen reader wording checks passed');
