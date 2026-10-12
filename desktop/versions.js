// Versions side by side, P34 (2026-10-12). Direct request: "It must be a
// completely working version for each, not screen shots, with each
// versions settings switched on ... If they can be side by side where
// applicable, that would be awesome."
//
// Each version is this same desktop app started a second time with
// --lifestead-version=<key>. That copy keeps its records in a folder of its
// own, %APPDATA%/lifestead-versions/<key>, so nothing done in one version
// reaches another or the person's own records in lifestead-desktop, and the
// app inside reads which version it is (versions:current) and switches that
// version's settings on. The picker is a third kind of start,
// --lifestead-versions, a small window listing every version that opens
// the ones ticked, tiled across the screen.
//
// Every copy is its own process with its own folder, so Electron's
// single-instance lock (taken per folder) is what makes a second launch of
// the same version, or of the picker, bring the open one forward instead.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const VERSION_FLAG = '--lifestead-version=';
const PICKER_FLAG = '--lifestead-versions';
const BOUNDS_FLAG = '--lifestead-bounds=';
const FOLDER_NAME = 'lifestead-versions';
const STARTED_FILE = 'version-started.json';

// The versions, in the order the picker lists them. `tier` is the
// entitlement the copy runs at (lib/entitlement.ts). `start` is what the
// copy opens on: 'fresh' is the first run anybody gets, with nothing in it.
// A version whose `missing` is set has nothing built yet that would make it
// differ from another, so the picker says what is missing and does not open
// a copy that would only pretend to be it.
const VERSIONS = [
  {
    key: 'free',
    label: 'Free',
    tier: 'free',
    start: 'fresh',
    about: 'Everything on the Free side of the board. Paid lenses show their key and the page saying what the plan gives.',
  },
  {
    key: 'individual',
    label: 'Individual',
    tier: 'paid',
    start: 'fresh',
    about: 'Everything Free has, with every paid lens open.',
  },
  {
    key: 'first-run-condition',
    label: 'First run, with a condition',
    tier: 'free',
    start: 'fresh',
    about: 'A new person on Free who picks one or more conditions in the interview.',
  },
  {
    key: 'first-run-day',
    label: 'First run, here for my day',
    tier: 'free',
    start: 'fresh',
    about: 'A new person on Free who answers "I\'m here for my day, not a condition" in the interview.',
  },
  {
    key: 'partner',
    label: 'Partner',
    tier: 'paid',
    start: 'fresh',
    missing: 'Partner sharing between two people is not built yet, so a Partner copy would show exactly what Individual shows.',
  },
  {
    key: 'household',
    label: 'A Household seat',
    tier: 'free',
    start: 'fresh',
    missing: 'The household viewer (shared meal plan, shopping list and Trends summary, read only) is not built yet.',
  },
  {
    key: 'guardian',
    label: 'A Guardian child',
    tier: 'paid',
    start: 'fresh',
    missing: "A parent's link to a child's records is not built yet.",
  },
  {
    key: 'caregiver',
    label: 'A Caregiver',
    tier: 'free',
    start: 'fresh',
    missing: 'The caregiver link (invitation, consent area by area, one person kept apart from another) is not built yet.',
  },
];

function argValue(argv, flag) {
  const hit = argv.find((arg) => arg.startsWith(flag));
  return hit ? hit.slice(flag.length) : null;
}

/** What kind of start this is: the person's own app, one version, or the picker. */
function startKind(argv) {
  if (argv.includes(PICKER_FLAG)) return { kind: 'picker' };
  const key = argValue(argv, VERSION_FLAG);
  const version = key ? VERSIONS.find((entry) => entry.key === key && !entry.missing) : null;
  if (version) return { kind: 'version', version };
  return { kind: 'own' };
}

function versionsRoot(appDataPath) {
  return path.join(appDataPath, FOLDER_NAME);
}

function folderFor(appDataPath, key) {
  return path.join(versionsRoot(appDataPath), key);
}

function pickerFolder(appDataPath) {
  return path.join(versionsRoot(appDataPath), '_picker');
}

/** x,y,width,height from --lifestead-bounds, or null. */
function boundsFrom(argv) {
  const value = argValue(argv, BOUNDS_FLAG);
  if (!value) return null;
  const parts = value.split(',').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  const [x, y, width, height] = parts;
  return { x, y, width, height };
}

/** The revision this build carries, written into web-build by build-web.js. */
function revision(webRoot) {
  try {
    return fs.readFileSync(path.join(webRoot, 'lifestead-version.txt'), 'utf8').trim();
  } catch {
    return null;
  }
}

