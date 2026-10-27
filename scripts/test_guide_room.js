// Checks where the guide strips sit (lib/guideRoom.ts): that they stack from
// the top in one fixed order, that a strip not showing takes no room, that
// the screen is pushed down by exactly what the strips take, and that a strip
// going away gives its room back.
//
// Pure, so it runs here rather than needing a phone. Exits non-zero on any
// failure.

// eslint-config-expo lints this repo as app code, which has no __dirname.
// This is a plain Node script run with node, so it does.
/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(relPath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, () => {
    throw new Error('lib/guideRoom.ts must stay free of runtime imports');
  });
  return module.exports;
}

const room = load('lib/guideRoom.ts');
const { GUIDE_GAP } = room;

let failures = 0;
function check(name, actual, expected) {
  if (actual === expected) return;
  failures += 1;
  console.log(`FAIL ${name}: expected ${expected}, got ${actual}`);
}

check('no strips, no room', room.guideRoomHeight(), 0);
check('first slot starts at 0', room.guideSlotOffset('walk'), 0);

let notified = 0;
const stop = room.subscribeGuideRoom(() => {
  notified += 1;
});

room.reportGuideHeight('setup', 80);
check('setup alone starts at 0', room.guideSlotOffset('setup'), 0);
check('setup alone room', room.guideRoomHeight(), GUIDE_GAP + 80 + GUIDE_GAP);
check('return sits under setup', room.guideSlotOffset('return'), 80 + GUIDE_GAP);

room.reportGuideHeight('walk', 50.2);
check('walk rounds up and goes first', room.guideSlotOffset('walk'), 0);
check('setup moves under walk', room.guideSlotOffset('setup'), 51 + GUIDE_GAP);
check('both rooms', room.guideRoomHeight(), GUIDE_GAP + 51 + GUIDE_GAP + 80 + GUIDE_GAP);

const before = notified;
room.reportGuideHeight('walk', 51);
check('same height does not notify', notified, before);

room.reportGuideHeight('walk', 0);
check('walk gone gives its room back', room.guideSlotOffset('setup'), 0);
check('room after walk gone', room.guideRoomHeight(), GUIDE_GAP + 80 + GUIDE_GAP);

room.reportGuideHeight('setup', 0);
check('all gone, no room', room.guideRoomHeight(), 0);
check('nothing left in use', room.guideHeightsNow().size, 0);
check('listeners told of each change', notified, 4);

stop();
room.reportGuideHeight('tour', 10);
check('unsubscribed listener not told', notified, 4);
room.reportGuideHeight('tour', 0);

check('order is fixed', room.GUIDE_SLOT_ORDER.join(','), 'walk,tutorial,tour,setup,return');

if (failures > 0) {
  console.log(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log('All guide room checks passed.');
