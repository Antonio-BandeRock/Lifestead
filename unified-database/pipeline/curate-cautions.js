// The wording of every caution stored with the curated list, in one place. The app shows none of these until the merge.
const SALT = 'High in salt. The World Health Organization advises adults to keep to under 5 g of salt a day, about 2 g of sodium (WHO, 2012). A small amount of this can use a large share of that, so it is wise to use it sparingly.';

module.exports = {
  PROCESSED_MEAT: "Processed meat. The World Health Organization's cancer agency classes processed meat as a known cause of bowel cancer, with risk rising about 18% for each 50 g eaten daily (IARC, 2015). Most carry a lot of salt, and many carry nitrite. It is wise to keep these small and occasional.",
  SALT,
  SALT_PRESERVED_SEAFOOD: `${SALT} Eating a lot of food preserved with salt is also a probable cause of stomach cancer (World Cancer Research Fund, 2018).`,
  SUGAR: 'Added sugar. The World Health Organization advises keeping free sugars under 10% of daily energy, and says under 5% brings further benefit (WHO, 2015). It is wise to use it sparingly.',
};
