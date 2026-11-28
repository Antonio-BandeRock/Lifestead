// Shared, real ingestion logic for all 7 of the original reference-
// database sources (USDA, Canada_CNF, UK_CoFID, Germany_BLS,
// Australia_AFCD, France_Ciqual, Japan_MEXT). Unlike Norway and Sweden,
// these 7 share one identical, already-existing raw schema -- a real,
// unfiltered combine already sitting in
// ClaudeWork/unified_food_database_v3_full.sqlite.zip (27,980 real
// foods, confirmed matching this project's own already-documented
// history: USDA's own real 7,793-row count exactly matches its known
// SR Legacy size). One shared module, not 7 near-duplicate files,
// since the real underlying structure (foods/food_nutrients/nutrients,
// a real, standardized INFOODS/EuroFIR-style nutrient tag vocabulary
// shared across all 7) is genuinely identical -- each real source file
// under sources/ is just a thin wrapper naming its own source_code.
//
// REAL, CONFIRMED FINDING before building anything (checked directly,
// not assumed): of these 7, only France_Ciqual's food_name is
// genuinely untranslated French -- USDA, Canada_CNF, UK_CoFID,
// Germany_BLS, Australia_AFCD, and Japan_MEXT ALL already carry a real,
// usable English food_name (Germany_BLS and Japan_MEXT were already
// translated at some earlier point in this project's own history;
// food_name_local, when present, preserves the real original-language
// name separately). Only France_Ciqual (3,185 real rows) needs the
// same real translate.js pass already proven on Sweden.
//
// REAL, HONEST GAP, stated directly: this earlier-stage v3_full
// database predates real category assignment (no food-group column
// exists at all) and predates real species/LanguaL capture (matching
// this app's own already-confirmed 0/26,749 scientific_classification
// coverage) -- categoryOriginal is left null for all 7 sources, and
// cross-source matching for these 7 will lean more heavily on Tier 3
// (canonical English name) than Tier 1/Tier 2 as a result. Not a flaw
// introduced here -- an honest reflection of what this particular raw
// snapshot actually captured.
//
// REAL NUTRIENT MAPPING, verified directly against this app's own
// current 39-code vocabulary AND against the real, actual unit stored
// per tag in the v3_full database's own `nutrients` reference table
// (never assumed from a tag's name alone). One real, deliberate,
// documented exclusion worth calling out: CAFFN ("Caffeine," but in
// g/100g, not mg) is NOT mapped, specifically to avoid the exact same
// real 1000x unit error this project's own original 2026 build already
// documented catching and avoiding for this identical trap (see
// scripts/build_food_reference_db.py's own history). CAFFEINE and
// AU_CAFFEINE_MG (both genuinely mg) are used instead. VITK1
// (phylloquinone specifically, the standard dietary form) is preferred
// over bare VITK -- confirmed the two genuinely co-occur on 6,479 real
// foods, a real ambiguity avoided by picking one specific, standard
// form rather than guessing which of two possibly-different measures
// to trust.

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { extractZipTo } = require('./legacy-v3-extract.js');

// Germany_BLS stores vitamin B6 in micrograms under the tag every other source fills in milligrams
// (median near 165 against about 0.2 elsewhere). The live database divided its BLS values by 1000 on
// 2026-11-11 (scripts/fix_nutrient_source_errors.js); this does the same on ingest, and the unified
// database's existing 7,041 BLS values were divided once by hand the same day.
const SOURCE_SCALE = {
  Germany_BLS: { vitamin_b6: 1 / 1000 },
  // Australia's EPA and DHA tags are the only fatty acids any source gives in mg (their names end
  // _MG, largest value 1757); every other source's fatty acids are g per 100 g (2026-11-27).
  Australia_AFCD: { epa: 1 / 1000, dha: 1 / 1000 },
};

const SQLITE_EXE =
  process.env.SQLITE_EXE ||
  'C:/Users/TonyR/AppData/Local/Android/Sdk/platform-tools/sqlite3.exe';

