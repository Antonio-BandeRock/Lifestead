# Cuisine System Recipes: the brief every recipe file follows

Written 2026-10-29, when Tony asked for French, Italian, German, Chinese, Thai and Vietnamese System Recipes "just as deep as the Mexican dishes went" (182 Mexican dishes and bases, in `scripts/_mexican_recipes/`). One folder per cuisine here: `french`, `italian`, `german`, `chinese`, `thai`, `vietnamese`. Each holds:

- `base_ids.json`: the made-first recipes (stocks, sauces, doughs, pastes, pantry), fixed before any dish was written so files written side by side agree on ids.
- `dishes.json`: every recipe to write, with its id, name, shelf, and which file writes it.
- recipe files named `a_*.json`, `b_*.json` (the only files the pipeline reads as recipes).

Recipe files are drafts. Nothing is in the app until it is validated, checked and inserted centrally into `assets/data/foods_reference.db` and `lib/digest/recipes.ts`. Whoever writes a file here **never writes to either of those**, never runs `scripts/add_cuisine_recipes.js` or any other script that writes, and never touches `unified-database/`.

## What a recipe has to be

1. **As authentic as it can be.** Find it online from sources that cook the dish where it comes from, and compare two or more before writing. Write the version a cook from that country or region would recognise: the traditional fat, the traditional technique, the regional name. Never a takeout or fusion shortcut. Good sources per cuisine:
   - French: Larousse Gastronomique, Marmiton, Cuisine AZ, 750g, Le Cordon Bleu, Ina Garten only for technique checks, Julia Child, Jacques Pépin, Raymond Blanc, Felicity Cloake's "How to cook the perfect" columns (The Guardian), Serious Eats (J. Kenji López-Alt, Daniel Gritzer), David Lebovitz, France's regional tourism and AOC bodies.
   - Italian: Giallo Zafferano, La Cucina Italiana, Accademia Italiana della Cucina, Cucchiaio d'Argento, Marcella Hazan, Anna Del Conte, Pellegrino Artusi, Giorgio Locatelli, Rachel Roddy (The Guardian), Serious Eats, Pasta Grannies, the consorzi (Parmigiano Reggiano, Prosciutto di Parma).
   - German: Chefkoch, Essen und Trinken, Lecker, Kochbar, Küchengötter, Dr. Oetker, Mimi Sheraton, Luisa Weiss (The Wednesday Chef, Classic German Baking), Oma's recipes collections, Quick German Recipes, My Dinner (Daniela), regional tourism sites.
   - Chinese: The Woks of Life, Red House Spice, China Sichuan Food (Elaine), Made With Lau, Omnivore's Cookbook, Fuchsia Dunlop, Grace Young, Kenji López-Alt, Christine's Recipes, Yi Reservation, Chinese Cooking Demystified, Xiachufang. Name the regional cuisine (Cantonese, Sichuan, Hunan, Shanghainese, Beijing, Fujian, Xinjiang, Yunnan) in `region`.
   - Thai: Hot Thai Kitchen (Pailin Chongchitnant), SheSimmers (Leela Punyaratabandhu), David Thompson, Andy Ricker, Thai Food Master, Rachel Cooks Thai, Temple of Thai, Austin Bush, Wongnai, Krua.co. Name the region (Central, Isan, Northern / Lanna, Southern) in `region`.
   - Vietnamese: Andrea Nguyen (Viet World Kitchen), Helen's Recipes, Hungry Huy, Vicky Pham, Uyen Luu, Luke Nguyen, Vietnamese Home Cooking (Charles Phan), Cooky.vn, Điện Máy Xanh recipes, Wanderlust Chloe only for context. Name the region (Northern / Hà Nội, Central / Huế, Southern / Sài Gòn, Mekong Delta) in `region`.
