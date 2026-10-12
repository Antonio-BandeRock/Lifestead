// Checks lib/firstWeek.ts (P1 of the competitive build plan, 1.0.68.5): days
// are counted by the local calendar from the first day, a line appears only
// on days one, two and seven, every line goes somewhere that exists, and no
// line counts, praises or blames. Exits non-zero on any failure.

// eslint-config-expo lints this repo as app code, which has no __dirname.
/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(relPath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    throw new Error(`${relPath} must stay free of runtime imports (${name})`);
  });
  return module.exports;
}

const f = load('lib/firstWeek.ts');

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

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0, 0).getTime();

check('stamp of a local day', f.localDayStamp(at(2026, 3, 5, 23)), '2026-03-05');
check('first day is day 1', f.firstWeekDay('2026-10-12', at(2026, 10, 12, 0)), 1);
check('late evening still day 1', f.firstWeekDay('2026-10-12', at(2026, 10, 12, 23)), 1);
check('next morning is day 2', f.firstWeekDay('2026-10-12', at(2026, 10, 13, 1)), 2);
check('a week on is day 7', f.firstWeekDay('2026-10-12', at(2026, 10, 18)), 7);
check('across a month end', f.firstWeekDay('2026-10-30', at(2026, 11, 5)), 7);
check('across a clock change', f.firstWeekDay('2026-03-05', at(2026, 3, 11)), 7);
check('future first day', f.firstWeekDay('2026-10-13', at(2026, 10, 12)), null);
check('missing first day', f.firstWeekDay(null, at(2026, 10, 12)), null);
check('malformed first day', f.firstWeekDay('12/10/2026', at(2026, 10, 12)), null);
check('round trip', f.firstWeekDay(f.localDayStamp(at(2026, 6, 1)), at(2026, 6, 1)), 1);

const shown = [];
for (let day = 0; day <= 30; day += 1) if (f.firstWeekLine(day)) shown.push(day);
check('lines only on days 1, 2 and 7', shown, [1, 2, 7]);
check('no line without a day', f.firstWeekLine(null), null);

const routes = { '/capture': 'app/capture.tsx', '/life': 'app/(tabs)/life.tsx', '/your-story': 'app/your-story.tsx' };
const forbidden = /\b(great|well done|good job|congrat|keep it up|streak|you missed|forgot|behind|\d+ (of|out of)|percent|%)\b/i;
for (const day of [1, 2, 7]) {
  const line = f.firstWeekLine(day);
  const file = routes[line.pathname];
  check(`day ${day} route is known`, !!file, true);
  if (file) check(`day ${day} route exists`, fs.existsSync(path.join(__dirname, '..', file)), true);
  check(`day ${day} has no praise, blame or count`, forbidden.test(line.sentence + ' ' + line.action), false);
  check(`day ${day} has no dash as punctuation`, /[–—]| -- /.test(line.sentence), false);
}
const life = fs.readFileSync(path.join(__dirname, '..', 'app/(tabs)/life.tsx'), 'utf8');
check('routines is a Life lens key', /key: 'routines'/.test(life) || /'routines'/.test(life), true);

console.log(`${total - failures} of ${total} checks passed`);
process.exit(failures ? 1 : 0);
