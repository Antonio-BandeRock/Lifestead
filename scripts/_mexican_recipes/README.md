# Mexican System Recipes: the brief every recipe file follows

Written 2026-10-29 for the Mexican cuisine addition (Tony's list, `Mexican Foods.pdf`). Recipe files in this folder are drafts. Nothing here is in the app until it is validated, checked and inserted centrally into `assets/data/foods_reference.db` and `lib/digest/recipes.ts`. Whoever writes a file here **never writes to either of those**, and never touches `unified-database/`.

## What a recipe has to be

1. **As authentic as it can be.** Find it online from sources that cook the dish where it comes from: Mexican cooks and cookbook authors (Diana Kennedy, Rick Bayless, Pati Jinich, Zarela Martínez, Iliana de la Vega, Margarita Carrillo Arronte), Mexican recipe sites (Larousse Cocina, Kiwilimón, Cocina Fácil, Animal Gourmet, Mexico in My Kitchen, Mexican Food Journal, Muy Bueno, Isabel Eats), and regional sources. Compare two or more before writing, and write the version a cook from that region would recognise: the traditional fat (lard where it is lard), chiles, technique, and the regional name. Never a Tex-Mex shortcut.
2. **Built from what goes into it, with what has to be made first linked, not copied.** If a dish needs tortillas, a salsa, a mole, beans, rice, masa, crema or a stock, it lists that recipe as a **component** rather than repeating its ingredients. Use the fixed ids in `base_ids.json` for the shared bases. If a dish needs something made first that is not in that list and not already a recipe, write that recipe too, in the same file, under `curated_mx_base_<slug>`, and point at it.
3. **Every ingredient checked against the food database.** Use `node scripts/_mexican_recipes/find_food.js <words>` to find the `category | base_name` pair. Pick the closest honest match for the same food in the same form (dried chile for dried chile, raw meat for raw meat). Prefer a pair already used in shipped recipes when several fit. **Never substitute a different food to make something resolve.** When the food is not there (guajillo, chipotle, poblano, achiote, sour orange, queso fresco, Oaxaca cheese, corn husks, banana leaves, avocado leaves, hoja santa, huitlacoche, grasshoppers and so on), write it as `"notInDatabase": true` with a plain English `name`. The app shows those with a note that they are not counted in nutrients or condition checks.
4. **Quantities are for the whole batch** the recipe makes, and `servings` says how many servings that batch gives. Units: `g`, `ml`, `tsp`, `tbsp`, `each` (whole eggs, whole limes, whole chiles). Grams and millilitres are preferred: they are what the nutrient totals read most exactly.
5. **A component's `servings` is how many of that recipe's servings this batch uses.** Tacos de Carnitas making 4 plates of 3 tacos might use `{ "recipeId": "curated_mx_carnitas", "servings": 2 }` if Carnitas makes 6 servings, plus 12 tortillas worth of the tortilla recipe in its servings. Make the arithmetic right: the nutrients are scaled by it.

## Writing rules (the validator checks most of them)

- No em dashes, no en dashes, no " -- ". Use a comma, colon, parentheses or a second sentence.
- Never the words real, really, genuine, genuinely, honest, honestly. No "own" ("its own sauce" becomes "its sauce").
- No bold, no markdown in any text.
- Plain, warm, direct sentences. Instructions are numbered by position, one action or two per step, with temperatures in °F and °C and times as ranges.
- `flavorProfile` is one sentence on how it tastes and feels to eat. `healthBenefit` is one sentence of what the dish brings nutritionally, stated with care: no cure or treatment claims, nothing a single dish cannot do, and say a dish is rich or a treat where it is.
- `nutritionHighlights` (1 to 3) name a nutrient and a short note on where it comes from in the dish. Do not invent percentages.
- Names: the dish's Mexican name as it is said in Mexico, accents included ("Tacos al Pastor", "Cochinita Pibil", "Pozole Rojo"). A base can carry a short English hint in parentheses if the Spanish alone would leave an English reader lost ("Manteca (Rendered Lard)").
- `citations`: at least one recipe source that was followed, with its URL, `{ "source": "Pati Jinich, Pozole Rojo", "url": "https://..." }`. Add a health source where `healthBenefit` makes a claim beyond plain nutrient content. Only URLs you opened.

## The file shape

```json
{
  "recipes": [
    {
      "id": "curated_mx_tacos_de_carnitas",
      "name": "Tacos de Carnitas",
      "builderType": "handheld",
      "dishRole": "main",
      "dishGroup": "Tacos",
      "region": "Michoacán",
      "servings": 4,
      "servingSizeAmount": 3,
      "servingSizeUnit": "taco",
      "flavorProfile": "...",
      "healthBenefit": "...",
      "overallTier": "strong",
      "components": [
        { "recipeId": "curated_mx_carnitas", "servings": 2, "note": "warm, chopped" },
        { "recipeId": "curated_mx_base_corn_tortillas", "servings": 1 },
        { "recipeId": "curated_mx_base_salsa_verde", "servings": 2 }
      ],
      "ingredients": [
        { "category": "Veg", "baseName": "Onion", "quantity": 60, "unit": "g", "cutPrep": "finely chopped", "cookingMethod": null, "prepNote": null },
        { "category": "Veg", "baseName": "Coriander (cilantro) leaves", "quantity": 10, "unit": "g", "cutPrep": "chopped", "cookingMethod": null, "prepNote": null },
        { "category": "Fruit", "baseName": "Lime", "quantity": 2, "unit": "each", "cutPrep": "cut in wedges", "cookingMethod": null, "prepNote": null },
        { "notInDatabase": true, "name": "dried guajillo chiles", "quantity": 30, "unit": "g", "cutPrep": "stemmed and seeded", "prepNote": null }
      ],
      "instructions": ["...", "..."],
      "nutritionHighlights": [{ "nutrient": "Protein", "note": "From the pork shoulder." }],
      "citations": [{ "source": "...", "url": "https://..." }],
      "curationNote": "Why this version: which sources were compared and what was kept. Never shown to anyone."
    }
  ]
}
```

- `builderType`: `bakedGoods`, `beverage`, `dessert`, `fermentation`, `handheld`, `salad`, `sauce`, `side`, `smoothie`, `snack`, `soup`. Tacos, tortas, quesadillas, sopes, gorditas, tlacoyos, tlayudas, flautas and tostadas are `handheld`. Soups, caldos and pozoles are `soup`. A plated main (carnitas, birria, cochinita, chiles rellenos, enchiladas) is `side` with `"dishRole": "main"`; a true side (rice, beans, calabacitas) is `side` with `"dishRole": "side"`. Salsas, moles, adobos, pickles are `sauce`. Breads and doughs are `bakedGoods`. Pulque, tepache and tejuino are `fermentation`. Aguas frescas, atoles and hot drinks are `beverage`.
- `dishRole` only matters for `side`. Other types may omit it.
- `dishGroup` is the shelf it belongs on: one of `Bases: Masa & Tortillas`, `Bases: Salsas`, `Bases: Moles & Chile Sauces`, `Bases: Beans, Rice & Pantry`, `Tacos`, `Tortas & Antojitos`, `Tamales`, `Meats & Seafood`, `Enchiladas & Tortilla Dishes`, `Eggs & Breakfast`, `Soups & Pozoles`, `Vegetables & Sides`, `Drinks`, `Sweets & Breads`.
- `servingSizeUnit`: `bowl`, `cup`, `plate`, `tbsp`, `serving`, `glass`, `wrap`, `each`, `sandwich`, `jar`, `fillet`, `taco`, `slice`, `tortilla`, `tamal`, `torta`, `piece`, `roll`.
- `cookingMethod` names how that one ingredient is cooked in this dish when it is cooked (`Roasted`, `Simmered`, `Fried`, `Braised`, `Boiled`, `Grilled`, `Steamed`, `Sauteed`, `Baked`), or null when it goes in raw or the step covers it. It steers which nutrient row is read, so use it for the main ingredients.

## Checking a file

`node scripts/_mexican_recipes/validate.js <your file>.json` must report 0 errors before the file is handed back. Warnings about a listed base not written yet are expected while the base file is still being written.
