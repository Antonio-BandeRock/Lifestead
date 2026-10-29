// The cuisine bands on Food > System Recipes, one per cuisine, each shelved
// in the order a cook meets it: what has to be made first, then the dishes.
//
// 2026-10-29: Mexican came first, from Tony's list. The same day: "do the
// same thing for other ethnic foods categories and go just as deep as the
// Mexican dishes went. I think, French, Italian, German, and Chinese, and
// Thai, and Vietnamese." A recipe joins a band by recipeCard.cuisine and
// sits on recipeCard.shelf, both written by
// scripts/generate_cuisine_recipes_ts.js from the recipe files in each
// cuisine's folder (scripts/cuisine_recipes.js lists them).
//
// This file is plain data with nothing imported, because three scripts read
// it as text: scripts/audit_system_recipe_subgroups.js fails on a shelf not
// listed here, and scripts/validate_cuisine_recipes.js refuses a dishGroup
// not listed here. Keep the literal free of anything but strings.
//
// A shelf starting "Bases:" holds what is made first, and Meal Plan never
// offers one of those as a meal (isMadeFirstBase in lib/dailyMealPlan.ts).
export type CuisineBand = {
  cuisine: string;
  key: string;
  icon: string;
  shelves: string[];
};

export const CUISINE_BANDS: CuisineBand[] = [
  {
    cuisine: 'Mexican',
    key: 'mexican',
    icon: 'sunny-outline',
    shelves: [
      'Bases: Masa & Tortillas',
      'Bases: Salsas',
      'Bases: Moles & Chile Sauces',
      'Bases: Beans, Rice & Pantry',
      'Tacos',
      'Tortas & Antojitos',
      'Tamales',
      'Meats & Seafood',
      'Enchiladas & Tortilla Dishes',
      'Eggs & Breakfast',
      'Soups & Pozoles',
      'Vegetables & Sides',
      'Drinks',
      'Sweets & Breads',
    ],
  },
  {
    cuisine: 'French',
    key: 'french',
    icon: 'wine-outline',
    shelves: [
      'Bases: Stocks & Mother Sauces',
      'Bases: Doughs & Pastry',
      'Bases: Pantry & Building Blocks',
      'Starters & Charcuterie',
      'Soups',
      'Eggs, Crêpes & Savory Tarts',
      'Fish & Shellfish',
      'Poultry',
      'Meats & Stews',
      'Vegetables & Sides',
      'Salads',
      'Breads & Viennoiserie',
      'Desserts & Pastry',
    ],
  },
  {
    cuisine: 'Italian',
    key: 'italian',
    icon: 'pizza-outline',
    shelves: [
      'Bases: Pasta & Doughs',
      'Bases: Sauces & Stocks',
      'Bases: Pantry & Building Blocks',
      'Antipasti',
      'Soups',
      'Pasta',
      'Risotto, Polenta & Gnocchi',
      'Pizza & Breads',
      'Fish & Seafood',
      'Meats & Poultry',
      'Vegetables & Contorni',
      'Desserts',
    ],
  },
  {
    cuisine: 'German',
    key: 'german',
    icon: 'beer-outline',
    shelves: [
      'Bases: Stocks & Sauces',
      'Bases: Doughs & Dumplings',
      'Bases: Pantry & Preserves',
      'Soups & Eintöpfe',
      'Meats & Sausages',
      'Fish',
      'Potatoes, Dumplings & Noodles',
      'Vegetables & Salads',
      'Breads & Pretzels',
      'Cakes & Desserts',
    ],
  },
  {
    cuisine: 'Chinese',
    key: 'chinese',
    icon: 'restaurant-outline',
    shelves: [
      'Bases: Stocks & Sauces',
      'Bases: Doughs & Wrappers',
      'Bases: Rice & Pantry',
      'Dim Sum & Dumplings',
      'Noodles',
      'Rice Dishes',
      'Soups',
      'Pork',
      'Poultry',
      'Beef & Lamb',
      'Fish & Seafood',
      'Tofu & Eggs',
      'Vegetables',
      'Sweets & Drinks',
    ],
  },
  {
    cuisine: 'Thai',
    key: 'thai',
    icon: 'flame-outline',
    shelves: [
      'Bases: Curry Pastes',
      'Bases: Sauces, Dips & Stocks',
      'Bases: Rice, Noodles & Pantry',
      'Curries',
      'Soups',
      'Stir-Fries',
      'Salads',
      'Noodles',
      'Rice Dishes',
      'Grilled & Fried',
      'Sweets & Drinks',
    ],
  },
  {
    cuisine: 'Vietnamese',
    key: 'vietnamese',
    icon: 'leaf-outline',
    shelves: [
      'Bases: Broths',
      'Bases: Sauces & Dips',
      'Bases: Rice, Noodles & Pantry',
      'Phở & Noodle Soups',
      'Noodle Bowls',
      'Rice Dishes',
      'Bánh Mì, Rolls & Pancakes',
      'Meats & Seafood',
      'Soups',
      'Salads & Vegetables',
      'Sweets & Drinks',
    ],
  },
];

export function cuisineBandFor(cuisine: string | undefined): CuisineBand | undefined {
  if (!cuisine) return undefined;
  return CUISINE_BANDS.find((band) => band.cuisine === cuisine);
}
