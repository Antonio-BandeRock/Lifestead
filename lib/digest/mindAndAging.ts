import type { DigestEntry } from './types';

// Keeping the Mind Sharp, Health Literacy (Basic Health), added 2026-11-04.
//
// Direct request: "Do we also have anything about general mental health,
// food related mental health issues, how to exercise your mind to help a
// person stay alert and with an active mind as they grow older?" then
// "Yes, and make sure to be extensive and detailed, with links to other
// things already in the app as it relates."
//
// The reading already held the brain in pieces: neurogenesis, the brain in
// Body Systems, the glymphatic system under sleep, and each condition's
// entry on cognition. Nothing said what changes with age and what does not,
// which risk factors the Lancet Commission counts, what the large trials of
// diet, exercise, blood pressure and training found, or what brain-training
// products can and cannot claim. This file holds those, in five subjects.
//
// Two trials here found nothing (the MIND diet trial and ACHIEVE overall),
// and they are written up as fully as the ones that found something, since
// a null result from a large trial is as much a finding.
//
// Every citation was read against its abstract or source page before it was
// written, through the NCBI E-utilities for the PubMed records and the
// publisher's page for the Alzheimer's Association and the FTC.

export const MIND_AGING_ENTRIES: DigestEntry[] = [
  // ---------------------------------------------------------------------
  // What Changes With Age
  // ---------------------------------------------------------------------
  {
    id: 'mind-aging-what-changes-normally',
    category: 'basicHealth',
    title: 'Different Mental Abilities Peak at Different Ages, and Vocabulary and Knowledge Keep Growing Into the 60s and Beyond',
    teaser:
      'A study of nearly 50,000 people found no single age when the mind peaks. Speed of processing tops out around 18, working memory in the 30s, and vocabulary in the late 60s or later.',
    summary:
      "It is common to think of the mind as peaking in early adulthood and declining from there. In 2015 Joshua Hartshorne and Laura Germine tested that idea with data from 48,537 people online plus earlier standardized test results, and found no single peak. Speed of processing information peaked around the end of high school. Short-term memory for names peaked in the early 20s, and for faces around 30. Working memory, holding and using information in the moment, peaked in the 30s. Reading other people's emotions from their faces peaked in the 40s and 50s. Vocabulary and general knowledge kept rising into the late 60s and early 70s. So what changes with age is mostly speed, the ability to juggle many new things at once, and quick recall of names and words, which is why a word is more often on the tip of the tongue at 65 than at 25. What holds or grows is accumulated knowledge, vocabulary, judgment drawn from experience and the ability to read people. These are averages, and the range between people of the same age widens with every decade: some 80-year-olds test like 50-year-olds, which is part of what the rest of this topic is about. Ordinary changes are slower and more irritating than they are disabling. A person who takes longer to remember a name but remembers it later, or who needs a list where they once kept things in their head, is describing normal ageing. The next entry sets out where the line falls.",
    citations: [
      {
        source:
          'Hartshorne JK, Germine LT 2015: When does cognitive functioning peak? The asynchronous rise and fall of different cognitive abilities across the life span (Psychol Sci 26(4):433-43)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25770099/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['mind-aging-warning-signs', 'mind-aging-cognitive-reserve', 'neurogenesis-discovery-fundamentals', 'organ-brain-cognitive'],
  },
  {
    id: 'mind-aging-warning-signs',
    category: 'basicHealth',
    title: 'Forgetting a Name and Remembering It Later Is Ageing, While Forgetting Things That Disrupt Daily Life Is a Reason to See a Doctor',
    teaser:
      "The Alzheimer's Association pairs ten warning signs of dementia with the ordinary change each is often confused with. The difference is usually whether daily life is affected.",
    summary:
      "The Alzheimer's Association lists ten early signs of Alzheimer's disease and other dementias, and sets each beside the typical age-related change it can be confused with. Memory loss that disrupts daily life, such as asking the same question over and over or relying more and more on others for things a person used to manage, against sometimes forgetting a name or appointment and remembering it later. Trouble planning or solving problems, such as following a familiar recipe or keeping track of monthly bills, against making an occasional error with a bill. Difficulty finishing familiar tasks, such as driving to a familiar place, against occasionally needing help with the settings on a new device. Losing track of dates, seasons or where one is, against getting confused about the day of the week and working it out later. New trouble judging distance or reading, against vision changes from cataracts. New problems following or joining a conversation, or calling things by the wrong name, against sometimes struggling to find the right word. Putting things in unusual places and being unable to retrace steps, against misplacing things now and then and finding them. Poor judgment, especially with money, against an occasional bad decision. Withdrawing from work, hobbies and friends, against sometimes feeling weary of obligations. And changes in mood and personality, such as becoming confused, suspicious, fearful or anxious, against becoming irritable when a routine is disrupted. Several of these signs can come from treatable causes, which the next entry covers, so seeing a doctor early is worthwhile either way. Often a family member notices first.",
    citations: [
      {
        source: "Alzheimer's Association: 10 Early Signs and Symptoms of Alzheimer's and Dementia",
        url: 'https://www.alz.org/alzheimers-dementia/10_signs',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['mind-aging-reversible-causes', 'mind-aging-what-changes-normally', 'mentalhealth-help-talking-to-a-doctor', 'oral-body-alzheimers-hypothesis'],
  },
  {
    id: 'mind-aging-reversible-causes',
    category: 'basicHealth',
    title: 'Low B12, an Underactive Thyroid, Depression, Poor Sleep and Some Medicines Can All Cause Memory Trouble That Treatment Reverses',
    teaser:
      'Before memory problems are put down to dementia, doctors look for causes that can be fixed. Several are common in older people and in people with autoimmune conditions.',
    summary:
      "Memory and thinking problems in an older person are not always dementia, and several causes are treatable. Vitamin B12 deficiency causes memory trouble, confusion and low mood, and becomes more common with age because stomach acid falls; it is also common in people taking metformin or acid-reducing medicines for years, and in people with autoimmune gastritis, which travels with autoimmune thyroid disease and type 1 diabetes. An underactive thyroid slows thinking along with everything else. Depression in older people often shows up as poor concentration and memory, sometimes called pseudodementia, and lifts when the depression is treated. Obstructive sleep apnoea and poor sleep in general leave people foggy and forgetful. Medicines are a large group: sedatives, sleeping pills, strong painkillers and the anticholinergic drugs the next entry covers can all cloud thinking, and the risk grows when several are combined. Hearing and vision loss make a person seem confused when they simply cannot take in what is said or shown. Dehydration, a urinary tract infection or another infection can cause sudden confusion (delirium) in an older person, which is a medical emergency. Heavy drinking, low sodium and, more rarely, a slow bleed under the skull after a fall are others. A doctor assessing memory will usually ask about medicines and mood, and order blood tests including B12, folate, thyroid function, a blood count and kidney and liver tests. Life > My Meds holds the full list of medicines and supplements to bring.",
    citations: [
      {
        source:
          'Livingston G, Huntley J, Liu KY, et al. 2024: Dementia prevention, intervention, and care: 2024 report of the Lancet standing Commission (Lancet 404(10452):572-628)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/39096926/',
      },
      {
        source:
          'Gray SL, Anderson ML, Dublin S, et al. 2015: Cumulative use of strong anticholinergics and incident dementia: a prospective cohort study (JAMA Intern Med 175(3):401-7)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25621434/',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'b12-deficiency-symptoms-staged',
      'b12-deficiency-prevalence-causes',
      'type2-metformin-b12-deficiency',
      'organ-brain-cognitive',
      'lifestyle-sleep-apnea',
      'mentalhealth-mood-physical-causes',
      'mind-aging-medicines-anticholinergic',
    ],
  },
  {
    id: 'mind-aging-medicines-anticholinergic',
    category: 'basicHealth',
    title: 'Taking Strong Anticholinergic Medicines Daily for About Three Years Went With a 54% Higher Risk of Dementia',
    teaser:
      'Common medicines for allergies, sleep, bladder control and depression block a brain messenger memory depends on. A large cohort found risk rose with the total amount taken.',
    summary:
      "Acetylcholine is a chemical messenger the brain uses for memory and attention, and a group of medicines called anticholinergics block it. They include first-generation antihistamines such as diphenhydramine (in many sleep aids and allergy pills) and chlorphenamine, older tricyclic antidepressants such as amitriptyline, several bladder medicines for overactive bladder such as oxybutynin, some medicines for nausea, vertigo and Parkinson's, and others. Shirley Gray and colleagues followed 3,434 people aged 65 and over without dementia for a mean of 7.3 years, using pharmacy records to add up every dose. 797 developed dementia. Risk rose with the total amount taken, and people with the highest use, equivalent to taking a strong anticholinergic daily for more than three years, had a 54% higher risk of dementia than people who took none (hazard ratio 1.54, 95% CI 1.21 to 1.96). This is an observational study, so it cannot rule out that the conditions the medicines were treating (depression, poor sleep, bladder problems) were themselves early signs of dementia, and later studies have tried to separate the two with mixed results. Even so, many of these medicines have alternatives with less anticholinergic effect, and guidelines for older people such as the Beers Criteria advise avoiding the strongest of them where possible. Nobody should stop a medicine because of this without talking to their prescriber. A doctor or pharmacist can review the whole list, including anything bought without a prescription, and Life > My Meds keeps that list ready to show them.",
    citations: [
      {
        source:
          'Gray SL, Anderson ML, Dublin S, et al. 2015: Cumulative use of strong anticholinergics and incident dementia: a prospective cohort study (JAMA Intern Med 175(3):401-7)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25621434/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['mind-aging-reversible-causes', 'mentalhealth-treat-antidepressants', 'mind-risk-lancet-fourteen'],
  },
  {
    id: 'mind-aging-cognitive-reserve',
    category: 'basicHealth',
    title: 'Education, Demanding Work and an Active Later Life Build a Reserve That Lets the Brain Cope With Damage for Longer',
    teaser:
      "Two people can have the same Alzheimer's changes in the brain and very different symptoms. The concept of cognitive reserve explains part of the gap, and it is built over a lifetime.",
    summary:
      "When brains are examined after death, some people turn out to have had extensive Alzheimer's changes without ever showing dementia in life. Yaakov Stern's concept of cognitive reserve, set out in a 2012 review, explains part of that gap. Brain reserve is the physical part, such as more neurons and connections to lose before function suffers. Cognitive reserve is how efficiently and flexibly the brain uses what it has, and how well it can bring in other networks to compensate when one is damaged. Studies consistently find that more years of education, a job that demanded complex thinking, and more mental, social and physical activity in later life go with a lower risk of dementia, and that people with higher reserve tend to show symptoms later. The catch is that once symptoms do appear in someone with high reserve, decline is often faster, because the disease has been building for longer behind the scenes. Reserve does not prevent the disease process; it delays its effect on daily life. It is also not fixed in youth. Activities taken up in middle and later life count, and the entries under Keeping the Mind Active look at which kinds have trial evidence. The Lancet Commission puts low education in early life among its fourteen modifiable risk factors, because the rest of life builds on it. For the many people who did not have much schooling, later-life learning is the part still within reach.",
    citations: [
      {
        source: "Stern Y 2012: Cognitive reserve in ageing and Alzheimer's disease (Lancet Neurol 11(11):1006-12)",
        url: 'https://pubmed.ncbi.nlm.nih.gov/23079557/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['mind-active-learning-a-new-skill', 'mind-active-work-and-retirement', 'mind-risk-lancet-fourteen', 'neurogenesis-discovery-fundamentals'],
  },

  // ---------------------------------------------------------------------
  // Risk Factors a Person Can Change
  // ---------------------------------------------------------------------
  {
    id: 'mind-risk-lancet-fourteen',
    category: 'basicHealth',
    title: 'Fourteen Changeable Risk Factors Account for About 45% of Dementia Worldwide, According to the 2024 Lancet Commission',
    teaser:
      "The Lancet Commission added high LDL cholesterol and untreated vision loss to its list. Hearing loss and high cholesterol in midlife each account for about 7% of dementia cases.",
    summary:
      "The Lancet Commission on dementia prevention, intervention and care is an international panel that pools the evidence on what raises and lowers dementia risk. Its 2024 report lists fourteen risk factors a person or society can change, and estimates that together they account for nearly half of dementia worldwide (about 45%), if they are causes and if they were removed. By life stage: in early life, less education. In midlife, hearing loss, high LDL cholesterol, depression, traumatic brain injury, physical inactivity, diabetes, smoking, high blood pressure, obesity and drinking too much alcohol. In later life, social isolation, air pollution and untreated vision loss. The two largest single contributions are hearing loss and high LDL cholesterol, each about 7%; vision loss, added in 2024 along with cholesterol, is about 2%. The figures are estimates built from observational studies, with the usual caveat that some factors may be early signs of dementia rather than causes, and they add up across a population rather than predicting any one person's fate. But they change the picture from dementia as fate to dementia as partly preventable, and the Commission's advice is that it is never too early and never too late to act. Many of the factors are things this app already helps a person keep track of: blood pressure in Signals, blood sugar and cholesterol in labs, movement on Life and Trends, alcohol in meals, and hearing and eye checks in Schedules > Appointments. The entries that follow take the larger ones in turn.",
    citations: [
      {
        source:
          'Livingston G, Huntley J, Liu KY, et al. 2024: Dementia prevention, intervention, and care: 2024 report of the Lancet standing Commission (Lancet 404(10452):572-628)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/39096926/',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'mind-risk-hearing',
      'mind-risk-vision-and-cataracts',
      'mind-risk-blood-pressure',
      'mind-risk-diabetes-cholesterol-smoking-alcohol',
      'mind-risk-depression-and-isolation',
      'mind-active-putting-it-together',
    ],
  },
  {
    id: 'mind-risk-hearing',
    category: 'basicHealth',
    title: 'Hearing Aids Did Not Slow Cognitive Decline Overall in the ACHIEVE Trial, but May Have in Older Adults at Higher Risk',
    teaser:
      'Hearing loss is the largest single changeable risk factor for dementia. The first large trial of treating it found no overall benefit over three years, with a possible benefit in one higher-risk group.',
    summary:
      "The Lancet Commission estimates that hearing loss in midlife accounts for about 7% of dementia worldwide, more than any other single changeable factor. Possible reasons include the brain working harder to make sense of a poor signal, less stimulation reaching the parts of the brain that process sound, and the social withdrawal that hearing loss brings. The ACHIEVE trial, led by Frank Lin and published in 2023, was the first large randomized test of whether treating hearing loss protects thinking. It enrolled 977 people aged 70 to 84 with untreated mild to moderate hearing loss and gave half of them a hearing intervention (an audiologist, fitted hearing aids and coaching) and half a health education programme. Over three years there was no difference in cognitive decline overall. The trial drew from two groups, though, and in the 238 people from an existing heart study, who were older and had more risk factors for cognitive decline, the hearing intervention slowed decline by about 48%, while in the healthier volunteers recruited from the community it did nothing measurable. A difference found in a subgroup needs confirming before anyone relies on it. Hearing aids clearly improved communication and quality of life, which is reason enough to have hearing checked and treated. An audiology appointment can go into Schedules > Appointments, and the type 2 diabetes entry on hearing notes that diabetes roughly doubles the risk of hearing loss.",
    citations: [
      {
        source:
          'Lin FR, Pike JR, Albert MS, et al. 2023: Hearing intervention versus health education control to reduce cognitive decline in older adults with hearing loss in the USA (ACHIEVE): a multicentre, randomised controlled trial (Lancet 402(10404):786-797)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/37478886/',
      },
      {
        source:
          'Livingston G, Huntley J, Liu KY, et al. 2024: Dementia prevention, intervention, and care: 2024 report of the Lancet standing Commission (Lancet 404(10452):572-628)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/39096926/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['type2-hearing-loss-real-prevalence', 'mind-risk-lancet-fourteen', 'mind-risk-depression-and-isolation'],
  },
  {
    id: 'mind-risk-vision-and-cataracts',
    category: 'basicHealth',
    title: 'People Who Had Cataract Surgery Had About 30% Less Dementia Than Those Who Did Not, Which Is Why Vision Loss Joined the Risk List',
    teaser:
      'In a study of 3,038 older adults, removing cataracts went with less dementia, while glaucoma surgery, which does not restore vision, did not. The Lancet Commission added vision loss in 2024.',
    summary:
      "Untreated vision loss was added to the Lancet Commission's list of changeable dementia risk factors in 2024, estimated at about 2% of cases worldwide. Part of the evidence came from a study by Cecilia Lee and colleagues of 3,038 people aged 65 and over in the Adult Changes in Thought cohort in Washington State who had cataracts at the start or developed them during follow-up. People who had their cataracts removed were less likely to develop dementia over the following years than people who did not (hazard ratio 0.71, 95% CI 0.62 to 0.83), after adjusting for education, smoking, blood pressure, diabetes and other factors. As a check, the researchers looked at glaucoma surgery, which lowers eye pressure but does not restore lost vision, and found no such link (hazard ratio 1.08, not significant). That pattern points toward sight itself, rather than simply being the sort of person who has surgery, but it is observational and cannot prove the surgery prevented dementia. The proposed reasons resemble those for hearing: more input reaching the brain, and more reading, getting about and seeing people. Cataracts are common, they come on slowly enough to go unnoticed, and the surgery is one of the most frequently performed operations in the world. Diabetes raises the risk of cataracts and of the retinal damage that also takes sight. A regular eye examination belongs in Schedules > Appointments, and the Body Systems entry on the eyes covers what the eye needs.",
    citations: [
      {
        source:
          'Lee CS, Gibbons LE, Lee AY, et al. 2022: Association between cataract extraction and development of dementia (JAMA Intern Med 182(2):134-141)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/34870676/',
      },
      {
        source:
          'Livingston G, Huntley J, Liu KY, et al. 2024: Dementia prevention, intervention, and care: 2024 report of the Lancet standing Commission (Lancet 404(10452):572-628)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/39096926/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['body-eyes-vision', 'mind-risk-lancet-fourteen', 'mind-risk-hearing'],
  },
  {
    id: 'mind-risk-blood-pressure',
    category: 'basicHealth',
    title: 'Lowering Blood Pressure Further Reduced Mild Cognitive Impairment by 19% in SPRINT MIND, While the Drop in Dementia Was Not Significant',
    teaser:
      'In a trial of 9,361 adults with high blood pressure, aiming for a systolic below 120 rather than 140 lowered the combined risk of mild cognitive impairment or dementia.',
    summary:
      "High blood pressure in midlife is one of the Lancet Commission's changeable risk factors, because it damages the small blood vessels of the brain over years. SPRINT MIND tested whether treating it harder protects thinking. 9,361 adults aged 50 and over with high blood pressure and raised heart risk, but no diabetes or past stroke, were assigned to a systolic target below 120 mm Hg or the standard target below 140, and followed for a median of just over five years, though the trial stopped the intensive treatment early (after about 3.3 years) because it was clearly reducing heart attacks and deaths. Probable dementia was less common in the intensive group, but the difference was not statistically significant (hazard ratio 0.83, 95% CI 0.67 to 1.04), partly because stopping early meant fewer cases than planned. Mild cognitive impairment was significantly less common (hazard ratio 0.81, 95% CI 0.69 to 0.95), as was the combination of mild cognitive impairment or dementia (hazard ratio 0.85). It remains the strongest trial evidence that treating a vascular risk factor protects the brain. How low a target is right for a given person, especially someone older or frail, is a decision for a doctor, since very low pressure can cause dizziness and falls. Signals > Blood Pressure records home readings and Trends shows them over time, which gives a doctor more to go on than a single reading in the clinic. Less salt, more potassium-rich vegetables, movement, less alcohol and enough sleep all lower blood pressure, and the magnesium entry covers what that mineral adds.",
    citations: [
      {
        source:
          'SPRINT MIND Investigators for the SPRINT Research Group, Williamson JD, Pajewski NM, et al. 2019: Effect of intensive vs standard blood pressure control on probable dementia: a randomized clinical trial (JAMA 321(6):553-561)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30688979/',
      },
    ],
    overallTier: 'strong',
    relatedIds: ['magnesium-blood-pressure', 'mind-risk-lancet-fourteen', 'mind-risk-diabetes-cholesterol-smoking-alcohol', 'cvd-kidney-brain-pad-real-data'],
  },
  {
    id: 'mind-risk-diabetes-cholesterol-smoking-alcohol',
    category: 'basicHealth',
    title: 'Diabetes, High LDL Cholesterol, Smoking and Heavy Drinking Each Raise Dementia Risk, and Most of the Harm Runs Through the Blood Vessels',
    teaser:
      'The heart and the brain share the same blood supply. What damages one damages the other, and the Lancet Commission counts each of these as a changeable risk.',
    summary:
      "The brain uses about a fifth of the body's oxygen through a dense network of small vessels, and much of what harms the heart harms the brain the same way. The Lancet Commission's 2024 report counts several such risks among its fourteen. Diabetes raises dementia risk, through damage to small vessels, through repeated high and low blood sugar, and through links between insulin and the proteins that build up in Alzheimer's disease; the type 2 entry on cognition goes into it. High LDL cholesterol in midlife was added in 2024 as one of the two largest single factors, at about 7% of cases, and the Commission notes that statin use was associated with lower dementia risk in observational studies. Smoking raises risk, and stopping lowers it even late in life. Drinking more than about 21 units a week (roughly 12 standard US drinks) raises it; the Global Burden of Disease entry on alcohol argues there is no level that is good for health. Obesity, physical inactivity and air pollution are on the list too, and chronic kidney disease, multiple sclerosis and peripheral artery disease each carry risks to thinking, covered in their condition entries. Diet comes in mostly through these: a pattern that keeps blood pressure, blood sugar and cholesterol in range protects the brain. The entry on processed meat and dementia in a UK cohort is one of the more specific dietary findings, at an observational tier. Lab results, blood pressure, meals and movement in this app put most of these in one place, and Trends > Compare Two can set an intake beside a lab.",
    citations: [
      {
        source:
          'Livingston G, Huntley J, Liu KY, et al. 2024: Dementia prevention, intervention, and care: 2024 report of the Lancet standing Commission (Lancet 404(10452):572-628)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/39096926/',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'type2-cognitive-liver-real-data',
      'ckd-cognitive-decline-dementia-risk',
      'ms-cognitive-impairment-brain-atrophy',
      'cvd-kidney-brain-pad-real-data',
      'lifestyle-alcohol-gbd-no-safe-level',
      'body-brain-processed-meat-dementia-uk-biobank',
      'lifestyle-air-pollution',
      'mind-risk-blood-pressure',
    ],
  },
  {
    id: 'mind-risk-depression-and-isolation',
    category: 'basicHealth',
    title: 'Depression in Midlife and Social Isolation in Later Life Are Both on the Dementia Risk List',
    teaser:
      'The Lancet Commission counts both, and both are treatable. Part of the link may run the other way, with early dementia causing low mood and withdrawal.',
    summary:
      "The Lancet Commission's 2024 report counts depression in midlife and social isolation in later life among its fourteen changeable risk factors for dementia. Depression is linked to higher dementia risk in many long-term studies, and some of the link probably runs through stress hormones, inflammation, poor sleep, inactivity and the vascular risk factors depression travels with. Some of it may run the other way: depression that appears for the first time in later life can be an early sign of a brain already changing. The Commission notes that treating depression with antidepressants was associated with lower dementia risk in some studies, though trials have not tested it directly. Social isolation reduces the stimulation the brain gets from conversation, shared activity and having to keep up with other people, and it is tied to less activity, more depression and higher blood pressure. Again, early dementia causes people to withdraw, which muddies the picture. Neither of these is a reason to fear a low mood or a quiet life. Both are things worth treating for their own sake, with a possible benefit to the brain as well. The Mental Health topic covers what helps with depression and loneliness, the entry on loneliness and survival covers the size of the link with mortality, and the entry on staying social sets out what the trials of social and learning activities found. For someone caring for an older relative, regular contact is one of the most useful things to offer.",
    citations: [
      {
        source:
          'Livingston G, Huntley J, Liu KY, et al. 2024: Dementia prevention, intervention, and care: 2024 report of the Lancet standing Commission (Lancet 404(10452):572-628)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/39096926/',
      },
      {
        source: 'Holt-Lunstad J, Smith TB, Layton JB 2010: Social relationships and mortality risk: a meta-analytic review (PLoS Med 7(7):e1000316)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20668659/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'mentalhealth-mood-depression-what-it-is',
      'mentalhealth-connect-loneliness-and-survival',
      'mind-active-staying-social',
      'mind-risk-lancet-fourteen',
    ],
  },

  // ---------------------------------------------------------------------
  // What the Trials Show
  // ---------------------------------------------------------------------
  {
    id: 'mind-trial-finger',
    category: 'basicHealth',
    title: 'Combining Diet, Exercise, Brain Training and Heart Risk Checks Gave a Small Benefit to Thinking in the Finnish FINGER Trial',
    teaser:
      'Two years of a combined lifestyle programme slightly slowed cognitive decline in 1,260 older Finns at raised risk. It led to similar trials in more than 60 countries.',
    summary:
      "The FINGER trial, led by Tiia Ngandu and Miia Kivipelto, tested whether tackling several risk factors at once protects thinking. 1,260 people aged 60 to 77 in Finland, chosen because their heart and dementia risk scores were raised and their thinking was at or slightly below average for their age, were randomly assigned for two years to either general health advice or a combined programme: nutritional guidance based on Finnish dietary recommendations (more vegetables, fruit, whole grains, fish and rapeseed oil, less sugar and saturated fat), a supervised exercise programme of strength and aerobic training, computer-based brain training, and regular checks of blood pressure, weight and blood tests with advice. On the main measure, a battery of cognitive tests, the programme group did slightly better: the difference was 0.022 points per year on the composite score (p=0.030), a small effect, with clearer benefits on executive function (planning and organising) and processing speed and none on memory. Fewer people in the programme group declined. A two-year trial cannot show whether this prevents dementia, which takes much longer to appear, and the benefit at this size would be hard for a person to notice. FINGER mattered because it showed that a combined approach is feasible and safe and can move cognition at all, and it spawned the World Wide FINGERS network, with adapted trials in more than 60 countries, including the US POINTER trial. The combination of several parts, rather than any one, appears to be what works.",
    citations: [
      {
        source:
          'Ngandu T, Lehtisalo J, Solomon A, et al. 2015: A 2 year multidomain intervention of diet, exercise, cognitive training, and vascular risk monitoring versus control to prevent cognitive decline in at-risk elderly people (FINGER): a randomised controlled trial (Lancet 385(9984):2255-63)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25771249/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['mind-trial-mediterranean', 'mind-trial-exercise-and-the-hippocampus', 'mind-active-putting-it-together', 'diet-mediterranean'],
  },
  {
    id: 'mind-trial-active-speed',
    category: 'basicHealth',
    title: 'Ten Sessions of Speed-of-Processing Training Went With 29% Less Dementia a Decade Later in the ACTIVE Trial',
    teaser:
      'Of three kinds of training in 2,802 older Americans, only speed training was linked to lower dementia risk, and the effect grew with more sessions. It is promising and not yet repeated.',
    summary:
      "The ACTIVE trial assigned 2,832 Americans aged 65 and over to about ten one-hour sessions of training in memory (strategies for remembering lists and stories), reasoning (finding patterns), or speed of processing (spotting and responding to things on a screen faster, with the task getting harder as people improved), or to no training, with some people given booster sessions at 11 and 35 months. After ten years, George Rebok and colleagues reported that all three trained groups reported less difficulty with daily activities such as managing money, medicines and shopping than the control group (about 60% of trained people against 50% of controls were at or above their starting level), though memory training's effect on memory itself had faded while reasoning and speed training kept theirs. Jerri Edwards and colleagues then looked at dementia in 2,802 participants. Over ten years, 260 developed dementia. Speed training was associated with a 29% lower risk (hazard ratio 0.71, 95% CI 0.50 to 0.998, p=0.049), and each additional session was associated with a further 10% lower risk. Memory and reasoning training showed no significant effect. This is the strongest single result for brain training and dementia, and it should be read carefully: dementia was a later analysis rather than the trial's main question, the confidence interval only just excludes no effect, and no trial has yet repeated it. The speed training used, now sold commercially, is one specific task, which the entries on brain training claims put in context.",
    citations: [
      {
        source:
          'Rebok GW, Ball K, Guey LT, et al. 2014: Ten-year effects of the advanced cognitive training for independent and vital elderly cognitive training trial on cognition and everyday functioning in older adults (J Am Geriatr Soc 62(1):16-24)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24417410/',
      },
      {
        source:
          'Edwards JD, Xu H, Clark DO, et al. 2017: Speed of processing training results in lower risk of dementia (Alzheimers Dement (N Y) 3(4):603-611)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29201994/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['mind-training-transfer', 'mind-training-lumosity-ftc', 'mind-training-crosswords', 'mind-aging-cognitive-reserve'],
  },
  {
    id: 'mind-trial-mind-diet',
    category: 'basicHealth',
    title: 'The MIND Diet Did Not Improve Thinking More Than a Mildly Reduced-Calorie Diet in a Three-Year Trial',
    teaser:
      "In 604 older adults, both groups improved on thinking tests by similar amounts, and brain scans showed no difference. The observational studies that built the MIND diet's reputation were not confirmed.",
    summary:
      "The MIND diet combines parts of the Mediterranean and DASH diets with an emphasis on foods linked to brain health in observational studies: leafy greens, other vegetables, berries, nuts, whole grains, fish, beans, poultry and olive oil, with limits on red meat, butter, cheese, pastries and fried food. Large cohort studies found that people who ate closer to it had slower cognitive decline and less Alzheimer's. Lisa Barnes and colleagues tested it directly. 604 people aged 65 and over without cognitive impairment, overweight and with a poor diet at the start, were randomly assigned to the MIND diet or to their usual diet, and both groups were asked to cut calories mildly and given counselling. After three years, both groups improved on thinking tests by similar amounts (0.205 against 0.170 standardized units, a difference that was not statistically significant, p=0.23), and MRI scans showed no difference in brain changes. Both groups lost about 5 kg. The trial does not show the MIND diet is useless: the control group also changed what they ate and lost weight, three years may be too short, and the participants were healthy at the start. It does show that a well-run trial of the MIND diet did not confirm the benefit the observational studies suggested, which is a common fate for findings from studies of what people choose to eat. The Mediterranean trial in the entry after this one, with olive oil and nuts, found more. A pattern rich in vegetables, beans, fish and whole foods protects the heart and blood vessels, and that remains the best-supported reason to eat this way.",
    citations: [
      {
        source:
          "Barnes LL, Dhana K, Liu X, et al. 2023: Trial of the MIND diet for prevention of cognitive decline in older persons (N Engl J Med 389(7):602-611)",
        url: 'https://pubmed.ncbi.nlm.nih.gov/37466280/',
      },
    ],
    overallTier: 'strong',
    relatedIds: ['mind-trial-mediterranean', 'diet-mediterranean', 'mind-trial-finger', 'mind-risk-diabetes-cholesterol-smoking-alcohol'],
  },
  {
    id: 'mind-trial-mediterranean',
    category: 'basicHealth',
    title: 'Adding Extra Olive Oil or Nuts to a Mediterranean Diet Slowed Cognitive Decline in a Spanish Trial',
    teaser:
      'In a subgroup of the PREDIMED trial, people given extra-virgin olive oil or mixed nuts held their thinking scores over about four years, while the low-fat control group declined.',
    summary:
      "PREDIMED was a large Spanish trial that assigned people at high cardiovascular risk to a Mediterranean diet with extra-virgin olive oil (about a litre a week for the household), a Mediterranean diet with mixed nuts (30 g a day), or advice to follow a low-fat diet. Cinta Valls-Pedret and colleagues tested thinking in 447 of the participants in Barcelona, with a mean age of 66.9, at the start and again after a median of 4.1 years in the 334 who completed it. In the control group, all three cognitive composites (memory, frontal function such as attention and planning, and global cognition) declined over the period. The olive oil group did better than the controls on frontal function and global cognition, and the nuts group did better on memory. The authors concluded that a Mediterranean diet supplemented with olive oil or nuts may counteract age-related cognitive decline. The limits are important. This was a subgroup of one centre, many participants did not finish testing, and the wider PREDIMED trial had to be reanalysed in 2018 after problems with how some participants were randomized, though its main findings held. The result fits the observational evidence and the heart benefits of the same diet, and it stands somewhat against the null MIND diet trial in the entry before this one. One difference worth noticing is that PREDIMED supplied the food. The diet entry on the Mediterranean pattern covers the rest of the evidence, and the meal planner can build around olive oil, nuts, fish, beans and vegetables.",
    citations: [
      {
        source:
          'Valls-Pedret C, Sala-Vila A, Serra-Mir M, et al. 2015: Mediterranean diet and age-related cognitive decline: a randomized clinical trial (JAMA Intern Med 175(7):1094-1103)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25961184/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['diet-mediterranean', 'mind-trial-mind-diet', 'mind-trial-finger', 'mentalhealth-omega3-epa-dha'],
  },
  {
    id: 'mind-trial-exercise-and-the-hippocampus',
    category: 'basicHealth',
    title: 'A Year of Walking Grew the Hippocampus by 2% in Older Adults, Reversing One to Two Years of Age-Related Shrinkage',
    teaser:
      'In 120 older adults, brisk walking three days a week enlarged the brain region for memory, while a stretching group lost volume. The growth went with higher BDNF and better spatial memory.',
    summary:
      "The hippocampus, deep in the temporal lobes, is central to forming new memories and is one of the first regions affected by Alzheimer's disease. It shrinks by around 1% to 2% a year in later life. In 2011 Kirk Erickson and colleagues assigned 120 sedentary older adults without dementia to a year of either moderate aerobic exercise (walking briskly for 40 minutes three days a week, building up over the first weeks) or stretching and toning exercises. MRI scans showed that the walking group's hippocampus grew by about 2%, reversing roughly one to two years of age-related loss, while the stretching group's shrank by about 1.4%. Larger increases went with bigger rises in BDNF, a protein that supports the growth and survival of brain cells, and with improvements in spatial memory. Aerobic fitness at the start was also linked to larger hippocampal volume. It was one trial of modest size, and later trials of exercise for thinking in older people have found smaller and less consistent effects on cognitive tests than this result suggested, so the size of the benefit is not settled. Even so, the evidence that regular aerobic exercise is good for the ageing brain is among the better supported in this field, it fits the Lancet Commission's counting of inactivity as a risk factor, and the neurogenesis entry on BDNF goes into the biology. A walk three times a week can go into Life > Movement or Schedules > Exercise, and Trends > Movement shows it over months.",
    citations: [
      {
        source:
          'Erickson KI, Voss MW, Prakash RS, et al. 2011: Exercise training increases size of hippocampus and improves memory (Proc Natl Acad Sci U S A 108(7):3017-22)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/21282661/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['neurogenesis-bdnf-exercise', 'mentalhealth-treat-exercise-as-treatment', 'mind-trial-finger', 'mind-risk-lancet-fourteen'],
  },

  // ---------------------------------------------------------------------
  // Brain Training Claims
  // ---------------------------------------------------------------------
  {
    id: 'mind-training-transfer',
    category: 'basicHealth',
    title: 'Brain Training Games Make People Better at the Games, and Rarely at Anything Else',
    teaser:
      "In 11,430 people training online for six weeks, gains on the trained tasks did not carry over even to closely related tests. A 2016 review of the field reached the same conclusion.",
    summary:
      "Brain training products promise that practising puzzles and memory games makes a person sharper in general. The question that matters is transfer: does getting better at a game make someone better at things they did not practise, like remembering appointments or handling money? In 2010 Adrian Owen and colleagues ran a six-week online study with 11,430 adults, organised with a BBC programme. Participants trained on reasoning, planning and memory tasks for at least ten minutes a day, three times a week, while a control group answered general knowledge questions using the internet. Everyone improved on the tasks they trained, but there was no evidence of transfer to untrained tasks, even ones that were closely related. In 2016 Daniel Simons and colleagues published an extensive review of the studies brain-training companies cited in support of their products. They found extensive evidence that training improves performance on the trained tasks, less evidence for closely related tasks, and little evidence for distant tasks or everyday thinking. They also found that many of the studies had design problems, such as small samples, no active control group and many outcomes measured with only some reported. The review followed two open letters in 2014, one from about 70 scientists saying the claims were unsupported and one from 133 scientists and therapists saying some training does have benefits, which shows the field disagrees at the edges. ACTIVE's speed training is the main exception worth knowing about, and its dementia result has not been repeated. Playing brain games for enjoyment is fine; expecting them to protect the mind goes beyond the evidence.",
    citations: [
      {
        source: 'Owen AM, Hampshire A, Grahn JA, et al. 2010: Putting brain training to the test (Nature 465(7299):775-8)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20407435/',
      },
      {
        source: 'Simons DJ, Boot WR, Charness N, et al. 2016: Do "brain-training" programs work? (Psychol Sci Public Interest 17(3):103-186)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/27697851/',
      },
    ],
    overallTier: 'strong',
    relatedIds: ['mind-training-lumosity-ftc', 'mind-trial-active-speed', 'mind-training-crosswords', 'mind-active-learning-a-new-skill'],
  },
  {
    id: 'mind-training-lumosity-ftc',
    category: 'basicHealth',
    title: 'Lumosity Paid $2 Million to Settle US Charges That It Claimed Without Evidence Its Games Could Delay Dementia',
    teaser:
      "In 2016 the US Federal Trade Commission said Lumosity's maker had no evidence for claims about school, work, dementia and other conditions, and had used testimonials from contest winners without saying so.",
    summary:
      "In January 2016 the US Federal Trade Commission announced a settlement with Lumos Labs, the maker of the Lumosity brain training games. The FTC charged that the company had advertised, in radio, television and online, that its games would help users perform better at work and school, and would delay or protect against age-related decline in memory and other cognitive function, including mild cognitive impairment, dementia and Alzheimer's disease. The ads also claimed help for people recovering from stroke and traumatic brain injury and for those with PTSD, ADHD and the side effects of chemotherapy. According to the FTC, the company did not have the science to back up those claims. It also said Lumosity had used customer testimonials gathered through contests that promised prizes without disclosing that. The settlement included a $50 million judgment, suspended because the company could not pay it, with $2 million paid instead, and required the company to stop making such claims without good evidence and to give subscribers an easy way to cancel. A settlement is not a court finding of guilt, and the company did not admit wrongdoing. The same kinds of claims, about memory, focus and dementia, still appear on many brain products and supplements today. A fair question to ask of any of them is which randomized trial showed it, in whom, against what comparison, and whether the benefit reached daily life. The entries on transfer and on the ACTIVE trial show what such evidence looks like when it exists.",
    citations: [
      {
        source:
          'US Federal Trade Commission 2016: Lumosity to Pay $2 Million to Settle FTC Deceptive Advertising Charges for Its "Brain Training" Program (press release, 5 January 2016)',
        url: 'https://www.ftc.gov/news-events/news/press-releases/2016/01/lumosity-pay-2-million-settle-ftc-deceptive-advertising-charges-its-brain-training-program',
      },
    ],
    overallTier: 'strong',
    relatedIds: ['mind-training-transfer', 'mind-trial-active-speed'],
  },
  {
    id: 'mind-training-crosswords',
    category: 'basicHealth',
    title: 'Crossword Puzzles Did Better Than Computer Brain Games for Memory in People With Mild Cognitive Impairment',
    teaser:
      'In a trial of 107 people with mild cognitive impairment, those doing crosswords declined less over 78 weeks than those playing brain games. There was no group doing neither.',
    summary:
      "Mild cognitive impairment (MCI) means thinking problems greater than expected for a person's age, noticed by them and measurable on tests, but not bad enough to disrupt daily life; some people with it go on to develop dementia and some stay stable or improve. D.P. Devanand and colleagues assigned 107 people with MCI, with a mean age of 71, to 78 weeks of either web-based crossword puzzles or web-based brain training games, with intensive sessions for the first 12 weeks and boosters after. On the main measure, a standard test of thinking used in Alzheimer's research (the ADAS-Cog), the crossword group did better, a difference of 1.44 points (95% CI 0.06 to 2.83, p=0.04), and the crossword group also showed better daily functioning and less brain shrinkage on MRI. People with more impairment at the start benefited most. The trial did not include a group doing neither activity, so it shows crosswords beat brain games, without showing that either beats doing nothing. It was also small. The authors suggest that crosswords may help because they draw on vocabulary and knowledge, which hold up well with age, and engage several abilities at once. Crosswords, cryptic or plain, are inexpensive, enjoyable and social when done together, and anyone who likes them has a reasonable basis for keeping on with them. They sit well alongside the activities in the next subject, and Interests can hold them alongside everything else a person does.",
    citations: [
      {
        source:
          'Devanand DP, Goldberg TE, Qian M, et al. 2022: Computerized games versus crosswords training in mild cognitive impairment (NEJM Evid 1(12):EVIDoa2200121)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/37635843/',
      },
    ],
    overallTier: 'weak',
    relatedIds: ['mind-training-transfer', 'mind-active-learning-a-new-skill', 'mind-trial-active-speed'],
  },

  // ---------------------------------------------------------------------
  // Keeping the Mind Active
  // ---------------------------------------------------------------------
  {
    id: 'mind-active-learning-a-new-skill',
    category: 'basicHealth',
    title: 'Learning Quilting or Digital Photography for Three Months Improved Memory More Than Social Activities or Familiar Hobbies',
    teaser:
      'In the Synapse Project, older adults who took up a demanding new skill for about 15 hours a week improved episodic memory. Those doing familiar or social activities did not improve as much.',
    summary:
      "Denise Park and colleagues tested whether taking on something new and demanding does more for an ageing mind than staying busy. In the Synapse Project, 221 adults aged 60 to 90 spent about 16.5 hours a week for three months in one of several conditions. Two groups learned a demanding new skill: digital photography and photo editing, or quilting, both taught from scratch with increasing challenge, and a third group did both. Others took part in social activities with a group (field trips, cooking, games, guest speakers) or did familiar activities at home such as listening to music, doing word puzzles and watching classic films. The groups learning a new skill improved more on episodic memory, the memory of events and details, than the social or familiar activity groups, and the photography group improved most. The social group gained little on thinking, though the authors note social contact matters for other reasons. The study was small for the number of groups, and it measured memory right after the three months. Its lesson matches the ideas behind cognitive reserve: what seems to help is sustained effort at something unfamiliar and hard, which stretches several abilities at once, more than doing more of what a person already does easily. Learning a language or an instrument, a craft, a new sport, gardening for the first time, or a course in something unfamiliar all fit. Interests > My Interests is built to hold exactly this, from first following a subject to practising it, and Life > Projects can hold a longer piece of work with its steps.",
    citations: [
      {
        source:
          'Park DC, Lodi-Smith J, Drew L, et al. 2014: The impact of sustained engagement on cognitive function in older adults: the Synapse Project (Psychol Sci 25(1):103-12)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24214244/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['mind-aging-cognitive-reserve', 'mind-training-transfer', 'mind-active-staying-social', 'garden-mental-health-benefits'],
  },
  {
    id: 'mind-active-purpose',
    category: 'basicHealth',
    title: 'Older Adults With a Strong Sense of Purpose Were About Half as Likely to Develop Alzheimer\'s Disease Over Seven Years',
    teaser:
      'In the Rush Memory and Aging Project, people who scored high on purpose in life were 2.4 times more likely to stay free of Alzheimer\'s than those who scored low.',
    summary:
      "Patricia Boyle and colleagues followed 951 older adults without dementia in the Rush Memory and Aging Project in Chicago for up to seven years. At the start, participants rated statements about purpose in life, such as whether they had a sense of direction and felt their daily activities were worthwhile. Over the follow-up, 155 developed Alzheimer's disease. Greater purpose was linked to a substantially lower risk: a person with a high score (around the 90th percentile) was about 2.4 times more likely to remain free of Alzheimer's than a person with a low score (around the 10th percentile), with a hazard ratio of about 0.48 for each unit of purpose. Purpose was also linked to a lower risk of mild cognitive impairment and to slower decline in thinking, and the link held after adjusting for depression, chronic conditions, social networks and other factors. Later analyses of brain tissue after death in the same cohort found that purpose seemed to protect thinking even when Alzheimer's changes were present, consistent with cognitive reserve. This is observational, and early brain changes might reduce a person's sense of purpose before they show up as memory problems, so it cannot show that cultivating purpose prevents anything. Purpose is not something a person can simply decide to have, but it often grows out of roles, people, work and interests that give days a direction. Caring for a garden, a grandchild, a project, a faith or a cause all count, and much of what this app holds, in Interests, Projects and Garden, sits close to it.",
    citations: [
      {
        source:
          "Boyle PA, Buchman AS, Barnes LL, Bennett DA 2010: Effect of a purpose in life on risk of incident Alzheimer disease and mild cognitive impairment in community-dwelling older persons (Arch Gen Psychiatry 67(3):304-10)",
        url: 'https://pubmed.ncbi.nlm.nih.gov/20194831/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['mind-aging-cognitive-reserve', 'mind-active-work-and-retirement', 'mind-active-learning-a-new-skill'],
  },
  {
    id: 'mind-active-work-and-retirement',
    category: 'basicHealth',
    title: 'Retiring Early Was Followed by Faster Cognitive Decline in Data From 13 Countries, Suggesting Daily Mental Demands Matter',
    teaser:
      'Economists used differences in pension rules between countries to show that retiring early lowers memory scores in the early 60s. What replaces the work appears to be what counts.',
    summary:
      "In a paper titled Mental Retirement, the economists Susann Rohwedder and Robert Willis compared memory scores of people aged 60 to 64 in the US, England and 11 European countries. Retirement ages differ a great deal between those countries, mostly because of pension rules: in some, almost everyone in their early 60s still works, and in others most have retired. Because pension rules, rather than a person's health, decided when many people retired, the researchers could use them to separate the effect of retirement from the effect of poor health leading to retirement. Countries where more people had retired by their early 60s had markedly lower memory scores in that age group, and the authors concluded that early retirement has a significant negative effect on cognition. Later studies with other methods have found mixed results, with some showing that the effect depends on how mentally demanding the job was and on what people do after retiring. The likely reason is simple: work, for many people, supplies daily mental demands, problems to solve, people to deal with and a reason to get up and out, and retirement can remove all of those at once unless something takes their place. None of this means anyone should keep working who does not want to, and for people in physically hard or stressful jobs retirement can improve health. It does suggest that retirement is a good moment to take on something new, such as volunteering, learning, a project or a part-time role. Life > Work, Interests and Life > Projects can hold what comes next.",
    citations: [
      {
        source: 'Rohwedder S, Willis RJ 2010: Mental retirement (J Econ Perspect 24(1):119-138)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20975927/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['mind-active-purpose', 'mind-aging-cognitive-reserve', 'mind-active-learning-a-new-skill'],
  },
  {
    id: 'mind-active-sleep',
    category: 'basicHealth',
    title: 'Sleep Clears Waste From the Brain, and One Night Without It Raised Alzheimer\'s-Related Amyloid in Healthy Adults',
    teaser:
      'In mice, the spaces between brain cells widen by 60% during sleep and amyloid clears faster. In people, one sleepless night raised amyloid in memory regions on brain scans.',
    summary:
      "In 2013 Lulu Xie, Maiken Nedergaard and colleagues showed in mice that the space between brain cells increases by about 60% during sleep, letting cerebrospinal fluid flow through the brain more freely and clear waste, including beta-amyloid, the protein that builds into plaques in Alzheimer's disease. Amyloid cleared about twice as fast during sleep as during waking. This waste-clearing system is called the glymphatic system, and the sleep entry on it covers it in more detail. Whether it works the same way in humans is still being studied. In 2018 Ehsan Shokri-Kojori and colleagues scanned 20 healthy adults aged 22 to 72 after a night of normal sleep and after a night without sleep, and found that one night of sleep deprivation raised amyloid in the hippocampus and thalamus by about 5%. A single night's change is not dementia, and amyloid falls again with recovery sleep, but long-term studies link persistently short or broken sleep, and untreated sleep apnoea, with higher dementia risk, and poor sleep also hurts attention and memory the next day, which everybody has felt. Sleep is also when the brain consolidates the day's memories. The neurogenesis entry on sleep covers its role in new brain cell growth, and the sleep entries cover what improves it, with CBT for insomnia the first treatment guidelines recommend over sleeping pills, several of which carry risks for memory in older people. Loud snoring with pauses in breathing is worth raising with a doctor.",
    citations: [
      {
        source: 'Xie L, Kang H, Xu Q, et al. 2013: Sleep drives metabolite clearance from the adult brain (Science 342(6156):373-7)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24136970/',
      },
      {
        source:
          'Shokri-Kojori E, Wang GJ, Wiers CE, et al. 2018: β-Amyloid accumulation in the human brain after one night of sleep deprivation (Proc Natl Acad Sci U S A 115(17):4483-4488)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29632177/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['sleep-glymphatic-system', 'neurogenesis-sleep', 'sleep-cbti-first-line', 'lifestyle-sleep-apnea', 'mind-aging-medicines-anticholinergic'],
  },
  {
    id: 'mind-active-staying-social',
    category: 'basicHealth',
    title: 'Conversation, Shared Activities and Close Ties Keep the Mind Working, and Learning Together Does Double Duty',
    teaser:
      'Social isolation is on the dementia risk list and loneliness is tied to earlier death. Activities that combine people with a demanding new skill appear to give the most.',
    summary:
      "Talking with other people is demanding mental work: following what someone says, reading their face and tone, remembering what they told you last time, and answering in real time. Isolation takes that away, and the Lancet Commission counts social isolation in later life among its changeable risk factors for dementia, while Julianne Holt-Lunstad's pooled studies tie weak social ties to earlier death. The evidence stops short of saying any social contact is enough for the mind. In the Synapse Project, older adults who spent many hours a week in social activities improved their thinking less than those learning a hard new skill, though the authors stress that social contact has other benefits. Putting the two together, the activities that seem to do the most are ones that combine people with challenge: a language class, a choir or band, a community garden, volunteering that asks something of a person, a book group, a sports club, teaching a skill to someone else, or a regular game of chess or cards with friends. Caring for grandchildren in moderation has also been linked to better thinking in some studies. For someone whose world has narrowed because of illness, hearing or vision loss, grief or moving house, small and regular is easier to keep than big and occasional, such as a weekly call, a standing coffee or a class on the same day each week. Schedules > Appointments and Life > Routines can hold a standing date with a reminder, and Interests can hold the group and what is done there.",
    citations: [
      {
        source: 'Holt-Lunstad J, Smith TB, Layton JB 2010: Social relationships and mortality risk: a meta-analytic review (PLoS Med 7(7):e1000316)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20668659/',
      },
      {
        source:
          'Park DC, Lodi-Smith J, Drew L, et al. 2014: The impact of sustained engagement on cognitive function in older adults: the Synapse Project (Psychol Sci 25(1):103-12)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24214244/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'mentalhealth-connect-loneliness-and-survival',
      'mentalhealth-connect-what-helps',
      'mind-risk-depression-and-isolation',
      'mind-active-learning-a-new-skill',
    ],
  },
  {
    id: 'mind-active-putting-it-together',
    category: 'basicHealth',
    title: 'Keeping the Mind Sharp Comes Down to Protecting Blood Vessels, Senses and Sleep While Doing Hard New Things With Other People',
    teaser:
      'No single food, supplement or game has been shown to prevent dementia. The combination of a few well-supported habits, and treating what can be treated, is where the evidence points.',
    summary:
      "Pulling the topic together, from strongest evidence to weakest. Treat what can be treated: high blood pressure (SPRINT MIND), diabetes and high cholesterol, depression, and hearing and vision loss, with a hearing test and eye examination on a regular schedule. Review medicines with a pharmacist or doctor, especially strong anticholinergics and sedatives, without stopping any on one's own. Move regularly, with aerobic exercise such as brisk walking having the best brain evidence (Erickson). Do not smoke, keep alcohol low, and protect the head from injury with helmets and fall prevention. Eat a pattern that protects blood vessels, built on vegetables, beans, whole grains, nuts, olive oil and fish; the Mediterranean trial evidence is encouraging, the MIND diet trial was null, and no single food or supplement has been shown to prevent dementia. Sleep enough and get snoring with pauses checked. Keep learning hard, unfamiliar things, ideally with other people (Synapse), and keep a sense of purpose and of being needed. Treat brain training games as entertainment; ACTIVE's speed training is the one promising exception, and it has not been repeated. FINGER suggests the combination matters more than any one part. This app can hold most of it: blood pressure in Signals, labs in Insights, medicines in Life > My Meds, walks in Life > Movement and Trends > Movement, hearing and eye checks in Schedules > Appointments, new skills and groups in Interests, and the meals behind a Mediterranean pattern in Food and the Meal Plan. None of it is a score, and none of it guarantees anything. It improves the odds.",
    citations: [
      {
        source:
          'Livingston G, Huntley J, Liu KY, et al. 2024: Dementia prevention, intervention, and care: 2024 report of the Lancet standing Commission (Lancet 404(10452):572-628)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/39096926/',
      },
      {
        source:
          'Ngandu T, Lehtisalo J, Solomon A, et al. 2015: A 2 year multidomain intervention of diet, exercise, cognitive training, and vascular risk monitoring versus control to prevent cognitive decline in at-risk elderly people (FINGER): a randomised controlled trial (Lancet 385(9984):2255-63)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25771249/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'mind-risk-lancet-fourteen',
      'mind-trial-finger',
      'mind-trial-exercise-and-the-hippocampus',
      'mind-active-learning-a-new-skill',
      'mind-aging-medicines-anticholinergic',
      'mind-risk-hearing',
    ],
  },
];