/** When this version's copy was first started, and on which revision. */
function startedRecord(appDataPath, key) {
  try {
    return JSON.parse(fs.readFileSync(path.join(folderFor(appDataPath, key), STARTED_FILE), 'utf8'));
  } catch {
    return null;
  }
}

function noteStarted(appDataPath, key, currentRevision) {
  if (startedRecord(appDataPath, key)) return;
  const folder = folderFor(appDataPath, key);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(
    path.join(folder, STARTED_FILE),
    JSON.stringify({ startedAt: new Date().toISOString(), revision: currentRevision }),
  );
}

/** What the app inside a version's window is told about itself. */
function currentFor(appDataPath, version, currentRevision) {
  const started = startedRecord(appDataPath, version.key);
  return {
    key: version.key,
    label: version.label,
    tier: version.tier,
    revision: currentRevision,
    startedRevision: started ? started.revision : currentRevision,
  };
}

/** Every version with whether its copy has been started, for the picker. */
function listFor(appDataPath) {
  return VERSIONS.map((version) => {
    const started = version.missing ? null : startedRecord(appDataPath, version.key);
    return {
      key: version.key,
      label: version.label,
      about: version.about || null,
      missing: version.missing || null,
      tier: version.tier,
      started: started ? { at: started.startedAt, revision: started.revision } : null,
    };
  });
}

// The arguments that start this same app again: an installed app is its
// own executable, while `electron .` in development needs the app folder.
function relaunchArgs(app, extra) {
  return [...(process.defaultApp ? [app.getAppPath()] : []), ...extra];
}

function launch(app, extra) {
  const env = { ...process.env };
  // A copy started with this set would run as plain Node and open nothing.
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(process.execPath, relaunchArgs(app, extra), { detached: true, stdio: 'ignore', env });
  child.unref();
}

/** Opens the picker, or brings it forward when it is already open. */
function openPicker(app) {
  launch(app, [PICKER_FLAG]);
}

// Tiles the chosen versions across the screen's work area, each as wide as
// the phone-shaped window main.js opens at when there is room for that, and
// narrower, down to the window's smallest width, when there is not.
function tile(workArea, count, preferredWidth, minWidth) {
  const width = Math.max(minWidth, Math.min(preferredWidth, Math.floor(workArea.width / count)));
  const used = Math.min(workArea.width, width * count);
  const startX = workArea.x + Math.floor((workArea.width - used) / 2);
  const step = count > 1 ? Math.floor((used - width) / (count - 1)) : 0;
  return Array.from({ length: count }, (_unused, index) => ({
    x: startX + step * index,
    y: workArea.y,
    width,
    height: workArea.height,
  }));
}

/** Opens each version named, side by side. Unknown or unbuilt keys are skipped. */
function openVersions(app, workArea, keys, sizes) {
  const chosen = keys
    .map((key) => VERSIONS.find((entry) => entry.key === key && !entry.missing))
    .filter(Boolean);
  const places = tile(workArea, chosen.length, sizes.preferredWidth, sizes.minWidth);
  chosen.forEach((version, index) => {
    const place = places[index];
    launch(app, [
      `${VERSION_FLAG}${version.key}`,
      `${BOUNDS_FLAG}${place.x},${place.y},${place.width},${place.height}`,
    ]);
  });
  return chosen.length;
}

/** Empties a version's folder so it starts again from its first run. */
function startFresh(appDataPath, key) {
  const version = VERSIONS.find((entry) => entry.key === key && !entry.missing);
  if (!version) return { ok: false, reason: 'That version cannot be opened yet.' };
  const folder = folderFor(appDataPath, key);
  if (!fs.existsSync(folder)) return { ok: true };
  // Renamed aside first: Windows refuses to rename a folder while a file in
  // it is open, so a version still running is caught before anything of it
  // is deleted, rather than half way through.
  const aside = `${folder}.removing-${Date.now()}`;
  try {
    fs.renameSync(folder, aside);
  } catch {
    return { ok: false, reason: `Close the ${version.label} window first, then press Start Fresh again.` };
  }
  try {
    fs.rmSync(aside, { recursive: true });
  } catch {
    // Left aside under a name nothing reads; the version itself starts fresh.
  }
  return { ok: true };
}

module.exports = {
  VERSIONS,
  startKind,
  folderFor,
  pickerFolder,
  boundsFrom,
  revision,
  noteStarted,
  currentFor,
  listFor,
  openPicker,
  openVersions,
  startFresh,
  tile,
};
