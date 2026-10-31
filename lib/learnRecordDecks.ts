// Interests > Learn, decks made from the person's records (2026-10-30, Learn
// part 6d). Rebuilt every time Learn opens, from what the records hold that
// day, so a medicine stopped or a crop pulled leaves its deck by itself.
// Pure, with no imports beyond types, so scripts/test_learn.js checks it
// without a phone; lib/learnRecordDecksDb.ts gathers the inputs.
//
// Three decks, each shown only when there is something to make it from:
//   rec-meds    the timing and caution rules this app holds that concern
//               what the person takes (the same matching as Today's
//               Advisories, through rulesConcerningMyMeds), each rule
//               paired with a card on weighing the source it cites
//   rec-garden  the three problems each crop being grown is known for
//               (lib/cropProblems.ts), read as a sign to match to a cause
//   rec-guess   guess then reveal on the person's records: what they ate
//               most, how many days hold a meal, what went in the ground
//               first, which interest has had the most time
//
// The same rules as the ready-made decks hold: thinking cards are the
// majority of every deck, a card's id changes whenever its answer would,
// nothing scores the person or tells them what to do about their health,
// and a medicine card only ever says what the rule says, ending where a
// dose is the prescriber's to change.

import type { LearnCard, LearnDeck } from './learnDecks';
import type { LearnOption } from './learnKinds';

export type Translate = (text: string, values?: Record<string, string | number>) => string;

/** One rule from the interaction rules that concerns what the person takes. */
export type MedRuleInput = {
  ruleId: string;
  ruleType: string;
  title: string;
  guidance: string;
  citation: string;
  /** For a timing rule, the hours it asks for between the two. */
  hours: number | null;
  /** The person's names for what the rule's two halves matched. */
  namesA: string[];
  namesB: string[];
};

export type CropProblemInput = { label: string; looks: string; why: string; fix: string };

export type CropInput = { key: string; name: string; problems: CropProblemInput[] };

export type GuessInputs = {
  /** Foods logged in the last 30 days, with how many days each was eaten on. */
  foodDays: { name: string; days: number }[];
  /** Days of the last 30 holding at least one logged meal. */
  mealDays: number;
  /** What is growing now, with the day each went in. */
  plantings: { name: string; plantedAt: string }[];
  /** Minutes given to each interest through Sessions in the last 90 days. */
  interestMinutes: { name: string; minutes: number }[];
};

export type RecordDeckInputs = {
  meds: MedRuleInput[];
  crops: CropInput[];
  guess: GuessInputs;
};

export const RECORD_DECK_IDS = ['rec-meds', 'rec-garden', 'rec-guess'] as const;

/** The most crops the garden deck carries, so a big garden stays a sitting. */
export const MAX_CROPS = 5;

const HOUR_CHOICES = [1, 2, 4, 8];

function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Puts the answer among the others at a place fixed by the card's id. */
function placeAnswer(id: string, answer: LearnOption, others: LearnOption[]): { options: LearnOption[]; answer: number } {
  const at = hash(id) % (others.length + 1);
  const options = [...others];
  options.splice(at, 0, answer);
  return { options, answer: at };
}

function joinNames(names: string[], t: Translate): string {
  const unique = [...new Set(names)];
  if (unique.length <= 1) return unique[0] ?? '';
  return t('{first} or {last}', { first: unique.slice(0, -1).join(', '), last: unique[unique.length - 1] });
}

function hoursText(hours: number, t: Translate): string {
  return hours === 1 ? t('1 hour') : t('{n} hours', { n: hours });
}

