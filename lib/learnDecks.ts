// Interests > Learn, the ready-made decks (2026-10-30, Learn part 6a). These
// live in code rather than the database, so an update can add to them and
// every phone has the same cards; what a person answered is kept in
// learn_reviews against each card's id, which never changes once shipped.
//
// Standing rules, checked by scripts/test_learn.js:
// 1. In every deck, cards marked thinking (how to weigh a claim, rather than
//    a fact to remember) are the majority, by direct decision 2026-10-06.
// 2. A card's id is never reused for different words. A card whose words
//    change in a way that changes the answer gets a new id.
// 3. Cards say what the evidence shows and how strong it is. None tells the
//    person what to do about their health, and none scores them.
// 4. Each card stands alone, so a sitting can offer any card in any order.
// 5. A card's kind and its parts (lib/learnKinds.ts) agree, and every option
//    of a choice says why it is or is not the answer.
// 6. A card drawn from the reading (Learn part 6c) names its entry in
//    entryId, and says nothing that entry does not say, so the entry's
//    citations and evidence tier stand behind it. Every entryId resolves.

import type { LearnCardParts } from './learnKinds';

export type LearnSource = { source: string; url: string };

export type LearnCard = LearnCardParts & {
  id: string;
  /** The question side. */
  front: string;
  /** The answer side, short enough to read at a glance. */
  back: string;
  /** About weighing evidence or a claim, rather than a fact to remember. */
  thinking: boolean;
  source?: LearnSource;
  /** The reading entry the card is drawn from, whose citations it rests on. */
  entryId?: string;
};

export type LearnDeck = {
  id: string;
  title: string;
  about: string;
  cards: LearnCard[];
};

