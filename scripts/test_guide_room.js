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

// At the bottom edge the order turns over, so the first strip sits nearest
// the footer and the others stack above it (2026-11-18).
room.reportGuideHeight('walk', 50);
room.reportGuideHeight('setup', 80);
check('top: walk first', room.guideSlotOffset('walk', undefined, 'top'), 0);
check('bottom: setup nearest the edge', room.guideSlotOffset('setup', undefined, 'bottom'), 0);
check('bottom: walk above setup', room.guideSlotOffset('walk', undefined, 'bottom'), 80 + GUIDE_GAP);
check('edge starts at the top', room.guideEdge(), 'top');
room.setGuideEdge('bottom');
check('edge moves to the bottom', room.guideEdge(), 'bottom');
check('default offset follows the edge', room.guideSlotOffset('setup'), 0);
room.setGuideEdge('top');
room.reportGuideHeight('walk', 0);
room.reportGuideHeight('setup', 0);

check('typing keeps the strips at the top', room.effectiveGuideEdge('bottom', true), 'top');
check('chosen edge when not typing', room.effectiveGuideEdge('bottom', false), 'bottom');
check('short drag stays', room.edgeAfterDrag('top', 40), 'top');
check('long drag down moves to the bottom', room.edgeAfterDrag('top', 90), 'bottom');
check('drag down at the bottom stays', room.edgeAfterDrag('bottom', 90), 'bottom');
check('long drag up moves to the top', room.edgeAfterDrag('bottom', -90), 'top');

// The footer never moves (Tony, 2026-11-18: "The footer is NEVER to be
// moved like that again for any screen."). The description box and the
// lens buttons are drawn inside each screen, so a bottom padding on a
// screen lifts them off the footer band. Neither navigator's screen style
// nor the guide room padding may carry one.
{
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  const guideRoomSource = read('components/GuideRoom.tsx');
  const paddingHook = guideRoomSource.slice(guideRoomSource.indexOf('export function useGuideRoomPadding'));
  const hookBody = paddingHook.slice(0, paddingHook.indexOf('\n}\n'));
  check('guide room padding never pads a screen bottom', /paddingBottom/.test(hookBody), false);
  const tabsLayout = read('app/(tabs)/_layout.tsx');
  const sceneStyle = tabsLayout.slice(tabsLayout.indexOf('sceneStyle'), tabsLayout.indexOf('sceneStyle') + 400);
  check('tab screens never padded at the bottom', /paddingBottom|marginBottom/.test(sceneStyle), false);
  const rootLayout = read('app/_layout.tsx');
  const contentStyleLine = rootLayout.split('\n').find((line) => line.includes('contentStyle:')) || '';
  check('stack screens never padded at the bottom', /paddingBottom|marginBottom/.test(contentStyleLine), false);
}

if (failures > 0) {
  console.log(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log('All guide room checks passed.');
