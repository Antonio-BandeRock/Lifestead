// Records the fresh curation (direct instruction, 2026-11-06) in one new table,
// food_curation. No existing table is changed: whole_food_classifications and
// the earlier review decisions stay as they were, and nothing here sets
// reviewed = 1. This database is not read by the app.
//
// Each raw row ends up with one status:
//
//   show     the row a person finds in the app, under listing_name
//   compare  meets the criteria but is hidden as equal to the row in
//            equal_to_raw_id, kept to compare what another country says
//   hide     does not meet the criteria
//
// A kept food with a USDA row shows the USDA row. A kept food with no USDA row
// shows the copy from the first source in SOURCE_ORDER.
//
// Usage: node curate-import.js <dir>            checks and reports, writes nothing
//        node curate-import.js <dir> --write    also writes the table

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SQLITE_EXE = process.env.SQLITE_EXE || 'C:/Users/TonyR/AppData/Local/Android/Sdk/platform-tools/sqlite3.exe';
const dbPath = process.env.UNIFIED_DB_PATH || path.resolve(__dirname, '..', 'unified_foods.sqlite');

const SOURCE_ORDER = ['USDA', 'Canada', 'UK', 'Australia', 'Germany', 'France', 'Norway', 'Sweden', 'Japan'];
const sourceRank = (src) => {
  const i = SOURCE_ORDER.findIndex((s) => src.startsWith(s));
  return i < 0 ? SOURCE_ORDER.length : i;
};

// What a rule-hidden row is, so counts by type cover the whole database. A reader
// gave every row it read a type; the rule pass only gave a reason for hiding.
const TYPE_FROM_REASON = {
  fast_food: 'prepared_dish', prepared_meal: 'prepared_dish', baked_goods: 'baked_goods', sweets: 'sweets_snacks',
  processed_meat: 'processed_meat', smoked: 'processed_meat', alcohol: 'alcohol', soft_drink: 'soft_drink',
  supplement: 'supplement', baby_food: 'baby_food', cereal_ready: 'grain', process_cheese: 'cheese', seed_oil: 'plant_oil',
};
const TYPE_FROM_NAME = [
  ['organ_meat', /\b(liver|kidneys?|heart|tongue|tripe|sweetbreads?|brain|giblets?|offal|lungs?|spleen)\b/i],
  ['veal', /\bveal\b/i],
  ['beef', /\b(beef|bison|buffalo)\b/i],
  ['pork', /\b(pork|ham|pig)\b/i],
  ['lamb_mutton', /\b(lamb|mutton|goat|sheep)\b/i],
  ['game', /\b(game|venison|deer|elk|moose|rabbit|hare|boar|reindeer|bear|horse|kangaroo|whale|seal)\b/i],
  ['poultry', /\b(chicken|turkey|duck|goose|quail|pheasant|poultry|guinea|ostrich|emu|squab|pigeon)\b/i],
  ['eggs', /\b(eggs?|yolk)\b/i],
  ['roe', /\b(roe|caviar)\b/i],
  ['shellfish', /\b(shrimp|prawns?|crab|lobster|clams?|mussels?|oysters?|scallops?|squid|octopus|cuttlefish|mollusks?|crustaceans?|crayfish)\b/i],
  ['fish', /\b(fish|redfish|ling|sheepshead|salmon|trout|tuna|cod|herring|mackerel|sardines?|anchov\w+|eel|halibut|haddock|pollock|sole|perch|pike|carp|seabream|bass|snapper|shark|ray|swordfish|plaice|hake|whiting|tilapia|catfish)\b/i],
  ['seaweed', /\b(seaweed|algae|kelp|nori|wakame|kombu)\b/i],
  ['cheese', /\b(cheese|cheddar|gouda|brie|camembert|parmesan|mozzarella|feta|edam|ricotta)\b/i],
  ['cultured_dairy', /\b(yogh?urt|yogourt|kefir|skyr|quark|sour cream|buttermilk)\b/i],
  ['butter_animal_fat', /\b(butter|ghee|lard|tallow)\b/i],
  ['milk_cream', /\b(milk|cream|whey)\b/i],
  ['plant_oil', /\b(oil|margarine|shortening)\b/i],
  ['juice', /\bjuice\b/i],
  ['flour', /\b(flours?|cornmeal|semolina)\b/i],
  ['pasta_noodle', /\b(pasta|noodles?|spaghetti|macaroni)\b/i],
  ['starch', /\b(starch|tapioca)\b/i],
  ['grain', /\b(wheat|rice|oats?|barley|rye|spelt|millet|sorghum|quinoa|amaranth|buckwheat|couscous|bulgur|bran|germ|cereals?|teff)\b/i],
  ['soy_ferment', /\b(tofu|tempeh|miso|natto|soy sauce)\b/i],
  ['vegetable', /\b(green beans?|snap beans?|sweet corn|corn on the cob|green peas?)\b/i],
  ['legume', /\b(beans?|peas?|lentils?|chickpeas?|soy|soybeans?|lupin)\b/i],
  ['nut', /\b(nuts?|almonds?|walnuts?|pecans?|cashews?|hazelnuts?|pistachios?|peanuts?|chestnuts?|macadamia)\b/i],
  ['seed', /\b(seeds?|sesame|flax|linseed|chia|hemp)\b/i],
  ['fruit', /\b(apples?|pears?|bananas?|oranges?|lemons?|limes?|grapefruit|mandarin|tangerine|berries|berry|\w*berr(y|ies)|currants?|cherr\w*|plums?|prunes?|peach\w*|nectarines?|apricots?|grapes?|raisins?|figs?|dates?|melons?|watermelon|pineapple|mango\w*|papaya|kiwi|guava|passion|pomegranate|persimmon|avocado|olives?|fruit|fruits|coconut|lychee|rhubarb)\b/i],
  ['fungi', /\b(mushrooms?|chanterelles?|morels?|truffles?|fungi)\b/i],
  ['sweetener', /\b(sugar|syrup|molasses|honey|sweetener)\b/i],
  ['tea_coffee', /\b(tea|coffee)\b/i],
  ['cocoa', /\bcocoa\b/i],
  ['salt_mineral', /\bsalt\b/i],
  ['herb_spice', /\b(spices?|herbs?|pepper|cinnamon|cumin|paprika|basil|thyme|oregano|parsley|dill|mint|rosemary|sage|ginger|turmeric|vanilla|nutmeg|cloves?|cardamom|coriander|mustard)\b/i],
  ['vinegar_condiment', /\b(vinegar|sauce|ketchup|mayonnaise)\b/i],
  ['vegetable', /\b(corn|sweetcorn|okra|bok choy|silverbeet|chard|sprouts|taro|sauerkraut|aubergine|potato\w*|tomato\w*|onions?|carrots?|cabbages?|lettuce|spinach|broccoli|cauliflower|peppers?|cucumbers?|squash|pumpkin|beets?|turnips?|celery|leeks?|garlic|kale|radish\w*|artichokes?|asparagus|eggplant|zucchini|parsnips?|vegetables?|greens|yam|cassava|sweet corn)\b/i],
];
function typeOfHidden(row) {
  if (TYPE_FROM_REASON[row.reason]) return TYPE_FROM_REASON[row.reason];
  const en = (row.en || row.orig || '').replace(/\b(with|without|no|added) (added )?salt\b/gi, '');
  const head = en.split(',')[0];
  for (const text of [head, en]) {
    const hit = TYPE_FROM_NAME.find(([, re]) => re.test(text));
    if (hit) return hit[0];
  }
  return 'other';
}

