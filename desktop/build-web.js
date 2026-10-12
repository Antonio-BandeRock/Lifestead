// Exports the app for the web target into desktop/web-build/ with the
// desktop flag set, which is what turns on the module redirects in
// ../metro.config.js (expo-sqlite to the Electron bridge, the reference
// database left out of the bundle, phone-only natives stubbed). Run from
// anywhere: `node desktop/build-web.js` or `npm run export` in desktop/.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const outputDir = path.join(__dirname, 'web-build');

fs.rmSync(outputDir, { recursive: true, force: true });

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['expo', 'export', '-p', 'web', '--output-dir', outputDir],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, LIFESTEAD_DESKTOP: '1', CI: '1' },
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const indexFile = path.join(outputDir, 'index.html');
if (!fs.existsSync(indexFile)) {
  console.error(`export finished without ${indexFile}`);
  process.exit(1);
}
// The revision this build carries, read by versions.js for the versions
// picker and the bar at the top of each version (P34). The desktop's own
// package version moves rarely, so the app's version is written beside it.
const versionSource = fs.readFileSync(path.join(projectRoot, 'constants', 'version.ts'), 'utf8');
const versionMatch = /APP_VERSION\s*=\s*['"]([^'"]+)['"]/.exec(versionSource);
if (versionMatch) fs.writeFileSync(path.join(outputDir, 'lifestead-version.txt'), versionMatch[1]);

console.log(`web export ready in ${outputDir}`);
