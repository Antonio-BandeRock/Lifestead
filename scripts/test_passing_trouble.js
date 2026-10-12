// Checks lib/passingTrouble.ts: only what needs the person speaks at once;
// everything else waits for an hour AND four separate failed tries.
const fs = require('fs');
const ts = require('typescript');
const source = fs.readFileSync(require.resolve('../lib/passingTrouble.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } });
const t = {};
new Function('exports', outputText)(t);
let failed = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { failed++; console.log('FAIL', name, 'got', JSON.stringify(got), 'want', JSON.stringify(want)); }
}
const busy = t.ONEDRIVE_BUSY_LEAD + ' (503). Sync tries again by itself.';
const offline = 'OneDrive could not be reached. Check the connection and try again.';
const unread = 'The copy in your shared folder could not be read.';
const fetched = 'inside-story-sync.json could not be fetched from OneDrive.';
const hiccup = 'OneDrive did not accept this phone’s sign-in. This is sometimes on Microsoft’s side and clears within a few minutes.';
const HOUR = t.PASSING_TROUBLE_HOLD_MS;
const GAP = t.SEPARATE_TRY_GAP_MS;
for (const r of [busy, offline, unread, fetched, hiccup]) check('passing: ' + r.slice(0, 30), t.isPassingTrouble(r), true);
for (const r of [
  'Not signed in to OneDrive yet.',
  'The OneDrive sign-in expired. Sign in again.',
  'That is no longer a folder in OneDrive.',
  'The resource could not be found.',
  'Item not found',
  'OneDrive refused that (403, accessDenied). Try again in a few minutes.',
  'That is not the password sync was turned on with on your other device. Enter the same one here.',
]) check('needs the person: ' + r.slice(0, 30), t.needsThePerson(r), true);

check('first failure is quiet and starts the clock', t.decideTrouble(null, busy, 1000), { speak: false, clock: { since: 1000, count: 1, last: 1000 } });
check('failures from one wake are one try', t.decideTrouble({ since: 1000, count: 1, last: 1000 }, unread, 1000 + 5000).clock.count, 1);
check('59 minutes and four tries is still quiet', t.decideTrouble({ since: 1000, count: 3, last: 1000 + HOUR - 120000 }, busy, 1000 + HOUR - 60000).speak, false);
check('two sparse failures an hour apart stay quiet', t.decideTrouble({ since: 1000, count: 1, last: 1000 }, offline, 1000 + 5 * HOUR).speak, false);
const late = t.decideTrouble({ since: 1000, count: 3, last: 1000 + HOUR - GAP }, busy, 1000 + HOUR);
check('an hour and four separate tries speaks', late.speak, true);
check('and says it has gone on', late.sentence.startsWith('This has been going on for more than an hour.'), true);
const moved = 'The resource could not be found.';
check('needs the person speaks at once and leaves the clock', t.decideTrouble({ since: 1000, count: 2, last: 1000 }, moved, 2000), { speak: true, clock: { since: 1000, count: 2, last: 1000 }, sentence: moved });
check('needs the person with no clock', t.decideTrouble(null, moved, 2000), { speak: true, clock: null, sentence: moved });
if (failed) { console.log(failed + ' failed'); process.exit(1); }
console.log('All passing-trouble checks passed');
