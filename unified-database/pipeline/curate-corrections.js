// Applies the audit's corrections to the reader part files in place. The untouched
// files are copied to before_corrections/ first; a second run starts from that copy.
const fs = require('fs');
const S = process.argv[2];
const B = S + '/before_corrections';
if (!fs.existsSync(B)) {
  fs.mkdirSync(B);
  for (const f of fs.readdirSync(S).filter((f) => /^out_.*\.jsonl$/.test(f))) fs.copyFileSync(S + '/' + f, B + '/' + f);
}
const files = fs.readdirSync(B).filter((f) => /^out_.*\.jsonl$/.test(f));
const parts = new Map(files.map((f) => [f, fs.readFileSync(B + '/' + f, 'utf8').split('\n').filter((l) => l.trim()).map(JSON.parse)]));
const all = [...parts.values()].flat();
const byId = new Map(all.map((v) => [v.id, v]));
const count = {};
const note = (k) => { count[k] = (count[k] || 0) + 1; };

// 1. One name per food: [name to replace, name it becomes].
const RENAME = [
  ['Plums', 'Plum'], ['Mandarins', 'Mandarin'], ['Dried persimmons', 'Dried persimmon'], ['Dried jujubes', 'Dried jujube'],
  ['Bell peppers', 'Bell pepper'], ['Frozen bell peppers', 'Frozen bell pepper'], ['Hungarian peppers', 'Hungarian pepper'],
  ['Potatoes', 'Potato'], ['Scallops', 'Scallop'], ['Lamb brains', 'Lamb brain'], ['Lamb sweetbreads', 'Lamb sweetbread'],
  ['Anchovies', 'Anchovy'], ['Sardines', 'Sardine'], ['Oysters', 'Oyster'], ['Clams', 'Clam'], ['Mussels', 'Mussel'], ['Snails', 'Snail'],
  ['Leeks', 'Leek'], ['Carrots', 'Carrot'], ['Frozen onions', 'Frozen onion'], ['Shallots', 'Shallot'],
  ['Gruyère cheese', 'Gruyere cheese'], ['Gruyere', 'Gruyere cheese'], ['Gruyère', 'Gruyere cheese'], ['Mascarpone cheese', 'Mascarpone'],
  ['Corn starch', 'Cornstarch'], ['Guineafowl', 'Guinea fowl'], ['Passionfruit', 'Passion fruit'],
  ['Starfruit', 'Star fruit'], ['Carambola', 'Star fruit'], ['Pummelo', 'Pomelo'], ['Kiwifruit', 'Kiwi'],
  ['Bay leaves', 'Bay leaf'], ['Blackcurrants', 'Black currants'], ['Whole chicken', 'Chicken'], ['Tallow', 'Beef tallow'],
  ['Crabapples', 'Crab apple'], ['Hyuganatsu citrus', 'Hyuganatsu'], ['Palm hearts', 'Hearts of palm'],
  ['Vital wheat gluten', 'Wheat gluten'], ['Salted cod', 'Salt cod'], ['Dried reindeer', 'Dried reindeer meat'],
  ['Ancho chiles', 'Ancho chile'], ['Jalapeno pepper', 'Jalapeno'], ['Beef ribeye steak', 'Beef ribeye'],
  ['Seatrout', 'Weakfish'], ['Sea lion', 'Sea lion meat'], ['Walrus', 'Walrus meat'], ['Turtle', 'Turtle meat'], ['Goat', 'Goat meat'],
  ['Cumin seed', 'Cumin'], ['Mache', 'Corn salad'], ["Lamb's lettuce", 'Corn salad'], ['Chard', 'Swiss chard'], ['Rapini', 'Broccoli rabe'],
  ['Skim milk powder', 'Nonfat milk powder'], ['Dry whey', 'Acid whey powder'], ['Zander', 'Pikeperch'], ['Caribou', 'Reindeer'],
];
const rename = new Map(RENAME.map(([a, b]) => [a.toLowerCase(), b]));
for (const v of all) {
  if (v.v !== 'K') continue;
  const to = rename.get((v.name || '').toLowerCase());
  if (to) { v.name = to; v.c = 'name'; note('renamed'); }
}