const readLines = (file) => fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l, i) => {
  try {
    return JSON.parse(l);
  } catch (e) {
    throw new Error(`${path.basename(file)} line ${i + 1} is not JSON: ${l.slice(0, 100)}`);
  }
});

// Fuller nutrients, then "all grades" and "lean and fat" wording, then fewer words.
function preference(r) {
  const nutrients = Object.keys(r.n || {}).length;
  const general = /all grades|lean and fat|separable lean and fat/i.test(r.en || '') ? 1 : 0;
  const words = (r.en || '').split(/\s+/).length;
  return [sourceRank(r.src), -general, -nutrients, words, r.id];
}
const compare = (a, b) => {
  const pa = preference(a);
  const pb = preference(b);
  for (let i = 0; i < pa.length; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
};

function main() {
  const dir = process.argv[2];
  const write = process.argv.includes('--write');
  const hides = readLines(path.join(dir, 'rule_hide.jsonl'));
  const toRead = readLines(path.join(dir, 'to_read.jsonl'));
  const readerFiles = fs.readdirSync(dir).filter((f) => /^out_.*\.jsonl$/.test(f));
  const problems = [];

  const verdicts = new Map();
  for (const f of readerFiles) {
    for (const v of readLines(path.join(dir, f))) {
      if (verdicts.has(v.id)) problems.push(`row ${v.id} decided twice, in ${f}`);
      verdicts.set(v.id, v);
    }
  }
  const readIds = new Set(toRead.map((r) => r.id));
  for (const id of verdicts.keys()) if (!readIds.has(id)) problems.push(`row ${id} decided but was never sent to a reader`);
  const out = [];
  for (const r of hides) {
    out.push({ row: r, status: 'hide', by: 'rule', reason: r.reason, text: r.reasonWords || r.reason, type: typeOfHidden(r), doubt: r.doubt || '' });
  }
  const missing = [];
  for (const r of toRead) {
    const v = verdicts.get(r.id);
    if (!v) {
      missing.push(r.id);
      continue;
    }
    if (v.v === 'K') {
      if (!v.name || /,/.test(v.name)) problems.push(`row ${r.id} listing name "${v.name}"`);
      out.push({ row: r, status: 'keep', by: 'agent', reason: 'meets_criteria', text: v.why, type: v.type, name: v.name, doubt: v.q || '' });
    } else if (v.v === 'H') {
      out.push({ row: r, status: 'hide', by: 'agent', reason: v.why, text: v.why, type: v.type, doubt: v.q || '' });
    } else {
      problems.push(`row ${r.id} verdict "${v.v}"`);
    }
  }

  // One food, one visible row.
  const groups = new Map();
  for (const d of out) {
    if (d.status !== 'keep') continue;
    const key = d.name.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => compare(a.row, b.row));
    const shown = group[0];
    shown.status = 'show';
    for (const other of group.slice(1)) {
      other.status = 'compare';
      other.equalTo = shown.row.id;
    }
  }

  // A cooked kohlrabi hidden by rule has no type of its own, yet the kept kohlrabi
  // says what it is. Longest kept name found in the hidden row's words wins.
  const wordsOf = (s) => ` ${String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').map((w) => w.replace(/(es|s)$/, '')).join(' ')} `;
  const keptNames = [...new Map(out.filter((d) => d.name).map((d) => [wordsOf(d.name), d.type])).entries()]
    .filter(([w, type]) => w.trim().length > 2 && type !== 'other')
    .sort((a, b) => b[0].length - a[0].length);
  const LAST_RESORT = [
    ['water', /\bwater\b/i], ['processed_meat', /\b(sausage|wurst|kamaboko|pudding|schnitzel|salami|meat|loaf)\b/i],
    ['fish', /\b(mullet|bream|turbot|flounder|saithe|mulloway|fish|seafood)\b/i],
    ['sweetener', /\bsweetener/i], ['prepared_dish', /\b(soup|pizza|stew|dish|meal|burger)\b/i],
    ['cultured_dairy', /\b(yogh?urt|yogourt)\b/i], ['milk_cream', /\b(milk|cream|creme)\b/i],
  ];
  let typed = 0;
  for (const d of out) {
    if (d.status !== 'hide' || d.type !== 'other') continue;
    const en = d.row.en || d.row.orig || '';
    const texts = [wordsOf(en.split(',')[0]), wordsOf(en)];
    let found = null;
    for (const t of texts) {
      const hit = keptNames.find(([w]) => t.includes(w));
      if (hit) { found = hit[1]; break; }
    }
    if (!found) {
      const last = LAST_RESORT.find(([, re]) => re.test(en));
      if (last) found = last[0];
    }
    if (found) { d.type = found; typed++; }
  }
  console.log(`hidden rows given a type from the kept names: ${typed}`);

  const tally = { hide: 0, show: 0, compare: 0, keep: 0 };
  out.forEach((d) => {
    tally[d.status]++;
  });
  console.log(JSON.stringify({ rows: out.length, ...tally, foods: groups.size, missing: missing.length, problems: problems.length }));
  problems.slice(0, 40).forEach((p) => console.log('  ' + p));
  if (missing.length) console.log('  undecided rows, first few:', missing.slice(0, 10).join(', '));
  if (!write) return;
  if (missing.length || problems.length) throw new Error('not writing: every row needs one clean decision first');

  const q = (s) => (s === undefined || s === null || s === '' ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
  const now = new Date().toISOString();
  const sql = [
    'BEGIN;',
    `CREATE TABLE IF NOT EXISTS food_curation (
      raw_id INTEGER PRIMARY KEY REFERENCES raw_foods(raw_id),
      status TEXT NOT NULL CHECK (status IN ('show','compare','hide')),
      decided_by TEXT NOT NULL,
      reason_code TEXT,
      reason_text TEXT,
      listing_name TEXT,
      food_type TEXT,
      equal_to_raw_id INTEGER REFERENCES raw_foods(raw_id),
      doubt_note TEXT,
      curated_at TEXT NOT NULL
    );`,
    'CREATE INDEX IF NOT EXISTS idx_food_curation_status ON food_curation(status);',
    'CREATE INDEX IF NOT EXISTS idx_food_curation_name ON food_curation(listing_name);',
  ];
  for (const d of out) {
    sql.push(`INSERT OR REPLACE INTO food_curation VALUES (${d.row.id},${q(d.status)},${q(d.by)},${q(d.reason)},${q(d.text)},${q(d.name)},${q(d.type)},${d.equalTo || 'NULL'},${q(d.doubt)},${q(now)});`);
  }
  sql.push('COMMIT;');
  const file = path.join(os.tmpdir(), `food_curation_${process.pid}.sql`);
  fs.writeFileSync(file, sql.join('\n'));
  execFileSync(SQLITE_EXE, [dbPath, `.read ${file.replace(/\\/g, '/')}`], { stdio: 'inherit' });
  fs.unlinkSync(file);
  console.log('written to food_curation');
}

if (require.main === module) main();
module.exports = { typeOfHidden };