2. **Built from what goes into it, with what has to be made first linked, not copied.** If a dish needs a stock, a mother sauce, a dough, a curry paste, a broth, a dipping sauce, cooked rice or another base, it lists that recipe as a **component** rather than repeating its ingredients. Use the ids in your cuisine's `base_ids.json`. If a dish needs something made first that is not in that list and not already a recipe, write that recipe too, in the same file, under `<prefix>base_<slug>` on the right Bases shelf, and point at it. Existing recipes any cuisine may point at: `curated_sauce_chicken_stock` (Homemade Chicken Stock, 8 servings of 1 cup), `curated_sauce_vegetable_stock` (Homemade Vegetable Stock, 8 servings of 1 cup), `curated_sauce_simple_pesto`, `curated_ferment_sauerkraut` (Classic Sauerkraut), `curated_side_creamy_polenta`, `curated_side_coconut_rice`. A cuisine's own stock in its `base_ids.json` (a fond blanc, a brodo, a Chinese superior stock) is preferred over the generic one when the dish calls for it.
3. **Every ingredient checked against the food database.** Use `node scripts/_mexican_recipes/find_food.js <words>` (several words at once is fine) to find the `category | base_name` pair. Pick the closest match for the same food in the same form (raw pork belly for raw pork belly, dried rice noodles for dried rice noodles). Prefer a pair already used in shipped recipes when several fit. **Never substitute a different food to make something resolve.** When the food is not there (galangal, kaffir lime leaves, chervil, Shaoxing wine, doubanjiang, fish sauce if missing, guanciale, quark, spätzle flour types and so on), write it as `"notInDatabase": true` with a plain English `name` and a `contains` tag. The app shows those with a note that they are not counted in nutrients or condition checks.
4. **Every notInDatabase ingredient carries `contains`**: one or more of `meat`, `fish`, `dairy`, `egg`, `gluten`, `insect`, `alcohol`, or `"none"` for a plant or mineral. It is what decides whether a dish can be tagged Vegan, Vegetarian or Gluten-Free, so get it right: fish sauce and shrimp paste are `fish`, oyster sauce is `fish`, guanciale and lardons are `meat`, Shaoxing wine and mirin are `alcohol`, soy sauce made with wheat is `gluten`, Parmigiano is `dairy` (and made with animal rennet, which the diet tags already read from the name), worcestershire is `fish`. A comma list is fine: `"contains": "fish,gluten"`.
5. **Quantities are for the whole batch** the recipe makes, and `servings` says how many servings that batch gives. Units: `g`, `ml`, `tsp`, `tbsp`, `each` (whole eggs, whole limes, whole chiles, whole onions). Grams and millilitres are preferred: they are what the nutrient totals read most exactly.
6. **A component's `servings` is how many of that recipe's servings this batch uses.** If Fond Blanc makes 8 servings of 1 cup and the soup uses 1.5 litres, that is about 6 servings. Make the arithmetic right: the nutrients are scaled by it. A dish served on rice points at the cuisine's steamed rice base for the rice.

## Writing rules (the validator checks most of them)

- No em dashes, no en dashes, no " -- ". Use a comma, colon, parentheses or a second sentence.
- Never the words real, really, genuine, genuinely, honest, honestly. No "own" ("its own sauce" becomes "its sauce").
- No bold, no markdown in any text.
- Plain, warm, direct sentences. Instructions are numbered by position, one action or two per step, with temperatures in °F and °C and times as ranges.
- `flavorProfile` is one sentence on how it tastes and feels to eat. `healthBenefit` is one sentence of what the dish brings nutritionally, stated with care: no cure or treatment claims, nothing a single dish cannot do, and say a dish is rich or a treat where it is.
- `nutritionHighlights` (1 to 3) name a nutrient and a short note on where it comes from in the dish. Do not invent percentages.
- Names: the dish's name as it is said where it comes from, accents included ("Bœuf Bourguignon", "Spaghetti alla Carbonara", "Rinderrouladen", "Gỏi Cuốn", "Tom Kha Gai"). Chinese and Thai names are written in their common romanisation (pinyin for Mandarin, Jyutping-style common spellings for Cantonese dim sum, RTGS-style common spellings for Thai) followed by an English hint in parentheses: "Mapo Tofu", "Hong Shao Rou (Red-Braised Pork Belly)", "Har Gow (Shrimp Dumplings)", "Pad Kra Pao (Holy Basil Stir-Fry)". A French, Italian, German or Vietnamese name that would leave an English reader lost may carry a short English hint in parentheses too ("Fond Blanc (White Veal Stock)").
- `citations`: at least one recipe source that was followed, with its URL, `{ "source": "Hot Thai Kitchen, Green Curry Paste", "url": "https://..." }`. Add a health source where `healthBenefit` makes a claim beyond plain nutrient content. **Only URLs you opened.** If web search runs out, open known recipe pages directly with WebFetch.

