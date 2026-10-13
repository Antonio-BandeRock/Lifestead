// A tutorial under way (1.0.68.14): which how-to, and which line of it.
//
// A run is a queue of how-to keys from lib/tutorials.ts plus a position in
// the current one, moved the same way a guide walk is (walkPosition,
// walkNext, walkBack in lib/storyWalk.ts): a getting-there line moves on
// when its screen opens, a line about a ringed button moves on when that
// button is tapped, and Next moves on from anything.
//
// Only one walk runs at a time. Starting a tutorial ends a guide walk, and
// components/TutorialHost.tsx ends the tutorial when a guide walk starts.
//
// The store has no runtime import, so scripts/test_tutorials.js checks it.

export type TutorialRun = {
  queue: string[];
  index: number;
  // Within the current how-to, as in a guide walk.
  cursor: number;
  skipped: number[];
};

export function newRun(queue: string[], startAt = 0): TutorialRun | null {
  if (queue.length === 0) return null;
  return { queue, index: Math.max(0, Math.min(startAt, queue.length - 1)), cursor: 0, skipped: [] };
}

/** On to the next how-to; past the last one the run is over (index = queue length). */
export function nextHowTo(run: TutorialRun): TutorialRun {
  return { ...run, index: Math.min(run.index + 1, run.queue.length), cursor: 0, skipped: [] };
}

export function runFinished(run: TutorialRun): boolean {
  return run.index >= run.queue.length;
}

export function currentHowToKey(run: TutorialRun): string | null {
  return run.queue[run.index] ?? null;
}

// Where a stopped run picks up again, kept in your_story_answers so it
// survives the app closing: the queue and the how-to it stopped at.
export const TUTORIAL_RESUME_KEY = 'tutorial:resume';
export const TUTORIAL_DONE_PREFIX = 'tutorialDone:';

export function resumeText(run: TutorialRun): string | null {
  if (runFinished(run)) return null;
  return JSON.stringify({ queue: run.queue, index: run.index });
}

export function runFromResume(text: string | null | undefined, known: (key: string) => boolean): TutorialRun | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as { queue?: unknown; index?: unknown };
    if (!Array.isArray(parsed.queue) || typeof parsed.index !== 'number') return null;
    // A how-to that no longer exists (renamed in an update) is left out.
    const stoppedAt = parsed.queue[parsed.index];
    const queue = parsed.queue.filter((key): key is string => typeof key === 'string' && known(key));
    const index = typeof stoppedAt === 'string' ? queue.indexOf(stoppedAt) : -1;
    return newRun(queue, index < 0 ? Math.min(parsed.index, queue.length - 1) : index);
  } catch {
    return null;
  }
}

let current: TutorialRun | null = null;
const listeners = new Set<(value: TutorialRun | null) => void>();

export function setTutorialRun(value: TutorialRun | null): void {
  current = value;
  for (const listener of listeners) listener(value);
}

export function getTutorialRun(): TutorialRun | null {
  return current;
}

export function subscribeTutorialRun(listener: (value: TutorialRun | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
