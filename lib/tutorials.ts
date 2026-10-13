// Tutorials (1.0.68.14): every tab, every lens on it, one after another.
//
// Direct request, 2026-10-12: "When the user has completed the profile
// settings the app needs, then they are offered the tutorials for working in
// each tab, going through every lens that tab has available, then moving on
// to the next tab and all of it's lenses, and then the next, and the next,
// until they have gone through everything. If they need to, they can go
// through any of the tutorials for any tab individually or in succession any
// time by selecting it in Profile. ... The tutorials should literally walk
// them through every step for every lens." Asked the same day, the chosen
// tab comes first and the tutorials run live over the actual screen.
//
// So a tutorial is made of how-tos, and a how-to is the same kind of walk
// the guides use (lib/storyWalk.ts): lines that move on by themselves when
// the screen they name opens or the ringed button is tapped. Each lens gets:
//
//   1. a how-to that takes the person there and says what the lens does
//      for them, from the tour's lens line (TOUR_LENS_LINES);
//   2. a how-to for every guide step that is done on that lens, with the
//      same lines and the same ringed buttons as Walk me through it.
//
// Home has no lenses, so its tutorial walks through its groups of cards
// and then the guide steps done from Home.
//
// The lens list, the names and the lines all come from TOUR_TABS, which
// scripts/test_your_story.js checks against the tab screens, so a lens added
// to a screen and to the tour gets its tutorial here with nothing else to
// change. Step 3 of the request (a how-to for every tool on every lens)
// adds to `howTos` below. No counts, no progress figure, no praise: the
// strip says what to do now.
//
// No runtime import but the guide and tour modules, so
// scripts/test_tutorials.js checks it in plain node.
import { gettingThere, walkSteps, type WalkStep } from './storyWalk';
import { FROM_HOME, GUIDES, GO_HOME, type GuideEntry } from './yourStoryGuides';
import { TOUR_TABS, lensLine, lensName, type TourPath, type TourTabDef } from './yourStoryInterview';

export type HowTo = {
  // `${path}#${lens}:about` for the getting-there how-to, or
  // `${path}#${lens}:${entry key}` for a guide step.
  key: string;
  title: string;
  steps: WalkStep[];
};

export type LensTutorial = {
  // `${path}#${lens}`, or `/#home` for Home.
  key: string;
  path: TourPath;
  lens: string | null;
  name: string;
  line: string | null;
  howTos: HowTo[];
};

export type TabTutorial = {
  path: TourPath;
  title: string;
  answer: string;
  lenses: LensTutorial[];
};

export const TUTORIALS_HEADING = 'Tutorials';
export const TUTORIALS_LEAD =
  'Each one takes you to the screen it is about and goes through it with you, a line at a time, on the screen itself. A ring goes round the button to press. Press it and the next line comes up, or press Next. Show me points to the button, and Stop ends the tutorial whenever you like.';
export const TUTORIALS_OPEN_LABEL = 'Tutorials';
export const TUTORIALS_PROFILE_LINE =
  'Go through any tab, or any lens on one, with the app showing you each step on the screen. Run them in order or one at a time, as often as you like.';
export const START_ALL_LABEL = 'Start from the beginning';
export const START_ALL_LINE = 'Every tab in turn, starting with the one you chose, and every lens on each.';
export const CARRY_ON_LABEL = 'Carry on where you stopped';
export const START_TAB_LABEL = 'This tab';
export const START_FROM_TAB_LABEL = 'This tab and the rest after it';
export const START_LENS_LABEL = 'Start';
export const SHOW_STEPS_LABEL = 'Show the steps';
export const HIDE_STEPS_LABEL = 'Hide the steps';
export const DONE_BEFORE_LABEL = 'Gone through before';
export const SETUP_TUTORIALS_LABEL = 'Start the tutorials';
export const SETUP_TUTORIALS_LINE =
  'The tutorials take you through every tab, starting with the one you chose, and show you each lens on the screen itself. Stop any time; they are in Profile under Tutorials whenever you want them again.';

// What the strip says.
export const TUTORIAL_CAPTION = 'Tutorial';
export const TUTORIAL_STOP_LABEL = 'Stop';
export const TUTORIAL_SKIP_LABEL = 'Skip this one';
export const TUTORIAL_CLOSE_LABEL = 'Close';
export const TUTORIAL_FINISHED_LINE = 'That is the end of the tutorials you chose. Profile has them under Tutorials whenever you want one again.';

const HOME_KEY = '/#home';

export function lensKey(path: TourPath, lens: string | null): string {
  return lens ? `${path}#${lens}` : HOME_KEY;
}

// Where a guide step is done: a lens on a tab, Home, or somewhere the
// tutorials do not walk (Profile, which setup covers).
function entryPlace(entry: GuideEntry): string | null {
  const destination = entry.destination;
  if (destination.kind === 'home' || destination.kind === 'quickLog') return HOME_KEY;
  if (destination.kind !== 'route') return null;
  if (FROM_HOME[destination.pathname]) return HOME_KEY;
  const lens = destination.params ? Object.values(destination.params)[0] : undefined;
  if (!lens) return null;
  return `${destination.pathname}#${lens}`;
}

