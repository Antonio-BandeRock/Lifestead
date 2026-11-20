// Fills docs/app-links/public/tester/latest.json, which tells the tester
// version when a new installer is waiting (lib/testerInstaller.ts), then
// says how to put it on the site (2026-11-20, Tony: "the desktop app should
// also self update or at least let the user know there is an update").
//
//   node scripts/publish_tester_latest.js
//       Sets windows.version to the newest installer in desktop/dist-test.
//   node scripts/publish_tester_latest.js --windows-url <link>
//       Also sets the link a tester's computer opens to get it.
//   node scripts/publish_tester_latest.js --android-url <link> --runtime <fingerprint>
//       Sets the Android entry after a tester APK build; the phone only shows
//       the line when its own runtime differs (an update that keeps the
//       runtime arrives by itself).
//   node scripts/publish_tester_latest.js --check
//       Exits 1 when the newest tester installer is not the one named.
//
// A link stays as it was when none is given, so one link (the OneDrive
// folder shared with each tester's address, docs/tester-kit/sharing-plan.md)
// keeps working installer after installer. Nothing is said to a tester while
// a link is missing: lib/testerInstaller.ts stays quiet without one.
//
// Then: cd docs/app-links && npx wrangler deploy

/* global __dirname */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LATEST = path.join(ROOT, 'docs', 'app-links', 'public', 'tester', 'latest.json');
const DIST = path.join(ROOT, 'desktop', 'dist-test');
function compareAppVersions(a, b) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

const args = process.argv.slice(2);
const valueOf = (flag) => {
  const at = args.indexOf(flag);
  return at >= 0 ? args[at + 1] : undefined;
};

function newestInstaller() {
  if (!fs.existsSync(DIST)) return null;
  const versions = fs
    .readdirSync(DIST)
    .map((name) => /^Lifestead Test Setup (\d+\.\d+\.\d+\.\d+)\.exe$/.exec(name))
    .filter(Boolean)
    .map((match) => match[1])
    .sort(compareAppVersions);
  return versions.length ? versions[versions.length - 1] : null;
}

const latest = JSON.parse(fs.readFileSync(LATEST, 'utf8'));
latest.windows = latest.windows || { version: null, downloadUrl: null };
latest.android = latest.android || { version: null, runtime: null, downloadUrl: null };
const built = newestInstaller();

if (args.includes('--check')) {
  if (built && latest.windows.version !== built) {
    console.log(`latest.json names Windows ${latest.windows.version ?? 'nothing'}, and the newest tester installer is ${built}. Run node scripts/publish_tester_latest.js.`);
    process.exit(1);
  }
  console.log(`latest.json is current (Windows ${latest.windows.version ?? 'none'}${latest.windows.downloadUrl ? '' : ', no link yet'}).`);
  process.exit(0);
}

if (built) latest.windows.version = built;
const windowsUrl = valueOf('--windows-url');
if (windowsUrl) latest.windows.downloadUrl = windowsUrl;
const androidUrl = valueOf('--android-url');
const runtime = valueOf('--runtime');
if (androidUrl) latest.android.downloadUrl = androidUrl;
if (runtime) {
  latest.android.runtime = runtime;
  const found = /APP_VERSION = '([\d.]+)'/.exec(fs.readFileSync(path.join(ROOT, 'constants', 'version.ts'), 'utf8'));
  latest.android.version = found ? found[1] : null;
}

fs.writeFileSync(LATEST, `${JSON.stringify(latest, null, 2)}\n`);
console.log(JSON.stringify(latest, null, 2));
if (!latest.windows.downloadUrl) console.log('\nNo Windows link yet, so no tester is told. Add one with --windows-url.');
console.log('\nPut it on the site: cd docs/app-links && npx wrangler deploy');
