// In short lines for the prostateHealth reading, keyed by entry id. Grade 8 or
// under, checked by scripts/test_in_short.js. Spanish lives in the reading
// table (lib/translations/es/reading-*.ts) like every other reading line.
export const LINES: Readonly<Record<string, string>> = {
  'glossary-bph':
    'BPH is a prostate that has grown larger but is not cancer. It is very common with age and can cause trouble passing urine.',
  'glossary-brca2':
    'BRCA2 is a gene that helps repair damaged DNA. A change in it is known for breast cancer risk, and it also raises prostate cancer risk in men.',
  'glossary-psa':
    'PSA is a protein made by the prostate and measured in a blood test. It can rise from cancer, but also from BPH, swelling or normal ups and downs.',
  'glossary-psma':
    'PSMA is a protein that prostate cancer cells make much more of than healthy cells. It is now used for scans and for one approved radiation treatment.',
  'prostate-overview':
    'Two common prostate problems are covered here. BPH, a growth that is not cancer, affects most men by their 70s, and prostate cancer is common too. Both have diet links.',
  'prostate-gut-microbiome-bph':
    'Men with BPH had less varied gut bacteria and certain shifts in them, one review found. This is a link, and it is not known yet if it is a cause.',
  'prostate-gut-microbiome-cancer-androgens':
    'Some gut bacteria can turn a hormone building block into testosterone, inside the gut. This was found in some prostate cancer patients, and research is early.',
  'prostate-diet-pattern':
    'A diet rich in plants and fiber goes with better prostate health in studies of both BPH and cancer. A diet high in fat and processed meat goes the other way.',
  'prostate-lycopene-tomatoes':
    'Lycopene is the red pigment in tomatoes. In 42 studies, more of it went with about 12% lower prostate cancer risk, but not for advanced cancer.',
  'prostate-lycopene-bph-clinical-trial':
    'In a small six month trial of 40 men with BPH, daily lycopene lowered PSA and stopped prostate growth. On a dummy pill, the prostate kept growing.',
  'prostate-lycopene-food-sources-bioavailability':
    'Cooked tomato paste gave 2.5 times the lycopene in the blood as raw tomatoes. Cooked, concentrated tomato foods hold far more of it.',
  'prostate-cruciferous-sulforaphane':
    'Studies link eating broccoli, cabbage and kale with lower prostate cancer risk. Lab work points to a compound in them, but people studies show links, not proof.',
  'prostate-choline-tmao':
    'In a 22 year study of 47,896 men, those eating the most choline had a 70% higher risk of dying of prostate cancer. That is a link, not proof.',
  'prostate-zinc-connection':
    'The prostate holds more zinc than any other organ in the body. Healthy prostate tissue depends on it.',
  'prostate-zinc-citrate-truncated-krebs-cycle':
    'Healthy prostate cells use zinc to stop burning citrate, so it builds up 30 to 50 times higher than in most tissue. This is normal for the prostate.',
  'prostate-seminal-citrate-cancer-marker':
    'Citrate in semen drops when prostate cells turn cancerous. In one study, measuring it told serious cancer from BPH better than PSA did.',
  'prostate-zinc-testosterone-deficiency':
    'Too little zinc lowers testosterone, and zinc raised it in men who were low. In men with enough zinc, more did not raise it further.',
  'prostate-selenium-select-trial-correction':
    'A trial of 35,000 men found selenium pills did not prevent prostate cancer. Vitamin E pills in the same trial may have raised the risk.',
  'prostate-saw-palmetto-mixed':
    'Saw palmetto is a popular BPH supplement, but trials disagree. Each study used a different extract, which may be why, so this is not settled.',
  'prostate-beta-sitosterol-bph-evidence':
    'Beta sitosterol is a plant compound. Four trials in 519 men found it eased urine symptoms and flow in BPH, a steadier result than saw palmetto.',
  'prostate-beta-sitosterol-testosterone-dht':
    'Some say beta sitosterol lowers testosterone. Most human trials found no change at usual doses, and one found a small rise.',
  'prostate-medications-psa-monitoring':
    'Finasteride and dutasteride, two common BPH drugs, cut PSA about in half. A PSA result on them is often doubled before it is compared.',
  'prostate-psa-screening':
    'PSA screening is a choice to talk over with a doctor. It saves few lives, and it has harms to weigh, like leaks of urine after surgery.',
  'prostate-testosterone-nutrients-comparison':
    'Zinc raises testosterone only when it is low. Beta sitosterol does little, lycopene has no data in people, and citrate is a sign of change, not a cause.',
  'prostate-tying-together':
    'Gut bacteria are tied to prostate health through hormones. Tomatoes and cabbage family foods hold up well, and selenium pills did not prevent cancer.',
  'prostate-real-staging-systems':
    'Two scores mean different things. One, from 0 to 35, rates how much BPH affects daily life. The Gleason group, from 1 to 5, rates how serious a cancer is.',
  'prostate-untreated-bph-kidney-bladder':
    'BPH left untreated can stretch and weaken the bladder for good. In severe cases, the back pressure can harm the kidneys.',
  'prostate-history-milestones':
    'The PSA blood test came in 1986. Before it, a finger exam was the only check, and it often found cancer late.',
  'prostate-family-history-genetic-risk':
    'Men who carry a BRCA2 gene change may face up to a 60% lifetime risk of prostate cancer. Family history alone can raise risk five times.',
  'prostate-ejaculation-frequency':
    'In an 18 year study of about 32,000 men, those who ejaculated 21 or more times a month had 31% lower prostate cancer risk. That is a link, not proof.',
  'prostate-active-surveillance':
    'For low risk prostate cancer, close watching in place of treatment right away is now common. In 21,000 men, 98.1% had not died of it at 10 years.',
  'prostate-food-sensitivity-cpps':
    'In one survey, 47.4% of men with long term pelvic pain said some foods made it worse. Spicy food, coffee, hot peppers, alcohol and tea led the list.',
  'prostate-prostatitis-distinct-condition':
    'Prostatitis is a swollen prostate, most common in men under 50. Unlike BPH, it can cause pain and fever, and it can happen alongside BPH or cancer.',
  'prostate-exercise-cancer-mortality':
    'Men who did 3 or more hours of hard exercise a week after a prostate cancer diagnosis had a 61% lower risk of dying of it. That is from studies that observed men, not a trial.',
  'prostate-5ari-cancer-risk-controversy':
    'A trial once tied finasteride to more serious prostate cancer. After 18 years, there was no difference. The early signal came from better detection.',
  'prostate-metabolic-syndrome-bph-link':
    'Metabolic syndrome is a mix of belly fat, high blood sugar and high blood pressure. In one large study, it went with faster prostate growth and worse urine symptoms.',
  'prostate-age-specific-psa-ranges':
    'A normal PSA is not one number. The upper limit rises with age, from about 2.5 in the 40s to about 6.5 in the 70s.',
  'prostate-global-incidence-migrant-studies':
    'Prostate cancer rates vary up to 30 times by country. Japanese men in the US get it 4 to 5 times more than men in Japan, which points to diet and setting more than genes.',
  'prostate-vasectomy-no-link':
    'For decades people feared a vasectomy raised prostate cancer risk. Data on nearly 3 million men found no link that causes it.',
  'prostate-global-psa-screening-artifact':
    'Some of the gap in prostate cancer between countries comes from testing. More PSA tests find more cancer, but death rates stayed the same.',
  'horizon-prostate':
    'A newer treatment links radiation to a molecule that seeks out prostate cancer cells. It is approved, and in 2026 it was cleared for earlier stage disease after a trial.',
  'horizon-prostate-parp':
    'PARP inhibitors are approved drugs for prostate cancer with a BRCA gene change. A gene test result can now help guide which treatment fits.',
  'prostate-depression-anxiety-real-data':
    'With prostate cancer, anxiety is highest before treatment starts, at about 27%. It drops during treatment and rises again after.',
  'prostate-testosterone-therapy-cancer-risk-traverse':
    'Many feared testosterone therapy would raise prostate cancer risk. A trial of 5,204 men found no clear difference against a dummy treatment.',
  'prostate-pelvic-floor-physical-therapy':
    'Some long term pelvic pain does not ease with antibiotics. Trials find that physical therapy for the pelvic floor muscles can help.',
  'prostate-active-surveillance-real-longterm-data':
    'For men with low risk prostate cancer under close watch, only 1.4% had spread at 10 years. Just 0.1% died of it.',
  'prostate-bph-combination-therapy-mtops-combat':
    'Two large trials tested two kinds of BPH drugs together. In one, the pair cut the risk of BPH getting worse by 66%, against 39% and 34% for either alone.',
  'prostate-smoking-aggressive-disease-real-data':
    'Men who smoke are two to three times more likely to have a fast growing prostate cancer at biopsy. Quitting after diagnosis still helps.',
  'prostate-omega3-fish-oil-controversy-resolved':
    'A news story said fish oil raises prostate cancer risk. It came from one study with flaws, and the wider research points the other way.',
  'prostate-finasteride-vs-dutasteride-comparison':
    'Finasteride and dutasteride both shrink a large prostate, but they are not the same. In a head to head study, one worked harder than the other.',
  'prostate-vascular-ischemia-hypothesis':
    'One idea says BPH may come partly from poor blood flow to the prostate, like clogged heart arteries. The researchers say the evidence is still limited.',
  'prostate-hif-vegf-angiogenesis-shared-pathway':
    'When prostate tissue lacks oxygen, it turns on a signal to grow new blood vessels. BPH and cancer both use it, but cancer relies on it much more.',
  'prostate-vascular-triad-luts-ed-cvd':
    'Trouble with erections and heart disease share a cause: blood vessel linings that do not relax well. Urine symptoms of BPH seem to track with it too.',
  'prostate-alpha-adrenergic-stress-cold-caffeine':
    'Stress, cold and caffeine can tighten the muscle around the prostate and bladder. Cold has trial evidence for worse urine symptoms, and caffeine is linked to them.',
  'prostate-pae-mechanism-paradox':
    'One BPH procedure blocks the arteries that feed the prostate so it shrinks. It works, though studies show it helps less than often claimed.',
  'prostate-tadalafil-dual-bph-ed':
    'Tadalafil is approved for men who have both BPH and trouble with erections. One drug helps both because both share the same blood vessel biology.',
  'prostate-dietary-nitrate-vascular-plausibility':
    'Beets and leafy greens hold nitrate, which the body turns into a gas that relaxes blood vessels. Whether these foods help BPH has not been tested yet.',
  'prostate-behavioral-nocturia-reduction':
    'In one trial, a set of habit changes cut nighttime bathroom trips more than a drug did, with no medicine at all.',
  'prostate-genomic-testing-active-surveillance-real-data':
    'A gene test on the tumor can refine the choice to watch a low risk cancer. In one study, it changed the risk group in 39% of men and the plan in 18%.',
  'prostate-fermented-drinks':
    'A small early trial found pomegranate juice slowed the rise of PSA after prostate cancer treatment. Larger trials did not confirm it, so the tonic here is no treatment.',
  'prostate-ornish-lifestyle-trial':
    'In a trial of 93 men with early prostate cancer, big lifestyle changes made PSA fall while it rose in the others. PSA alone cannot show the cancer slowed.',
  'prostate-nocturia-circadian-vasopressin':
    'At night, a hormone shift normally makes the body produce less urine. With age this weakens, so waking to pass urine can grow worse apart from prostate size.',
  'complementary-prostate-sacral-nerves-bladder':
    'The nerves that run the bladder do pass through the sacrum, the bone at the base of the spine. Doctors even implant devices that stimulate them.',
  'complementary-prostate-chiropractic-luts':
    'No trials have tested spinal adjustment for urine symptoms of an enlarged prostate. That means it is unknown, not that it fails.',
  'complementary-prostate-pelvic-floor-therapy':
    'One trial looked at pelvic pain with urine symptoms. Hands on work on the pelvic floor muscles helped twice as often as a body massage.',
  'complementary-prostate-acupuncture-cpps':
    'For long term prostate pain, 20 acupuncture sessions over eight weeks beat fake acupuncture in a strong trial. The gain lasted six months.',
  'complementary-prostate-acupuncture-bph':
    'Two trials of acupuncture for an enlarged prostate disagree. One eased symptoms but not urine flow, and the other improved flow but not symptoms.',
  'complementary-prostate-massage-safety':
    'Prostate cancer spreads to bone more than anywhere else. A massage therapist needs to know about the diagnosis, since weak bones change how to work.',
};
