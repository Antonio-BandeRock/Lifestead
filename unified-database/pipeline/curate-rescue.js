// Moves rows the rules or a reader wrongly hid over to keep, found by auditing every
// hidden row in the types Tony said to keep. Run after curate-corrections.js.
// Idempotent: always starts from the copies it took on its first run.
//   node curate-rescue.js <work folder>
const fs = require('fs');
const S = process.argv[2];
const rd = (f) => fs.readFileSync(S + '/' + f, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l));
const wr = (f, rows) => fs.writeFileSync(S + '/' + f, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');

const WHY = {
  sweets: 'A pure sweetener on the keep list; the sweets rule matched the source heading, not the food.',
  cocoa: 'Plain cocoa with nothing added; the sweets rule matched the source heading, not the food.',
  fish: 'Raw single fish; the word sashimi made a rule read it as a prepared dish.',
  meat: 'Raw single meat that a rule hid from a word in its name.',
  soda: 'Baking soda is on the keep list; the soft drink rule matched the word soda.',
  nut: 'A plain nut with nothing added; a rule hid it from a word in its name.',
  cheese: 'Cheese is kept by direct instruction.',
  seed: 'Ground sesame with nothing added.',
  veg: 'Plain raw leaves or peppers with nothing added.',
  vinegar: 'Vinegar is a traditional single-ingredient ferment.',
  flour: 'Single-grain flour; only the maker name made it look like a brand product.',
};

// id, listing name, type, why key, question for Tony if any
const RESCUE = [
  [25061, 'Honey', 'sweetener', 'sweets'],
  [25066, 'Molasses', 'sweetener', 'sweets'], [25069, 'Molasses', 'sweetener', 'sweets'],
  [25089, 'Maple sugar', 'sweetener', 'sweets'], [27583, 'Maple sugar', 'sweetener', 'sweets'],
  [25095, 'Maple syrup', 'sweetener', 'sweets'], [27582, 'Maple syrup', 'sweetener', 'sweets'],
  [25096, 'Sorghum syrup', 'sweetener', 'sweets'],
  [35346, 'Whole cane sugar', 'sweetener', 'sweets', 'Listed as brown sugar lump; read as Japanese kokuto, which is whole unrefined cane sugar.'],
  [24999, 'Cocoa powder', 'cocoa', 'cocoa'], [25000, 'Dutch cocoa powder', 'cocoa', 'cocoa'], [559, 'Cocoa beans', 'cocoa', 'cocoa'],
  [4784, 'Unsweetened baking chocolate', 'cocoa', 'cocoa'],
  [94, 'Baking soda', 'leavener', 'soda'], [37555, 'Baking soda', 'leavener', 'soda'],
  [20753, 'Baking soda', 'leavener', 'soda'], [12256, 'Baking soda', 'leavener', 'soda'],
  [2409, 'Chili pepper', 'vegetable', 'veg'], [38393, 'Chili pepper', 'vegetable', 'veg'],
  [25875, 'Mesclun', 'vegetable', 'veg'], [38493, 'Mesclun', 'vegetable', 'veg'],
  [2863, 'Ground beef', 'beef', 'meat'], [3288, 'Beef liver', 'organ_meat', 'meat'], [5026, 'Pork', 'pork', 'meat'],
  [11947, 'Beef ribs', 'beef', 'meat'], [39526, 'Pork tenderloin', 'pork', 'meat'], [40136, 'Veal', 'veal', 'meat'],
  [1739, 'Halibut', 'fish', 'fish'], [1740, 'Salmon', 'fish', 'fish'], [1741, 'Tuna', 'fish', 'fish'],
  [3969, 'Tahini', 'seed', 'seed'], [1800, 'Tahini', 'seed', 'seed'], [7405, 'Tahini', 'seed', 'seed'], [23688, 'Tahini', 'seed', 'seed'],
  [4692, 'Paneer', 'cheese', 'cheese'], [2189, 'Salad cheese', 'cheese', 'cheese'], [2172, 'Fresh cheese', 'cheese', 'cheese'],
  [4237, 'Cream cheese', 'cheese', 'cheese'],
  [8504, 'Mexican cheese blend', 'cheese', 'cheese', 'A blend of cheeses, kept under keep cheeses; bagged versions can carry an anti-caking agent.'],
  [26225, 'Mexican cheese blend', 'cheese', 'cheese', 'A blend of cheeses, kept under keep cheeses; bagged versions can carry an anti-caking agent.'],
  [463, 'Whey cheese', 'cheese', 'cheese'], [465, 'Whey cheese', 'cheese', 'cheese'],
  [464, 'Low-fat whey cheese', 'cheese', 'cheese'], [466, 'Low-fat whey cheese', 'cheese', 'cheese'],
  [95, 'Balsamic vinegar', 'vinegar_condiment', 'vinegar'],
  [7784, 'Blanched almonds', 'nut', 'nut'], [23633, 'Blanched almonds', 'nut', 'nut'],
  [7798, 'Blanched hazelnuts', 'nut', 'nut'], [23664, 'Blanched hazelnuts', 'nut', 'nut'], [21568, 'Brazil nuts', 'nut', 'nut'],
  [1641, 'Brown rice flour', 'flour', 'flour'],
];

for (const f of ['rule_hide.jsonl', 'to_read.jsonl']) {
  const copy = f.replace('.jsonl', '.before_rescue.jsonl');
  if (!fs.existsSync(S + '/' + copy)) fs.copyFileSync(S + '/' + f, S + '/' + copy);
}
const rule = rd('rule_hide.before_rescue.jsonl');
const toRead = rd('to_read.before_rescue.jsonl');
const byId = new Map(RESCUE.map((r) => [r[0], r]));
const verdict = (r) => ({ id: r[0], v: 'K', name: r[1], type: r[2], why: WHY[r[3]], q: r[4] || '', c: '' });

const outFiles = fs.readdirSync(S).filter((f) => /^out_.*\.jsonl$/.test(f) && f !== 'out_rescue.jsonl');
const seen = new Set();
const fromRule = [];
wr('rule_hide.jsonl', rule.filter((r) => {
  if (!byId.has(r.id)) return true;
  seen.add(r.id); fromRule.push(r); return false;
}));
for (const f of outFiles) {
  const rows = rd(f);
  let changed = false;
  const next = rows.map((r) => {
    if (!byId.has(r.id)) return r;
    seen.add(r.id); changed = true;
    return verdict(byId.get(r.id));
  });
  if (changed) wr(f, next);
}
wr('to_read.jsonl', [...toRead, ...fromRule.map((r) => ({ id: r.id, src: r.src, en: r.en }))]);
wr('out_rescue.jsonl', fromRule.map((r) => verdict(byId.get(r.id))));
const missing = RESCUE.filter((r) => !seen.has(r[0]));
console.log('rescued from rules', fromRule.length, 'from readers', seen.size - fromRule.length, 'not found', missing.map((r) => r[0]).join(',') || 'none');
for (const r of fromRule) console.log(r.id, byId.get(r.id)[1], '<=', (r.en || '').slice(0, 60));
