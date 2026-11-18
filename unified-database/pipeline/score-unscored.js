// Scores every shown food the live workbook never scored (owner, 2026-11-17: "All of that should have transferred
// over. Score them."). The workbook only scored the seven sources it was built from, so the Norwegian and Swedish rows,
// and rows the curated list added, came across with no scores. Its own D1 to D6 judgements cannot be rerun, since no
// script holds them, so each missing score is taken, in this order:
//
//   1. same food: a scored row with the same listing name (the same food from another source) gives every score it has.
//   2. by rule: carbohydrate against fiber (27), protein density (28), sodium (29), selenium (1) and iodine (2) are
//      worked out from the food's own nutrients by the thresholds the workbook used. Each rule is first checked against
//      every scored food, and one that agrees with the workbook less than RULE_FLOOR of the time is not used.
//   3. nearest food: the other judgement tiers come from the nearest scored food in the same category, by nutrients
//      and name. Iron "Fortified (Added Iron)" is only given to a food whose name says enriched or fortified.
//   4. Oxalate (21 to 24) is never guessed: only a same-food row gives it, and otherwise the food reads Not Assessed,
//      the same honest gap the workbook leaves. Goitrogenic Load (25) follows the build script's rule: a raw
//      cruciferous food is Goitrogenic (Raw), a cooked one Minimal (Cooked), anything else gets no row.
//
// Every score written gets a row in score_origin saying which way it came and from which food, so it can be audited.
//   node score-unscored.js [db]   scores a built candidate in place and prints what it did (merge-candidate.js calls it).
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const RULE_FLOOR = 0.95;
const NUTS = ['energy_kcal', 'protein', 'fat_total', 'carbohydrate', 'fiber_total', 'sugars_total', 'sodium', 'fat_saturated', 'fat_polyunsaturated',
  'fat_monounsaturated', 'calcium', 'iron', 'zinc', 'selenium', 'iodine', 'vitamin_c', 'water', 'potassium', 'magnesium', 'cholesterol'];
const OXALATE = [21, 22, 23, 24];
const OXALATE_UNKNOWN = {
  21: 'Not Assessed', 22: 'Not Assessed', 23: 'Not Assessed',
  24: 'No real, cited oxalate reference data could be matched to this specific food, not scored rather than guessed. Not the same as "Low"; simply unknown.',
};
const FORTIFIED = 'Fortified (Added Iron)';
const FORTIFIED_NAME = /\b(enriched|fortified|anriket|beriket|angereichert|enrichi)\b/i;
const CRUCIFER = /\b(broccoli|brokkoli|cauliflower|cabbage|kale|brussels|collard|kohlrabi|bok choy|rutabaga|turnip|radish|watercress|arugula|rapini|mustard greens)\b/i;
const COOKED = /\b(boiled|cooked|steamed|baked|roasted|fried|microwaved|braised|stewed|grilled|kokt|stekt|gekocht)\b/i;

// The workbook's thresholds. Each returns a tier, or undefined when the nutrient is missing.
const RULES = {
  1: (n) => (n.selenium === undefined ? undefined : n.selenium <= 11 ? 'Supportive' : n.selenium <= 80 ? 'Ideal' : n.selenium <= 133 ? 'Use Carefully' : 'Excess Risk'),
  2: (n) => (n.iodine === undefined ? undefined : n.iodine <= 30 ? 'Supportive' : n.iodine <= 221 ? 'Ideal' : n.iodine <= 366 ? 'Use Carefully' : 'Excess Risk'),
  27: (n) => {
    if (n.carbohydrate === undefined) return 'Not Assessed';
    if (n.carbohydrate < 5) return 'Minimal Carbohydrate Impact';
    const ratio = (n.fiber_total ?? 0) / n.carbohydrate;
    if (ratio >= 0.15) return 'High Fiber Relative to Carbs';
    if (n.carbohydrate >= 15 && ratio < 0.05) return 'High Carb, Low Fiber';
    return 'Moderate Carbohydrate Content';
  },
  28: (n) => (n.protein === undefined ? 'Not Assessed' : n.protein < 5 ? 'Low Protein Density' : n.protein < 15 ? 'Moderate Protein Density' : n.protein < 25 ? 'High Protein Density' : 'Very High Protein Density'),
  29: (n) => (n.sodium === undefined ? 'Not Assessed' : n.sodium <= 120 ? 'Low Sodium (DASH-Aligned)' : n.sodium <= 600 ? 'Moderate Sodium' : 'High Sodium (DASH Caution)'),
};

