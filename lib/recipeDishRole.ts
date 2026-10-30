// What part of a meal a curated recipe actually plays, which is not the
// same question as which builder assembles it.
//
// Direct instruction, 1.0.41.1: "Move the 91 mains out of Sides into their
// own group." The Side Builder is this app's generic single-dish tool, so
// everything from a roasted salmon fillet to a bowl of sauteed spinach was
// authored through it and carried linkedBuilderType 'side'. Grouping the
// screen by builder therefore filed 126 dishes that ARE the meal under a
// heading that says they sit beside one.
//
// The builder is still right and is not changed here: Build This Recipe on
// a salmon fillet still opens the Side Builder loaded with it, because
// that is the tool that edits it. What changes is only how the dish is
// described and grouped, the same separation BREAKFAST_DISH_RECIPE_IDS in
// lib/dailyMealPlan.ts already draws for a different question.
//
// The rule is stated as the short list rather than the long one: a
// side-builder recipe is a MAIN unless it is named below. That direction
// was chosen deliberately. Of the 131 recipes the Side Builder held when
// that was written, five were side dishes, so naming the five is
// reviewable in a way that naming the other 126 is not, and a recipe
// added to that builder later is far more likely to be another main than
// another vegetable side. A new side dish has to be added here, and
// scripts/audit_system_recipe_subgroups.js prints the split every time it
// runs so the number cannot drift unnoticed the way the builder-type
// counts did.
//
// 2026-09-19, 1.0.41.2: 25 more side dishes were written
// (scripts/add_sides_snacks_batch.js), taking this list from five to
// thirty against the same 126 mains. The short list is still the shorter
// one, so the direction of the rule is unchanged.
//
// A side dish here means the whole dish: no meat, fish, egg, tofu, tempeh,
// seitan, bean or lentil anchoring it, and not enough on its own to be
// somebody's lunch. That test is what puts Portobello Mushroom with Beets
// and Orange in mains (it is the vegan counterpart to the chicken dish of
// the same shape) and Garlic Mashed Cauliflower here.

