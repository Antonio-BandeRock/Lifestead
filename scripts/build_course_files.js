// Turns each course workbook in assets/decks/ into the JSON the app ships
// (2026-11-05). The workbooks stay out of git and out of the app; only
// assets/courses/ is carried. For each workbook it writes:
//
//   assets/courses/<deck id>.json        the whole course, loaded when it opens
//   assets/courses/<deck id>.deck.json   just the Deck sheet, for the Languages lens
//
// Reads a workbook through lib/xlsxRead.ts and lib/learnCourseFile.ts, the
// same code scripts/test_learn_courses.js uses, and stops on any problem or note.
//
//   node scripts/build_course_files.js          writes the files
//   node scripts/build_course_files.js --check  exit 1 if a file is out of date
//
// A workbook is left exactly as it is. What a course says in the app and is not
// meant to carry from its workbook goes in SHIP_NAMES and SHIP_DESCRIPTIONS.
//
// Corrections to cards go in scripts/course-fixes/<deck id>.json (2026-11-11):
// tense names on verb cards in the learner's language, and per card a meaning
// for a Rule card's front, a Remember line with glosses, or a target. Under
// "remember", a whole Remember line maps to its glossed form on every card that
// carries it. A fix that names a Card ID the course does not have, or a label or
// Remember line that matches nothing, stops the build.
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
const SHIP_NAMES = {
  'es-for-en': 'Basic Spanish for English Speakers',
  'en-for-es': 'Basic English for Spanish Speakers',
};
const SHIP_DESCRIPTIONS = {
  'es-for-en': 'What to learn first so the rest gets easier: 26 plainly named units, in the order they should be learned, including what you need to get by in Mexico.',
  'en-for-es': 'What to learn first so the rest gets easier: 26 plainly named units of American English, in the order they should be learned. The explanations are in Spanish.',
};

const { readCourseBytes, courseFingerprint } = load('lib/learnCourseFile.ts');

if (!fs.existsSync(decksDir)) {
  console.log('assets/decks/ is not on this computer, so there is nothing to build.');
  process.exit(0);
}

/** Puts a course's fixes file over the cards read from its workbook. False when a fix is stale. */
function applyFixes(course) {
  const file = path.join(root, 'scripts', 'course-fixes', `${course.deck.id}.json`);
  if (!fs.existsSync(file)) return true;
  const fixes = JSON.parse(fs.readFileSync(file, 'utf8'));
  let ok = true;
  // A label is matched whole; {x} in it stands for any words, carried into the replacement.
  const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const labels = Object.entries(fixes.labels || {}).map(([from, to]) => ({
    name: from,
    from: new RegExp(`^${escape(from).replace('\\{x\\}', '(.+)')}$`),
    to: to.replace('{x}', '$1'),
    used: 0,
  }));
  for (const card of course.cards) {
    if (card.type !== 'Verb') continue;
    const lines = card.target.split('\n');
    const head = lines[0].split(' · ');
    if (lines.length < 2 || head.length !== 2) continue;
    const label = labels.find((each) => each.from.test(head[1]));
    if (!label) continue;
    label.used += 1;
    lines[0] = `${head[0]} · ${head[1].replace(label.from, label.to)}`;
    card.target = lines.join('\n');
  }
  for (const label of labels) {
    if (label.used === 0) {
      console.log(`${course.deck.id}: the label fix ${label.name} matches no card.`);
      ok = false;
    }
  }
  // A Remember line is matched whole and replaced on every card that carries it.
  for (const [from, to] of Object.entries(fixes.remember || {})) {
    let used = 0;
    for (const card of course.cards) {
      if (card.remember !== from) continue;
      card.remember = to;
      used += 1;
    }
    if (used === 0 || from === to) {
      console.log(`${course.deck.id}: the Remember fix "${from.slice(0, 60)}" ${used === 0 ? 'matches no card' : 'changes nothing'}.`);
      ok = false;
    }
  }
  const byId = new Map(course.cards.map((card) => [card.id, card]));
  for (const [id, fix] of Object.entries(fixes.cards || {})) {
    const card = byId.get(id);
    if (!card) {
      console.log(`${course.deck.id}: the fix for ${id} names a card the course does not have.`);
      ok = false;
      continue;
    }
    for (const [field, value] of Object.entries(fix)) {
      if (!['meaning', 'remember', 'target', 'native'].includes(field) || typeof value !== 'string') {
        console.log(`${course.deck.id}: the fix for ${id} has a field ${field} the build does not apply.`);
        ok = false;
        continue;
      }
      card[field] = value;
    }
  }
  return ok;
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
  if (SHIP_NAMES[course.deck.id]) course.deck.name = SHIP_NAMES[course.deck.id];
  if (SHIP_DESCRIPTIONS[course.deck.id]) course.deck.description = SHIP_DESCRIPTIONS[course.deck.id];
  if (!applyFixes(course)) failed = true;
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
