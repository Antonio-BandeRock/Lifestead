// Checks that the developer tools are not in the tester version's bundle
// (tester plan T2, 2026-10-31). metro.config.js swaps the developer-only
// modules for stand-ins when APP_VARIANT is test or store; this exports an
// Android bundle that way and looks for words only those modules carry.
// It exports a second bundle with no APP_VARIANT and checks the same words
// ARE there, so a word that stopped existing cannot make the check pass by
// itself.
//
//   node scripts/audit_tester_bundle.js                      exports both, checks
//   node scripts/audit_tester_bundle.js <tester> <control>   checks two existing
//                                                            export folders
//
// Exit 0 when the tester bundle has none of them, 1 otherwise.
/* global __dirname */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');

// One or more strings from each module the tester version must not carry.
// Only strings the Spanish tables cannot hold: those tables carry every
// English sentence on screen as a key, so a sentence from these modules is in
// every bundle whether the module is or not. Each is checked against the
// tables below.
const DEVELOPER_ONLY = [
  ['components/DeveloperToolsCard.tsx', '[captureSuggest] could not run the check'],
  ['components/DeveloperToolsCard.tsx', '[tellClaude] could not clear the notes'],
  ['components/TellClaudeHost.tsx', '[tellClaude] could not write the wording edit'],
  ['components/TellClaudeHost.tsx', '[tellClaude] could not write the untranslated words'],
  ['lib/devSeed.ts', 'INSERT INTO dev_seed_records'],
  ['lib/testerApprove.ts', 'tester_approval_seed_v1'],
  ['components/DeveloperToolsCard.tsx', '[testerApprove] could not send the approval key'],
];

function exportBundle(variant) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), `bundle-${variant || 'control'}-`));
  const env = { ...process.env };
  if (variant) env.APP_VARIANT = variant;
  else delete env.APP_VARIANT;
  execSync(`npx expo export -p android --no-minify --no-bytecode --output-dir "${out}"`, {
    cwd: root,
    env,
    stdio: 'inherit',
  });
  return out;
}

function bundleText(folder) {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|hbc)$/.test(entry.name)) found.push(full);
    }
  };
  walk(folder);
  if (found.length === 0) throw new Error(`No bundle in ${folder}`);
  return found.map((file) => fs.readFileSync(file, 'latin1')).join('\n');
}

const [testerArg, controlArg] = process.argv.slice(2);
const tester = bundleText(testerArg || exportBundle('test'));
const control = bundleText(controlArg || exportBundle(null));

let problems = 0;
const tables = [];
const walkTables = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTables(full);
    else if (entry.name.endsWith('.ts')) tables.push(fs.readFileSync(full, 'utf8'));
  }
};
walkTables(path.join(root, 'lib', 'translations'));
for (const [file, words] of DEVELOPER_ONLY) {
  if (tables.some((table) => table.includes(words))) {
    console.log(`TABLE  "${words}" is in a translation table, so it says nothing about ${file}; pick another.`);
    problems++;
  } else if (!control.includes(words)) {
    console.log(`STALE  "${words}" is not in the developer bundle either; pick a word ${file} still has.`);
    problems++;
  } else if (tester.includes(words)) {
    console.log(`FOUND  "${words}" from ${file} is in the tester bundle.`);
    problems++;
  }
}
console.log(problems === 0 ? `0 developer-only words in the tester bundle (${DEVELOPER_ONLY.length} checked).` : `${problems} problem(s).`);
process.exit(problems === 0 ? 0 : 1);
