// Setup as a walk through named parts (1.0.68.13).
//
// Direct request, 2026-10-12: "when i click Done on something for the setup
// such as for the condition picker during setup, that part just disappears
// in a flash and then the screen doesn't automatically go somewhere they
// should be working on next ... The user is taken step by step through
// everything they need to do in the app until it is down to how to use the
// app. They need everything setup." Chosen the same day: setup covers the
// interview's questions AND the getting-set-up items of every part of life
// the person chose, and an item opens its screen with a strip naming what
// to do, Back to Setup and Later.
//
// The walk is one list of steps, grouped into parts that are named at the
// top of every page (no counts, no progress, the Your Guide rule). A step
// is either one of the interview's questions (lib/yourStoryInterview.ts,
// whose order matches the parts here) or a Your Guide item
// (lib/yourStory.ts), which is settled once its record exists, once it is
// set aside, or once it is answered Later or Skip in setup.
//
// Setup items are things the app needs set up once. Using the app (logging
// a meal, a check-in, a harvest, spending) is left to the tutorials that
// follow setup, so nothing here asks for a day's records.
//
// Pure, so scripts/test_your_story.js checks it in plain node.
import { ITEM_BY_KEY, itemApplies, type ItemDef, type YourStoryItemKey } from './yourStory';
import {
  CHANGE_LABEL,
  LATER,
  LATER_LABEL,
  LATER_SUMMARY,
  SETUP_BACK_LABEL,
  SETUP_FINISH_LATER_LABEL,
  type InterviewKind, type InterviewQuestionView, type InterviewView } from './yourStoryInterview';

export type SetupPartKey = 'aboutYou' | 'looks' | 'health' | 'food' | 'safe' | 'days' | 'garden' | 'money' | 'home' | 'work' | 'family';

export type SetupPart = { key: SetupPartKey; name: string; line: string };

export const SETUP_PARTS: SetupPart[] = [
  { key: 'aboutYou', name: 'About You', line: 'What brings you here, and the parts of your life to follow.' },
  { key: 'looks', name: 'How Lifestead Looks', line: 'Where to start, and how much Home shows.' },
  { key: 'health', name: 'Your Health', line: 'What you take, and what somebody helping you would need to know.' },
  { key: 'food', name: 'Food', line: 'How you eat, and anything you cannot.' },
  { key: 'safe', name: 'Keeping Your Records Safe', line: 'A copy kept somewhere you control, and a lock if you want one.' },
  { key: 'days', name: 'Your Days', line: 'The routines and things to check that hold your day together.' },
  { key: 'garden', name: 'Garden', line: 'Where you grow, and what is growing.' },
  { key: 'money', name: 'Money', line: 'The bills that come round by themselves.' },
  { key: 'home', name: 'Home', line: 'Keeping the house running, and where things are kept.' },
  { key: 'work', name: 'Work', line: 'What your work offers.' },
  { key: 'family', name: 'Family', line: 'The people you look after.' },
];

export const PART_BY_KEY: Record<SetupPartKey, SetupPart> = Object.fromEntries(
  SETUP_PARTS.map((part) => [part.key, part]),
) as Record<SetupPartKey, SetupPart>;

// Which part each question is asked in. INTERVIEW_QUESTIONS runs in this
// order, so the interview's own next question is setup's next question.
export const QUESTION_PART: Record<InterviewKind, SetupPartKey> = {
  conditions: 'aboutYou',
  neuro: 'aboutYou',
  beats: 'aboutYou',
  aboutYou: 'aboutYou',
  startTab: 'looks',
  homeView: 'looks',
  meds: 'health',
  stage: 'health',
  eatingStyle: 'food',
  allergies: 'food',
  backup: 'safe',
  security: 'safe',
};

// The Your Guide items setup walks, each after the questions of its part.
// Every one is a thing set up once; each applies only to the parts of life
// its item names (itemApplies).
export const SETUP_ITEMS: { item: YourStoryItemKey; part: SetupPartKey }[] = [
  { item: 'emergency', part: 'health' },
  { item: 'routine', part: 'days' },
  { item: 'didIDoIt', part: 'days' },
  { item: 'todo', part: 'days' },
  { item: 'daysUntil', part: 'days' },
  { item: 'gardenArea', part: 'garden' },
  { item: 'planting', part: 'garden' },
  { item: 'bills', part: 'money' },
  { item: 'upkeep', part: 'home' },
  { item: 'kitchen', part: 'home' },
  { item: 'workBenefits', part: 'work' },
  { item: 'familyMember', part: 'family' },
  { item: 'familyConditions', part: 'family' },
];

// An item's answer in setup, kept in your_story_answers.
export const SETUP_ITEM_PREFIX = 'setup:';
export const SETUP_SKIP = 'skip';

export function setupItemAnswerKey(item: YourStoryItemKey): string {
  return `${SETUP_ITEM_PREFIX}${item}`;
}

export const SETUP_GO_LABEL = 'Set it up';
export const SETUP_SKIP_LABEL = 'Skip';
export const SETUP_SKIPPED_SUMMARY = 'Skipped. It is still in Your Guide whenever you want it.';
export const SETUP_SAVED_LABEL = 'Saved';
export const SETUP_KEEP_LABEL = 'Keep this and go on';
export const SETUP_NEXT_LABEL = 'Next in setup';
export const SETUP_AWAY_CAPTION = 'Setting up';
export const SETUP_AWAY_SAVED = 'Saved. Add more here if you like, or go on.';
export const SETUP_RERUN_LABEL = 'Run Setup Again';
export const SETUP_RERUN_LINE =
  'Every answer is shown as it stands, one page at a time, so you can add a condition, change how Home looks or set up something you skipped.';