// Every guide step, once each, by where it is done. A step that appears in
// two guides is the same step and gives one how-to.
function entriesByPlace(): Map<string, GuideEntry[]> {
  const seen = new Set<string>();
  const byPlace = new Map<string, GuideEntry[]>();
  for (const guide of GUIDES) {
    for (const entry of guide.entries) {
      if (seen.has(entry.key)) continue;
      const place = entryPlace(entry);
      if (!place) continue;
      seen.add(entry.key);
      const list = byPlace.get(place) ?? [];
      list.push(entry);
      byPlace.set(place, list);
    }
  }
  return byPlace;
}

function entryHowTo(place: string, entry: GuideEntry): HowTo {
  // Every guide step gets its buttons ringed in a tutorial, whatever the
  // guide calls it, since somebody here asked to be shown. It ends on what
  // the thing does for them, so every how-to finishes on a line to read
  // rather than on a screen opening.
  return {
    key: `${place}:${entry.key}`,
    title: entry.doThis,
    steps: [...walkSteps({ ...entry, when: 'start' }), { say: entry.forYou, point: null }],
  };
}

function lensKeys(tab: TourTabDef): string[] {
  const keys: string[] = [];
  for (const group of tab.groups) for (const key of group.lenses) if (!keys.includes(key)) keys.push(key);
  return keys;
}

function homeTutorial(tab: TourTabDef, entries: GuideEntry[]): LensTutorial {
  const tour: WalkStep[] = [
    { say: GO_HOME, point: 'hub', mark: 'hub', until: { pathname: '/' } },
    { say: tab.answer, point: null },
    ...tab.groups.map((group) => ({ say: group.line ? `${group.title}: ${group.line}` : group.title, point: null })),
  ];
  return {
    key: HOME_KEY,
    path: '/',
    lens: null,
    name: tab.title,
    line: null,
    howTos: [
      { key: `${HOME_KEY}:about`, title: `Find your way round ${tab.title}`, steps: tour },
      ...entries.map((entry) => entryHowTo(HOME_KEY, entry)),
    ],
  };
}

function lensTutorial(path: TourPath, lens: string, entries: GuideEntry[]): LensTutorial {
  const name = lensName(path, lens);
  const line = lensLine(path, lens);
  const key = lensKey(path, lens);
  const about: WalkStep[] = [...gettingThere(path, lens, name), { say: line ?? `This is ${name}.`, point: null }];
  return {
    key,
    path,
    lens,
    name,
    line,
    howTos: [{ key: `${key}:about`, title: `Get to ${name}`, steps: about }, ...entries.map((entry) => entryHowTo(key, entry))],
  };
}

/** Every tab's tutorial, the chosen tab first and the rest in tour order. */
export function buildTutorials(startPath: TourPath | null): TabTutorial[] {
  const byPlace = entriesByPlace();
  const ordered = startPath ? [...TOUR_TABS.filter((tab) => tab.path === startPath), ...TOUR_TABS.filter((tab) => tab.path !== startPath)] : TOUR_TABS;
  return ordered.map((tab) => ({
    path: tab.path,
    title: tab.title,
    answer: tab.answer,
    lenses:
      tab.path === '/'
        ? [homeTutorial(tab, byPlace.get(HOME_KEY) ?? [])]
        : lensKeys(tab).map((lens) => lensTutorial(tab.path, lens, byPlace.get(lensKey(tab.path, lens)) ?? [])),
  }));
}

export function howToByKey(tabs: TabTutorial[]): Map<string, { howTo: HowTo; tab: TabTutorial; lens: LensTutorial }> {
  const map = new Map<string, { howTo: HowTo; tab: TabTutorial; lens: LensTutorial }>();
  for (const tab of tabs) for (const lens of tab.lenses) for (const howTo of lens.howTos) map.set(howTo.key, { howTo, tab, lens });
  return map;
}

// WHAT A RUN GOES THROUGH.

export type TutorialScope =
  | { kind: 'all' }
  | { kind: 'tab'; path: TourPath }
  | { kind: 'fromTab'; path: TourPath }
  | { kind: 'lens'; key: string }
  | { kind: 'howTo'; key: string };

/** The how-tos a run goes through, in order. */
export function tutorialQueue(tabs: TabTutorial[], scope: TutorialScope): string[] {
  const all = (list: TabTutorial[]) => list.flatMap((tab) => tab.lenses.flatMap((lens) => lens.howTos.map((howTo) => howTo.key)));
  switch (scope.kind) {
    case 'all':
      return all(tabs);
    case 'tab':
      return all(tabs.filter((tab) => tab.path === scope.path));
    case 'fromTab': {
      const at = tabs.findIndex((tab) => tab.path === scope.path);
      return at < 0 ? [] : all(tabs.slice(at));
    }
    case 'lens':
      return tabs.flatMap((tab) => tab.lenses.filter((lens) => lens.key === scope.key).flatMap((lens) => lens.howTos.map((howTo) => howTo.key)));
    case 'howTo':
      return howToByKey(tabs).has(scope.key) ? [scope.key] : [];
  }
}
