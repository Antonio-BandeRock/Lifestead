// Whether a screen reader (TalkBack, VoiceOver) is on, so the parts of the
// app only it hears are worked out only then (2026-11-24). Handed React
// Native's AccessibilityInfo by components/reactNativeWithEditableText.js
// rather than importing it, so the Metro swap can load this file. With
// nothing handed over (the desktop, a node test) it reads as on.
import { useSyncExternalStore } from 'react';

type Info = {
  isScreenReaderEnabled: () => Promise<boolean>;
  addEventListener: (name: 'screenReaderChanged', listener: (on: boolean) => void) => unknown;
};

let on = true;
const listeners = new Set<() => void>();

function set(next: boolean): void {
  if (next === on) return;
  on = next;
  for (const listener of listeners) listener();
}

export function watchScreenReader(info: Info): void {
  on = false;
  try {
    info.isScreenReaderEnabled().then(set, () => {});
    info.addEventListener('screenReaderChanged', set);
  } catch {
    on = true;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const read = (): boolean => on;

export function useScreenReaderOn(): boolean {
  return useSyncExternalStore(subscribe, read, read);
}
