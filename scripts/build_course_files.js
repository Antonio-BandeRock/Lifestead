// Turns each course workbook in assets/decks/ into the JSON the app ships
// (2026-11-05). The workbooks stay out of git and out of the app; only
// assets/courses/ is carried. For each workbook it writes:
//
//   assets/courses/<deck id>.json        the whole course, loaded when it opens
//   assets/courses/<deck id>.deck.json   just the Deck sheet, for the library
//
// Reads a workbook through lib/xlsxRead.ts and lib/learnCourseFile.ts, the
// same code the in-app import uses, and stops on any problem or note.
//
//   node scripts/build_course_files.js          writes the files
//   node scripts/build_course_files.js --check  exit 1 if a file is out of date
//
// A workbook is left exactly as it is. What a course says in the app and is not
// meant to carry from its workbook goes in SHIP_DESCRIPTIONS.
/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const decksDir = path.join(root, 'assets', 'decks');
const coursesDir = path.join(root, 'assets', 'courses');
const checkOnly = process.argv.includes('--check');

function load(rel) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const m = { exports: {} };
  const dir = path.dirname(rel);
  const need = (name) => (name.startsWith('./') ? load(path.posix.join(dir, name) + '.ts') : require(name));
  new Function('module', 'exports', 'require', outputText)(m, m.exports, need);
  return m.exports;
}

// The Spanish course's workbook names the school whose lessons it follows. The
// school's name does not ship, whichever version of the app carries the course.
const SHIP_DESCRIPTIONS = {
  'es-for-en': 'One study path of 26 units: six lessons of a Spanish class plus everything needed to get by in Mexico, in the order it builds.',
};

const { readCourseBytes, courseFingerprint } = load('lib/learnCourseFile.ts');

if (!fs.existsSync(decksDir)) {
  console.log('assets/decks/ is not on this computer, so there is nothing to build.');
  process.exit(0);
}

let failed = false;
const seenIds = new Set();
for (const file of fs.readdirSync(decksDir).filter((name) => name.endsWith('.xlsx') && !name.startsWith('~$'))) {
  const read = readCourseBytes(new Uint8Array(fs.readFileSync(path.join(decksDir, file))));
  for (const line of [...read.problems, ...read.notes]) {
    console.log(`${file}: ${line}`);
    failed = true;
  }
  if (!read.course) continue;
  const course = read.course;
  if (SHIP_DESCRIPTIONS[course.deck.id]) course.deck.description = SHIP_DESCRIPTIONS[course.deck.id];
  for (const card of course.cards) {
    if (seenIds.has(card.id)) {
      console.log(`${file}: the Card ID ${card.id} is in two courses.`);
      failed = true;
    }
    seenIds.add(card.id);
  }

  const whole = `${JSON.stringify(course)}\n`;
  const deckOnly = `${JSON.stringify({ deck: course.deck, fingerprint: courseFingerprint(course) }, null, 2)}\n`;
  const outputs = [
    [path.join(coursesDir, `${course.deck.id}.json`), whole],
    [path.join(coursesDir, `${course.deck.id}.deck.json`), deckOnly],
  ];
  for (const [out, text] of outputs) {
    const same = fs.existsSync(out) && fs.readFileSync(out, 'utf8') === text;
    if (checkOnly) {
      if (!same) {
        console.log(`${path.relative(root, out)} is out of date. Run node scripts/build_course_files.js.`);
        failed = true;
      }
    } else if (!same) {
      fs.writeFileSync(out, text);
    }
  }
  console.log(`${course.deck.id}: ${course.cards.length} cards, ${course.deck.unitCount} units, ${new Set(course.cards.map((c) => c.group)).size} groups, ${Math.round(whole.length / 1024)} KB`);
}
process.exit(failed ? 1 : 0);
