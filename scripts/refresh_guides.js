// Keeps the App Guide and the Walkthrough current with the app.
//
// Direct instruction, 2026-11-06: "make the app guide and the walk-through
// current. That should be happening continuously as changes are made to the
// app." The two pages live in docs/guides/ so every session starts from the
// last published text instead of downloading it, and this script does the part
// that needs no judgment:
//
//   node scripts/refresh_guides.js          rewrites the version line on both pages and the
//                                           What Has Changed list on the App Guide, then reports
//   node scripts/refresh_guides.js --check  changes nothing; exits 1 if either page is behind
//
// Either way it names every lens in lib/voiceLensDirectory.ts that a page does
// not mention, and exits 1 for those too: adding a lens means writing its line
// on both pages. After a refresh, publish both files with the Artifact tool:
//   docs/guides/app-guide.html    https://claude.ai/artifact/TrwQ19wQiuq1Kw6fHVEGgs
//   docs/guides/walkthrough.html  https://claude.ai/artifact/XzbKH1oPPniiucyxBhXknp
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const GUIDE = 'docs/guides/app-guide.html';
const WALK = 'docs/guides/walkthrough.html';
const CHANGES_FROM = '1.0.52.8'; // where the pages stood before the 2026-11-06 catch-up
const check = process.argv.includes('--check');

const appVersion = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo.version;

function loadTs(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
  });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', outputText)(m, m.exports, () => ({}));
  return m.exports;
}

const { RELEASE_NOTES, compareAppVersions } = loadTs(path.join('constants', 'releaseNotes.ts'));
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function changesHtml() {
  const notes = RELEASE_NOTES.filter((n) => compareAppVersions(n.version, CHANGES_FROM) > 0);
  const months = new Map();
  for (const n of notes) {
    const key = n.date.slice(0, 7);
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(n);
  }
  const blocks = [...months.entries()].map(([month, list], i) => {
    const label = new Date(`${month}-15T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const body = list
      .map((n) => `<h4>${esc(n.version)} <small>${esc(n.date)}</small></h4><ul>${n.changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`)
      .join('\n');
    return `<details class="plaincard"${i === 0 ? ' open' : ''}><summary><strong>${label}</strong> (${list.length} versions)</summary>\n${body}\n</details>`;
  });
  return blocks.join('\n');
}

function region(text, name, inner) {
  const re = new RegExp(`(<!--AUTO:${name}-->)[\\s\\S]*?(<!--/AUTO:${name}-->)`);
  if (!re.test(text)) throw new Error(`region ${name} not found`);
  return text.replace(re, (_, a, b) => `${a}${inner}${b}`);
}

const dir = fs.readFileSync(path.join('lib', 'voiceLensDirectory.ts'), 'utf8');
const lenses = [...dir.matchAll(/\{ tab: '([^']+)', param: '[^']+', key: '([^']+)', label: (?:'((?:[^'\\]|\\.)*)'|"([^"]*)") \}/g)]
  .map((m) => ({ tab: m[1], label: (m[3] || m[4]).replace(/\\'/g, "'") }));

let problems = 0;
for (const file of [GUIDE, WALK]) {
  const was = fs.readFileSync(file, 'utf8');
  const today = new Date();
  const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const stale = !new RegExp(`<!--AUTO:version-->[^<]*\\(${appVersion.replace(/\./g, '\\.')}\\)`).test(was);
  if (check) {
    if (stale) {
      console.log(`${file}: behind the app (${appVersion})`);
      problems++;
    }
  } else {
    let next = stale ? region(was, 'version', `Last refreshed ${stamp} (${appVersion}).`) : was;
    if (file === GUIDE) next = region(next, 'changes', `\n${changesHtml()}\n`);
    if (next !== was) fs.writeFileSync(file, next);
  }
  const text = fs.readFileSync(file, 'utf8');
  const hay = file === GUIDE ? text.replace(/&amp;/g, '&') : text;
  const missing = lenses.filter((l) => !hay.includes(l.label));
  if (missing.length) {
    console.log(`${file}: no line for ${missing.map((l) => `${l.tab} ${l.label}`).join(', ')}`);
    problems++;
  }
}
console.log(problems ? `${problems} page problem(s)` : `Both pages current with ${appVersion}.`);
process.exit(problems ? 1 : 0);
