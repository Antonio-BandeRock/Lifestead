# Rules for reading the food list

You decide whether each food row stays in the food database a person searches, and what it is called there. These rules come from the owner. Apply them, do not improve them.

## Reading a row

Each input line is:
`id | source | english name | original name | source category | latin name | keywords | LanguaL treatment codes | nutrients per 100 g`

Nutrients: kc energy in kcal, w water in g, p protein in g, f fat in g, cb carbohydrate in g, sg sugars in g, na sodium in mg.

Use every field, not only the name. Machine-translated English can be wrong, so believe the original name when they disagree (French cru, German roh, Swedish rå mean raw; cuit, gekocht, kokt mean cooked). Use nutrients as evidence: a "plain" food with sugars far above what that food holds has sugar added, with sodium far above what it holds has salt added, and water far below its raw form may mean dried while water far above may mean cooked or diluted. LanguaL F0003 and F0001 usually mean not heat treated; F0014 means heat treated.

## KEEP if it is one ingredient, with nothing added, in one of these forms

- **Produce:** raw, fresh, frozen or naturally dried fruit, vegetables, fungi, herbs, seaweed, wild plants, whole or chopped, unsweetened.
- **Meat and seafood:** raw, fresh or frozen meat, poultry, game, organs, fish, shellfish, roe. Plain lard, tallow, raw animal fat. Dried or salted fish or meat with no curing chemicals in the name.
- **Dairy and eggs:** milk of any fat level, plain cream, butter (salted or not), buttermilk, whole eggs, egg whites, egg yolks. **Every cheese is kept**, except process cheese, cheese food or imitation cheese. Plain unflavored yogurt, kefir and other plain cultured milk. Added vitamins named on plain milk do not disqualify it, but protein-fortified milk is hidden. A reduced-fat butter, or a cheese "preparation" or "specialty" with starch, carbohydrate or a spreadable tray, is hidden.
- **Grains, legumes, nuts and seeds:** whole grains, raw nuts, seeds, dried beans and lentils. Milled, rolled, pearled or polished grains with nothing added (white rice, rolled oats, pearl barley, bran, germ, couscous and plain dried pasta only when flour and water or egg are all it holds). Any flour ground from one grain, nut, seed or root. **Enriched flour and tortilla mix are kept by the owner's decision.** Plain starches.
- **Pantry:** honey of any kind, pure maple syrup, molasses, sorghum syrup, unrefined cane sugar. Baking soda, cream of tartar, active dry or fresh yeast. Every pure ground or whole spice and dried herb. **Every salt is kept.**
- **Traditional ferments, plain:** sauerkraut, kimchi, miso, natto, tempeh, plain vinegar, soy sauce, fish sauce. A vegetable or fruit pickled in salt alone (umeboshi, salted greens) is kept, with a `q`. Tofu and gelatin are hidden, with a `q`.
- **Mechanically pressed oils and fats:** olive, coconut, avocado, sesame, walnut, unrefined or cold-pressed nut and seed oils. Refined or solvent-extracted seed oil (canola, soybean, corn, cottonseed, safflower, sunflower, generic vegetable oil) is hidden.
- **Drinks in their dry or fresh form:** dry tea leaves, coffee beans (roasted is fine) and ground coffee, freshly pressed unsweetened juice. A plain juice with nothing saying concentrate, nectar, sweetened or sugar is kept, with no `q`; the owner will get one question covering all of them. Water of any kind is hidden.

## HIDE

Anything with more than one ingredient, or manufactured, or cooked: cooked or canned food, prepared dishes, baked goods, sweets, snacks, sauces, spreads, sweetened or flavored anything, added fruit preparations, brewed tea or coffee, instant coffee, alcohol, soft drinks, plant milks, meat substitutes, spice blends and seasoning mixes, refined white sugar and powdered sugar, corn syrup, cured or smoked meat and fish, branded products, ready-to-eat cereal, mixes of different frozen fruits or vegetables, salted or roasted nuts. A word in capitals usually means a brand: hide it, unless the row is a plain raw food whose capitals name a variety or a place (`Kiwifruit, ZESPRI SunGold, raw` keeps as `Kiwifruit`).

## When unsure

If the name shows no problem and the nutrients agree, KEEP it: a name that says nothing about additives is not evidence of them. If it could go either way, decide, and put a short question in the `q` field so the owner can look.

## The listing name

For every KEEP write the short name a person would type to find it. It replaces the source's comma-separated description.

- **No commas.** Two or three words at most in nearly every case. Plain everyday English, capital on the first word only.
- Say the food, then only what changes which food it is: `Apple`, `Dried apricots`, `Frozen blackberries`, `Whole milk`, `Skim milk`, `2% milk`, `Cheddar cheese`, `Sea salt`, `Egg yolk`, `Enriched white flour`, `Bread flour`, `Rolled oats`.
- **Drop** raw, fresh (unless needed to tell it from dried), grades, trims, lean or fat wording, bone-in, boneless, country, cultivar, "without skin", package words, and everything a person would not type.
- **Meat is animal plus cut:** `Beef chuck roast`, `Pork loin`, `Chicken breast`, `Lamb shoulder`, `Beef liver`. Every grade and trim of one cut gets the same name.
- **Copies of the same food from different countries and different rows of one food MUST get exactly the same name**, letter for letter. Rows are sorted to sit beside each other, so check your previous names as you go. Two rows get the same name only when a person would call them one food. Use the everyday American name when countries differ (`Swiss cheese` for emmental, `Cilantro` for fresh coriander leaves, `Eggplant` for aubergine, `Zucchini` for courgette, `Arugula` for rocket).
- **A fat level is part of a dairy food's name:** `Low-fat Monterey Jack cheese`, `Nonfat plain yogurt`, `Part-skim mozzarella cheese`. `Plain yogurt` and `Cottage cheese` alone are the regular kind.
- **Lamb, mutton and goat stay apart.** A row saying lamb is `Lamb ...`, a row saying sheep or mutton is `Mutton ...`, a kid or goat row is `Goat ...`, all type `lamb_mutton`. Sea cucumber is type `shellfish`. A plural is fine where people say it (`Almonds`, `Oats`, `Lentils`), and a species only where people ask for it by name (`Atlantic salmon`, `Pink salmon`).

## Reason and type

- `type` for every row, one of: beef, veal, pork, lamb_mutton, game, organ_meat, poultry, eggs, fish, shellfish, roe, milk_cream, cheese, cultured_dairy, butter_animal_fat, plant_oil, vegetable, fungi, seaweed, fruit, juice, herb_spice, salt_mineral, grain, flour, pasta_noodle, starch, legume, soy_ferment, nut, seed, sweetener, leavener, vinegar_condiment, tea_coffee, cocoa, baby_food, baked_goods, sweets_snacks, prepared_dish, processed_meat, soft_drink, alcohol, supplement, other.
- `why` for a KEEP: one short plain sentence naming the rule it meets. For a HIDE: one of cooked, canned, prepared_meal, baked_goods, sweets, processed_meat, added_sugar_or_flavor, soft_drink, alcohol, seed_oil, refined_sugar, spice_blend, brand, supplement, substitute, multi_ingredient, other.

## Output

Write one line per input row, every row, in input order, as JSON lines:

`{"id":123,"v":"K","name":"Apple","type":"fruit","why":"Raw single fruit.","q":""}`
`{"id":124,"v":"H","type":"prepared_dish","why":"prepared_meal","q":""}`

`q` holds a question for the owner, usually empty. Keep it under 15 words. Do not skip rows. Do not write commentary into the file. Keep `q` for a call you could honestly make either way; most rows have none.
