// What a supplement label can hold beyond the nutrients the food records
// count. Tony, 2026-11-27: "In nutrient dropdown list in supplements things
// like pumpkin seed oil should be listed, also Omega 3, and anything else
// that is missing like that. Add estrogen as well."
//
// The My Meds ingredient picker was built from the food database's tracked
// nutrients alone (listTrackedNutrients), so an oil, a fatty acid, a hormone,
// an herb or an amino acid had nowhere to go. These are kept on the
// supplement as the label gives them. None of them is added into a day's
// nutrient totals: the food records carry no amount for any of them, so
// there is nothing to compare a dose against, and getSupplementContributions
// in lib/db.ts passes over them without calling them uncounted.
//
// Chromium, molybdenum and boron are here for the same reason: multivitamin
// labels carry them and the food database does not. A code the food
// database comes to carry is taken from there instead (withSupplementIngredients
// drops a duplicate), so the codes match the names a nutrient table would use.
//
// Each alias is written the way lib/spokenSupplement.ts normalizes a label:
// lower case, hyphens as spaces, and "Omega-3" as "omega3". A name that is
// itself a form (ubiquinol, estradiol) carries that form along.
//
// Pure, no imports, so lib/spokenSupplement.ts can read it and
// scripts/test_spoken_supplement.js can run both under node.

export type SupplementIngredient = {
  code: string;
  displayName: string;
  /** The unit offered first when it is picked; the label's unit can still be chosen. */
  unit: 'mg' | 'mcg' | 'g';
  aliases: string[];
  forms?: Record<string, string>;
};