function formatDay(day: string): string {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return day;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

// ---------------------------------------------------------------- medicines

function medCards(rule: MedRuleInput, t: Translate): LearnCard[] {
  const a = joinNames(rule.namesA, t);
  const b = joinNames(rule.namesB, t);
  const cards: LearnCard[] = [];
  if (rule.ruleType === 'timing_separation' && rule.hours != null && a && b) {
    const hours = rule.hours;
    const choices = [...new Set([...HOUR_CHOICES, hours])].sort((x, y) => x - y);
    const options: LearnOption[] = choices.map((n) => ({
      text: hoursText(n, t),
      why:
        n === hours
          ? rule.guidance
          : n < hours
            ? t('Closer together than the {n} the rule asks for.', { n: hoursText(hours, t) })
            : t('Further apart than the {n} the rule asks for.', { n: hoursText(hours, t) }),
    }));
    cards.push({
      id: `rec-med-${rule.ruleId}-${hours}`,
      kind: 'estimate',
      front: t('How many hours apart does the timing rule in this app ask for between your {a} and your {b}?', { a, b }),
      back: t('{n}. {guidance}', { n: hoursText(hours, t), guidance: rule.guidance }),
      options,
      answer: choices.indexOf(hours),
      thinking: false,
    });
  } else if (a) {
    cards.push({
      id: `rec-med-${rule.ruleId}`,
      front: t('This app holds a caution for your {a}, under the heading “{title}”. What does it say?', { a, title: rule.title }),
      back: rule.guidance,
      thinking: false,
    });
  } else {
    return [];
  }
  cards.push({
    id: `rec-med-${rule.ruleId}-source`,
    front: t('The caution “{title}” cites {citation}. What would you look for in that source to see how much it rests on?', {
      title: rule.title,
      citation: rule.citation,
    }),
    back: t(
      'What kind of source it is (a trial in people, a review of trials, a drug label or a report on a few patients), how many people it covered, and whether the amounts studied are like the ones you take. A label can be written to be careful rather than because harm was measured.',
    ),
    thinking: true,
  });
  return cards;
}

function medsDeck(meds: MedRuleInput[], t: Translate): LearnDeck | null {
  const cards = meds.flatMap((rule) => medCards(rule, t));
  if (cards.length === 0) return null;
  cards.push({
    id: 'rec-meds-compete',
    front: t('Two things you take are said to compete for absorption. Does that mean one of them stops working?'),
    back: t(
      'No. Less of one may be absorbed when the two arrive together, which is why these rules are about the hours between them. A dose itself is for you and your prescriber to talk over.',
    ),
    thinking: true,
  });
  return {
    id: 'rec-meds',
    title: t('Your Medicines and Supplements'),
    about: t('Made from what is in Life > My Meds: the timing and caution rules this app holds for what you take, and how to weigh the sources they cite.'),
    cards,
  };
}

// ---------------------------------------------------------------- garden

function cropCards(crop: CropInput, t: Translate): LearnCard[] {
  const problems = crop.problems.slice(0, 3);
  if (problems.length < 2) return [];
  const cards: LearnCard[] = problems.map((problem, index) => {
    const id = `rec-crop-${crop.key}-${index}`;
    const answer: LearnOption = { text: problem.label, why: problem.why };
    const others: LearnOption[] = problems
      .filter((_, other) => other !== index)
      .map((otherProblem) => ({
        text: otherProblem.label,
        why: t('Not this one. {label} looks like this: {looks}', { label: otherProblem.label, looks: otherProblem.looks }),
      }));
    const placed = placeAnswer(id, answer, others);
    return {
      id,
      kind: 'choice',
      front: t('Your {crop}: {looks} Which of the three problems {crop} is known for is it most likely to be?', {
        crop: crop.name.toLowerCase(),
        looks: problem.looks,
      }),
      back: t('{label}. {fix}', { label: problem.label, fix: problem.fix }),
      options: placed.options,
      answer: placed.answer,
      thinking: true,
    };
  });
  const first = problems[0];
  cards.push({
    id: `rec-crop-${crop.key}-fix`,
    front: t('How is {label} on {crop} put right from the soil?', { label: first.label.toLowerCase(), crop: crop.name.toLowerCase() }),
    back: first.fix,
    thinking: false,
  });
  return cards;
}

function gardenDeck(crops: CropInput[], t: Translate): LearnDeck | null {
  const cards = crops.slice(0, MAX_CROPS).flatMap((crop) => cropCards(crop, t));
  if (cards.length === 0) return null;
  cards.push({
    id: 'rec-garden-look-first',
    front: t('A leaf turns yellow. Why look at the watering and the soil before reaching for a feed?'),
    back: t(
      'Many signs have more than one cause. Dry or waterlogged soil, cold, and roots that cannot take up what is there can all look like a shortage, and putting those right deals with the cause where a feed would only cover it.',
    ),
    thinking: true,
  });
  return {
    id: 'rec-garden',
    title: t('What You Are Growing'),
    about: t('Made from what is growing in Garden: the problems each of your crops is known for, read from what you would see on the plant.'),
    cards,
  };
}

// ---------------------------------------------------------------- guess then reveal

const MEMORY_LINE =
  'A guess about our habits leans on the days that are easiest to remember, so the record and the guess can differ. The same gap opens whenever a memory is the only record.';

function guessFood(foodDays: GuessInputs['foodDays'], t: Translate): LearnCard | null {
  const sorted = [...foodDays].filter((food) => food.days > 0).sort((x, y) => y.days - x.days || x.name.localeCompare(y.name));
  if (sorted.length < 3 || sorted[0].days === sorted[1].days) return null;
  const top = sorted[0];
  const id = `rec-guess-food-${slug(top.name)}`;
  const dayWord = (n: number) => (n === 1 ? t('Eaten on 1 day of the last 30.') : t('Eaten on {n} days of the last 30.', { n }));
  const others = sorted.slice(1, 4).map((food) => ({ text: food.name, why: t('Not this one. {days}', { days: dayWord(food.days) }) }));
  const placed = placeAnswer(id, { text: top.name, why: dayWord(top.days) }, others);
  return {
    id,
    kind: 'estimate',
    front: t('Make a guess before you look: which of these have your meals held on the most days over the last 30?'),
    back: t('{name}, on {n} of the last 30 days. {memory}', { name: top.name, n: top.days, memory: t(MEMORY_LINE) }),
    options: placed.options,
    answer: placed.answer,
    thinking: true,
  };
}

const MEAL_DAY_BANDS: { from: number; to: number; text: string }[] = [
  { from: 1, to: 9, text: 'Fewer than 10' },
  { from: 10, to: 19, text: '10 to 19' },
  { from: 20, to: 25, text: '20 to 25' },
  { from: 26, to: 30, text: '26 to 30' },
];

function guessMealDays(mealDays: number, t: Translate): LearnCard | null {
  if (mealDays < 1) return null;
  const answer = MEAL_DAY_BANDS.findIndex((band) => mealDays >= band.from && mealDays <= band.to);
  if (answer < 0) return null;
  return {
    id: `rec-guess-meal-days-${MEAL_DAY_BANDS[answer].from}`,
    kind: 'estimate',
    front: t('Make a guess before you look: on how many of the last 30 days have you logged at least one meal?'),
    back: t('{n} of the last 30 days. {memory}', { n: mealDays, memory: t(MEMORY_LINE) }),
    options: MEAL_DAY_BANDS.map((band, index) => ({
      text: t(band.text),
      why: index === answer ? t('{n} days hold a logged meal.', { n: mealDays }) : t('Not this one. {n} days hold a logged meal.', { n: mealDays }),
    })),
    answer,
    thinking: true,
  };
}

function guessPlantings(plantings: GuessInputs['plantings'], t: Translate): LearnCard | null {
  const byName = new Map<string, string>();
  for (const planting of plantings) {
    const day = planting.plantedAt.slice(0, 10);
    const known = byName.get(planting.name);
    if (!known || day < known) byName.set(planting.name, day);
  }
  const sorted = [...byName.entries()].sort((x, y) => (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : x[0].localeCompare(y[0])));
  if (sorted.length < 3) return null;
  const chosen = sorted.slice(0, 5);
  if (new Set(chosen.map(([, day]) => day)).size !== chosen.length) return null;
  return {
    id: `rec-guess-planted-${slug(chosen.map(([name]) => name).join(' '))}`,
    kind: 'order',
    front: t('Before you look: put what you are growing in the order it went into the ground, first at the top.'),
    back: t('{order}. Dates slip quickly in a busy season, which is what the planting record is there for.', {
      order: chosen.map(([name, day]) => t('{name} on {day}', { name, day: formatDay(day) })).join('; '),
    }),
    items: chosen.map(([name]) => name),
    thinking: true,
  };
}

function guessInterests(interestMinutes: GuessInputs['interestMinutes'], t: Translate): LearnCard | null {
  const sorted = [...interestMinutes].filter((row) => row.minutes > 0).sort((x, y) => y.minutes - x.minutes || x.name.localeCompare(y.name));
  if (sorted.length < 2 || sorted[0].minutes === sorted[1].minutes) return null;
  const top = sorted[0];
  const id = `rec-guess-interest-${slug(top.name)}`;
  const timeText = (minutes: number) =>
    minutes < 60 ? t('{n} minutes in Sessions.', { n: minutes }) : t('About {n} hours in Sessions.', { n: Math.round(minutes / 6) / 10 });
  const others = sorted.slice(1, 4).map((row) => ({ text: row.name, why: t('Not this one. {time}', { time: timeText(row.minutes) }) }));
  const placed = placeAnswer(id, { text: top.name, why: timeText(top.minutes) }, others);
  return {
    id,
    kind: 'choice',
    front: t('Make a guess before you look: which of your interests have your Sessions given the most time over the last 90 days?'),
    back: t('{name}. {time} {memory}', { name: top.name, time: timeText(top.minutes), memory: t(MEMORY_LINE) }),
    options: placed.options,
    answer: placed.answer,
    thinking: true,
  };
}

function guessDeck(guess: GuessInputs, t: Translate): LearnDeck | null {
  const cards = [
    guessFood(guess.foodDays, t),
    guessMealDays(guess.mealDays, t),
    guessPlantings(guess.plantings, t),
    guessInterests(guess.interestMinutes, t),
  ].filter((card): card is LearnCard => card !== null);
  if (cards.length === 0) return null;
  return {
    id: 'rec-guess',
    title: t('Guess Your Records'),
    about: t('Make a guess about your days, then see what your records hold. Nothing here is a test of you; it shows how memory and a record can differ.'),
    cards,
  };
}

export function buildRecordDecks(inputs: RecordDeckInputs, t: Translate): LearnDeck[] {
  return [medsDeck(inputs.meds, t), gardenDeck(inputs.crops, t), guessDeck(inputs.guess, t)].filter(
    (deck): deck is LearnDeck => deck !== null,
  );
}
