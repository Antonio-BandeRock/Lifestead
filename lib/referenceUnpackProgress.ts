// How far the food list has got in being unpacked on this phone (2026-11-19),
// read by components/DatabaseSetupScreen.tsx so the person sees what they are
// waiting for, and by app/_layout.tsx so its startup time limits wait while
// the work is still moving. Null when nothing is being unpacked.
import { useSyncExternalStore } from 'react';

let fraction: number | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setReferenceUnpackProgress(next: number | null): void {
  fraction = next;
  emit();
}

export function referenceUnpackProgress(): number | null {
  return fraction;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReferenceUnpackProgress(): number | null {
  return useSyncExternalStore(subscribe, referenceUnpackProgress, referenceUnpackProgress);
}
