// Starting, stopping and resuming tutorials (1.0.68.14), and what they keep:
// where a run stopped and which how-tos have been gone through, both in
// your_story_answers beside setup's answers. The tab chosen in setup
// (startTab) decides which tab comes first.
import { getDatabase } from './db';
import { setStoryWalk } from './storyWalk';
import { buildTutorials, howToByKey, tutorialQueue, type TabTutorial, type TutorialScope } from './tutorials';
import {
  TUTORIAL_DONE_PREFIX,
  TUTORIAL_RESUME_KEY,
  newRun,
  resumeText,
  runFromResume,
  setTutorialRun,
  type TutorialRun,
} from './tutorialRun';
import { isTourPath } from './yourStoryInterview';
import { clearYourStoryAnswer, setYourStoryAnswer } from './yourStoryInterviewDb';
import { isTesterBuild } from './appVariant';

export type TutorialState = {
  tabs: TabTutorial[];
  resume: TutorialRun | null;
  doneKeys: Set<string>;
  // The day each how-to was last gone through, for the date on a card.
  doneOn: Map<string, string>;
};

export async function loadTutorialState(): Promise<TutorialState> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ question_key: string; answered_on: string | null; answer: string | null }>(
    `SELECT question_key, answered_on, answer FROM your_story_answers WHERE question_key = 'startTab' OR question_key LIKE 'tutorial%'`,
  );
  let start: string | null = null;
  let resume: string | null = null;
  const doneKeys = new Set<string>();
  const doneOn = new Map<string, string>();
  for (const row of rows) {
    if (row.question_key === 'startTab') start = row.answer;
    else if (row.question_key === TUTORIAL_RESUME_KEY) resume = row.answer;
    else if (row.question_key.startsWith(TUTORIAL_DONE_PREFIX)) {
      const key = row.question_key.slice(TUTORIAL_DONE_PREFIX.length);
      doneKeys.add(key);
      if (row.answered_on) doneOn.set(key, row.answered_on);
    }
  }
  const tabs = buildTutorials(isTourPath(start) ? start : null, isTesterBuild());
  const known = howToByKey(tabs);
  return { tabs, resume: runFromResume(resume, (key) => known.has(key)), doneKeys, doneOn };
}

/** Start a run, ending any guide walk first so only one strip shows. */
export async function startTutorials(scope: TutorialScope): Promise<boolean> {
  const { tabs } = await loadTutorialState();
  const run = newRun(tutorialQueue(tabs, scope));
  if (!run) return false;
  setStoryWalk(null);
  setTutorialRun(run);
  await saveTutorialResume(run);
  return true;
}

export async function resumeTutorials(): Promise<boolean> {
  const { resume } = await loadTutorialState();
  if (!resume) return false;
  setStoryWalk(null);
  setTutorialRun(resume);
  return true;
}

export async function saveTutorialResume(run: TutorialRun | null): Promise<void> {
  const text = run ? resumeText(run) : null;
  try {
    if (text) await setYourStoryAnswer(TUTORIAL_RESUME_KEY, text);
    else await clearYourStoryAnswer(TUTORIAL_RESUME_KEY);
  } catch (error) {
    console.warn('Tutorials: could not keep where the run stopped', error);
  }
}

export async function markHowToGoneThrough(key: string): Promise<void> {
  try {
    await setYourStoryAnswer(`${TUTORIAL_DONE_PREFIX}${key}`);
  } catch (error) {
    console.warn('Tutorials: could not mark a how-to as gone through', error);
  }
}
