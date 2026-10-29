#!/usr/bin/env node
// The one button look holds (2026-10-28). constants/buttons.ts defines it:
// BUTTON_PRIMARY and BUTTON_SECONDARY, each with a COMPACT size, and their
// two text styles. This check walks app/ and components/ and reports three
// ways a screen drifts back to a look of its own:
//
//   1. a style called primaryButton or secondaryButton (or their Text) that
//      does not spread one of the shared constants;
//   2. a style that spreads a BUTTON_* constant and then retypes what the
//      constant decides: the fill, the border, the radius or the padding
//      (BUTTON_*_TEXT: the colour);
//   3. a call site that puts a fill or border colour beside one of those
//      styles inline, style={[styles.x, { backgroundColor: ... }]}.
//
// Must stay at 0. Usage: node scripts/audit_button_style.js
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DIRS = ['app', 'components'];
const NAMED = /^(primaryButton|secondaryButton)(Text)?$/;
const BOX_RETYPED = /^(backgroundColor|borderRadius|borderWidth|borderColor|padding|paddingVertical|paddingHorizontal|paddingTop|paddingBottom|paddingLeft|paddingRight|elevation|shadowColor|shadowOpacity|shadowRadius|shadowOffset)$/;
const TEXT_RETYPED = /^(color|fontWeight)$/;

const hits = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.tsx?$/.test(e.name)) scan(f);
  }
}

// The body of the object literal opening at s[open] === '{'.
function bodyAt(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return s.slice(open + 1, i);
  }
  return '';
}

// Property names at the top level of an object body.
function topLevelKeys(body) {
  const keys = [];
  let depth = 0;
  let start = 0;
  const parts = [];
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  for (const p of parts) {
    const m = p.replace(/\/\/[^\n]*/g, '').trim().match(/^([A-Za-z]+)\s*:/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

function scan(file) {
  const s = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const lineOf = (i) => s.slice(0, i).split('\n').length;
  const shared = new Set();

  for (const m of s.matchAll(/\n\s+([A-Za-z]+):\s*\{/g)) {
    const key = m[1];
    const open = m.index + m[0].length - 1;
    const body = bodyAt(s, open);
    const spread = body.match(/\.\.\.(BUTTON_(PRIMARY|SECONDARY)(_COMPACT)?(_TEXT)?)\b/);
    if (spread) {
      shared.add(key);
      const isText = Boolean(spread[4]);
      const retyped = topLevelKeys(body).filter((k) => (isText ? TEXT_RETYPED : BOX_RETYPED).test(k));
      if (retyped.length) hits.push(`${rel}:${lineOf(m.index + 1)} ${key} spreads ${spread[1]} and retypes ${retyped.join(', ')}`);
    } else if (NAMED.test(key)) {
      hits.push(`${rel}:${lineOf(m.index + 1)} ${key} does not spread a BUTTON_* constant from constants/buttons.ts`);
    }
  }

  for (const key of shared) {
    const re = new RegExp('styles\\.' + key + '\\b\\s*,\\s*\\{\\s*(backgroundColor|borderColor|color)\\s*:', 'g');
    for (const m of s.matchAll(re)) hits.push(`${rel}:${lineOf(m.index)} styles.${key} given ${m[1]} inline`);
  }
}

for (const d of DIRS) walk(path.join(ROOT, d));

if (hits.length) {
  for (const h of hits) console.log(h);
  console.log(`\n${hits.length} button style problem${hits.length === 1 ? '' : 's'}. Use the shared look in constants/buttons.ts.`);
  process.exit(1);
}
console.log('Button style: 0 problems.');
