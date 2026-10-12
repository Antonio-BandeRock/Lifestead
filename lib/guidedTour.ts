// The guided tour after setup, 1.0.68.11.
//
// Direct request: "they can open the app and have a guided tour letting them
// know which things they need to do in the order they need to do them so the
// app functions at its peak performance for them right out of the gate." The
// answer chosen the same day: a strip at the top of the screen naming the one
// thing to do now, with Go there, moving to the next once that thing's record
// exists, hidden whenever the person likes and brought back from Your Guide
// on Home (components/GuidedTourHost.tsx draws it).
//
// What it walks, in order:
//   1. Anything setup was told to leave until Later (My Meds, Backup &
//      Restore, App Lock), since the person was promised these come first.
//   2. The "fastest way in" steps of every tab (TOUR_TABS in
//      lib/yourStoryInterview.ts), the tab chosen to start from first, each
//      tab's steps already in the order that makes it useful soonest.
// A stop ends when its record exists, the same check that ticks it in Your
// Guide. A stop with no record to wait for (choosing Home's cards) ends on
// Done, and any stop can be passed with Not This One; both are kept as
// answers, so a passed stop stays passed on the next start.
//
// No count of stops, no progress, no praise: the strip names one thing.
// Pure, with no runtime import but the interview's labels, so
// scripts/test_your_story.js checks it without a phone.
import type { StoryDestination } from './yourStory';
import { LATER, type InterviewView } from './yourStoryInterview';

// Kept in your_story_answers beside the interview's answers.
export const TOUR_ANSWER_KEY = 'guidedTour';
export const TOUR_PASSED_PREFIX = 'tourPassed:';
export type TourShowing = 'on' | 'hidden' | 'off';

export const TOUR_GO_LABEL = 'Go there';
export const TOUR_DONE_LABEL = 'Done';
export const TOUR_PASS_LABEL = 'Not this one';
export const TOUR_HIDE_LABEL = 'Hide';
export const TOUR_WHY_LABEL = 'Why now';
export const TOUR_BRING_BACK_LABEL = 'Show the next thing to do';
export const TOUR_NOTHING_LEFT_LINE = 'Everything the tour walks through is on record or passed.';

export type TourStop = {
  key: string;
  doThis: string;
  why: string;
  destination: StoryDestination;
  // Ends on its record; false means it ends on Done.
  hasRecord: boolean;
};

const myMeds: StoryDestination = { kind: 'route', pathname: '/life', params: { openLifeLens: 'myMeds' } };
const backup: StoryDestination = { kind: 'route', pathname: '/profile', params: { section: 'backup' } };
const appLock: StoryDestination = { kind: 'route', pathname: '/app-lock-setup' };

function putOff(view: InterviewView, key: string): boolean {
  return view.facts.answers[key]?.answer === LATER;
}

// The stops still open, in the order they are walked.
export function guidedTourStops(view: InterviewView): TourStop[] {
  const facts = view.facts;
  const stops: TourStop[] = [];
  const seenItems = new Set<string>();
  const medsDone = facts.story.allItems.meds?.state === 'done' || facts.story.allItems.meds?.state === 'setAside';
  if (putOff(view, 'meds') && !medsDone) {
    stops.push({
      key: 'later:meds',
      doThis: 'List what you take in My Meds.',
      why: 'You left this until later in setup. Dose times, interaction warnings, the emergency card and every report read this list.',
      destination: myMeds,
      hasRecord: true,
    });
  }
  seenItems.add('meds');
  if (putOff(view, 'backup') && facts.story.allItems.backup?.state !== 'done') {
    stops.push({
      key: 'later:backup',
      doThis: 'Choose a folder for your backup in Profile, under Backup & Restore.',
      why: 'You left this until later in setup. Everything you record lives on this device, and a backup is the only way back if it is lost.',
      destination: backup,
      hasRecord: true,
    });
  }
  const security = facts.security;
  if (putOff(view, 'security') && security && !security.appLockOn && security.vaultCategories === 0) {
    stops.push({
      key: 'later:security',
      doThis: 'Set up App Lock, so your records are encrypted and open with your code.',
      why: 'You left this until later in setup. It is off until you turn it on.',
      destination: appLock,
      hasRecord: true,
    });
  }
  for (const tab of view.tour) {
    for (const step of tab.steps) {
      if (step.done) continue;
      if (step.def.item) {
        if (seenItems.has(step.def.item)) continue;
        seenItems.add(step.def.item);
      }
      stops.push({
        key: `tour:${tab.def.path}:${step.def.doThis}`,
        doThis: step.def.doThis,
        why: step.def.why,
        destination: step.destination,
        hasRecord: !!(step.def.item || step.def.record),
      });
    }
  }
  return stops.filter((stop) => !facts.answers[`${TOUR_PASSED_PREFIX}${stop.key}`]);
}

export function tourShowing(view: InterviewView): TourShowing {
  const answer = view.facts.answers[TOUR_ANSWER_KEY]?.answer;
  return answer === 'on' || answer === 'hidden' ? answer : 'off';
}

// The one stop the strip names, or null when it draws nothing.
export function currentTourStop(view: InterviewView): TourStop | null {
  if (!view.finished || tourShowing(view) !== 'on') return null;
  return guidedTourStops(view)[0] ?? null;
}

// Whether Your Guide on Home offers to bring the strip back.
export function offersTourBack(view: InterviewView): boolean {
  return view.finished && tourShowing(view) !== 'on' && guidedTourStops(view).length > 0;
}

// Told when the tour is started, hidden, brought back or a stop is passed,
// so the strip and Home's card redraw at once rather than on their next look.
const listeners = new Set<() => void>();

export function tourChanged(): void {
  for (const listener of listeners) listener();
}

export function subscribeTourChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