const EVIDENCE: LearnDeck = {
  id: 'evidence',
  title: 'Thinking About Evidence',
  about: 'How to weigh a claim about health, food or anything else: what kind of study it rests on, what a headline leaves out, and what one person’s records can and cannot show.',
  cards: [
    {
      id: 'evidence-coffee',
      front: 'A study finds that people who drink coffee live longer. What can that study not tell you by itself?',
      back: 'Whether coffee is the reason. People who drink coffee may differ in other ways, such as income, work or health, and a study that only watches people cannot fully separate those out.',
      thinking: true,
    },
    {
      id: 'evidence-ice-cream',
      front: 'Ice cream sales and drownings rise and fall together through the year. Why?',
      back: 'Hot weather drives both. Something that moves two things at once is called a confounder, and it can make two unrelated things look connected.',
      thinking: true,
    },
    {
      id: 'evidence-rct',
      front: 'What does a randomized controlled trial do that a study of people going about their lives cannot?',
      back: 'Chance decides who gets the treatment and who does not, so on average the two groups differ only by the treatment. A difference between them afterwards is then much more likely to come from the treatment.',
      thinking: true,
    },
    {
      id: 'evidence-placebo',
      front: 'Why do trials give one group a placebo instead of nothing?',
      back: 'Expecting to feel better, and the extra attention of being in a trial, can change how people feel and what they report. A placebo group shows how much of the change comes from those alone.',
      thinking: true,
    },
    {
      id: 'evidence-meta-analysis',
      front: 'Why does a meta-analysis of many trials usually count for more than a single trial?',
      back: 'It pools the trials, so one unusual result counts for less. It is still only as good as the trials that went into it.',
      thinking: true,
    },
    {
      id: 'evidence-case-report',
      front: 'What is a case report, and what can it show?',
      back: 'A description of what happened to one patient or a few. It can raise a question worth testing, but it cannot show how often something works or whether it would have happened anyway.',
      thinking: true,
    },
    {
      id: 'evidence-anecdote',
      front: 'A friend says a juice cleared up her joint pain. What would you want to know before reading much into it?',
      back: 'Whether the pain would have eased anyway, what else changed at the same time, and how many people tried the juice with no change. Pain often comes and goes, so improvement after starting something is common either way.',
      thinking: true,
    },
    {
      id: 'evidence-regression',
      front: 'What is regression to the mean?',
      back: 'An unusually bad reading or day tends to be followed by one closer to usual. Something started at the worst moment can look as if it worked when things were about to ease by themselves.',
      thinking: true,
      source: {
        source: 'Barnett, van der Pols and Dobson, International Journal of Epidemiology, 2005',
        url: 'https://doi.org/10.1093/ije/dyh299',
      },
    },
    {
      id: 'evidence-doubles',
      front: 'A headline says a food doubles your risk of a disease. What is the first thing to ask?',
      back: 'Doubles from what? A risk going from 1 in 10,000 to 2 in 10,000 has doubled and is still small. The absolute numbers say more than the relative change.',
      thinking: true,
    },
    {
      id: 'evidence-significant',
      front: 'A result is described as statistically significant. Does that mean the effect is large?',
      back: 'No. It means the result would be unlikely if there were no effect at all, provided the study’s assumptions hold. A tiny effect in a large study can be significant, and the American Statistical Association warns against reading it as importance.',
      thinking: true,
      source: {
        source: 'Wasserstein and Lazar, The American Statistician, 2016',
        url: 'https://doi.org/10.1080/00031305.2016.1154108',
      },
    },
    {
      id: 'evidence-mice',
      front: 'A study shows a food extract shrank tumours in mice. What does that tell you about people?',
      back: 'That it may be worth testing in people. Many findings in animals are not repeated when tested in humans, so it is an early step rather than an answer.',
      thinking: true,
      source: {
        source: 'Hackam and Redelmeier, JAMA, 2006',
        url: 'https://doi.org/10.1001/jama.296.14.1731',
      },
    },
    {
      id: 'evidence-funding',
      front: 'Why does it matter who paid for a study?',
      back: 'Funding does not by itself make a result untrue. A Cochrane review found studies paid for by the maker of a drug or device more often reported results and conclusions that favoured it, so independent studies finding the same thing add weight.',
      thinking: true,
      source: {
        source: 'Lundh and colleagues, Cochrane Database of Systematic Reviews, 2017',
        url: 'https://doi.org/10.1002/14651858.MR000033.pub3',
      },
    },
    {
      id: 'evidence-sift',
      front: 'What are the four moves of SIFT, for checking something you read online?',
      back: 'Stop. Investigate the source. Find better coverage. Trace claims, quotes and media back to where they started.',
      thinking: true,
      source: {
        source: 'Mike Caulfield, SIFT (The Four Moves), 2019',
        url: 'https://hapgood.us/2019/06/19/sift-the-four-moves/',
      },
    },
    {
      id: 'evidence-pattern-finder',
      front: 'Pattern Finder shows a flare came after a food four times. What can you say from that?',
      back: 'That flares tended to follow that food in your records. Not that the food causes them: something else may come with it, and four times can happen by chance. Leaving it out and then bringing it back tells you more.',
      thinking: true,
    },
    {
      id: 'evidence-sample-of-one',
      front: 'Why is what you learn from your records worth having, even though it is a sample of one?',
      back: 'It is about the one body you live in. A trial says what happens on average across many people, and you may not be average. Your records cannot prove a cause, but they can tell you what is worth testing.',
      thinking: true,
    },
    {
      id: 'evidence-strongest-choice',
      kind: 'choice',
      front: 'Which of these usually gives the strongest evidence that a treatment works?',
      options: [
        { text: 'A case report about one patient', why: 'It describes what happened to one person, with nobody to compare them with.' },
        { text: 'An expert’s opinion', why: 'An opinion with no study to rest on counts for least, however experienced the expert.' },
        { text: 'A systematic review of randomized trials', why: 'It gathers the trials in which chance decided who was treated, and weighs them together.' },
        { text: 'A survey of people who tried it', why: 'People who felt better are likelier to answer, and nobody who went without it is compared.' },
      ],
      answer: 2,
      back: 'A systematic review of randomized trials. Chance deciding who is treated rules out most other explanations, and pooling trials keeps one unusual result from deciding it.',
      thinking: true,
    },
    {
      id: 'evidence-ladder-order',
      kind: 'order',
      front: 'Put these in order, from the weakest evidence that a treatment works to the strongest.',
      items: [
        'An expert’s opinion',
        'A case report',
        'A study watching people over time',
        'A randomized controlled trial',
        'A systematic review of randomized trials',
      ],
      back: 'An opinion rests on no data, a case report has no comparison, a study watching people has a comparison that chance did not decide, a trial has one chance decided, and a review pools several trials.',
      thinking: true,
    },
    {
      id: 'evidence-terms-pairs',
      kind: 'pairs',
      front: 'Match each word to what it means in a study.',
      pairs: [
        { left: 'Confounder', right: 'Something that moves two things at once' },
        { left: 'Placebo', right: 'A dummy that looks the same as the treatment' },
        { left: 'Randomized', right: 'Chance decides who gets what' },
        { left: 'Blinded', right: 'Who got what is kept hidden' },
      ],
      back: 'A confounder moves two things at once, a placebo looks the same as the treatment, randomized means chance decides who gets what, and blinded means who got what is kept hidden.',
      thinking: false,
    },
    {
      id: 'evidence-confounder-blank',
      kind: 'blank',
      front: 'Something that moves two things at once, making them look connected, is called a ____.',
      accept: ['confounder', 'confounding factor', 'confounding variable', 'factor de confusión'],
      back: 'A confounder. Hot weather is what drives ice cream sales and drownings rising together.',
      thinking: false,
    },
    {
      id: 'evidence-doubling-estimate',
      kind: 'estimate',
      front: 'A risk of 1 in 10,000 doubles. About how many people in 10,000 does it now affect?',
      options: [
        { text: 'About 2', why: 'Twice 1 is 2, so one more person in every ten thousand.' },
        { text: 'About 200', why: 'That would be two hundred times as many, not twice.' },
        { text: 'About 2,000', why: 'That would be one person in five.' },
        { text: 'About half of them', why: 'Doubling a small risk leaves it small.' },
      ],
      answer: 0,
      back: 'About 2 in 10,000. Doubles sounds large, and here it means one more person in ten thousand.',
      thinking: true,
    },
    {
      id: 'evidence-worst-week-case',
      kind: 'case',
      story: 'Ana starts a supplement in the worst week of joint pain she has had all year. Two weeks later the pain is much better, and she tells everyone the supplement did it.',
      front: 'What is the first other explanation worth ruling out?',
      options: [
        { text: 'The pain was easing by itself after its worst point', why: 'Pain at its worst usually eases back toward usual whatever is started then. This is regression to the mean.' },
        { text: 'The supplement is not what its label says', why: 'Nothing in the story suggests that, and a supplement that is what it says may still not be the reason.' },
        { text: 'She imagined the pain', why: 'Nothing suggests the pain was not there. The question is what eased it.' },
        { text: 'It only works for people like her', why: 'It might, but the timing alone cannot show it worked at all.' },
      ],
      answer: 0,
      back: 'That the pain was easing anyway. Starting something at the worst moment makes it look as if it worked. A few more ups and downs on record would say more than one improvement.',
      thinking: true,
    },
    {
      id: 'evidence-together-explain',
      kind: 'explain',
      front: 'In your words, why does two things happening together not show that one causes the other?',
      back: 'Something else may drive both, the cause may run the other way, or it may be chance. Showing a cause needs a comparison where only the one thing differs, which is what a randomized trial sets up.',
      thinking: true,
    },
    {
      id: 'evidence-chocolate-choice',
      kind: 'choice',
      front: 'A headline says eating chocolate is linked to winning Nobel prizes. What does linked most likely mean here?',
      options: [
        { text: 'Countries that eat more chocolate have more Nobel winners for their size', why: 'That is what a 2012 comparison of countries found, and it says nothing about any one person.' },
        { text: 'People who ate more chocolate won more prizes', why: 'The comparison was between whole countries. Nobody’s eating was looked at.' },
        { text: 'Chocolate makes people cleverer', why: 'A link between countries cannot show what chocolate does to anyone. Wealth, for one, goes with both.' },
        { text: 'Nobel winners were given chocolate', why: 'Nothing like that was studied.' },
      ],
      answer: 0,
      back: 'That countries eating more chocolate had more laureates for their population. Comparing whole countries can hide a confounder such as wealth, and says nothing about one person.',
      thinking: true,
      source: {
        source: 'Messerli, New England Journal of Medicine, 2012',
        url: 'https://doi.org/10.1056/NEJMon1211064',
      },
    },
  ],
};

