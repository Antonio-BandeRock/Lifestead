// Every change to the app's database keeps what is already in it (tester
// plan T7, 2026-10-31).
//
// Testers keep their own records in the test version from the first day,
// and every update over the air runs the startup schema code against those
// records. So that code may only ADD: a new table, a new column, a new
// index. This walks every SQL string in the app (string and template
// literals only, never comments) and reports anything that can lose a
// record or stop a device from starting:
//
//   drop-table     DROP TABLE removes a table and every row in it.
//   drop-column    ALTER TABLE ... DROP COLUMN removes a column's values.
//   rename         ALTER TABLE ... RENAME (a table or a column) breaks every
//                  older bundle still reading the old name, and the merge
//                  between devices matches tables by name.
//   unguarded      CREATE TABLE without IF NOT EXISTS fails the second time
//                  it runs, which on a phone is the next start.
//   not-null       ADD COLUMN ... NOT NULL with no DEFAULT fails on a table
//                  that already has rows, which is every tester's table.
//   wipe           DELETE FROM a table with no WHERE empties it.
//
// DROP INDEX, DROP VIEW and DROP TRIGGER are allowed: they hold no records.
// Anything that must stay goes in ALLOWED with a written reason, keyed by
// file and rule.
//
// Run: node scripts/audit_additive_migrations.js
/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const DIRS = ['lib', 'app', 'components', 'hooks', 'constants'];

// file|rule -> { count, reason }. Each is a deliberate wipe that the person
// asked for, never a step of the startup schema code.
const ALLOWED = {
  'lib/dataBackup.ts|wipe': { count: 1, reason: 'restoring a backup the person picked replaces each table with the copy in the backup, inside one transaction' },
  'lib/db.ts|wipe': { count: 1, reason: 'daily_nutrient_totals_cache holds only figures worked out again from meals' },
  'lib/devSeed.ts|wipe': { count: 1, reason: 'Remove Test Data empties the list of rows the test-data seed added, after removing those rows' },
  'lib/peerSyncDevice.ts|wipe': { count: 1, reason: 'a merge between two people writes the merged rows back; a filtered table keeps its private rows' },
  'lib/recallsDb.ts|wipe': { count: 1, reason: 'Bring Back What I Set Aside, pressed by the person, clears only the recall checks they set aside' },
  'lib/syncLog.ts|wipe': { count: 1, reason: 'Clear the log, pressed by the person, empties the sync activity log and nothing else' },
};

const RULES = [
  { key: 'drop-table', test: (sql) => /\bDROP\s+TABLE\b/i.test(sql) },
  { key: 'drop-column', test: (sql) => /\bDROP\s+COLUMN\b/i.test(sql) },
  { key: 'rename', test: (sql) => /\bALTER\s+TABLE\s+[\w"`[\]X]+\s+RENAME\b/i.test(sql) },
  {
    key: 'unguarded',
    test: (sql) => /\bCREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS\b)/i.test(sql),
  },
  {
    key: 'not-null',
    test: (sql) =>
      (sql.match(/\bADD\s+COLUMN\b[^;,)]*/gi) || []).some((clause) => /\bNOT\s+NULL\b/i.test(clause) && !/\bDEFAULT\b/i.test(clause)),
  },
  {
    key: 'wipe',
    test: (sql) =>
      sql
        .split(';')
        .some((statement) => /\bDELETE\s+FROM\s+[\w"`[\]X]+\s*$/i.test(statement.trim()) && !/\bWHERE\b/i.test(statement)),
  },
];

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'translations' || entry.name === 'digest') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// SQL comments inside a literal say why, they do not run.
function stripSqlComments(text) {
  return text.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function literals(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const found = [];
  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      found.push({ text: node.text, node });
    } else if (ts.isTemplateExpression(node)) {
      // A placeholder stands in for each ${...}: a table name built at run
      // time still reads as a name.
      const text = node.head.text + node.templateSpans.map((span) => `X${span.literal.text}`).join('');
      found.push({ text, node });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found.map(({ text, node }) => ({
    text: stripSqlComments(text),
    line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
  }));
}

const files = DIRS.flatMap((dir) => walk(path.join(ROOT, dir), []));
const counts = {};
const findings = [];
for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  for (const literal of literals(file)) {
    if (!/\b(TABLE|COLUMN|DELETE)\b/i.test(literal.text)) continue;
    for (const rule of RULES) {
      if (!rule.test(literal.text)) continue;
      const key = `${rel}|${rule.key}`;
      counts[key] = (counts[key] || 0) + 1;
      findings.push({ key, rel, line: literal.line, rule: rule.key, text: literal.text.replace(/\s+/g, ' ').trim().slice(0, 110) });
    }
  }
}

let reported = 0;
for (const finding of findings) {
  const allowed = ALLOWED[finding.key];
  if (allowed && counts[finding.key] <= allowed.count) continue;
  reported++;
  console.log(`${finding.rel}:${finding.line}  ${finding.rule}  ${finding.text}`);
}
for (const [key, allowed] of Object.entries(ALLOWED)) {
  if (!counts[key]) console.log(`ALLOWED entry no longer needed: ${key} (${allowed.reason})`);
}
console.log(`audit_additive_migrations: ${reported} findings across ${files.length} files`);
process.exit(reported === 0 ? 0 : 1);
