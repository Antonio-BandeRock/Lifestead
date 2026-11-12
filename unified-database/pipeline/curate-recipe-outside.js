// Where each ingredient in curated_recipe_unlisted_ingredients stands against the curated list.
// That table holds what recipes use and the live food list never had. Every name is placed by hand,
// because a word match reads "banana leaves" as Banana and "wheat beer" as Wheat.
// Names are lower case and trimmed, the way curate-recipe-check.js reads them.
const C = require('./curate-cautions');

module.exports = ({ listed, swap, home, named, missing, aid, SEED_OIL, G }) => {
  const out = {};
  const put = (value, ...names) => { for (const n of names) { if (out[n]) throw new Error(`placed twice: ${n}`); out[n] = value; } };
  const single = (stand) => named(G.NOSOURCE, stand);

  // On the list, under this name or another one.
  put(listed('Baking soda'), 'baking soda');
  put(listed('Salt'), 'coarse salt for the crust, peeled away with the skin and not eaten');
  put(listed('Black tea'), 'loose black tea leaves');

  // A listed food does the job, and the wording of the recipe changes.
  put(swap('Veal foot', 'A calf foot for a cow foot'), 'cow foot');

  // Made in a kitchen from listed foods.

  // Not eaten as a food, so no food list needs it: a wrapper, or something that does a job in the pot.
  put(aid('Sets, cures or firms a food'), 'cal (food grade slaked lime, calcium hydroxide)', 'rennet (cuajo)', 'food-grade lye (sodium hydroxide), for a 4% bath', 'lye water (kansui)', 'food-grade gypsum (calcium sulphate)', 'calcium chloride', 'wood ash (ceniza), sifted');
  put(aid('Colour only'), 'red food colouring', 'natural food colouring', 'red food colouring (or a little cochineal, as was done before)');
  put(aid('Used to clean or soak a food, then poured away'), 'lemon juice, for the soaking water', 'lime juice, for the soaking water');
  put(aid('Steeped for flavour, then strained out'), 'orange peel, in wide strips');
  put(aid('A wrapper or lining'), 'banana leaves', 'dried corn husks', 'fresh green corn husks', 'fresh green corn plant leaves (hojas de milpa)', 'maguey leaves (pencas)', 'mixiote sheets (maguey membrane) or parchment', 'dried bamboo leaves', 'dried lotus leaves', 'tomatillo husks');

  // Listed by the owner's fourth round, 2026-11-06.
  // No source has these, so the recipe keeps the name.
  put(named(G.NOSOURCE), 'pulque');

  // Listed by the owner's third round, 2026-11-06.
  // Bitter kernels carry the same cyanide risk as the bitter almonds the owner hid for safety.

  // No source has these, so the recipe keeps the name with no nutrition behind it, as the app does today (owner's call, 2026-11-06).
  put(single('Whole cane sugar'), 'sugar cane', 'sugarcane', 'sugarcane sticks');
  put(single('Anise seed, though the taste differs'), 'star anise');
  put(single(), 'juniper berries', 'galangal', 'sand ginger (dried slices)', 'sand ginger powder', 'fingerroot (krachai)', 'krachai (fingerroot)', 'makrut lime leaves', 'makrut lime peel', 'pandan leaves', 'achiote (annatto) seeds', 'annatto seeds (hạt điều màu)', 'annatto seeds', 'avocado leaves', 'dried avocado leaves', 'dried avocado leaves (hojas de aguacate)', 'hoja santa leaves', 'hoja santa', 'lovage', 'salad burnet (pimpinelle)', 'rice paddy herb (ngò om)', 'wild betel leaves (lá lốt)', 'sweet leaf (rau ngót, sauropus androgynus)', 'vietnamese balm (kinh giới)', 'romeritos (seepweed greens)', 'rosita de cacao flowers (quararibea funebris)', 'banana blossom (bắp chuối)', 'banana blossom', 'huitlacoche (fresh or frozen)', 'tejocotes', 'gấc fruit pulp', 'mamey seed kernels (pixtle)', 'escamoles (ant larvae; can cross-react with a shellfish allergy)', 'fresh chapulines (grasshoppers; can cross-react with a shellfish allergy)', 'jumiles (taxco stink bugs; can cross-react with a shellfish allergy)');
  put(single('Cilantro'), 'vietnamese coriander (rau răm)', 'culantro (ngò gai)', 'sawtooth coriander (culantro)', 'culantro (sawtooth coriander)');
  // Recipes added on 1.0.85.2, placed 2026-11-11.
  put(listed('Sauerkraut juice'), 'sauerkraut brine');
  put(listed('Turmeric'), 'fresh turmeric root');
  put(listed('Lime'), 'lime zest');
  put(listed('Dried chili peppers'), 'dried cascabel chiles');
  put(listed('Ground chili pepper'), "piment d'espelette");
  put(listed('Tarragon'), 'tarragon, fresh');
  put(listed('Chervil'), 'chervil, fresh');
  put(listed('Sweetened condensed milk'), 'sweetened condensed milk');
  put(listed('Pork'), 'pork bones');
  put(swap('Burdock root', 'Fresh burdock root in place of dried'), 'dried burdock root');
  put(swap('Shallot', 'A shallot in place of the small wild shallot'), 'củ nén (small vietnamese wild shallot)');
  put(home('Pomegranate juice boiled down until thick'), 'pomegranate molasses');
  put(home('Ginger, sugar and water left to ferment'), 'ginger bug, strained');
  put(home('Crayfish shells cooked in butter, then strained'), "crayfish butter (beurre d'écrevisse)");
  put(home('Caraway, fennel, anise and coriander seeds, ground'), 'bread spice mix (brotgewürz)');
  put(aid('Sets, cures or firms a food'), 'cutter phosphate (sausage binding salt)', 'cure #2 (curing salt with nitrite and nitrate)', 'alum (phèn chua)');
  put(named(G.FERMENT), 'nuruk (korean wheat fermentation starter)', 'plain kombucha, finished first ferment', 'red yeast rice powder', 'tai pla (fermented fish innards)');
  put(named(G.SAUCES), 'sriracha', 'coconut aminos', 'minced crab in spice (gia vị nấu riêu cua)', 'char siu seasoning mix (gia vị xá xíu)');
  put(named(G.PANTRY), 'liquid smoke', 'almond extract', 'pandan extract', 'chicken bouillon powder', 'chicken bouillon powder (hạt nêm)', 'coconut soda', 'dried ram (ram khô) for cao lầu', 'chinese five-spice powder');
  put(single('Anise seed, though the taste differs'), 'ground star anise');
  put(single('Whole cane sugar'), 'coconut palm sugar');
  put(single(), 'dried dandelion root', 'asafoetida (hing)', 'dried hop pellets', 'sumac', 'mauby (mabí) bark, dried', 'achiote (annatto) powder', 'annatto oil (dầu điều)', 'lemon balm (zitronenmelisse)', 'mung bean starch', 'sand ginger', 'licorice root', 'dried rose buds, ground', 'fresh green peppercorns');
  return out;
};