const GUT: LearnDeck = {
  id: 'gut',
  title: 'The Gut and What Feeds It',
  about: 'What gut bacteria make from fiber, what the gut lining is made of, and how to weigh what is said about probiotics, supplements and leaky gut. Drawn from the reading, with each card opening the entry it comes from.',
  cards: [
    {
      id: 'gut-fiber-scfa',
      front: 'What do gut bacteria make when they ferment fiber, and what did two 2013 studies find it does?',
      back: 'Short-chain fatty acids, mainly butyrate, propionate and acetate. Two separate studies found they train immune cells toward tolerance rather than attack.',
      thinking: false,
      entryId: 'gut-scfa-treg',
    },
    {
      id: 'gut-two-groups-choice',
      kind: 'choice',
      front: 'Two research groups working apart published the same finding about fiber and immune tolerance in 2013. Why does that count for more than one study?',
      options: [
        { text: 'Two groups working apart are unlikely to share the same mistake', why: 'They came at it from different angles and still arrived at the same place.' },
        { text: 'Two studies settle any question', why: 'Two can still share a limit, such as both being done in animals.' },
        { text: 'The second copied the first', why: 'They worked separately, which is what makes the agreement worth something.' },
        { text: 'Both were in famous journals', why: 'Where a study is published says little about whether it holds.' },
      ],
      answer: 0,
      back: 'Independent groups reaching one answer by different routes make a shared mistake less likely. That is why a finding repeated elsewhere carries more weight than one result.',
      thinking: true,
      entryId: 'gut-scfa-treg',
    },
    {
      id: 'gut-glutamine-case',
      kind: 'case',
      story: 'A supplement fuels the cells lining the gut and helps hold their seals together in lab studies, and trials show it helps after burns. A website says it heals a leaky gut.',
      front: 'What would you most want to see before believing the website?',
      options: [
        { text: 'Trials testing that exact claim, pooled together', why: 'A mechanism and success in other settings do not show the broader claim holds.' },
        { text: 'More lab studies of the seals', why: 'They show how it could work, not whether it does in people for this.' },
        { text: 'Stories from people who took it', why: 'People who felt better are likelier to tell, and nobody is compared.' },
        { text: 'How often it is recommended', why: 'Being repeated often says nothing about whether it holds.' },
      ],
      answer: 0,
      back: 'Trials of the claim itself. When 10 trials of glutamine and gut permeability, 352 people in all, were pooled, they found no clear overall improvement.',
      thinking: true,
      entryId: 'gut-glutamine-null-result',
    },
    {
      id: 'gut-mechanism-explain',
      kind: 'explain',
      front: 'In your words, why does a working mechanism not show that a supplement helps?',
      back: 'A mechanism shows how something could work. Whether it does in people, for the problem claimed, takes trials of that claim, and glutamine for gut permeability is a case where pooled trials did not find it.',
      thinking: true,
      entryId: 'gut-glutamine-null-result',
    },
    {
      id: 'gut-probiotic-vague',
      front: 'Why is "probiotics help the gut" too vague to test?',
      back: 'Probiotics are many different organisms. Two well-studied strains repair the gut barrier through different proteins, so what holds for one says little about another. The useful question is which strain, doing what.',
      thinking: true,
      entryId: 'gut-strain-specific-mechanisms',
    },
    {
      id: 'gut-leaky-two-claims',
      kind: 'choice',
      front: 'Gut permeability can be measured, yet many doctors doubt "leaky gut syndrome". How can both be so?',
      options: [
        { text: 'Permeability is measurable, while the syndrome has no agreed definition or test threshold yet', why: 'They are two separate claims, one about biology and one about a diagnosis.' },
        { text: 'The measurements are made up', why: 'Tests such as lactulose-mannitol measure it directly.' },
        { text: 'Doctors have not heard of it', why: 'The doubt is about a diagnosis without an agreed definition, not about the biology.' },
        { text: 'One of them has to be untrue', why: 'A measurable finding and a debated diagnosis can both stand.' },
      ],
      answer: 0,
      back: 'Permeability is measurable and linked to several autoimmune conditions; leaky gut syndrome as a diagnosis has no agreed definition yet. Keeping the two apart avoids both dismissing it and overselling it.',
      thinking: true,
      entryId: 'gut-leaky-gut-contested',
    },
    {
      id: 'gut-barrier-pairs',
      kind: 'pairs',
      front: 'Match each to what the reading says about it.',
      pairs: [
        { left: 'E. coli Nissle 1917', right: 'Restores ZO-1, ZO-2 and claudin-14' },
        { left: 'Bifidobacterium bifidum', right: 'Restores occludin' },
        { left: 'Butyrate', right: 'Made when bacteria ferment fiber' },
        { left: 'Glutamine', right: 'A fuel the gut lining burns' },
      ],
      back: 'Two strains, two different repair routes in the gut barrier; butyrate comes from fiber; glutamine fuels the lining, though pooled trials did not find it improves permeability.',
      thinking: false,
      entryId: 'gut-strain-specific-mechanisms',
    },
    {
      id: 'gut-scfa-blank',
      kind: 'blank',
      front: 'Butyrate, propionate and acetate are short-chain ____ acids.',
      accept: ['fatty', 'grasos'],
      back: 'Short-chain fatty acids, made when gut bacteria ferment fiber.',
      thinking: false,
      entryId: 'gut-scfa-treg',
    },
  ],
};