function load(db) {
  const foods = db.prepare(`select food_id, source, category, name, base_name, listing_name, hidden, curation_status from foods`).all();
  const key = (f) => `${f.food_id}|${f.source}`;
  const byKey = new Map(foods.map((f) => [key(f), f]));
  for (const f of foods) { f.n = {}; f.s = {}; }
  const inList = NUTS.map((x) => `'${x}'`).join(',');
  for (const r of db.prepare(`select food_id, source, nutrient_code c, amount_per_100g a from food_nutrients where nutrient_code in (${inList})`).iterate()) {
    const f = byKey.get(`${r.food_id}|${r.source}`);
    if (f && r.a !== null) f.n[r.c] = r.a;
  }
  for (const r of db.prepare('select food_id, source, sub_criterion_id k, tier from food_scores').iterate()) {
    const f = byKey.get(`${r.food_id}|${r.source}`);
    if (f) f.s[r.k] = r.tier;
  }
  const tok = (s) => new Set(String(s || '').toLowerCase().replace(/[^a-zà-ÿ ]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
  for (const f of foods) f.t = tok(`${f.name} ${f.base_name} ${f.listing_name || ''}`);
  return foods;
}

function distance(a, b) {
  let d = 0;
  let m = 0;
  for (const c of NUTS) {
    const x = a.n[c];
    const y = b.n[c];
    if (x === undefined || y === undefined) continue;
    d += (Math.log1p(Math.max(0, x)) - Math.log1p(Math.max(0, y))) ** 2;
    m += 1;
  }
  const nd = m ? Math.sqrt(d / m) : 3;
  let inter = 0;
  for (const w of a.t) if (b.t.has(w)) inter += 1;
  const jac = inter / (a.t.size + b.t.size - inter || 1);
  return nd + 2 * (1 - jac);
}

// How often each rule gives the workbook's own tier, over every scored food that has the nutrient.
function checkRules(scored) {
  const out = {};
  for (const [k, rule] of Object.entries(RULES)) {
    let n = 0;
    let same = 0;
    for (const f of scored) {
      if (f.s[k] === undefined) continue;
      const t = rule(f.n);
      if (t === undefined || t === 'Not Assessed') continue;
      n += 1;
      if (t === f.s[k]) same += 1;
    }
    out[k] = { checked: n, agree: n ? same / n : 0 };
  }
  return out;
}

function scoreUnscored(dbPath) {
  const db = new DatabaseSync(dbPath);
  const foods = load(db);
  const criteria = db.prepare('select id from sub_criteria order by id').all().map((r) => r.id);
  const scored = foods.filter((f) => Object.keys(f.s).length >= 20);
  const targets = foods.filter((f) => f.hidden === 0 && Object.keys(f.s).length === 0);
  const ruleCheck = checkRules(scored);
  const usable = new Set(Object.keys(ruleCheck).filter((k) => ruleCheck[k].agree >= RULE_FLOOR).map(Number));

  const byListing = new Map();
  for (const f of scored) if (f.listing_name) { if (!byListing.has(f.listing_name)) byListing.set(f.listing_name, []); byListing.get(f.listing_name).push(f); }
  // Neighbours come from foods the curated list keeps (shown, or kept to compare), so an obscure row the list hid
  // (whale eyes, a sea duck) never stands in for a common food.
  const byCat = new Map();
  for (const f of scored) {
    if (f.curation_status !== 'show' && f.curation_status !== 'compare') continue;
    if (!byCat.has(f.category)) byCat.set(f.category, []);
    byCat.get(f.category).push(f);
  }
  const nearestOf = (f, pool, ok = () => true) => {
    let best = null;
    let bd = Infinity;
    for (const g of pool) {
      if (g === f || !ok(g)) continue;
      const d = distance(f, g);
      if (d < bd) { bd = d; best = g; }
    }
    return best;
  };

  const LIKE = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'score-like.json'), 'utf8')).like;
  const likeOf = new Map();
  for (const [k, [src, name]] of Object.entries(LIKE)) {
    const g = scored.find((x) => x.source === src && x.name === name);
    if (!g) throw new Error(`score-like.json: no scored food ${src} ${name}`);
    const f = targets.find((x) => `${x.source}|${x.base_name}` === k);
    if (!f) throw new Error(`score-like.json: ${k} is not a shown food without scores`);
    likeOf.set(f, g);
  }

  db.exec(`CREATE TABLE IF NOT EXISTS score_origin (food_id INTEGER NOT NULL, source TEXT NOT NULL, sub_criterion_id INTEGER NOT NULL, how TEXT NOT NULL,
    from_food_id INTEGER, from_source TEXT, PRIMARY KEY (food_id, source, sub_criterion_id));`);
  const insScore = db.prepare('INSERT INTO food_scores (food_id, source, sub_criterion_id, tier) VALUES (?, ?, ?, ?)');
  const insOrigin = db.prepare('INSERT INTO score_origin VALUES (?, ?, ?, ?, ?, ?)');
  const tally = { foods: 0, sameFood: 0, byRule: 0, nearest: 0, oxalateUnknown: 0, goitrogenic: 0, noNeighbour: [] };

  db.exec('BEGIN');
  for (const f of targets) {
    const same = byListing.has(f.listing_name) ? nearestOf(f, byListing.get(f.listing_name)) : null;
    const pool = byCat.get(f.category) || scored;
    const near = likeOf.get(f) || nearestOf(f, pool);
    if (!same && !near) { tally.noNeighbour.push(f.base_name); continue; }
    const put = (k, tier, how, from) => {
      insScore.run(f.food_id, f.source, k, tier);
      insOrigin.run(f.food_id, f.source, k, how, from ? from.food_id : null, from ? from.source : null);
      if (how === 'same food') tally.sameFood += 1; else if (how === 'by rule') tally.byRule += 1; else if (how !== 'not assessed') tally.nearest += 1;
    };
    for (const k of criteria) {
      if (k === 25) {
        if (same && same.s[25] !== undefined) put(25, same.s[25], 'same food', same);
        else if (CRUCIFER.test(`${f.name} ${f.base_name}`)) {
          const tier = COOKED.test(f.name) ? 'Minimal (Cooked)' : /\b(raw|rå|fresh|sprouts?|spirer)\b/i.test(f.name) ? 'Goitrogenic (Raw)' : 'Not Assessed';
          put(25, tier, 'by rule', null);
          tally.goitrogenic += 1;
        }
        continue;
      }
      if (OXALATE.includes(k)) {
        if (same && same.s[k] !== undefined) put(k, same.s[k], 'same food', same);
        else { put(k, OXALATE_UNKNOWN[k], 'not assessed', null); tally.oxalateUnknown += 1; }
        continue;
      }
      if (usable.has(k)) {
        const t = RULES[k](f.n);
        if (t !== undefined) { put(k, t, 'by rule', null); continue; }
      }
      if (same && same.s[k] !== undefined) { put(k, same.s[k], 'same food', same); continue; }
      if (k === 4 && !FORTIFIED_NAME.test(f.name)) {
        const g = near && near.s[4] !== undefined && near.s[4] !== FORTIFIED ? near : nearestOf(f, pool, (x) => x.s[4] !== undefined && x.s[4] !== FORTIFIED);
        if (g) put(4, g.s[4], g === likeOf.get(f) ? 'named food' : 'nearest food', g);
        continue;
      }
      if (k === 4 && FORTIFIED_NAME.test(f.name)) { put(4, FORTIFIED, 'by rule', null); continue; }
      const g = near && near.s[k] !== undefined ? near : nearestOf(f, pool, (x) => x.s[k] !== undefined);
      if (g) put(k, g.s[k], g === likeOf.get(f) ? 'named food' : 'nearest food', g);
    }
    tally.foods += 1;
  }
  db.exec('COMMIT');
  db.close();
  return { targets: targets.length, ...tally, rules: Object.fromEntries(Object.entries(ruleCheck).map(([k, v]) => [k, `${(100 * v.agree).toFixed(1)}% of ${v.checked}${usable.has(Number(k)) ? '' : ' (not used)'}`])) };
}

module.exports = { scoreUnscored };

if (require.main === module) {
  const dbPath = process.argv[2] || path.resolve(__dirname, '..', 'candidate', 'foods_reference_candidate.db');
  console.log(JSON.stringify(scoreUnscored(dbPath), null, 1));
}
