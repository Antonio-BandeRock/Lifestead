// Setup one part of life at a time, 1.0.79.7.
//
// Direct request, 2026-11-02: "as the app guides the user through each
// section of the setup, none of the other parts are available on the screen
// until they select either Done when they are done with that section, or
// they choose to skip that section". Then: after the parts of life are
// chosen and Next is tapped, "the next question should ask them where they
// would like to start with setup from those items ... When they select one
// of them they are now presented with the things to setup for that section.
// Then when that section is setup, they are taken back to the list of areas
// ... with the areas they have completed dimmed". The last questions come
// after every part: Autism and ADHD (asked of everyone, and choosable in
// Profile later), the backup, how records are kept closed, and how much
// Home shows, in that order, then Home itself.
//
// "Make sure to tell the user why the information or the setup of each
// thing needs to happen, explaining what it ties into and feeds in the
// app": every part and every card here carries a why line.
//
// This file holds the order and the decisions, with no I/O, so
// scripts/test_setup_sections.js can check it. components/FirstSetup.tsx
// draws it. Which part is done or skipped is kept as an interview answer
// (setupPart:<beat>), so it travels with the records and Run Setup Again
// shows it as it stands.

import type { BeatKey, StoryDestination } from './yourStory';
import type { InterviewQuestionView, InterviewView, TourPath } from './yourStoryInterview';

// What each part needs to know, in this order. 'stage' stands for every
// stage:<code> question. Since 1.0.80.9 none of these is asked inside a
// part: every one any chosen part needs is asked first, in REQUIRED_ORDER,
// before the list of parts (see requiredQuestions below).
export const SECTION_QUESTIONS: Record<BeatKey, string[]> = {
  health: ['aboutYou', 'conditions', 'stage', 'meds', 'allergies'],
  food: ['aboutYou', 'conditions', 'stage', 'meds', 'allergies', 'eatingStyle'],
  // Nothing Movement shows reads birth date or sex, so it asks for neither.
  movement: [],
  home: [],
  garden: [],
  money: [],
  routines: [],
  work: [],
  family: [],
  interests: [],
};

// WHAT THE APP NEEDS BEFORE ANY PART, 1.0.80.9. Direct instruction,
// 2026-11-03, after a person who chose Health was never asked for a birth
// date and sex: "If they want those things to work, they need to be asked
// for the information no matter which topic they start with. Once they have
// answered all of the required information for the minimums for the app to
// function for them, then they move to setting up the topic they selected to
// go with first. And remember, we cannot have some things in front of others
// that are required to make them work." So every question any chosen part
// needs is gathered into one step straight after the parts are chosen, in
// the order each one feeds the next: age and sex set every nutrient target,
// conditions decide which stage questions there are, a stage needs its
// condition, medicines and allergies are read by the emergency card and the
// food checks, and a way of eating is read last by meal plans that already
// know all of the above. Choosing another part later brings this step back
// for anything the new part needs.
export const REQUIRED_ORDER = ['aboutYou', 'conditions', 'stage', 'meds', 'allergies', 'eatingStyle'];

// The cards of each part, by key in lib/setupCards.ts, in the order each
// one makes the next more useful (the order Tony approved, 2026-11-02).
export const SECTION_CARDS: Record<BeatKey, string[]> = {
  health: ['doseTimes', 'emergency', 'appointment', 'checkin', 'flare', 'labs'],
  food: ['safeFoods', 'meal', 'water', 'mealPlan', 'groceryList', 'savedRecipe', 'fermentation', 'scannedProduct'],
  movement: ['exercise', 'weight', 'bloodPressure'],
  routines: ['routine', 'didIDoIt', 'capture', 'todo', 'daysUntil'],
  home: ['upkeep', 'kitchen'],
  money: ['bills', 'spending', 'insurancePlan', 'medicalBill', 'accounts'],
  work: ['workCheckin', 'workBenefits'],
  family: ['familyMember', 'familyConditions', 'appointment'],
  garden: ['gardenArea', 'planting', 'gardenSetup', 'gardenReading', 'compost', 'harvest', 'gardenCost'],
  interests: ['interest', 'interestProject'],
};

