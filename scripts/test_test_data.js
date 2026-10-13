// Checks the desktop's Test data copy after it has filled itself
// (lib/testDataGenerator.ts): every table a person writes to has rows, so
// testing, reports and the tutorial screenshots have something to show.
//
//   node scripts/test_test_data.js [path to a copy] [--counts]
//
// Open the Test data version once first (from the versions window), let it
// fill and reload, then run this. It reads the copy and never writes.
//
// A table left empty on purpose goes in EXPECTED_EMPTY with its reason.

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const EXPECTED_EMPTY = {
  // Kept by the app, not entered by a person.
  achievement_criteria_progress: 'worked out by the app',
  activity_log: 'written by the app as things happen',
  daily_nutrient_totals_cache: 'a cache',
  dev_notes: 'Tell Claude notes, developer tools only',
  media_cache_use: 'a cache',
  peer_sync_base: 'sync between two people',
  sync_change_log: 'sync log, device-local',
  report_history: 'filled when a report is made',
  recall_checks: 'filled by a recall lookup',
  recalls: 'filled by a recall lookup',
  daily_weather: 'filled by a weather lookup',
  garden_reading_hours: 'filled from device readings',
  garden_device_samples: 'filled by a sensor',
  garden_gateway_polling: 'a sensor gateway',
  garden_gateway_sensors: 'a sensor gateway',
  garden_gateways: 'a sensor gateway',
  dose_watch_consent: 'between two people',
  peer_dose_alerts: 'between two people',
  peer_dose_watch: 'between two people',
  peer_photo_out: 'between two people',
  peer_photos: 'between two people',
  connections: 'between two people',
  shared_recipes: 'between two people',
  partner_meal_plan_slots: 'between two people',
  household_meal_calendar: 'between two people',
  household_barcodes: 'between two people',
  harvest_shares_received: 'between two people',
  harvest_disposition_receipts: 'a receipt sent to another person',
  // Need a file, a camera or a scan, which a generator cannot make.
  media: 'needs a photo or recording file',
  recordings: 'needs a recording file',
  photo_series: 'needs photos',
  meal_photo_drafts: 'needs a photo',
  medicine_labels: 'needs a photo of a label',
  pending_barcode_scans: 'needs a barcode scan',
  scanned_products: 'needs a barcode scan',
  scanned_product_nutrients: 'needs a barcode scan',
  scanned_product_prices: 'needs a barcode scan',
  recipe_imports: 'needs a recipe page',
  microbiome_tests: 'needs a test report',
  microbiome_results: 'needs a test report',
  health_records: 'needs an imported record',
  // Not this person.
  cycle_days: 'the test person is a man',
  treatment_injection: 'no injected medicine',
  dose_sites: 'no injected medicine',
  treatment_taper_steps: 'no tapering medicine',
  // Lists a person extends only when the built-in list falls short.
  custom_checkin_tags: 'built-in tags cover the test person',
  custom_exercises: 'library exercises cover the workout',
  custom_flare_contributors: 'built-in causes cover the test person',
  curious_about_conditions: 'optional list',
  garden_custom_terms: 'built-in terms cover the garden',
  garden_spaces: 'built-in spaces cover the garden',
  routine_occasions: 'built-in occasions cover the routines',
  grocery_store_aisles: 'optional store layout',
  grocery_store_placements: 'optional store layout',
  grocery_stores: 'optional store layout',
};

const appData = process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming');
const fileArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
const file = fileArg || path.join(appData, 'lifestead-versions', 'test-data', 'SQLite', 'inside_story.db');
if (!fs.existsSync(file)) {
  console.log(`No Test data copy at ${file}. Open the Test data version once, let it fill, then run this again.`);
  process.exit(1);
}

const db = new DatabaseSync(file, { readOnly: true });
const filled = db.prepare("SELECT value FROM app_meta WHERE key = 'test_data_filled'").get();
if (!filled) {
  console.log('The Test data copy has not finished filling. Open it and wait for the reload.');
  process.exit(1);
}

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((row) => row.name);
const empty = [];
const counts = [];
for (const name of tables) {
  const { c } = db.prepare(`SELECT COUNT(*) AS c FROM "${name}"`).get();
  counts.push(`${name} ${c}`);
  if (c === 0 && !(name in EXPECTED_EMPTY)) empty.push(name);
}
const stale = Object.keys(EXPECTED_EMPTY).filter((name) => !tables.includes(name));

console.log(`Filled ${filled.value}. ${tables.length} tables.`);
if (process.argv.includes('--counts')) console.log(counts.join('\n'));
if (stale.length > 0) console.log(`In EXPECTED_EMPTY but no longer a table: ${stale.join(', ')}`);
if (empty.length > 0) {
  console.log(`Left empty, with no reason written down (${empty.length}):\n  ${empty.join('\n  ')}`);
  process.exit(1);
}
console.log('Every table a person writes to has rows.');
