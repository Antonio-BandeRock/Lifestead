// Which version of the computer app this installer is (tester plan T9,
// 2026-10-31).
//
// The tester installer is built with electron-builder-test.yml, which writes
// "lifesteadVariant": "test" into the packed package.json. It is read from
// there, so it is fixed when the installer is built and nothing the app
// later receives can change it. `npm start` reads APP_VARIANT instead, for
// trying the tester version from the source. An installer built without it
// is the developer's, which says nothing and reads as before.
const pkg = require('./package.json');

function readVariant() {
  const said = pkg.lifesteadVariant || process.env.APP_VARIANT || null;
  return said === 'test' || said === 'store' || said === 'dev' ? said : null;
}

const VARIANT = readVariant();

// Each version keeps its records in a folder of its own, so a tester version
// installed beside the developer's never opens the developer's records.
const DATA_FOLDERS = { test: 'lifestead-test', store: 'lifestead' };

module.exports = {
  VARIANT,
  dataFolderName: VARIANT ? DATA_FOLDERS[VARIANT] || null : null,
  title: VARIANT === 'test' ? 'Lifestead Test' : 'Lifestead',
  // Versions side by side (P34) is a developer tool.
  versionsAllowed: VARIANT !== 'test' && VARIANT !== 'store',
};
