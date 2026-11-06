// The wording of every caution stored with the curated list, in one place. The app shows none of these until the merge.
const SALT = 'High in salt. The World Health Organization advises adults to keep to under 5 g of salt a day, about 2 g of sodium (WHO, 2012). A small amount of this can use a large share of that, so it is wise to use it sparingly.';

// A figure read off the front row, rounded so it does not claim more precision than a food table has.
const amount = (mg) => {
  const rounded = mg >= 1000 ? Math.round(mg / 100) * 100 : Math.round(mg / 10) * 10;
  return `about ${rounded.toLocaleString('en-US')} mg of sodium per 100 g, the same sodium as about ${((mg * 2.5) / 1000).toFixed(1)} g of salt`;
};
const LIMIT = 'The World Health Organization advises adults to keep to under 5 g of salt a day (WHO, 2012), so anyone limiting salt should count this toward that.';

module.exports = {
  PROCESSED_MEAT: "Processed meat. The World Health Organization's cancer agency classes processed meat as a known cause of bowel cancer, with risk rising about 18% for each 50 g eaten daily (IARC, 2015). Most carry a lot of salt, and many carry nitrite. It is wise to keep these small and occasional.",
  SALT,
  // Round 4: reworded after reading the report itself. Its grade is "probable", its definition is East Asian salting, and the fish figure alone did not reach significance.
  SALT_PRESERVED_SEAFOOD: `${SALT} The World Cancer Research Fund rates food preserved by salting, as traditionally prepared in East Asia, as a probable cause of stomach cancer (2018).`,
  SUGAR: 'Added sugar. The World Health Organization advises keeping free sugars under 10% of daily energy, and says under 5% brings further benefit (WHO, 2015). It is wise to use it sparingly.',
  // Salt is part of how this food is made.
  saltSome: (mg) => `Contains salt: ${amount(mg)}. ${LIMIT}`,
  // The food table gives no figure, and the name says salt went in.
  SALT_NO_FIGURE: 'Usually made with salt, and the food tables here give no figure for it. Anyone limiting salt should check the label or count it as salty.',
  // Sodium with no claim either way about whether salt was added.
  sodium: (mg) => `${mg >= 600 ? 'High in sodium' : 'Contains sodium'}: ${amount(mg)}. ${LIMIT}`,
  // Allergy wording is allergen-aware and never promises that a food is safe.
  PEANUT_OIL: 'Made from peanuts. Anyone with a peanut allergy should treat this oil as peanut. Highly refined peanut oil is exempt from allergen labelling in the United States because refining removes most of the protein, but cold-pressed oil keeps more of it and a label rarely says which is in the bottle. Whether any peanut oil is safe for one person is a question for their allergist.',
  NUT_OIL: 'Made from tree nuts. Anyone with a tree nut allergy should treat this oil as the nut it comes from. Cold-pressed nut oils keep more of the protein that causes a reaction, and a label rarely says how much is left. Whether any nut oil is safe for one person is a question for their allergist.',
  BLEND_OIL: 'A blend, and the oils in it change from brand to brand. Anyone with a peanut, tree nut, soy or sesame allergy should read the label before using it.',
};