// 2. Types outside the allowed list, and organs filed under the animal.
const ORGAN = /\b(brains?|liver|kidneys?|heart|tongue|lungs?|spleen|sweetbreads?|tripe|gizzards?|giblets?)\b/i;
for (const v of all) {
  if (v.type === 'vinegar') { v.type = 'vinegar_condiment'; note('type'); }
  if (v.type === 'nut_seed') { v.type = 'nut'; note('type'); }
  if (v.v !== 'K') continue;
  if (/^sauerkraut juice$/i.test(v.name)) { v.type = 'juice'; note('type'); }
  if (/bolete/i.test(v.name) && v.type !== 'fungi') { v.type = 'fungi'; note('type'); }
  if (ORGAN.test(v.name) && ['beef', 'veal', 'pork', 'lamb_mutton', 'game', 'poultry'].includes(v.type)) { v.type = 'organ_meat'; note('type'); }
}

const hide = (id, why, q) => {
  const v = byId.get(id);
  if (!v) throw new Error('no row ' + id);
  v.v = 'H'; v.why = why; v.q = q || ''; delete v.name; v.c = 'hide'; note('flipped to hide');
};
const keep = (id, name, type, why, q) => {
  const v = byId.get(id);
  if (!v) throw new Error('no row ' + id);
  v.v = 'K'; v.name = name; v.type = type; v.why = why; v.q = q || ''; v.c = 'keep'; note('flipped to keep');
};

// 3. Mechanically separated meat: a machine-made paste, hidden the same way everywhere.
for (const v of all) {
  if (v.v === 'K' && /^mechanically separated/i.test(v.name)) hide(v.id, 'mechanically_separated');
}
hide(23746, 'mechanically_separated');
hide(5846, 'mechanically_separated');
for (const id of [5488, 9753]) { byId.get(id).why = 'mechanically_separated'; byId.get(id).q = ''; note('reason'); }

// 4. Pasta, one rule: flour and water or egg stays, with or without salt in the dough.
// Filled, flavoured, coloured, instant, fortified, alkaline and konjac stay hidden.
const PASTA = {
  'Fresh pasta': [1382, 35266, 28968],
  'Soba noodles': [35246, 35248, 21556, 25220, 6122],
  'Somen noodles': [35162, 35164, 25222, 6124],
  'Udon noodles': [35158, 35160],
  'Wheat noodles': [35267],
  'Barley noodles': [35132],
  'Egg noodles': [40491],
  'Whole wheat noodles': [1278],
  'Starch noodles': [35341],
  'Soy noodles': [40499, 7100, 27006],
};
for (const [name, ids] of Object.entries(PASTA)) for (const id of ids) keep(id, name, 'pasta_noodle', 'Plain pasta: flour and water or egg.');

// 5. Raw coconut milk is pressed from coconut and water.
const coconutType = (all.find((v) => v.v === 'K' && /^coconut cream$/i.test(v.name)) || {}).type || 'fruit';
keep(7388, 'Coconut milk', coconutType, 'Pressed from coconut and water.');
keep(23733, 'Coconut milk', coconutType, 'Pressed from coconut and water.');

// 6. Swedish "Ren" is reindeer, not "pure".
keep(4121, 'Reindeer', 'game', 'Raw reindeer; Swedish Ren mistranslated.');
keep(2865, 'Reindeer', 'game', 'Raw reindeer; Swedish Ren mistranslated.');

// 7. Human milk is not a food this list serves. Named in the report.
hide(2205, 'other', 'Human milk: hidden, can be reversed.');
hide(21500, 'other', 'Human milk: hidden, can be reversed.');

// 8. Boulette d'Avesnes is cheese worked with herbs and spices.
hide(37592, 'multi_ingredient');

