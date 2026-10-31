// The tester version's icon: the same mark in inverted colours (tester plan
// T1, 2026-10-31), so Lifestead and Lifestead Test are told apart at a
// glance on a phone that has both. Transparency is kept as it is; only the
// colours turn over. app.config.js points the test variant at these files.
//
//   node scripts/make_tester_icons.js

const path = require('path');
const sharp = require('sharp');

const BRAND = path.join(__dirname, '..', 'assets', 'brand');
const PAIRS = [
  ['icon.png', 'icon-test.png'],
  ['android-icon-foreground.png', 'android-icon-foreground-test.png'],
];

(async () => {
  for (const [from, to] of PAIRS) {
    await sharp(path.join(BRAND, from)).negate({ alpha: false }).png().toFile(path.join(BRAND, to));
    console.log(`${from} -> ${to}`);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
