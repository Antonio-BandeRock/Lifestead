// Copies the Google Drive desktop client into this folder for a build
// (1.0.80.6). The file holds a client secret, so it lives in the backups
// folder and in the installer, never in git (.gitignore lists the copy).
// A machine without the backups folder still builds, with Google Drive
// saying the installer was built without it.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SOURCE = path.join(
  os.homedir(),
  'OneDrive',
  'Desktop',
  'AppProject',
  '_backups',
  'google-oauth',
  'lifestead-windows-desktop.json',
);
const TARGET = path.join(__dirname, 'google-oauth-desktop.json');

if (fs.existsSync(SOURCE)) {
  fs.copyFileSync(SOURCE, TARGET);
  console.log('Google Drive client copied in.');
} else {
  if (!fs.existsSync(TARGET)) fs.writeFileSync(TARGET, '{}');
  console.warn('No Google Drive client at ' + SOURCE + '; this installer will say Google Drive is not set up.');
}
