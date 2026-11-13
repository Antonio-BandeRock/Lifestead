// In short lines for the hashimotos reading, keyed by entry id. Grade 8 or
// under, checked by scripts/test_in_short.js. Spanish lives in the reading
// table (lib/translations/es/reading-*.ts) like every other reading line.
export const LINES: Readonly<Record<string, string>> = {
  'glossary-aip':
    'AIP stands for Autoimmune Protocol. It is a diet that drops many foods for about six weeks, then adds them back one by one to find what bothers you.',
  'glossary-alt-ast':
    'ALT and AST are two liver enzymes on a standard blood panel. Low thyroid on its own can make them read high.',
  'glossary-aps2':
    'APS-2 is a mix of two gland problems. It is an autoimmune thyroid or other gland disease plus an immune attack on the adrenal glands.',
  'glossary-autoimmune-disease':
    'In an autoimmune disease, the immune system attacks part of the body by mistake. Its job is to defend the body, but it misreads its target.',
  'glossary-autophagy-mitophagy':
    "Autophagy is how a cell breaks down and recycles worn out parts. Mitophagy is the same cleanup for the cell's power units, and inflammation can slow both.",
  'glossary-d1-d6':
    'The 6 Dimensions of Food Friendliness is how the app scores each food. It rates six separate factors, each drawn from research.',
  'glossary-euthyroid-hypothyroid':
    'Euthyroid means the thyroid works normally. Hypothyroid means hormone is clearly low. Subclinical means TSH is high but hormone is still in range.',
  'glossary-healing-stages':
    "The app's healing stages are three food steps: Getting Started, Rebuilding and Well Healed. They guide food choices and do not hide or block anything.",
  'glossary-il6-il23-tnf':
    "IL-6, IL-23 and TNF alpha are three signals the immune system uses to drive inflammation. Each shows up in Hashimoto's research.",
  'glossary-levothyroxine':
    'Levothyroxine is a lab made form of the thyroid hormone T4, given in exact doses. It has been the standard treatment for low thyroid since the 1970s.',
  'glossary-molecular-mimicry':
    'Some germs look a lot like a part of the body. Molecular mimicry is when the immune system, trained to fight the germ, attacks that body part too.',
  'glossary-mots-c':
    "MOTS-c is a small protein made by the cell's power units. One study found it lower in people with Hashimoto's.",
  'glossary-tg-antitg':
    "Thyroglobulin is a protein the thyroid uses to make and store hormone. Anti-Tg antibodies attack it. They are one of two antibodies tracked in Hashimoto's.",
  'glossary-th17':
    'Th17 cells are immune cells that drive inflammation. Research keeps looking at their balance with calming immune cells called Tregs.',
  'glossary-tpo':
    "TPO is the enzyme the thyroid uses to make hormone. TPO antibodies are the immune system attacking it, and they are the main lab value in Hashimoto's.",
  'glossary-wolff-chaikoff':
    "The thyroid briefly slows hormone making when it gets a sudden flood of iodine. In Hashimoto's, this safety brake can fail to let go.",
  'glossary-ndt':
    'NDT is thyroid hormone made from dried pig thyroid, with both T4 and T3. It is an option beside levothyroxine, and the evidence comparing them is mixed.',
  'additive-nitrates-nitrites':
    'Nitrates and nitrites keep cured meats pink. They can compete with iodine for uptake by the thyroid, and processed meat is classed as a cause of cancer.',
  'problem-gluten-grains':
    'Wheat, barley and rye hold gluten. Part of gluten can loosen the gut lining, which is one reason it is the most common food removed for autoimmune thyroid disease.',
  'problem-raw-cruciferous':
    'Large amounts of raw broccoli, cabbage or kale can get in the way of iodine use by the thyroid. Cooking cuts this effect a lot, so the advice is to cook, not avoid.',
  'problem-nightshades':
    'Tomatoes, peppers, eggplant and potatoes are dropped on the AIP diet. Proof that they harm people with autoimmune disease is weak. Testing your own response is the honest path.',
  'problem-high-histamine':
    'Aged cheese, cured meats, ferments and old leftovers are high in histamine. Some people, more often with autoimmune disease, clear it poorly, though the evidence is limited.',
  'problem-sugar-sweetened-beverages':
    'Sugary drinks deliver sugar fast, with no fiber to slow it. The concern is drinking sugar, not sugar in food as a whole.',
  'problem-soy':
    'Soy can slow the enzyme the thyroid uses to make hormone. In one trial, risk rose only in people whose thyroid was already a little low, not in everyone.',
  'problem-coffee-timing':
    'Coffee taken with levothyroxine cut how much of the dose the body absorbed. Ask your doctor or pharmacist how long to wait between them.',
  'problem-excess-iodine-kelp':
    "Kelp and other sea vegetables can hold huge amounts of iodine per serving. For many people with Hashimoto's, too much iodine can make things worse, not better.",
  'problem-gluten-free-without-celiac':
    'A 2025 review of three small trials found going gluten free without celiac lowered one thyroid antibody but raised the other. Thyroid levels did not change, so this is not settled.',
  'gut-scfa-treg':
    'Gut bacteria turn fiber into short chain fatty acids. These act as signals that help calm the immune system, and eating fiber feeds this process.',
  'gut-zonulin-gliadin':
    'Leaky gut has a known cause in the body. Part of gluten triggers a protein called zonulin, which loosens the seals between gut cells, and this can reverse.',
  'gut-blautia-lupus-zonulin':
    "In lupus research, one gut bacterium was shown to loosen the gut lining directly. It is not Hashimoto's research, but it backs the wider gut and autoimmune link.",
  'gut-glutamine-null-result':
    'L-glutamine is the most suggested supplement for leaky gut. A review of 10 trials found it did not improve gut leakiness overall.',
  'gut-vitamin-d-cldn2':
    "Lab work found vitamin D directly controls a gene for one of the seals between gut cells. That may matter for Hashimoto's apart from its mixed effect on antibodies.",
  'gut-zinc-carnosine':
    'Zinc carnosine is zinc bound to a small protein piece. In one trial, it fully blocked the gut leakiness caused by common pain pills like ibuprofen.',
  'gut-strain-specific-mechanisms':
    'Probiotics are not all alike. Different strains repair different parts of the seals between gut cells, so the strain name matters.',
  'gut-4r-protocol':
    'The 4R plan removes triggers, adds digestive help, adds probiotics and repairs the gut lining. Each piece has some support, but the full plan has never been tested.',
  'gut-zonulin-timeline':
    "In diet trials, a marker of gut leakiness called zonulin dropped within about 8 to 12 weeks. These are group averages, so one person's pace may differ.",
  'gut-larazotide':
    'Larazotide is a drug made to block zonulin, and it reached late stage trials for celiac disease. It eased symptoms but did not improve the measured gut leakiness.',
  'gut-fiber-hashimotos-microbiota':
    "One small study gave people with Hashimoto's more fiber and measured their gut bacteria. It is one of the few gut studies done in Hashimoto's itself.",
  'gut-aip-ibd-rct':
    "The strongest trial of the AIP diet was in Crohn's and colitis, not Hashimoto's. Gut swelling seen on a scope and quality of life both improved.",
  'gut-probiotic-yogurt-lupus-rct':
    "In a trial in lupus, people who ate a probiotic yogurt had less disease activity than those who did not. It is a different disease, not Hashimoto's.",
  'gut-th17-treg-imbalance':
    'Many unrelated autoimmune diseases share one pattern. Cells that drive inflammation outweigh the cells that calm the immune system.',
  'gut-molecular-mimicry':
    'Some gut germs have proteins that look like thyroid proteins. Immune cells trained against the germ may then attack the thyroid, which is why the gut is studied here.',
  'gut-leaky-gut-contested':
    'A leaky gut lining can be measured in the lab. Leaky gut as a diagnosis is still debated in medicine.',
  'gut-tying-together':
    "Nearly every gut entry here comes back to one thing: how tightly the gut lining keeps things out. That lining is the body's first line of defense.",
  'nutrient-selenium':
    'Across 21 trials, selenium lowered TPO antibodies over 3 to 6 months. A stricter review rated the studies at risk of bias, so the result is strong but not final.',
  'nutrient-myo-inositol':
    'Myo-inositol is a vitamin like compound. A 2024 review found selenium plus myo-inositol lowered TPO antibodies more than selenium alone, and only the pair was tested.',
  'nutrient-iodine':
    'The thyroid needs iodine to make hormone, so too little is a problem. Too much can also set off thyroid trouble in people prone to it.',
  'nutrient-vitamin-d':
    'People with more vitamin D tend to have lower thyroid antibodies. Trials giving vitamin D have not shown a clear effect, so the picture is mixed.',
  'nutrient-zinc-iron-b12':
    'Low zinc, iron or B12 can cause tiredness, thin hair and brain fog, just like low thyroid. Symptoms alone cannot tell them apart, but blood tests can.',
  'nutrient-folate-antioxidants':
    'Folate and vitamins C, E and A have been linked to thyroid antibodies in some studies. These are links from observing people, not trials, so the evidence is thin.',
  'nutrient-nigella-sativa':
    "Black seed is a spice. In an 8 week trial of 40 people with Hashimoto's, it lowered TSH and TPO antibodies, and a second trial found better blood fats.",
  'nutrient-ashwagandha':
    'In one 8 week trial of 50 people with a slightly low thyroid, ashwagandha improved TSH, T3 and T4. Since it raises thyroid hormone, it is a concern with an overactive thyroid.',
  'nutrient-iodine-supplement-caution':
    'Iodine pills sold for thyroid support can deliver a large dose all at once. That carries the same risk as kelp for people prone to thyroid flares, or more.',
  'nutrient-tying-together':
    "Ranked by evidence, selenium with myo-inositol comes first, with iodine's two way risk close behind. Black seed and ashwagandha sit in the middle, and folate sits last.",
  'nutrients-fermented-drinks-hashimotos':
    "The app's tart cherry, ginger and turmeric tonic was built around gut repair, joint pain and sleep. It is a recipe, not a treatment.",
  'hashimoto-circadian-clock-disruption':
    'Thyroid tissue in autoimmune thyroid disease showed body clock genes out of rhythm. In mice, upsetting the clock made inflammation worse, and this is early work.',
  'labs-biotin-interference':
    'Biotin, common in hair and nail pills, can throw off many thyroid lab tests. It can make results look abnormal when the thyroid is fine.',
  'labs-calcium-iron-absorption':
    'Calcium and iron bind to levothyroxine in the gut and cut how much is absorbed. Standard guidance is to keep them at least 4 hours apart.',
  'labs-grapefruit-juice':
    'Grapefruit juice affects many drugs. With levothyroxine, a trial found only a 9% drop in absorption, and TSH stayed about the same.',
  'labs-tsh-diurnal-timing':
    'TSH rises and falls over the day, highest late at night and early morning. That is why the blood draw is asked for in the morning, fasting.',
};
