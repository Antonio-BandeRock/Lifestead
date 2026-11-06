// Fresh curation of the unified database, direct instruction 2026-11-06.
//
// Starts from nothing: whole_food_classifications and its earlier decisions are
// not read. This pass reads every row with every column that holds anything
// (names in both languages, the source's category, Latin name, LanguaL codes,
// the rest of the raw record, nutrients) and does one of two things:
//
//   hide    the row is unmistakably out under the owner's filter, reason named
//   read    anything else goes to a reader, who also writes the listing name
//
// It writes nothing to the database. Output is JSON lines in the folder given
// as the first argument. See curate-import.js for the step that records results.
//
// Usage: node curate-first-pass.js <outDir>

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SQLITE_EXE = process.env.SQLITE_EXE || 'C:/Users/TonyR/AppData/Local/Android/Sdk/platform-tools/sqlite3.exe';
const dbPath = process.env.UNIFIED_DB_PATH || path.resolve(__dirname, '..', 'unified_foods.sqlite');

function query(sql) {
  const out = execFileSync(SQLITE_EXE, ['-readonly', '-json', dbPath, sql], { maxBuffer: 1024 * 1024 * 1024, encoding: 'utf8' });
  return out.trim() ? JSON.parse(out) : [];
}

const w = (s) => new RegExp(`(?:^|[^\\p{L}])(?:${s})(?:$|[^\\p{L}])`, 'iu');

// ---- what the owner named outright (2026-11-06): these never reach a hide rule
const IS_CHEESE_NAME = /\bcheese\b|\bk[äa]se\b|\bfromage\b|\b(cheddar|gouda|brie|camembert|parmesan|mozzarella|feta|edam|emmental|gruy[eè]re|ricotta|cottage cheese|cream cheese|roquefort|gorgonzola|halloumi)\b/i;
const CHEESE_NOT_PLAIN = w('sauce|soup|spread|dip|cracker|crackers|puff|puffs|curls|pizza|sandwich|burger|omelet|fondue|souffl[eé]|cake|pie|bread|roll|rolls|macaroni|pasta|ravioli|tortellini|filling|fried|breaded|in crumbs|baked|gratin|quiche|salad|substitute|imitation|vegan|plant|soy|tofu|snack|snacks|flavou?red|with');
const IS_PROCESS_CHEESE = w('process|processed|pasteurized process|cheese food|cheese product');
const IS_HONEY = /^honey\b|^(honung|miel|honig)\b/i;
const IS_SALT = /^(salt|sea salt|table salt|rock salt|kosher salt|salt,|salz|sel|bordssalt|havssalt)\b/i;
const SALT_NOT_PLAIN = w('pork|fish|cod|herring|beef|meat|butter|peanuts?|crackers?|substitute|snack|soup|chips|nuts|almonds?|cashews?|egg|eggs|duck|vegetables?|pepper|garlic|celery|onion|seasoning');
const IS_ENRICHED_FLOUR = /flour/i;
const IS_TORTILLA_MIX = /tortilla mix/i;