const ZIP_PATH = path.resolve(__dirname, '..', '..', 'ClaudeWork', 'unified_food_database_v3_full.sqlite.zip');
const CACHE_DIR = path.resolve(__dirname, '..', '.cache');
const CACHED_DB_PATH = path.join(CACHE_DIR, 'legacy_v3_sources.sqlite');

const NUTRIENT_TAG_MAP = {
  WATER: 'water',
  NA: 'sodium',
  FAT: 'fat_total',
  PROCNT: 'protein',
  CA: 'calcium',
  FE: 'iron',
  ENERC_KCAL: 'energy_kcal',
  K: 'potassium',
  FIBTG: 'fiber_total',
  P: 'phosphorus',
  MG: 'magnesium',
  FASAT: 'fat_saturated',
  ZN: 'zinc',
  NIA: 'niacin_b3',
  RIBF: 'riboflavin_b2',
  THIA: 'thiamin_b1',
  CHOCDF: 'carbohydrate',
  VITA_RAE: 'vitamin_a',
  CHOLE: 'cholesterol',
  VITB6A: 'vitamin_b6',
  VITC: 'vitamin_c',
  FAPU: 'fat_polyunsaturated',
  CU: 'copper',
  FAMS: 'fat_monounsaturated',
  FOL: 'folate_b9',
  VITB12: 'vitamin_b12',
  MN: 'manganese',
  PANTAC: 'pantothenic_acid_b5',
  TOCPHA: 'vitamin_e',
  SUGAR: 'sugars_total',
  VITD: 'vitamin_d',
  SE: 'selenium',
  VITK1: 'vitamin_k', // phylloquinone specifically -- see this file's own header comment for why bare VITK is deliberately excluded
  GLY: 'glycine',
  ID: 'iodine',
  CAFFEINE: 'caffeine',
  AU_CAFFEINE_MG: 'caffeine',
  // CAFFN deliberately excluded -- real, different unit (g/100g), see header comment
  CHOLINE_TOTAL: 'choline',
  CHOLN: 'choline',
  BIOT: 'biotin_b7',
  AU_BIOTIN_B7_UG: 'biotin_b7',
  // No real inositol tag exists anywhere in this dataset -- confirmed by direct query, an honest gap, not an oversight.
  // Lycopene, added 2026-08-13 alongside the live app's own matching
  // addition (see lib/referenceDbVersion.ts's own real detail on that
  // pass) -- direct request to "modify the new future replacement
  // database to also include the change." Four real tags confirmed
  // directly against this file's own real v3_full source (a
  // COUNT(*)-per-tag-per-source query, not assumed): LYCOPENE (USDA,
  // 5,314 real rows), LYCPN (Canada_CNF, 3,366), AU_LYCOPENE_UG
  // (Australia_AFCD, 31), LYCO (UK_CoFID, 1) -- all four genuinely in µg,
  // no unit-mismatch risk the way CAFFN's own gram-vs-milligram trap
  // required excluding. A real, honest, and genuinely BROADER result than
  // the live app's own same-day addition got: the live app's master
  // workbook only has real, filled-in lycopene values for USDA (3,845
  // rows); this raw source independently carries real values for three
  // more national sources the live app's own workbook doesn't currently
  // have data for at all -- expected and fine, this project's own
  // explicitly wider scope, not a discrepancy to reconcile.
  LYCOPENE: 'lycopene',
  LYCPN: 'lycopene',
  AU_LYCOPENE_UG: 'lycopene',
  LYCO: 'lycopene',
  // Linoleic acid, ALA, EPA, DHA (all g per 100 g) and phytosterols (mg), added 2026-11-27 so a
  // supplement oil linked to its food record counts them. Several sources carry both the exact
  // isomer (cis n-6, cis n-3) and the plain chain length that lumps the isomers together; the exact
  // one wins through TAG_PRIORITY below. Canada FAPUN3/FAPUN6 and UK TOTn3/TOTn6 are family totals,
  // not one acid, and stay out. Japan carries no fatty acid tags at all.
  PUFA_18_2_N_6_C_C: 'linoleic_acid', PUFA_18_2: 'linoleic_acid',
  F18D2CN6: 'linoleic_acid', F18D2: 'linoleic_acid',
  'FOD18:2cn6': 'linoleic_acid', 'FOD18:2': 'linoleic_acid',
  'F18:2CN6': 'linoleic_acid',
  FR_AG_18_2_9C_12C_N_6_LINOL_IQUE_G_100_G: 'linoleic_acid',
  AU_C18_2W6_G: 'linoleic_acid',
  PUFA_18_3_N_3_C_C_C_ALA: 'ala_omega_3', PUFA_18_3: 'ala_omega_3',
  F18D3CN3: 'ala_omega_3', F18D3: 'ala_omega_3',
  'FOD18:3cn3': 'ala_omega_3', 'FOD18:3': 'ala_omega_3',
  'F18:3CN3': 'ala_omega_3',
  FR_AG_18_3_C9_C12_C15_N_3_ALPHA_LINOL_NIQUE_G_100_G: 'ala_omega_3',
  AU_C18_3W3_G: 'ala_omega_3',
  PUFA_20_5_N_3_EPA: 'epa', F20D5N3: 'epa', 'FOD20:5cn3': 'epa', 'FOD20:5': 'epa', 'F20:5CN3': 'epa',
  FR_AG_20_5_5C_8C_11C_14C_17C_N_3_EPA_G_100_G: 'epa', AU_C20_5W3_MG: 'epa',
  PUFA_22_6_N_3_DHA: 'dha', F22D6N3: 'dha', 'FOD22:6cn3': 'dha', 'FOD22:6': 'dha', 'F22:6CN3': 'dha',
  FR_AG_22_6_4C_7C_10C_13C_16C_19C_N_3_DHA_G_100_G: 'dha', AU_C22_6W3_MG: 'dha',
  // UK PHYTO and "Total PHYTO" sit on different foods; BSITPHYTO is beta-sitosterol alone and stays out.
  PHYTOSTEROLS: 'phytosterols', PHYSTR: 'phytosterols', PHYTO: 'phytosterols', 'Total PHYTO': 'phytosterols',
};

