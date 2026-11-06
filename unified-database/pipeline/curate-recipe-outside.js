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
  put(listed('Beef marrow bone'), 'beef marrow and soup bones', 'beef marrow and knuckle bones', 'beef marrow bone', 'beef bones');
  put(listed('Beef marrow'), 'beef bone marrow');
  put(listed('Dried shrimp'), 'dried shrimp', 'dried shrimp (tôm khô)');
  put(listed('Lemongrass'), 'lemongrass');
  put(listed('Chicken back'), 'chicken backs, necks and wings, or a roast chicken carcass');
  put(listed('Cardamom'), 'green cardamom pods');
  put(listed('Pork belly'), 'fresh pork belly with skin', 'pork belly with skin (or pork skin with some fat)');
  put(listed('Salt pork'), 'salted pork belly (lardons)', 'salted pork belly (poitrine salée)', 'half-salted pork belly (poitrine demi-sel)');
  put(listed('Sour orange juice'), 'sour orange juice (naranja agria)');
  put(listed('Baking soda'), 'baking soda');
  put(listed('Evaporated milk'), 'evaporated milk');
  put(listed('Turmeric'), 'fresh turmeric root');
  put(listed('Tapioca starch'), 'tapioca starch');
  put(listed('Orange peel'), 'orange peel', 'orange zest');
  put(listed('Lemon peel'), 'lemon zest');
  put(listed('Pancetta'), 'pancetta');
  put(listed('Salt'), 'coarse pretzel salt', 'coarse salt for the crust, peeled away with the skin and not eaten');
  put(listed('Pickled mustard greens'), 'pickled mustard greens (pak gaad dong)');
  put(listed('Sesame oil'), 'toasted sesame oil');
  put(listed('White pepper'), 'white pepper', 'white pepper, ground', 'ground white pepper');
  put(listed('Black pepper'), 'black peppercorns');
  put(listed('Beef brain'), 'beef brains (sesos de res)');
  put(listed('Beef small intestine'), 'beef small intestine (tripa de leche)');
  put(listed('Beef tongue'), 'beef tongue (lengua de res)');
  put(listed('Beef cheek'), 'beef cheek (cachete)', 'beef head meat (cheek, snout, palate)');
  put(listed('Beef blood'), 'beef blood');
  put(listed('Beef tripe'), 'beef tripe (honeycomb and blanket), cleaned and precooked', 'beef tripe (honeycomb, book and smooth, mixed)');
  put(listed('Beef'), 'beef eye with surrounding meat (ojo de res)', 'beef lip (labio de res)');
  put(listed('Beef oxtail'), 'oxtail, cut in sections', 'oxtail, cut through the joints');
  put(listed('Corned beef'), 'corned beef brisket (pökelrinderbrust)');
  put(listed('Beef jerky'), 'vietnamese beef jerky (bò khô)');
  put(listed('Hen'), 'boiling hen (suppenhuhn), whole');
  put(listed('Chicken fat'), 'chicken fat (from the cavity of the chicken)');
  put(listed('Cinnamon'), 'cinnamon stick', 'cinnamon sticks');
  put(listed('Cloves'), 'whole cloves');
  put(listed('Mace'), 'mace');
  put(listed('Vanilla bean'), 'vanilla pod');
  put(listed('Matjes herring'), 'matjes herring fillets (mild-cured young herring)');
  put(listed('Mortadella'), 'mortadella di bologna');
  put(listed('Prosciutto'), 'prosciutto crudo di parma');
  put(listed('Ham'), 'jamón cocido (cooked ham)');
  put(listed('Hot dog'), 'salchichas tipo viena (vienna sausages)');
  put(listed('Bacon'), 'pork belly, smoked');
  put(listed('Water spinach'), 'water spinach stems (rau muống chẻ)');
  put(listed('Baby corn'), 'baby corn');
  put(listed('Snail'), 'burgundy snails, prepared, with their shells');
  put(listed('Catfish'), 'catfish', 'catfish or snakehead fillets', 'catfish or snakehead steaks', 'catfish steaks, bone in');
  put(listed('Comté cheese'), 'comté cheese');
  put(listed('Conger eel'), 'conger eel');
  put(listed('Wheat berries'), 'cooked wheat berries (grano cotto)');
  put(listed('Crottin de Chavignol'), 'crottin de chavignol or other small goat cheese');
  put(listed('Salt cod'), 'dried salt cod (bacalao)');
  put(listed('Dried squid'), 'dried squid (mực khô)');
  put(listed('Dried yuba'), 'dried tofu skin (tàu hũ ky)', 'dried bean curd sticks (fu zhu)');
  put(listed('Emmental'), 'emmental, grated');
  put(listed('Fromage blanc'), 'fromage blanc (40% fat)');
  put(listed('Chinese chives'), 'garlic chives');
  put(listed('Carp'), 'grass carp');
  put(listed('Banana'), 'green banana');
  put(listed('Papaya'), 'green papaya');
  put(listed('Ground coffee'), 'ground coffee, dark roast, medium-coarse grind');
  put(listed('Pork'), 'fresh pork cheek (guanciale fresco)', 'half-salted pork hock (jarret demi-sel)', 'pork hock (giò heo), cut in rounds', 'pork head or spine (espinazo)', 'pork hocks (schweinshaxen), hind, with rind', 'pork leg (hock), bone-in with skin', 'pork or veal bones, chopped small');
  put(listed('Pork ribs'), 'half-salted pork ribs (travers demi-sel)', 'pork ribs');
  put(listed('Pork shoulder'), 'lightly salted pork shoulder (palette demi-sel) or ham hock');
  put(listed('Pork skin'), 'pork skin (cuero de cerdo)');
  put(listed('Pork stomach'), 'pork stomach (buche)');
  put(listed('John Dory'), 'john dory (saint-pierre)');
  put(listed('Black tea'), 'loose black tea leaves');
  put(listed('Mamey sapote'), 'mamey sapote');
  put(listed('Mung bean noodles'), 'mung bean glass noodles');
  put(listed('Sunflower oil'), 'peanut or sunflower oil for deep frying', 'seed oil for frying (peanut or sunflower)', 'seed oil for deep frying (peanut or sunflower)');
  put(listed('Pickled garlic'), 'pickled garlic');
  put(listed('Gurnard'), 'red gurnard (galinette)');
  put(listed('Scorpionfish'), 'scorpionfish, gurnard or dogfish (palombo) in pieces', 'scorpion fish (rascasse)');
  put(listed('Stockfish'), 'stockfish (stoccafisso), soaked');
  put(listed('Taro stems'), 'taro stem (bạc hà)', 'taro stem (bạc hà, dọc mùng)');
  put(listed('Water'), 'vichy or other sparkling mineral water');
  put(listed('Goat meat'), 'bone-in goat (chivo)');
  put(listed('Dried cloud ear mushrooms'), 'dried cloud ear fungus');
  put(listed('Fontina cheese'), "fontina valle d'aosta dop");
  put(listed('Parmesan cheese'), 'parmigiano reggiano rind');
  put(listed('Tomme cheese'), "tomme fraîche de l'aubrac (or laguiole)");
  put(listed('Dried chili peppers'), 'dried chiles morita');
  put(listed('Alpine cheese'), 'allgäuer bergkäse (mountain cheese)');

  // A listed food does the job, and the wording of the recipe changes.
  put(swap('Soy sauce', 'Dark soy is thicker and sweeter'), 'dark soy sauce', 'thai dark soy sauce', 'dark sweet soy sauce');
  put(swap('Grain vinegar', 'Black vinegar is darker and malty'), 'chinese black vinegar (zhenjiang)', 'chinkiang black vinegar', 'chinese black vinegar', 'zhenjiang black vinegar');
  put(swap('Cardamom', 'Black cardamom is a different, smoky pod'), 'black cardamom', 'black cardamom pod');
  put(swap('Cilantro', 'The root of the same plant, and stems come closest'), 'coriander root', 'coriander roots', 'cilantro roots');
  put(swap('Basil', 'Thai, holy and lemon basil are other varieties'), 'thai basil (húng quế)', 'thai basil leaves (húng quế)', 'thai basil leaves', 'holy basil (kaphrao)', 'holy basil (bai kaprao)', 'lemon basil (bai maenglak)');
  put(swap('Veal', 'Bones of the listed meat'), 'veal bones (knuckle and marrow bones)');
  put(swap('Radish', 'The tops of the same plant'), 'radish leaves');
  put(swap('Wheat noodles', 'Alkaline noodles are chewier'), 'fresh alkaline wheat noodles', 'fresh thin wheat noodles');
  put(swap('Rice noodles', 'A regional noodle'), 'bánh canh noodles (thick tapioca and rice flour noodles)', 'cao lầu noodles (rice noodles made with ash lye water)', 'fresh mì quảng noodles (wide turmeric rice noodles)');
  put(swap('Firm tofu', 'Simmer it with spices'), 'spiced dry tofu (dougan)');
  put(swap('Salted mustard greens', 'A similar preserved green'), 'dried preserved mustard greens (mei cai)', 'sui mi ya cai (preserved mustard greens)');
  put(swap('Scallop', 'Fresh for dried'), 'dried scallops (conpoy)');
  put(swap('Eggplant', 'A small Thai variety'), 'pea eggplant (makhuea phuang)');
  put(swap('Goat meat', 'Another part of the animal'), 'kid goat intestine (tripa de leche)', 'kid goat liver, heart and lung (asadura de cabrito)');
  put(swap('Veal foot', 'A calf foot for a cow foot'), 'cow foot');
  put(swap('Dried chrysanthemum petals', 'Petals for buds'), 'dried chrysanthemum buds');
  put(swap('Ricotta cheese', 'Fresh for salted'), 'ricotta salata');
  put(swap('Provolone cheese', 'The same family of stretched cheese'), 'caciocavallo cheese');
  put(swap('Tomme cheese', 'A similar mountain cheese'), 'toma cheese');
  put(swap('Jaggery', 'The same kind of unrefined sugar, which may be cane rather than palm'), 'palm sugar');
  put(swap('Black pepper', 'Dried for fresh, from the same plant'), 'fresh green peppercorns');
  put(swap('Queso asadero', 'A similar melting cheese'), 'queso oaxaca', 'quesillo (oaxaca string cheese)');
  put(swap('Queso fresco', 'A similar fresh cheese'), 'queso panela');
  put(swap('Dried beef', 'A similar salted, dried beef'), 'tasajo (thin salted, part-dried beef)');
  put(swap('Lard', 'Asiento is browned lard'), 'asiento (the browned pork fat from the bottom of the chicharrón pot)');
  put(swap('Pancetta', 'A similar salted belly'), 'ventrèche or lard maigre (salt-cured pork belly)');
  put(swap('Bell pepper', 'A similar mild pepper'), "mild green frying peppers (piment d'anglet)");
  put(swap('Cod', 'Bones and heads of the listed fish'), 'white fish bones and heads (sole, turbot, whiting), gills removed', 'white fish heads and bones (sea bass, sea bream, gurnard, scorpionfish)', 'white fish bones and heads (plaice, cod, sole), gills removed');
  put(swap('Carp', 'The head of the listed fish'), 'fish head (bighead or silver carp)');
  put(swap('Scorpionfish', 'One of the rock fish named'), 'small mediterranean rock fish for the soup (girelles, rascasses, small wrasse)');

  // Made in a kitchen from listed foods.
  put(home('Bread, dried and ground'), 'dry breadcrumbs', 'fine dry breadcrumbs (semmelbrösel)', 'breadcrumbs', 'pan molido (dry bread crumbs)', 'fine breadcrumbs');
  put(home('A mix of spices, which needs star anise and Sichuan pepper'), 'chinese five-spice powder', 'five-spice powder', 'chinese five spice powder');
  put(home('A mix of listed spices'), 'lebkuchen spice', 'lebkuchen spice (cinnamon, cloves, allspice, cardamom, coriander, nutmeg, ginger)', 'quatre-épices (pepper, nutmeg, clove and ginger)', 'quatre-épices (pepper, nutmeg, clove and ginger blend)');
  put(home('Citrus peel simmered in sugar'), 'candied lemon peel (zitronat)', 'candied orange peel', 'candied orange peel (orangeat)', 'candied citron peel', 'candied citron and orange peel', 'candied cherries or candied orange peel');
  put(home('The peel of a mandarin, dried'), 'dried tangerine peel', 'dried tangerine peel (chenpi)');
  put(home('Fruit and sugar'), 'fruit jam (apricot, peach or cherry)', 'jam (plum, raspberry or red currant)', 'raspberry jam', 'red currant jelly');
  put(home('Almonds and sugar'), 'marzipan');
  put(home('Adzuki beans and sugar'), 'sweetened red bean paste', 'sweetened red bean paste or lotus seed paste');
  put(home('Pork blood, set by simmering'), 'cooked pork blood cake (huyết heo)', 'pork blood cake');
  put(home('Pork skin fried in its fat'), 'fried pork rind (tóp mỡ)', 'pork cracklings (tóp mỡ)', 'pork rinds (kaep moo)');
  put(home('Ground beef, worked and simmered'), 'beef balls');
  put(home('Chicken simmered to a stock'), 'chicken stock powder');
  put(home('Duck legs cooked slowly in duck or goose fat'), 'duck or goose confit legs, with a little of their fat');
  put(home('Duck egg and salt'), 'salted duck egg yolk', 'salted duck egg yolks', 'salted duck eggs');
  put(home('Egg, flour, yeast and butter'), 'oaxacan pan de yema (egg bread)');
  put(home('Radish, salt and sugar'), 'sweet preserved radish (chai po)');
  put(home('Sugar and water'), 'fondant icing');
  put(home('Milk, cream, egg and sugar'), 'vanilla ice cream', 'vanilla or fior di latte gelato');
  put(home('Flour, honey, sugar and spices'), 'aachener printen (spiced gingerbread)');
  put(home('Vegetable, vinegar and salt'), 'pickled leeks (củ kiệu)', 'pickled chiles güeros', 'pickled chilies (pao la jiao)', 'sichuan pickled chilies (pao jiao)', 'pickled long beans', 'pickled lotus stems (ngó sen)', 'pickle brine from the gewürzgurken');

  // Not eaten as a food, so no food list needs it: a wrapper, or something that does a job in the pot.
  put(aid('Sets, cures or firms a food'), 'cal (food grade slaked lime, calcium hydroxide)', 'rennet (cuajo)', 'food-grade lye (sodium hydroxide), for a 4% bath', 'lye water (kansui)', 'food-grade gypsum (calcium sulphate)', 'calcium chloride', 'wood ash (ceniza), sifted', 'curing salt (nitritpökelsalz)');
  put(aid('Colour only'), 'red food colouring', 'natural food colouring', 'red food colouring (or a little cochineal, as was done before)');
  put(aid('A wrapper or lining'), 'banana leaves', 'dried corn husks', 'fresh green corn husks', 'fresh green corn plant leaves (hojas de milpa)', 'maguey leaves (pencas)', 'mixiote sheets (maguey membrane) or parchment', 'dried bamboo leaves', 'dried lotus leaves', 'tomatillo husks');

  // Listed by the owner's fourth round, 2026-11-06.
  put(listed('Shaoxing wine'), 'shaoxing wine', 'shaoxing huadiao wine');
  put(listed('Cognac'), 'cognac');
  put(listed('Dry vermouth'), 'dry white vermouth (noilly prat)');
  put(listed('Calvados'), 'calvados');
  put(listed('Rum'), 'dark rum');
  put(listed('Wheat beer'), 'wheat beer (weißbier)');
  put(swap('Dessert wine', 'Vin santo is a sweet dessert wine'), 'vin santo');
  // No source has these, so the recipe keeps the name.
  put(named(G.NOSOURCE, 'Vodka'), 'baijiu (chinese grain spirit)');
  put(named(G.NOSOURCE, 'Brandy'), 'kirschwasser (cherry brandy)');
  put(named(G.NOSOURCE, 'Liqueur'), 'mei gui lu jiu (chinese rose wine)', 'rose wine (mei gui lu jiu)');
  put(named(G.NOSOURCE), 'pulque');

  // Listed by the owner's third round, 2026-11-06.
  put(listed('Powdered sugar'), 'icing sugar (powdered sugar)', 'powdered sugar');
  put(listed('Rock sugar'), 'rock sugar');
  put(listed('Vanilla sugar'), 'vanilla sugar');
  put(listed('Maltose'), 'maltose syrup', 'maltose');
  put(listed('Worcestershire sauce'), 'salsa inglesa (worcestershire sauce)', 'worcestershire sauce');
  put(listed('Hoisin sauce'), 'hoisin sauce');
  put(listed('Sriracha'), 'sriracha chili sauce');
  put(listed('Sweet bean sauce'), 'sweet bean sauce (tianmianjiang)');
  put(listed('Doubanjiang'), 'doubanjiang (pixian chili bean paste)', 'doubanjiang (chili bean paste)');
  put(listed('Fuyu'), 'red fermented bean curd (nam yu)', 'white fermented bean curd (fu ru)');
  put(listed('Eisbein'), 'eisbein (cured pork hock)');
  put(listed('Kasseler'), 'kasseler (cured smoked pork chops)', 'kasseler (cured smoked pork loin)', 'kasseler (cured smoked pork loin), boneless');
  put(listed('Smoked pork shoulder'), 'smoked pork shoulder (palette)');
  put(listed('Lyon sausage'), 'fleischwurst or lyoner');
  put(listed('Italian sausage'), 'fresh italian pork sausage (salsiccia)', 'fresh italian pork sausage (salsiccia), skin removed', 'fresh italian pork sausages', 'italian pork sausage');
  put(listed('Mettwurst'), 'mettenden (smoked pork sausages)');
  put(listed('Morteau sausage'), 'montbéliard or morteau smoked sausage');
  put(listed('Montbéliard sausage'), 'montbéliard sausage');
  put(listed('Pinkel sausage'), 'pinkel (smoked oat and pork sausage)');
  put(listed('Bratwurst'), 'pork bratwurst, fine and unsmoked');
  put(listed('Knackwurst'), 'strasbourg sausage (knack)');
  put(listed('Toulouse sausage'), 'toulouse sausage');
  put(listed('Sweetened condensed milk'), 'sweetened condensed milk');
  put(listed('Rice paper'), 'rice paper (bánh tráng), 22 cm rounds');
  put(listed('Baking wafers'), 'edible wafer paper (ostia)', 'oblaten wafers, 70 mm', 'obleas (thin wafer rounds)');
  put(listed('Century egg'), 'century egg (pidan)');
  put(swap('White sugar', 'Pearl sugar is white sugar pressed into coarse grains'), 'pearl sugar (hagelzucker)');
  put(listed('Sunflower oil'), 'sunflower oil');
  put(swap('Chorizo', 'A similar pork sausage'), 'fresh pork longaniza');
  put(swap('Wonton wrappers', 'A similar thin wrapper'), 'spring roll wrappers');
  // Bitter kernels carry the same cyanide risk as the bitter almonds the owner hid for safety.
  put(swap('Almonds', 'Sweet almonds in place of bitter apricot kernels, which carry cyanide'), 'bitter apricot kernels (armelline)');

  // No source has these, so the recipe keeps the name with no nutrition behind it, as the app does today (owner's call, 2026-11-06).
  put(named(G.SAUCES, 'Soy sauce', C.SALT), 'golden mountain seasoning sauce', 'jugo sazonador (maggi seasoning sauce)', 'maggi seasoning sauce');
  put(named(G.SAUCES, null, C.SALT), 'chipotle chiles in adobo', 'jarred spiced crab paste for riêu (gia vị nấu riêu cua)');
  put(named(G.FERMENT, null, C.SALT_PRESERVED_SEAFOOD), 'shrimp paste (kapi)', 'mắm ruốc (fermented shrimp paste)', 'mắm tôm (fermented shrimp sauce)', 'mắm tôm (fermented shrimp paste)', 'fermented fish innards (tai pla)', 'nam budu (southern thai fermented fish sauce)', 'pla ra (fermented fish sauce)', 'salted field crab (pu dong)');
  put(named(G.FERMENT, 'Miso', C.SALT), 'fermented black beans (douchi)', 'fermented black beans', 'fermented soybean sauce (tao jiao)', 'fermented yellow soybean paste (tao jiao)', 'fermented soybean paste (tao jiao)');
  put(named(G.FERMENT), 'mẻ (fermented rice)');
  put(named(G.CURED, null, C.PROCESSED_MEAT), 'lap cheong (chinese sausage)', 'chinese sausage (lạp xưởng)', 'chinese sausage (kun chiang)', 'guanciale (cured pork cheek)', 'lardo (cured pork back fat)', 'lap yuk (cantonese cured pork belly)', 'speck (speck alto adige igp)', 'chả huế (huế peppered pork roll)', 'chicharrón prensado (pressed pork cracklings in chile)');
  put(named(G.PANTRY), 'sesame rice crackers (bánh tráng mè)', 'orange blossom water', 'almond extract', 'pandan paste');
  put(named(G.PANTRY, 'Dark chocolate'), 'oaxacan chocolate', 'mexican table chocolate', 'mexican table chocolate (chocolate de mesa)');
  put(single('Whole cane sugar'), 'sugar cane', 'sugarcane', 'sugarcane sticks');
  put(single('Molasses'), 'rübenkraut (sugar beet syrup)');
  put(single('Anise seed, though the taste differs'), 'star anise');
  put(single('Sansho pepper, a close relative'), 'sichuan peppercorns', 'ground sichuan peppercorn', 'green sichuan peppercorns');
  put(single(), 'juniper berries', 'galangal', 'sand ginger (dried slices)', 'sand ginger powder', 'fingerroot (krachai)', 'krachai (fingerroot)', 'makrut lime leaves', 'makrut lime peel', 'pandan leaves', 'achiote (annatto) seeds', 'annatto seeds (hạt điều màu)', 'annatto seeds', 'avocado leaves', 'dried avocado leaves', 'dried avocado leaves (hojas de aguacate)', 'hoja santa leaves', 'hoja santa', 'lovage', 'mentuccia (lesser calamint) leaves', 'salad burnet (pimpinelle)', 'rice paddy herb (ngò om)', 'wild betel leaves (lá lốt)', 'sweet leaf (rau ngót, sauropus androgynus)', 'vietnamese balm (kinh giới)', 'romeritos (seepweed greens)', 'rosita de cacao flowers (quararibea funebris)', 'banana blossom (bắp chuối)', 'banana blossom', 'dried lily flowers (golden needles)', 'dried daylily buds (golden needles)', 'huitlacoche (fresh or frozen)', 'tejocotes', 'gấc fruit pulp', 'lima agria (yucatecan sweet lime)', 'mamey seed kernels (pixtle)', 'escamoles (ant larvae)', 'fresh chapulines (grasshoppers)', 'jumiles (taxco stink bugs)', 'dried charales');
  put(single('Cilantro'), 'vietnamese coriander (rau răm)', 'culantro (ngò gai)', 'sawtooth coriander (culantro)', 'culantro (sawtooth coriander)');
  put(single('Dried chili peppers'), 'dried guajillo chiles', 'guajillo chiles', 'dried chiles de árbol', 'dried mulato chiles', 'dried cascabel chiles', 'dried chilhuacle negro chiles', 'dried chilcostle chiles', 'chile piquín, ground', 'ground chile piquín', "piment d'espelette", "piment d'espelette (ground basque chili)");
  put(single('Green chili peppers'), 'poblano chiles', 'poblano chile', 'habanero chile', 'fresh anaheim chiles', 'chiles de agua');
  return out;
};
