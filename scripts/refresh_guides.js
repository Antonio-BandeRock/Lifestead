// Keeps the App Guide and the Walkthrough current with the app.
//
// Direct instruction, 2026-11-06: "make the app guide and the walk-through
// current. That should be happening continuously as changes are made to the
// app." The two pages live in docs/guides/ so every session starts from the
// last published text instead of downloading it, and this script does the part
// that needs no judgment:
//
//   node scripts/refresh_guides.js          rewrites the version line on both pages, then reports
//   node scripts/refresh_guides.js --check  changes nothing; exits 1 if either page is behind
//
// Either way it names every lens in lib/voiceLensDirectory.ts that a page does
// not mention, and exits 1 for those too: adding a lens means writing its line
// on both pages. It also names any line of the App Guide that dates a feature
// ("as of", "since 1.0.x", a version or a date): the guide describes the app
// as one whole, with no changes list. After a refresh, publish both files with the Artifact tool:
//   docs/guides/app-guide.html    https://claude.ai/artifact/TrwQ19wQiuq1Kw6fHVEGgs
//   docs/guides/walkthrough.html  https://claude.ai/artifact/XzbKH1oPPniiucyxBhXknp
const fs = require('fs');
const path = require('path');

const GUIDE = 'docs/guides/app-guide.html';
const WALK = 'docs/guides/walkthrough.html';
const check = process.argv.includes('--check');

const appVersion = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo.version;

// Direct instruction, 2026-11-12: "App Guide should never say as of any date
// that something was added. Treat everything as if it comes as one whole thing
// right from the start." So the guide carries no changes list and no dates,
// versions or "since"/"as of" wording outside the AUTO:version line.
const DATED = /\bAs of\b|\b[Ss]ince (?:1\.0|20\d\d)|\b1\.0\.\d+\.\d+|\b20\d\d-\d\d(?:-\d\d)?\b|\bno longer\b|\bwas (?:removed|renamed|retired)\b/;
function datedLines(text) {
  return text
    .replace(/<!--AUTO:version-->[^\n]*?<!--\/AUTO:version-->/, '')
    .split('\n')
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => DATED.test(line.replace(/<[^>]+>/g, '')));
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
    if (next !== was) fs.writeFileSync(file, next);
  }
  const text = fs.readFileSync(file, 'utf8');
  const hay = file === GUIDE ? text.replace(/&amp;/g, '&') : text;
  if (file === GUIDE) {
    const dated = datedLines(text);
    for (const d of dated) console.log(`${file}:${d.n}: dated wording: ${d.line.trim().slice(0, 100)}`);
    if (dated.length) problems++;
  }
  const missing = lenses.filter((l) => !hay.includes(l.label));
  if (missing.length) {
    console.log(`${file}: no line for ${missing.map((l) => `${l.tab} ${l.label}`).join(', ')}`);
    problems++;
  }
}
console.log(problems ? `${problems} page problem(s)` : `Both pages current with ${appVersion}.`);
process.exit(problems ? 1 : 0);