const ADDITIVES: LearnDeck = {
  id: 'additives',
  title: 'What Gets Added to Food',
  about: 'MSG, trans fats, phosphates, carrageenan and nitrates, and how strong the evidence is for each, from banned to still unsettled. Drawn from the reading, with each card opening the entry it comes from.',
  cards: [
    {
      id: 'additives-msg-blinded-case',
      kind: 'case',
      story: 'People who say MSG makes them ill are given capsules, some with MSG and some without, and nobody knows which they got. Most of these trials could not bring the symptoms back.',
      front: 'What does hiding which capsule was which show?',
      options: [
        { text: 'It separates what the additive does from what expecting it does', why: 'Knowing what you took can shape what you feel, so hiding it leaves only the additive.' },
        { text: 'MSG only matters in capsules', why: 'The capsule hides what is in it; the MSG is the same.' },
        { text: 'The people were not unwell', why: 'The trials do not say anyone invented feeling ill, only that MSG did not reliably bring it on.' },
        { text: 'Hiding it makes no difference', why: 'Without it, expectation and the additive cannot be told apart.' },
      ],
      answer: 0,
      back: 'Blinded trials mostly could not reproduce the symptoms when people did not know whether they had MSG, which leaves the additive, in ordinary amounts, unlikely to explain them.',
      thinking: true,
      entryId: 'additive-msg',
    },
    {
      id: 'additives-msg-dose-choice',
      kind: 'choice',
      front: 'Animal studies of MSG at high doses show effects in the brain. Why do they say little about a meal?',
      options: [
        { text: 'The doses were far beyond what food gives, and often injected rather than eaten', why: 'How much and how it gets in change the question.' },
        { text: 'Animal studies tell us nothing', why: 'They can show what is possible; here the dose and the route are the gap.' },
        { text: 'MSG is a different compound in animals', why: 'It is the same compound. The amount and route differ.' },
        { text: 'The studies are too old', why: 'Their age is not what limits them.' },
      ],
      answer: 0,
      back: 'The amounts were far beyond ordinary eating, often given by injection. A finding at one dose and route does not carry over to another by itself.',
      thinking: true,
      entryId: 'additive-msg',
    },
    {
      id: 'additives-trans-fats',
      front: 'Which additive did the US FDA take out of the food supply, and why?',
      back: 'Artificial trans fats. They raise LDL and lower HDL cholesterol together, and decades of trials and cohort studies tie them to heart disease. Their safe status was revoked in 2015 and the ban was complete by 2018.',
      thinking: false,
      entryId: 'additive-trans-fats',
    },
    {
      id: 'additives-phosphate-estimate',
      kind: 'estimate',
      front: 'Phosphate added to processed food is absorbed at about nine in ten. About how much of the phosphate bound in whole foods such as legumes is absorbed?',
      options: [
        { text: 'About four to six in ten', why: 'Phosphate held in whole food is taken up less readily.' },
        { text: 'All of it', why: 'Food-bound phosphate is absorbed less than the added kind, not more.' },
        { text: 'None of it', why: 'Phosphorus is an essential mineral, and whole food supplies it.' },
        { text: 'About nine in ten as well', why: 'The two forms are absorbed differently.' },
      ],
      answer: 0,
      back: 'About four to six in ten. The same mineral is taken up differently depending on where it comes from.',
      thinking: false,
      entryId: 'additive-phosphates',
    },
    {
      id: 'additives-phosphate-trial-choice',
      kind: 'choice',
      front: 'A three-week trial found more added phosphate raised the phosphorus people passed in urine, but not two markers of kidney strain. What is fair to say?',
      options: [
        { text: 'It was absorbed as expected, and its longer-term effects are still open', why: 'A short trial answers a narrow question and leaves the longer one.' },
        { text: 'Phosphate additives are proven harmless', why: 'Three weeks in one group cannot show that.' },
        { text: 'The trial proves harm', why: 'The markers of strain did not rise in that trial.' },
        { text: 'The trial tells us nothing', why: 'It answered a narrow question clearly.' },
      ],
      answer: 0,
      back: 'That the added form was absorbed as expected and did not raise those markers over three weeks. Its effects over years are more open than often presented.',
      thinking: true,
      entryId: 'additive-phosphates',
    },
    {
      id: 'additives-carrageenan-choice',
      kind: 'choice',
      front: 'Degraded carrageenan inflames the gut in animal studies and is not approved for food. What does the evidence say about food-grade carrageenan?',
      options: [
        { text: 'Still unsettled', why: 'Studies of whether it breaks down into the harmful form conflict, and no large human trial has settled it.' },
        { text: 'Proven harmful', why: 'The harm was shown for the degraded form, which is a different substance.' },
        { text: 'Proven safe', why: 'Conflicting findings settle it neither way.' },
        { text: 'It is the same as the degraded form', why: 'The two are chemically distinct.' },
      ],
      answer: 0,
      back: 'Still unsettled. The two forms are chemically different, and whether food-grade carrageenan degrades in the stomach or in processing has conflicting findings.',
      thinking: true,
      entryId: 'additive-carrageenan',
    },
    {
      id: 'additives-nitrate-blank',
      kind: 'blank',
      front: 'Nitrate competes with iodine for the transporter the thyroid uses to take it in, the sodium-iodide ____.',
      accept: ['symporter', 'simportador', 'NIS'],
      back: 'The sodium-iodide symporter. Where iodine is already short, that competition can reduce how much the thyroid takes up.',
      thinking: false,
      entryId: 'additive-nitrates-nitrites',
    },
    {
      id: 'additives-evidence-pairs',
      kind: 'pairs',
      front: 'Match each additive to how strong the evidence about it is.',
      pairs: [
        { left: 'Trans fats', right: 'Strong enough that regulators banned them' },
        { left: 'MSG', right: 'Blinded trials mostly could not reproduce symptoms' },
        { left: 'Carrageenan', right: 'Still unsettled' },
        { left: 'Phosphates', right: 'Absorbed more readily than whole-food phosphate' },
      ],
      back: 'Feared additives sit at very different places: one banned on strong evidence, one that controlled trials mostly did not bear out, one unsettled, and one where the source of a mineral changes how it is taken up.',
      thinking: true,
      entryId: 'additive-trans-fats',
    },
  ],
};

