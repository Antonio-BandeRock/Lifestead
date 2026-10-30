// Walk me through it, 2026-09-24 (1.0.51.10).
//
// Direct question: "Is there a way to have a guided version for each thing
// that goes beyond the standard autism/adhd version? It may need indicators
// to sort of prod the user along through the steps necessary for each
// thing." The first stage of the answer, approved the same day: a strip that
// stays at the top of every screen while somebody does one guide step, saying
// only the one thing to do now.
//
// Three rules shape it:
//   1. Getting there moves on by itself. The strip knows which screen and
//      which lens are open (the corner box reports both, lib/tellClaude.ts),
//      so "choose Life" is replaced by "choose Routines" the moment Life is
//      open, and comes back if the person wanders off, which is how the walk
//      helps somebody find their way back to the thing they were doing.
//   2. The taps once there move on with Next, since nothing on those screens
//      reports a press yet. Next also passes a getting-there line the strip
//      could not confirm, so a walk can never be stuck.
//   3. The walk finishes when the record exists, never on a button: the same
//      check that ticks the step in Your Story. A step with no record (reading
//      something) ends on its last line.
// No count of steps, no progress bar, no praise: the strip says what to do
// and, at the end, what the saved thing now does.
//
// The steps, the position and the store live here with no runtime import
// but the guide names, so scripts/test_your_story.js checks them without a
// phone. components/StoryWalkHost.tsx draws the strip.
import {
  FROM_HOME,
  GO_HOME,
  GUIDE_BY_KEY,
  HUB,
  LENS_NAMES,
  MY_ITEMS_LENSES,
  TAB_NAMES,
  type GuideEntry,
  type GuideKey,
} from './yourStoryGuides';
import type { ToolMark } from './toolHowTos';

// Which way the arrow on the strip points: toward the round button, the
// corner lens button, or the bookmarks button beside it.
export type WalkPoint = 'hub' | 'corner' | 'bookmarks' | null;

export type WalkStep = {
  say: string;
  point: WalkPoint;
  // The button this line is about, outlined while the line is showing
  // (stage 2). Only Start here and Every day steps carry marks.
  mark?: WalkMark;
  // A getting-there line: met once this screen (and lens) is open.
  // lensKey, where known, is matched against the key the tab reports.
  // alsoAt: further screens where the line counts as met, for a lens that
  // opens a screen of its own (LENS_SCREENS), so the tab line still holds
  // once that screen is on top.
  until?: { pathname: string; lens?: string; lensKey?: string; alsoAt?: string[] };
  // A tool how-to line that goes on past its button (lib/toolHowTos.ts).
  stay?: boolean;
};

export type WalkPlace = {
  pathname: string;
  // The tab the corner box last reported, and its open lens.
  tab: string | null;
  lens: string | null;
  lensKey?: string | null;
};

// STAGE 2, 1.0.51.11 ("Yes, build stage 2"): the button a line names is
// outlined on the screen itself while that line shows, for the steps the
// guides call Start here and Every day, the ones somebody is most likely to
// be doing for the first time or doing without thinking. Each name below is
// passed to the walkMark function from components/WalkMark.ts at exactly one
// kind of button, and scripts/test_your_story.js checks every name here is
// used somewhere, so a renamed button cannot leave a line pointing at
// nothing. An outline draws outside the button and moves nothing, so a
// screen with no walk under way looks exactly as it always has.
export type WalkMark =
  | 'hub'
  | 'corner'
  | 'bookmarks'
  | 'profile.backup'
  | 'profile.backupOneDrive'
  | 'profile.syncGuide'
  | 'profile.personal-info'
  | 'profile.conditions'
  | 'profile.diet-preferences'
  | 'profile.reminders'
  | 'myMeds.add'
  | 'meds.addTime'
  | 'emergency.addPerson'
  | 'emergency.save'
  | 'home.checkin'
  | 'schedule.addMeal'
  | 'schedule.logNow'
  | 'schedule.addDrink'
  | 'capture.box'
  | 'didIDoIt.add'
  | 'upkeep.add'
  | 'garden.addArea'
  | 'garden.area'
  | 'garden.addPlanting'
  | 'finance.recurring'
  | 'finance.addBill'
  | 'finance.spending'
  | 'finance.record'
  | 'routines.add'
  | 'routines.addStep'
  | 'routines.walk'
  | 'work.addBenefit'
  | 'work.saveWeek'
  | 'family.add'
  | 'family.planMeals'
  // The tools on each lens, named in lib/toolHowTos.ts.
  | ToolMark;