// ---- hide rules, in order. Each is precise on purpose: a miss goes to a reader,
// which costs a little, while a wrong hide never gets looked at again.
const COOK = 'cooked|boiled|roasted|fried|deep-fried|pan-fried|stir-fried|baked|broiled|braised|stewed|simmered|steamed|grilled|barbecued|barbecue|microwaved|poached|sauteed|sautéed|toasted|blanched|parboiled|precooked|pre-cooked|heated|ready-to-eat|ready to eat|ready-to-serve|ready-to-heat|prepared|rotisserie|flame-grilled|oven-heated|oven-roasted';
const COOK_LOCAL = 'gekocht|gebraten|gebacken|gegart|frittiert|ged[üu]nstet|gegrillt|gedämpft|paniert|cuit|cuite|cuits|cuites|bouilli|bouillie|r[oô]ti|r[oô]tie|frit|frite|po[eê]l[eé]|po[eê]l[eé]e|vapeur|brais[eé]|grill[eé]|grill[eé]e|kokt|kokta|stekt|stekta|ugnsbakad|ugnsbakat|grillad|grillat|rökt|ångkokt|gryta|färdigrätt';
const NOT_COOKED_RAW = /\b(uncooked|unprepared|not cooked|unboiled|unheated)\b/i;
const HEADS_OUT = [
  ['fast_food', /^(mcdonald'?s|kfc|burger king|wendy'?s|subway|taco bell|pizza hut|domino'?s|papa john'?s|little caesars?|denny'?s|applebee'?s|carrabba'?s|olive garden|cracker barrel|on the border|t\.?g\.?i\.? friday'?s|school lunch|restaurant|fast foods?|popeyes|dairy queen|arby'?s|hardee'?s|sonic)\b/i],
  ['baby_food', /^(babyfood|baby food|infant formula|toddler|beikost|säuglings|lait infantile|barnmat)\b/i],
  ['prepared_meal', /^(soup|gravy|stew|casserole|chili|pizza|sandwich|sandwiches|burrito|taco|enchilada|lasagna|quiche|meal|entree|dinner|lunch|frozen dinner|hummus|salad dressing|sauce|dip|nachos|tamales?|egg rolls?|dumplings?|pot pie)\b/i],
  ['baked_goods', /^(bread|breads|rolls|cookies?|crackers?|cake|cakes|muffins?|pie|pies|pastry|pastries|doughnuts?|donuts?|waffles?|pancakes?|croissants?|bagels?|biscuits?|brownies?|danish|french toast|english muffins?|tortillas?|pretzels?)\b/i],
  ['sweets', /^(candies|candy|ice creams?|frozen novelties|frozen yogurts?|puddings?|desserts?|gelatin desserts?|jams?|jellies|marmalades?|toppings?|frostings?|snacks|chewing gum|sherbet|sorbet|milk shakes?)\b/i],
  ['cereal_ready', /^(cereals ready-to-eat|cereal, ready to eat|breakfast bars?|granola bars?)\b/i],
  ['processed_meat', /^(sausages?|frankfurters?|hot dogs?|bologna|salami|luncheon meats?|deli |pepperoni|bratwurst|kielbasa|knackwurst|liverwurst|mortadella|pastrami|corned beef|meat extender|bacon|spam)\b/i],
  ['alcohol', /^(alcoholic beverages?|beer|wine|whiskey|vodka|gin|rum|liqueur|spirits?)\b/i],
  ['soft_drink', /^(beverages?, (carbonated|energy|sports|fruit|.*drink|.*soda)|carbonated|soda|soft drink|energy drink|sports drink)\b/i],
  ['supplement', /^(nutritional supplement|protein supplement|supplement|meal replacement|shake|shakes)\b/i],
];
const WORDS_OUT = [
  ['fast_food', w("mcdonald'?s|burger king|kfc|pizza hut|taco bell|wendy'?s")],
  ['baby_food', w('babyfood|baby food|infant formula|infant cereal|toddler')],
  ['canned', w('canned|tinned|appertis[eé]e?s?|konserv|in brine|in syrup|in oil|drained solids|solids and liquids')],
  ['cooked', w(COOK)],
  ['cooked', w(COOK_LOCAL)],
  ['seed_oil', w('margarine|margarine-like|shortening|hydrogenated|high.fructose|vegetable oil|canola oil|rapeseed oil|cottonseed oil|soybean oil|corn oil|safflower oil|sunflower oil|grapeseed oil|oil, (canola|soybean|cottonseed|corn|vegetable|safflower|sunflower|industrial|grapeseed)')],
  ['processed_meat', w('sausage|sausages|frankfurter|hot dog|salami|bologna|luncheon|pepperoni|nuggets?|patties|patty|breaded|battered|in crumbs|fish sticks?|fish fingers?|cured|korv|wurst')],
  ['smoked', w('smoked')],
  ['baked_goods', w('cakes?|biscuits?|cookies?|pastry|pastries|pies?|tarts?|tartlets?|buns?|bread|breads|rolls|strudel|dough|gingerbread|rusks?|crispbread|toast|wafers?|waffles?|pancakes?|crepes?|cr[eê]pes?|croissants?|brioche|muffins?|crackers?|baguette|pretzels?|flatbread')],
  ['sweets', w('chocolate|chocolates|candy|candies|candied|nougat|pralines?|marzipan|fudge|caramel|jam|jams|jelly|jellies|marmalade|compote|pudding|custard|mousse|tiramisu|ice cream|sorbet|dessert|desserts|snacks?|chips|crisps|popcorn|gum|licorice|liquorice|sweets|bonbons?|syrup,? table|flan|meringue|frosting|icing|topping|fruit leather|granola|muesli|m[uü]sli')],
  ['prepared_meal', w('soup|soups|stew|stews|casserole|ragout|gratin|au gratin|salad|salads|marinade|marinated|sauce|sauces|dressing|gravy|mayonnaise|remoulade|ketchup|dip|pizza|sandwich|burger|hamburger|lasagn[ae]|ravioli|tortellini|quiche|omelett?e?|fricassee|goulash|paella|risotto|sushi|curry|croquettes?|meatballs?|meatloaf|fishcakes?|prepackaged|pre-packaged|prepacked|homemade|home-made|hemlagad|ready meal|takeaway|stuffed|filled|filling|porridge|gr[oö]t|fries|hash browns?|mashed|puree soup|bouillon|broth|stock|seasoning mix|dry mix|mix')],
  ['soft_drink', w('drink|drinks|soda|nectar|cola|lemonade|squash drink|energy|sweetened beverage|smoothie|smoothies|milkshake')],
  ['supplement', w('fortified with|enhanced|powdered formula|protein isolate|protein concentrate|supplement|replacement|meal bar')],
  ['added_sugar_or_flavor', w('sweetened|flavou?red|sweetener|sweeteners|artificial|imitation|substitute|analogue|vegan cheese')],
];
// the source's own category, where it has one
const CAT_OUT = new Map([
  ['Rätter', 'prepared_meal'], ['Bullar, kakor, tårtor', 'baked_goods'], ['Bröd', 'baked_goods'], ['Godis', 'sweets'], ['Glass', 'sweets'],
  ['Korv', 'processed_meat'], ['Pålägg', 'processed_meat'], ['Sylt, marmelad, gelé, chutney', 'sweets'], ['Snacks', 'sweets'],
  ['Quorn, sojaprotein, vegetariska produkter', 'prepared_meal'], ['Måltidsersättning, sportpreparat', 'supplement'],
  ['Cakes and sweet bakery', 'baked_goods'], ['Vegetarian products and dishes', 'prepared_meal'], ['Desserts and ice cream', 'sweets'],
  ['Chocolate and sweets', 'sweets'], ['Biscuits and cookies', 'baked_goods'], ['Infant food', 'baby_food'], ['Dinner products', 'prepared_meal'],
  ['Fish and shellfishes dishes', 'prepared_meal'], ['Poultry or meat dishes', 'prepared_meal'], ['Beer, wine, spirit etc', 'alcohol'], ['Pizza and taco', 'prepared_meal'],
  ['Breakfast cereals', 'cereal_ready'], ['Soups and casseroles', 'prepared_meal'], ['Crisp bread and flatbread', 'baked_goods'], ['Mayonnaise and mayonnaise salads', 'prepared_meal'],
  ['Lunch dishes', 'prepared_meal'], ['Other bread products', 'baked_goods'], ['Other bread products, home-made', 'baked_goods'], ['Porridge', 'prepared_meal'],
  ['Pancakes and waffles', 'baked_goods'], ['Snacks', 'sweets'], ['Coarse bread, home-made', 'baked_goods'], ['Soft drink and energy drink', 'soft_drink'],
  ['White bread, home-made', 'baked_goods'], ['White bread', 'baked_goods'], ['Coarse bread', 'baked_goods'], ['Salads', 'prepared_meal'], ['Sweet spreads', 'sweets'],
  ['Extra coarse bread', 'baked_goods'], ['Semi-coarse bread', 'baked_goods'], ['Food supplements', 'supplement'], ['Plant-based beverages', 'soft_drink'], ['Meat products', 'processed_meat'], ['Fish products', 'processed_meat'],
]);
const REASON_WORDS = {
  fast_food: 'restaurant or fast food', baby_food: 'baby food or formula', prepared_meal: 'prepared dish, soup, sauce or meal',
  baked_goods: 'baked good', sweets: 'candy, dessert or snack', cereal_ready: 'ready-to-eat cereal or bar', processed_meat: 'processed meat or fish product',
  alcohol: 'alcoholic drink', soft_drink: 'manufactured drink', supplement: 'supplement or formula', canned: 'canned, which cooks it', cooked: 'cooked',
  seed_oil: 'industrial seed oil or hydrogenated fat', smoked: 'smoked or cured, no way to know it is free of curing chemicals', process_cheese: 'process cheese made with emulsifiers', added_sugar_or_flavor: 'sugar, flavoring or a substitute added', brand: 'a named commercial product',
};

