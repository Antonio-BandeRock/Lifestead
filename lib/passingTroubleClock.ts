// Where lib/passingTrouble.ts keeps each run of passing trouble: when it
// began and how many tries have failed in it, in a small file of its own in
// the app's documents folder, read and written synchronously. Not app_meta,
// because a write there counts as a change to the records and would start
// the very sync save that is failing. It outlives a restart so somebody who
// opens the app for a few minutes at a time still hears about trouble that
// has gone on all day. A file written before 1.0.68.2 holds only the start
// time, which reads as one failed try.
import { File, Paths } from 'expo-file-system';
import type { TroubleClock } from './passingTrouble';

export type TroubleChannel = 'sharedFolder' | 'mailbox';

const CLOCK_FILE_NAME = 'passing_trouble_since.json';

function clockFile(): File {
  return new File(Paths.document, CLOCK_FILE_NAME);
}

function readAll(): Partial<Record<TroubleChannel, unknown>> {
  try {
    const file = clockFile();
    if (!file.exists) return {};
    const parsed: unknown = JSON.parse(file.textSync());
    return parsed && typeof parsed === 'object' ? (parsed as Partial<Record<TroubleChannel, unknown>>) : {};
  } catch {
    return {};
  }
}

export function troubleClock(channel: TroubleChannel): TroubleClock | null {
  const value = readAll()[channel];
  if (typeof value === 'number') return { since: value, count: 1, last: value };
  if (value && typeof value === 'object') {
    const { since, count, last } = value as { since?: unknown; count?: unknown; last?: unknown };
    if (typeof since === 'number') {
      return { since, count: typeof count === 'number' ? count : 1, last: typeof last === 'number' ? last : since };
    }
  }
  return null;
}

export function setTroubleClock(channel: TroubleChannel, clock: TroubleClock | null): void {
  const all = readAll();
  if (JSON.stringify(all[channel] ?? null) === JSON.stringify(clock)) return;
  if (clock === null) delete all[channel];
  else all[channel] = clock;
  try {
    clockFile().write(JSON.stringify(all));
  } catch {
    // Holds for nothing then; the worst case is the notice coming later than it might.
  }
}