// Which button each tap line names, by guide step key and line. A step that
// appears in two guides has the same taps in both, and null is a line with
// no one button to point at (fill in a form, read down a list).
export const TAP_MARKS: Record<string, (WalkMark | null)[]> = {
  'item:backup': ['profile.backup', 'profile.backupOneDrive'],
  'item:aboutYou': ['profile.personal-info'],
  'item:conditions': ['profile.conditions'],
  conditionStage: ['profile.conditions'],
  'item:allergies': ['profile.conditions'],
  'item:eatingStyle': ['profile.diet-preferences'],
  reminders: ['profile.reminders'],
  'item:neuro': ['profile.conditions'],
  'item:meds': ['myMeds.add'],
  doseTimes: [null, 'meds.addTime'],
  'item:emergency': [null, 'emergency.addPerson', 'emergency.save'],
  'item:checkin': ['home.checkin'],
  'item:meal': ['schedule.addMeal', 'schedule.logNow'],
  'item:water': ['schedule.addDrink'],
  'item:capture': ['capture.box'],
  'item:didIDoIt': ['didIDoIt.add'],
  'item:upkeep': ['upkeep.add'],
  'item:gardenArea': ['garden.addArea'],
  'item:planting': ['garden.area', 'garden.addPlanting'],
  'item:bills': ['finance.recurring', 'finance.addBill'],
  'item:spending': ['finance.spending', 'finance.record'],
  'item:routine': ['routines.add', 'routines.addStep'],
  routineRun: ['routines.walk'],
  'item:workBenefits': ['work.addBenefit'],
  'item:workCheckin': [null, 'work.saveWeek'],
  'item:familyMember': ['family.add'],
  familyInMealPlan: ['family.planMeals'],
};

// Lines that go on past their button ("Tap + Schedule a meal, then choose
// what you ate and the time"). Tapping the button is only the start of them,
// so the line stays up while the form is filled in and Next moves it on;
// moving on at the tap took the rest of the line away just as it was needed.
export const MORE_AFTER_TAP: ReadonlySet<WalkMark> = new Set<WalkMark>([
  'capture.box',
  'schedule.addMeal',
  'schedule.addDrink',
  'meds.addTime',
  'finance.addBill',
  'finance.record',
  'routines.add',
  'routines.addStep',
  'garden.addPlanting',
]);

/** Whether a guide step gets its buttons outlined. */
export function walkMarks(entry: GuideEntry): boolean {
  return entry.when === 'start' || entry.when === 'daily';
}

export const WALK_START_LABEL = 'Walk me through it';
export const WALK_STOP_LABEL = 'Stop';
export const WALK_CLOSE_LABEL = 'Close';
export const WALK_NEXT_LABEL = 'Next';
export const WALK_BACK_LABEL = 'Back';
export const WALK_STORY_LABEL = 'Your Guide';
export const WALK_WAITING_LINE = 'Once it is saved, this finishes by itself.';
export const WALK_NO_RECORD_LINE = 'That is all there is to this one.';
export const WALK_SAVED_LINE = 'It is on record now.';
export const WALK_CAPTION = 'Walking through';
export const WALK_SHRINK_LABEL = 'Make this smaller';
export const WALK_GROW_LABEL = 'Show all of this';

/** Every line of the walk for one guide step, getting there first, with
 * each line's button mark when the step is one that carries them. */
export function walkSteps(entry: GuideEntry): WalkStep[] {
  const steps = walkLines(entry);
  // The getting-there lines carry their marks for the tutorials, so a step
  // that is not outlined has them taken off here.
  if (!walkMarks(entry)) return steps.map(({ mark: _mark, ...rest }) => rest);
  const tapMarks = TAP_MARKS[entry.key] ?? [];
  const firstTap = steps.length - (entry.taps ?? []).length;
  return steps.map((step, index) => {
    const mark = index >= firstTap ? tapMarks[index - firstTap] : step.point;
    return mark ? { ...step, mark } : step;
  });
}