const WORD_HIT_CAN_BE_WRONG = new Set(['baked_goods', 'sweets', 'prepared_meal', 'soft_drink', 'supplement']);
const AMBIGUOUS_WORDS = /\b(tarts?|pies?|salads?|curry|jell(y|ies)|jams?|soups?|stock|dip|cola|gum|chips|mix|buns?|rolls|bread|cakes?|toast|stews?|filled|stuffed|energy|drinks?|icing|topping|dressing|fries|sauces?|replacement)\b/gi;
const DISH_LAST = /\b(jams?|soups?|sauces?|cakes?|tarts?|pies?|stews?|salads?|bread|toast|buns?|rolls|chips|dressing|fries|drinks?|icing|topping|replacement)$/i;
const SAYS_RAW = /(^|[^\p{L}])(raw|fresh|uncooked|roh|cru|crue|frisch|färsk|färska)($|[^\p{L}])/iu;

function decide(r) {
  const en = r.name_english || r.name_original;
  const both = `${en} | ${r.name_original}`;
  const raw = NOT_COOKED_RAW.test(both);

  if (IS_TORTILLA_MIX.test(en)) return { outcome: 'read', note: 'owner: keep tortilla mix' };
  if (IS_HONEY.test(en) && !w('roasted|mustard|bun|cake|cereal|nut|nuts|bar|ham').test(en)) return { outcome: 'read', note: 'owner: keep honey' };
  if (IS_SALT.test(en) && !SALT_NOT_PLAIN.test(en)) return { outcome: 'read', note: 'owner: keep salts' };
  if (IS_CHEESE_NAME.test(en)) {
    if (IS_PROCESS_CHEESE.test(en)) return { outcome: 'hide', reason: 'process_cheese', doubt: 'owner said keep cheeses, this one is process cheese' };
    if (!CHEESE_NOT_PLAIN.test(en)) return { outcome: 'read', note: 'owner: keep cheeses' };
  }
  const flourEnriched = IS_ENRICHED_FLOUR.test(en) && /enriched/i.test(en);
  if (flourEnriched && !w('cooked|baked|tortillas?|crust|pie|chips|made with').test(en)) return { outcome: 'read', note: 'owner: keep enriched flour' };

  // A word that names something else in these goes to a reader, not a hide:
  // bread flour is flour, soy sauce is a ferment, raw casserole beef is raw beef.
  const flourText = en.replace(/\b(bread|cake|pastry)\s+flours?\b|\bflours?,\s*(white,\s*)?(bread|cake|pastry)\b|\bwhite,\s*(bread|cake)\b/gi, 'flour');
  if (/\bflours?\b/i.test(en) && !w(`${COOK}|pies?|cookies?|tortillas?|made with|muffins?|chips|crusts?|mix|jam|sugar|cakes?|bread`).test(flourText)) return { outcome: 'read', note: 'flour' };
  if (/\b(sauerkraut|kimchi|miso|natto|tempeh)\b/i.test(en) && !w(`${COOK}|canned|soup|sauce|dressing|salad`).test(en)) return { outcome: 'read', note: 'traditional ferment' };
  if (/\b(soy sauce|tamari|fish sauce|shoyu)\b/i.test(en) && !w('hydrolyzed|pre-seasoned|soup|packet|mix').test(en)) return { outcome: 'read', note: 'traditional ferment' };
  if (w('raw|uncooked|roh|cru|crue').test(both) && !/\bwith\b/i.test(en) && w('casserole|goulash|stew|soup|ragout|stock|salad|sandwich|stir.fry|burger|hamburger').test(en) && !w('marinated|cured|seasoned|breaded|smoked|sausage').test(en)) return { outcome: 'read', note: 'raw, a dish word names its use' };

  for (const [reason, re] of HEADS_OUT) if (re.test(en)) return { outcome: 'hide', reason };
  if (r.category_original && CAT_OUT.has(r.category_original)) return { outcome: 'hide', reason: CAT_OUT.get(r.category_original) };


  for (const [reason, re] of WORDS_OUT) {
    if (reason === 'cooked' && raw) continue;
    if (reason === 'smoked' && /paprika|salt|pepper|tea/i.test(en)) continue;
    if (reason === 'cooked' && /\b(coffee|parboiled)\b/i.test(en)) continue;
    if (reason === 'added_sugar_or_flavor' && re.test(both.replace(/\b(unsweetened|unflavou?red|not sweetened)\b/gi, ''))===false) continue;
    if (reason === 'soft_drink' && /energy_kcal/.test(en)) continue;
    if (re.test(both)) {
      // A word that names a dish or a sweet in one row and a plain food in another
      // (tart cherries, salad greens, curry leaves, jelly ear) sends the row to a
      // reader, and so does a word-list hit on a row that says it is raw or fresh.
      if (WORD_HIT_CAN_BE_WRONG.has(reason)) {
        if (!re.test(both.replace(AMBIGUOUS_WORDS, ' '))) {
          // "Apple jam", "Cream sauce": the word closes the food's name, so it is the dish.
          const head = en.split(/[,(]/)[0].trim();
          if (DISH_LAST.test(head) && !/\bsoya? sauce$/i.test(head)) return { outcome: 'hide', reason };
          return { outcome: 'read', note: 'ambiguous word' };
        }
        if (SAYS_RAW.test(both)) return { outcome: 'read', note: 'says raw, a word suggests otherwise' };
      }
      return { outcome: 'hide', reason };
    }
  }
  return { outcome: 'read' };
}

function main() {
  const outDir = process.argv[2];
  if (!outDir) throw new Error('give an output folder');
  fs.mkdirSync(outDir, { recursive: true });

  const rows = query('select raw_id, source_code, source_food_id, name_original, name_english, name_english_source, latin_name, langual_codes, category_original, raw_json from raw_foods order by raw_id');
  const nut = new Map();
  for (const n of query("select raw_id, nutrient_code, amount_per_100g a, unit from raw_food_nutrients where nutrient_code in ('energy_kcal','water','protein','fat_total','carbohydrate','sugars_total','sodium','fiber_total','caffeine') and amount_per_100g is not null")) {
    if (!nut.has(n.raw_id)) nut.set(n.raw_id, {});
    nut.get(n.raw_id)[n.nutrient_code] = n.a;
  }
  const hide = [];
  const read = [];
  for (const r of rows) {
    let extra = {};
    if (r.source_code.startsWith('Norway')) {
      try {
        const j = JSON.parse(r.raw_json);
        extra = { keywords: j.searchKeywords || [], edible: j.ediblePart && j.ediblePart.percent };
      } catch (e) { extra = {}; }
    }
    const d = decide(r);
    const item = {
      id: r.raw_id, src: r.source_code, en: r.name_english, orig: r.name_original === r.name_english ? undefined : r.name_original,
      tr: r.name_english_source === 'machine_translated' ? 1 : undefined, cat: r.category_original || undefined, latin: r.latin_name || undefined,
      lang: r.langual_codes && r.langual_codes !== '[]' ? JSON.parse(r.langual_codes) : undefined, ...extra, n: nut.get(r.raw_id) || {},
    };
    if (d.outcome === 'hide') hide.push({ ...item, reason: d.reason, reasonWords: REASON_WORDS[d.reason], doubt: d.doubt });
    else read.push({ ...item, note: d.note });
  }
  fs.writeFileSync(path.join(outDir, 'rule_hide.jsonl'), hide.map((x) => JSON.stringify(x)).join('\n') + '\n');
  fs.writeFileSync(path.join(outDir, 'to_read.jsonl'), read.map((x) => JSON.stringify(x)).join('\n') + '\n');
  const by = {};
  for (const h of hide) by[h.reason] = (by[h.reason] || 0) + 1;
  console.log(JSON.stringify({ total: rows.length, hide: hide.length, read: read.length, by }, null, 1));
}

if (require.main === module) main();
module.exports = { decide };