export const SIDE_DISH_RECIPE_IDS = new Set<string>([
  'curated_side_garlic_mashed_cauliflower',
  'curated_side_herb_roasted_potatoes',
  'curated_side_lemon_garlic_broccoli',
  'curated_side_rainbow_stir_fry',
  'curated_side_sauteed_spinach_garlic',

  // 2026-09-19, grouped here the way RECIPE_SUBGROUPS in
  // components/SystemRecipesView.tsx groups them on screen, so a change to
  // one of the two can be checked against the other by eye.
  // Roasted and baked vegetables.
  'curated_side_maple_roasted_carrots',
  'curated_side_roasted_brussels_lemon',
  'curated_side_roasted_butternut_cinnamon',
  'curated_side_roasted_beets_orange',
  'curated_side_roasted_fennel_pepper',
  'curated_side_roasted_turnips_rosemary',
  'curated_side_roasted_zucchini_garlic',
  'curated_side_roasted_cauliflower_turmeric',
  // Greens and skillet vegetables.
  'curated_side_sauteed_kale_lemon',
  'curated_side_braised_cabbage_apple',
  'curated_side_garlicky_green_beans',
  'curated_side_skillet_asparagus_lemon',
  'curated_side_sauteed_leeks_carrots',
  'curated_side_broccoli_ginger',
  // Grains and starchy sides.
  'curated_side_sweet_potato_wedges',
  'curated_side_lemon_herb_brown_rice',
  'curated_side_creamy_polenta',
  'curated_side_sorghum_pilaf',
  'curated_side_coconut_rice',
  'curated_side_mashed_sweet_potato_lime',
  // Slaws and cold sides.
  'curated_side_cabbage_carrot_slaw',
  'curated_side_cucumber_dill_salad',
  'curated_side_fennel_apple_slaw',
  // Beans and lentils. Both are here rather than in mains because each is
  // a cup of a single legume dressed simply, served beside something else,
  // and neither is somebody's lunch on its own.
  'curated_side_lemon_garlic_chickpeas',
  'curated_side_stewed_lentils_carrot',

  // 2026-10-29, the Mexican System Recipes (scripts/add_mexican_recipes.js).
  // They sit on the Mexican band on screen rather than under Sides, but the
  // meal plan's side pool still reads this list, so the rice, the beans and
  // the vegetable sides served beside a main are named here.
  'curated_mx_base_arroz_blanco',
  'curated_mx_base_arroz_rojo',
  'curated_mx_base_arroz_verde',
  'curated_mx_base_frijoles_de_la_olla',
  'curated_mx_base_frijoles_refritos',
  'curated_mx_calabacitas_con_queso',
  'curated_mx_camotes_enmielados',
  'curated_mx_nopales_a_la_mexicana',
  'curated_mx_rajas_con_crema',
  // The same day, the French, Italian, German, Chinese, Thai and Vietnamese
  // System Recipes (scripts/add_cuisine_recipes.js), named here for the same
  // reason. Pantry bases that are not eaten as a side (crispy pork belly,
  // chả lụa, fresh rice noodles, plain congee) are left out.
  'curated_fr_ratatouille',
  'curated_fr_gratin_dauphinois',
  'curated_fr_puree_de_pommes_de_terre',
  'curated_fr_pommes_anna',
  'curated_fr_pommes_sarladaises',
  'curated_fr_pommes_frites',
  'curated_fr_petits_pois_a_la_francaise',
  'curated_fr_carottes_vichy',
  'curated_fr_endives_braisees',
  'curated_fr_lentilles_du_puy',
  'curated_fr_flageolets',
  'curated_fr_tian_provencal',
  'curated_fr_champignons_a_la_provencale',
  'curated_fr_aligot',
  'curated_fr_epinards_a_la_creme',
  'curated_it_base_polenta',
  'curated_it_carciofi_alla_romana',
  'curated_it_carciofi_alla_giudia',
  'curated_it_peperonata',
  'curated_it_fagioli_alluccelletto',
  'curated_it_cicoria_ripassata',
  'curated_it_patate_al_forno',
  'curated_it_zucchine_alla_scapece',
  'curated_it_funghi_trifolati',
  'curated_it_verdure_grigliate',
  'curated_it_piselli_al_prosciutto',
  'curated_de_spatzle',
  'curated_de_kartoffelknodel',
  'curated_de_semmelknodel',
  'curated_de_bratkartoffeln',
  'curated_de_schwabischer_kartoffelsalat',
  'curated_de_norddeutscher_kartoffelsalat',
  'curated_de_schupfnudeln',
  'curated_de_salzkartoffeln',
  'curated_de_kartoffelpuree',
  'curated_de_himmel_und_erde',
  'curated_de_rotkohl',
  'curated_de_rahmspinat',
  'curated_de_kohlrabi_in_rahmso_e',
  'curated_de_rahmwirsing',
  'curated_de_leipziger_allerlei',
  'curated_de_rosenkohl_mit_speck',
  'curated_cn_base_steamed_jasmine_rice',
  'curated_cn_base_steamed_glutinous_rice',
  'curated_cn_pi_dan_dou_fu',
  'curated_cn_zheng_shui_dan',
  'curated_cn_di_san_xian',
  'curated_cn_gan_bian_si_ji_dou',
  'curated_cn_suan_rong_bai_cai',
  'curated_cn_hao_you_gai_lan',
  'curated_cn_yu_xiang_qie_zi',
  'curated_cn_suan_la_tu_dou_si',
  'curated_cn_fu_ru_kong_xin_cai',
  'curated_cn_hu_pi_jian_jiao',
  'curated_cn_cu_liu_bai_cai',
  'curated_cn_he_lan_dou_chao',
  'curated_th_base_khao_suay',
  'curated_th_base_khao_niao',
  'curated_th_pad_pak_boong',
  'curated_vn_base_com_trang',
  'curated_vn_base_xoi_trang',
  'curated_vn_xoi_gac',
  'curated_vn_rau_muong_xao_toi',
  'curated_vn_ca_tim_nuong_mo_hanh',
  'curated_vn_rau_cu_luoc_cham_kho_quet',
  'curated_vn_dau_que_xao_toi',
]);

// True only for a dish meant to sit beside a main. Everything else the
// Side Builder makes, breakfast skillets and hashes included, is a main:
// a hash is the meal at breakfast, not an accompaniment to one.
export function isSideDish(curatedRecipeId: string | undefined): boolean {
  return curatedRecipeId !== undefined && SIDE_DISH_RECIPE_IDS.has(curatedRecipeId);
}