// Why a part is worth setting up, said once at the top of it.
export const SECTION_WHY: Record<BeatKey, string> = {
  health:
    'What you live with and what you take are read by almost everything else: food checks, dose timing, the emergency card and the report you take to your doctor. Setting them up first means each later screen already knows you.',
  food:
    'Every meal you log is matched against the food database, so the nutrients, the patterns before a flare and the meal plans all come from what you actually eat. The more of it Lifestead knows, the less you have to work out yourself.',
  movement:
    'Movement and weight are read beside your energy, sleep and meals on Trends, and they go into the report for a trainer. A few entries are enough for the first line to show.',
  routines:
    'This is where the details of a day are held so they stop taking up room in your head. Each one is there when you look, and Keeping Up on Trends shows how the weeks went without scoring anybody.',
  home:
    'Upkeep reminds you before a thing is due, and Kitchen remembers where everything is kept. Both feed Where Is It on Home.',
  money:
    'Bills, spending and medical costs are read together on Trends under What It Costs, and medical bills go into the costs report for tax time or an appeal.',
  work:
    'A weekly check-in is read beside your sleep and symptoms, so a run of hard weeks shows up before it piles up, and benefits remind you before an allowance runs out.',
  family:
    'Each person you add can be cooked for: their conditions and allergies join the meal plan when you switch them on, and their appointments sit beside yours.',
  garden:
    'Each bed, planting and harvest is kept with its area, so a season can be read back later, a harvest can come off what a meal used, and the costs sit beside what the garden gave.',
  interests:
    'An interest is the place everything about it is kept: the time spent on it, the projects on it and what is next. Nothing about it is scored.',
};

// What each card ties into and feeds, shown on the card in setup.
export const CARD_WHY: Record<string, string> = {
  doseTimes:
    'Reads your list in My Meds. Each reminder is checked against the meals around it, so a dose that should wait for food or away from calcium says so.',
  emergency:
    'Built from your conditions, medicines and allergies, so it stays current by itself. It shows on the lock screen when you cannot speak for yourself.',
  appointment:
    'Each visit carries your questions and the records worth taking, and the doctor report is laid out around the next one.',
  checkin:
    'Pattern Finder compares how you feel with what you ate, slept and took. Without check-ins it has nothing to compare against.',
  flare:
    'A flare written down as it happens is lined up with everything before it, food and everything else, so what keeps coming back shows up.',
  labs:
    'Results are lined up over the years on Trends and read beside what you eat and take, and they go into the doctor report.',
  safeFoods:
    'Reads your conditions, allergies and way of eating. It is the list the meal plans and recipes start from.',
  meal:
    'Every meal is matched to the food database. Nutrients, patterns before a flare, the eating window and the nutrition report all come from these.',
  water: 'Each glass counts toward the day, and the days that run short show beside how you felt.',
  mealPlan:
    'Plans keep to your conditions, allergies and way of eating, and every planned meal fills the Grocery List by itself.',
  groceryList: 'Filled from the Meal Plan and recipes, and what you pay is remembered so prices can be compared later.',
  savedRecipe:
    'Each recipe is checked against what suits you, and a saved one can be planned, shopped for and logged in one tap.',
  fermentation:
    'Each batch is remembered with what went in it, and the ferments you eat count toward the variety your gut gets.',
  scannedProduct: 'A scanned packet is checked against your conditions and allergies, and it can be logged like any other food.',
  exercise: 'Read beside your energy and sleep on Trends, and it goes into the trainer report.',
  weight: 'Shown as a line over the weeks with your usual range, and it goes into the trainer and doctor reports.',
  bloodPressure: 'Readings are sorted by time of day and go into the doctor report.',
  routine: 'Each run is kept, so Keeping Up can show the weeks it held and the ones it did not, with nothing scored.',
  didIDoIt: 'A mark answers "did I already?" later, and the marks feed Keeping Up on Trends.',
  capture: 'What you say or photograph is kept and sorted later, and anything about where you put something is found by Where Is It.',
  todo: 'Each task can carry a reminder, and the ones you finish are kept for Keeping Up.',
  daysUntil: 'Each counter shows on Home and reminds you on the day.',
  upkeep: 'Reminds you before each thing is due, and what was done when is kept for Keeping Up.',
  kitchen: 'Where each thing is kept answers Where Is It, and what you have on hand is read by the Grocery List.',
  bills: 'Each bill reminds you before it is due and is counted in What It Costs on Trends.',
  spending: 'Each entry is counted in What It Costs, by month and by kind.',
  insurancePlan: 'Your deductible and what is left on it are read by Medical bills and by the costs report.',
  medicalBill: 'Counted against your insurance plan and laid out in the costs report for tax time or an appeal.',
  accounts: 'Each goal shows how far it has come, and the accounts are read by What It Costs.',
  workCheckin: 'Read beside sleep, mood and symptoms, so the weeks that wear you down show up.',
  workBenefits: 'Each allowance reminds you before it runs out.',
  familyMember: 'A person you switch on joins the meal plan, so meals suit everyone at the table.',
  familyConditions: 'Their conditions and allergies are checked in the meal plan and in Safe Foods when they are switched on.',
  gardenArea: 'Every planting, reading, cost and harvest is kept with its area, so this comes first.',
  planting: 'Each planting is kept with its area and season, and its harvests are counted with it.',
  gardenSetup: 'Each piece is recorded as a cost under its area, and lights and fans can be compared with the electricity bill.',
  gardenReading: 'Readings by hand or from a sensor show each area through the year on Trends.',
  compost: 'Each batch is kept from scraps to soil, and the food you throw out can go to it.',
  harvest: 'What each planting gave is counted on Trends, and a meal can take what it used off what is on hand.',
  gardenCost: 'Set beside what the garden gave, on Trends and in the garden report.',
  interest: 'Sessions and projects are kept under it, and the time shows on Keeping Up.',
  interestProject: 'What is next shows under its name, so you pick it up where you left it.',
};

