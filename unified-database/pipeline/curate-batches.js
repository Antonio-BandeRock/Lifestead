// Splits the rows the first pass could not settle into reading batches, grouped
// by food family and sorted so copies of one food from different countries sit
// together, which is what keeps their listing names identical.
//
// Usage: node curate-batches.js <dir> <pilotCount> <batchCount>

const fs = require('fs');
const path = require('path');

const FAMILIES = [
  ['beef_veal', /^(beef|veal|calf|bison|buffalo|ox)\b|\b(beef|veal)\b/i],
  ['pork_lamb_game', /^(pork|pig|lamb|mutton|sheep|goat|game|venison|deer|elk|moose|rabbit|hare|horse|boar|reindeer|bear|kangaroo|whale|seal)\b|\b(pork|lamb|mutton|game meat|offal|liver|kidney|heart|tongue|tripe|blood|lard|tallow)\b/i],
  ['poultry_egg', /^(chicken|turkey|duck|goose|quail|pheasant|poultry|guinea|ostrich|emu|squab|pigeon|egg|eggs)\b|\b(chicken|turkey|egg|eggs|yolk)\b/i],
  ['seafood', /\b(fish|salmon|trout|tuna|cod|herring|mackerel|sardine|anchovy|shrimp|prawn|crab|lobster|clam|mussel|oyster|scallop|squid|octopus|cuttlefish|mollusks?|crustaceans?|roe|caviar|eel|halibut|haddock|pollock|sole|perch|pike|carp|seabream|bass|snapper|shark|ray|swordfish|plaice|hake|whiting|tilapia|catfish|sea urchin|seaweed|algae|kelp|nori|wakame|kombu)\b/i],
  ['dairy', /\b(milk|cream|cheese|yogh?urt|yogourt|kefir|butter|buttermilk|quark|whey|ghee|skyr|curd|sour cream|lait|fromage|k[aä]se|ost)\b/i],
  ['grain_flour', /\b(flours?|wheat|rice|oats?|oat|barley|rye|spelt|millet|sorghum|quinoa|amaranth|buckwheat|corn|maize|cornmeal|semolina|couscous|bulgur|pasta|noodles?|spaghetti|macaroni|grain|grains|bran|germ|cereals?|starch|tapioca|teff|tortilla)\b/i],
  ['legume_nut_seed', /\b(beans?|peas?|lentils?|chickpeas?|soy|soybeans?|tofu|tempeh|miso|natto|lupin|nuts?|almonds?|walnuts?|pecans?|cashews?|hazelnuts?|pistachios?|peanuts?|chestnuts?|macadamia|seeds?|sesame|flax|linseed|chia|hemp|pumpkin seed|sunflower)\b/i],
  ['fruit', /\b(apples?|pears?|bananas?|oranges?|lemons?|limes?|grapefruit|mandarin|tangerine|berries|berry|strawberr\w*|blueberr\w*|raspberr\w*|blackberr\w*|cranberr\w*|currants?|cherr\w*|plums?|prunes?|peach\w*|nectarines?|apricots?|grapes?|raisins?|figs?|dates?|melons?|watermelon|pineapple|mango\w*|papaya|kiwi|guava|passion|pomegranate|persimmon|avocado|olives?|fruit|fruits|juice|coconut|lychee|rhubarb)\b/i],
  ['herb_spice_pantry', /\b(spices?|herbs?|salt|pepper|cinnamon|cumin|paprika|basil|thyme|oregano|parsley|dill|mint|rosemary|sage|ginger|turmeric|vanilla|nutmeg|clove|cardamom|coriander|mustard|honey|sugar|syrup|molasses|maple|yeast|baking|vinegar|cocoa|coffee|tea|oil|fat|sauce|soda|tartar|gelatin|extract|water)\b/i],
  ['vegetable_fungi', /./],
];
const familyOf = (r) => FAMILIES.find(([, re]) => re.test(r.en || r.orig || ''))[0];

function line(r) {
  const n = r.n || {};
  const nu = [['kc', n.energy_kcal], ['w', n.water], ['p', n.protein], ['f', n.fat_total], ['cb', n.carbohydrate], ['sg', n.sugars_total], ['na', n.sodium]]
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}${+(+v).toFixed(2)}`)
    .join(' ');
  const heat = r.lang ? r.lang.filter((c) => /^[FGHJ]/.test(c)).join(',') : '';
  return [r.id, r.src.split('_')[0], r.en, r.orig || '', r.cat || '', r.latin || '', r.keywords && r.keywords.length ? r.keywords.join('/') : '', heat, nu]
    .join(' | ')
    .replace(/\s*\n\s*/g, ' ');
}

const [dir, pilotArg, batchArg] = process.argv.slice(2);
const rows = fs.readFileSync(path.join(dir, 'to_read.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const sortKey = (r) => (r.en || '').toLowerCase().replace(/[^a-z ]/g, ' ').split(' ').filter(Boolean).slice(0, 3).sort().join(' ');
for (const r of rows) {
  r.family = familyOf(r);
  r.key = sortKey(r);
}
rows.sort((a, b) => a.family.localeCompare(b.family) || a.key.localeCompare(b.key) || a.id - b.id);
const counts = {};
rows.forEach((r) => {
  counts[r.family] = (counts[r.family] || 0) + 1;
});
console.log(counts);

// A pilot already read stays read: its rows are left out rather than picked again.
const pilotOut = path.join(dir, 'out_pilot.jsonl');
const pilotIds = new Set();
if (fs.existsSync(pilotOut)) {
  fs.readFileSync(pilotOut, 'utf8').split('\n').filter(Boolean).forEach((l) => pilotIds.add(JSON.parse(l).id));
} else {
  const pilotN = +pilotArg;
  const step = Math.floor(rows.length / pilotN);
  const pilot = rows.filter((_, i) => i % step === 0).slice(0, pilotN);
  pilot.forEach((r) => pilotIds.add(r.id));
  fs.writeFileSync(path.join(dir, 'batch_pilot.txt'), pilot.map(line).join('\n') + '\n');
}
const rest = rows.filter((r) => !pilotIds.has(r.id));
const size = Math.ceil(rest.length / +batchArg);
for (let b = 0; b < +batchArg; b++) {
  const part = rest.slice(b * size, (b + 1) * size);
  fs.writeFileSync(path.join(dir, `batch_${b + 1}.txt`), part.map(line).join('\n') + '\n');
  const fams = {};
  part.forEach((r) => {
    fams[r.family] = (fams[r.family] || 0) + 1;
  });
  console.log(`batch_${b + 1}`, part.length, JSON.stringify(fams));
}
fs.writeFileSync(path.join(dir, 'families.json'), JSON.stringify(Object.fromEntries(rows.map((r) => [r.id, r.family]))));
