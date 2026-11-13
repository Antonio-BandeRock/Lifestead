import type { DigestEntry } from './types';

// Mouth & Teeth, Health Literacy (Basic Health), added 2026-11-04.
//
// Direct request: "If we don't have anything about how having a healthy
// mouth of teeth can improve your health, we need some of that kind of
// information too, and why having a healthy mouth is beneficial."
//
// Before this, oral health appeared only inside four conditions (type 1
// and type 2 diabetes, rheumatoid arthritis, Sjögren's). This file is the
// general half anybody can read, and it links to those condition entries
// rather than repeating them.
//
// Every citation was read against its abstract or source page before it
// was written, through the NCBI E-utilities for the PubMed records. Several
// findings do not flatter the "healthy mouth, healthy body" story (the AHA
// finding no proof that gum treatment prevents heart disease, the Cochrane
// review finding no clear effect of gum treatment in pregnancy on preterm
// birth, the failed gingipain drug trial, the weak evidence on tooth loss
// and diet), and each is reported at its tier, because the strong findings
// stand without help from the weak ones.

export const ORAL_HEALTH_ENTRIES: DigestEntry[] = [
  {
    id: 'oral-why-a-healthy-mouth-matters',
    category: 'basicHealth',
    title: 'Mouth Disease Affects 3.7 Billion People, and Its Clearest Reach Into the Body Is Blood Sugar',
    teaser:
      'The mouth is where eating starts, it holds one of the body\'s largest communities of bacteria, and what goes wrong there reaches blood sugar, the lungs and possibly the heart.',
    summary:
      "Oral diseases are the most common health conditions in the world. The World Health Organization estimates they affect nearly 3.7 billion people, with more than a billion cases of severe gum disease. Most of what a healthy mouth gives back is plain and certain: teeth that let a person chew vegetables, nuts and meat, no pain, sleep that is not broken by a toothache, and a smile a person is not hiding.\n\nThe wider claim, that a healthy mouth protects the rest of the body, holds up unevenly. It is strongest for diabetes, where gum disease and blood sugar worsen each other and treating the gums lowers HbA1c in randomized trials. It is moderate for pneumonia in frail older people, where oral care may lower deaths from pneumonia. For the heart, for pregnancy and for Alzheimer's disease, gum disease travels with worse outcomes, but treating it has not yet been shown to change them. The entries in this topic take each of those in turn, at the strength of evidence behind it, and then cover what keeps a mouth healthy, which is cheaper and better studied than almost anything else in health.",
    citations: [
      {
        source: 'World Health Organization: Oral health fact sheet (17 March 2025)',
        url: 'https://www.who.int/news-room/fact-sheets/detail/oral-health',
      },
      {
        source:
          'Kassebaum NJ, Bernabé E, Dahiya M, et al. 2014: Global burden of severe periodontitis in 1990-2010: a systematic review and meta-regression (J Dent Res 93(11):1045-53)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25261053/',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'oral-body-diabetes-treatment-lowers-a1c',
      'oral-body-heart-association',
      'oral-body-pneumonia-older-adults',
      'oral-care-fluoride-toothpaste',
    ],
  },
  {
    id: 'oral-mouth-living-ecosystem',
    category: 'basicHealth',
    title: 'The Mouth Holds More Than 600 Kinds of Bacteria, and Most of Them Keep It Healthy',
    teaser:
      'A healthy mouth holds a balanced community of bacteria living on the teeth, gums, tongue and cheeks, and keeping that balance is what keeps it healthy.',
    summary:
      "The Human Oral Microbiome Database, the first curated catalogue of any human microbiome, counted more than 600 prevalent species living in the mouth, with different communities on the teeth, in the groove where gum meets tooth, on the tongue, the cheeks, the palate and the tonsils. Most of them are harmless or useful: they crowd out organisms that cause disease, help break food down, and, as another entry in this topic describes, turn nitrate from vegetables into a molecule that relaxes blood vessels.\n\nGum disease and tooth decay are not simply infections by an outside germ. They happen when the balance in that community shifts: sugar eaten often feeds the acid-making species that dissolve enamel, and plaque left at the gumline lets the species that inflame gums take over. This is why daily care works by disturbing plaque and limiting what feeds the harmful species, rather than trying to kill everything. It is the same idea as tending the gut: look after the community, and it looks after the mouth.",
    citations: [
      {
        source:
          'Dewhirst FE, Chen T, Izard J, et al. 2010: The human oral microbiome (J Bacteriol 192(19):5002-17)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20656903/',
      },
    ],
    overallTier: 'strong',
    relatedIds: ['oral-nitrate-bacteria-blood-pressure', 'oral-decay-sugar-frequency', 'oral-saliva-protects-teeth'],
  },
  {
    id: 'oral-saliva-protects-teeth',
    category: 'basicHealth',
    title: 'Saliva Rebuilds Enamel and Keeps Germs in Check, Which Is Why a Dry Mouth Decays',
    teaser:
      'Saliva carries the calcium and phosphate teeth are made of, washes away food, and helps control the germs that cause decay and thrush.',
    summary:
      "Saliva does far more than wet food. It carries calcium and phosphate, the minerals enamel is made of, and puts them back into the surface of the teeth after acid from food and bacteria has drawn them out. It dilutes and washes away sugar, it neutralizes acid, and it carries proteins that keep germs in check. The National Institute of Dental and Craniofacial Research states that a dry mouth raises the risk of tooth decay and of fungal infections in the mouth for exactly this reason.\n\nChewing makes more saliva, which is one reason sugar-free gum after a meal is a common piece of advice, and why products containing xylitol may help against cavities. Anything that lowers saliva, from medicines to Sjögren's to breathing through the mouth at night, changes the odds for the teeth, and is worth telling a dentist about.",
    citations: [
      {
        source: 'National Institute of Dental and Craniofacial Research: Dry Mouth',
        url: 'https://www.nidcr.nih.gov/health-info/dry-mouth',
      },
    ],
    overallTier: 'strong',
    relatedIds: ['oral-care-dry-mouth-medicines', 'sjogrens-xylitol-saliva-stimulation', 'type1-dental-caries-salivary-mechanism'],
  },
  {
    id: 'oral-nitrate-bacteria-blood-pressure',
    category: 'basicHealth',
    title: 'Mouth Bacteria Help Set Blood Pressure, and a Week of Antiseptic Mouthwash Raised It',
    teaser:
      'Bacteria on the tongue turn nitrate from leafy greens and beets into nitrite, which the body uses to relax blood vessels. Killing them raised blood pressure within a day.',
    summary:
      "Nitrate from vegetables such as spinach, lettuce, rocket and beetroot is taken out of the blood by the salivary glands and concentrated in saliva. Bacteria on the back of the tongue then turn it into nitrite, which the body converts into nitric oxide, a molecule that relaxes blood vessels. A 2013 study at Queen Mary University of London measured what happens when those bacteria are suppressed. Nineteen healthy volunteers had a normal week, then a week of rinsing with a chlorhexidine antiseptic mouthwash.\n\nThe mouthwash cut the mouth's nitrite production by 90 percent and blood nitrite by 25 percent, and systolic and diastolic blood pressure rose by 2 to 3.5 mmHg, starting within a day and lasting the whole week. It was a small, short study in healthy people, so it shows a mechanism rather than a risk to anyone's health, but it is a clear example of mouth bacteria doing something useful for the whole body, and a reason not to rinse with a strong antiseptic every day unless a dentist has asked for it.",
    citations: [
      {
        source:
          'Kapil V, Haydar SM, Pearl V, et al. 2013: Physiological role for nitrate-reducing oral bacteria in blood pressure control (Free Radic Biol Med 55:93-100)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/23183324/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['oral-mouth-living-ecosystem', 'oral-care-rinses-and-oil-pulling', 'prostate-dietary-nitrate-vascular-plausibility'],
  },
  {
    id: 'oral-gum-disease-how-common',
    category: 'basicHealth',
    title: 'Four in Ten American Adults Over 30 Have Gum Disease, Usually Without Pain',
    teaser:
      'Gingivitis is inflamed gums that bleed and can heal completely. Periodontitis is the next stage, where the bone and tissue holding the teeth are lost.',
    summary:
      "Gum disease comes in two stages. Gingivitis is inflammation of the gums from plaque at the gumline: they look red or swollen and bleed when brushed, and it reverses fully once the plaque is cleaned away regularly. Periodontitis is what can follow when it is not: the inflammation reaches the tissue and bone holding the tooth in place, pockets open between gum and tooth, and over years teeth loosen and can be lost. A national survey of US adults from 2009 to 2014, using full-mouth examinations, found that 42 percent of adults with teeth aged 30 and over had periodontitis, and 7.8 percent had it severely.\n\nSevere periodontitis was most common in people over 65, in smokers, and among Mexican American and Black adults. Worldwide, severe periodontitis was the sixth most common condition of any kind in the Global Burden of Disease estimates, peaking in new cases around age 38. The NHS lists bleeding when brushing, flossing or eating hard food, red and swollen gums, bad breath, shrinking gums and loose teeth as the signs. It is mostly painless until late, which is why a check-up finds it before a person does.",
    citations: [
      {
        source:
          'Eke PI, Thornton-Evans GO, Wei L, et al. 2018: Periodontitis in US Adults: National Health and Nutrition Examination Survey 2009-2014 (J Am Dent Assoc 149(7):576-588)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29957185/',
      },
      {
        source:
          'Kassebaum NJ, Bernabé E, Dahiya M, et al. 2014: Global burden of severe periodontitis in 1990-2010 (J Dent Res 93(11):1045-53)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25261053/',
      },
      {
        source: 'NHS: Gum disease',
        url: 'https://www.nhs.uk/conditions/gum-disease/',
      },
    ],
    overallTier: 'strong',
    relatedIds: ['oral-care-signs-to-see-dentist', 'oral-care-cleaning-between', 'oral-body-diabetes-treatment-lowers-a1c'],
  },
  {
    id: 'oral-decay-sugar-frequency',
    category: 'basicHealth',
    title: 'Sugar Causes Tooth Decay, and Fewer Sugary Moments a Day Protects Teeth',
    teaser:
      'The review behind the World Health Organization\'s sugar guideline found that decay is lower when free sugars stay under 10 percent of daily energy.',
    summary:
      "Tooth decay happens when acid-making bacteria in plaque ferment sugar and the acid dissolves enamel faster than saliva can put the minerals back. When the World Health Organization updated its sugar guideline, it commissioned a systematic review of the link with decay. Of 55 eligible studies, 42 of 50 in children and all 5 in adults found at least one positive association between sugar and decay. There was moderate-quality evidence that decay is lower when free sugars stay under 10 percent of daily energy, and a link at the stricter 5 percent line, though that evidence was judged very low quality.\n\nFree sugars are those added to food plus the sugar in honey, syrups and fruit juice, not the sugar inside whole fruit. Each time sugar is eaten, the mouth turns acid for a while, so sipping a sweet drink through an afternoon does more harm than the same sugar taken with a meal. Cooking mostly from whole foods, which this app is built around, already keeps free sugar low, which is one way better food and better teeth turn out to be the same project.",
    citations: [
      {
        source:
          'Moynihan PJ, Kelly SA. 2014: Effect on caries of restricting sugars intake: systematic review to inform WHO guidelines (J Dent Res 93(1):8-18)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24323509/',
      },
    ],
    overallTier: 'strong',
    relatedIds: ['oral-mouth-living-ecosystem', 'oral-care-fluoride-toothpaste', 'oral-saliva-protects-teeth'],
  },
  {
    id: 'oral-body-diabetes-treatment-lowers-a1c',
    category: 'basicHealth',
    title: 'Treating Gum Disease Lowers Blood Sugar in People With Diabetes by About 0.4 Percent',
    teaser:
      'A 2022 Cochrane review of 35 trials found that a deep clean below the gumline lowered HbA1c by a clinically meaningful amount, and said more trials are unlikely to change that.',
    summary:
      "This is the best-proven link between the mouth and the rest of the body. Gum disease and diabetes worsen each other: high blood sugar makes gums more prone to inflammation and slower to heal, and inflamed gums add to the body-wide inflammation that makes blood sugar harder to control. The question that matters is whether treating the gums helps, and a 2022 Cochrane review answered it with 35 randomized trials and 3,249 people, almost all with type 2 diabetes. The treatment was subgingival instrumentation, the professional cleaning below the gumline often called scaling and root planing.\n\nCompared with no treatment or usual care, it lowered HbA1c by 0.43 percentage points three to four months later and by 0.30 points at six months, with moderate certainty. For comparison, that is in the range of what adding a second diabetes medicine is often expected to do. The authors concluded that further trials are unlikely to change the conclusion. Anyone with diabetes has a strong reason to have their gums checked, and the NHS names diabetes as one reason to keep up regular dental visits.",
    citations: [
      {
        source:
          'Simpson TC, Clarkson JE, Worthington HV, et al. 2022: Treatment of periodontitis for glycaemic control in people with diabetes mellitus (Cochrane Database Syst Rev 4:CD004714)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/35420698/',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'type2-periodontal-disease-bidirectional',
      'type1-periodontal-disease-bidirectional-real-data',
      'oral-gum-disease-how-common',
    ],
  },
  {
    id: 'oral-body-heart-association',
    category: 'basicHealth',
    title: 'Gum Disease Goes With Heart Disease, but Treating Gums Has Not Been Shown to Prevent Heart Attacks',
    teaser:
      'The American Heart Association found the link holds even after accounting for smoking and diabetes, and found no evidence yet that gum treatment changes heart outcomes.',
    summary:
      "The idea that a bad mouth harms the heart is more than a century old, and it is often repeated as settled. In 2012 the American Heart Association reviewed the evidence in a scientific statement. Gum disease and hardened arteries share several causes, including smoking, age and diabetes, which makes it hard to tell whether one drives the other.\n\nThe statement found that observational studies do support a link between the two that survives adjustment for those shared causes. It found they do not show that gum disease causes heart disease. And while treating gum disease lowered inflammation markers and improved how blood vessels behave in short studies, there was no evidence that it prevents heart attacks or strokes or changes what happens to people who have them. The statement also noted that claims of heart protection from gum treatment were often promoted by professional and industry groups. Treating gum disease is worth doing for the mouth, and for diabetes. For the heart, the link is there and the proof of benefit is not yet.",
    citations: [
      {
        source:
          'Lockhart PB, Bolger AF, Papapanou PN, et al. 2012: Periodontal disease and atherosclerotic vascular disease: does the evidence support an independent association? A scientific statement from the American Heart Association (Circulation 125(20):2520-44)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22514251/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['oral-why-a-healthy-mouth-matters', 'oral-body-diabetes-treatment-lowers-a1c'],
  },
  {
    id: 'oral-body-pregnancy',
    category: 'basicHealth',
    title: 'Gums Worsen in Pregnancy, and Treating Them May Help Birth Weight but Has Not Changed Preterm Birth',
    teaser:
      'A Cochrane review of 15 trials and 7,161 pregnant women found no clear difference in preterm birth, and low-quality evidence of fewer babies born under 2.5 kg.',
    summary:
      "Gum conditions tend to get worse during pregnancy, and observational studies suggested that gum disease went with earlier births and smaller babies. A 2017 Cochrane review gathered the randomized trials: 15 of them, 7,161 pregnant women, nearly all with periodontitis, comparing gum treatment during pregnancy with no treatment. There was no clear difference in births before 37 weeks.\n\nThere was low-quality evidence that treatment may reduce babies born under 2,500 grams, from 12.6 percent to 9.7 percent. Every trial was at high risk of bias, and nothing harmful to mothers was reported. So a dental check during pregnancy is sensible, and the NHS advises it, because the gums need the care and treatment appeared safe, but treating gums is not a proven way to prevent an early birth.",
    citations: [
      {
        source:
          'Iheozor-Ejiofor Z, Middleton P, Esposito M, Glenny AM. 2017: Treating periodontal disease for preventing adverse birth outcomes in pregnant women (Cochrane Database Syst Rev 6:CD005297)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28605006/',
      },
      {
        source: 'NHS: Gum disease',
        url: 'https://www.nhs.uk/conditions/gum-disease/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['oral-gum-disease-how-common', 'oral-body-heart-association'],
  },
  {
    id: 'oral-body-pneumonia-older-adults',
    category: 'basicHealth',
    title: 'For People in Nursing Homes, Professional Mouth Care May Lower Deaths From Pneumonia',
    teaser:
      'Pneumonia in frail older people often starts with bacteria from the mouth breathed into the lungs. Trials of better mouth care show a possible drop in pneumonia deaths.',
    summary:
      "Pneumonia is one of the most common infections in nursing homes and the deadliest, and much of it is thought to come from bacteria in the mouth and throat being breathed into the lungs, more so when someone cannot clean their teeth or dentures well. A 2022 Cochrane review found six randomized trials with 6,244 residents in Japan, the United States and France, all comparing professional mouth care with usual, self-done care. The evidence on how often pneumonia happened was inconclusive.\n\nTwo trials together found that professional care may lower deaths from pneumonia over two years (risk ratio 0.43), though with low certainty, and another large trial did not find a difference at 18 months. No trial compared mouth care with none at all, which would not be ethical. For anyone caring for a frail parent or partner, this makes daily cleaning of their teeth or dentures a small, cheap task with a reasonable chance of mattering a great deal.",
    citations: [
      {
        source:
          'Cao Y, Liu C, Lin J, et al. 2022: Oral care measures for preventing nursing home-acquired pneumonia (Cochrane Database Syst Rev 11:CD012416)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36383760/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['oral-why-a-healthy-mouth-matters', 'oral-care-cleaning-between'],
  },
  {
    id: 'oral-body-gut-and-autoimmune',
    category: 'basicHealth',
    title: 'Mouth Bacteria That Reach the Gut Can Drive Inflammation, and One Gum Germ Is Tied to Rheumatoid Arthritis',
    teaser:
      'In mice, mouth bacteria that settled in the gut set off inflammation. In people, the gum germ P. gingivalis can make the altered proteins that rheumatoid arthritis reacts against.',
    summary:
      "A person swallows saliva all day, and with it a steady stream of mouth bacteria. Most do not survive the stomach or settle in the gut, but some can, and a 2017 study in Science showed what that can mean. Researchers at Keio University found that Klebsiella strains taken from human saliva, when they settled in the intestines of germ-free mice, set off a strong inflammatory immune response, and they were more likely to settle when the gut's usual bacteria had been disturbed, for example by antibiotics.\n\nMouth bacteria turning up in the gut had already been seen in people with inflammatory bowel disease. This was mouse work, so it shows a route rather than a cause in people. The rheumatoid arthritis link is better developed: Porphyromonas gingivalis, a leading cause of gum disease, carries an enzyme that alters proteins in the same way the immune system reacts against in rheumatoid arthritis, and that story is told in full in the rheumatoid arthritis entries. For anyone with an autoimmune condition, it is one more reason to keep gums healthy, as part of looking after the whole body, without expecting it to settle the condition.",
    citations: [
      {
        source:
          'Atarashi K, Suda W, Luo C, et al. 2017: Ectopic colonization of oral bacteria in the intestine drives TH1 cell induction and inflammation (Science 358(6361):359-365)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29051379/',
      },
    ],
    overallTier: 'weak',
    relatedIds: ['ra-periodontal-disease-pgingivalis', 'oral-mouth-living-ecosystem', 'sjogrens-oral-candidiasis-risk'],
  },
  {
    id: 'oral-body-alzheimers-hypothesis',
    category: 'basicHealth',
    title: 'A Gum Germ Was Found in Alzheimer\'s Brains, and the Drug Built on That Failed Its Main Trial',
    teaser:
      'P. gingivalis and its toxic enzymes were found in the brains of people with Alzheimer\'s disease. A drug blocking those enzymes did not slow the disease overall.',
    summary:
      "In 2019 a team led by researchers at the company Cortexyme reported in Science Advances that Porphyromonas gingivalis, the bacterium at the centre of chronic gum disease, and its toxic enzymes called gingipains were present in the brains of people who had died with Alzheimer's disease, at levels that tracked the disease's protein damage. In mice, gum infection with the bacterium reached the brain and raised production of amyloid, and a drug blocking gingipains reduced the damage. That made a testable prediction, and the company tested it.\n\nThe GAIN trial gave the drug, atuzaginstat, to 643 people with mild to moderate Alzheimer's, and in October 2021 it did not meet either of its main measures of memory and daily function across the whole group. A smaller group with the bacterium in their saliva showed a trend that did not reach significance. The bacterium in the brain is an observation that still needs explaining. It has not become a way to prevent or treat Alzheimer's, and nobody should read gum care as protection against dementia, though there are plenty of other reasons for it.",
    citations: [
      {
        source:
          'Dominy SS, Lynch C, Ermini F, et al. 2019: Porphyromonas gingivalis in Alzheimer\'s disease brains: evidence for disease causation and treatment with small-molecule inhibitors (Sci Adv 5(1):eaau3333)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30746447/',
      },
      {
        source: 'BioSpace 2021: Cortexyme puts positive spin on disappointing Phase III Alzheimer\'s results',
        url: 'https://www.biospace.com/cortexyme-puts-positive-spin-on-disappointing-phase-iii-alzheimer-s-results',
      },
    ],
    overallTier: 'weak',
    relatedIds: ['oral-body-heart-association', 'body-brain-nervous-system', 'mind-risk-lancet-fourteen'],
  },
  {
    id: 'oral-body-teeth-and-eating',
    category: 'basicHealth',
    title: 'Losing Teeth Changes What Is Easy to Chew, but Studies Have Not Shown a Clear Effect on Nutrition',
    teaser:
      'It seems obvious that fewer teeth means a worse diet. A systematic review of long-term studies found the evidence weak and the results inconsistent.',
    summary:
      "Raw vegetables, nuts, seeds, apples and meat all take good teeth to chew, and people with missing teeth or painful dentures often say they avoid them. It would follow that tooth loss pushes a diet toward soft, processed food and worse nutrition. A 2017 systematic review from King's College London looked for long-term studies that followed adults as they lost teeth. It found only eight, from the United States, Japan, Australia and Brazil.\n\nMost found some association with diet or nutrition, but the findings contradicted each other, the only consistent one was an odd result about dietary cholesterol, and the overall quality was weak. The authors concluded there is no strong evidence yet either way. That does not mean teeth do not matter for eating; it means the studies have not measured it well. For a person who has trouble chewing, what to do is practical: tell the dentist, and use cooking methods such as grating, steaming and blending that keep vegetables and protein in the diet, instead of letting them drop out.",
    citations: [
      {
        source:
          'Gaewkhiew P, Sabbah W, Bernabé E. 2017: Does tooth loss affect dietary intake and nutritional status? A systematic review of longitudinal studies (J Dent 67:1-8)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29097121/',
      },
    ],
    overallTier: 'weak',
    relatedIds: ['oral-why-a-healthy-mouth-matters', 'body-bones-teeth-skeleton'],
  },
  {
    id: 'oral-care-fluoride-toothpaste',
    category: 'basicHealth',
    title: 'Brushing With Fluoride Toothpaste Is the Best-Proven Way to Prevent Tooth Decay',
    teaser:
      'A Cochrane review of 96 trials found that toothpaste with 1,000 to 1,500 ppm fluoride reduces decay in children and adults, with high-certainty evidence in children.',
    summary:
      "Of everything a person can do at home for their teeth, brushing with fluoride toothpaste has the strongest evidence. A 2019 Cochrane review covered 96 trials from 1955 to 2014. In children and teenagers, toothpaste with 1,000 to 1,500 parts per million of fluoride reduced decay compared with toothpaste without fluoride, with high to moderate certainty, and the 1,450 to 1,500 ppm range did slightly better than 1,000 to 1,250. In adults, 1,000 to 1,100 ppm toothpaste reduced decay with moderate certainty.\n\nFluoride works on the surface of the teeth, helping enamel take back minerals and resist acid, which is why the NHS advice is to brush twice a day and spit out afterward without rinsing, leaving the fluoride on the teeth. Young children need a smaller amount, a smear or a pea-sized dab, because swallowing a lot while teeth are forming can mark them. A toothpaste without fluoride can still clean, but the trials show it does not protect against decay the same way.",
    citations: [
      {
        source:
          'Walsh T, Worthington HV, Glenny AM, et al. 2019: Fluoride toothpastes of different concentrations for preventing dental caries (Cochrane Database Syst Rev 3:CD007868)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30829399/',
      },
      {
        source: 'NHS: Gum disease (prevention advice)',
        url: 'https://www.nhs.uk/conditions/gum-disease/',
      },
    ],
    overallTier: 'strong',
    relatedIds: ['oral-care-water-fluoridation', 'oral-decay-sugar-frequency', 'oral-care-cleaning-between'],
  },
  {
    id: 'oral-care-water-fluoridation',
    category: 'basicHealth',
    title: 'Water Fluoridation Does Less Today Than When It Began, Because Most Fluoride Now Comes From Toothpaste',
    teaser:
      'A 2024 Cochrane review found the benefit of fluoridated water since 1975 is about a quarter of a tooth per child, and the US toxicology program found concern only at levels twice the US standard.',
    summary:
      "Adding fluoride to public water began in the 1940s, when almost nobody used fluoride toothpaste, and the early studies found large drops in decay. A 2024 Cochrane review asked what it does now. Looking only at studies from after 1975, when fluoride toothpaste had become common, starting water fluoridation reduced decay in children's baby teeth by about a quarter of a tooth, and the estimate included the possibility of no benefit at all, with low certainty.\n\nAbout 12 percent of people in fluoridated areas had visible marks on their teeth from fluoride (fluorosis) that they found noticeable. Separately, the US National Toxicology Program concluded in 2024, with moderate confidence, that higher fluoride exposure, at drinking water levels above 1.5 mg/L, is associated with lower IQ in children, and found too little data to say anything about the 0.7 mg/L used in US public water.\n\nTaken together: the benefit of fluoride is mostly on the surface of the teeth, toothpaste delivers that reliably, and the case for water fluoridation is weaker than it once was, while the evidence of harm applies to higher levels than the US standard. Reasonable people weigh that differently, and the numbers above are what there is to weigh.",
    citations: [
      {
        source:
          'Iheozor-Ejiofor Z, et al. 2024: Water fluoridation for the prevention of dental caries (Cochrane Database Syst Rev, CD010856.pub3)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/39362658/',
      },
      {
        source:
          'National Toxicology Program 2024: NTP monograph on the state of the science concerning fluoride exposure and neurodevelopment and cognition',
        url: 'https://ntp.niehs.nih.gov/whatwestudy/assessments/noncancer/completed/fluoride',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['oral-care-fluoride-toothpaste'],
  },
  {
    id: 'oral-care-cleaning-between',
    category: 'basicHealth',
    title: 'Cleaning Between the Teeth Helps the Gums, With Interdental Brushes Doing at Least as Well as Floss',
    teaser:
      'A Cochrane review of 35 trials found that floss or interdental brushes added to brushing may reduce gum inflammation, though the evidence is low certainty.',
    summary:
      "A toothbrush cleans the outer and inner surfaces of the teeth, but plaque between them is where gum disease and decay often start. A 2019 Cochrane review gathered 35 trials with 3,929 adults comparing brushing alone with brushing plus a device for cleaning between the teeth. Flossing on top of brushing may reduce gum inflammation at one, three and six months, with low certainty. Interdental brushes, the small bottle-brush shaped ones, may reduce gum inflammation and plaque, with low to very low certainty, and in head-to-head trials did at least as well as floss. Water flossers may reduce gum inflammation in the short term only.\n\nThe evidence is weak mostly because these trials are short and the people in them often had healthy gums to begin with, not because cleaning between teeth was found useless. The NHS advises cleaning between the teeth daily with floss or interdental brushes. The best device is the one a person will use every day, and for many people with gaps between their teeth that is an interdental brush.",
    citations: [
      {
        source:
          'Worthington HV, MacDonald L, Poklepovic Pericic T, et al. 2019: Home use of interdental cleaning devices, in addition to toothbrushing, for preventing and controlling periodontal diseases and dental caries (Cochrane Database Syst Rev 4:CD012018)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30968949/',
      },
      {
        source: 'NHS: Gum disease (prevention advice)',
        url: 'https://www.nhs.uk/conditions/gum-disease/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['oral-care-fluoride-toothpaste', 'oral-gum-disease-how-common'],
  },
  {
    id: 'oral-care-rinses-and-oil-pulling',
    category: 'basicHealth',
    title: 'Oil Pulling and Herbal Rinses May Help a Little With Plaque, Beside Brushing, Not in Place of It',
    teaser:
      'Reviews of small trials found oil pulling and herbal plaque agents reduced plaque and gum inflammation somewhat, with very low-quality evidence. Strong antiseptic rinses have a cost too.',
    summary:
      "Oil pulling, swishing a spoonful of sesame or coconut oil around the mouth for several minutes, comes from Ayurvedic practice. A 2023 meta-analysis of 25 trials and 1,184 people found that it improved a measure of gum inflammation compared with ordinary mouthwashes other than chlorhexidine, while chlorhexidine reduced plaque more than oil pulling did. The trials were short, 7 to 45 days, and the overall quality of the evidence was very low.\n\nAnother 2023 review of 41 trials of Ayurvedic and herbal plaque agents, including oil pulling and triphala, found they did about as well as the comparison products at reducing plaque, and its authors suggested them as an addition to ordinary care. Chlorhexidine, the strongest antiseptic rinse, works, but it stains teeth with long use and, as another entry in this topic describes, wipes out the mouth bacteria that help keep blood pressure down. So a gentle approach that works with the mouth's bacteria fits the evidence well: brush and clean between the teeth, which no rinse replaces, and treat oil pulling or a herbal rinse as an extra if a person likes them, with a strong antiseptic kept for when a dentist prescribes it.",
    citations: [
      {
        source:
          'Jong FJX, Ooi J, Teoh SL. 2024: The effect of oil pulling in comparison with chlorhexidine and other mouthwash interventions in promoting oral health: a systematic review and meta-analysis (Int J Dent Hyg 22(1):78-94)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/37635453/',
      },
      {
        source:
          'Javed D, Dixit AK, Anwar S, et al. 2023: Ayurvedic and herbal plaque control agents in gingivitis: a systematic review and meta-analysis of randomized controlled trials (J Educ Health Promot 12:378)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/38144032/',
      },
    ],
    overallTier: 'weak',
    relatedIds: ['oral-nitrate-bacteria-blood-pressure', 'oral-care-cleaning-between', 'oral-mouth-living-ecosystem'],
  },
  {
    id: 'oral-care-vitamin-c-bleeding-gums',
    category: 'basicHealth',
    title: 'Gums That Bleed Easily Can Be a Sign of Too Little Vitamin C, Even Without Scurvy',
    teaser:
      'A review of 15 trials found that vitamin C reduced gum bleeding in people whose blood levels were low, at levels the current recommendation counts as enough.',
    summary:
      "Bleeding gums were one of the first signs of scurvy that sailors learned to fear, and the recommended daily amount of vitamin C was set to prevent scurvy. A 2021 systematic review by researchers at the University of Washington asked whether that amount is enough for the gums. Across 15 trials in six countries with 1,140 mostly healthy people, vitamin C reduced the tendency of gums to bleed in people whose blood levels started low, under 28 micromoles per litre, and made little clear difference in people whose levels were already good.\n\nIn a national US survey of 8,210 people, gum bleeding and bleeding in the retina were both more common at blood levels in the range that prevents scurvy than at higher ones. The authors argued the recommendation may be too low. Bleeding gums are still most often from plaque and gum disease, so they are a reason to see a dentist first. But vitamin C is easy to get from food, from peppers, citrus, kiwi, broccoli and berries, and a diet that brings plenty of it is good for the gums as well as everything else.",
    citations: [
      {
        source:
          'Hujoel PP, Kato T, Hujoel IA, Hujoel MLA. 2021: Bleeding tendency and ascorbic acid requirements: systematic review and meta-analysis of clinical trials (Nutr Rev 79(9):964-975)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/33517432/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['vitaminc-deficiency-scurvy', 'vitaminc-food-sources-real-data', 'oral-gum-disease-how-common'],
  },
  {
    id: 'oral-care-dry-mouth-medicines',
    category: 'basicHealth',
    title: 'Hundreds of Medicines Dry the Mouth, and a Dry Mouth Is Worth Telling a Dentist About',
    teaser:
      'Medicines for blood pressure, depression and bladder control are common causes, along with Sjögren\'s, diabetes and cancer treatment.',
    summary:
      "The National Institute of Dental and Craniofacial Research notes that hundreds of medicines lower the amount of saliva the glands make, with medicines for high blood pressure, depression and bladder control among the most common. Sjögren's, diabetes and HIV also cause dry mouth, as does radiation to the head and neck. Because saliva protects the teeth, a mouth that stays dry decays faster and is more prone to thrush.\n\nWhat the institute suggests is practical: sip water through the day and with meals, cut back on caffeine, alcohol and tobacco, which dry the mouth further, chew sugar-free gum or suck sugar-free sweets to bring saliva up, with xylitol products possibly helping against cavities, and use a humidifier at night. It also advises seeing a dentist or doctor to find the cause, since a prescriber may be able to adjust a medicine or suggest a saliva substitute. A medicine should never be stopped on account of a dry mouth without talking to the prescriber first, and the dentist should know which medicines a person takes. The medicines kept in Life, then My Meds, are the list to bring.",
    citations: [
      {
        source: 'National Institute of Dental and Craniofacial Research: Dry Mouth',
        url: 'https://www.nidcr.nih.gov/health-info/dry-mouth',
      },
    ],
    overallTier: 'strong',
    relatedIds: ['oral-saliva-protects-teeth', 'sjogrens-xylitol-saliva-stimulation', 'sjogrens-oral-candidiasis-risk'],
  },
  {
    id: 'oral-care-signs-to-see-dentist',
    category: 'basicHealth',
    title: 'Bleeding Gums, Loose Teeth and a Mouth Ulcer Lasting Over Three Weeks Need a Dentist or Doctor',
    teaser:
      'The NHS lists which mouth signs can wait for a routine appointment, which need one soon, and which can mean mouth cancer.',
    summary:
      "Gum disease and decay are mostly painless until late, so the signs are worth knowing. The NHS advises seeing a dentist for gums that bleed when brushing, flossing or eating hard food, for painful or swollen gums, and for bad breath that does not go away. It advises seeing one urgently for very sore or swollen gums, teeth that are loose or falling out, and ulcers, red patches or a lump in the mouth or on the lip.\n\nFor mouth cancer, it lists a mouth ulcer lasting more than three weeks, a red or white patch inside the mouth, a lump in the mouth, on the lip or in the neck, pain in the mouth that does not go away, difficulty swallowing or speaking, a hoarse voice that does not go away, and losing weight without trying; a doctor or dentist should see any of these. Even with no symptoms, the NHS suggests a check-up at least every two years for adults and every year for children, and more often for anyone pregnant or with diabetes. Not smoking matters as much as anything here, since smoking is one of the main causes of both gum disease and mouth cancer.",
    citations: [
      {
        source: 'NHS: Gum disease',
        url: 'https://www.nhs.uk/conditions/gum-disease/',
      },
      {
        source: 'NHS: Mouth cancer symptoms',
        url: 'https://www.nhs.uk/conditions/mouth-cancer/symptoms/',
      },
      {
        source: 'World Health Organization: Oral health fact sheet (17 March 2025)',
        url: 'https://www.who.int/news-room/fact-sheets/detail/oral-health',
      },
    ],
    overallTier: 'strong',
    relatedIds: ['oral-gum-disease-how-common', 'oral-body-diabetes-treatment-lowers-a1c', 'oral-body-pregnancy'],
  },
];