// When one food carries two tags for the same code, the lower rank wins. Tags not listed rank 0,
// so the exact isomer tags above beat the plain chain-length ones regardless of row order.
const TAG_PRIORITY = {
  PUFA_18_2: 1, F18D2: 1, 'FOD18:2': 1,
  PUFA_18_3: 1, F18D3: 1, 'FOD18:3': 1,
  'FOD20:5': 1, 'FOD22:6': 1,
  'Total PHYTO': 1,
};

const FATTY_ACID_CODES = ['linoleic_acid', 'ala_omega_3', 'epa', 'dha', 'phytosterols'];

function ensureExtracted() {
  if (fs.existsSync(CACHED_DB_PATH)) return CACHED_DB_PATH;
  if (!fs.existsSync(ZIP_PATH)) {
    throw new Error(`Real source zip not found at ${ZIP_PATH} -- this adapter depends on ClaudeWork's own already-existing unified_food_database_v3_full.sqlite.zip.`);
  }
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  extractZipTo(ZIP_PATH, CACHE_DIR, 'unified_food_database_full.sqlite', CACHED_DB_PATH);
  return CACHED_DB_PATH;
}

function query(dbPath, sql) {
  const out = execFileSync(SQLITE_EXE, ['-cmd', '.timeout 30000', dbPath, '-json', sql], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 256,
  });
  return JSON.parse(out || '[]');
}

