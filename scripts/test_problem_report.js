// Checks lib/problemReport.ts (Report a Problem, tester plan T4): the place
// said in words, what is missing before a report can go, the email it
// becomes, the mailto link, and a crash cut to a length an email can carry.
// Run: node scripts/test_problem_report.js
/* global __dirname */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(rel) {
  const file = path.join(__dirname, '..', 'lib', `${rel}.ts`);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', outputText)(m, m.exports, (name) => {
    throw new Error(`lib/problemReport.ts must stay pure, asked for ${name}`);
  });
  return m.exports;
}
const P = load('problemReport');

let failures = 0;
function check(ok, label) {
  if (!ok) {
    failures++;
    console.log(`FAIL  ${label}`);
  }
}

check(P.PROBLEM_REPORT_ADDRESS === 'testers@ghostead.com', 'reports go to testers@ghostead.com');
for (const kind of P.PROBLEM_REPORT_KINDS) {
  check(Boolean(P.PROBLEM_REPORT_LABELS[kind]) && Boolean(P.PROBLEM_REPORT_CAPTIONS[kind]), `${kind} has a label and a caption`);
}

check(P.describeProblemPlace({ tab: 'Food', lens: 'Meal Builder', bandTitle: 'Ingredients' }) === 'Food > Meal Builder, the Ingredients band', 'a band on a lens');
check(P.describeProblemPlace({ tab: 'Home', lens: null, bandTitle: null }) === 'Home', 'a tab alone');
check(P.describeProblemPlace({ tab: null, lens: null, bandTitle: null }) === 'Not one place in particular', 'nowhere in particular');

check(P.problemReportProblem('   ', null) !== null, 'an empty report says what is missing');
check(P.problemReportProblem('It froze', null) === null, 'a written report can go');
check(P.problemReportProblem('', 'Error: x') === null, 'a crash with nothing written can go');

const when = new Date(2026, 9, 31, 14, 5);
const report = {
  kind: 'problem',
  place: { tab: 'Garden', lens: 'Seeds', bandTitle: null },
  body: 'The list went blank\nafter I saved.',
  version: '1.0.78.19',
  device: 'Google Pixel 8, Android 16',
  crash: null,
  sentAt: when,
};
const email = P.composeProblemReport(report);
check(email.subject === 'Lifestead Test 1.0.78.19: Something went wrong, Garden > Seeds', `subject reads ${email.subject}`);
check(email.body.startsWith('The list went blank\nafter I saved.'), 'the body starts with what was written');
check(email.body.includes('Version: 1.0.78.19') && email.body.includes('Device: Google Pixel 8, Android 16'), 'the body carries version and device');
check(email.body.includes('Written: 2026-10-31 14:05'), 'the body carries the local time');
check(!email.body.includes('closed by itself'), 'no crash section without a crash');

const link = P.problemReportMailto(report);
check(link.startsWith('mailto:testers@ghostead.com?subject='), 'the link is a mailto to the testers address');
check(link.includes('%0D%0A') && !/[\n\r ]/.test(link), 'line breaks go as CRLF and nothing is left unencoded');
check(decodeURIComponent(link.split('&body=')[1]).replace(/\r\n/g, '\n') === email.body, 'the body decodes back to the email');

const big = new Error('Boom');
big.stack = 'at x\n'.repeat(2000);
const crash = P.formatCrash(big, when);
check(crash.length <= P.CRASH_TEXT_LIMIT + 20 && crash.endsWith('(cut short)'), 'a long crash is cut short');
check(crash.includes('Error: Boom'), 'a crash keeps its message');
const withCrash = P.composeProblemReport({ ...report, body: '', crash });
check(withCrash.body.startsWith('(Nothing written.') && withCrash.body.includes('When the app closed by itself:'), 'a crash with nothing written still reads');

// The words a tester reads follow the app's writing rules.
const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'problemReport.ts'), 'utf8');
const strings = source.match(/'[^'\n]{12,}'/g) || [];
for (const text of strings) {
  check(!/[–—]| -- |\breal\b|\bgenuine(ly)?\b|\bhonestly\b/i.test(text), `no banned words in ${text}`);
}

console.log(failures === 0 ? 'All problem report checks passed.' : `${failures} problem report check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
