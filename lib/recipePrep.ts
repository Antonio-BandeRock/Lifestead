// Which recipes have to be started long before they are eaten (Q60,
// 1.0.96.4): a soak, a marinade, a dough that rises overnight, a ferment.
// Each time is read from that recipe's written steps, at the long end where
// the steps give a range, so the start is never left too late.
//
// Pure, with no imports, so scripts/test_ready_for_tomorrow.js runs it
// without a phone.

export type PrepKind =
  | 'soak'
  | 'marinate'
  | 'rise'
  | 'chill'
  | 'cure'
  | 'drain'
  | 'dry'
  | 'ferment'
  | 'freeze'
  | 'rest'
  | 'salt'
  | 'stand'
  // Never in the table below; only for a start-ahead time of the person's.
  | 'thaw'
  | 'other';

/** What a start-ahead time of the person's can be for, as a chooser shows it. */
export const PREP_KIND_LABELS: Record<PrepKind, string> = {
  chill: 'Chilling',
  cure: 'Curing',
  drain: 'Draining',
  dry: 'Drying',
  ferment: 'Fermenting',
  freeze: 'Freezing',
  marinate: 'Marinating',
  rest: 'Resting',
  rise: 'Rising dough',
  salt: 'Salting ahead',
  soak: 'Soaking',
  stand: 'Standing',
  thaw: 'Thawing',
  other: 'Something else',
};

/** Passed through t() with {dish} when shown. */
export const PREP_SENTENCES: Record<PrepKind, string> = {
  soak: 'Start the soaking for {dish}',
  marinate: 'Start the marinade for {dish}',
  rise: 'Start the dough for {dish}',
  chill: 'Make {dish} so it can chill',
  cure: 'Start curing {dish}',
  drain: 'Start draining {dish}',
  dry: 'Start drying {dish}',
  ferment: 'Start fermenting {dish}',
  freeze: 'Make {dish} so it can freeze',
  rest: 'Start {dish} so it can rest',
  salt: 'Salt what goes into {dish}',
  stand: 'Start {dish} so it can stand',
  thaw: 'Take out what needs thawing for {dish}',
  other: 'Start {dish}',
};

export type PrepLead = { kind: PrepKind; hours: number };

