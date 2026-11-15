// The exact sentence from a drug's FDA label that each curated interaction
// rule naming a prescription can be read beside (build plan A11b).
//
// Every sentence is copied word for word from the label named with it, as
// openFDA served that label on 2026-11-15; scripts/test_rule_label_sentences.js
// checks that every prescription rule is accounted for here, and with --live
// fetches each label again and checks the sentence is still in it.
//
// Many rules rest on research papers rather than the label (the rule's own
// citation says which), so the card shows the sentence as what the label says
// on the subject, never as the rule's source. A rule whose label is silent on
// its subject is listed in RULES_WITHOUT_LABEL_SENTENCE with the reason, so
// nothing is quoted that the label does not say.
//
// Kept in code rather than in assets/data/foods_reference.db, which is the live
// reference database and is not edited for this.

export type RuleLabelSentence = {
  ruleId: string;
  /** The drug the rule names, as the label search used it. */
  drug: string;
  setId: string;
  version: string;
  /** The label version's effective date, YYYY-MM-DD. */
  effective: string;
  labelName: string;
  maker: string;
  /** openFDA section key the sentence sits in (see LABEL_SECTIONS). */
  sectionKey: string;
  sentence: string;
};

/** The day these sentences were read from openFDA. */
export const LABEL_SENTENCES_READ_ON = '2026-11-15';

