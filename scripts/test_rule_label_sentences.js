// Checks the label sentences quoted beside the curated interaction rules
// (A11b of the competitive build plan): every rule in the reference database
// that names a prescription is either quoted in lib/ruleLabelSentences.ts or
// listed there with the reason its label is silent, nothing else is, every
// quote names a section the label screen shows, and no quote or reason breaks
// the house writing rules. With --live it fetches each label again from
// openFDA by its set id and checks the sentence is still in it, word for
// word. Exits non-zero on any failure.

// eslint-config-expo lints this repo as app code, which has no __dirname.
/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(file) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const mod = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(mod.exports, mod, (name) => {
    throw new Error(`${file} must stay free of runtime imports (${name})`);
  });
  return mod.exports;
}

const Q = load('lib/ruleLabelSentences.ts');
const M = load('lib/medicineLabel.ts');

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

const quoted = Object.keys(Q.RULE_LABEL_SENTENCES);
const silent = Object.keys(Q.RULES_WITHOUT_LABEL_SENTENCE);
check('no rule both quoted and listed as silent', quoted.filter((id) => silent.includes(id)), []);

const shownKeys = M.LABEL_SECTIONS.map(([key]) => key);
const FORBIDDEN_IN_REASON = /\b(real|genuine|genuinely)\b|—|–| -- /i;
for (const [id, q] of Object.entries(Q.RULE_LABEL_SENTENCES)) {
  check(`${id}: keyed by its own id`, q.ruleId, id);
  check(`${id}: section is one the label screen shows`, shownKeys.includes(q.sectionKey), true);
  check(`${id}: set id is a uuid`, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(q.setId), true);
  check(`${id}: date is YYYY-MM-DD`, /^\d{4}-\d{2}-\d{2}$/.test(q.effective), true);
  check(`${id}: version given`, /^\d+$/.test(q.version), true);
  check(`${id}: sentence present`, q.sentence.trim().length > 20, true);
  check(`${id}: lookup returns it`, Q.labelSentenceForRule(id) === q, true);
}
for (const [id, reason] of Object.entries(Q.RULES_WITHOUT_LABEL_SENTENCE)) {
  check(`${id}: reason free of house-style tics`, FORBIDDEN_IN_REASON.test(reason), false);
}
check('an unknown rule has no sentence', Q.labelSentenceForRule('no_such_rule'), null);

// The reference database, when present (a fresh clone has none). Read only.
const dbPath = path.join(__dirname, '..', 'assets', 'data', 'foods_reference.db');
if (fs.existsSync(dbPath)) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const rx = db
    .prepare("select id from interaction_rules where subject_a_kind = 'prescription' or subject_b_kind = 'prescription' order by id")
    .all()
    .map((r) => r.id);
  const accounted = [...quoted, ...silent];
  check('every prescription rule is quoted or listed as silent', rx.filter((id) => !accounted.includes(id)), []);
  check('nothing quoted or listed that is not a prescription rule', accounted.filter((id) => !rx.includes(id)).sort(), []);
  db.close();
} else {
  console.log('note  assets/data/foods_reference.db not present; rule coverage not checked');
}

async function live() {
  const bySet = new Map();
  for (const q of Object.values(Q.RULE_LABEL_SENTENCES)) {
    if (!bySet.has(q.setId)) bySet.set(q.setId, []);
    bySet.get(q.setId).push(q);
  }
  for (const [setId, list] of bySet) {
    const url = M.setIdQueryUrl(setId);
    const res = await fetch(url);
    const body = await res.json();
    const result = body.results && body.results[0];
    const doc = result ? M.toLabelDocument(result) : null;
    for (const q of list) {
      if (!doc) {
        check(`${q.ruleId}: label ${setId} still served`, false, true);
        continue;
      }
      const section = doc.sections.find((s) => s.key === q.sectionKey);
      const still = !!section && section.text.includes(q.sentence);
      if (!still) console.log(`      ${q.ruleId}: label now version ${doc.version}, quoted ${q.version}`);
      check(`${q.ruleId}: sentence still on the label`, still, true);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}

(async () => {
  if (process.argv.includes('--live')) await live();
  console.log(`${total - failures} of ${total} passed`);
  if (failures) process.exit(1);
})();
