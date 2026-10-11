// Every notification answerable or dismissable on a locked phone (1.0.67.1).
// Direct instruction, 2026-10-11: "Make sure from now on that notifications
// are required to all be answered or dismissed without having to unlock the
// phone and open the app."
//
// Android runs a button with opensAppToForeground false straight from the
// lock screen, but a button that opens the app and a box for typing a reply
// (RemoteInput) both wait for the phone to be unlocked. So this fails on:
//   1. a textInput option on any notification button
//   2. opensAppToForeground: true anywhere
//   3. a notification button registered without opensAppToForeground: false
//   4. any set of buttons longer than Android's three
//   5. RemoteInput in a config plugin's native code
//   6. the retired ACTION_OPENS_APP and ACTION_TEXT_INPUT tables coming back
//
// Exits non-zero on any finding. Run it beside the other audits.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const findings = [];

function walk(dir, exts, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, out);
    else if (exts.includes(path.extname(entry.name))) out.push(full);
  }
  return out;
}

const files = [];
for (const dir of ['lib', 'components', 'app', 'hooks']) walk(path.join(root, dir), ['.ts', '.tsx'], files);
for (const file of files) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const text = fs.readFileSync(file, 'utf8');
  const lineOf = (index) => text.slice(0, index).split('\n').length;
  for (const m of text.matchAll(/opensAppToForeground:\s*true/g)) findings.push(`${rel}:${lineOf(m.index)} a button opens the app`);
  for (const m of text.matchAll(/\b(ACTION_OPENS_APP|ACTION_TEXT_INPUT)\b/g)) findings.push(`${rel}:${lineOf(m.index)} ${m[1]} is retired`);
  // Each category registration: every button stays on the lock screen and none asks for typing.
  let at = text.indexOf('setNotificationCategoryAsync(');
  while (at >= 0) {
    // The registration runs to its matching parenthesis.
    let depth = 0;
    let end = at + 'setNotificationCategoryAsync'.length;
    for (; end < text.length; end++) {
      if (text[end] === '(') depth++;
      else if (text[end] === ')' && --depth === 0) break;
    }
    const call = text.slice(at, end);
    if (/textInput\s*:/.test(call)) findings.push(`${rel}:${lineOf(at)} a button asks for typing`);
    if (!/opensAppToForeground:\s*false/.test(call)) findings.push(`${rel}:${lineOf(at)} a button does not say it stays on the lock screen`);
    at = text.indexOf('setNotificationCategoryAsync(', end);
  }
}

for (const file of walk(path.join(root, 'plugins'), ['.js'], [])) {
  const text = fs.readFileSync(file, 'utf8');
  if (/RemoteInput/.test(text)) findings.push(`${path.relative(root, file)} native code asks for a typed reply`);
}

// The button sets themselves.
function load(relPath) {
  const source = fs.readFileSync(path.join(root, relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, () => ({}));
  return module.exports;
}
const actions = load('lib/reminderActions.ts');
for (const key of actions.ALL_REMINDER_CATEGORY_KEYS) {
  const set = actions.CATEGORY_ACTIONS[key];
  if (set.length > 3) findings.push(`lib/reminderActions.ts ${key} has ${set.length} buttons, Android shows three`);
}
for (const count of [1, 2]) {
  const set = actions.flareWhatActions(count);
  if (set.length > 3) findings.push(`lib/reminderActions.ts the symptom question with ${count} has ${set.length} buttons`);
}
if (actions.FLARE_WHY_ACTIONS.length > 3) findings.push('lib/reminderActions.ts the what-was-going-on question has more than three buttons');

if (findings.length) {
  for (const f of findings) console.log('FAIL ' + f);
  console.log(`${findings.length} finding(s)`);
  process.exit(1);
}
console.log(`audit_lock_answerable: 0 findings across ${files.length} files`);
