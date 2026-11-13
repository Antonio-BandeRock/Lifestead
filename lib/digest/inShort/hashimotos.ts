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
    'Tomatoes, peppers, eggplant and potatoes are dropped on the AIP diet. Proof that they harm people with autoimmune disease is weak. Testing how you respond is the fair way to find out.',
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
    "In a lupus trial, people who ate a probiotic yogurt had less disease. Lupus is not Hashimoto's, so this is a hint, not proof for the thyroid.",
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
    'Myo-inositol is a compound much like a vitamin. A 2024 review found it plus selenium cut TPO antibodies more than selenium alone. Only the pair was tested.',
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
    'Ranked by evidence, selenium with myo-inositol comes first. The two way risk of iodine is close. Black seed and ashwagandha sit in the middle, and folate is last.',
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
  'labs-bedtime-dosing':
    'Studies found that levothyroxine taken at bedtime, at least 3 hours after food, worked about as well as the morning dose. It is an option to discuss with your doctor.',
  'labs-breakfast-higher-dose':
    "In a 2026 trial of 88 people, levothyroxine taken with breakfast at a 15% higher dose gave the same thyroid levels as the fasting dose. Any change is your doctor's call.",
  'labs-combination-t3-ndt':
    'Some people still feel unwell on levothyroxine with normal labs. Trials found adding T3, or using pig thyroid, gave no clear gain on average over T4 alone.',
  'labs-drug-induced-thyroid-dysfunction':
    'Two common drugs can cause thyroid problems on their own. Amiodarone, a heart rhythm drug, does so in about 15 to 20% of users, and lithium can too.',
  'labs-checkpoint-inhibitor-thyroiditis':
    'Some cancer drugs take the brakes off the immune system. Thyroid swelling is their most common side effect, and the risk is higher if you have thyroid antibodies.',
  'labs-absorption-interferers-beyond-food':
    'Some medicines also block how much levothyroxine gets in. A few heartburn and cholesterol drugs are on the list. Your pharmacist can check yours.',
  'labs-timing-master-rule':
    'Calcium, iron, coffee, soy and high fiber meals all cut how much levothyroxine gets in. One steady gap between the dose and these covers nearly all of them.',
  'labs-age-adjusted-tsh-target-older-adults':
    'Normal TSH rises with age. Thyroid groups suggest a higher TSH target of 4 to 6 for people aged 70 to 80, to avoid giving too much hormone.',
  'lifestyle-alcohol-advisory':
    'Two large studies found that moderate drinking was not linked to new thyroid antibodies. The worries are about heavy drinking.',
  'lifestyle-edc-bpa-phthalates':
    'BPA and phthalates, found in some plastics and scented products, can disrupt hormones. Studies link them to changed thyroid levels, but how much daily exposure matters is not settled.',
  'lifestyle-sleep-circadian':
    'Poor sleep and shift work are linked to more inflammation and off rhythm stress hormones. These touch the same hormone paths as the thyroid.',
  'lifestyle-chronic-stress-hpa':
    "Long term stress throws off the body's stress hormone system. High cortisol then slows the change of T4 into the active thyroid hormone, T3.",
  'lifestyle-il6-deiodinase':
    'Inflammation can lower active thyroid hormone another way too. An immune signal called IL-6 slows the enzymes that turn T4 into T3.',
  'lifestyle-synbiotic-il6-vijay-2025':
    'In a six week trial of 104 adults, kefir plus fiber lowered IL-6, an inflammation signal. Fiber alone and omega-3 alone did not lower it as much.',
  'lifestyle-smoking-paradox':
    "Smoking raises the risk of Graves' disease but is linked to lower risk of Hashimoto's. This is a finding, not a reason to smoke, given its many other harms.",
  'lifestyle-environmental-goitrogens-water':
    'Perchlorate, an industrial chemical found in some groundwater, blocks iodine from entering the thyroid. It works the same way as nitrate from food.',
  'lifestyle-air-pollution':
    'Some studies link long term exposure to fine air pollution with higher autoimmune risk. This research is young and less settled than most here.',
  'lifestyle-nsaids-gut':
    'Taking pain pills like ibuprofen, naproxen or aspirin often makes the gut lining leakier. This is well known, and it is apart from their ulcer risk.',
  'lifestyle-ebv-viral-trigger':
    "One study found signs of the virus behind mono, Epstein-Barr, in 80.7% of Hashimoto's thyroid tissue samples. That is a strong link, but not proof it causes the disease.",
  'lifestyle-covid19-thyroid-trigger':
    'A review found 20 cases of new or returning autoimmune thyroid disease after COVID-19. It is uncommon, and most cases settled.',
  'lifestyle-sleep-apnea':
    'Sleep apnea, where breathing stops during sleep, shows up more often with thyroid problems. Why is still unclear, and studies disagree.',
  'lifestyle-tying-together':
    'Across alcohol, stress, sleep and hard exercise, one hormone keeps showing up. Cortisol slows the change of T4 into active T3 in each of them.',
  'lifestyle-global-iodine-china-regional':
    'China added iodine to salt nationwide and tracked people for 25 years. Autoimmune thyroid disease rose step by step as iodine intake rose.',
  'lifestyle-global-selenium-china-belt':
    'A band of soil low in selenium runs across China. People there may have more thyroid autoimmunity, but that is a guess from other research, not a measured fact.',
  'mito-mots-c':
    "MOTS-c is a small protein made by the cell's power units. In 90 people with Hashimoto's, it was lower than in 90 people without it, and lower still with more antibodies.",
  'mito-il23-autophagy-suppression':
    "In lab work on thyroid cells, an immune signal called IL-23 blocked the cells' cleanup process. Blocking three points in its path each reversed the damage.",
  'mito-mtor-cd4-reprogramming':
    'The same cell pathway that slows thyroid cell cleanup also changes how the attacking immune cells get their fuel. Both sides of the disease share it.',
  'mito-fasting-autophagy-tension':
    'Fasting sets off cell cleanup, but it also lowers active thyroid hormone. Short, mild fasts may balance the two better than long ones.',
  'mito-ramadan-fasting-study':
    'Studies of Ramadan fasting in people on thyroid pills found TSH shifted. Fasting also upset the usual empty stomach timing of the dose.',
  'mito-visceral-fat-treg-depletion':
    "Tregs are immune cells that stop the body from attacking itself. In Hashimoto's, they were found to be low in the deep fat around the organs.",
  'mito-visceral-fat-treg-reinfusion':
    "In mice with a Hashimoto's model, putting healthy Tregs back helped the body use insulin better. The cells went back to the belly fat on their own.",
  'mito-hashimotos-leptin-elevated':
    "Leptin is a hormone made by fat. It ran higher in untreated Hashimoto's than in healthy people, and fell once treatment brought thyroid levels back to normal.",
  'mito-levothyroxine-body-fat-null':
    "Hashimoto's is linked to weight gain. Yet studies found that levothyroxine alone did little to change body fat, even once hormone levels were fixed.",
  'mito-visceral-fat-endotoxin-barrier':
    'A 2024 paper argues that belly fat swelling may partly guard the body from germ toxins leaking from the gut. It is an idea, not yet proven.',
  'mito-exercise-cortisol':
    'Very hard exercise can push cortisol up a lot. High cortisol slows the change of T4 into active T3, which is why gentler exercise is often suggested.',
  'mito-tying-together':
    'This research ends in two trade offs, not a simple rule. Fasting helps cell cleanup but lowers thyroid hormone, and belly fat may both harm and protect.',
  'other-why-cross-disease-evidence':
    'Seven autoimmune diseases attack very different parts of the body. Yet research finds similar gut changes in each, which is why they are grouped here.',
  'other-rheumatoid-arthritis':
    "In rheumatoid arthritis, people with less vitamin D tend to have worse disease. As in Hashimoto's, no one knows yet if taking it helps.",
  'other-ibd':
    "In Crohn's and colitis, doctors can see the gut heal on camera. That makes diet trials in these diseases some of the clearest gut evidence there is.",
  'other-multiple-sclerosis':
    'In MS, less vitamin D also goes with more flares. Trials have not shown yet whether taking it helps.',
  'other-type1-diabetes':
    'Research links how a baby is fed, and early antibiotics, to later risk of type 1 diabetes. These are links, not proof of cause.',
  'other-lupus':
    'In lupus, one named gut germ was seen loosening the gut lining. In a trial in people, a probiotic yogurt also eased the disease.',
  'other-sjogrens':
    "Sjögren's mostly causes dry eyes and a dry mouth. Studies still found gut bacteria changes in people with it, though this evidence is early.",
  'other-psoriasis':
    'Psoriasis is a skin disease linked with belly fat swelling. A small group of people with it react to gluten, and for them, cutting it out helped.',
  'other-tying-together':
    'Seven autoimmune diseases share three threads. Immune balance tips toward attack, the gut lining leaks, and the gut bacteria shift.',
  'healing-stage-map':
    'The app groups healing into three food stages, laid over a five stage plan from one practitioner. That plan is not standard medical advice.',
  'healing-stage1-eat':
    'The stage 1 food list is short on purpose. Each food is easy on the gut and low in triggers, so changes in how you feel are easier to read.',
  'healing-stage1-bone-broth':
    'Bone broth holds building blocks linked to gut lining repair. The amount varies a lot by recipe, so it is one helpful food, not a cure.',
  'healing-stage1-avoid':
    'Each food left out in stage 1 has a stated reason. Gluten, dairy and gassy foods like onion and beans are the main ones.',
  'healing-stage1-fermented-exclusion':
    'Most fermented foods wait until later because they are high in histamine. Stage 1 keeps histamine low while the gut settles.',
  'healing-stage1-milestones':
    'Moving on from stage 1 uses clear markers. These include 2 to 4 steady weeks of symptoms and a log of what you ate and how you felt.',
  'healing-stage2-reintroduction':
    'Stage 2 brings foods back one at a time, in a set order, lowest risk first. Each food gets a few days of watching before the next one.',
  'healing-stage2-fermented-entry':
    'Stage 2 is where fermented foods come back, on purpose. A simple home ferment with one known strain comes first.',
  'healing-stage2-fiber-expansion':
    'In stage 2, fiber is added when things are calm, not during a flare. Cooked or puréed sources come first, and raw ones follow as you confirm you handle them.',
  'healing-stage2-milestones':
    'Moving on from stage 2 needs a growing list of foods you handle well. It also waits out the 12 to 24 weeks gut lining repair can take.',
  'healing-stage3-what-it-looks-like':
    "Well healed does not mean cured, since Hashimoto's has no cure. It means checkable signs, like antibodies trending down over a year or more.",
  'healing-stage3-practical-shifts':
    'In stage 3, daily logging can become an occasional check. The goal was always to learn your patterns, not to log forever.',
  'healing-tension-detox-myth':
    'No research shows a separate detox phase on an elimination diet. Early changes in how you feel are more likely the body adjusting to new food.',
  'healing-tying-together':
    'The three stages move at the pace your records show, not on a calendar. Each stage has checkpoints, and logging is what shows where you are.',
  'organ-liver-t4t3-conversion':
    'Only about 20% of active thyroid hormone, T3, comes from the thyroid itself. The rest is made from T4 elsewhere in the body, and the liver does the largest share.',
  'organ-liver-hashimotos-damage':
    'Up to 55% of people with untreated low thyroid show raised liver enzymes. Low thyroid hormone makes liver cells leakier, so the enzymes spill into the blood.',
  'organ-liver-nafld-link':
    'A large UK study found people with low thyroid had 1.68 times the odds of fatty liver disease. This is a measured link across many people.',
  'organ-liver-fixing-helps-thyroid':
    'The liver and thyroid affect each other both ways. Studies found that cutting liver fat went with better inflammation markers and thyroid markers.',
  'organ-liver-autoimmune-overlap':
    "Hashimoto's shows up with autoimmune liver diseases more often than chance. This is uncommon, but it is a direct immune attack on the liver.",
  'organ-cardiovascular':
    "A large national study found a higher risk of heart disease in people with Hashimoto's. Treating low thyroid lowers some of that risk.",
  'organ-brain-cognitive':
    'Brain fog with low thyroid is a measured problem. Research finds it mostly hurts recalling memories, and depression does not explain it.',
  'organ-brain-neurogenesis-thyroid-mechanism':
    'Low thyroid that starts in adulthood slows the growth of new brain cells in a memory area. This reverses once thyroid levels are back to normal.',
  'organ-kidney':
    'In a study of 74,356 adults, kidney filtering dropped step by step as thyroid function worsened. Much of this improves with treatment.',
  'organ-reproductive-fertility':
    'With thyroid antibodies, the risk of losing a pregnancy or of an early birth is 2 to 4 times higher. In several studies, hormone pills alone did not lower it.',
  'organ-adrenal-aps2':
    "At times a second immune attack hits the glands that make cortisol. Hashimoto's plus this attack has a name, APS-2.",
  'organ-musculoskeletal':
    'Muscle weakness, aches and stiffness show up in 30 to 80% of people with low thyroid. In reported cases, thyroid treatment cleared them.',
  'organ-skin-hair':
    'Thyroid hormone fuels growing hair roots. With low thyroid, hair can thin and turn dry, and skin can feel cool and pale.',
  'organ-overtreatment-bone-heart-risk':
    'Too much thyroid hormone carries risks too. A TSH below range went with more irregular heartbeat and bone breaks, which is why doses are checked with labs.',
  'organ-primary-thyroid-lymphoma':
    "Long term Hashimoto's carries a small added risk of thyroid lymphoma, about 0.5% of cases. A thyroid that was stable for years and starts to grow is worth showing a doctor.",
  'organ-tying-together':
    'Thyroid hormone sets the pace of the body almost everywhere. So low thyroid hits many organs at once, and most of these effects go away with treatment.',
  'organ-brain-depression-anxiety-euthyroid':
    "A review of 11 studies found more low mood and worry with Hashimoto's. This held even when thyroid levels were normal on treatment.",
  'history-1912-first-description':
    'In 1912, a surgeon in Japan named Hakaru Hashimoto first described the disease. He saw immune cells packed into thyroid tissue from four people.',
  'history-1924-iodized-salt':
    'Around the US Great Lakes, up to 100% of schoolchildren once had goiter, a swollen thyroid from too little iodine. Iodized salt, added by choice in 1924, fixed it.',
  'history-1956-autoimmune-mechanism':
    "Doctors once thought the body could not attack itself. In 1956, a team found antibodies to a thyroid protein in Hashimoto's, and that proved it can.",
  'history-1960s-tsh-testing':
    'The first blood test for TSH came in 1965. For about two decades it was the main tool for finding and managing low thyroid.',
  'history-1985-tpo-identified':
    "In 1985, the target of the main Hashimoto's antibody was identified as TPO. TPO is the enzyme the thyroid uses to make hormone.",
  'history-desiccated-to-levothyroxine':
    'For over 70 years, low thyroid was treated with dried animal thyroid. As late as 1965, about 80% of US thyroid prescriptions were still this kind.',
  'history-genetic-era':
    "Hashimoto's was long known to run in families. The first full gene scan for it came only in 2018, and genes explain only part of the risk.",
  'history-desiccated-thyroid-standardization':
    'Dried thyroid pills varied in strength, which helped push doctors to the synthetic pill. After 1985 their strength became more even, but by then levothyroxine was standard.',
  'history-whickham-progression-rate':
    'A 20 year study followed 2,779 adults. Women with both a high TSH and thyroid antibodies had 38 times the odds of developing low thyroid as women with neither.',
  'history-heritability-family-risk':
    'A study of over 110,000 twins found genes explain a large share of who gets thyroid and other gland autoimmune diseases. The share ranged from 60% to 97% across them.',
  'history-tying-together':
    "Each step in today's care had to be found first. The disease was described in 1912, autoimmunity proven in 1956, and the main antibody named in 1985.",
  'horizon-hashimotos':
    'Current treatment replaces lost hormone but does not calm the immune attack. Stem cell therapy is being studied for that, but it is early and not an available treatment.',
  'horizon-hashimotos-fmt':
    "Trials are now testing whether moving gut bacteria from a healthy donor can help Hashimoto's. There are no results yet, so it is not known if it works.",
  'interaction-selenium-iodine':
    'The thyroid needs both selenium and iodine. But taking selenium while low in iodine can make the iodine shortage worse, so iodine is checked first.',
  'foodhistory-timeline-modern-surge':
    'A common sign of autoimmunity rose in the US from 1988 to 2012. A UK study of 22 million people found some autoimmune diseases rose more than others.',
  'foodhistory-mechanism-gut-barrier':
    "Some additives in ultra processed food thin the gut's protective mucus. This is one proposed path from changes in food to changes in the immune system.",
  'foodhistory-mechanism-soil-nutrients-bridge':
    'Selenium and iodine both come from the soil, and both matter for the thyroid. Worn out farm soil can hold less of them, which links soil health to thyroid health.',
  'bigpicture-the-morning-dose':
    'Levothyroxine goes down with plain water, and coffee waits. One study found coffee taken with the dose cut absorption by more than a quarter.',
  'bigpicture-breakfast-plate':
    'Breakfast choices each have a reason. Spinach is cooked to tame a compound that affects the thyroid, and lemon helps the body take in iron from the eggs.',
  'bigpicture-what-the-gut-is-doing':
    'The bacteria in homemade yogurt each do certain jobs. Some help repair the gut lining, and others help train the immune system to stay calm.',
  'bigpicture-the-body-beyond-thyroid':
    'An afternoon energy crash may not be the thyroid alone. Low zinc, iron or B12, or the liver, can each cause the same tiredness.',
  'bigpicture-the-glass-of-wine':
    'A glass of wine is a two sided question. Moderate drinking was not linked to new thyroid antibodies, and the worries come with heavier drinking.',
  'bigpicture-the-longer-arc':
    'Small daily food choices tie back to 150 years of change. Flour, for one, went from whole stone ground grain to a stripped, thin version by the 1880s.',
  'bigpicture-the-actual-point':
    'All this research is meant to take work off your day, not add to it. The aim is that good habits are already set, so eating stops feeling like a project.',
  'advocacy-core-thyroid-panel':
    'A thyroid check is often just TSH. Free T4 and free T3 show how much usable hormone you have, so it is worth asking for all three.',
  'advocacy-thyroid-antibodies':
    "TSH shows the thyroid is not keeping up, and antibodies show why. Two antibody tests, TPO and Tg, are what confirm Hashimoto's.",
  'advocacy-reverse-t3':
    'Reverse T3 is on many alternative thyroid panels, but mainstream doctors disagree on its use. It has no agreed range tied to a treatment choice.',
  'advocacy-iron-ferritin':
    'Low iron causes many of the same symptoms as low thyroid. A review of ten studies found low iron went with lower thyroid hormone, so a full iron panel is worth asking for.',
  'advocacy-vitamin-d':
    'Low vitamin D is common with autoimmune thyroid disease. It is a number you can have checked, rather than a supplement to guess at.',
  'advocacy-b12-folate':
    'One study found 28% of people with autoimmune thyroid disease had low B12. In about a third of them, the immune system was attacking the stomach cells that absorb it.',
  'advocacy-selenium-testing':
    "Selenium has the strongest evidence of any supplement for Hashimoto's. Yet most standard labs do not test for it, so a test may take asking.",
  'advocacy-cmp':
    'The liver and kidneys do thyroid related work. A comprehensive metabolic panel, one standard blood test, checks both.',
  'advocacy-lipid-panel':
    'Thyroid hormone helps the liver clear cholesterol. In a 6 month trial, treating mild low thyroid cut total and LDL cholesterol.',
  'advocacy-a1c-glucose':
    "Hashimoto's and type 1 diabetes show up together more than chance would predict. That is why a blood sugar check, such as an A1c, is a related test.",
  'advocacy-cortisol-testing':
    "Adrenal fatigue is not a medical diagnosis. Mail order spit tests for it are not standard care. A doctor's cortisol test looks for named conditions like APS-2.",
  'advocacy-elimination-protocol-exception':
    'Starting an elimination diet is a good reason to test sooner than usual. A test before, then one at 8 to 12 weeks, can show if anything changed.',
  'advocacy-tsh-optimal-range-debate':
    'A TSH inside the lab range is not read the same way by every doctor. Some experts argue the standard upper limit is set too high, and this is still debated.',
  'advocacy-seronegative-hashimotos':
    "Some people have Hashimoto's but test negative for both antibodies. One study of children found this in 12.3% of cases, and these cases tend to be milder.",
  'advocacy-fibromyalgia-thyroid-overlap':
    "Fibromyalgia and Hashimoto's share pain, fatigue and brain fog. Thyroid antibodies turn up more in people with fibromyalgia. So it is worth checking for both.",
  'advocacy-tying-together':
    'Get a full set of baseline labs at least once. Recheck what changed after about 6 to 12 weeks, and once stable, most tests every 6 to 12 months.',
  'pregnancy-tsh-target':
    "In pregnancy, guidance sets a lower TSH target, below 2.5, for people treated for low thyroid. The baby's brain depends on the parent's thyroid hormone early on.",
  'pregnancy-postpartum-thyroiditis':
    'After a birth, the immune system wakes back up and can swell the thyroid. A study of over 4,000 women found this in 3.9% of pregnancies.',
  'pregnancy-breastfeeding-safety':
    'Guidance finds levothyroxine safe while breastfeeding, with no harm seen in babies. T4 is already a normal part of breast milk.',
  'pregnancy-iodine-needs':
    "Pregnancy raises iodine needs, since the baby relies on the parent's iodine. Too much can still trigger thyroid flares, so both sides matter more.",
  'pregnancy-tying-together':
    'Pregnancy changes several thyroid rules for a time. The TSH target drops, iodine needs rise, and thyroiditis can start after birth.',
  'complementary-chiropractic':
    "A search found no published studies at all on chiropractic care for Hashimoto's. That means it is unstudied, not proven to fail.",
  'complementary-acupuncture':
    "A trial of acupuncture for Hashimoto's was registered in 2021. No results have been found yet, so whether it helps is unknown.",
  'complementary-acupressure':
    "Acupressure eased fatigue in trials of other long term illnesses. It has not been tested in Hashimoto's, so this evidence is borrowed.",
  'complementary-massage-cortisol':
    'Massage is often said to lower cortisol. A large review found the studies disagree, so the claim is not settled.',
  'complementary-heat-sauna':
    'In Finnish men, using a sauna 4 to 7 times a week went with 63% lower risk of sudden heart death. This is one group with set habits, so it may not apply to everyone.',
  'complementary-cold-exposure':
    'In one trial, people trained in breathing, meditation and cold water had a calmer immune response to a lab challenge. Cold alone was not tested.',
  'complementary-tying-together':
    'Of these methods, sauna has the strongest numbers and chiropractic has none. Exercise has more relevant evidence than any of them.',
  'pregnancy-thyroid-offspring-neurodevelopment':
    'Low thyroid in pregnancy went with a slightly higher chance of ADHD or autism in the child. Most children had neither, and when treated well, the autism link did not hold.',
  'labs-magnesium-levothyroxine-timing':
    'A 2025 trial found one form of magnesium cut levothyroxine absorption by 12%. Another form cut it by 7%, which was not a clear effect.',
  'nutrient-magnesium-thyroid-connection':
    'A 2024 review lists magnesium among the nutrients that affect thyroid hormone. How it works is less mapped than for iodine or selenium.',
};