export const RULE_LABEL_SENTENCES: Readonly<Record<string, RuleLabelSentence>> = {
  levothyroxine_calcium_timing: {
    ruleId: 'levothyroxine_calcium_timing',
    drug: 'levothyroxine',
    setId: '1e11ad30-1041-4520-10b0-8f9d30d30fcc',
    version: '1537',
    effective: '2024-02-20',
    labelName: "Synthroid",
    maker: "AbbVie Inc.",
    sectionKey: 'information_for_patients',
    sentence:
      "Inform patients that agents such as iron and calcium supplements and antacids can decrease the absorption of levothyroxine.",
  },
  levothyroxine_iron_timing: {
    ruleId: 'levothyroxine_iron_timing',
    drug: 'levothyroxine',
    setId: '1e11ad30-1041-4520-10b0-8f9d30d30fcc',
    version: '1537',
    effective: '2024-02-20',
    labelName: "Synthroid",
    maker: "AbbVie Inc.",
    sectionKey: 'information_for_patients',
    sentence:
      "Inform patients that agents such as iron and calcium supplements and antacids can decrease the absorption of levothyroxine.",
  },
  levothyroxine_magnesium_timing: {
    ruleId: 'levothyroxine_magnesium_timing',
    drug: 'levothyroxine',
    setId: '1e11ad30-1041-4520-10b0-8f9d30d30fcc',
    version: '1537',
    effective: '2024-02-20',
    labelName: "Synthroid",
    maker: "AbbVie Inc.",
    sectionKey: 'drug_interactions',
    sentence:
      "Sucralfate, antacids and proton pump inhibitors may cause hypochlorhydria, affect intragastric pH, and reduce levothyroxine absorption.",
  },
  levothyroxine_elderly_lower_starting_dose: {
    ruleId: 'levothyroxine_elderly_lower_starting_dose',
    drug: 'levothyroxine',
    setId: '1e11ad30-1041-4520-10b0-8f9d30d30fcc',
    version: '1537',
    effective: '2024-02-20',
    labelName: "Synthroid",
    maker: "AbbVie Inc.",
    sectionKey: 'geriatric_use',
    sentence:
      "Because of the increased prevalence of cardiovascular disease among the elderly, initiate SYNTHROID at less than the full replacement dose",
  },
  vitamin_k2_warfarin_consistency: {
    ruleId: 'vitamin_k2_warfarin_consistency',
    drug: 'warfarin',
    setId: '19a69a72-ac5d-45d5-a94d-a5aaecbe4730',
    version: '14',
    effective: '2026-10-28',
    labelName: "Jantoven",
    maker: "Upsher-Smith Laboratories, LLC",
    sectionKey: 'drug_interactions',
    sentence:
      "Advise patients taking JANTOVEN to eat a normal, balanced diet maintaining a consistent amount of vitamin K.",
  },
  methotrexate_folate_interaction: {
    ruleId: 'methotrexate_folate_interaction',
    drug: 'methotrexate',
    setId: 'e942f8db-510f-44d6-acb5-b822196f5e8c',
    version: '14',
    effective: '2026-06-17',
    labelName: "Trexall",
    maker: "Teva Women's Health LLC",
    sectionKey: 'warnings_and_cautions',
    sentence:
      "Therefore, instruct patients not to take products containing folic acid or folinic acid unless directed to do so by their healthcare provider.",
  },
  methotrexate_adalimumab_infection_risk: {
    ruleId: 'methotrexate_adalimumab_infection_risk',
    drug: 'adalimumab',
    setId: '4977567e-3525-44ac-9ff5-f1e74b053950',
    version: '4',
    effective: '2025-12-23',
    labelName: "Humira",
    maker: "Cordavis Limited",
    sectionKey: 'warnings_and_cautions',
    sentence:
      "Patients 65 years of age and older, patients with co-morbid conditions and/or patients taking concomitant immunosuppressants (such as corticosteroids or methotrexate), may be at greater risk of infection.",
  },
  methotrexate_age70_toxicity_risk: {
    ruleId: 'methotrexate_age70_toxicity_risk',
    drug: 'methotrexate',
    setId: 'e942f8db-510f-44d6-acb5-b822196f5e8c',
    version: '14',
    effective: '2026-06-17',
    labelName: "Trexall",
    maker: "Teva Women's Health LLC",
    sectionKey: 'warnings_and_cautions',
    sentence:
      "Monitor renal function at baseline, periodically during treatment and as clinically indicated.",
  },
  acitretin_alcohol_avoidance: {
    ruleId: 'acitretin_alcohol_avoidance',
    drug: 'acitretin',
    setId: 'a6546625-acb8-460e-b34e-f795bfb3680a',
    version: '8',
    effective: '2026-08-05',
    labelName: "Acitretin",
    maker: "Sigmapharm Laboratories, LLC",
    sectionKey: 'spl_unclassified_section',
    sentence:
      "ethanol must not be ingested by female patients of childbearing potential either during treatment with acitretin or for 2 months after cessation of therapy.",
  },
  cyclosporine_grapefruit_avoidance: {
    ruleId: 'cyclosporine_grapefruit_avoidance',
    drug: 'cyclosporine',
    setId: '94461af3-11f1-4670-95d4-2965b9538ae3',
    version: '30',
    effective: '2026-08-10',
    labelName: "Neoral",
    maker: "Novartis Pharmaceuticals Corporation",
    sectionKey: 'drug_interactions',
    sentence:
      "Grapefruit and grapefruit juice affect metabolism, increasing blood concentrations of cyclosporine, thus should be avoided.",
  },
  methimazole_agranulocytosis_warning_signs: {
    ruleId: 'methimazole_agranulocytosis_warning_signs',
    drug: 'methimazole',
    setId: '06bb4bcc-5e47-48b6-a76c-648f846704e8',
    version: '2',
    effective: '2026-08-20',
    labelName: "Methimazole",
    maker: "AiPing Pharmaceutical, Inc.",
    sectionKey: 'warnings',
    sentence:
      "Patients should be instructed to immediately report to their physicians any symptoms suggestive of agranulocytosis, such as fever or sore throat.",
  },
  ptu_liver_injury_warning_signs: {
    ruleId: 'ptu_liver_injury_warning_signs',
    drug: 'propylthiouracil',
    setId: 'b0c23a2c-b250-4c0d-9b2a-c1483faa2ca0',
    version: '18',
    effective: '2026-08-25',
    labelName: "Propylthiouracil",
    maker: "Par Health USA, LLC",
    sectionKey: 'warnings',
    sentence:
      "Biochemical monitoring of liver function (bilirubin, alkaline phosphatase) and hepatocellular integrity (ALT, AST) is not expected to attenuate the risk of severe liver injury due to its rapid and unpredictable onset.",
  },
  insulin_alcohol_delayed_hypoglycemia: {
    ruleId: 'insulin_alcohol_delayed_hypoglycemia',
    drug: 'insulin lispro',
    setId: 'c8ecbd7a-0e22-4fc7-a503-faa58c1b6f3f',
    version: '87',
    effective: '2026-06-16',
    labelName: "Humalog",
    maker: "Eli Lilly and Company",
    sectionKey: 'drug_interactions',
    sentence:
      "Drugs that may increase or decrease the blood glucose lowering effect: alcohol, beta-blockers, clonidine, lithium salts, and pentamidine",
  },
  azathioprine_allopurinol_toxicity: {
    ruleId: 'azathioprine_allopurinol_toxicity',
    drug: 'azathioprine',
    setId: '4d62b6e4-a9d4-4818-e063-6394a90aa208',
    version: '1',
    effective: '2026-03-19',
    labelName: "Imuran",
    maker: "Legacy Pharma USA Inc.",
    sectionKey: 'drug_interactions',
    sentence:
      "Patients receiving IMURAN and allopurinol concomitantly should have a dose reduction of IMURAN, to approximately 1/ 3 to 1/ 4 the usual dose.",
  },
  azathioprine_adalimumab_infection_risk: {
    ruleId: 'azathioprine_adalimumab_infection_risk',
    drug: 'adalimumab',
    setId: '4977567e-3525-44ac-9ff5-f1e74b053950',
    version: '4',
    effective: '2025-12-23',
    labelName: "Humira",
    maker: "Cordavis Limited",
    sectionKey: 'warnings_and_cautions',
    sentence:
      "The potential risk with the combination of azathioprine or 6-mercaptopurine and HUMIRA should be carefully considered.",
  },
  allopurinol_azathioprine_toxicity: {
    ruleId: 'allopurinol_azathioprine_toxicity',
    drug: 'allopurinol',
    setId: '682dd8b8-fc6e-47c5-95b7-82d7ad96b750',
    version: '14',
    effective: '2026-11-05',
    labelName: "Allopurinol",
    maker: "Accord Healthcare Inc.",
    sectionKey: 'drug_interactions',
    sentence:
      "Concomitant use of allopurinol increases the exposure of either mercaptopurine or azathioprine which may increase the risk of their adverse reactions, including myelosuppression",
  },
  natalizumab_immunosuppressant_pml_caution: {
    ruleId: 'natalizumab_immunosuppressant_pml_caution',
    drug: 'natalizumab',
    setId: 'c5fdde91-1989-4dd2-9129-4f3323ea2962',
    version: '48',
    effective: '2026-10-09',
    labelName: "Tysabri",
    maker: "Biogen Inc.",
    sectionKey: 'indications_and_usage',
    sentence:
      "TYSABRI should not be used in combination with immunosuppressants (e.g., 6-mercaptopurine, azathioprine, cyclosporine, or methotrexate) or inhibitors of TNF-α",
  },
  dimethyl_fumarate_dietary_fat: {
    ruleId: 'dimethyl_fumarate_dietary_fat',
    drug: 'dimethyl fumarate',
    setId: '665d7e74-036c-5f68-5b67-ab84b9b49151',
    version: '56',
    effective: '2025-06-04',
    labelName: "Tecfidera",
    maker: "Biogen Inc.",
    sectionKey: 'dosage_and_administration',
    sentence:
      "The incidence of flushing may be reduced by administration of TECFIDERA with food.",
  },
  spironolactone_potassium_caution: {
    ruleId: 'spironolactone_potassium_caution',
    drug: 'spironolactone',
    setId: '0fed2822-3a03-4b64-9857-c682fcd462bc',
    version: '25',
    effective: '2025-11-28',
    labelName: "Aldactone",
    maker: "Pfizer Laboratories Div Pfizer Inc",
    sectionKey: 'drug_interactions',
    sentence:
      "Concomitant administration of ALDACTONE with potassium supplementation or drugs that can increase potassium may lead to severe hyperkalemia.",
  },
  ace_arb_potassium_monitoring: {
    ruleId: 'ace_arb_potassium_monitoring',
    drug: 'lisinopril',
    setId: '0e6364a4-6d66-4151-8197-d45e2a762895',
    version: '27',
    effective: '2026-07-21',
    labelName: "Lisinopril",
    maker: "Aurobindo Pharma Limited",
    sectionKey: 'warnings_and_cautions',
    sentence:
      "Serum potassium should be monitored periodically in patients receiving lisinopril.",
  },
  sulfonylurea_reduced_kidney_function_caution: {
    ruleId: 'sulfonylurea_reduced_kidney_function_caution',
    drug: 'glipizide',
    setId: '2110a7ca-3c1f-4db4-9211-65546b74533c',
    version: '1',
    effective: '2026-10-09',
    labelName: "Glipizide",
    maker: "AiPing Pharmaceutical, Inc.",
    sectionKey: 'precautions',
    sentence:
      "Renal or hepatic insufficiency may cause elevated blood levels of glipizide and the latter may also diminish gluconeogenic capacity, both of which increase the risk of serious hypoglycemic reactions.",
  },
  sumatriptan_ssri_serotonin_syndrome: {
    ruleId: 'sumatriptan_ssri_serotonin_syndrome',
    drug: 'sumatriptan',
    setId: '584abe73-8290-4484-ff8e-5890831c095e',
    version: '24',
    effective: '2025-12-09',
    labelName: "Imitrex",
    maker: "GlaxoSmithKline LLC",
    sectionKey: 'information_for_patients',
    sentence:
      "Caution patients about the risk of serotonin syndrome with the use of IMITREX tablets or other triptans, particularly during combined use with SSRIs, SNRIs, TCAs, and MAO inhibitors",
  },
  aspirin_ibuprofen_timing: {
    ruleId: 'aspirin_ibuprofen_timing',
    drug: 'ibuprofen',
    setId: '00872852-680a-41b3-901b-b991b12a176d',
    version: '6',
    effective: '2025-02-14',
    labelName: "Ibuprofen",
    maker: "Aurobindo Pharma Limited",
    sectionKey: 'clinical_pharmacology',
    sentence:
      "However, there was no interaction with the antiplatelet activity of aspirin when ibuprofen 400 mg, given once daily, was administered 2 hours after (but not concomitantly, 15 min, or 30 min after) the immediate-release aspirin dose",
  },
  atorvastatin_grapefruit_caution: {
    ruleId: 'atorvastatin_grapefruit_caution',
    drug: 'atorvastatin',
    setId: '4e06b20d-cc5d-46eb-991b-5972248de3af',
    version: '14',
    effective: '2026-11-06',
    labelName: "Atorvastatin Calcium",
    maker: "Accord Healthcare Inc.",
    sectionKey: 'drug_interactions',
    sentence:
      "Avoid intake of large quantities of grapefruit juice, more than 1.2 liters daily, when taking atorvastatin calcium tablets.",
  },
  colchicine_atorvastatin_myopathy: {
    ruleId: 'colchicine_atorvastatin_myopathy',
    drug: 'colchicine',
    setId: '85acf34c-06c6-40ea-95f4-060d5de99277',
    version: '6',
    effective: '2022-04-01',
    labelName: "Colchicine",
    maker: "Mylan Pharmaceuticals Inc.",
    sectionKey: 'warnings_and_cautions',
    sentence:
      "Concomitant use of atorvastatin, simvastatin, pravastatin, fluvastatin, lovastatin, gemfibrozil, fenofibrate, fenofibric acid or benzafibrate (themselves associated with myotoxicity) or cyclosporine with colchicine tablets may potentiate the development of myopathy",
  },
  nsaid_elderly_bleeding_risk: {
    ruleId: 'nsaid_elderly_bleeding_risk',
    drug: 'ibuprofen',
    setId: '00872852-680a-41b3-901b-b991b12a176d',
    version: '6',
    effective: '2025-02-14',
    labelName: "Ibuprofen",
    maker: "Aurobindo Pharma Limited",
    sectionKey: 'boxed_warning',
    sentence:
      "Elderly patients are at greater risk for serious gastrointestinal events",
  },
  ppi_longterm_elderly_fracture_risk: {
    ruleId: 'ppi_longterm_elderly_fracture_risk',
    drug: 'omeprazole',
    setId: '10f5502a-2e63-4f2a-a3ba-ddc5bd403051',
    version: '3',
    effective: '2025-12-22',
    labelName: "Omeprazole",
    maker: "Chartwell RX, LLC",
    sectionKey: 'warnings_and_cautions',
    sentence:
      "The risk of fracture was increased in patients who received high-dose, defined as multiple daily doses, and long-term PPI therapy (a year or longer).",
  },
  glyburide_elderly_hypoglycemia_beers: {
    ruleId: 'glyburide_elderly_hypoglycemia_beers',
    drug: 'glyburide',
    setId: '7e661288-2d24-4403-86a1-754afa1d04ff',
    version: '4',
    effective: '2026-11-05',
    labelName: "Glyburide",
    maker: "Chartwell RX, LLC",
    sectionKey: 'drug_interactions',
    sentence:
      "Elderly patients are particularly susceptible to the hypoglycemic action of glucose lowering drugs.",
  },
  lithium_elderly_renal_clearance: {
    ruleId: 'lithium_elderly_renal_clearance',
    drug: 'lithium',
    setId: '1b65d27e-5086-4a87-8387-c49f3d060978',
    version: '13',
    effective: '2026-01-30',
    labelName: "Lithium Carbonate",
    maker: "Glenmark Pharmaceuticals Inc., USA",
    sectionKey: 'dosage_and_administration',
    sentence:
      "Geriatric patients often respond to reduced dosage, and may exhibit signs of toxicity at serum concentrations ordinarily tolerated by other patients",
  },
  aspirin_pediatric_reyes_syndrome: {
    ruleId: 'aspirin_pediatric_reyes_syndrome',
    drug: 'aspirin',
    setId: '075b103e-0bb4-4b7a-ac0e-5645bcbd0a07',
    version: '8',
    effective: '2025-12-04',
    labelName: "Bayer Low Dose",
    maker: "Bayer HealthCare LLC.",
    sectionKey: 'warnings',
    sentence:
      "Children and teenagers who have or are recovering from chicken pox or flu-like symptoms should not use this product.",
  },
  radioactive_iodine_low_iodine_diet_prep: {
    ruleId: 'radioactive_iodine_low_iodine_diet_prep',
    drug: 'sodium iodide I-131',
    setId: '380e8e26-0625-4233-b36e-afb9f66e8a77',
    version: '10',
    effective: '2026-01-23',
    labelName: "Sodium Iodide I-131",
    maker: "Radnostix, Inc.",
    sectionKey: 'dosage_and_administration',
    sentence:
      "Instruct patients to maintain a low-iodide diet two weeks prior to radioiodide administration and continue for several days during the uptake or imaging process",
  },
};

/**
 * Prescription rules with no sentence, and why. The rule still stands on its
 * citation; the label simply does not speak to it.
 */
export const RULES_WITHOUT_LABEL_SENTENCE: Readonly<Record<string, string>> = {
  metformin_levothyroxine_tsh_interpretation:
    'The metformin labels say nothing about TSH or levothyroxine; the rule rests on published studies.',
  antithyroid_drug_iodine_efficacy:
    'The methimazole and propylthiouracil labels say nothing about iodine in food or supplements; the rule rests on published studies.',
  hydroxychloroquine_grapefruit_caution:
    'The hydroxychloroquine label names the enzymes it passes through but says nothing about grapefruit.',
  diphenhydramine_elderly_anticholinergic_risk:
    'The over-the-counter labels for diphenhydramine alone say nothing about age; the rule rests on the Beers Criteria.',
};

export function labelSentenceForRule(ruleId: string): RuleLabelSentence | null {
  return RULE_LABEL_SENTENCES[ruleId] ?? null;
}