// What each control on a setup page does, shown on the first page before
// any of them appears (direct request, 2026-10-12: "we need to explain that
// prior to them seeing it. They need to know what to do when they see it").
export const SETUP_HOW_HEADING = 'How setup works';
export const SETUP_HOW_LINES: { label: string; line: string }[] = [
  { label: 'Answering', line: 'Pick an answer and setup moves on to the next page by itself.' },
  {
    label: SETUP_KEEP_LABEL,
    line: 'Shown on a page you have answered before. Press it when the answer there is still right: it stays as it is and setup goes to the next page.',
  },
  { label: SETUP_BACK_LABEL, line: 'Goes to the page before, to look at it or change it.' },
  { label: CHANGE_LABEL, line: 'Beside the answer you just gave, at the top of the next page. It opens that page again.' },
  { label: SETUP_GO_LABEL, line: 'Opens the screen where that thing is set up, with a strip over it saying what to do there and how to come back.' },
  { label: LATER_LABEL, line: 'Puts it off. It comes first in the tour once setup is done.' },
  { label: SETUP_SKIP_LABEL, line: 'Leaves it out. It stays in Your Guide whenever you want it.' },
  { label: SETUP_FINISH_LATER_LABEL, line: 'Lets you into the app now. Setup comes back the next time Lifestead opens.' },
];

// Under Keep this and go on, every time it shows.
export const SETUP_KEEP_LINE = 'This page has an answer already. If it still stands, Keep this and go on leaves it as it is and goes to the next page.';

export type SetupStep = {
  key: string;
  part: SetupPartKey;
  kind: 'question' | 'item';
  // The question as it is asked, or what the item asks to be done.
  title: string;
  settled: boolean;
  summary: string | null;
  question: InterviewQuestionView | null;
  item: ItemDef | null;
  // For an item: done on record, as opposed to Later or Skip.
  onRecord: boolean;
};

function questionStep(question: InterviewQuestionView): SetupStep {
  return {
    key: question.key,
    part: QUESTION_PART[question.def.kind],
    kind: 'question',
    title: question.question,
    settled: question.answered,
    summary: question.summary,
    question,
    item: null,
    onRecord: false,
  };
}

function itemStep(view: InterviewView, item: YourStoryItemKey, part: SetupPartKey): SetupStep {
  const def = ITEM_BY_KEY[item];
  const state = view.facts.story.allItems[item]?.state ?? 'open';
  const answer = view.facts.answers[setupItemAnswerKey(item)]?.answer ?? null;
  const onRecord = state === 'done';
  let summary: string | null = null;
  if (onRecord) summary = def.done;
  else if (state === 'setAside') summary = def.setAside?.line ?? null;
  else if (answer === LATER) summary = LATER_SUMMARY;
  else if (answer === SETUP_SKIP) summary = SETUP_SKIPPED_SUMMARY;
  return {
    key: setupItemAnswerKey(item),
    part,
    kind: 'item',
    title: def.todo,
    settled: onRecord || state === 'setAside' || answer === LATER || answer === SETUP_SKIP,
    summary,
    question: null,
    item: def,
    onRecord,
  };
}

// Every step, in the order setup walks them.
export function buildSetupFlow(view: InterviewView): SetupStep[] {
  const beats = view.facts.story.beats;
  const steps: SetupStep[] = [];
  for (const part of SETUP_PARTS) {
    for (const question of view.questions) {
      if (QUESTION_PART[question.def.kind] === part.key) steps.push(questionStep(question));
    }
    // Before the parts of life are chosen no item is asked about, since
    // which ones apply depends on that answer.
    if (beats.length === 0) continue;
    for (const entry of SETUP_ITEMS) {
      if (entry.part !== part.key) continue;
      if (!itemApplies(ITEM_BY_KEY[entry.item], beats)) continue;
      steps.push(itemStep(view, entry.item, part.key));
    }
  }
  return steps;
}

// The first step still waiting, which is where setup opens.
export function firstOpenStep(flow: SetupStep[]): SetupStep | null {
  return flow.find((step) => !step.settled) ?? null;
}

export function stepAfter(flow: SetupStep[], key: string): SetupStep | null {
  const at = flow.findIndex((step) => step.key === key);
  return at >= 0 && at + 1 < flow.length ? flow[at + 1] : null;
}

export function stepBefore(flow: SetupStep[], key: string): SetupStep | null {
  const at = flow.findIndex((step) => step.key === key);
  return at > 0 ? flow[at - 1] : null;
}

// Items answered Later in setup, which the guided tour walks first.
export function laterItems(view: InterviewView): ItemDef[] {
  return SETUP_ITEMS.map((entry) => ITEM_BY_KEY[entry.item]).filter((def) => {
    if (view.facts.answers[setupItemAnswerKey(def.key)]?.answer !== LATER) return false;
    const state = view.facts.story.allItems[def.key]?.state;
    return state !== 'done' && state !== 'setAside';
  });
}

// Profile's Run Setup Again, heard by components/FirstSetup.tsx, which is
// mounted once for the whole app.
const rerunListeners = new Set<() => void>();

export function runSetupAgain(): void {
  for (const listener of rerunListeners) listener();
}

export function subscribeRunSetupAgain(listener: () => void): () => void {
  rerunListeners.add(listener);
  return () => {
    rerunListeners.delete(listener);
  };
}
