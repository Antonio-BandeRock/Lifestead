// Setup turned off at startup, and back on (direct request, 2026-11-15):
// "the user should be able to turn the setup page off if they decide they
// want to. It could be beside the Profile setting to run setup again. If
// they select it from there, there should be a message stating the
// percentage of the app they are utilizing ... So it will be like the
// setup is removed from the app startup, and placed into a holding pattern
// until the user turns it on again and they can start right where they
// left off."
//
// Turning it off only stops setup opening by itself when the app starts,
// and hides Home's Your Guide band while it is off. Every answer and every
// area done or skipped stays where it is, so turning it back on opens setup
// at the same place. Kept in app_meta, so it travels between one person's
// devices like the other setup answers: it is about the person, not the
// device.
//
// The percentage is said only in the message that answers the person's
// own tap on Turn Setup Off, never on a screen by itself, so the Your
// Guide rule (no percentages on its pages) still holds everywhere else.
import { useSyncExternalStore } from 'react';
import { getDatabase } from './db';
import { loadYourStory } from './yourStoryDb';
import type { YourStoryView } from './yourStory';

const SETUP_PAUSED_META_KEY = 'setup_paused';

export const SETUP_PAUSE_LABEL = 'Turn Setup Off';
export const SETUP_RESUME_LABEL = 'Turn Setup Back On';
export const SETUP_PAUSE_LINE =
  'Stops setup opening when Lifestead starts. Everything you answered and set up stays, and turning it back on opens setup where you left off.';
export const SETUP_PAUSED_LINE =
  'Setup is turned off, so it does not open when Lifestead starts. Turn it back on to carry on with the rest from where you left off.';
export const SETUP_PAUSED_HEADING = 'Setup is turned off';
export const SETUP_PAUSED_MESSAGE =
  'You are using {percent}% of what Lifestead can do: {done} of the {total} things in Your Guide are set up. Setup no longer opens when the app starts, and your place in it is kept. To set up the rest, come back here to Profile and tap Turn Setup Back On; it opens right where you left off.';
export const SETUP_PAUSED_MESSAGE_UNREAD =
  'Setup no longer opens when the app starts, and your place in it is kept. To set up the rest, come back here to Profile and tap Turn Setup Back On; it opens right where you left off.';

let paused = false;
let loaded = false;
const listeners = new Set<() => void>();

function publish(next: boolean): void {
  paused = next;
  loaded = true;
  for (const listener of listeners) listener();
}

export async function getSetupPaused(): Promise<boolean> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', SETUP_PAUSED_META_KEY);
    const value = row?.value === '1';
    if (value !== paused || !loaded) publish(value);
    return value;
  } catch (error) {
    console.warn('Setup: could not read whether it is turned off', error);
    return paused;
  }
}

export async function setSetupPaused(on: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `
      INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `,
    SETUP_PAUSED_META_KEY,
    on ? '1' : '0',
    new Date().toISOString(),
  );
  publish(on);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!loaded) void getSetupPaused();
  return () => {
    listeners.delete(listener);
  };
}

// Whether setup is turned off, redrawn the moment it is switched.
export function useSetupPaused(): boolean {
  return useSyncExternalStore(subscribe, () => paused, () => paused);
}

// How much of what Your Guide lists is set up: every item with a record
// counts as done, whichever areas of life were chosen.
export function setupShare(view: YourStoryView): { done: number; total: number; percent: number } {
  const items = Object.values(view.allItems);
  const total = items.length;
  const done = items.filter((item) => item.state === 'done').length;
  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export async function readSetupShare(): Promise<{ done: number; total: number; percent: number } | null> {
  try {
    return setupShare(await loadYourStory());
  } catch (error) {
    console.warn('Setup: could not count what is set up', error);
    return null;
  }
}
