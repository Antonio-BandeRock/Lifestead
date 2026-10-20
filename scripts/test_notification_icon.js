// Checks that the notification icon fills its square (1.0.72.2).
//
// Android draws a notification's small icon uncropped, so whatever empty
// margin the file carries shows in the status bar. On 2026-10-09 the mark
// changed from a solid open book to a thin spread figure, and the
// notification icon was still the themed launcher icon, which keeps its shape
// to 42% of the square for the launcher's crop. The figure came out a quarter
// the size of the icons beside it, and nothing caught it until it was on the
// phone after a rebuild, where only another rebuild could put it right.
// Direct instruction, 2026-10-20: "please don't cause that to happen again."
//
// So this reads the icon app.json actually hands expo-notifications and fails
// when its shape covers less than 80% of the square across its longer side,
// runs off the edge, or sits off centre. Run it with the brand script and
// before any eas build. Exits non-zero on any failure.

/* global __dirname */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const MIN_FILL = 0.8;
const MIN_MARGIN = 0.02;
const MAX_OFF_CENTRE = 0.05;

(async () => {
  const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const plugin = (app.expo.plugins || []).find((entry) => Array.isArray(entry) && entry[0] === 'expo-notifications');
  const iconPath = plugin && plugin[1] && plugin[1].icon;
  if (!iconPath) {
    console.log('FAIL app.json gives expo-notifications no icon');
    process.exit(1);
  }
  const file = path.join(ROOT, iconPath);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > 20) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
    }
  }
  const failures = [];
  if (x1 < 0) {
    failures.push('the icon is empty');
  } else {
    const fill = Math.max((x1 - x0 + 1) / info.width, (y1 - y0 + 1) / info.height);
    const margin = Math.min(x0 / info.width, y0 / info.height, (info.width - 1 - x1) / info.width, (info.height - 1 - y1) / info.height);
    const offX = Math.abs((x0 + x1) / 2 - (info.width - 1) / 2) / info.width;
    const offY = Math.abs((y0 + y1) / 2 - (info.height - 1) / 2) / info.height;
    console.log(`${iconPath}: shape fills ${(fill * 100).toFixed(0)}% of the square, nearest edge ${(margin * 100).toFixed(1)}%, off centre ${(Math.max(offX, offY) * 100).toFixed(1)}%`);
    if (fill < MIN_FILL) failures.push(`the shape fills ${(fill * 100).toFixed(0)}%, under ${MIN_FILL * 100}%, so it shows small in the status bar`);
    if (margin < MIN_MARGIN) failures.push('the shape runs to the edge and will be clipped');
    if (Math.max(offX, offY) > MAX_OFF_CENTRE) failures.push('the shape sits off centre');
  }
  for (const failure of failures) console.log('FAIL ' + failure);
  if (failures.length > 0) process.exit(1);
  console.log('ok');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