// Kind, hours, and the recipes it holds for.
export const PREP_TABLE: [PrepKind, number, string[]][] = [
  ['chill', 2, ['curated_bev_peach_iced_black_tea', 'curated_de_bienenstich', 'curated_de_frankfurter_kranz', 'curated_de_heringssalat', 'curated_de_rote_grutze', 'curated_de_schwarzwalder_kirschtorte', 'curated_fr_base_creme_anglaise', 'curated_fr_base_creme_patissiere', 'curated_fr_eclairs_au_chocolat', 'curated_fr_ile_flottante', 'curated_fr_madeleines', 'curated_fr_mousse_au_chocolat', 'curated_fr_paris_brest', 'curated_it_arancini', 'curated_it_tiramisu', 'curated_mx_base_queso_fresco', 'curated_th_cha_manao', 'curated_th_cha_yen', 'curated_vegan_side_baked_tofu_lemon_dill', 'curated_vn_base_pa_te_gan']],
  ['chill', 3, ['curated_cn_lo_bak_go', 'curated_cn_xiao_long_bao', 'curated_de_kartoffelknodel', 'curated_fr_base_pate_feuilletee', 'curated_fr_creme_brulee', 'curated_mx_borrachitos', 'curated_th_khanom_tako', 'curated_vn_banh_chuoi_nuong', 'curated_vn_base_cha_lua']],
  ['chill', 4, ['curated_cn_mango_pudding', 'curated_dessert_mixed_berry_chia_pudding', 'curated_fr_creme_caramel', 'curated_fr_mousse_de_foies_de_volaille', 'curated_fr_pain_au_chocolat', 'curated_fr_tarte_au_citron', 'curated_it_panna_cotta', 'curated_mx_flan_napolitano', 'curated_snack_apricot_coconut_overnight_oats', 'curated_snack_fig_cashew_overnight_oats', 'curated_snack_fig_pistachio_overnight_oats', 'curated_snack_kiwi_coconut_chia_pudding', 'curated_snack_mango_coconut_chia_pudding', 'curated_snack_mango_pistachio_chia_pudding', 'curated_snack_nectarine_chia_pudding_cashews', 'curated_snack_overnight_oats_chia_berries', 'curated_snack_peach_almond_overnight_oats', 'curated_snack_plum_walnut_overnight_oats', 'curated_vegan_apricot_coconut_overnight_oats', 'curated_vegan_coconut_milk_chia_pudding_almond_butter_berries', 'curated_vegan_coconut_milk_overnight_oats_blueberry_flax', 'curated_vegan_fig_cashew_overnight_oats', 'curated_vegan_fig_pistachio_overnight_oats', 'curated_vegan_kiwi_coconut_chia_pudding', 'curated_vegan_mango_coconut_chia_pudding', 'curated_vegan_mango_pistachio_chia_pudding', 'curated_vegan_nectarine_chia_pudding_cashews', 'curated_vegan_overnight_oats_chia_berries', 'curated_vegan_peach_almond_overnight_oats', 'curated_vegan_plum_walnut_overnight_oats', 'curated_vn_banh_da_lon', 'curated_vn_banh_flan', 'curated_vn_che_ba_mau']],
  ['chill', 6, ['curated_mx_gelatina_de_mosaico', 'curated_vegan_date_cinnamon_overnight_oats', 'curated_vegan_pear_ginger_overnight_oats']],
  ['chill', 12, ['curated_cn_cha_ye_dan', 'curated_de_spekulatius', 'curated_de_zimtsterne', 'curated_dessert_vanilla_ice_cream', 'curated_fr_croissants', 'curated_fr_jambon_persille', 'curated_fr_pate_de_campagne', 'curated_it_base_brodo_di_carne', 'curated_it_base_gelato_fior_di_latte']],
  ['chill', 24, ['curated_cn_zui_ji', 'curated_fr_caneles', 'curated_fr_macarons', 'curated_mx_base_chiles_en_escabeche', 'curated_mx_base_chorizo']],
  ['cure', 8, ['curated_mx_base_longaniza']],
  ['cure', 36, ['curated_mx_base_jamon_cocido']],
  ['cure', 84, ['curated_fr_base_jarret_demi_sel', 'curated_fr_base_palette_demi_sel', 'curated_fr_base_travers_demi_sel']],
  ['cure', 96, ['curated_de_base_mettenden']],
  ['cure', 100, ['curated_de_bismarckhering']],
  ['cure', 132, ['curated_fr_base_poitrine_salee']],
  ['cure', 168, ['curated_cn_base_lap_cheong', 'curated_cn_base_lap_yuk']],
  ['cure', 288, ['curated_it_base_lardo']],
  ['cure', 672, ['curated_it_base_guanciale']],
  ['cure', 720, ['curated_cn_base_xian_dan_huang', 'curated_cn_base_xian_ya_dan']],
  ['drain', 3, ['curated_it_cannoli_siciliani', 'curated_it_gnudi']],
  ['drain', 12, ['curated_sauce_red_currant_jelly']],
  ['dry', 2, ['curated_it_taralli']],
  ['dry', 6, ['curated_it_porchetta', 'curated_mx_machaca']],
  ['dry', 12, ['curated_cn_siu_yuk', 'curated_cn_yan_ju_ji', 'curated_de_base_pinkel', 'curated_dessert_candied_lemon_peel', 'curated_dessert_candied_orange_peel', 'curated_fr_base_saucisse_de_montbeliard', 'curated_fr_base_saucisse_de_toulouse', 'curated_mx_camote_de_puebla', 'curated_mx_capirotada', 'curated_vn_banh_mi_thit']],
  ['dry', 24, ['curated_cn_beijing_kao_ya', 'curated_mx_base_chocolate_de_mesa']],
  ['dry', 72, ['curated_cn_base_chen_pi']],
  ['dry', 96, ['curated_th_base_chai_po']],
  ['ferment', 6, ['curated_ferment_amazake', 'curated_ferment_tarag_style']],
  ['ferment', 8, ['curated_ferment_plain_yogurt']],
  ['ferment', 12, ['curated_de_base_roggensauerteig', 'curated_ferment_milk_kefir']],
  ['ferment', 16, ['curated_fr_base_creme_fraiche_maison']],
  ['ferment', 24, ['curated_ferment_coconut_kefir', 'curated_ferment_coconut_palm_wine_style', 'curated_ferment_mabi', 'curated_ferment_water_kefir', 'curated_vn_dua_gia']],
  ['ferment', 48, ['curated_ferment_tepache', 'curated_ferment_tonic_elderberry_ginger_turmeric', 'curated_mx_tejuino', 'curated_mx_tepache']],
  ['ferment', 72, ['curated_cn_base_pao_cai', 'curated_ferment_boza', 'curated_ferment_burdock_dandelion_ale', 'curated_ferment_chicha', 'curated_ferment_ginger_beer_traditional', 'curated_ferment_ginger_bug_soda', 'curated_ferment_jun_tea', 'curated_ferment_kanji', 'curated_ferment_lemon_cheong', 'curated_ferment_sake_style_rice_wine', 'curated_ferment_shrub', 'curated_ferment_tonic_apple_pear', 'curated_ferment_tonic_blueberry_ginger_turmeric', 'curated_ferment_tonic_tart_cherry_ginger_turmeric', 'curated_vn_base_dua_cai_chua']],
  ['ferment', 96, ['curated_ferment_beet_kvass', 'curated_ferment_rejuvelac', 'curated_ferment_tonic_lemon_lime']],
  ['ferment', 114, ['curated_ferment_tonic_pomegranate_ginger_turmeric', 'curated_ferment_tonic_red_grape_ginger_turmeric']],
  ['ferment', 120, ['curated_cn_base_suan_dou_jiao', 'curated_ferment_tonic_blackberry_raspberry_ginger_turmeric']],
  ['ferment', 144, ['curated_ferment_puerh_style_tea', 'curated_ferment_tonic_cranberry_ginger_turmeric', 'curated_ferment_turmeric_drink']],
  ['ferment', 168, ['curated_ferment_kombucha', 'curated_ferment_makgeolli', 'curated_ferment_rye_style_kvass_quinoa']],
  ['ferment', 240, ['curated_ferment_maple_kombucha', 'curated_vn_base_cu_kieu']],
  ['ferment', 288, ['curated_ferment_tonic_hibiscus_ginger_turmeric']],
  ['ferment', 336, ['curated_cn_base_pao_jiao', 'curated_vn_base_me']],
  ['ferment', 360, ['curated_de_base_gewurzgurken']],
  ['ferment', 504, ['curated_ferment_sauerkraut']],
  ['ferment', 720, ['curated_ferment_fire_cider']],
  ['ferment', 1440, ['curated_cn_base_douchi']],
  ['freeze', 2, ['curated_cn_base_plain_congee', 'curated_cn_yu_pian_zhou', 'curated_vn_base_cha_hue']],
  ['freeze', 3, ['curated_it_granita_al_limone']],
  ['marinate', 2, ['curated_it_pollo_al_mattone', 'curated_it_zucchine_alla_scapece', 'curated_mx_pollo_asado', 'curated_th_gai_tod_hat_yai', 'curated_th_gai_yang', 'curated_th_moo_ping', 'curated_vn_com_tam_suon_nuong']],
  ['marinate', 3, ['curated_mx_cochinita_pibil']],
  ['marinate', 4, ['curated_mx_mixiote', 'curated_vegan_salad_mediterranean_chickpea_tofu']],
  ['marinate', 8, ['curated_cn_base_char_siu', 'curated_it_brasato_al_barolo']],
  ['marinate', 12, ['curated_fr_coq_au_vin', 'curated_fr_daube_provencale', 'curated_mx_birria', 'curated_mx_carne_al_pastor']],
  ['marinate', 24, ['curated_th_khao_moo_daeng']],
  ['marinate', 72, ['curated_de_sauerbraten']],
  ['rest', 2, ['curated_fr_base_pate_a_galettes', 'curated_vn_base_bo_kho']],
  ['rest', 3, ['curated_cn_base_spring_roll_wrappers', 'curated_it_caponata', 'curated_mx_base_recado_rojo']],
  ['rest', 12, ['curated_de_base_aachener_printen', 'curated_it_base_salsiccia']],
  ['rest', 14, ['curated_mx_base_crema']],
  ['rest', 16, ['curated_cn_base_dougan']],
  ['rest', 24, ['curated_mx_mazapan']],
  ['rest', 48, ['curated_de_base_mittelscharfer_senf', 'curated_th_base_sriracha']],
  ['rest', 168, ['curated_de_christstollen']],
  ['rise', 4, ['curated_fr_brioche']],
  ['rise', 8, ['curated_it_base_impasto_per_pizza_napoletana']],
  ['rise', 12, ['curated_de_roggenmischbrot']],
  ['rise', 18, ['curated_it_ciabatta', 'curated_it_focaccia_barese']],
  ['rise', 20, ['curated_it_pane_toscano']],
  ['salt', 12, ['curated_fr_confit_de_canard']],
  ['salt', 24, ['curated_mx_tasajo']],
  ['soak', 2, ['curated_fr_petit_sale_aux_lentilles', 'curated_side_stewed_lentils_carrot']],
  ['soak', 3, ['curated_vn_base_xoi_trang', 'curated_vn_xoi_gac']],
  ['soak', 4, ['curated_cn_base_xo_sauce', 'curated_th_base_khao_niao', 'curated_th_khao_niao_mamuang', 'curated_vn_xoi_man']],
  ['soak', 6, ['curated_cn_ba_bao_fan', 'curated_cn_base_steamed_glutinous_rice']],
  ['soak', 8, ['curated_mx_agua_de_horchata', 'curated_mx_base_nixtamal_masa']],
  ['soak', 12, ['curated_beverage_almond_milk', 'curated_cn_base_dou_sha', 'curated_cn_dou_jiang', 'curated_cn_hong_dou_tang', 'curated_cn_yue_bing', 'curated_cn_zongzi', 'curated_de_erbsensuppe', 'curated_ferment_sobia', 'curated_fr_base_moutarde_de_dijon', 'curated_fr_cassoulet', 'curated_fr_flageolets', 'curated_fr_garbure', 'curated_fr_soupe_au_pistou', 'curated_it_fagioli_alluccelletto', 'curated_it_minestrone', 'curated_it_pasta_e_ceci', 'curated_it_pasta_e_fagioli', 'curated_it_ribollita', 'curated_mx_barbacoa', 'curated_vn_sua_dau_nanh']],
  ['soak', 24, ['curated_fr_brandade_de_morue', 'curated_mx_bacalao_a_la_vizcaina']],
  ['soak', 48, ['curated_it_baccala_alla_vicentina']],
  ['stand', 4, ['curated_cn_liang_pi']],
  ['stand', 12, ['curated_de_base_pflaumenmus', 'curated_mx_tejate']],
  ['stand', 52, ['curated_de_base_quark']],
  ['stand', 72, ['curated_de_base_su_er_senf']],
];

let byId: Map<string, PrepLead> | null = null;

function leads(): Map<string, PrepLead> {
  if (!byId) {
    byId = new Map();
    for (const [kind, hours, ids] of PREP_TABLE) for (const id of ids) byId.set(id, { kind, hours });
  }
  return byId;
}

/** How far ahead a recipe in the app has to be started, or null when it does not. */
export function prepLeadFor(recipeId: string): PrepLead | null {
  return leads().get(recipeId) ?? null;
}

export function recipeIdsWithPrep(): string[] {
  return [...leads().keys()];
}