// The one real, confirmed exception among these 7: France_Ciqual's own
// food_name is genuinely, still French (identical to food_name_local),
// never translated at any earlier stage the way Germany_BLS/Japan_MEXT
// were -- confirmed by direct inspection before this was ever assumed.
// Passing that French text through as if it were nameEnglish would be
// a real, dishonest mislabeling (exactly the mistake this project's
// own name_english_source column exists to prevent) -- so this one
// source is the real exception to "food_name is already usable English."
const SOURCES_NEEDING_REAL_TRANSLATION = new Set(['France_Ciqual']);

/**
 * Real, shared ingest function -- takes the legacy v3 `source` value
 * (e.g. 'USDA', 'Germany_BLS') and returns a real NormalizedRecord[]
 * built directly from the real, extracted legacy database.
 */
async function ingestLegacySource(legacySourceValue) {
  const dbPath = ensureExtracted();

  const foods = query(dbPath, `SELECT food_id, source_code, food_name, food_name_local FROM foods WHERE source = ${JSON.stringify(legacySourceValue)};`);
  if (foods.length === 0) {
    throw new Error(`No real rows found for legacy source '${legacySourceValue}' -- check the real value against the v3_full database's own distinct source list.`);
  }

  const tagList = Object.keys(NUTRIENT_TAG_MAP).map((t) => `'${t.replace(/'/g, "''")}'`).join(',');
  const nutrientRows = query(dbPath, `
    SELECT fn.food_id, fn.tag, fn.value
    FROM food_nutrients fn
    WHERE fn.tag IN (${tagList})
      AND fn.food_id IN (SELECT food_id FROM foods WHERE source = ${JSON.stringify(legacySourceValue)});
  `);

  const nutrientsByFood = new Map();
  const rankByFood = new Map();
  for (const r of nutrientRows) {
    if (typeof r.value !== 'number') continue;
    const code = NUTRIENT_TAG_MAP[r.tag];
    if (!nutrientsByFood.has(r.food_id)) nutrientsByFood.set(r.food_id, {});
    const bucket = nutrientsByFood.get(r.food_id);
    // A real food could carry both CAFFEINE and AU_CAFFEINE_MG (or
    // both CHOLINE_TOTAL and CHOLN, or both BIOT and AU_BIOTIN_B7_UG)
    // -- both real synonyms for the identical nutrient in the SAME
    // real unit, confirmed above. First real value wins; not summed,
    // which would double-count.
    if (!rankByFood.has(r.food_id)) rankByFood.set(r.food_id, {});
    const ranks = rankByFood.get(r.food_id);
    const rank = TAG_PRIORITY[r.tag] || 0;
    if (!(code in bucket) || rank < ranks[code]) {
      bucket[code] = r.value * ((SOURCE_SCALE[legacySourceValue] || {})[code] || 1);
      ranks[code] = rank;
    }
  }

  const needsTranslation = SOURCES_NEEDING_REAL_TRANSLATION.has(legacySourceValue);

  return foods.map((f) => ({
    sourceFoodId: String(f.food_id), // the v3_full database's own real, stable integer id -- more reliable than source_code, which isn't always populated identically across all 7 sources
    nameOriginal: f.food_name_local || f.food_name,
    // Real, honest split: for 6 of 7 sources, food_name is already
    // confirmed usable English (source_verified, via ingest.js's own
    // real provenance logic). For France_Ciqual specifically,
    // food_name is genuinely still French -- passing it here as
    // nameEnglish would silently mislabel it, so it's left null,
    // exactly the same real, honest deferral pattern classify.js
    // already applies to any source with no real English evidence.
    nameEnglish: needsTranslation ? null : f.food_name,
    latinName: null, // this earlier-stage snapshot never captured species data -- see this file's own header comment
    langualCodes: null, // same real gap
    categoryOriginal: null, // this earlier-stage snapshot predates real category assignment -- see this file's own header comment
    nutrients: nutrientsByFood.get(f.food_id) || {},
    raw: f,
  }));
}

module.exports = { ingestLegacySource, NUTRIENT_TAG_MAP, TAG_PRIORITY, SOURCE_SCALE, FATTY_ACID_CODES, ensureExtracted, query };
