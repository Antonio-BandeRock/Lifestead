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

export type LearnSource = { source: string; url: string };

export type LearnCard = {
  id: string;
  /** The question side. */
  front: string;
  /** The answer side, short enough to read at a glance. */
  back: string;
  /** About weighing evidence or a claim, rather than a fact to remember. */
  thinking: boolean;
  source?: LearnSource;
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
  ],
};

export const LEARN_DECKS: LearnDeck[] = [EVIDENCE];

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