function walkLines(entry: GuideEntry): WalkStep[] {
  const destination = entry.destination;
  const taps: WalkStep[] = (entry.taps ?? []).map((say) => ({ say, point: null }));
  if (destination.kind === 'beats') return taps;
  if (destination.kind === 'home' || destination.kind === 'quickLog') {
    const near =
      destination.kind === 'home' ? 'The check-in card is near the top of Home.' : 'The button is near the top of Home.';
    return [{ say: GO_HOME, point: 'hub', until: { pathname: '/' } }, ...(taps.length ? taps : [{ say: near, point: null }])];
  }
  const { pathname, params } = destination;
  if (pathname === '/connections') {
    return [
      { say: `${HUB} and choose Profile.`, point: 'hub', until: { pathname: '/profile' } },
      { say: 'Tap Connections to open it, then tap Manage Connections.', point: null, until: { pathname } },
      ...taps,
    ];
  }
  const home = FROM_HOME[pathname];
  if (home) {
    const [band, button] = home;
    return [
      { say: GO_HOME, point: 'hub', until: { pathname: '/' } },
      { say: `Find ${band} and tap ${button}.`, point: null, until: { pathname } },
      ...taps,
    ];
  }
  const lens = params ? Object.values(params)[0] : undefined;
  return [...gettingThere(pathname, lens, lens ? LENS_NAMES[pathname]?.[lens] : undefined), ...taps];
}

/**
 * The lines that reach a tab, and a lens on it, from anywhere: the round
 * button, then the corner lens button (or the bookmarks button). Shared
 * with the tutorials (lib/tutorials.ts), which name every lens. Each line
 * carries its button's mark, so the ring and Show me find it.
 */
// Lenses that open a screen of their own rather than showing on the tab:
// choosing Grocery List on Life pushes /grocery-list.
const LENS_SCREENS: Record<string, Record<string, string>> = {
  '/life': { groceryList: '/grocery-list' },
};

export function gettingThere(pathname: string, lens?: string, lensName?: string): WalkStep[] {
  if (pathname === '/') return [{ say: GO_HOME, point: 'hub', mark: 'hub', until: { pathname: '/' } }];
  const tab = TAB_NAMES[pathname];
  if (!tab) return [];
  const screen = lens ? LENS_SCREENS[pathname]?.[lens] : undefined;
  const steps: WalkStep[] = [
    { say: `${HUB} and choose ${tab}.`, point: 'hub', mark: 'hub', until: screen ? { pathname, alsoAt: [screen] } : { pathname } },
  ];
  if (lens && lensName) {
    const bookmarks = MY_ITEMS_LENSES[pathname]?.includes(lens);
    steps.push({
      say: bookmarks
        ? `Tap the small bookmarks button just to the left of the round one, and choose ${lensName}.`
        : `Tap the button in the bottom-left corner and choose ${lensName}.`,
      point: bookmarks ? 'bookmarks' : 'corner',
      mark: bookmarks ? 'bookmarks' : 'corner',
      until: screen ? { pathname: screen } : { pathname, lens: lensName, lensKey: lens },
    });
  }
  return steps;
}

/**
 * Whether a getting-there line is met here. A lens counts as open when the
 * corner box says so for this tab; when it has not reported this tab yet,
 * the lens is taken as open rather than sending somebody round in a circle.
 */
export function stepMet(step: WalkStep, place: WalkPlace): boolean {
  if (!step.until) return false;
  if (step.until.alsoAt?.includes(place.pathname)) return true;
  if (place.pathname !== step.until.pathname) return false;
  if (!step.until.lens) return true;
  if (place.tab !== TAB_NAMES[step.until.pathname]) return true;
  if (step.until.lensKey && place.lensKey) return place.lensKey === step.until.lensKey;
  return sameLensName(place.lens, step.until.lens);
}

