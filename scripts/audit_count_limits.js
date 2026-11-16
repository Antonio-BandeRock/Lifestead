#!/usr/bin/env node
// A person's records are read by their dates, never by how many there are
// (direct instruction, 2026-11-15: "why is there a limit on any collection of
// information? Should it collect forever and always be accessible without a
// limitation?"). A list function that reads records defaults to no count
// (SQLite reads LIMIT -1 as no limit), and a caller reading a range or a whole
// history passes none.
//
// This finds three shapes that cap a read by a count:
//   1. an exported async function whose `limit` defaults to a number above 1;
//   2. a SQL `LIMIT n` with n above 1;
//   3. a call passing a count above 1, as `limit: n` or as a bare number to a
//      list function that takes one.
// Anything intended goes in ALLOWED with its reason: the newest one, a
// handful of choices offered as chips, a search result, a preview whose full
// list is one tap away, or a list that pages with Show more. Exit 1 on
// anything not allowed.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIRS = ['app', 'components', 'lib', 'hooks'];
const SKIP_FILES = new Set(['lib/testDataGenerator.ts']);

// file -> { snippet: reason }. A finding is allowed when its line contains
// the snippet.
const ALLOWED = {
  'lib/db.ts': {
    'searchReferenceFoodNames(': 'Search results over the reference foods, not a person\'s records.',
    'limit = 15,': 'Search results over the reference foods, not a person\'s records.',
    'limit = 100,': 'Search results over the reference foods, not a person\'s records.',
    'listSafeFoods(category: string, limit = 200': 'Reference foods offered for a category, not a person\'s records.',
    'limit = 8,': 'listFavorites: a few favourites offered as choices; every favourite is listed on Food.',
    'listRecentEatenOutPlaces(limit = 6)': 'Place names offered as chips; every meal keeps its place.',
    'ORDER BY eaten_at DESC LIMIT 200': 'Recent eaten-out places read to offer six as chips.',
    'listRecentDistinctMeals(limit = 8': 'Log Again offers a few recent meals; every meal is in Past Meals.',
    'listUpcomingGardenTasks(limit = 20)': 'Upcoming tasks shown as a preview; every task is listed in Garden.',
    'searchScannedProducts(query: string, limit = 30)': 'Search results; every scanned product is listed.',
  },
  'lib/digest/index.ts': {
    'limit = 60': 'Search results over the reading, not a person\'s records.',
  },
  'lib/eatenOut.ts': { 'limit = 6': 'Chips offered from places already used.' },
  'lib/eatingVariety.ts': { 'limit = 3': 'A few suggestions.', 'limit = 8': 'The top repeats named in a sentence.' },
  'lib/mealVariety.ts': { 'limit = 8': 'The top repeats named in a sentence.', 'limit = 3': 'A few suggestions.' },
  'lib/packagedSwap.ts': { 'limit = 4,': 'A few swaps suggested.', 'limit = 6': 'A few swaps suggested.' },
  'lib/recipeImportDb.ts': { 'limit = 8': 'Candidate matches for an imported line.' },
  'lib/reportHistory.ts': { 'limit = 6': 'Earlier names offered as chips.' },
  'lib/whereIsIt.ts': { 'limit = 6': 'Places offered as chips.' },
  'lib/whereIsItDb.ts': {
    'listUsedPlaces(limit = 8)': 'Places offered as chips; every item keeps its place.',
    'LIMIT 200': 'Recent places read to offer eight as chips.',
  },
  'lib/checkinReminderDb.ts': { 'LIMIT 20': 'Meals since a time, read to word one reminder; nothing is listed from it.' },
  'app/(tabs)/index.tsx': {
    "limit: 60 })": 'Home reads the newest flares and reactions for the last two days and whether any exist; the full log is on Signals.',
    'listSymptomAssessments(1)': 'The newest one.',
  },
  'app/(tabs)/insights.tsx': { 'listSafeFoods(safeFoodCategory, 200': "Reference foods offered for a category, not a person's records." },
  'app/voice-log.tsx': { 'listRecentDistinctMeals(40)': 'Recent meals offered to match spoken words against; every meal is in Find a Meal.' },
  'components/MealBuilder.tsx': { 'listRecentDistinctMeals(200)': 'Recent meals offered as starting points; every meal is in Find a Meal.' },
  'components/MovementSection.tsx': { "listHealthRecords('exercise', 90)": 'Ninety days, a range of dates, not a count.' },
  'components/MySafeFoodsView.tsx': { 'listScheduledFoodNames(42)': 'Forty-two days ahead, a range of dates, not a count.' },
  'lib/insightsMoreDb.ts': { 'listCaptureNotes(365)': 'A year, a range of dates, not a count.' },
  'lib/visitQuestionsDb.ts': { 'listCaptureNotes(365)': 'A year of health notes to offer, a range of dates, not a count.' },
  'lib/medicineLabel.ts': { 'limit=10': "Search results from the openFDA label service, not a person's records." },
  'app/profile.tsx': { 'listSymptomAssessments(1)': 'The newest one.' },
  'app/(tabs)/log.tsx': {
    'useState(20)': 'The first page of a list with Show more.',
    'useState(30)': 'The first page of a list with Show more.',
    'listMeals(10)': 'Recent meals offered to tie a reaction to; the reaction saves without one.',
    'limit: 5 })': 'A food test\'s newest check-ins, read to see whether one is from today.',
  },
  'app/(tabs)/schedule.tsx': {
    "listFavorites(100, 'meal')": 'Favourites offered as choices for a planned meal.',
    'listMeals(100)': 'Recent meals offered as choices for a planned meal; every meal is in Past Meals.',
  },
  'components/FoodLookup.tsx': { 'listScannedProducts(20)': 'Recent scans offered as choices; every scan is listed and searchable.' },
};

const SQL_LIMIT = /\bLIMIT\s+(\d+)\b/g;
const DEFAULT_LIMIT = /\blimit(?:\??:\s*number)?\s*=\s*(\d+)/g;
const OBJECT_LIMIT = /\blimit:\s*(\d+)\b/g;
const CALL_COUNT = /\b(list[A-Z]\w*)\(([^()]*?,\s*)?(\d+)(\s*,[^()]*)?\)/g;

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'translations') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const findings = [];
for (const dir of DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const file of walk(abs, [])) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (SKIP_FILES.has(rel)) continue;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      const hits = [];
      for (const match of line.matchAll(SQL_LIMIT)) if (Number(match[1]) > 1) hits.push(match[0]);
      for (const match of line.matchAll(DEFAULT_LIMIT)) if (Number(match[1]) > 1) hits.push(match[0]);
      for (const match of line.matchAll(OBJECT_LIMIT)) if (Number(match[1]) > 1) hits.push(match[0]);
      for (const match of line.matchAll(CALL_COUNT)) if (Number(match[3]) > 1) hits.push(match[0]);
      if (hits.length === 0) return;
      const allowed = ALLOWED[rel] ?? {};
      if (Object.keys(allowed).some((snippet) => line.includes(snippet))) return;
      findings.push(`${rel}:${index + 1}  ${hits.join(' ; ')}\n    ${trimmed.slice(0, 160)}`);
    });
  }
}

if (findings.length > 0) {
  console.log(`${findings.length} read(s) capped by a count. Read by dates instead, or add to ALLOWED with a reason:\n`);
  console.log(findings.join('\n'));
  process.exit(1);
}
console.log('0 reads capped by a count.');