const SOIL: LearnDeck = {
  id: 'soil',
  title: 'Living Soil',
  about: 'Compost, mulch, no-dig beds, cover crops, lead in old soil, and what the soil bacteria studies do and do not show. Drawn from the reading, with each card opening the entry it comes from.',
  cards: [
    {
      id: 'soil-compost-estimate',
      kind: 'estimate',
      front: 'In a compost pile, about how many parts browns, such as dry leaves or cardboard, go with one part greens, such as scraps?',
      options: [
        { text: 'Two to three', why: 'That is the mix the EPA guidance gives.' },
        { text: 'None at all', why: 'Browns are half of the pairing; greens alone are not the recipe given.' },
        { text: 'About ten', why: 'That is far more than the guidance gives.' },
        { text: 'Half a part', why: 'The guidance puts more browns than greens, not fewer.' },
      ],
      answer: 0,
      back: 'Two to three parts browns to one part greens, kept moist and turned now and then, gives finished compost in about three to five months.',
      thinking: false,
      entryId: 'garden-composting-at-home',
    },
    {
      id: 'soil-compost-carbon-choice',
      kind: 'choice',
      front: 'The EPA notes that compost spread on land keeps carbon in the soil. A friend says one garden’s compost will fix the climate. What is fair?',
      options: [
        { text: 'It is a small, household version of something that matters at far larger scale', why: 'The principle holds; one garden is tiny beside farmland.' },
        { text: 'It does nothing at all', why: 'Carbon kept in soil is carbon not in the air, however small the amount.' },
        { text: 'One garden is enough', why: 'One garden is a tiny share of the land involved.' },
        { text: 'Compost releases more carbon than it keeps', why: 'The EPA guidance says the opposite.' },
      ],
      answer: 0,
      back: 'A small, household version of the soil-carbon principle. Both halves are true: it counts, and it is small.',
      thinking: true,
      entryId: 'garden-composting-at-home',
    },
    {
      id: 'soil-lead-case',
      kind: 'case',
      story: 'Sam wants a vegetable garden beside a house built in the 1950s, close to a busy road. Nobody knows the history of the soil.',
      front: 'What is worth finding out first?',
      options: [
        { text: 'How much lead is in the soil, through a test from a local extension office', why: 'Old paint and old leaded gasoline can leave lead in soil where nobody can see it, and a test says how much before anything is planted.' },
        { text: 'Whether carrots grow well there', why: 'Root crops such as carrots take up lead readily, and growing well says nothing about lead.' },
        { text: 'Which fertilizer to buy', why: 'Fertilizer does nothing about lead.' },
        { text: 'Nothing, soil is soil', why: 'An old house and a busy road are the two settings the guidance names.' },
      ],
      answer: 0,
      back: 'A soil test first. Where the history is unknown, especially near old paint or a busy road, the amount of lead decides what is safe to grow and whether to build a raised bed on top.',
      thinking: true,
      entryId: 'garden-soil-safety-lead',
    },
    {
      id: 'soil-lead-order',
      kind: 'order',
      front: 'Put these in order, from the least lead in the soil to the most, by what University of Maryland Extension advises at each.',
      items: [
        'Any vegetable is considered safe to grow',
        'Only fruiting crops such as tomatoes and squash',
        'A raised bed of clean soil and compost on top',
        'Removing the soil',
      ],
      back: 'Up to 400 ppm, any vegetable; 401 to 1,000, fruiting crops only; above 1,000, a raised bed at least eight inches deep on top; above 5,000, removing the soil.',
      thinking: false,
      entryId: 'garden-soil-safety-lead',
    },
    {
      id: 'soil-microbe-mood-choice',
      kind: 'choice',
      front: 'A soil bacterium, Mycobacterium vaccae, made mice behave in less stressed ways. A post says gardening is a natural antidepressant. What is missing?',
      options: [
        { text: 'A controlled trial in people', why: 'Both studies were in mice, and no equivalent human trial has tested the same chain.' },
        { text: 'Nothing, since mice and people are alike', why: 'Effects in mice often do not carry over to people.' },
        { text: 'A larger mouse study', why: 'More mice would still not show it in people.' },
        { text: 'A well-known gardener’s view', why: 'An opinion adds no data.' },
      ],
      answer: 0,
      back: 'A trial in people. The mouse findings point to a plausible mechanism, and that is as far as they go.',
      thinking: true,
      entryId: 'garden-mycobacterium-vaccae-soil-microbes-mood',
    },
    {
      id: 'soil-cover-crops-choice',
      kind: 'choice',
      front: 'Cover crops are among the cheapest, best understood ways to protect soil, yet in 2022 they were on under one in twenty acres of US cropland. What best explains the gap?',
      options: [
        { text: 'Equipment, crop-insurance rules and tight farm labor calendars', why: 'Those are the barriers the reading names, and a home garden faces none of them.' },
        { text: 'Cover crops do not work', why: 'How rarely something is used says nothing about whether it works.' },
        { text: 'They are not allowed', why: 'Nothing forbids them.' },
        { text: 'Nobody has studied them', why: 'They are well studied.' },
      ],
      answer: 0,
      back: 'Practical and economic barriers on farms, not the practice itself. Low use and weak evidence are two different things.',
      thinking: true,
      entryId: 'garden-cover-crops-home',
    },
    {
      id: 'soil-mulch-explain',
      kind: 'explain',
      front: 'Mulch is said to cut watering by about half. In your words, what would you want to know before counting on that in your garden?',
      back: 'Where the figure comes from (here Colorado State University Extension) and how your climate, soil and mulch compare. A figure from one place is a starting point to check against your garden.',
      thinking: true,
      entryId: 'garden-mulching',
    },
    {
      id: 'soil-no-dig',
      front: 'Why does a no-dig bed leave the ground undug?',
      back: 'Undisturbed soil keeps its microbial life intact, where digging breaks it up. Layers of cardboard, browns and greens build the bed on top instead, with no turning.',
      thinking: false,
      entryId: 'garden-no-dig-raised-beds',
    },
    {
      id: 'soil-practice-pairs',
      kind: 'pairs',
      front: 'Match each to what it does for the soil.',
      pairs: [
        { left: 'Mulch', right: 'Holds moisture and keeps down weeds' },
        { left: 'Clover as a cover crop', right: 'Adds nitrogen' },
        { left: 'Winter rye', right: 'Sprouts in soil as cold as 35°F' },
        { left: 'Finished compost', right: 'Improves water holding and structure' },
      ],
      back: 'Mulch holds moisture and keeps down weeds, clover adds nitrogen, winter rye sprouts late in cold soil, and compost improves how soil holds water and its structure.',
      thinking: false,
      entryId: 'garden-cover-crops-home',
    },
  ],
};

export const LEARN_DECKS: LearnDeck[] = [EVIDENCE, GUT, ADDITIVES, SOIL];

export function deckById(id: string): LearnDeck | undefined {
  return LEARN_DECKS.find((deck) => deck.id === id);
}

export function cardById(id: string): { deck: LearnDeck; card: LearnCard } | undefined {
  for (const deck of LEARN_DECKS) {
    const card = deck.cards.find((c) => c.id === id);
    if (card) return { deck, card };
  }
  return undefined;
}
