import type { DigestEntry } from './types';

// Mental Health beyond food, Health Literacy (Basic Health), added
// 2026-11-04.
//
// Direct request: "Do we also have anything about general mental health,
// food related mental health issues, how to exercise your mind to help a
// person stay alert and with an active mind as they grow older?" then
// "Yes, and make sure to be extensive and detailed, with links to other
// things already in the app as it relates."
//
// Before this, the Mental Health & Food topic (lib/digest/mentalHealth.ts)
// covered how diet and nutrients relate to mood, and the conditions each
// carried an entry on depression alongside that condition. Nothing said
// what depression and anxiety are, which treatments the trials support,
// what loneliness and grief do, how to find help outside the US, or
// anything about eating disorders beyond the autism and ARFID overlap and
// PCOS and type 1 entries. This file holds those, and the topic is renamed
// Mental Health to match.
//
// The eating disorder entries carry one sentence this app has to say about
// itself: food logging, nutrient targets and numbers on every food can feed
// an eating disorder, and the person can stop logging at any time. That is
// a fact about the person's options, never a diagnosis.
//
// Every citation was read against its abstract or source page before it was
// written, through the NCBI E-utilities for the PubMed records and the
// publisher's page for WHO, NICE, the FTC and the helplines.

export const MENTAL_HEALTH_GENERAL_ENTRIES: DigestEntry[] = [
  // ---------------------------------------------------------------------
  // Depression, Anxiety & Stress
  // ---------------------------------------------------------------------
  {
    id: 'mentalhealth-mood-depression-what-it-is',
    category: 'basicHealth',
    title: 'Depression Affects About 1 in 20 Adults Worldwide and Changes Sleep, Energy and Thinking as Well as Mood',
    teaser:
      'The World Health Organization counts about 322 million people with depression. It is a lasting change in mood, interest, sleep, energy and thinking, and it is treatable.',
    summary:
      "The World Health Organization estimates that 5.2% of adults worldwide lived with depression in 2023, about 322 million people, and that it is around 1.5 times more common in women than in men. Depression is different from the ordinary low days everybody has. A depressive episode is a low or empty mood, or a loss of interest or pleasure in things that used to matter, that lasts most of the day, nearly every day, for at least two weeks, together with other changes: sleeping much more or much less, eating much more or much less, tiredness, trouble concentrating, feeling worthless or guilty, moving or speaking more slowly or feeling restless, and in some people thoughts of death or suicide. It can come once, or return in episodes over years. It shows up differently in different people. Some feel mostly irritable or numb rather than sad, some notice it first as pain, fatigue or poor sleep, and older people often describe it as a loss of energy and interest rather than low mood. Depression is a medical condition with treatments that work, which the entries under Treatments That Work go through at the strength of evidence behind each. In high-income countries only about a third of people with depression receive treatment, and fewer still elsewhere. If something like this has been going on for weeks, that is enough reason to talk to a doctor. Nobody has to wait until it is severe.",
    citations: [
      {
        source: 'World Health Organization: Depressive disorder (depression) fact sheet (11 September 2026)',
        url: 'https://www.who.int/news-room/fact-sheets/detail/depression',
      },
      {
        source: 'National Institute for Health and Care Excellence (NICE): Depression in adults, treatment and management, guideline NG222 (2022)',
        url: 'https://www.nice.org.uk/guidance/ng222',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'mentalhealth-overview',
      'mentalhealth-mood-physical-causes',
      'mentalhealth-treat-therapy-cbt',
      'mentalhealth-treat-antidepressants',
      'mentalhealth-help-around-the-world',
      'organ-brain-depression-anxiety-euthyroid',
      'neurogenesis-depression-antidepressants',
    ],
  },
  {
    id: 'mentalhealth-mood-anxiety-what-it-is',
    category: 'basicHealth',
    title: 'Anxiety Disorders Are the Most Common Mental Health Condition, and Only About 1 in 4 People Get Treatment',
    teaser:
      'About 470 million people live with an anxiety disorder. Worry that is out of proportion, hard to control and gets in the way of daily life is the line between ordinary nerves and a disorder.',
    summary:
      "The World Health Organization estimates that 5.8% of the world's population, about 470 million people, had an anxiety disorder in 2023, which makes anxiety disorders the most common mental health condition there is. Only about 1 in 4 people who need treatment receive any. Everybody feels anxious at times, and anxiety before an exam, a medical test or a hard conversation is the body doing its job. An anxiety disorder is fear or worry that is out of proportion to what is happening, hard to switch off, and lasting enough to get in the way of work, sleep, relationships or ordinary errands. The main kinds are generalized anxiety disorder (worry about many things most days for months), panic disorder (sudden surges of fear with a racing heart, breathlessness, chest tightness or dizziness, and dread of the next one), social anxiety disorder (fear of being judged that makes people avoid ordinary situations), specific phobias, and separation anxiety. Obsessive compulsive disorder and post-traumatic stress disorder are now classed apart but share a lot with them. The body takes part in all of this: anxiety can cause stomach upset, loose stools, headaches, muscle tension, poor sleep and palpitations, which is part of why it overlaps so much with gut conditions and migraine. A panic attack can feel like a heart attack, and chest pain is always worth having checked; once a doctor has ruled out the heart, panic disorder is very treatable. Cognitive behavioural therapy has the strongest evidence for most anxiety disorders, and certain medicines help too, which Treatments That Work goes into.",
    citations: [
      {
        source: 'World Health Organization: Anxiety disorders fact sheet (15 September 2026)',
        url: 'https://www.who.int/news-room/fact-sheets/detail/anxiety-disorders',
      },
      {
        source:
          'Carpenter JK, Andrews LA, Witcraft SM, et al. 2018: Cognitive behavioral therapy for anxiety and related disorders: a meta-analysis of randomized placebo-controlled trials (Depress Anxiety 35(6):502-514)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29451967/',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'mentalhealth-treat-anxiety-cbt',
      'mentalhealth-mood-stress-in-the-body',
      'mentalhealth-ocd-gut-brain-inflammation',
      'ibs-biopsychosocial-model',
      'migraine-anxiety-depression-bidirectional-real-data',
      'neuro-autism-anxiety-depression',
      'glossary-cbt',
    ],
  },
  {
    id: 'mentalhealth-mood-stress-in-the-body',
    category: 'basicHealth',
    title: 'Short Bursts of Stress Protect the Body, While Stress That Never Lets Up Wears It Down',
    teaser:
      'The stress hormones that sharpen a person for a hard moment do harm when they stay switched on for months. Researchers call the wear and tear allostatic load.',
    summary:
      "Stress is the body getting ready for a demand. Within seconds, adrenaline raises the heart rate and blood pressure, and within minutes cortisol frees up blood sugar, sharpens attention and holds back inflammation. For a short threat that is protective, and the system is built to switch off again once the threat has passed. The neuroendocrinologist Bruce McEwen described what happens when it does not switch off, because the stress is constant (caring for a sick relative, money that never stretches, an unsafe home, a long illness) or because the body stops turning the response down. He called the accumulated cost allostatic load: blood pressure that stays raised, blood sugar and abdominal fat that creep up, immune signals that drift toward inflammation, sleep that stays light, and in animal studies a hippocampus, the brain's memory centre, that shrinks under months of high cortisol. People under long stress also eat, drink, smoke, move and sleep differently, and much of the harm runs through those habits as well as the hormones. For anyone with an autoimmune condition, stress is one of the most commonly reported flare triggers, and the condition entries go into what is known for each. What helps is mostly unglamorous: sleep, movement, people to lean on, a way to take some of the load off, and when stress has turned into anxiety or depression, treatment. Signals > Calm has a breathing pacer for the moment, and a note in Signals > General Note can mark stress on a given day so Pattern Finder can set it beside flares later. It shows them side by side and never says one caused the other.",
    citations: [
      {
        source: 'McEwen BS 1998: Protective and damaging effects of stress mediators (N Engl J Med 338(3):171-9)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/9428819/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'lifestyle-chronic-stress-hpa',
      'neurogenesis-stress-cortisol-diet',
      'mito-exercise-cortisol',
      'graves-stress-trigger',
      'mentalhealth-mood-anxiety-what-it-is',
      'mentalhealth-connect-loneliness-and-survival',
    ],
  },
  {
    id: 'mentalhealth-mood-physical-causes',
    category: 'basicHealth',
    title: 'Thyroid Problems, Low B12, Anaemia, Sleep Apnoea and Some Medicines Can Look Like Depression',
    teaser:
      'Several treatable physical problems cause low mood, tiredness and poor concentration. Guidelines ask doctors to look for them, and a person can ask for the checks by name.',
    summary:
      "Low mood, exhaustion, slowed thinking and poor sleep are symptoms of depression, and they are also symptoms of several physical problems that are easy to test for and treat. Thyroid hormone that is too low (hypothyroidism) commonly causes low mood, tiredness, slowness and weight gain, and too much (hyperthyroidism, as in Graves' disease) commonly causes anxiety, irritability and poor sleep. Vitamin B12 deficiency causes fatigue, low mood, memory trouble and numbness or tingling, and it is common in older people, in vegans, in people on metformin or long-term acid-reducing medicines, and in people with autoimmune gastritis or coeliac disease. Iron-deficiency anaemia causes tiredness and breathlessness. Obstructive sleep apnoea, where breathing stops repeatedly at night, leaves people unrefreshed, foggy and low however long they sleep. Diabetes, kidney disease and low vitamin D travel with depression, and several medicines list low mood as a side effect, including some used for acne, blood pressure, epilepsy and hormones. NICE's guideline on depression asks clinicians to consider physical illness and medicines when assessing someone, and the WHO World Health Surveys found that depression alongside a chronic physical illness worsened health more than any of the illnesses alone. None of this means depression is really something else. Both are often present together, and treating the physical problem does not always lift the mood. It does mean a blood test for thyroid function, B12, folate and a blood count is a reasonable thing to ask for, and Insights > Before Your Appointment and Life > My Meds hold the list of medicines a doctor will want to see.",
    citations: [
      {
        source: 'National Institute for Health and Care Excellence (NICE): Depression in adults, treatment and management, guideline NG222 (2022)',
        url: 'https://www.nice.org.uk/guidance/ng222',
      },
      {
        source:
          'Moussavi S, Chatterji S, Verdes E, et al. 2007: Depression, chronic diseases, and decrements in health: results from the World Health Surveys (Lancet 370(9590):851-8)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/17826170/',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'organ-brain-depression-anxiety-euthyroid',
      'b12-deficiency-symptoms-staged',
      'b12-deficiency-prevalence-causes',
      'type2-metformin-b12-deficiency',
      'depletion-ppi-b12-magnesium',
      'lifestyle-sleep-apnea',
      'mentalhealth-b12-folate-mood',
      'mentalhealth-vitamin-d-mixed-evidence',
    ],
  },
  {
    id: 'mentalhealth-mood-with-a-chronic-illness',
    category: 'basicHealth',
    title: 'Depression Is Two to Three Times as Common Alongside a Long-Term Illness, and It Worsens Health More Than the Illness Alone',
    teaser:
      'In 60 countries, people with angina, arthritis, asthma or diabetes were far more likely to have depression, and those with both reported the worst health of all.',
    summary:
      "The WHO World Health Surveys interviewed 245,404 adults in 60 countries. About 3.2% had a depressive episode in the past year with no chronic physical illness, while between 9.3% and 23.0% of people with angina, arthritis, asthma or diabetes also had depression. After adjusting for income, education and the illnesses themselves, depression lowered people's health scores more than any of the four physical illnesses, and people with depression plus a physical illness reported the worst health of anyone in the survey. The same pattern runs through every condition this app tracks, and each condition has an entry on it: rheumatoid arthritis, inflammatory bowel disease, multiple sclerosis, psoriasis, coeliac disease, type 1 and type 2 diabetes, chronic kidney disease, gout, migraine, MASLD, Sjögren's, PCOS, prostate conditions and heart disease after a heart attack. Some of the overlap is the strain of living with something that hurts, limits and does not go away. Some is the biology the illness and depression share, inflammation above all. And some runs the other way, since depression makes it harder to take medicines, keep appointments, eat well and move. Two things follow. Depression in someone with a long-term illness is common and worth treating in its own right, and treating it often makes the illness easier to manage. A low mood that has lasted weeks should never be put down to the illness and left alone. It belongs on the list for the next appointment, and Reports can carry symptom and mood notes to that appointment.",
    citations: [
      {
        source:
          'Moussavi S, Chatterji S, Verdes E, et al. 2007: Depression, chronic diseases, and decrements in health: results from the World Health Surveys (Lancet 370(9590):851-8)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/17826170/',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'ra-depression-anxiety-comorbidity',
      'ibd-depression-anxiety-bidirectional-real-data',
      'ms-depression-suicide-real-data',
      'psoriasis-depression-suicidality-real-data',
      'celiac-depression-anxiety-mental-health',
      'type2-depression-bidirectional-real-data',
      'type1-diabetes-distress-psychological-burden',
      'ckd-depression-underrecognized',
      'gout-depression-anxiety-real-data',
      'migraine-anxiety-depression-bidirectional-real-data',
      'masld-depression-anxiety-real-data',
      'sjogrens-depression-anxiety-real-data',
      'pcos-sleep-mental-health-real-data',
      'prostate-depression-anxiety-real-data',
      'cvd-post-mi-depression-mortality',
      'mentalhealth-inflammation-link',
    ],
  },
  {
    id: 'mentalhealth-mood-food-insecurity',
    category: 'basicHealth',
    title: 'Not Knowing Where the Next Meal Comes From Raises the Odds of Depression by About 40%',
    teaser:
      'Across 19 studies and more than 370,000 people in ten countries, food insecurity went with more depression and more stress, and older people were affected most.',
    summary:
      "Food insecurity means not having reliable access to enough food, whether that is skipping meals, buying the cheapest filling food rather than what a person needs, or worrying the money will run out before the month does. A 2020 meta-analysis pooled 19 studies with 372,143 people in ten countries. Food-insecure people had about 40% higher odds of depression (odds ratio 1.40) and 34% higher odds of stress, though no clear link to anxiety was found. People aged 65 and over had the highest odds of depression (1.75). These were observational studies, so they show the two go together without proving which comes first, and poverty, debt and poor housing travel with both. The link runs plausibly in both directions: worry about food is a constant stress, a diet of the cheapest calories is low in the nutrients the Nutrients & Mood entries cover, and depression makes shopping, cooking and holding down work harder. This is a mental health matter as much as a nutrition one, and help with food is a legitimate part of looking after mood. In the US, food banks, SNAP and WIC exist for this, and most countries have something similar; a doctor, social worker or local health department can point the way. Within this app, Life > Grocery List, the Meal Plan and Trends > What It Costs are built to stretch a budget, and Garden can show what a small bed yields over a season.",
    citations: [
      {
        source:
          'Pourmotabbed A, Moradi S, Babaei A, et al. 2020: Food insecurity and mental health: a systematic review and meta-analysis (Public Health Nutr 23(10):1778-1790)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/32174292/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'mentalhealth-ultraprocessed-food-risk',
      'mentalhealth-smiles-trial',
      'mentalhealth-b12-folate-mood',
      'garden-mental-health-benefits',
    ],
  },

  // ---------------------------------------------------------------------
  // Treatments That Work
  // ---------------------------------------------------------------------
  {
    id: 'mentalhealth-treat-therapy-cbt',
    category: 'basicHealth',
    title: 'Cognitive Behavioural Therapy Works for Depression Across 409 Trials, and Its Effect Outlasts Medication Alone',
    teaser:
      'The largest review ever made of one kind of therapy found a moderate to large benefit that was still there 6 to 12 months later, in every format from a clinic to an unguided workbook.',
    summary:
      "Cognitive behavioural therapy (CBT) is a structured, time-limited talking therapy, usually 8 to 20 sessions, that works on the links between what a person thinks, does and feels. In depression that means noticing and testing the harsh, all-or-nothing thoughts depression produces, and steadily building back the activities it has taken away. In 2023 Pim Cuijpers and colleagues pooled 409 randomized trials with 52,702 patients, the largest meta-analysis ever made of a single kind of psychotherapy. Compared with usual care or a waiting list, CBT had a moderate to large effect (Hedges' g 0.79), still significant 6 to 12 months later, and trial quality had improved over the years without the effect shrinking. CBT matched antidepressants in the short term and did better than them at 6 to 12 months, though that longer comparison rested on few trials. Combining CBT with medication beat medication alone. CBT also worked as an unguided self-help programme (g 0.45) and in children and teenagers. Two findings keep this in proportion. CBT was only slightly better than other well-run therapies (g 0.06, not significant in most checks), so interpersonal therapy, behavioural activation and problem-solving therapy are reasonable choices too, and a therapist a person trusts matters. And a therapy that works on average does not work for everybody; if one approach has not helped after a fair try, another may. In many countries a doctor can refer for therapy, and guided online CBT is offered free by several health services.",
    citations: [
      {
        source:
          'Cuijpers P, Miguel C, Harrer M, et al. 2023: Cognitive behavior therapy vs. control conditions, other psychotherapies, pharmacotherapies and combined treatment for depression: a comprehensive meta-analysis including 409 trials with 52,702 patients (World Psychiatry 22(1):105-115)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36640411/',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'glossary-cbt',
      'mentalhealth-treat-behavioural-activation',
      'mentalhealth-treat-combined',
      'mentalhealth-treat-anxiety-cbt',
      'ibs-cbt-brain-gut-therapy',
      'sleep-cbti-first-line',
    ],
  },
  {
    id: 'mentalhealth-treat-behavioural-activation',
    category: 'basicHealth',
    title: 'Behavioural Activation, Doing Small Planned Things Again, Is an Effective Treatment for Depression',
    teaser:
      'Depression shrinks life down, and the shrinking feeds the depression. Scheduling small rewarding activities back in, before the motivation returns, works about as well as therapy built on thoughts.',
    summary:
      "Depression takes away energy and pleasure, so people stop doing things: seeing friends, cooking, walking, hobbies, small jobs around the house. Doing less means fewer moments of satisfaction or connection, which deepens the depression, which means doing less again. Behavioural activation breaks into that loop from the doing side. With a therapist or a workbook, a person notices how their days go and how their mood moves with them, then plans small, specific activities that once brought pleasure or a sense of getting something done, and does them on schedule whether or not they feel like it. Motivation tends to follow action, rather than coming first. A 2014 meta-analysis of 26 randomized trials with 1,524 people found behavioural activation clearly better than control conditions (standardized mean difference 0.74) and somewhat better than medication in the four trials that compared them, though most trials were small and of low quality and follow-up was short. Larger later trials, including the UK COBRA trial, found it about as effective as full CBT and simpler to train people to deliver. This is one of the places the daily-living side of this app fits mental health directly. Life > Routines and Schedules can hold small planned activities with a reminder, Did I Do It marks them done without any score, and Interests holds the things a person used to enjoy and might pick up again. None of this replaces a therapist, and a plan works best made with one.",
    citations: [
      {
        source:
          'Ekers D, Webster L, Van Straten A, et al. 2014: Behavioural activation for depression; an update of meta-analysis of effectiveness and sub group analysis (PLoS One 9(6):e100100)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24936656/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'mentalhealth-treat-therapy-cbt',
      'mentalhealth-treat-exercise-as-treatment',
      'mentalhealth-help-using-this-app',
      'garden-mental-health-benefits',
    ],
  },
  {
    id: 'mentalhealth-treat-antidepressants',
    category: 'basicHealth',
    title: 'Every One of 21 Antidepressants Beat Placebo for Adult Depression in 522 Trials',
    teaser:
      'The largest comparison of antidepressants ever made found all of them more effective than a placebo pill, with modest average effects and clear differences in how well people tolerated them.',
    summary:
      "In 2018 Andrea Cipriani and colleagues pooled 522 double-blind randomized trials with 116,477 adults with major depression, comparing 21 antidepressants with placebo and with each other. Every one of the 21 was more effective than placebo, with odds ratios for responding ranging from 2.13 for amitriptyline to 1.37 for reboxetine. Some, such as escitalopram, sertraline, vortioxetine and agomelatine, combined good effectiveness with fewer people stopping because of side effects. The trials mostly ran 8 weeks, so this is evidence about the first two months, and the average effect over placebo is modest, which is why antidepressants are often described as helping some people a great deal and others little. They are usually started at a low dose, take two to six weeks to work, and commonly cause side effects early on (nausea, sleep changes, sexual side effects) that often ease. In young people under 25 they need closer follow-up early, because a small rise in suicidal thinking has been seen in that age group. For moderate or severe depression, guidelines including NICE recommend offering medication, therapy or both, and the choice depends on what a person prefers, what has worked before and what is available. Antidepressants are not addictive in the way sedatives are, but stopping them suddenly can cause withdrawal symptoms, which the entry on stopping covers. Life > My Meds keeps them on the list for the interaction checks, and the condition entries note where one of them interacts with a condition's medicines.",
    citations: [
      {
        source:
          'Cipriani A, Furukawa TA, Salanti G, et al. 2018: Comparative efficacy and acceptability of 21 antidepressant drugs for the acute treatment of adults with major depressive disorder: a systematic review and network meta-analysis (Lancet 391(10128):1357-1366)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29477251/',
      },
      {
        source: 'National Institute for Health and Care Excellence (NICE): Depression in adults, treatment and management, guideline NG222 (2022)',
        url: 'https://www.nice.org.uk/guidance/ng222',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'neurogenesis-depression-antidepressants',
      'mentalhealth-treat-combined',
      'mentalhealth-treat-stopping-safely',
      'ibs-gut-directed-antidepressants',
    ],
  },
  {
    id: 'mentalhealth-treat-combined',
    category: 'basicHealth',
    title: 'Therapy and Medication Together Help More People Get Well and Stay Well Than Either Alone',
    teaser:
      'Across 101 trials, therapy and medication were equally effective on their own, and the two combined did better than either. A second review found the combination kept people well for longer.',
    summary:
      "Two network meta-analyses led by Cuijpers and Furukawa compared the main ways of treating adult depression head to head. The first, in 2020, pooled 101 trials with 11,910 patients, mostly with moderate to severe depression. Psychotherapy alone and medication alone came out the same (relative risk 0.99). Combined treatment beat both, with about 25% more people responding than with either alone. People were also more likely to stick with therapy or the combination than with medication alone, judged by how many dropped out. The second, in 2021, asked which first treatment keeps people well, since depression often comes back. Across 81 trials with 13,722 people followed for most of a year, starting with the combination led to sustained recovery (getting well and not relapsing) much more often than medication alone, with an odds ratio of about 2.5 when both were continued. Therapy alone was also better than medication alone for staying well. The likely reason is that the two treatments work in different ways, therapy teaching skills a person keeps and medication changing brain chemistry while it is taken, and that together they do more than either. What is available matters as much as what is best on paper: waiting lists for therapy are long in many places, and starting medication while waiting, or using guided self-help, is a reasonable path to discuss. This is a conversation for a doctor, and Insights > Before Your Appointment can help a person bring what they have noticed.",
    citations: [
      {
        source:
          'Cuijpers P, Noma H, Karyotaki E, et al. 2020: A network meta-analysis of the effects of psychotherapies, pharmacotherapies and their combination in the treatment of adult depression (World Psychiatry 19(1):92-107)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31922679/',
      },
      {
        source:
          'Furukawa TA, Shinohara K, Sahker E, et al. 2021: Initial treatment choices to achieve sustained response in major depression: a systematic review and network meta-analysis (World Psychiatry 20(3):387-396)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/34505365/',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'mentalhealth-treat-therapy-cbt',
      'mentalhealth-treat-antidepressants',
      'mentalhealth-treat-relapse-prevention',
    ],
  },
  {
    id: 'mentalhealth-treat-anxiety-cbt',
    category: 'basicHealth',
    title: 'CBT Treats Anxiety Disorders Better Than Placebo, With the Largest Effects for Generalized Anxiety and OCD',
    teaser:
      'Across 41 placebo-controlled trials, people treated with CBT were about three times as likely to respond. Therapy built on facing fears step by step did best.',
    summary:
      "Comparing therapy with a placebo is hard, because a person knows whether they are having therapy. A 2018 meta-analysis gathered the 41 trials that managed it, comparing CBT with a pill placebo or a placebo therapy (supportive talk without the active parts) in 2,843 people with generalized anxiety disorder, panic disorder, social anxiety disorder, OCD, PTSD or acute stress disorder. CBT had a moderate effect on the disorder being treated (g 0.56) and smaller benefits for other anxiety, depression and quality of life, and people having CBT were about three times as likely to respond (odds ratio 2.97). The effects were largest for OCD, generalized anxiety disorder and acute stress disorder, and smaller for PTSD, social anxiety and panic disorder, where the authors call for better treatments. Approaches built mainly on exposure, facing feared situations or sensations gradually and on purpose until the fear fades, tended to do best. Exposure is the part people dread and the part that does the work, because avoidance is what keeps anxiety going. Several medicines also treat anxiety disorders, mainly SSRI and SNRI antidepressants. Benzodiazepines (such as diazepam or alprazolam) calm anxiety quickly but bring dependence with regular use, which is why guidelines keep them for short periods. Caffeine, alcohol and poor sleep all make anxiety worse, and cutting down on them is a reasonable thing to try alongside treatment. Signals > Calm offers paced breathing, which can steady the body in the moment; it is a tool for a hard minute, and treatment is what changes the disorder.",
    citations: [
      {
        source:
          'Carpenter JK, Andrews LA, Witcraft SM, et al. 2018: Cognitive behavioral therapy for anxiety and related disorders: a meta-analysis of randomized placebo-controlled trials (Depress Anxiety 35(6):502-514)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29451967/',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'mentalhealth-mood-anxiety-what-it-is',
      'mentalhealth-treat-therapy-cbt',
      'mentalhealth-ocd-gut-brain-inflammation',
      'glossary-cbt',
    ],
  },
  {
    id: 'mentalhealth-treat-exercise-as-treatment',
    category: 'basicHealth',
    title: 'Walking, Yoga and Strength Training Each Reduced Depression in 218 Trials, More So When Harder',
    teaser:
      'A 2024 BMJ review of 14,170 people found moderate benefits from several kinds of exercise, comparable to therapy and medication, though most of the trials carried a high risk of bias.',
    summary:
      "In 2024 Michael Noetel and colleagues gathered 218 randomized trials with 14,170 people who had clinical depression and compared kinds of exercise with each other, with therapy, with antidepressants and with control conditions. Compared with active controls such as usual care, walking or jogging gave a moderate reduction in depression (Hedges' g 0.62), followed by yoga (0.55), strength training (0.49), mixed aerobic exercise (0.43) and tai chi or qigong (0.42). The harder the exercise prescribed, the larger the benefit, though even gentle walking and yoga helped. Strength training and yoga were the kinds people were most likely to keep doing. Exercise worked about as well for people with other illnesses as without, and for mild as for more severe depression. The caveat is in the trials themselves: only one met Cochrane's criteria for low risk of bias, and participants always know they are exercising, so expectations play a part. The authors rated confidence as low for walking or jogging and very low for the rest. Read with the existing entry on exercise and depression, the fair summary is that exercise is a treatment in its own right that can sit beside therapy and medication, with weaker evidence than either, and that the claim it beats them goes beyond what the trials show. For someone who is depressed, the hard part is starting, which is where behavioural activation and small planned sessions help. Life > Movement and Schedules > Exercise can hold a plan, and Trends > Movement shows it over the weeks without a target to fall short of.",
    citations: [
      {
        source:
          'Noetel M, Sanders T, Gallardo-Gómez D, et al. 2024: Effect of exercise for depression: systematic review and network meta-analysis of randomised controlled trials (BMJ 384:e075847)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/38355154/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'mentalhealth-exercise-honest-evidence',
      'neurogenesis-bdnf-exercise',
      'mentalhealth-treat-behavioural-activation',
      'mind-trial-exercise-and-the-hippocampus',
      'lifestyle-sedentary-behavior',
    ],
  },
  {
    id: 'mentalhealth-treat-relapse-prevention',
    category: 'basicHealth',
    title: 'Mindfulness-Based Cognitive Therapy Lowers the Chance of Depression Coming Back by About a Third',
    teaser:
      'For people who have had depression more than once, an eight-week mindfulness course cut relapse over the next 60 weeks, and did slightly better than other active treatments including antidepressants.',
    summary:
      "Depression often returns: a person who has had two or three episodes is more likely than not to have another. Mindfulness-based cognitive therapy (MBCT) was built for exactly this. It is usually an eight-week group course that combines mindfulness practice (noticing thoughts and body sensations without being carried along by them) with parts of CBT, aimed at catching the early slide of low mood before it becomes an episode. In 2016 Willem Kuyken and colleagues pooled individual patient data from 9 randomized trials with 1,258 people with recurrent depression who were currently well or mostly well. Over 60 weeks, those who had MBCT were less likely to relapse than those who did not (hazard ratio 0.69, about a 31% lower risk), and also did better than those given other active treatments, including staying on antidepressants (hazard ratio 0.79). People with more leftover symptoms at the start seemed to gain the most. These trials are of people who had already recovered, so MBCT is a way of staying well rather than a first treatment for a current episode. It is recommended for recurrent depression by NICE and offered by many health services, and it can be combined with continuing medication. Knowing one's early warning signs, which differ from person to person (sleep slipping, pulling back from people, irritability, losing interest in food), is part of any relapse plan, and a short note in Signals > General Note when they appear makes them easier to see later.",
    citations: [
      {
        source:
          'Kuyken W, Warren FC, Taylor RS, et al. 2016: Efficacy of mindfulness-based cognitive therapy in prevention of depressive relapse: an individual patient data meta-analysis from randomized trials (JAMA Psychiatry 73(6):565-74)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/27119968/',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'mentalhealth-treat-combined',
      'mentalhealth-treat-therapy-cbt',
      'mentalhealth-help-using-this-app',
    ],
  },
  {
    id: 'mentalhealth-treat-stopping-safely',
    category: 'basicHealth',
    title: 'Antidepressant Withdrawal Can Be Mistaken for Depression Returning, Which Is Why Stopping Is Planned With the Prescriber',
    teaser:
      'Stopping an antidepressant quickly can cause dizziness, "brain zaps", low mood and anxiety. A 2019 analysis argued for slower, smaller steps than older guidelines advised.',
    summary:
      "Every class of antidepressant can cause withdrawal symptoms when it is stopped or the dose is cut, and with SSRIs and SNRIs these are common: dizziness, electric-shock sensations often called brain zaps, nausea, flu-like feelings, vivid dreams, irritability, anxiety and low mood. Some of these look like depression returning, so a person who stops and feels worse can conclude they still need the medicine when part of what they feel is withdrawal, and the reverse can happen too. In 2019 Mark Horowitz and David Taylor reviewed the evidence and pointed out that the short tapers older guidelines advised, two to four weeks, showed little benefit over stopping abruptly. Using brain imaging data on how SSRIs occupy their target, they showed that the last small doses have a large effect, and argued for tapering slowly over months, in steps that get smaller as the dose falls, down to doses much lower than the smallest standard tablet before stopping. The UK's Royal College of Psychiatrists and NICE updated their advice afterwards to recognise that withdrawal can be severe and long-lasting for some people. Deciding whether and when to stop is a decision for the person and their prescriber together, and this entry describes what the research says without being a plan for anybody. A prescriber can arrange liquid forms or smaller tablets to make gradual steps possible. If a dose change is planned, Life > My Meds can record the start date of each new dose, and Signals can hold how the weeks after it feel, so the prescriber sees the pattern rather than a memory of it.",
    citations: [
      {
        source: 'Horowitz MA, Taylor D 2019: Tapering of SSRI treatment to mitigate withdrawal symptoms (Lancet Psychiatry 6(6):538-546)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30850328/',
      },
      {
        source: 'National Institute for Health and Care Excellence (NICE): Depression in adults, treatment and management, guideline NG222 (2022)',
        url: 'https://www.nice.org.uk/guidance/ng222',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['mentalhealth-treat-antidepressants', 'mentalhealth-treat-relapse-prevention'],
  },

  // ---------------------------------------------------------------------
  // Loneliness, Connection & Grief
  // ---------------------------------------------------------------------
  {
    id: 'mentalhealth-connect-loneliness-and-survival',
    category: 'basicHealth',
    title: 'People With Stronger Social Ties Were 50% More Likely to Survive Over the Years Studied',
    teaser:
      'Across 148 studies and more than 300,000 people, social connection predicted survival about as strongly as well-known risks such as smoking and inactivity.',
    summary:
      "In 2010 Julianne Holt-Lunstad and colleagues pooled 148 studies that followed 308,849 people for an average of seven and a half years. People with stronger social relationships were 50% more likely to be alive at the end (odds ratio 1.50), and the more complete measures of social life (how integrated a person was in a network of family, friends and groups) showed the strongest link. In 2015 the same group separated three things that are often blurred together: social isolation (few contacts), loneliness (the painful feeling of having less connection than a person wants) and living alone. Across 70 studies, each was linked to a higher risk of dying over the follow-up: 29% for isolation, 26% for loneliness and 32% for living alone. A person can be isolated without feeling lonely, or lonely in a crowded house, and both matter. These are observational studies, so they cannot prove that loneliness itself shortens life; illness, depression and poverty can cause isolation as well as follow it, though the link held after adjusting for health at the start. Proposed pathways include higher blood pressure and inflammation, worse sleep, less physical activity and nobody noticing when something is wrong. Loneliness is also tied to depression and to dementia, which the Keeping the Mind Sharp topic covers. For someone with a long-term illness, the illness itself often shrinks social life, which is worth telling a doctor or the people around them.",
    citations: [
      {
        source: 'Holt-Lunstad J, Smith TB, Layton JB 2010: Social relationships and mortality risk: a meta-analytic review (PLoS Med 7(7):e1000316)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20668659/',
      },
      {
        source:
          'Holt-Lunstad J, Smith TB, Baker M, et al. 2015: Loneliness and social isolation as risk factors for mortality: a meta-analytic review (Perspect Psychol Sci 10(2):227-37)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25910392/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'mentalhealth-connect-what-helps',
      'mind-risk-depression-and-isolation',
      'mind-active-staying-social',
      'mentalhealth-mood-stress-in-the-body',
    ],
  },
  {
    id: 'mentalhealth-connect-what-helps',
    category: 'basicHealth',
    title: 'About Half of US Adults Reported Loneliness, and the Fifteen Cigarettes Comparison Is Looser Than the Headlines',
    teaser:
      'The 2023 US Surgeon General advisory called loneliness an epidemic. Its numbers stand, its most quoted comparison is softer than reported, and small regular contact is what it recommends.',
    summary:
      "In May 2023 the US Surgeon General issued an advisory, Our Epidemic of Loneliness and Isolation, reporting that about half of US adults said they had experienced loneliness and that the problem predated the COVID-19 pandemic. It linked a lack of social connection to higher risks of heart disease, stroke, depression, anxiety and dementia, and to earlier death. Its most quoted line compared the effect on mortality to smoking up to 15 cigarettes a day. That comparison came from setting the Holt-Lunstad results beside a separate analysis of light smoking, and critics have pointed out that it is a rough equivalence across different studies rather than a measured one, so it is better read as a way of saying the risk is serious than as a precise number. The advisory's recommendations for individuals are modest and practical: spend time each day reaching out to a friend or family member, reduce the distractions that crowd out conversation, join a group built around something a person cares about (a faith community, a club, volunteering), and seek help from a doctor when loneliness is persistent or tied to depression. Trials of programmes to reduce loneliness show mixed results, with the clearest benefit from approaches that change how people think about social situations and from ones that give people a regular reason to meet. Within this app, Interests holds the things a person does and the groups they do them with, Life > Projects can hold something done with other people, and Schedules > Appointments works as well for a weekly coffee as for a doctor.",
    citations: [
      {
        source: 'US Surgeon General 2023: Our Epidemic of Loneliness and Isolation, the US Surgeon General\'s Advisory on the Healing Effects of Social Connection and Community',
        url: 'https://www.hhs.gov/sites/default/files/surgeon-general-social-connection-advisory.pdf',
      },
      {
        source: 'Holt-Lunstad J, Smith TB, Layton JB 2010: Social relationships and mortality risk: a meta-analytic review (PLoS Med 7(7):e1000316)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20668659/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['mentalhealth-connect-loneliness-and-survival', 'mind-active-staying-social', 'garden-mental-health-benefits'],
  },
  {
    id: 'mentalhealth-grief-prolonged-grief',
    category: 'basicHealth',
    title: 'Most Grief Eases With Time, and About 1 in 10 Bereaved People Develop Prolonged Grief Disorder',
    teaser:
      'Since 2022 the US psychiatric manual recognises grief that stays as intense a year on as at the start and stops a person living their life. It is treatable, and it is different from depression.',
    summary:
      "Grief after a death is not an illness. It comes in waves, it can include sadness, guilt, anger, numbness, poor sleep and a pull toward the person who died, and for most people its sharpest edge softens over months while the love and the loss remain. For a smaller group it does not soften. In 2022 the DSM-5-TR, the US psychiatric diagnostic manual, added prolonged grief disorder after Holly Prigerson and colleagues validated criteria for it. In adults, it can be diagnosed when, at least 12 months after the death (6 months for children), a person has intense yearning for or preoccupation with the person who died nearly every day, together with at least three of: feeling part of oneself has died, marked disbelief, avoiding reminders, intense emotional pain, trouble rejoining life, emotional numbness, feeling life is meaningless, and intense loneliness, and when this is causing serious difficulty in daily life beyond what is expected in the person's culture. The World Health Organization's ICD-11 has a similar diagnosis. Studies put it at around 1 in 10 bereaved adults, higher after a sudden or violent death or the death of a child. It overlaps with depression and PTSD but is distinct, and grief-focused therapies help more than standard depression treatment. Signs worth speaking to a doctor about at any point are thoughts of wanting to die to be with the person, being unable to look after oneself, or heavy drinking. Days Until on Life can hold an anniversary that a person wants to prepare for rather than be caught by.",
    citations: [
      {
        source:
          'Prigerson HG, Boelen PA, Xu J, et al. 2021: Validation of the new DSM-5-TR criteria for prolonged grief disorder and the PG-13-Revised (PG-13-R) scale (World Psychiatry 20(1):96-106)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/33432758/',
      },
      {
        source: 'Prigerson HG, Kakarala S, Gang J, Maciejewski PK 2021: History and status of prolonged grief disorder as a psychiatric diagnosis (Annu Rev Clin Psychol 17:109-126)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/33524263/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['mentalhealth-mood-depression-what-it-is', 'mentalhealth-connect-loneliness-and-survival', 'mentalhealth-help-around-the-world'],
  },

  // ---------------------------------------------------------------------
  // Eating Disorders
  // ---------------------------------------------------------------------
  {
    id: 'mentalhealth-ed-what-they-are',
    category: 'basicHealth',
    title: 'Eating Disorders Are Serious Mental Illnesses That Most People Who Have Them Never Get Treated For',
    teaser:
      'Binge eating disorder is the most common, ahead of bulimia and anorexia. A US survey found most people with an eating disorder had never sought treatment for it.',
    summary:
      "Eating disorders are mental illnesses in which eating, weight or body shape come to dominate a person's thoughts and behaviour, with serious effects on the body. The main ones are anorexia nervosa (restricting food to the point of a dangerously low weight, with intense fear of gaining weight), bulimia nervosa (repeated episodes of eating a large amount with a sense of losing control, followed by vomiting, laxatives, fasting or over-exercise), binge eating disorder (the same loss-of-control binges without the compensating behaviour), and avoidant/restrictive food intake disorder or ARFID (eating very little or very few foods for reasons unrelated to weight, such as fear of choking or vomiting, sensory sensitivity or lack of interest). The US National Comorbidity Survey Replication interviewed 9,282 adults in 2001 to 2003. Lifetime prevalence was 0.9% for anorexia, 1.5% for bulimia and 3.5% for binge eating disorder among women, and 0.3%, 0.5% and 2.0% among men. All three ran alongside other mental health conditions, most people with bulimia or binge eating disorder reported that it got in the way of their lives, and only a minority had ever sought treatment. Eating disorders affect every age, sex, body size and background. Most people with one are not underweight, and someone can be very ill at an ordinary weight. They are treatable, and the earlier treatment starts the better it tends to go. The entries that follow cover each disorder, the people with gut and autoimmune conditions who are at higher risk, and what food tracking apps, this one included, can do to someone vulnerable.",
    citations: [
      {
        source:
          'Hudson JI, Hiripi E, Pope HG Jr, Kessler RC 2007: The prevalence and correlates of eating disorders in the National Comorbidity Survey Replication (Biol Psychiatry 61(3):348-58)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/16815322/',
      },
      {
        source: 'National Institute for Health and Care Excellence (NICE): Eating disorders, recognition and treatment, guideline NG69 (2017, updated 2020)',
        url: 'https://www.nice.org.uk/guidance/ng69',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'mentalhealth-ed-anorexia-mortality',
      'mentalhealth-ed-binge-eating',
      'mentalhealth-ed-arfid',
      'mentalhealth-ed-tracking-apps',
      'mentalhealth-ed-warning-signs-and-treatment',
      'pcos-eating-disorder-risk-real-data',
    ],
  },
  {
    id: 'mentalhealth-ed-anorexia-mortality',
    category: 'basicHealth',
    title: 'Anorexia Nervosa Carries a Death Rate Nearly Six Times Higher Than Expected, and One in Five of Those Deaths Is Suicide',
    teaser:
      'A pooled analysis of 36 studies found anorexia among the deadliest mental illnesses. Bulimia and other eating disorders carried about twice the expected death rate.',
    summary:
      "In 2011 Jon Arcelus and colleagues pooled 36 studies that followed people with eating disorders over time. People with anorexia nervosa died at 5.86 times the rate expected for people of the same age and sex, about 5 deaths per 1,000 person-years, and one in five of those who died had died by suicide. Bulimia nervosa and other eating disorders each carried about twice the expected death rate (standardized mortality ratios 1.93 and 1.92). Deaths in anorexia come from starvation's effects on the heart (slow and irregular heartbeats), from the electrolyte disturbances that vomiting and laxatives cause, and from suicide. The body changes run wide: loss of bone density that may not fully recover, missed periods and fertility problems, low blood pressure, fainting, cold intolerance, fine body hair, constipation and a slowed stomach. The risk of death was higher when the illness started later or ran longer, which is one reason early treatment matters. Recovery is possible, often over years. For adults, NICE recommends eating-disorder-focused CBT, the Maudsley model of anorexia treatment for adults (MANTRA) or specialist supportive clinical management, and for children and teenagers, family therapy focused on anorexia, in which parents take a central role in restoring eating. Refeeding someone who is severely underweight is itself dangerous and needs medical supervision. Fainting, chest pain, a very slow pulse or confusion in someone who is restricting are reasons for urgent medical care.",
    citations: [
      {
        source:
          'Arcelus J, Mitchell AJ, Wales J, Nielsen S 2011: Mortality rates in patients with anorexia nervosa and other eating disorders: a meta-analysis of 36 studies (Arch Gen Psychiatry 68(7):724-31)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/21727255/',
      },
      {
        source: 'National Institute for Health and Care Excellence (NICE): Eating disorders, recognition and treatment, guideline NG69 (2017, updated 2020)',
        url: 'https://www.nice.org.uk/guidance/ng69',
      },
    ],
    overallTier: 'strong',
    relatedIds: ['mentalhealth-ed-what-they-are', 'mentalhealth-ed-warning-signs-and-treatment', 'mentalhealth-help-around-the-world'],
  },
  {
    id: 'mentalhealth-ed-binge-eating',
    category: 'basicHealth',
    title: 'Binge Eating Disorder Is the Most Common Eating Disorder, and Dieting Harder Usually Makes It Worse',
    teaser:
      'About 3.5% of women and 2% of men have it in their lifetime. It is driven by loss of control, often follows strict dieting, and responds to CBT made for eating disorders.',
    summary:
      "Binge eating disorder means repeated episodes, at least once a week for three months, of eating an amount of food much larger than most people would in a similar time, with a sense of being unable to stop. Episodes often involve eating fast, eating when not hungry, eating alone out of embarrassment, and feeling disgusted, guilty or low afterwards. Unlike bulimia, there is no regular vomiting, laxative use or fasting to compensate. In the US National Comorbidity Survey Replication it was the most common eating disorder, with lifetime prevalence of 3.5% in women and 2.0% in men, and it was linked to severe obesity, though many people with it are not heavy. It is often set off and kept going by a cycle of strict restriction, intense hunger and craving, a binge, shame, and renewed restriction, which is why stricter dieting usually makes it worse rather than better. Low mood, stress and boredom are common triggers. NICE recommends a guided self-help programme based on CBT for eating disorders as the first step, then group or individual CBT for eating disorders if needed, which works on regular eating (three meals and planned snacks, so long gaps do not build up to a binge), on triggers and on the harsh thoughts about weight and shape. Some medicines help in some countries. Weight loss is not the aim of the first treatment, and the guidelines say so directly. For someone with binge eating disorder, a diet plan with a calorie target can be the wrong tool, and talking to a clinician before starting one is worth doing.",
    citations: [
      {
        source:
          'Hudson JI, Hiripi E, Pope HG Jr, Kessler RC 2007: The prevalence and correlates of eating disorders in the National Comorbidity Survey Replication (Biol Psychiatry 61(3):348-58)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/16815322/',
      },
      {
        source: 'National Institute for Health and Care Excellence (NICE): Eating disorders, recognition and treatment, guideline NG69 (2017, updated 2020)',
        url: 'https://www.nice.org.uk/guidance/ng69',
      },
    ],
    overallTier: 'strong',
    relatedIds: ['mentalhealth-ed-what-they-are', 'mentalhealth-ed-tracking-apps', 'mentalhealth-glycemic-instability-mood', 'pcos-eating-disorder-risk-real-data'],
  },
  {
    id: 'mentalhealth-ed-arfid',
    category: 'basicHealth',
    title: 'ARFID Is Restricted Eating With No Weight or Shape Concern Behind It, Driven by Fear, Senses or Low Interest',
    teaser:
      'Avoidant/restrictive food intake disorder covers people who eat too little or too few foods because of fear of choking or pain, sensory sensitivity, or simple lack of interest in eating.',
    summary:
      "Avoidant/restrictive food intake disorder (ARFID) was added to the US psychiatric manual in 2013. A person with ARFID eats too little, or too narrow a range of foods, to meet their needs, leading to weight loss or poor growth, nutritional deficiency, dependence on supplements or nutrition drinks, or marked difficulty eating with other people, and the restriction is not about weight or body shape. Three drivers are recognised, and a person can have more than one: fear of what eating might bring (choking, vomiting, pain or a reaction), sensitivity to the taste, smell, texture or look of food, and a low interest in eating or in food at all. It is more common in autistic people, people with ADHD and people with anxiety disorders, and the entry on autism and ARFID goes into that overlap. It is not picky eating that a child grows out of; it can persist into adulthood and cause serious malnutrition. ARFID is also common in people with gut conditions, because a person who has had pain, urgency or a reaction after eating can learn to fear food, which the next entry takes up. Diagnosis needs a clinician to rule out medical causes for the restriction first. Treatment is newer and less studied than for anorexia or bulimia; CBT adapted for ARFID, built on gradual, planned exposure to feared foods, and family-based approaches for children are the most used. A person whose list of safe foods keeps shrinking, for whatever reason, has something worth raising with a doctor.",
    citations: [
      {
        source:
          'Burton Murray H, Riddle M, Rao F, et al. 2022: Eating disorder symptoms, including avoidant/restrictive food intake disorder, in patients with disorders of gut-brain interaction (Neurogastroenterol Motil 34(8):e14258)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/34693609/',
      },
      {
        source: 'National Institute for Health and Care Excellence (NICE): Eating disorders, recognition and treatment, guideline NG69 (2017, updated 2020)',
        url: 'https://www.nice.org.uk/guidance/ng69',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'neuro-autism-arfid-overlap',
      'neuro-autism-texture-and-narrow-eating',
      'mentalhealth-ed-gut-and-autoimmune',
      'mentalhealth-ed-what-they-are',
    ],
  },
  {
    id: 'mentalhealth-ed-gut-and-autoimmune',
    category: 'basicHealth',
    title: 'Between 13% and 55% of Adults With Gut Conditions Show Disordered Eating, Most of All in IBS-Type Conditions',
    teaser:
      'People with IBS, coeliac disease and IBD are asked to watch everything they eat. For some, that watchfulness turns into fear and restriction that harm them, and nearly 4 in 10 IBS-type patients in one clinic had ARFID symptoms.',
    summary:
      "A person with a gut condition is told to pay close attention to food, and for good reason: gluten in coeliac disease, FODMAPs in IBS, certain foods during an IBD flare. For some people, that attention grows into something that harms them, such as eating fewer and fewer foods, fear before every meal, skipping meals before going out, or losing weight they cannot afford. A 2022 systematic review of 17 studies found disordered eating in 13% to 55% of adults with gastrointestinal disorders, higher in disorders of gut-brain interaction (IBS and functional dyspepsia) than in coeliac disease or IBD, and more common in younger people, women, and people with worse symptoms, anxiety or depression. In a US gastroenterology clinic study of 93 adults with disorders of gut-brain interaction, 39.8% had ARFID symptoms and 12.9% had clinically significant weight or shape concerns. Most of those with ARFID symptoms (86%) were not underweight, so weight alone misses them. The same risk applies to anyone on a strict elimination diet, including the autoimmune protocol and the long avoidance lists that circulate for autoimmune conditions. This app's food scoring and safe food lists are built to help a person eat more widely with confidence, and the condition entries are written to keep restriction to what the evidence supports. A low FODMAP diet, for example, is meant to be a short elimination followed by reintroduction, never a permanent list. If a person's safe foods are shrinking, eating has become frightening, or weight is falling, a gastroenterologist or dietitian should hear about it, and a psychologist who knows gut conditions can help.",
    citations: [
      {
        source:
          'Peters JE, Basnayake C, Hebbard GS, et al. 2022: Prevalence of disordered eating in adults with gastrointestinal disorders: a systematic review (Neurogastroenterol Motil 34(8):e14278)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/34618988/',
      },
      {
        source:
          'Burton Murray H, Riddle M, Rao F, et al. 2022: Eating disorder symptoms, including avoidant/restrictive food intake disorder, in patients with disorders of gut-brain interaction (Neurogastroenterol Motil 34(8):e14258)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/34693609/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'mentalhealth-ed-arfid',
      'mentalhealth-ed-orthorexia',
      'mentalhealth-ed-tracking-apps',
      'diet-aip',
      'ibs-biopsychosocial-model',
      'celiac-depression-anxiety-mental-health',
      'ibd-depression-anxiety-bidirectional-real-data',
    ],
  },
  {
    id: 'mentalhealth-ed-orthorexia',
    category: 'basicHealth',
    title: 'Orthorexia, an Unhealthy Fixation on Eating Healthily, Is Described but Not Yet an Agreed Diagnosis',
    teaser:
      'The term covers people whose rules about food purity grow until they cause malnutrition, anxiety or isolation. Research is early and its measures are weak, but the pattern is recognised by clinicians.',
    summary:
      "The physician Steven Bratman coined the term orthorexia nervosa in 1997, in a yoga magazine, to describe people whose drive to eat only pure or healthy food had become harmful. The focus is on the quality of food, rather than its amount: cutting out more and more food groups, rigid rules, anxiety or guilt when a rule is broken, hours spent planning and researching food, and avoiding meals with others. When it goes far enough it causes weight loss, deficiencies and isolation. A 2016 review by Thomas Dunn and Steven Bratman traced the research and proposed diagnostic criteria, a compulsive focus on healthy eating with distress over breaking self-imposed rules, together with harm: malnutrition, weight loss or serious difficulty in daily life. Orthorexia is not in the DSM or ICD, the questionnaires used to measure it have serious flaws, and prevalence estimates swing so widely they mean little, so the evidence here is weak. Clinicians do see the pattern, however, and it overlaps with anorexia, ARFID and OCD. It matters for this app because healthy eating is the aim here and some people with autoimmune conditions are told to remove many foods at once. The line is whether eating rules are serving a person's health and life, or have started to cost them both. Rules that keep growing past what a doctor or the evidence supports, distress that a meal out causes, and a shrinking social life around food are signs to talk to someone, whether a dietitian, a doctor or a psychologist.",
    citations: [
      {
        source: 'Dunn TM, Bratman S 2016: On orthorexia nervosa: a review of the literature and proposed diagnostic criteria (Eat Behav 21:11-7)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26724459/',
      },
    ],
    overallTier: 'weak',
    relatedIds: ['mentalhealth-ed-gut-and-autoimmune', 'mentalhealth-ed-tracking-apps', 'diet-aip', 'mentalhealth-ocd-gut-brain-inflammation'],
  },
  {
    id: 'mentalhealth-ed-type1-insulin-restriction',
    category: 'basicHealth',
    title: 'Some People With Type 1 Diabetes Skip Insulin to Lose Weight, and Fear of Weight Gain Is What Drives It',
    teaser:
      'Insulin restriction, sometimes called diabulimia, is dangerous and hidden. In an 11-year follow-up, fear of the weight gain that comes with better blood sugar predicted who started and who stopped.',
    summary:
      "Insulin moves sugar from the blood into the body's cells, and without enough of it the sugar is lost in the urine and the body breaks down fat and muscle. Some people with type 1 diabetes discover that taking less insulin than prescribed causes weight loss, and use it deliberately. This is sometimes called diabulimia, a name with no formal diagnosis behind it. The practice is dangerous: it raises HbA1c, brings on diabetic ketoacidosis, and speeds up damage to the eyes, kidneys and nerves, and an earlier study by the same group found women who restricted insulin had about three times the risk of dying over 11 years. Ann Goebel-Fabbri and colleagues followed 207 women with type 1 diabetes for 11 years. Of 60 who were restricting insulin at the start, 20 had stopped by follow-up, and 34 women who had not been restricting had started. The strongest factor in both directions was fear of the weight gain that comes with better blood sugar control, along with difficulty managing diabetes day to day. The careful attention to food and numbers that diabetes demands can make this worse, much as it can with other eating disorders. Signs include HbA1c rising without explanation, repeated ketoacidosis, weight loss, avoiding clinic visits, and secrecy about injections or pump use. It is treatable, best by a team that understands both diabetes and eating disorders, and the diabetes team is the place to start. The existing type 1 entry on disordered eating goes into the diabetes side.",
    citations: [
      {
        source:
          'Goebel-Fabbri AE, Anderson BJ, Fikkan J, et al. 2011: Improvement and emergence of insulin restriction in women with type 1 diabetes (Diabetes Care 34(3):545-50)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/21266653/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['type1-disordered-eating-insulin-omission', 'type1-diabetes-distress-psychological-burden', 'type1-hba1c-time-in-range', 'mentalhealth-ed-tracking-apps'],
  },
  {
    id: 'mentalhealth-ed-tracking-apps',
    category: 'basicHealth',
    title: 'Calorie Counting and Fitness Tracking Apps Go With More Eating Disorder Symptoms in Some People, This App Included',
    teaser:
      'College students who used calorie trackers showed more eating concern and restraint. For someone with an eating disorder now or in the past, logging food may do more harm than good, and stopping is always an option.',
    summary:
      "This app is built around logging food, scoring it and showing nutrient amounts against targets, so it has to say this plainly. In a 2017 study of 493 US college students, those who used calorie tracking apps showed more eating concern and dietary restraint, after accounting for body weight, and fitness tracking was separately linked to eating disorder symptoms. The study was a snapshot, so it cannot show whether the apps caused the symptoms or people with those concerns were drawn to the apps, and the authors call it preliminary. People treated for eating disorders describe both: trackers that kept a disorder going, and trackers that crept into control of their days. For most people, logging food is a tool for learning. For someone with an eating disorder now or in the past, numbers on every food, daily totals and targets to reach can turn into the rules the disorder runs on. Signs that logging has stopped helping include anxiety if a meal cannot be logged, feeling a day is ruined by a number, logging becoming a way to restrict, and checking totals over and over. Nothing in this app requires food to be logged. A person can stop logging at any time and still use the rest of it, the Home sections that show nutrient totals can be turned off in Profile, and the daily-living parts (Life, Schedules, reminders, Interests) work without a single food entry. Anyone in eating disorder treatment can show their clinician what they log here and decide with them whether and how to use it.",
    citations: [
      {
        source: 'Simpson CC, Mazzeo SE 2017: Calorie counting and fitness tracking technology: associations with eating disorder symptomatology (Eat Behav 26:89-92)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28214452/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'mentalhealth-ed-what-they-are',
      'mentalhealth-ed-orthorexia',
      'mentalhealth-ed-binge-eating',
      'mentalhealth-ed-warning-signs-and-treatment',
      'diet-app-agnostic-tracking',
    ],
  },
  {
    id: 'mentalhealth-ed-warning-signs-and-treatment',
    category: 'basicHealth',
    title: 'Eating Disorders Recover Best When Caught Early, and Family Therapy Is the First Treatment for Young People With Anorexia',
    teaser:
      'Warning signs are often in behaviour before weight. NICE recommends family therapy for children and teenagers with anorexia, and CBT made for eating disorders for most adults.',
    summary:
      "Eating disorders are often hidden, and the first signs are usually in behaviour rather than in weight: skipping meals or making excuses not to eat with others, cutting out whole food groups suddenly, rigid rituals around food, going to the bathroom straight after meals, excessive exercise, wearing baggy clothes, preoccupation with weight, shape or calories, hoarding food or finding wrappers hidden away, and mood changes such as irritability or withdrawal. Physical signs include weight changes in either direction, dizziness and fainting, feeling cold, missed periods, swollen cheeks or damaged tooth enamel from vomiting, and in children not growing as expected. NICE's guideline asks that people be assessed and treated without waiting for weight to reach a threshold, because a normal weight does not rule out a serious eating disorder. For children and young people with anorexia, it recommends family therapy focused on the eating disorder as the first treatment, with parents taking charge of meals at first, and for bulimia, family therapy or CBT for eating disorders. For adults, it recommends CBT for eating disorders for bulimia and binge eating disorder, and CBT, MANTRA or specialist supportive management for anorexia. Recovery often takes time and can include setbacks. For a parent or friend, the most helpful first step is a calm, private conversation about what they have noticed, focused on worry about the person rather than about food or weight, followed by a visit to a doctor. In the US, the ANAD helpline and NEDA's resources help families find care; in the UK, Beat runs helplines.",
    citations: [
      {
        source: 'National Institute for Health and Care Excellence (NICE): Eating disorders, recognition and treatment, guideline NG69 (2017, updated 2020)',
        url: 'https://www.nice.org.uk/guidance/ng69',
      },
      {
        source:
          'Arcelus J, Mitchell AJ, Wales J, Nielsen S 2011: Mortality rates in patients with anorexia nervosa and other eating disorders: a meta-analysis of 36 studies (Arch Gen Psychiatry 68(7):724-31)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/21727255/',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'mentalhealth-ed-what-they-are',
      'mentalhealth-ed-anorexia-mortality',
      'mentalhealth-ed-tracking-apps',
      'mentalhealth-help-around-the-world',
      'oral-care-signs-to-see-dentist',
    ],
  },

  // ---------------------------------------------------------------------
  // Finding Help
  // ---------------------------------------------------------------------
  {
    id: 'mentalhealth-help-around-the-world',
    category: 'basicHealth',
    title: 'Free Crisis Lines Answer Around the Clock in Most Countries, Including 988 in the US and Línea de la Vida in Mexico',
    teaser:
      'A crisis line is for anyone who is struggling or worried about somebody else, without needing to be at the edge. Several countries have one number for all of it.',
    summary:
      "A crisis line is a free, confidential call or text with a trained person, for anyone thinking about suicide, in emotional distress, or worried about somebody else. Nobody has to be at the point of acting to call. In the United States, 988, the Suicide & Crisis Lifeline, answers calls and texts at 988 around the clock, with Spanish available, and SAMHSA's National Helpline, 1-800-662-4357, gives free referrals for mental health and substance use treatment at any hour. In Mexico, Línea de la Vida, 800 911 2000, run by the national mental health and addictions commission (CONASAMA), is free, confidential and open 24 hours a day, every day of the year, for suicidal thoughts, emotional crisis, questions about mental health and help with substance use. In the UK and Ireland, Samaritans answer at 116 123 at any hour. In Australia, Lifeline answers at 13 11 14. Canada uses 988 as well. For other countries, findahelpline.com lists free, verified lines by country and topic. In an immediate emergency, where someone has hurt themselves or is about to, call the local emergency number (911 in the US and Mexico, 999 or 112 in the UK, 000 in Australia) or go to the nearest emergency department. Life > Emergency can hold these numbers and the people to call, so they are there on a hard day without searching. Outside a crisis, a family doctor is the usual starting point for depression, anxiety, an eating disorder or grief that will not ease, and the entries in this topic give a person words for what to ask.",
    citations: [
      {
        source: '988 Suicide & Crisis Lifeline',
        url: 'https://988lifeline.org/',
      },
      {
        source: 'Comisión Nacional de Salud Mental y Adicciones (CONASAMA), Secretaría de Salud de México: Línea de la Vida 800 911 2000',
        url: 'https://www.gob.mx/salud/conasama',
      },
      {
        source: 'Find A Helpline: free, confidential support lines by country',
        url: 'https://findahelpline.com/',
      },
      {
        source: 'Samaritans (UK and Ireland)',
        url: 'https://www.samaritans.org/',
      },
    ],
    overallTier: 'strong',
    relatedIds: ['mentalhealth-when-to-seek-help', 'mentalhealth-help-talking-to-a-doctor', 'mentalhealth-mood-depression-what-it-is'],
  },
  {
    id: 'mentalhealth-help-talking-to-a-doctor',
    category: 'basicHealth',
    title: 'Nine Short Questions, the PHQ-9, Are How Many Doctors Measure Depression, and Bringing Notes Helps',
    teaser:
      'The PHQ-9 asks how often nine symptoms happened over the last two weeks. Knowing it, and bringing a few written notes, makes a short appointment go further.',
    summary:
      "Many family doctors measure depression with the Patient Health Questionnaire, the PHQ-9, which Kurt Kroenke and colleagues validated in 2001 in 6,000 patients in primary care and obstetrics clinics. It asks how often, over the last two weeks, a person has been bothered by nine things: little interest or pleasure in doing things, feeling down or hopeless, trouble with sleep, tiredness, poor appetite or overeating, feeling bad about oneself, trouble concentrating, moving or speaking slowly or being restless, and thoughts of being better off dead or of self-harm. Each is scored 0 to 3, giving a total from 0 to 27, where 5, 10, 15 and 20 mark mild, moderate, moderately severe and severe. A similar seven-question scale, the GAD-7, is used for anxiety. These scales are a starting point for a conversation and a way to see change over time, and a score is never a diagnosis on its own. A short appointment goes further with a few notes: how long things have been like this, what has changed (sleep, appetite, work, people, drinking), anything that has helped or made it worse, every medicine and supplement taken, any family history, and whether there have been thoughts of suicide, which a doctor will always want to know and will not be shocked by. It helps to say plainly what a person wants from the visit, whether that is a referral for therapy, a discussion of medication, blood tests, or simply to be heard. Insights > Before Your Appointment gathers what the app holds for a visit, Reports can produce a summary to print or share, and Signals > General Note can hold mood, energy and stress day by day in a person's words.",
    citations: [
      {
        source: 'Kroenke K, Spitzer RL, Williams JB 2001: The PHQ-9: validity of a brief depression severity measure (J Gen Intern Med 16(9):606-13)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/11556941/',
      },
    ],
    overallTier: 'strong',
    relatedIds: ['mentalhealth-mood-physical-causes', 'mentalhealth-help-around-the-world', 'mentalhealth-help-using-this-app'],
  },
  {
    id: 'mentalhealth-help-using-this-app',
    category: 'basicHealth',
    title: 'What This App Can Hold for Mental Health, and What It Never Does',
    teaser:
      'Notes on mood, a breathing pacer, routines with reminders, and a record to take to a doctor. No mood score, no diagnosis, and no claim that a food caused a feeling.',
    summary:
      "This app was not built as a mental health app, and it does not diagnose, score or treat anything. Several parts of it do fit what the evidence in this topic supports, and here is where they are. Signals > General Note holds a dated note in a person's words, with mood, energy and stress marked if they want, so a slide or a recovery is visible over weeks rather than remembered. Signals > Calm has a breathing pacer and relaxation scripts read aloud, for a hard moment, and records nothing. Life > Routines, Schedules and reminders can hold the small planned activities that behavioural activation is built on, and Did I Do It marks them done with no streak to break and no score. Interests holds the things a person enjoys or used to, and Life > Projects can hold something done with other people. Life > My Meds keeps antidepressants and other medicines on the interaction checks and records when each dose started, and Life > Emergency holds crisis numbers and the people to call. Trends > Pattern Finder can set mood notes beside meals, sleep and flares, and it only ever says what happened alongside what; it never says a food caused a feeling, because a sample of one person cannot show that. Insights > Before Your Appointment and Reports carry all of it to a doctor or therapist. For someone with an eating disorder now or in the past, food logging can do harm, and the entry on tracking apps says what to do about that. And whenever things are bad, Finding Help has the numbers.",
    citations: [
      {
        source:
          'Ekers D, Webster L, Van Straten A, et al. 2014: Behavioural activation for depression; an update of meta-analysis of effectiveness and sub group analysis (PLoS One 9(6):e100100)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24936656/',
      },
      {
        source: 'Kroenke K, Spitzer RL, Williams JB 2001: The PHQ-9: validity of a brief depression severity measure (J Gen Intern Med 16(9):606-13)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/11556941/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'mentalhealth-treat-behavioural-activation',
      'mentalhealth-ed-tracking-apps',
      'mentalhealth-help-around-the-world',
      'mentalhealth-help-talking-to-a-doctor',
      'mentalhealth-tying-together',
    ],
  },
];