// 9. Types the readers invented, and one type per name (the commonest wins).
const TYPE_MAP = { sweets: 'sweets_snacks', snack: 'sweets_snacks', beverage: 'soft_drink', substitute: 'other', cooked: 'prepared_dish', canned: 'vegetable' };
for (const v of all) if (TYPE_MAP[v.type]) { v.type = TYPE_MAP[v.type]; note('type'); }
const kept = all.filter((v) => v.v === 'K');
const byName = new Map();
kept.forEach((v) => { const k = v.name.toLowerCase(); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(v); });
const FORCE_TYPE = { 'cocoa butter': 'cocoa', quark: 'cultured_dairy', 'low-fat quark': 'cultured_dairy', 'veal fat': 'butter_animal_fat', 'lamb fat': 'butter_animal_fat', 'pork fat': 'butter_animal_fat', 'pork ears': 'pork', pheasant: 'poultry', quail: 'poultry' };
for (const [k, rows] of byName) {
  const tally = {};
  rows.forEach((v) => { tally[v.type] = (tally[v.type] || 0) + 1; });
  const best = FORCE_TYPE[k] || Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
  const spelled = {};
  rows.forEach((v) => { spelled[v.name] = (spelled[v.name] || 0) + 1; });
  const name = Object.entries(spelled).sort((a, b) => b[1] - a[1])[0][0];
  rows.forEach((v) => {
    if (v.type !== best) { v.type = best; note('type'); }
    if (v.name !== name) { v.name = name; note('renamed'); }
  });
}

// 10. "other" says nothing to a person reading the counts, so name what can be named.
const REFINE = [
  ['water', /\b(water|eau)\b/i, 'water'],
  ['tofu_or_soy_skin', /\b(tofu|yuba|soybean, curd)\b/i, 'soy_ferment'],
  ['gelatin', /\bgelatin/i, 'other'],
  ['prepared_drink', /\b(caff?e|cappuc+ino|espresso|latte|macchiato|cortado|flat white|mocha|coffee|tea)\b/i, 'tea_coffee'],
  ['juice_from_concentrate', /\b(concentrate|conc\.|reconstituted)\b/i, 'juice'],
  ['breakfast_cereal_or_puffed', /\b(cereals?|cornflakes|corn flakes|puffed|crunchies|snacks?|sticks)\b/i, 'grain'],
  ['reduced_fat_formula', /\b(light|half fat|reduced fat|nonfat or fat free|fat about 60%|fortified|recombined)\b/i, 'other'],
  ['fermented_aged_or_salted', /\b(aged|shiokara|salted|fermented|semi-preserved|matjes|uruka|ganzuke|neri-uni|tsubu-uni)\b/i, 'other'],
  ['surimi', /\bsurimi\b/i, 'fish'],
  ['additive', /\bE \d{3}\b|\bpectin\b|\bgums\b|paraffin|cooking spray|fully hardened/i, 'other'],
];
const enOf = new Map(fs.readFileSync(S + '/to_read.jsonl', 'utf8').split('\n').filter((l) => l.trim()).map((l) => { const r = JSON.parse(l); return [r.id, r.en]; }));
for (const v of all) {
  if (v.v !== 'H' || v.why !== 'other') continue;
  const en = enOf.get(v.id) || '';
  const hit = REFINE.find(([, re]) => re.test(en));
  if (hit) {
    v.why = hit[0];
    if (v.type === 'other') v.type = hit[2];
    note('reason');
  }
}

for (const [f, rows] of parts) fs.writeFileSync(S + '/' + f, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(count);

const ALLOWED = 'beef veal pork lamb_mutton game organ_meat poultry eggs fish shellfish roe milk_cream cheese cultured_dairy butter_animal_fat plant_oil vegetable fungi seaweed fruit juice herb_spice salt_mineral grain flour pasta_noodle starch legume soy_ferment nut seed sweetener leavener vinegar_condiment tea_coffee cocoa baby_food baked_goods sweets_snacks prepared_dish processed_meat soft_drink alcohol supplement other'.split(' ');
const odd = {};
all.forEach((v) => { if (!ALLOWED.includes(v.type)) odd[v.type] = (odd[v.type] || 0) + 1; });
console.log('types outside the list', odd);
const nameType = new Map();
all.filter((v) => v.v === 'K').forEach((v) => {
  const k = v.name.toLowerCase();
  if (!nameType.has(k)) nameType.set(k, {});
  nameType.get(k)[v.type] = (nameType.get(k)[v.type] || 0) + 1;
});
console.log('one name, several types:', [...nameType.entries()].filter(([, t]) => Object.keys(t).length > 1).map(([n, t]) => n + ' ' + JSON.stringify(t)).join(' ; '));
