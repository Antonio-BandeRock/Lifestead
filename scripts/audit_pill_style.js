#!/usr/bin/env node
// The one pill look holds (2026-10-28). constants/buttons.ts defines it:
// PILL and PILL_SMALL for a choice not chosen, PILL_ON laid over either for
// the chosen one, and PILL_TEXT / PILL_ON_TEXT for their words. Direct
// instruction: "Just like the buttons, we need to have a default pill button
// type, and it should match the default buttons."
//
// This check walks app/ and components/ and reports four ways a screen
// drifts back to a pill of its own:
//
//   1. a style named for a pill or chip that draws a box (a fill, a border,
//      a radius or padding) without spreading PILL, PILL_SMALL or PILL_ON;
//   2. a pill or chip text style that sets a colour without spreading
//      PILL_TEXT or PILL_ON_TEXT;
//   3. a style that spreads a PILL constant and retypes what it decides;
//   4. a call site that colours one of those styles inline,
//      style={[styles.pill, on && { backgroundColor: ... }]}.
//
// Must stay at 0. Usage: node scripts/audit_pill_style.js
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DIRS = ['app', 'components'];
const NAME = /(pill|Pill|chip|Chip)/;
const LAYOUT = /(Row|Rows|Wrap|Group|Lane|Area|Stack|Bar|Container|Strip|Scroll|Grid|List|Line|Gap|Spacer|Rail|Tight|Plain|Help|Taken|Border|^chips$|^cropChips$|^groupHeadingChip$)$/;
const BOX = /^(backgroundColor|borderRadius|borderWidth|borderColor|padding|paddingVertical|paddingHorizontal|paddingTop|paddingBottom|paddingLeft|paddingRight|elevation|shadowColor|shadowOpacity|shadowRadius|shadowOffset)$/;
const TEXT_RETYPED = /^(color|fontWeight)$/;

// A pill that is not a choice, or whose colour carries a meaning of its own.
const EXEMPT = {
  'components/DigestEntryDetail.tsx': {
    crossConditionPill: 'a label in the colour of the tab it names, not pressed',
    crossConditionPillText: 'its words',
  },
  'components/RecipeDepthReport.tsx': {
    verdictPill: 'a verdict, coloured by the verdict, not pressed',
    verdictPillText: 'its words',
  },
  'components/SeedsLens.tsx': { chip: 'a label, not pressed', chipText: 'its words' },
  'components/StoryReturnHost.tsx': { pill: 'the floating Back to Your Story button, a button rather than a choice', pillText: 'its words' },
  'components/MySafeFoodsView.tsx': {
    verdictPillSafeOn: 'safe, unsure and avoid each keep their status colour',
    verdictPillUnsureOn: 'as above',
    verdictPillAvoidOn: 'as above',
    verdictPillTextOn: 'words on those status colours',
  },
  'components/FoodLookup.tsx': {
    personalVerdictPill: 'a verdict badge, not pressed',
    personalVerdictPillText: 'its words',
  },
  'components/DigestCategoryLens.tsx': {
    matchTermPill: 'search words marked where they matched, not pressed',
    matchTermPillTitle: 'as above',
    matchTermPillBody: 'as above',
    matchTermPillMiss: 'as above',
    matchTermPillText: 'its words',
    matchTermPillTextTitle: 'its words',
    matchTermPillTextMiss: 'its words',
  },
  'components/RecipeDetailCard.tsx': { dietTagPill: 'a diet tag, not pressed', dietTagPillText: 'its words' },
  'components/DayTimeline.tsx': { nowPill: 'the now marker on the timeline, not pressed', nowPillText: 'its words' },
  'app/capture.tsx': { destPill: 'coloured by the tab the note goes to', destPillText: 'its words, in that colour' },
  'app/reconcile.tsx': { destPill: 'coloured by the tab the note goes to', destPillText: 'its words, in that colour' },
  'components/SetupCardShelves.tsx': { areaChip: 'tinted with the tab the card gives back to, not pressed', areaChipText: 'its words' },
  'app/(tabs)/index.tsx': {
    varietyChip: 'in the colour of Food, where the plants are counted',
    varietyChipTextPicked: 'its words on that colour',
    feelingTagChip: 'chosen in the colour of Signals, where the feeling is logged',
    tabPill: 'Low Stimulation and Make Report in the colour of the tab each leads to',
    tabPillText: 'its words',
    tabPillTextActive: 'its words on that colour',
  },
};

const hits = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.tsx?$/.test(e.name)) scan(f);
  }
}

function bodyAt(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return s.slice(open + 1, i);
  }
  return '';
}

function topLevelKeys(body) {
  const clean = body.replace(/\/\/[^\n]*/g, '');
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(clean.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(clean.slice(start));
  return parts.map((p) => (p.trim().match(/^([A-Za-z]+)\s*:/) || [])[1]).filter(Boolean);
}

function scan(file) {
  const s = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (rel === 'constants/buttons.ts') return;
  const lineOf = (i) => s.slice(0, i).split('\n').length;
  const exempt = EXEMPT[rel] || {};
  const shared = new Set();

  for (const m of s.matchAll(/\n\s+([A-Za-z]+):\s*\{/g)) {
    const key = m[1];
    if (!NAME.test(key) || LAYOUT.test(key) || exempt[key]) continue;
    const body = bodyAt(s, m.index + m[0].length - 1);
    const keys = topLevelKeys(body);
    const isText = /Text|Label/.test(key);
    const spread = body.match(/\.\.\.(PILL(?:_SMALL|_ON|_TEXT|_ON_TEXT)?)\b/);
    const at = `${rel}:${lineOf(m.index + 1)} ${key}`;
    if (spread) {
      shared.add(key);
      const textSpread = /TEXT$/.test(spread[1]);
      const retyped = keys.filter((k) => (textSpread ? TEXT_RETYPED : BOX).test(k));
      if (retyped.length) hits.push(`${at} spreads ${spread[1]} and retypes ${retyped.join(', ')}`);
    } else if (isText) {
      if (keys.includes('color')) hits.push(`${at} colours pill text without PILL_TEXT or PILL_ON_TEXT`);
    } else if (keys.some((k) => BOX.test(k))) {
      hits.push(`${at} draws a pill without PILL, PILL_SMALL or PILL_ON`);
    }
  }

  for (const key of shared) {
    const re = new RegExp('styles\\.' + key + '\\b([^\\]\\)]*?)\\]', 'g');
    for (const m of s.matchAll(re)) {
      const inl = m[1].match(/\{\s*(backgroundColor|borderColor|color)\s*[:},]/);
      if (inl) hits.push(`${rel}:${lineOf(m.index)} styles.${key} given ${inl[1]} inline`);
    }
  }
}

for (const d of DIRS) walk(path.join(ROOT, d));

if (hits.length) {
  for (const h of hits) console.log(h);
  console.log(`\n${hits.length} pill style problem${hits.length === 1 ? '' : 's'}. Use the shared look in constants/buttons.ts.`);
  process.exit(1);
}
console.log('Pill style: 0 problems.');