// A corner box label can carry a line break to wrap it ('Plots &\nPlantings'),
// so names are compared with their spacing evened out.
function sameLensName(a: string | null, b: string): boolean {
  const even = (name: string) => name.replace(/\s+/g, ' ').trim();
  return a != null && even(a) === even(b);
}

/**
 * The line to show: past every getting-there line already met or passed
 * with Next, but back to the first one that no longer holds, since that is
 * where the person has wandered from. steps.length means the end.
 */
export function walkPosition(steps: WalkStep[], cursor: number, skipped: readonly number[], place: WalkPlace): number {
  let at = Math.max(0, Math.min(cursor, steps.length));
  while (at < steps.length && steps[at].until && (skipped.includes(at) || stepMet(steps[at], place))) at += 1;
  for (let index = 0; index < at; index += 1) {
    const step = steps[index];
    if (step.until && !skipped.includes(index) && !stepMet(step, place)) return index;
  }
  return at;
}

/** Back is offered only onto a tap line, since a getting-there line behind
 * the person is already met and would hand them straight forward again. */
export function canStepBack(steps: WalkStep[], at: number): boolean {
  return at > 0 && !steps[at - 1].until;
}

// THE WALK UNDER WAY.

export type StoryWalk = {
  guide: GuideKey;
  entryKey: string;
  // A step already on record when the walk began ends on its last line
  // rather than waiting for a record that is already there.
  startedDone: boolean;
  cursor: number;
  skipped: number[];
};

export function walkEntry(walk: StoryWalk): GuideEntry | null {
  return GUIDE_BY_KEY[walk.guide]?.entries.find((entry) => entry.key === walk.entryKey) ?? null;
}

/** Pressing Next at a position. */
export function walkNext<T extends { cursor: number; skipped: number[] }>(walk: T, steps: WalkStep[], at: number): T {
  const skipped = steps[at]?.until && !walk.skipped.includes(at) ? [...walk.skipped, at] : walk.skipped;
  return { ...walk, cursor: at + 1, skipped };
}

export function walkBack<T extends { cursor: number }>(walk: T, at: number): T {
  return { ...walk, cursor: Math.max(0, at - 1) };
}

/**
 * Whether a tap on an outlined button moves the line on (1.0.68.14). Only a
 * tap line does: a getting-there line already moves on when the screen it
 * names opens, and the round button only opens the menu.
 */
export function tapMovesOn(step: WalkStep | null | undefined, tapped: string): boolean {
  return !!step && !step.until && !step.stay && step.mark === tapped && !MORE_AFTER_TAP.has(step.mark);
}

// The button outlined right now, set by components/StoryWalkHost.tsx (a
// guide walk) or components/TutorialHost.tsx (a tutorial) from the line it
// is showing, and read by every walkMark function. Each keeps its own slot,
// so one clearing its mark never wipes the other's; only one runs at a time.
export type WalkMarkSource = 'story' | 'tutorial';
const marks: Record<WalkMarkSource, WalkMark | null> = { story: null, tutorial: null };
let activeMark: WalkMark | null = null;
const markListeners = new Set<(value: WalkMark | null) => void>();

export function setWalkMark(value: WalkMark | null, source: WalkMarkSource = 'story'): void {
  marks[source] = value;
  const next = marks.tutorial ?? marks.story;
  if (next === activeMark) return;
  activeMark = next;
  for (const listener of markListeners) listener(next);
}

export function getWalkMark(): WalkMark | null {
  return activeMark;
}

export function subscribeWalkMark(listener: (value: WalkMark | null) => void): () => void {
  markListeners.add(listener);
  return () => {
    markListeners.delete(listener);
  };
}

let current: StoryWalk | null = null;
const listeners = new Set<(value: StoryWalk | null) => void>();

export function setStoryWalk(value: StoryWalk | null): void {
  current = value;
  for (const listener of listeners) listener(value);
}

export function startStoryWalk(guide: GuideKey, entryKey: string, startedDone: boolean): void {
  setStoryWalk({ guide, entryKey, startedDone, cursor: 0, skipped: [] });
}

export function getStoryWalk(): StoryWalk | null {
  return current;
}

export function subscribeStoryWalk(listener: (value: StoryWalk | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
