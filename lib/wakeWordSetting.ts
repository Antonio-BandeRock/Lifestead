// Whether this device listens for "Lifestead" (voice step 7, 1.0.66.25), and
// what the listener is doing now, for the line under the switch in Profile.
//
// Kept in a plain file like lib/navigationHand.ts rather than in the
// database: a microphone belongs to the device, a phone and a computer can
// differ, and sync must never carry a choice to listen onto a device whose
// owner did not make it there. Missing or unreadable reads as off.
import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import type { WakeStatus } from './wakeWord';

const FILE_NAME = 'wake_word.txt';

function settingFile(): File {
  return new File(Paths.document, FILE_NAME);
}

function readOn(): boolean {
  try {
    const file = settingFile();
    if (file.exists) return file.textSync().trim() === 'on';
  } catch {
    // Falls back to off.
  }
  return false;
}

let on: boolean | null = null;
let status: WakeStatus = 'off';
const listeners = new Set<() => void>();

function changed(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getWakeWordOn(): boolean {
  if (on === null) on = readOn();
  return on;
}

export function setWakeWordOn(next: boolean): void {
  if (getWakeWordOn() === next) return;
  on = next;
  try {
    settingFile().write(next ? 'on' : 'off');
  } catch {
    // Holds for this run; the next launch reads off.
  }
  changed();
}

export function useWakeWordOn(): boolean {
  return useSyncExternalStore(subscribe, getWakeWordOn, getWakeWordOn);
}

function getWakeStatus(): WakeStatus {
  return status;
}

/** Set by components/WakeWordListener.tsx. */
export function setWakeStatus(next: WakeStatus): void {
  if (status === next) return;
  status = next;
  changed();
}

export function useWakeStatus(): WakeStatus {
  return useSyncExternalStore(subscribe, getWakeStatus, getWakeStatus);
}
