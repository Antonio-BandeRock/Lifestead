// The lenses opened lately on one tab, 1.0.87.7, for the "Opened lately" row
// at the top of the long lens menus (Trends, Insights, Life). From the
// ease-of-use pass, fix 4: most visits go back to the same few lenses, so
// those become one tap with no searching.
//
// Like the navigation hand (lib/navigationHand.ts) this belongs to the device
// in the person's hand, not to their records, so it lives in a plain file
// that never travels through sync: a phone and a computer are used for
// different things. Missing or unreadable reads as nothing opened yet.
import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

// How many show in the row: one short row on a phone.
export const RECENT_LENS_COUNT = 4;

type RecentTable = Readonly<Record<string, readonly string[]>>;

const FILE_NAME = 'recent_lenses.json';

function file(): File {
  return new File(Paths.document, FILE_NAME);
}

function readTable(): RecentTable {
  try {
    const f = file();
    if (!f.exists) return {};
    const parsed: unknown = JSON.parse(f.textSync());
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, string[]> = {};
    for (const [tab, keys] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(keys)) out[tab] = keys.filter((key): key is string => typeof key === 'string').slice(0, RECENT_LENS_COUNT);
    }
    return out;
  } catch {
    return {};
  }
}

let table: RecentTable | null = null;
const listeners = new Set<() => void>();
const EMPTY: readonly string[] = [];

function current(): RecentTable {
  if (table === null) table = readTable();
  return table;
}

// The newest first, with the one just opened moved to the front. Pure, so
// scripts/test_recent_lenses.js can check it without a phone.
export function withOpened(list: readonly string[], key: string, limit = RECENT_LENS_COUNT): string[] {
  return [key, ...list.filter((existing) => existing !== key)].slice(0, limit);
}

export function noteLensOpened(tab: string, key: string): void {
  const before = current()[tab] ?? EMPTY;
  if (before[0] === key) return;
  table = { ...current(), [tab]: withOpened(before, key) };
  try {
    file().write(JSON.stringify(table));
  } catch {
    // Holds for this run; the next launch starts from what was last saved.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Per tab, newest first. The array is the one held in the table, so it stays
// the same object between redraws until something is opened.
export function useRecentLenses(tab: string | undefined): readonly string[] {
  return useSyncExternalStore(
    subscribe,
    () => (tab ? current()[tab] ?? EMPTY : EMPTY),
    () => EMPTY,
  );
}
