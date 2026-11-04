import type { DigestEntry } from './types';

// Hands-On & Complementary Therapies, Basic Health -- added 2026-09-04.
//
// Direct request, after a shared conversation about a sacral adjustment
// and easier urination: "I don't think we have much of anything specific
// in the Digest for any of the conditions, which should also include
// acupuncture, but separately, as well as deep tissue massage. Those
// three should also be included as entries in the basic health section."
//
// This file is the Basic Health half: what each therapy is and what the
// research says about it in general, independent of any one condition.
// The condition-specific half lives in each condition's own file under
// the 'complementary-' id prefix, which app/(tabs)/purple-digest.tsx's
// classifyConditionTopic already routes to the "Complementary & Manual
// Therapies" topic.
//
// lib/digest/complementaryTherapies.ts already existed and covers these
// same three modalities against Hashimoto's specifically (2026-08-07).
// Nothing here duplicates it: that file asks "does this help autoimmune
// thyroid disease," this one asks "what is this therapy and what has it
// been tested on at all." Both directions are cross-linked.
//
// Every citation below was verified by fetching the record rather than
// recalled, matching this project's standing discipline. Two findings are
// reported that do not flatter the therapies involved (Cochrane finding
// no benefit over sham for IBS, and a deep tissue massage trial whose
// design cannot show massage beat doing nothing), because leaving them
// out would make this topic an advertisement.

