// How a long press on a band, or anything else, opens Report a Problem
// (tester plan T4). components/ReportProblemHost.tsx registers the sheet and
// says whether it is on, which it is only in the tester version; a caller
// asks useReportProblemOn() and calls openReportProblem() without knowing
// which version is running. The same shape lib/tellClaude.ts has for the
// developer's notes, kept apart so neither can open the other.
import { useSyncExternalStore } from 'react';

export type ReportProblemTarget = { bandId?: string; bandTitle?: string };

type Opener = (target: ReportProblemTarget) => void;

let enabled = false;
let opener: Opener | null = null;
const listeners = new Set<() => void>();

/** Called by the host once it knows which version is running. */
export function setReportProblemEnabled(on: boolean): void {
  if (enabled === on) return;
  enabled = on;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useReportProblemOn(): boolean {
  return useSyncExternalStore(subscribe, () => enabled, () => enabled);
}

export function registerReportProblemOpener(open: Opener): () => void {
  opener = open;
  return () => {
    if (opener === open) opener = null;
  };
}

/** Opens the sheet for this band, or for the screen when no band is named.
 *  Does nothing in a version that has no Report a Problem. */
export function openReportProblem(target: ReportProblemTarget = {}): void {
  if (!enabled) return;
  opener?.(target);
}
