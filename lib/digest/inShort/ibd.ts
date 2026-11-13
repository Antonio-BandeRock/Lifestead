// In short lines for the ibd reading, keyed by entry id. Grade 8 or
// under, checked by scripts/test_in_short.js. Spanish lives in the reading
// table (lib/translations/es/reading-*.ts) like every other reading line.
export const LINES: Readonly<Record<string, string>> = {
  'glossary-psc':
    'PSC is a rare, serious liver disease that scars the bile ducts. It is more common in people with IBD, mainly ulcerative colitis.',
  'glossary-tpmt':
    'TPMT is an enzyme that breaks down drugs like azathioprine. People with low TPMT, a trait they are born with, face more side effects, so it is tested first.',
  'glossary-uc-crohns':
    "IBD covers two diseases. Ulcerative colitis stays in the colon. Crohn's can strike anywhere in the gut, often in patches.",
  'ibd-overview':
    "IBD is two diseases under one name: ulcerative colitis and Crohn's. Some findings point in opposite ways, so it matters which one a person has.",
  'ibd-smoking-paradox':
    "Smoking raises the risk of Crohn's and makes it worse. Odd as it seems, it is linked to less ulcerative colitis.",
  'ibd-een-crohns':
    "For children with mild Crohn's, a liquid formula in place of all food works about as well as steroids. It can bring the disease into remission.",
  'ibd-fiber-flare-myth':
    'Eating low fiber during an IBD flare is common advice. A check of the research found very little to back it up.',
  'ibd-fodmap-remission-symptoms':
    'Gut symptoms during IBD remission do not always mean the disease is back. Often it is IBS type trouble, and a low FODMAP diet may help.',
  'ibd-extraintestinal-manifestations':
    'Up to half of people with IBD get a problem outside the gut. Joints, skin, eyes and the bile ducts can all be affected.',
  'ibd-thyroid-comorbidity-honest-null':
    'A large German study found no overall link between IBD and autoimmune thyroid disease, with one exception. The picture is mixed.',
  'ibd-calprotectin':
    'Fecal calprotectin is a stool test that shows if the gut is inflamed. It can often stand in for a colonoscopy to check on the disease.',
  'ibd-colonoscopy-surveillance':
    'Long term colitis raises colon cancer risk. Checks usually start 8 years after symptoms begin, and yearly if PSC is also present.',
  'ibd-azathioprine-tpmt':
    'How safely your body handles azathioprine depends largely on one gene. The FDA advises a test for it before the first dose.',
  'ibd-tying-together':
    "For IBD, knowing which disease matters. Formula diets work for Crohn's in children, low fiber advice has thin support, and smoking cuts both ways.",
  'ibd-montreal-classification':
    "Doctors sort IBD with the Montreal system. Crohn's is sorted by age, place and type, and colitis by how far it reaches. This shapes treatment.",
  'ibd-extraintestinal-real-prevalence-split':
    "About 24% of people with IBD have joint, skin or eye problems. A large review breaks down the numbers for Crohn's and colitis.",
  'ibd-history-milestones':
    "Ulcerative colitis was described in 1875 and Crohn's in 1932. Gene findings in the early 2000s helped explain why they differ.",
  'ibd-pregnancy-remission-first':
    'The best sign for a healthy IBD pregnancy is having the disease calm before getting pregnant. Active disease at conception raises the risk of flares.',
  'ibd-fecal-microbiota-transplant':
    'Stool transplants from healthy donors brought remission in over half of people with colitis in some trials. Results still vary between studies.',
  'ibd-vitamin-d-deficiency-severity':
    'Low vitamin D is common in IBD and goes with more active disease, more relapses and more surgery. That is a link, not proof of a cause.',
  'ibd-hygiene-hypothesis-early-life':
    'Children with older siblings and more germs around them early in life seem to get IBD less often. This is an idea with some support, not a proven cause.',
  'ibd-anti-tnf-loss-of-response':
    'Anti TNF drugs can stop working over time, in about 13 to 21% of people each year. Often the body makes antibodies to the drug, which can be tested.',
  'ibd-iron-deficiency-anemia':
    'About 1 in 5 people with IBD have anemia, and most of the time it comes from low iron. It can be treated.',
  'ibd-sonic-combination-therapy':
    "In the SONIC trial for Crohn's, two drugs together put 57% into remission without steroids. One drug alone did so for 44% or 30%.",
  'ibd-crohns-disease-exclusion-diet':
    "For children with Crohn's, a whole food diet plus some formula worked about as well as formula alone. Kids found it easier to stick with.",
  'ibd-therapeutic-drug-monitoring':
    'In one trial, the infliximab dose was set by a blood test, not by symptoms alone. Relapses fell from 17% to 7%.',
  'ibd-smoking-cessation-real-benefit':
    "One study followed people with Crohn's who quit smoking. Their relapse risk fell to the same level as people who never smoked.",
  'ibd-elderly-onset-distinct-diagnosis-delay':
    'IBD that starts after 60 often looks milder and less typical. It takes about three times longer to diagnose than in younger adults.',
  'ibd-global-westernization-asia-rising':
    "IBD is rising fastest where diets are turning more Western, as in India and East Asia. India's cases may grow four times by 2035.",
  'ibd-global-second-generation-migrants':
    "In the UK, children of South Asian immigrants got ulcerative colitis as often as people born there. Their parents' home region has much lower rates.",
  'horizon-ibd':
    'IBD drugs are still chosen mostly by trial and error. New blood and stool tests aim to match each person to the drug most likely to work, but this is still early.',
  'horizon-ibd-darvadstrocel':
    "A fistula is a tunnel from the bowel to the skin. A stem cell shot for these in Crohn's is approved, and it healed them in over three quarters of people.",
  'ibd-depression-anxiety-bidirectional-real-data':
    'Up to a third of people with IBD have anxiety and a quarter have depression. Both are more common when the disease is active.',
  'ibd-corticosteroid-hypertension-real-data':
    'Steroids like prednisone are often needed for IBD flares. Over 30% of long term users get high blood pressure, so it is worth watching.',
  'ibd-perianal-fistula-real-data':
    "About 35% of people with Crohn's get a fistula, a tunnel from the bowel to the skin. It can affect work, relationships and sex life, not only the body.",
  'ibd-osteoporosis-bone-density':
    'Thin bones are common in IBD. They are found even in newly diagnosed people who never took steroids, so the inflammation plays a part.',
  'ibd-venous-thromboembolism-real-risk':
    'IBD raises the risk of blood clots in the veins two to three times. During an active flare, the risk is about eight times higher.',
  'ibd-ustekinumab-vedolizumab-real-comparative':
    'Two newer IBD drugs were tested side by side. They worked about the same, with one gap in one case of colitis.',
  'ibd-crohns-strictures-real-surgery-rate':
    "In Crohn's, scarring can narrow the bowel, called a stricture. Most people get one within ten years, and many then need surgery.",
  'ibd-cdiff-elevated-risk-real-data':
    'People with IBD are four to five times more likely to get C. diff, a gut infection. It can look just like a flare, so it is tested for.',
  'ibd-skin-manifestations-en-pg-real-prevalence':
    'Two skin problems can come with IBD. Tender red lumps on the shins affected 4% in one large study, and a rare, serious skin ulcer under 1%.',
  'ibd-gut-inflammation-hippocampal-neurogenesis':
    'In mice with colitis, gut inflammation slowed the growth of new brain cells in a memory area. This has not been shown in people.',
  'ibd-fermented-drinks':
    'With IBD, timing matters for fermented drinks. One that sits well in remission can be the wrong choice during a flare, so small amounts come first.',
  'ibd-creeping-fat-crohns':
    "In Crohn's, fat around the gut can grow and wrap the inflamed bowel. This \"creeping fat\" goes with more inflammation, scarring and narrowing.",
  'ibd-circadian-clock-disruption':
    'Body clock genes run lower in inflamed colon tissue. In animals, changing meal times eased gut swelling, but this has not been tested in people.',
  'ibd-enteric-hyperoxaluria-kidney-stones':
    'When IBD makes fat hard to absorb, calcium in the gut binds to fat. Then oxalate from food is freed to reach the kidneys and can form stones.',
  'complementary-ibd-acupuncture-moxibustion':
    'In a German trial, acupuncture calmed IBD more than fake acupuncture did. A 2022 trial also checked signs of swelling, but there are few trials.',
  'ibd-autism-crossover':
    'Autistic people had IBD more often in pooled data on 11 million people. IBD is rare, so the added risk is small, and this is a link, not a cause.',
};
