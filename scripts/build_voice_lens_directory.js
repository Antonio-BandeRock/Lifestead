// Writes lib/voiceLensDirectory.ts: every lens on every tab, for Voice
// Control (1.0.66.26). Direct instruction, 2026-10-10: "Voice Control should
// be total ability to anything in the app." A tab's lenses only tell Voice
// Control about themselves while that tab is drawn, so "open Horticulture"
// said on Home needs a list of the lenses everywhere else. Each tab keeps
// its lens list in its own screen file; this reads them from the source
// rather than having somebody copy them, and --check (run by
// scripts/test_voice_control.js) fails when a lens has been added, renamed
// or removed since the file was written.
//
//   node scripts/build_voice_lens_directory.js          writes the file
//   node scripts/build_voice_lens_directory.js --check  exits 1 when stale

// eslint-config-expo lints this repo as app code, which has no __dirname.
/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'lib', 'voiceLensDirectory.ts');

// Each tab: where its lens list lives, and the route parameter that opens a
// lens on it.
const TABS = [
  { path: '/', file: 'app/(tabs)/index.tsx', list: 'HOME_LENS_DESTINATIONS', order: 'HOME_LENS_ORDER', param: 'openHomeSection' },
  { path: '/food', file: 'app/(tabs)/food.tsx', list: 'FOOD_LENSES', param: 'openFoodLens' },
  { path: '/schedule', file: 'app/(tabs)/schedule.tsx', list: 'LENSES', param: 'openScheduleLens' },
  { path: '/log', file: 'app/(tabs)/log.tsx', list: 'LENSES', param: 'openSignalsLens' },
  { path: '/insights', file: 'app/(tabs)/insights.tsx', list: 'LENSES', param: 'openInsightsLens' },
  { path: '/trends', file: 'app/(tabs)/trends.tsx', list: 'TRENDS_LENSES', param: 'openTrendsLens' },
  { path: '/reports', file: 'lib/reportKinds.ts', list: 'REPORT_KINDS', param: 'openReportsLens' },
  { path: '/garden', file: 'app/(tabs)/garden.tsx', list: 'GARDEN_LENSES', param: 'openGardenLens' },
  { path: '/interests', file: 'app/(tabs)/interests.tsx', list: 'LENSES', param: 'openInterestsLens' },
  { path: '/life', file: 'app/(tabs)/life.tsx', list: 'LIFE_LENSES', param: 'openLifeLens' },
];

function parse(relPath) {
  const text = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  return ts.createSourceFile(relPath, text, ts.ScriptTarget.ES2020, true, relPath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

function topLevelConsts(source) {
  const found = new Map();
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const decl of statement.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && decl.initializer) found.set(decl.name.text, decl.initializer);
    }
  }
  return found;
}

function unwrap(node) {
  while (node && (ts.isAsExpression(node) || ts.isSatisfiesExpression?.(node) || ts.isParenthesizedExpression(node))) node = node.expression;
  return node;
}

function stringOf(node, consts, where) {
  node = unwrap(node);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isIdentifier(node) && consts.has(node.text)) return stringOf(consts.get(node.text), consts, where);
  throw new Error(`${where}: a lens label is not plain text (${node.getText()})`);
}

function prop(object, name) {
  for (const p of object.properties) {
    if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === name) return p.initializer;
  }
  return null;
}

function lensesOf(tab) {
  const source = parse(tab.file);
  const consts = topLevelConsts(source);
  const list = unwrap(consts.get(tab.list));
  if (!list) throw new Error(`${tab.file}: ${tab.list} was not found`);
  const lenses = [];
  if (ts.isArrayLiteralExpression(list)) {
    for (const element of list.elements) {
      const item = unwrap(element);
      if (!ts.isObjectLiteralExpression(item)) throw new Error(`${tab.file}: ${tab.list} holds something other than a lens`);
      const key = prop(item, 'key');
      const label = prop(item, 'label');
      if (!key || !label) throw new Error(`${tab.file}: a lens in ${tab.list} has no key or label`);
      lenses.push({ key: stringOf(key, consts, tab.file), label: stringOf(label, consts, tab.file) });
    }
  } else if (ts.isObjectLiteralExpression(list)) {
    // Home: a map of section to destination, in the order of HOME_LENS_ORDER.
    const byKey = new Map();
    for (const p of list.properties) {
      if (!ts.isPropertyAssignment(p) || !ts.isObjectLiteralExpression(p.initializer)) continue;
      const label = prop(p.initializer, 'label');
      if (label) byKey.set(p.name.text, stringOf(label, consts, tab.file));
    }
    const order = unwrap(consts.get(tab.order));
    if (!order || !ts.isArrayLiteralExpression(order)) throw new Error(`${tab.file}: ${tab.order} was not found`);
    for (const element of order.elements) {
      const key = stringOf(element, consts, tab.file);
      if (byKey.has(key)) lenses.push({ key, label: byKey.get(key) });
    }
  } else {
    throw new Error(`${tab.file}: ${tab.list} is not a list`);
  }
  return lenses;
}

function renderSafe() {
  // Single quotes in the file, but a label holding one (Today's Meals) keeps
  // double quotes, which JSON.stringify already gave it.
  const lines = [];
  for (const tab of TABS) {
    for (const lens of lensesOf(tab)) {
      const q = (s) => (s.includes("'") ? JSON.stringify(s) : `'${s}'`);
      lines.push(`  { tab: ${q(tab.path)}, param: ${q(tab.param)}, key: ${q(lens.key)}, label: ${q(lens.label)} },`);
    }
  }
  return [
    '// Every lens on every tab, for Voice Control (1.0.66.26). WRITTEN BY',
    "// scripts/build_voice_lens_directory.js from each tab's lens list; do not",
    '// edit by hand. Run that script after adding, renaming or removing a lens,',
    '// and scripts/test_voice_control.js fails until it has been.',
    '',
    'export type VoiceLensPlace = { tab: string; param: string; key: string; label: string };',
    '',
    'export const VOICE_LENS_DIRECTORY: VoiceLensPlace[] = [',
    ...lines,
    '];',
    '',
  ].join('\n');
}

const wanted = renderSafe();
if (process.argv.includes('--check')) {
  const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
  if (now !== wanted) {
    console.log('lib/voiceLensDirectory.ts is out of date. Run node scripts/build_voice_lens_directory.js');
    process.exit(1);
  }
  console.log('lib/voiceLensDirectory.ts matches every tab.');
} else {
  fs.writeFileSync(OUT, wanted);
  console.log(`Wrote ${OUT} with ${wanted.split('\n').filter((l) => l.startsWith('  {')).length} lenses.`);
}
