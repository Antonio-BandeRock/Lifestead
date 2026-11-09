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
  // Owner's fifth round, 2026-11-09: only where the evidence points. The
  // WCRF finding is for food salted the traditional East Asian way; studies
  // of Japanese salted pickles find more stomach cancer, studies of kimchi
  // and of lactic sour pickles do not, and none measures sauerkraut.
  SALT_PRESERVED_EAST_ASIAN: 'The World Cancer Research Fund rates food preserved by salting, as traditionally prepared in East Asia, as a probable cause of stomach cancer; for salted vegetables the studies, all from Asia, found about 9% more risk for each 20 g eaten a day (2018).',
  // Owner's fifth round: for people in recovery, for medications that do not
  // mix with alcohol, and because cooking leaves some of it in the dish
  // (USDA Table of Nutrient Retention Factors, Release 6, 2007).
  ALCOHOL: 'Contains alcohol. Anyone in recovery, or taking a medication that should not be mixed with alcohol, may want to leave it out. Cooking does not remove all of it: depending on the method and the time, from about 5% to 85% of the alcohol stays in the dish (USDA, 2007).',
  SOY_OIL: 'Made from soybeans. Anyone with a soy allergy should treat this oil as soy. Highly refined soybean oil is exempt from allergen labelling in the United States because refining removes most of the protein, but cold-pressed oil keeps more of it and a label rarely says which is in the bottle. Whether any soybean oil is safe for one person is a question for their allergist.',
  SESAME_OIL: 'Made from sesame. Anyone with a sesame allergy should treat this oil as sesame. Sesame oil is seldom highly refined, so it usually keeps the protein that causes a reaction. Whether any sesame oil is safe for one person is a question for their allergist.',
  PEANUT_OIL:'Made from peanuts. Anyone with a peanut allergy should treat this oil as peanut. Highly refined peanut oil is exempt from allergen labelling in the United States because refining removes most of the protein, but cold-pressed oil keeps more of it and a label rarely says which is in the bottle. Whether any peanut oil is safe for one person is a question for their allergist.',
  NUT_OIL: 'Made from tree nuts. Anyone with a tree nut allergy should treat this oil as the nut it comes from. Cold-pressed nut oils keep more of the protein that causes a reaction, and a label rarely says how much is left. Whether any nut oil is safe for one person is a question for their allergist.',
  BLEND_OIL: 'A blend, and the oils in it change from brand to brand. Anyone with a peanut, tree nut, soy or sesame allergy should read the label before using it.',
};
