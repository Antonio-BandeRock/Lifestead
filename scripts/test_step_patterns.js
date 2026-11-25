// Checks Break it into small steps (Q61): which lists a task's words bring
// up, what there is to start from, and the words of every step.
//
// Run with: node scripts/test_step_patterns.js
// Exits non-zero on any failure.

/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const read = (relPath) => fs.readFileSync(path.join(ROOT, relPath), 'utf8');

function load(relPath) {
  const { outputText } = ts.transpileModule(read(relPath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    throw new Error(`${relPath} must stay free of imports (asked for ${name})`);
  });
  return module.exports;
}

const P = load('lib/stepPatterns.ts');
const { cleanStepText } = load('lib/todoExtras.ts');

let failures = 0;
let checks = 0;
function check(label, actual, wanted) {
  checks += 1;
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    failures += 1;
    console.log(`FAIL ${label}: got ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`);
  }
}
const ids = (title) => P.patternsFor(title).map((pattern) => pattern.id);

// --- 1. A task brings up the lists its words are in ---------------------------
check('clean the bedroom', ids('Clean the bedroom')[0], 'cleanRoom');
check('clean the kitchen offers the kitchen', ids('Clean the kitchen').includes('kitchen'), true);
check('call the bank', ids('Call the bank'), ['phoneCall']);
check('Spanish, with accents', ids('Limpiar el baño'), ['cleanRoom']);
check('Spanish, capitals', ids('EMPACAR LA MALETA'), ['packing']);
check('nothing matches', ids('Xylophone'), []);
check('no words', ids('  '), []);
check('part of a word does not match', ids('Recall the booklet'), []);
check('three at most', ids('clean laundry call email bill pack').length, 3);

// --- 2. What there is to start from -------------------------------------------
const tr = (english, values) => english.replace(/\{(\w+)\}/g, (_, key) => String(values?.[key] ?? ''));
const sources = P.stepSources(
  [
    { id: 'r1', name: 'Sunday reset', steps: [{ text: 'Strip the bed' }] },
    { id: 'r2', name: 'Empty', steps: [] },
  ],
  [
    { id: 'this', title: 'The task itself', steps: ['a'] },
    { id: 'old', title: 'Taxes 2025', steps: ['Find the folder'] },
    { id: 'bare', title: 'No steps', steps: [] },
  ],
  'this',
  tr,
);
check('every list is there', sources.filter((s) => s.id.startsWith('list:')).length, P.STEP_PATTERNS.length);
check('a routine with steps', sources.find((s) => s.id === 'routine:r1'), { id: 'routine:r1', label: 'Routine: Sunday reset', steps: ['Strip the bed'] });
check('a routine with none is left out', sources.some((s) => s.id === 'routine:r2'), false);
check('an earlier task', sources.find((s) => s.id === 'task:old'), { id: 'task:old', label: 'Earlier task: Taxes 2025', steps: ['Find the folder'] });
check('never the task being broken down', sources.some((s) => s.id === 'task:this'), false);
check('a task with no steps is left out', sources.some((s) => s.id === 'task:bare'), false);

// --- 3. The lists themselves --------------------------------------------------
check('ids are each used once', new Set(P.STEP_PATTERNS.map((p) => p.id)).size, P.STEP_PATTERNS.length);
check('labels are each used once', new Set(P.STEP_PATTERNS.map((p) => p.label)).size, P.STEP_PATTERNS.length);
const forbidden = /[—–]| -- |\breal\b|\bgenuine|\bown\b|\bjust\b|well done|good job|should|must|%|simply|easy|\bmedications?\b|\bdoses?\b/i;
for (const pattern of P.STEP_PATTERNS) {
  check(`${pattern.id} has enough steps and not too many`, pattern.steps.length >= 4 && pattern.steps.length <= 10, true);
  for (const word of pattern.words) check(`${pattern.id} "${word}" is matchable`, P.wordsOf(word), [word]);
  for (const text of [pattern.label, ...pattern.steps]) {
    check(`"${text}" has no pressure, praise, dashes or filler`, forbidden.test(text), false);
    check(`"${text}" is kept whole`, cleanStepText(text), text);
    check(`"${text}" ends plainly`, /[.!]$/.test(text), false);
  }
}

// --- 4. Nothing leaves the phone, and nothing is saved before it is asked for --
const screen = read('components/BreakIntoSteps.tsx');
check('no network', /fetch\(|https?:/.test(screen + read('lib/stepPatterns.ts')), false);
check('one place saves', screen.split('addTodoSteps(').length - 1, 1);

console.log(`${checks} checks, ${failures} failures`);
process.exit(failures ? 1 : 0);
