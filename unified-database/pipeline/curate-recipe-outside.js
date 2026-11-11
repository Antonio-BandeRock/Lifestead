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
  put(aid('Used to clean or soak a food, then poured away'), 'lime juice, for cleaning the tripe', 'lemon juice, for the soaking water', 'lime juice, for the soaking water');
  put(aid('Steeped for flavour, then strained out'), 'orange peel, in wide strips');
  put(aid('A wrapper or lining'), 'banana leaves', 'dried corn husks', 'fresh green corn husks', 'fresh green corn plant leaves (hojas de milpa)', 'maguey leaves (pencas)', 'mixiote sheets (maguey membrane) or parchment', 'dried bamboo leaves', 'dried lotus leaves', 'tomatillo husks');

  // Listed by the owner's fourth round, 2026-11-06.
  // No source has these, so the recipe keeps the name.
  put(named(G.NOSOURCE), 'pulque');

  // Listed by the owner's third round, 2026-11-06.
  // Bitter kernels carry the same cyanide risk as the bitter almonds the owner hid for safety.

  // No source has these, so the recipe keeps the name with no nutrition behind it, as the app does today (owner's call, 2026-11-06).
  put(named(G.PANTRY), 'pandan paste');
  put(single('Whole cane sugar'), 'sugar cane', 'sugarcane', 'sugarcane sticks');
  put(single('Anise seed, though the taste differs'), 'star anise');
  put(single(), 'juniper berries', 'galangal', 'sand ginger (dried slices)', 'sand ginger powder', 'fingerroot (krachai)', 'krachai (fingerroot)', 'makrut lime leaves', 'makrut lime peel', 'pandan leaves', 'achiote (annatto) seeds', 'annatto seeds (hạt điều màu)', 'annatto seeds', 'avocado leaves', 'dried avocado leaves', 'dried avocado leaves (hojas de aguacate)', 'hoja santa leaves', 'hoja santa', 'lovage', 'salad burnet (pimpinelle)', 'rice paddy herb (ngò om)', 'wild betel leaves (lá lốt)', 'sweet leaf (rau ngót, sauropus androgynus)', 'vietnamese balm (kinh giới)', 'romeritos (seepweed greens)', 'rosita de cacao flowers (quararibea funebris)', 'banana blossom (bắp chuối)', 'banana blossom', 'huitlacoche (fresh or frozen)', 'tejocotes', 'gấc fruit pulp', 'mamey seed kernels (pixtle)', 'escamoles (ant larvae)', 'fresh chapulines (grasshoppers)', 'jumiles (taxco stink bugs)');
  put(single('Cilantro'), 'vietnamese coriander (rau răm)', 'culantro (ngò gai)', 'sawtooth coriander (culantro)', 'culantro (sawtooth coriander)');
  return out;
};