export const HANDS_ON_THERAPIES_ENTRIES: DigestEntry[] = [
  {
    id: 'handson-three-therapies-compared',
    category: 'basicHealth',
    title: 'Three Therapies That Get Grouped Together and Should Not Be',
    teaser:
      'Chiropractic care, acupuncture, and deep tissue massage sit under one heading in most conversations, and the research behind them looks nothing alike.',
    summary:
      "Chiropractic care applies a thrust or a mobilization to a joint, most often in the spine or pelvis. Acupuncture places fine needles at specific points and leaves them in place. Deep tissue massage applies sustained firm pressure into the deeper muscle and connective tissue layers. They are grouped together because they are all hands-on and all sit outside standard drug treatment, and that is about where the similarity ends. The evidence behind them differs enough that a single verdict covering all three would be wrong about at least two of them. Acupuncture has the largest body of controlled trial data, including an individual patient data meta-analysis pooling the underlying numbers from dozens of randomized trials rather than just their published summaries. Spinal manipulation has a large meta-analysis for one specific problem, chronic low back pain, and very little for anything else. Deep tissue massage has the least, partly because it is not defined tightly enough across studies for results to be pooled at all. Read each of the entries that follow on its own terms rather than looking for a shared answer.",
    citations: [
      {
        source:
          'Rubinstein SM, de Zoete A, van Middelkoop M, et al. 2019: Benefits and harms of spinal manipulative therapy for the treatment of chronic low back pain: systematic review and meta-analysis of randomised controlled trials (BMJ 364:l689)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30867144/',
      },
      {
        source:
          'Vickers AJ, Vertosick EA, Lewith G, et al. 2018: Acupuncture for Chronic Pain: Update of an Individual Patient Data Meta-Analysis (J Pain 19(5):455-474)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29198932/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-chiropractic-back-pain-evidence',
      'handson-acupuncture-chronic-pain',
      'handson-deep-tissue-massage-evidence',
      'handson-tracking-whether-it-works',
    ],
  },
  {
    id: 'handson-chiropractic-back-pain-evidence',
    category: 'basicHealth',
    title: 'Spinal Manipulation Works About As Well As the Alternatives for Back Pain',
    teaser:
      'The largest analysis of chiropractic care for chronic low back pain found it works about as well as the treatments clinical guidelines already recommend.',
    summary:
      'Chronic low back pain is where spinal manipulation has been studied most, and the picture there is reasonably clear. A 2019 systematic review and meta-analysis in the BMJ pooled 47 randomized controlled trials covering 9,211 participants, comparing spinal manipulative therapy against guideline-recommended interventions, against interventions guidelines do not recommend, against sham manipulation, and in combination with other care. The finding was that manipulation produces effects similar to the therapies clinical guidelines already recommend, such as exercise. That is a modest result: it places manipulation among the reasonable options for chronic low back pain rather than above them. Reported harms were mostly transient musculoskeletal soreness. Two things follow from this. If back pain is the problem, this is an option with data behind it, and choosing between it and supervised exercise is a question of preference and access rather than of one being clearly better. And the evidence stops at the spine. A finding about back pain says nothing about whether manipulation changes anything happening in an organ, which is a separate claim covered in the next entry.',
    citations: [
      {
        source:
          'Rubinstein SM, de Zoete A, van Middelkoop M, et al. 2019: Benefits and harms of spinal manipulative therapy for the treatment of chronic low back pain: systematic review and meta-analysis of randomised controlled trials (BMJ 364:l689)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30867144/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: ['handson-chiropractic-organ-claims', 'handson-safety-and-what-to-ask', ],
  },
  {
    id: 'handson-chiropractic-organ-claims',
    category: 'basicHealth',
    title: 'When an Adjustment Is Said to Help an Organ',
    teaser:
      'The nerves that leave the spine really do run to the bladder, the gut, and everywhere else. That anatomy alone does not show that adjusting the spine changes what those organs do.',
    summary:
      'A claim that comes up often around chiropractic care runs roughly like this: the nerves controlling an organ pass through a particular part of the spine, tension or misalignment there compresses those nerves, and an adjustment relieves the pressure so the organ works normally again. The anatomy in that chain is correct and taught in every medical school. Nerves leaving the sacrum control the bladder and the pelvic floor. Nerves leaving the mid and lower thoracic spine reach the gut. Medicine takes those pathways seriously enough to target them directly: sacral neuromodulation, an implanted device that stimulates the third sacral nerve root, is an established treatment for overactive bladder and for urinary retention that has not responded to other care. The anatomy does not establish the middle of the chain. Searches of the peer-reviewed literature for trials testing spinal manipulation against a measured organ outcome come back close to empty. There is no clinical trial evidence connecting manipulation to thyroid or autoimmune disease, and none testing it against the urinary symptoms of an enlarged prostate. That is different from having been tested and found not to work. It means the question has not been answered, and a plausible pathway is not an answer. Someone who feels a change after an adjustment is reporting something that happened to them, and that is information. Turning it into a general mechanism needs a study that does not exist yet.',
    citations: [
      { source: 'Côté P, Hartvigsen J, Axén I, et al. 2021, Chiropractic & Manual Therapies 29:8: "The global summit on the efficacy and effectiveness of spinal manipulative therapy for the prevention and treatment of non-musculoskeletal disorders: a systematic review of the literature"', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7890602/' },
      { source: 'Sacral Neuromodulation: Device Improvement and Current Applications in Urology (review)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10972000/' },
    ],
    overallTier: 'weak',
    relatedIds: [
      'handson-chiropractic-back-pain-evidence',
      
      'complementary-prostate-sacral-nerves-bladder',
      'complementary-prostate-chiropractic-luts',
      'complementary-cvd-blood-pressure-replication',
    ],
  },
  {
    id: 'handson-acupuncture-chronic-pain',
    category: 'basicHealth',
    title: 'Acupuncture Has a Small Effect on Chronic Pain That Survives a Sham Comparison',
    teaser:
      'Pooling the underlying patient data from dozens of randomized trials found an effect on chronic pain that persists over time and is not explained by placebo alone.',
    summary:
      'Acupuncture has been tested more rigorously than either of the other two therapies, and the strongest evidence comes from the Acupuncture Trialists\' Collaboration. Rather than pooling published summary results, which is what most meta-analyses do, this group obtained the individual patient records from randomized trials and reanalyzed them together, which allows the analysis to check things the original papers never reported. Their 2018 update, covering chronic musculoskeletal pain, headache, and osteoarthritis, concluded that acupuncture has a clinically relevant effect on chronic pain, that the effect persists over time rather than fading immediately, and that it cannot be explained only by placebo effects. Two qualifications belong alongside that. The effect is small. And the comparison that matters most, true acupuncture against sham needling, produces a narrower gap than the comparison against no acupuncture at all, which means a meaningful part of what people experience comes from the encounter, the attention, and the expectation rather than from needle placement. A treatment that reliably reduces pain is doing something useful regardless of how much of it runs through mechanisms nobody has fully mapped. It does mean that claims resting on precise point selection are on weaker ground than claims about acupuncture in general.',
    citations: [
      {
        source:
          'Vickers AJ, Vertosick EA, Lewith G, et al. 2018: Acupuncture for Chronic Pain: Update of an Individual Patient Data Meta-Analysis (J Pain 19(5):455-474)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29198932/',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'handson-acupuncture-where-it-does-nothing',
      'handson-safety-and-what-to-ask',
      
    ],
  },
  {
    id: 'handson-acupuncture-where-it-does-nothing',
    category: 'basicHealth',
    title: 'Where Acupuncture Has Been Tested and Come Up Empty',
    teaser:
      'A Cochrane review found no important benefit over sham for irritable bowel syndrome. A separate one found a small benefit for migraine. Both results are useful.',
    summary:
      'A therapy that works for some things and not others is more believable than one said to work for everything, so the places acupuncture has been tested and found wanting belong alongside the places it has done well. For irritable bowel syndrome, a Cochrane review found moderate certainty evidence of no important benefit over sham acupuncture, for symptom severity or for quality of life. Not one of the trials comparing acupuncture against sham found acupuncture better, and pooling them did not change that. The same review noted a pattern that explains a lot of the enthusiasm: in trials comparing acupuncture against antispasmodic drugs rather than against sham, patients reported greater benefit from acupuncture, which points toward preference and expectation rather than toward a specific effect on the gut. Migraine prevention landed differently. A Cochrane review of acupuncture for preventing episodic migraine found headache frequency at least halved in 50% of people receiving acupuncture against 41% receiving sham, a difference that is statistically significant and small, with roughly eleven people needing treatment for one additional person to benefit. Moderate quality evidence, and a fair description of it is "somewhat better than sham, and comparable to the drugs used for the same purpose."',
    citations: [
      {
        source:
          'Manheimer E, Cheng K, Wieland LS, et al. 2012: Acupuncture for treatment of irritable bowel syndrome (Cochrane Database Syst Rev 2012(5):CD005111)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22592702/',
      },
      {
        source:
          'Linde K, Allais G, Brinkhaus B, et al. 2016: Acupuncture for the prevention of episodic migraine (Cochrane Database Syst Rev 2016(6):CD001218)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/27351677/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-acupuncture-chronic-pain',
      'complementary-migraine-acupuncture',
      'complementary-ibs-acupuncture',
      'complementary-pcos-acupuncture-live-birth',
      'complementary-graves-ophthalmopathy-trial',
      'complementary-psoriasis-acupuncture',
    ],
  },
  {
    id: 'handson-deep-tissue-massage-evidence',
    category: 'basicHealth',
    title: 'Deep Tissue Massage Has a Thinner Evidence Base Than Its Popularity Suggests',
    teaser:
      'The main obstacle to knowing whether deep tissue massage works is that studies do not define it the same way, so their results cannot be pooled.',
    summary:
      'Deep tissue massage means sustained firm pressure into the deeper muscle and connective tissue layers, as opposed to the lighter flowing strokes of a Swedish or relaxation massage. That is a description of technique rather than a protocol, and it is the central problem with the research. Trials of massage differ in pressure, duration, number of sessions, which tissue is targeted, and what the therapist was trained in, which leaves reviewers unable to combine results the way they can for a drug given at a fixed dose. Massage therapy in general has low to moderate quality evidence supporting it for pain and function in conditions such as arthritis. For deep tissue work specifically, one useful trial gave 59 people with chronic low back pain ten daily thirty-minute deep tissue massage sessions over two weeks, with one group also taking a non-steroidal anti-inflammatory drug. Both groups improved on pain and disability scores, and adding the drug did not improve on massage alone. Notice what that design can and cannot show. It is evidence that the drug added nothing on top of the massage. It is not evidence that the massage beat doing nothing, because there was no group that received neither. Reporting it as proof that deep tissue massage works for back pain would be overstating what was tested.',
    citations: [
      {
        source:
          'Majchrzycki M, Kocur P, Kotwicki T 2014: Deep tissue massage and nonsteroidal anti-inflammatory drugs for low back pain: a prospective randomized trial (The Scientific World Journal 2014:287597)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24707200/',
      },
      {
        source: 'National Center for Complementary and Integrative Health: Massage Therapy for Health, What the Science Says',
        url: 'https://www.nccih.nih.gov/health/providers/digest/massage-therapy-for-health-science',
      },
    ],
    overallTier: 'weak',
    relatedIds: [
      'handson-targeted-versus-general-massage',
      'handson-safety-and-what-to-ask',
      
    ],
  },
  {
    id: 'handson-targeted-versus-general-massage',
    category: 'basicHealth',
    title: 'Targeted Bodywork Beat a Full-Body Massage, Head to Head',
    teaser:
      'A multicenter trial put focused pelvic floor myofascial therapy against ordinary full-body massage. The targeted work responded more than twice as often.',
    summary:
      'One of the more informative massage trials did something unusual: it used a general massage as the comparison group rather than as the treatment. Eighty-one women with interstitial cystitis or painful bladder syndrome and tenderness in the pelvic floor muscles were randomized to either myofascial physical therapy, meaning focused internal and external work on the specific restricted tissue, or global therapeutic massage, meaning a traditional full-body Western massage. Both groups received up to ten weekly one-hour sessions from trained therapists, so time, touch, and attention were matched. At twelve weeks, 59% of the targeted group rated themselves moderately or markedly improved against 26% of the full-body massage group, a difference unlikely to be chance. This is the closest thing available to a controlled answer on what kind of hands-on work is worth paying for. Where a specific tight or tender structure is driving the symptom, working on that structure did substantially better than a skilled, pleasant, equally long massage of the whole body. It also means the 26% figure deserves respect: a quarter of people improved from general massage alone. If the goal is relaxation and easing overall muscle tension, either will do. If a particular structure is the problem, find someone trained to work on that structure.',
    citations: [
      {
        source:
          'FitzGerald MP, Payne CK, Lukacz ES, et al. 2012: Randomized multicenter clinical trial of myofascial physical therapy in women with interstitial cystitis/painful bladder syndrome and pelvic floor tenderness (J Urol 187(6):2113-2118)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22503015/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-deep-tissue-massage-evidence',
      'complementary-prostate-pelvic-floor-therapy',
      'handson-tracking-whether-it-works',
    ],
  },
  {
    id: 'handson-safety-and-what-to-ask',
    category: 'basicHealth',
    title: 'Telling a Practitioner What They Need to Know Prevents Most of What Goes Wrong',
    teaser:
      'Serious harm from any of these three is uncommon. Most of what does go wrong is predictable from something the practitioner was never told.',
    summary:
      'Acupuncture has the best safety data of the three, because it has been tracked at scale. A prospective German study following 229,230 patients through roughly 2.2 million acupuncture treatments recorded two cases of pneumothorax, a punctured lung, which remains the most common serious complication reported. Minor effects such as needling pain, small bleeding, or bruising occur in something between roughly 7% and 15% of sessions across prospective studies, and serious events requiring hospital admission have been estimated at around 0.024% of patients. Spinal manipulation of the low back carries mostly short-lived soreness. Manipulation of the NECK is the contested area: cervical artery dissection followed by stroke has been reported after neck manipulation, it is rare, and whether the manipulation causes it or whether people whose artery is already tearing seek out a practitioner for the resulting neck pain and headache is still argued in the literature. Around 80% of dissections announce themselves with severe headache and neck pain beforehand, which is exactly why sudden severe neck pain or headache of a kind never felt before should be a reason to see a doctor rather than a reason to book an adjustment. Massage has few risks for most people and several specific ones: a known or suspected deep vein clot in the leg should never be massaged, blood thinners raise the chance of bruising and deeper bleeding, and cancer that has spread to bone calls for a therapist who has been told and knows how to work around it. Every one of those depends on the practitioner being told. Say what you have been diagnosed with, every medication including blood thinners, whether you are pregnant, and whether anything about the pain is new or different from usual.',
    citations: [
      {
        source:
          'Witt CM, Pach D, Brinkhaus B, et al. 2009: Safety of acupuncture: results of a prospective observational study with 229,230 patients (Forsch Komplementmed 16(2):91-97)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/19420954/',
      },
      {
        source: 'Haynes MJ, Vincent K, Fischhoff C, et al. 2012: Assessing the risk of stroke from neck manipulation: a systematic review (Int J Clin Pract)',
        url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3506737/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-chiropractic-back-pain-evidence',
      'handson-acupuncture-chronic-pain',
      'handson-deep-tissue-massage-evidence',
      'advocacy-how-to-ask',
    ],
  },
  {
    id: 'handson-tracking-whether-it-works',
    category: 'basicHealth',
    title: 'How to Find Out Whether It Works for You Specifically',
    teaser:
      'Published averages cannot tell you whether a therapy helps you. Dates and check-ins can, and the app does the arithmetic.',
    summary:
      'Every finding about these therapies is an average across a group of people, and averages hide the fact that some of those people improved a great deal and others not at all. Which of those you are is a separate question, and it is answerable. The obstacle is memory. Nobody standing in a practitioner\'s office three weeks later can accurately recall how the fourth day after the last session compared to an ordinary Tuesday, and the natural tendency is to remember the sessions that were followed by a good week. What defeats that is writing things down at the time. Log each session under Schedules, then Hands-On Therapies, with its date. Keep doing ordinary check-ins on the Signals tab whether the day is good or bad, because a record made only on bad days makes every therapy look effective. Trends, then Therapy Response, then compares your check-ins in the days after each session against your check-ins on days away from any session, and reports how many days the difference held. It refuses to report anything until there are at least three sessions and enough check-ins on both sides to compare, and it never claims a session caused anything. It gives you your numbers, which is the only version of this question that can be answered about you rather than about a study population.',
    citations: [
      { source: 'Lillie EO, Patay B, Diamant J, et al. 2011, Personalized Medicine 8(2):161-173: "The n-of-1 clinical trial: the ultimate strategy for individualizing medicine?"', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3118090/' },
    ],
    overallTier: 'weak',
    relatedIds: [
      'handson-three-therapies-compared',
      'handson-targeted-versus-general-massage',
      'handson-using-where-they-fit',
      'advocacy-why-it-matters',
    ],
  },
  // 2026-11-04: history, techniques and the pain guidelines, by direct
  // request: "the Health Literacy should go much further into the history
  // of chiropractics, accupunture, and massage therapy and techniques, and
  // their usefulness in healing." The history is told as the records show
  // it, which includes a campaign a federal court ruled unlawful, and the
  // usefulness at the tier the trials support: first-line care for low
  // back pain, modest effects, and much less away from musculoskeletal
  // pain. Every citation was fetched and read, the Wilk ruling from the
  // published district court opinion.
  {
    id: 'handson-history-chiropractic-beginnings',
    category: 'basicHealth',
    title: 'Chiropractic Began in Iowa in 1895 With One Adjustment and One Story',
    teaser:
      'D.D. Palmer was a magnetic healer for nine years before he adjusted Harvey Lillard, and the account of that day is still how the profession tells its start.',
    summary:
      "Daniel David Palmer began working as a magnetic healer in Burlington, Iowa, in September 1886, one of many drug-free healing trades in the American Midwest of that time. Most historians date chiropractic to September 18, 1895, in Davenport, when Palmer adjusted the spine of Harvey Lillard, a janitor in his building. The story as it is usually told is that Lillard had been deaf for seventeen years and that his hearing improved after the adjustment. That account comes from Palmer and the people around him and was never examined by anybody outside that circle, so it is the founding story of the profession rather than a documented case. Palmer opened a school soon after, and his son Bartlett Joshua, known as B.J., went on to run it and spread chiropractic far more widely than his father had. The early theory held that misaligned vertebrae press on nerves and cause disease throughout the body. Chiropractors today are divided over how much of that to keep: a large part of the profession works mainly on back, neck and joint pain and treats the original theory as history, while another part still holds to it. Knowing which kind of practice you have walked into tells you a great deal about what will be claimed for it.",
    citations: [
      {
        source:
          'Batinić J, Skowron M, Hammerich K. 2013: Did American social and economic events from 1865 to 1898 influence D.D. Palmer the chiropractor and entrepreneur? (J Can Chiropr Assoc 57(3):221-232)',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3743648/',
      },
      {
        source: 'National Center for Complementary and Integrative Health: Chiropractic: In Depth',
        url: 'https://www.nccih.nih.gov/health/chiropractic-in-depth',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-history-ama-campaign',
      'handson-technique-chiropractic',
      'handson-chiropractic-organ-claims',
    ],
  },
  {
    id: 'handson-history-ama-campaign',
    category: 'basicHealth',
    title: 'A Federal Court Ruled That the American Medical Association Unlawfully Tried to Eliminate Chiropractic',
    teaser:
      'For more than a decade the AMA ran a committee whose aim was to contain and then eliminate chiropractic. In 1987 a federal judge found that it broke antitrust law.',
    summary:
      "In 1963 the American Medical Association formed a Committee on Quackery, which the court later found worked diligently to eliminate chiropractic. In 1966 the AMA House of Delegates called chiropractic an unscientific cult, and the AMA's ethics code, through what was known as Principle 3, made it unethical for a medical doctor to associate professionally with an unscientific practitioner. In practice that meant a physician could not refer a patient to a chiropractor, accept a referral from one, or teach at a chiropractic college. In 1976 four chiropractors, led by Chester Wilk, sued. The committee had disbanded in 1974 and Principle 3 was dropped in 1980, but in 1987 Judge Susan Getzendanner ruled that the AMA had conspired to restrain trade in violation of the Sherman Act, finding that its aim had been to contain and ultimately eliminate chiropractic. The American College of Surgeons and the American College of Radiology were found to have taken part as well. The court ordered the AMA to publish the ruling in its journal, JAMA, and the appeals court upheld the judgment in 1990. Two things are true together. A good part of the poor reputation chiropractic carried for decades was manufactured by an organized campaign that a court found unlawful. And the court said plainly that it was not deciding whether chiropractic works; it decided that the boycott was illegal. Whether a treatment helps is a question for trials, which the entries under Where Pain Guidelines Put Them take up.",
    citations: [
      {
        source:
          'Wilk v. American Medical Association, 671 F. Supp. 1465 (N.D. Ill. 1987), affirmed 895 F.2d 352 (7th Cir. 1990)',
        url: 'https://biotech.law.lsu.edu/cases/antitrust/wilk_v_ama.htm',
      },
    ],
    overallTier: 'strong',
    relatedIds: [
      'handson-history-chiropractic-beginnings',
      'handson-evidence-guidelines-first-line',
      'handson-using-where-they-fit',
    ],
  },
  {
    id: 'handson-history-acupuncture-roots',
    category: 'basicHealth',
    title: 'Acupuncture Has at Least 2,500 Years of Practice Behind It, and Japan Shows How It Travelled',
    teaser:
      'Acupuncture grew out of traditional Chinese medicine, reached Japan in the sixth century, and was written into Japanese law in 701.',
    summary:
      "Acupuncture has been practised in some form for at least 2,500 years, growing out of traditional Chinese medicine. Its history outside China is best documented in Japan. A practitioner named Chiso brought it from China in the sixth century, and Japan's first medical law, the Ishitsu-rei of 701, set out the acupuncture system in detail, showing that it was practised with the authority of the national government. For the next twelve centuries it stayed part of public health in Japan. Practitioners who had studied in China founded schools in Japan, and during the two centuries when Japan closed its borders after 1635, acupuncture and above all moxibustion, the burning of a herb on or near the skin, became things ordinary people did at home. Through the Dutch, the one nation allowed to trade with Japan in that period, Western medicine came into Japan and Japanese acupuncture went out to Europe. When Japan reopened in the 1860s, the new government was so eager for Western ways that for a time it held acupuncture back, and acupuncture survived because people kept asking for it and practitioners kept teaching it. That pattern, a practice set aside by an official preference for Western medicine and kept alive by demand, recurs in the histories of all three therapies here. Long use shows that people valued a practice. It does not by itself show which uses help, which is what trials are for.",
    citations: [
      {
        source: 'National Center for Complementary and Integrative Health: Acupuncture: What You Need To Know',
        url: 'https://www.nccih.nih.gov/health/acupuncture-what-you-need-to-know',
      },
      {
        source:
          'Kobayashi A, Uefuji M, Yasumo W. 2010: History and progress of Japanese acupuncture (Evid Based Complement Alternat Med 7(3):359-365)',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2887322/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-history-acupuncture-reaches-america',
      'handson-technique-acupuncture-styles',
      'handson-acupuncture-chronic-pain',
    ],
  },
  {
    id: 'handson-history-acupuncture-reaches-america',
    category: 'basicHealth',
    title: 'Acupuncture Reached Americans Through a Newspaper Column, a Free Clinic and a Detox Center',
    teaser:
      "The usual story starts with a reporter's appendectomy in Beijing in 1971. Historians now add the community clinics that were using needles in the same years.",
    summary:
      "Acupuncture was practised in Asian communities in the United States long before most Americans heard of it. Wider interest is usually dated to July 1971, when the New York Times columnist James Reston wrote about being given acupuncture for pain after an emergency appendectomy in Beijing. Historians writing in 2025 call that account incomplete, because it leaves out the people who brought acupuncture into public use in the same years. Dr. Tolbert Small, who directed the Black Panther Party's George Jackson Free Medical Clinic from 1970 to 1974, travelled to China in 1972, taught himself acupuncture and treated people at no charge, and has treated thousands since. At Lincoln Hospital in the South Bronx, the Lincoln Detox Center developed an ear acupuncture protocol for people coming off drugs, and the approach spread widely; in the United Kingdom one program built on it has trained more than 28,000 people and reached more than 128 of the country's 150 prisons. In 1997 the National Institutes of Health held a consensus conference, with a panel chosen for having no stake in acupuncture, which said many studies had given equivocal results, found promising results for nausea after surgery and chemotherapy and for dental pain after surgery, and saw room for it beside other care for several kinds of pain, among them low back pain, headache and osteoarthritis. US use doubled between 2002 and 2022, from 1.0 to 2.2 percent of adults.",
    citations: [
      {
        source:
          'Meng EX, Chao MT, Wayne P. 2025: Dignity-Based Care: Lessons for Today from Two Turning Points in the Histories of Acupuncture (J Integr Complement Med 31:677-683)',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13089417/',
      },
      {
        source: 'NIH Consensus Conference 1998: Acupuncture (JAMA 280(17):1518-1524)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/9809733/',
      },
      {
        source: 'National Center for Complementary and Integrative Health: Acupuncture: What You Need To Know',
        url: 'https://www.nccih.nih.gov/health/acupuncture-what-you-need-to-know',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-history-acupuncture-roots',
      'handson-technique-acupuncture-styles',
      'handson-evidence-acupuncture-beyond-pain',
    ],
  },
  {
    id: 'handson-history-massage-in-nursing',
    category: 'basicHealth',
    title: 'Massage Was Taught to Nurses as Medicine Until Pain Pills Replaced It',
    teaser:
      "From Florence Nightingale's time into the early twentieth century, massage was part of nurse training. It faded in the 1930s and 1940s as pain medicines took over.",
    summary:
      "Massage is older than any written medical tradition, and for a stretch of modern history it sat squarely inside Western medicine. Following Florence Nightingale's lead, nurse training schools taught it, and American schools copied her methods. From the 1880s into the 1900s, physicians, nurses and trained masseurs taught massage as care for a wide range of illnesses, and a nurse was expected to give it as part of ordinary comfort care. In the 1930s and 1940s that changed. Pain-relieving drugs became easy to give, care was reorganized around what was then called scientific medicine, and influential nursing educators began steering massage out of everyday nursing and into the separate specialty of physiotherapy. The nursing historian who traced this, Patricia Ruffin, argues that something was lost in the move: compassionate touch as part of healing. Massage did not leave medicine because a trial showed it failed. It left as the work of a nurse's hands gave way to the speed of a tablet. That history matters now that the guidelines in this topic recommend massage again for some kinds of pain, and now that its use among US adults has more than doubled, from 4.8 percent in 2002 to 10.9 percent in 2022.",
    citations: [
      {
        source:
          'Ruffin PT. 2011: A history of massage in nurse training school curricula (1860-1945) (J Holist Nurs 29(1):61-67)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20682916/',
      },
      {
        source: 'National Center for Complementary and Integrative Health: Massage Therapy: What You Need To Know',
        url: 'https://www.nccih.nih.gov/health/massage-therapy-what-you-need-to-know',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-technique-massage-styles',
      'handson-evidence-massage-back-pain-trial',
      'handson-evidence-massage-by-condition',
    ],
  },
  {
    id: 'handson-technique-chiropractic',
    category: 'basicHealth',
    title: 'A Chiropractic Adjustment Is a Quick Thrust to a Joint, and Most Visits Include Gentler Work Too',
    teaser:
      'An adjustment is a quick, controlled thrust to a joint. Most visits also include gentler stretching and pressure, and often exercises to do at home.',
    summary:
      "The technique chiropractic is known for is spinal manipulation, usually called an adjustment: the practitioner takes a joint to the edge of its range and applies a quick, controlled thrust. Chiropractors also use gentler methods: stretching, sustained pressure on a joint or muscle, and slow mobilization that moves a joint through its range without a thrust, which suits people for whom a thrust is a poor idea, such as someone with fragile bones. Many add exercises to do at home and advice on posture, work habits and nutrition. In the United States a chiropractor completes four years of chiropractic college after at least three years of undergraduate study and holds a Doctor of Chiropractic degree; in 2017 there were 15 accredited programs on 18 campuses, and every state licenses the profession. In 2022, 11.0 percent of US adults saw a chiropractor, and 85.7 percent of them went for pain. Spinal manipulation is also done by osteopathic physicians and by some physical therapists, so the technique and the profession are not the same thing, and the trials of spinal manipulation described under Chiropractic Research include all three.",
    citations: [
      {
        source: 'National Center for Complementary and Integrative Health: Chiropractic: In Depth',
        url: 'https://www.nccih.nih.gov/health/chiropractic-in-depth',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-history-chiropractic-beginnings',
      'handson-chiropractic-back-pain-evidence',
      'handson-safety-and-what-to-ask',
    ],
  },
  {
    id: 'handson-technique-acupuncture-styles',
    category: 'basicHealth',
    title: 'Acupuncture Comes in Several Styles, From Hand-Turned Needles to the Ear Alone',
    teaser:
      'Manual, electro, ear, laser and trigger point acupuncture are different procedures, and a trial of one does not automatically speak for the others.',
    summary:
      "Acupuncture places fine, solid, single-use needles into the skin at chosen points. In manual acupuncture the practitioner turns or lifts the needles by hand. In electroacupuncture a small electric current runs between pairs of needles, which keeps the stimulation the same from one session to the next and is the form used in some of the largest trials. Auricular acupuncture works on points of the outer ear only; it is the basis of the detox protocol described under History, and a short version called battlefield acupuncture is used by the US Department of Defense and the Department of Veterans Affairs for pain. Acupressure presses points without needles, and laser acupuncture uses light. Trigger point needling goes into tender knots in a muscle, and when physical therapists do it, it is called dry needling; a review of 13 trials found it eased pain better than comparison treatments for up to 12 weeks, with no difference left at six months to a year. Japanese acupuncture, shaped by the history described under History, is a separate tradition, taught in schools in Japan. In the United States the FDA treats acupuncture needles as medical devices that must be sterile and labelled for single use. These styles are tested separately, so a result for electroacupuncture tells you little about ear needles, and the other way round.",
    citations: [
      {
        source: 'National Center for Complementary and Integrative Health: Acupuncture: What You Need To Know',
        url: 'https://www.nccih.nih.gov/health/acupuncture-what-you-need-to-know',
      },
      {
        source:
          'Gattie E, Cleland JA, Snodgrass S. 2017: The Effectiveness of Trigger Point Dry Needling for Musculoskeletal Conditions by Physical Therapists: A Systematic Review and Meta-analysis (J Orthop Sports Phys Ther 47(3):133-149)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28158962/',
      },
      {
        source:
          'Kobayashi A, Uefuji M, Yasumo W. 2010: History and progress of Japanese acupuncture (Evid Based Complement Alternat Med 7(3):359-365)',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2887322/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-history-acupuncture-reaches-america',
      'handson-acupuncture-chronic-pain',
      'handson-evidence-acupuncture-beyond-pain',
    ],
  },
  {
    id: 'handson-technique-massage-styles',
    category: 'basicHealth',
    title: 'Swedish, Deep Tissue, Sports, Shiatsu and Tuina Are Different Kinds of Massage',
    teaser:
      'Massage covers everything from long gliding strokes to firm pressure on single points, and the kind matters for both comfort and risk.',
    summary:
      "Swedish or classical massage, the most common kind in the West, uses long gliding strokes, kneading, friction and tapping over the muscles, and is close to what trials call relaxation massage. Deep tissue massage uses slower, firmer pressure aimed at the deeper layers of muscle and connective tissue. Sports massage borrows from both and is timed around training and competition. Clinical or medical massage is aimed at a particular problem the client names, usually a painful area. Two Asian traditions work along the same lines as acupuncture: Shiatsu, from Japan, uses finger and palm pressure on points, and Tuina, from China, combines pressing, kneading and stretching. Massage is very safe for most people, but serious harms such as blood clots, nerve injury and broken bones have been reported, most often with vigorous or deep tissue work. That is a reason to name your conditions and medicines before a session, blood thinners and anything that weakens bone above all, and to ask for lighter pressure if you are not sure.",
    citations: [
      {
        source: 'National Center for Complementary and Integrative Health: Massage Therapy: What You Need To Know',
        url: 'https://www.nccih.nih.gov/health/massage-therapy-what-you-need-to-know',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-history-massage-in-nursing',
      'handson-targeted-versus-general-massage',
      'handson-safety-and-what-to-ask',
    ],
  },
  {
    id: 'handson-evidence-guidelines-first-line',
    category: 'basicHealth',
    title: "For Low Back Pain, the Physicians' Guideline Puts Massage, Acupuncture and Manipulation Before Pills",
    teaser:
      'The American College of Physicians tells doctors to try heat, massage, acupuncture or spinal manipulation first for most low back pain, before any medicine.',
    summary:
      "In 2017 the American College of Physicians, which represents internal medicine doctors in the United States, published its guideline for low back pain. Its first recommendation is that because most acute and subacute low back pain gets better over time whatever is done, doctors and patients should choose treatment without drugs first: superficial heat, which had moderate quality evidence, or massage, acupuncture or spinal manipulation, which had low quality evidence. For chronic low back pain it again put treatments without drugs first, among them exercise, acupuncture and spinal manipulation, with medicines kept for people those did not help. The systematic review behind the guideline found evidence that spinal manipulation, massage and acupuncture help chronic low back pain, at low to moderate strength of evidence and with effects mostly small and short lived. Both halves of that matter. The country's largest physician specialty organization puts all three of these therapies ahead of medicine as a starting point for one of the most common reasons people see a doctor. And the effects that earned them that place are modest, which is also true of the medicines they were ranked against.",
    citations: [
      {
        source:
          'Qaseem A, Wilt TJ, McLean RM, Forciea MA. 2017: Noninvasive Treatments for Acute, Subacute, and Chronic Low Back Pain: A Clinical Practice Guideline From the American College of Physicians (Ann Intern Med 166(7):514-530)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28192789/',
      },
      {
        source:
          'Chou R, Deyo R, Friedly J, et al. 2017: Nonpharmacologic Therapies for Low Back Pain: A Systematic Review for an American College of Physicians Clinical Practice Guideline (Ann Intern Med 166(7):493-505)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28192793/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-evidence-before-opioids',
      'handson-chiropractic-back-pain-evidence',
      'handson-acupuncture-chronic-pain',
      'handson-evidence-massage-back-pain-trial',
    ],
  },
  {
    id: 'handson-evidence-before-opioids',
    category: 'basicHealth',
    title: "The CDC's Opioid Guideline Tells Doctors to Make the Most of Treatments Without Drugs First",
    teaser:
      'The 2022 CDC guideline names massage, acupuncture and spinal manipulation among the options to use before opioids for back pain, neck pain and tension headache.',
    summary:
      "The Centers for Disease Control and Prevention published its updated guideline on prescribing opioids for pain in 2022. Its first two recommendations say that treatments other than opioids are at least as effective as opioids for many common kinds of short-term pain and are preferred for longer-lasting pain, and that doctors should make the most of treatments without drugs and of medicines other than opioids before considering opioids at all. In explaining how to do that, the guideline names hands-on care again and again: massage, acupuncture or spinal manipulation as a main treatment for acute low back pain, following the American College of Physicians; spinal manipulation for acute back pain that runs down the leg; massage for pain after surgery; spinal manipulation and massage among the options for chronic low back pain; massage and acupuncture for neck pain; and spinal manipulation for tension headache. The CDC says the guideline is meant to help a doctor and patient decide together and not to be applied as a rigid rule, and it does not cover cancer pain, sickle cell disease or end of life care. So in US pain care these therapies are written into official guidance as something to reach for early, and the trials behind each mention are still modest, as the other entries in this topic describe.",
    citations: [
      {
        source:
          'Dowell D, Ragan KR, Jones CM, Baldwin GT, Chou R. 2022: CDC Clinical Practice Guideline for Prescribing Opioids for Pain, United States, 2022 (MMWR Recomm Rep 71(3):1-95)',
        url: 'https://www.cdc.gov/mmwr/volumes/71/rr/rr7103a1.htm',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-evidence-guidelines-first-line',
      'handson-evidence-massage-by-condition',
      'handson-using-where-they-fit',
    ],
  },
  {
    id: 'handson-evidence-massage-back-pain-trial',
    category: 'basicHealth',
    title: 'In a Trial of 401 People, Ten Weeks of Massage Eased Chronic Back Pain More Than Usual Care',
    teaser:
      'Relaxation massage and structural massage did about equally well, and the benefit lasted at least six months. A Cochrane review is more cautious.',
    summary:
      "In 2011 researchers in Seattle randomly assigned 401 adults with chronic low back pain to ten weekly sessions of relaxation massage, ten of structural massage aimed at particular muscles and ligaments, or the usual care they were already getting. After ten weeks, people in both massage groups could do more in daily life and were less bothered by their pain than people on usual care, and the two kinds of massage did about equally well. The benefit lasted at least six months. At one year most of the difference had faded, with a small advantage left for relaxation massage. The trial could not be blinded, since everyone knew whether they were being massaged, so expectation may account for part of the effect. A 2015 Cochrane review that pooled 25 trials with 3,096 people found that massage eased low back pain in the short term, rated the evidence low or very low in quality, and said its authors had very little confidence that massage works for low back pain. No serious harms turned up across those trials, though in some studies up to a quarter of people noticed more pain for a while afterwards. Put together, massage is a reasonable thing to try for chronic back pain and safe for most people, and the strongest single trial found gentle massage as useful as targeted work.",
    citations: [
      {
        source:
          'Cherkin DC, Sherman KJ, Kahn J, et al. 2011: A comparison of the effects of 2 types of massage and usual care on chronic low back pain: a randomized, controlled trial (Ann Intern Med 155(1):1-9)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/21727288/',
      },
      {
        source:
          'Furlan AD, Giraldo M, Baskwill A, Irvin E, Imamura M. 2015: Massage for low-back pain (Cochrane Database Syst Rev 2015(9):CD001929)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26329399/',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-targeted-versus-general-massage',
      'handson-deep-tissue-massage-evidence',
      'handson-evidence-guidelines-first-line',
    ],
  },
  {
    id: 'handson-evidence-massage-by-condition',
    category: 'basicHealth',
    title: 'Massage Helps Some Kinds of Pain More Than Others',
    teaser:
      'Knee arthritis and fibromyalgia show short-term benefit, neck pain shows some, and tension headache shows none so far.',
    summary:
      "The National Center for Complementary and Integrative Health, part of the US National Institutes of Health, summarizes the research on massage condition by condition. For neck pain, 12 studies with 757 people found massage better than no treatment or an inactive one, though not better than other active treatments. For knee osteoarthritis, five of six studies with 408 people found short-term relief. For fibromyalgia, nine studies with 404 people found benefit from massage lasting at least five weeks. For tension headache, massage did no better than an inactive treatment. For people with cancer, the evidence that massage eases symptoms is of very low quality. Low back pain has a separate entry here, built on a trial of 401 people. The pattern across all of these is the one that runs through this topic: massage tends to help for a while, it is very safe for most people, and the size and length of the benefit depend on the problem. That makes it a good fit for a therapy you track rather than take on faith, and the Using Them Well entries describe how.",
    citations: [
      {
        source: 'National Center for Complementary and Integrative Health: Massage Therapy: What You Need To Know',
        url: 'https://www.nccih.nih.gov/health/massage-therapy-what-you-need-to-know',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-evidence-massage-back-pain-trial',
      'handson-technique-massage-styles',
      'handson-tracking-whether-it-works',
    ],
  },
  {
    id: 'handson-evidence-acupuncture-beyond-pain',
    category: 'basicHealth',
    title: 'Electroacupuncture Reduced Urine Leakage in Women Compared With Sham Needling',
    teaser:
      'In a trial of 504 women with stress incontinence, six weeks of electroacupuncture cut leakage far more than needles that never broke the skin.',
    summary:
      "Most acupuncture research is about pain, but some of the strongest single trials are not. In a 2017 trial published in JAMA, 504 women with stress urinary incontinence, leakage when coughing, laughing or lifting, were randomly assigned to 18 sessions of electroacupuncture to the lower back over six weeks, or to a sham in which the needles did not go into the skin. At six weeks, urine leakage on a standard one-hour pad test fell by 9.9 grams with electroacupuncture against 2.6 grams with the sham, a difference of 7.4 grams. The trial compared acupuncture with a sham rather than with pelvic floor exercises, which remain the usual first treatment, so it shows that electroacupuncture does something and does not show that it beats the standard approach. The NCCIH also lists nausea and vomiting from cancer treatment and seasonal allergy symptoms among the uses with encouraging evidence, and says acupuncture may improve quality of life in asthma without improving lung function. It has also been tested and found no better than sham for some conditions, which the entry on where acupuncture has come up empty sets out.",
    citations: [
      {
        source:
          'Liu Z, Liu Y, Xu H, et al. 2017: Effect of Electroacupuncture on Urinary Leakage Among Women With Stress Urinary Incontinence: A Randomized Clinical Trial (JAMA 317(24):2493-2501)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28655016/',
      },
      {
        source: 'National Center for Complementary and Integrative Health: Acupuncture: What You Need To Know',
        url: 'https://www.nccih.nih.gov/health/acupuncture-what-you-need-to-know',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-acupuncture-where-it-does-nothing',
      'handson-technique-acupuncture-styles',
      'handson-acupuncture-chronic-pain',
    ],
  },
  {
    id: 'handson-using-where-they-fit',
    category: 'basicHealth',
    title: 'Where Hands-On Therapies Fit Beside Medicine, by the Evidence',
    teaser:
      'For common back, neck and joint pain these therapies belong near the start of care, not at the end of it. For disease of an organ they belong beside treatment, never in place of it.',
    summary:
      "The reputation of these three therapies in Western medicine was shaped by more than evidence. Chiropractic was the target of an organized boycott that a federal court ruled unlawful, and massage was moved out of everyday nursing as pain pills took over, not because a trial found it useless. The guidelines have since moved: for low back pain the American College of Physicians puts massage, acupuncture and spinal manipulation ahead of medicines as a first choice, and the CDC tells doctors to make the most of them before opioids for back pain, neck pain and tension headache. So for common aches of the back, neck and joints, it is fair to say these belong near the start of care. Two limits go with it. First, the benefits found for pain are modest and often short lived, about the size found for the medicines they are compared with, so a therapy that is not helping you after a fair run is worth changing. Second, the evidence thins out away from muscle and joint pain: claims that an adjustment treats an organ, and acupuncture for irritable bowel syndrome, have been tested and not borne out. New or worsening pain, numbness, weakness, fever, or pain with weight loss needs a doctor first. Medicine, hands-on care, movement, food and sleep each have a place, and your records can show which ones are working for you.",
    citations: [
      {
        source:
          'Qaseem A, Wilt TJ, McLean RM, Forciea MA. 2017: Noninvasive Treatments for Acute, Subacute, and Chronic Low Back Pain: A Clinical Practice Guideline From the American College of Physicians (Ann Intern Med 166(7):514-530)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28192789/',
      },
      {
        source:
          'Dowell D, Ragan KR, Jones CM, Baldwin GT, Chou R. 2022: CDC Clinical Practice Guideline for Prescribing Opioids for Pain, United States, 2022 (MMWR Recomm Rep 71(3):1-95)',
        url: 'https://www.cdc.gov/mmwr/volumes/71/rr/rr7103a1.htm',
      },
      {
        source:
          'Wilk v. American Medical Association, 671 F. Supp. 1465 (N.D. Ill. 1987), affirmed 895 F.2d 352 (7th Cir. 1990)',
        url: 'https://biotech.law.lsu.edu/cases/antitrust/wilk_v_ama.htm',
      },
    ],
    overallTier: 'moderate',
    relatedIds: [
      'handson-evidence-guidelines-first-line',
      'handson-chiropractic-organ-claims',
      'handson-acupuncture-where-it-does-nothing',
      'handson-tracking-whether-it-works',
    ],
  },
];