// The questions after every part, in the order asked (direct request,
// 2026-11-02): how records are kept closed, then how much Home shows, are
// the last two before Home.
export const CLOSING_QUESTIONS = ['neuro', 'backup', 'security', 'homeView'];

// Which tab a part of life starts on, for the startTab answer the tour
// reads.
export const BEAT_START_PATH: Record<BeatKey, TourPath> = {
  health: '/life',
  food: '/food',
  movement: '/log',
  home: '/life',
  garden: '/garden',
  money: '/life',
  routines: '/life',
  work: '/life',
  family: '/life',
  interests: '/interests',
};

export const SETUP_PART_PREFIX = 'setupPart:';
export const SETUP_PARTS_KEY = 'setupParts';
export const SETUP_PARTS_CHOSEN = 'chosen';
export const PART_DONE = 'done';
export const PART_SKIPPED = 'skip';

export type PartState = 'open' | 'done' | 'skipped';

export function partAnswerKey(beat: BeatKey): string {
  return `${SETUP_PART_PREFIX}${beat}`;
}

export function partState(interview: InterviewView, beat: BeatKey): PartState {
  const answer = interview.facts.answers[partAnswerKey(beat)]?.answer ?? null;
  if (answer === PART_DONE) return 'done';
  if (answer === PART_SKIPPED) return 'skipped';
  return 'open';
}

export function partsChosen(interview: InterviewView): boolean {
  return interview.facts.answers[SETUP_PARTS_KEY]?.answer === SETUP_PARTS_CHOSEN && interview.facts.story.beats.length > 0;
}

export type PartView = { beat: BeatKey; state: PartState };

// The chosen parts in the order they were listed: the open ones first, then
// the done ones (dimmed on screen), then the skipped ones, which "just go to
// the end".
export function listParts(interview: InterviewView): PartView[] {
  const parts = interview.facts.story.beats.map((beat) => ({ beat, state: partState(interview, beat) }));
  const rank: Record<PartState, number> = { open: 0, done: 1, skipped: 2 };
  return parts
    .map((part, index) => ({ part, index }))
    .sort((a, b) => rank[a.part.state] - rank[b.part.state] || a.index - b.index)
    .map(({ part }) => part);
}

export function allPartsSettled(interview: InterviewView): boolean {
  return listParts(interview).every((part) => part.state !== 'open');
}

// A part's questions still waiting, in its order.
export function sectionQuestions(interview: InterviewView, beat: BeatKey): InterviewQuestionView[] {
  const wanted = SECTION_QUESTIONS[beat];
  const out: InterviewQuestionView[] = [];
  for (const kind of wanted) {
    for (const question of interview.questions) {
      if (question.answered || question.def.kind !== kind) continue;
      if (!out.includes(question)) out.push(question);
    }
  }
  return out;
}

// Every question the chosen parts need that is still waiting, in
// REQUIRED_ORDER, whichever part is opened first.
// What the chosen parts need that is already answered, in the same order,
// each with where it is changed. Direct request, 2026-11-03, after setup
// skipped a birth date already in Profile and that read as the question
// being gone: show what was kept, "that way the user sees their progress,
// too." The question being answered right now is left out, since it is on
// the screen already.
const ON_RECORD_NAMES: Record<string, string> = {
  aboutYou: 'Birth date and sex',
  conditions: 'Conditions',
  meds: 'Medicines and supplements',
  allergies: 'Allergies',
  eatingStyle: 'The way you eat',
};

const profileCard = (section: string): StoryDestination => ({ kind: 'route', pathname: '/profile', params: { section } });

const ON_RECORD_PLACES: Record<string, StoryDestination> = {
  aboutYou: profileCard('personal-info'),
  conditions: profileCard('conditions'),
  stage: profileCard('conditions'),
  meds: { kind: 'route', pathname: '/life', params: { openLifeLens: 'myMeds' } },
  allergies: profileCard('food-restrictions'),
  eatingStyle: profileCard('diet-preferences'),
};

