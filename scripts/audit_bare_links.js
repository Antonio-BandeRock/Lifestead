// A link names the exact thing it points at (2026-11-02, 1.0.79.5).
//
// Direct instruction: "EVERYTHING that points to the profile or to anything
// in the app that has a link to something else in the app must ALWAYS go to
// that something and never leave the user to try to find it themselves."
//
// Profile is one long page of cards, so a link to it with no `section`
// leaves the person at the top to look. This check finds every link to
// '/profile' that names no card. Profile opens the card named by
// `params: { section: '<card key>' }` (app/profile.tsx, useFocusEffect).
//
// Run: node scripts/audit_bare_links.js   (must stay at 0)
const fs = require('fs');
const path = require('path');

const ROOTS = ['app', 'components', 'lib', 'hooks'];
const PATTERNS = [
  /push\(\s*'\/profile'\s*\)/,
  /route\(\s*'\/profile'\s*\)/,
  /pathname:\s*'\/profile'\s*\}/,
  /href="\/profile"/,
];

// Each needs a reason: why this link means Profile as a whole.
const ALLOWED = {
  'components/TabHub.tsx': 'The menu item named Profile, which opens the page itself.',
  'lib/storyWalk.ts': 'Not a link: the walk step is done once Profile is the screen showing.',
};

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

let hits = 0;
for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root, [])) {
    const rel = file.split(path.sep).join('/');
    if (ALLOWED[rel]) continue;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      if (PATTERNS.some((p) => p.test(line))) {
        hits += 1;
        console.log(`${rel}:${i + 1}  ${line.trim()}`);
      }
    });
  }
}
console.log(hits === 0 ? 'Bare links: 0' : `Bare links: ${hits}. Name the card: params: { section: '<card key>' }.`);
process.exit(hits === 0 ? 0 : 1);
