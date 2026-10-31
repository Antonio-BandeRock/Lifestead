// Checks lib/digest/makingItPay.ts (Interests > Making It Pay): every entry
// is in the makingItPay category, has a tier, at least one https source and
// a year in its text, lands in one of the five topics by its id prefix, and
// opens on Interests. Then sweeps every string for advice, cheerleading and
// discouragement, since this reading never tells anyone to start a
// business, quit a job or give up on an idea.
// Run: node scripts/test_making_it_pay.js
/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const file = path.join(__dirname, '..', 'lib', 'digest', 'makingItPay.ts');
const source = fs.readFileSync(file, 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const m = { exports: {} };
new Function('module', 'exports', 'require', outputText)(m, m.exports, () => ({}));
const ENTRIES = m.exports.MAKING_IT_PAY_ENTRIES;

let pass = 0;
let fail = 0;
function check(name, ok, detail) {
  if (ok) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ''}`);
  }
}

const PREFIXES = ['pay-picture-', 'pay-could-', 'pay-overhead-', 'pay-health-', 'pay-trying-'];
const TIERS = ['strong', 'moderate', 'weak'];
const ids = new Set();

check('there are entries', Array.isArray(ENTRIES) && ENTRIES.length >= 10, ENTRIES && ENTRIES.length);
for (const entry of ENTRIES) {
  check(`${entry.id}: unique id`, !ids.has(entry.id));
  ids.add(entry.id);
  check(`${entry.id}: category`, entry.category === 'makingItPay');
  check(`${entry.id}: topic prefix`, PREFIXES.some((prefix) => entry.id.startsWith(prefix)));
  check(`${entry.id}: tier`, TIERS.includes(entry.overallTier));
  check(`${entry.id}: title, teaser, summary`, Boolean(entry.title && entry.teaser && entry.summary));
  check(`${entry.id}: title has no colon subtitle`, !entry.title.includes(': '), entry.title);
  check(`${entry.id}: at least one source`, Array.isArray(entry.citations) && entry.citations.length > 0);
  for (const citation of entry.citations ?? []) {
    check(`${entry.id}: source is named`, Boolean(citation.source));
    check(`${entry.id}: source link is https`, /^https:\/\//.test(citation.url ?? ''), citation.url);
  }
  // Every figure carries its year: an entry with a number in it names a year.
  const text = `${entry.teaser} ${entry.summary}`;
  if (/\d/.test(text) && !entry.id.startsWith('pay-trying-')) {
    check(`${entry.id}: names a year`, /\b(19|20)\d\d\b/.test(text));
  }
}
for (const entry of ENTRIES) {
  for (const related of entry.relatedIds ?? []) check(`${entry.id}: related ${related} exists`, ids.has(related));
}
for (const prefix of PREFIXES) check(`topic ${prefix} has entries`, ENTRIES.some((entry) => entry.id.startsWith(prefix)));

// The category is wired: key, meta, grouping, route and the Interests lens.
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
check('category key', read('lib/digest/types.ts').includes("'makingItPay',"));
check('category meta and entries', /key: 'makingItPay'/.test(read('lib/digest/index.ts')) && read('lib/digest/index.ts').includes('...MAKING_IT_PAY_ENTRIES'));
check('grouping dispatch', read('lib/digest/categoryGrouping.ts').includes("if (category === 'makingItPay') return groupMakingItPayEntries(entries);"));
check('opens on Interests', read('lib/digestNavigation.ts').includes("openInterestsLens: 'makingItPay'"));
check('Interests lens', read('app/(tabs)/interests.tsx').includes('categoryKey="makingItPay"'));
check('how-tos', read('lib/toolHowTos.ts').includes("'/interests#makingItPay'"));

// What is never said. "profitable" is allowed, since the Federal Reserve's
// finding is quoted; telling someone what to do with an interest is not.
const FORBIDDEN = [
  'you should', 'should you', 'ought to', 'go for it', 'you can do it', 'give up', 'quit your', 'follow your',
  'dream', 'passion', 'risky', 'good idea', 'bad idea', 'worth it', 'not worth', 'don’t bother', "don't bother",
  'side hustle', 'be your own boss', 'financial freedom', 'success', 'failure', 'must', 'we recommend',
  'genuine', 'honestly', 'real ', '—', '–', ' -- ',
];
const strings = source
  .split('\n')
  .filter((row) => !row.trim().startsWith('//'))
  .join('\n');
const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;
let match;
while ((match = re.exec(strings))) {
  const value = match[1] ?? match[2];
  if (!value || !/[A-Za-z]{3,} [A-Za-z]/.test(value)) continue;
  const lower = value.toLowerCase();
  for (const word of FORBIDDEN) {
    if (lower.includes(word)) check(`"${word}" stays out: "${value.slice(0, 70)}"`, false);
  }
}

console.log(`${pass + fail} checks, ${fail} failures`);
process.exit(fail ? 1 : 0);