export type OnRecordRow = {
  key: string;
  name: string;
  summary: string | null;
  // For a stage, the condition it is for, so the screen can put it into
  // the sentence in any language.
  condition: string | null;
  destination: StoryDestination;
};

export function requiredOnRecord(interview: InterviewView, showingKey: string | null = null): OnRecordRow[] {
  const needed = new Set(interview.facts.story.beats.flatMap((beat) => SECTION_QUESTIONS[beat] ?? []));
  const out: OnRecordRow[] = [];
  for (const kind of REQUIRED_ORDER) {
    if (!needed.has(kind)) continue;
    for (const question of interview.questions) {
      if (!question.answered || question.def.kind !== kind || question.key === showingKey) continue;
      const name = kind === 'stage' ? `Healing stage for ${question.condition?.label ?? 'a condition'}` : ON_RECORD_NAMES[kind] ?? kind;
      out.push({ key: question.key, name, summary: question.summary, condition: kind === 'stage' ? question.condition?.label ?? null : null, destination: ON_RECORD_PLACES[kind] });
    }
  }
  return out;
}

export function requiredQuestions(interview: InterviewView): InterviewQuestionView[] {
  const needed = new Set(interview.facts.story.beats.flatMap((beat) => SECTION_QUESTIONS[beat] ?? []));
  const out: InterviewQuestionView[] = [];
  for (const kind of REQUIRED_ORDER) {
    if (!needed.has(kind)) continue;
    for (const question of interview.questions) {
      if (!question.answered && question.def.kind === kind) out.push(question);
    }
  }
  return out;
}

export function closingQuestions(interview: InterviewView): InterviewQuestionView[] {
  return CLOSING_QUESTIONS.map((key) => interview.questions.find((question) => question.key === key)).filter(
    (question): question is InterviewQuestionView => !!question && !question.answered,
  );
}

export type SetupStage = 'parts' | 'required' | 'list' | 'closing' | 'finished';

// Where setup stands as a whole: choosing the parts, what the app needs
// before any of them, picking the next part, the last questions, or nothing
// left.
export function setupStage(interview: InterviewView): SetupStage {
  if (!partsChosen(interview)) return 'parts';
  if (requiredQuestions(interview).length > 0) return 'required';
  if (!allPartsSettled(interview)) return 'list';
  if (closingQuestions(interview).length > 0) return 'closing';
  return 'finished';
}

export function setupWaiting(interview: InterviewView): boolean {
  return setupStage(interview) !== 'finished';
}

// THE WORDS.
export const PARTS_NEXT_LABEL = 'Next';
export const PARTS_SELECT_ALL_LABEL = 'Select all';
export const PARTS_CLEAR_ALL_LABEL = 'Clear all';
export const PARTS_NONE_YET = 'Choose at least one part of life first. Select all is there if you want every one.';
export const LIST_FIRST_HEADING = 'Where would you like to start?';
export const LIST_NEXT_HEADING = 'What would you like to set up next?';
export const LIST_LEAD =
  'Each part opens on its own, with only what belongs to it on the screen. When you tap Done with this part or Skip this part, it comes back here, and the ones you finished are dimmed.';
export const LIST_CHANGE_PARTS_LABEL = 'Change the parts of life';
export const PART_DONE_CAPTION = 'Done. Tap to look again.';
export const PART_SKIPPED_CAPTION = 'Skipped for now. Tap to set it up.';
export const LIST_ALL_SETTLED = 'Every part has been set up or skipped. Tap one to look at it again.';
export const SECTION_WHY_LABEL = 'Why this part matters';
export const CARD_WHY_LABEL = 'What it feeds';
export const SECTION_CARDS_HEADING = 'Set these up';
export const SECTION_CARDS_LEAD = 'Set It Up opens the place for it and shows each tap. Back to Setup brings you here again. Do as many as you like now.';
export const SECTION_DONE_LABEL = 'Done with this part';
export const SECTION_SKIP_LABEL = 'Skip this part';
export const SECTION_BACK_LABEL = 'Back to the list';
export const SECTION_QUESTION_FIRST = 'Answer the question above first, or tap Later on it.';
export const CLOSING_HEADING = 'A few last questions';
export const ON_RECORD_HEADING = 'Already on record';
export const ON_RECORD_LEAD = 'Kept from before, so these are not asked again. Tap one to change it where it is kept.';
export const REQUIRED_HEADING = 'First, what the app needs to know';
export const REQUIRED_LEAD =
  'The parts you chose read these answers, so they come before any of them, one at a time. When they are done, you choose which part to set up first.';