export const SUPPLEMENT_INGREDIENTS: SupplementIngredient[] = [
  // Minerals the food records do not carry.
  { code: 'chromium', displayName: 'Chromium', unit: 'mcg', aliases: ['chromium'], forms: { 'chromium picolinate': 'picolinate', 'chromium polynicotinate': 'polynicotinate' } },
  { code: 'molybdenum', displayName: 'Molybdenum', unit: 'mcg', aliases: ['molybdenum'] },
  { code: 'boron', displayName: 'Boron', unit: 'mg', aliases: ['boron'] },
  { code: 'silica', displayName: 'Silica', unit: 'mg', aliases: ['silica', 'silicon'] },

  // Fatty acids.
  { code: 'omega_3', displayName: 'Omega-3 (total)', unit: 'mg', aliases: ['omega3', 'omega3 fatty acids', 'total omega3', 'total omega3 fatty acids'] },
  { code: 'epa', displayName: 'EPA (eicosapentaenoic acid)', unit: 'mg', aliases: ['epa', 'eicosapentaenoic acid'] },
  { code: 'dha', displayName: 'DHA (docosahexaenoic acid)', unit: 'mg', aliases: ['dha', 'docosahexaenoic acid'] },
  { code: 'ala_omega_3', displayName: 'ALA (alpha-linolenic acid)', unit: 'mg', aliases: ['alpha linolenic acid'] },
  { code: 'omega_6', displayName: 'Omega-6', unit: 'mg', aliases: ['omega6', 'omega6 fatty acids', 'linoleic acid'] },
  { code: 'gla', displayName: 'GLA (gamma-linolenic acid)', unit: 'mg', aliases: ['gla', 'gamma linolenic acid'] },
  { code: 'omega_9', displayName: 'Omega-9', unit: 'mg', aliases: ['omega9', 'omega9 fatty acids', 'oleic acid'] },

  // Oils.
  { code: 'fish_oil', displayName: 'Fish oil', unit: 'mg', aliases: ['fish oil', 'fish oil concentrate'] },
  { code: 'krill_oil', displayName: 'Krill oil', unit: 'mg', aliases: ['krill oil'] },
  { code: 'cod_liver_oil', displayName: 'Cod liver oil', unit: 'mg', aliases: ['cod liver oil'] },
  { code: 'algal_oil', displayName: 'Algae oil', unit: 'mg', aliases: ['algae oil', 'algal oil'] },
  { code: 'flaxseed_oil', displayName: 'Flaxseed oil', unit: 'mg', aliases: ['flaxseed oil', 'flax seed oil', 'flax oil', 'linseed oil'] },
  { code: 'pumpkin_seed_oil', displayName: 'Pumpkin seed oil', unit: 'mg', aliases: ['pumpkin seed oil', 'pumpkin oil'] },
  { code: 'black_seed_oil', displayName: 'Black seed oil', unit: 'mg', aliases: ['black seed oil', 'black cumin seed oil', 'nigella sativa', 'nigella sativa oil'] },
  { code: 'evening_primrose_oil', displayName: 'Evening primrose oil', unit: 'mg', aliases: ['evening primrose oil', 'evening primrose'] },
  { code: 'borage_oil', displayName: 'Borage oil', unit: 'mg', aliases: ['borage oil', 'borage seed oil'] },
  { code: 'mct_oil', displayName: 'MCT oil', unit: 'g', aliases: ['mct oil', 'mct', 'medium chain triglycerides'] },
  { code: 'sea_buckthorn_oil', displayName: 'Sea buckthorn oil', unit: 'mg', aliases: ['sea buckthorn oil', 'sea buckthorn'] },

  // Hormones and hormone-like.
  {
    code: 'estrogen',
    displayName: 'Estrogen',
    unit: 'mg',
    aliases: ['estrogen', 'estrogens', 'oestrogen'],
    forms: { estradiol: 'estradiol', oestradiol: 'estradiol', estriol: 'estriol', estrone: 'estrone' },
  },
  { code: 'progesterone', displayName: 'Progesterone', unit: 'mg', aliases: ['progesterone'] },
  { code: 'dhea', displayName: 'DHEA', unit: 'mg', aliases: ['dhea', 'dehydroepiandrosterone'] },
  { code: 'pregnenolone', displayName: 'Pregnenolone', unit: 'mg', aliases: ['pregnenolone'] },
  { code: 'melatonin', displayName: 'Melatonin', unit: 'mg', aliases: ['melatonin'] },

  // Antioxidants and other compounds.
  { code: 'coq10', displayName: 'Coenzyme Q10', unit: 'mg', aliases: ['coq10', 'coenzyme q10', 'co q10'], forms: { ubiquinol: 'ubiquinol', ubiquinone: 'ubiquinone' } },
  { code: 'alpha_lipoic_acid', displayName: 'Alpha-lipoic acid', unit: 'mg', aliases: ['alpha lipoic acid', 'lipoic acid'], forms: { 'r lipoic acid': 'r lipoic acid' } },
  { code: 'nac', displayName: 'NAC (N-acetyl cysteine)', unit: 'mg', aliases: ['nac', 'n acetyl cysteine', 'n acetyl l cysteine', 'n acetylcysteine', 'acetylcysteine'] },
  { code: 'glutathione', displayName: 'Glutathione', unit: 'mg', aliases: ['glutathione'], forms: { 'liposomal glutathione': 'liposomal', 's acetyl glutathione': 's acetyl' } },
  { code: 'lutein', displayName: 'Lutein', unit: 'mg', aliases: ['lutein'] },
  { code: 'zeaxanthin', displayName: 'Zeaxanthin', unit: 'mg', aliases: ['zeaxanthin'] },
  { code: 'astaxanthin', displayName: 'Astaxanthin', unit: 'mg', aliases: ['astaxanthin'] },
  { code: 'resveratrol', displayName: 'Resveratrol', unit: 'mg', aliases: ['resveratrol', 'trans resveratrol'] },
  { code: 'quercetin', displayName: 'Quercetin', unit: 'mg', aliases: ['quercetin'] },
  { code: 'curcumin', displayName: 'Turmeric (curcumin)', unit: 'mg', aliases: ['turmeric', 'turmeric root', 'curcumin', 'curcuminoids'] },
  { code: 'berberine', displayName: 'Berberine', unit: 'mg', aliases: ['berberine', 'berberine hcl'] },
  { code: 'pqq', displayName: 'PQQ', unit: 'mg', aliases: ['pqq', 'pyrroloquinoline quinone'] },

  // Amino acids and joint and skin compounds.
  { code: 'l_glutamine', displayName: 'L-glutamine', unit: 'g', aliases: ['glutamine', 'l glutamine'] },
  { code: 'l_theanine', displayName: 'L-theanine', unit: 'mg', aliases: ['theanine', 'l theanine'] },
  { code: 'l_carnitine', displayName: 'L-carnitine', unit: 'mg', aliases: ['carnitine', 'l carnitine'], forms: { 'acetyl l carnitine': 'acetyl l carnitine', 'l carnitine tartrate': 'tartrate' } },
  { code: 'l_tyrosine', displayName: 'L-tyrosine', unit: 'mg', aliases: ['tyrosine', 'l tyrosine', 'n acetyl l tyrosine'] },
  { code: 'taurine', displayName: 'Taurine', unit: 'mg', aliases: ['taurine'] },
  { code: 'l_arginine', displayName: 'L-arginine', unit: 'mg', aliases: ['arginine', 'l arginine'] },
  { code: 'l_lysine', displayName: 'L-lysine', unit: 'mg', aliases: ['lysine', 'l lysine'] },
  { code: 'htp_5', displayName: '5-HTP', unit: 'mg', aliases: ['5htp', '5 hydroxytryptophan'] },
  { code: 'creatine', displayName: 'Creatine', unit: 'g', aliases: ['creatine'], forms: { 'creatine monohydrate': 'monohydrate' } },
  { code: 'collagen', displayName: 'Collagen', unit: 'g', aliases: ['collagen', 'collagen peptides', 'hydrolyzed collagen'] },
  { code: 'glucosamine', displayName: 'Glucosamine', unit: 'mg', aliases: ['glucosamine'], forms: { 'glucosamine sulfate': 'sulfate', 'glucosamine hcl': 'hcl' } },
  { code: 'chondroitin', displayName: 'Chondroitin', unit: 'mg', aliases: ['chondroitin', 'chondroitin sulfate'] },
  { code: 'msm', displayName: 'MSM (methylsulfonylmethane)', unit: 'mg', aliases: ['msm', 'methylsulfonylmethane'] },
  { code: 'hyaluronic_acid', displayName: 'Hyaluronic acid', unit: 'mg', aliases: ['hyaluronic acid', 'sodium hyaluronate'] },

  // Gut.
  { code: 'digestive_enzymes', displayName: 'Digestive enzymes', unit: 'mg', aliases: ['digestive enzymes', 'enzyme blend', 'digestive enzyme blend'] },
  { code: 'betaine_hcl', displayName: 'Betaine HCl', unit: 'mg', aliases: ['betaine hcl', 'betaine hydrochloride'] },
  { code: 'colostrum', displayName: 'Colostrum', unit: 'mg', aliases: ['colostrum', 'bovine colostrum'] },
  { code: 'slippery_elm', displayName: 'Slippery elm', unit: 'mg', aliases: ['slippery elm', 'slippery elm bark'] },
  { code: 'marshmallow_root', displayName: 'Marshmallow root', unit: 'mg', aliases: ['marshmallow root', 'marshmallow'] },
  { code: 'licorice_dgl', displayName: 'Licorice root (DGL)', unit: 'mg', aliases: ['dgl', 'deglycyrrhizinated licorice', 'licorice', 'licorice root'] },
  { code: 'aloe_vera', displayName: 'Aloe vera', unit: 'mg', aliases: ['aloe vera', 'aloe'] },

  // Herbs.
  { code: 'ashwagandha', displayName: 'Ashwagandha', unit: 'mg', aliases: ['ashwagandha', 'ashwagandha root', 'withania somnifera'] },
  { code: 'rhodiola', displayName: 'Rhodiola', unit: 'mg', aliases: ['rhodiola', 'rhodiola rosea'] },
  { code: 'holy_basil', displayName: 'Holy basil (tulsi)', unit: 'mg', aliases: ['holy basil', 'tulsi'] },
  { code: 'maca', displayName: 'Maca', unit: 'mg', aliases: ['maca', 'maca root'] },
  { code: 'ginger', displayName: 'Ginger', unit: 'mg', aliases: ['ginger', 'ginger root'] },
  { code: 'garlic', displayName: 'Garlic', unit: 'mg', aliases: ['garlic', 'aged garlic extract', 'allicin'] },
  { code: 'milk_thistle', displayName: 'Milk thistle', unit: 'mg', aliases: ['milk thistle', 'silymarin'] },
  { code: 'saw_palmetto', displayName: 'Saw palmetto', unit: 'mg', aliases: ['saw palmetto'] },
  { code: 'echinacea', displayName: 'Echinacea', unit: 'mg', aliases: ['echinacea'] },
  { code: 'elderberry', displayName: 'Elderberry', unit: 'mg', aliases: ['elderberry', 'black elderberry', 'sambucus'] },
  { code: 'ginkgo', displayName: 'Ginkgo biloba', unit: 'mg', aliases: ['ginkgo', 'ginkgo biloba'] },
  { code: 'black_cohosh', displayName: 'Black cohosh', unit: 'mg', aliases: ['black cohosh'] },
  { code: 'valerian', displayName: 'Valerian', unit: 'mg', aliases: ['valerian', 'valerian root'] },
  { code: 'chamomile', displayName: 'Chamomile', unit: 'mg', aliases: ['chamomile'] },
  { code: 'green_tea_extract', displayName: 'Green tea extract', unit: 'mg', aliases: ['green tea extract', 'green tea', 'egcg'] },
  { code: 'nettle', displayName: 'Nettle', unit: 'mg', aliases: ['nettle', 'stinging nettle', 'nettle leaf', 'nettle root'] },
  { code: 'dim', displayName: 'DIM (diindolylmethane)', unit: 'mg', aliases: ['dim', 'diindolylmethane'] },
];

const CODES = new Set(SUPPLEMENT_INGREDIENTS.map((item) => item.code));

/** True for a label ingredient the food records do not count. */
export function isSupplementOnlyIngredient(code: string): boolean {
  return CODES.has(code);
}

/**
 * The tracked nutrients with these added, for the My Meds ingredient
 * picker. A code the food database already carries keeps its row there.
 */
export function withSupplementIngredients<T extends { code: string; displayName: string; unit: string }>(
  tracked: readonly T[],
): (T | { code: string; displayName: string; unit: string; group: string })[] {
  const have = new Set(tracked.map((nutrient) => nutrient.code));
  return [
    ...tracked,
    ...SUPPLEMENT_INGREDIENTS.filter((item) => !have.has(item.code)).map((item) => ({
      code: item.code,
      displayName: item.displayName,
      unit: item.unit,
      group: 'supplement',
    })),
  ];
}
