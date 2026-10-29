#!/usr/bin/env node
/* global __dirname */
// Every sideways row goes through components/HorizontalScroll.tsx
// (2026-10-28), because on Windows there may be no touch screen: "The
// windows version can't assume the user will have a touch screen. All of
// the horizontal scrolls don't work." HorizontalScroll gives a row arrows
// and mouse dragging on the desktop and is a plain ScrollView on a phone.
//
// This finds a ScrollView, FlatList or SectionList given `horizontal`
// anywhere else. Must stay at 0. A row that already has buttons of its own
// for moving along goes in ALLOWED with the reason.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIRS = ['app', 'components', 'lib', 'hooks'];
const ALLOWED = {
  'components/HorizontalScroll.tsx': 'The row itself.',
  'components/LifeInSquares.tsx': 'A pager with Previous and Next buttons beside it, which are how a mouse moves it.',
};

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

// The opening tag from `start`, braces counted so `=>` and objects inside
// attributes do not end it early.
function openingTag(source, start) {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0 && source[i - 1] !== '=') return source.slice(start, i + 1);
  }
  return source.slice(start);
}

const findings = [];
for (const dir of DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const file of walk(abs, [])) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (ALLOWED[rel]) continue;
    const source = fs.readFileSync(file, 'utf8');
    const re = /<(ScrollView|FlatList|SectionList|Animated\.ScrollView|Animated\.FlatList)\b/g;
    let match;
    while ((match = re.exec(source))) {
      const tag = openingTag(source, match.index);
      if (/(^|\s)horizontal(\s|=\{true\}|\/?>)/.test(tag)) {
        const line = source.slice(0, match.index).split('\n').length;
        findings.push(`${rel}:${line}  <${match[1]} horizontal>, use HorizontalScroll`);
      }
    }
  }
}

for (const finding of findings) console.log(finding);
console.log(`audit_horizontal_scroll: ${findings.length} sideways rows not using HorizontalScroll`);
process.exit(findings.length ? 1 : 0);
