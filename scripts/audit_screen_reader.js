#!/usr/bin/env node
// What a screen reader is told (build plan Q10 and Q35, 2026-11-24). Fails on:
//   1. a button with no name (scripts/audit_unnamed_controls.js);
//   2. a drawing (react-native-svg) that says nothing: not in SpokenFigure,
//      not labelled, and not in DECORATIVE with its reason;
//   3. a press handler on a raw Text or View, which no screen reader
//      announces as a button unless it says it is one;
//   4. a way for a button to miss the shared wrapper that announces it:
//      the swap undone, or a button taken from another library;
//   5. SpokenFigure given no words.
// Must stay at 0.
/* global __dirname */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const PRESSED = new Set(['Text', 'View', 'Image', 'Animated.View', 'Animated.Text']);

// Drawings with nothing to say, and who says it instead.
const DECORATIVE = {
  'components/ActiveRingCircle.tsx': 'A ring round an icon inside a named button.',
  'components/DigestConditionIcons.tsx': 'Icons beside the name they stand for.',
  'components/FlipCardIcon.tsx': 'An icon beside the words it stands for.',
  'components/FoodBuilderIcons.tsx': 'Icons beside the name they stand for.',
  'components/ProgressPicture.tsx': 'Decoration; what it is grown from is listed beside it.',
  'components/PurpleRibbonIcon.tsx': 'An icon beside the words it stands for.',
  'components/ScreenHeader.tsx': 'The artwork behind the page name.',
};
// Drawings that speak without SpokenFigure: what must be in the file.
const SPEAKS = {
  'components/BedLayoutSection.tsx': "'Plan of this area'",
  'components/BodyMap.tsx': 'accessibilityElementsHidden',
  'components/QrCode.tsx': 'accessibilityRole="image"',
  'components/StepTimerRing.tsx': 'accessibilityRole="timer"',
};

const findings = [];
const say = (file, line, what) => findings.push(`${file}${line ? `:${line}` : ''}  ${what}`);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry.name)) out.push(full);
  }
  return out;
}

for (const full of ['app', 'components'].flatMap((dir) => walk(path.join(ROOT, dir)))) {
  const file = path.relative(ROOT, full).replace(/\\/g, '/');
  const source = fs.readFileSync(full, 'utf8');
  const usesSvg = /from 'react-native-svg'/.test(source);
  if (usesSvg && !DECORATIVE[file]) {
    if (SPEAKS[file]) {
      if (!source.includes(SPEAKS[file])) say(file, 0, `no longer carries ${SPEAKS[file]}`);
    } else if (!/<SpokenFigure\b/.test(source)) say(file, 0, 'a drawing outside SpokenFigure');
  }
  if (!usesSvg && (DECORATIVE[file] || SPEAKS[file])) say(file, 0, 'listed here but draws nothing');
  if (/import\s*\{[^}]*\b(Pressable|TouchableOpacity|TouchableHighlight|RectButton|BorderlessButton)\b[^}]*\}\s*from\s*'(?!react-native')/.test(source)) {
    say(file, 0, "a button from a library other than 'react-native', which the shared wrapper never sees");
  }
  const tree = ts.createSourceFile(full, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lineOf = (node) => tree.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText();
      const attrs = node.attributes.properties.filter(ts.isJsxAttribute).map((a) => a.name.getText());
      const spread = node.attributes.properties.some(ts.isJsxSpreadAttribute);
      const attr = (name) => attrs.includes(name);
      if (PRESSED.has(tag) && attr('onPress') && !attr('accessibilityRole') && !spread) {
        say(file, lineOf(node), `a pressable <${tag}> with no accessibilityRole`);
      }
      if (tag === 'SpokenFigure' && !attr('words')) say(file, lineOf(node), 'SpokenFigure with no words');
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
}

const wrapper = fs.readFileSync(path.join(ROOT, 'components/voiceNamedControl.js'), 'utf8');
if (!/spokenProps\(props/.test(wrapper) || !/useSpokenElement\(own, props\)/.test(wrapper)) {
  say('components/voiceNamedControl.js', 0, 'no longer tells a screen reader what each button is');
}
const swap = fs.readFileSync(path.join(ROOT, 'components/reactNativeWithEditableText.js'), 'utf8');
for (const name of ['TouchableOpacity', 'TouchableHighlight', 'Pressable']) {
  if (!swap.includes(`${name}: () => voiceNamed(`)) say('components/reactNativeWithEditableText.js', 0, `${name} no longer goes through the wrapper`);
}

const names = spawnSync(process.execPath, [path.join(__dirname, 'audit_unnamed_controls.js'), '--list'], { encoding: 'utf8', cwd: ROOT });
if (!/^0 with no name\./m.test(names.stdout)) say('audit_unnamed_controls.js', 0, names.stdout.trim().split('\n').pop());

for (const line of findings) console.log(line);
console.log(`${findings.length} thing${findings.length === 1 ? '' : 's'} a screen reader cannot read.`);
process.exit(findings.length ? 1 : 0);