## The file shape

```json
{
  "recipes": [
    {
      "id": "curated_fr_boeuf_bourguignon",
      "name": "Bœuf Bourguignon",
      "builderType": "side",
      "dishRole": "main",
      "dishGroup": "Meats & Stews",
      "region": "Burgundy",
      "servings": 6,
      "servingSizeAmount": 1,
      "servingSizeUnit": "plate",
      "flavorProfile": "...",
      "healthBenefit": "...",
      "overallTier": "strong",
      "components": [
        { "recipeId": "curated_fr_base_fond_brun", "servings": 2, "note": "warm" }
      ],
      "ingredients": [
        { "category": "Meat", "baseName": "...", "quantity": 1200, "unit": "g", "cutPrep": "cut in 5 cm cubes", "cookingMethod": "Braised", "prepNote": null },
        { "notInDatabase": true, "name": "red Burgundy wine", "contains": "alcohol", "quantity": 750, "unit": "ml", "cutPrep": null, "prepNote": null }
      ],
      "instructions": ["...", "..."],
      "nutritionHighlights": [{ "nutrient": "Protein", "note": "From the beef chuck." }],
      "citations": [{ "source": "...", "url": "https://..." }],
      "curationNote": "Why this version: which sources were compared and what was kept. Never shown to anyone."
    }
  ]
}
```

- `builderType`: `bakedGoods`, `beverage`, `dessert`, `fermentation`, `handheld`, `salad`, `sauce`, `side`, `smoothie`, `snack`, `soup`. Sandwiches, bánh mì, buns, rolls eaten in the hand, dumplings eaten in the hand, pizza slices and crêpes are `handheld`. Soups and noodle soups are `soup`. A plated main (a stew, a roast, a curry, a stir-fry, a pasta, a risotto, a noodle plate) is `side` with `"dishRole": "main"`; a true side (a gratin, a vegetable dish, plain rice, a salad served beside) is `side` with `"dishRole": "side"`. Stocks, sauces, pastes, dressings, dips, pickles and condiments are `sauce`. Breads, doughs and pastries are `bakedGoods`. Kimchi-style ferments, sauerkraut, fermented drinks and sourdough starters are `fermentation`. Drinks are `beverage`. Desserts are `dessert`. Starters and small bites are `snack`. A composed salad is `salad`.
- `dishRole` only matters for `side`. Other types may omit it.
- `dishGroup` is the shelf, exactly as `dishes.json` gives it (the validator refuses anything else).
- `servingSizeUnit`: `bowl`, `cup`, `plate`, `tbsp`, `serving`, `glass`, `wrap`, `each`, `sandwich`, `jar`, `fillet`, `taco`, `slice`, `tortilla`, `tamal`, `torta`, `piece`, `roll`, `bun`, `skewer`, `dumpling`, `pancake`, `pastry`.
- `cookingMethod` names how that one ingredient is cooked in this dish when it is cooked (`Roasted`, `Simmered`, `Fried`, `Braised`, `Boiled`, `Grilled`, `Steamed`, `Sauteed`, `Baked`), or null when it goes in raw or the step covers it. It steers which nutrient row is read, so use it for the main ingredients.
- `overallTier` is how confident the nutrition claims are: `strong` for plain nutrient content, `moderate` or `weak` where the health line leans on less settled research.

## Checking a file

`node scripts/validate_cuisine_recipes.js <cuisine> <your file>.json` must report 0 errors before the file is handed back. Warnings about a listed base not written yet are expected while another file is still being written. It is read only and safe to run as often as you like.
