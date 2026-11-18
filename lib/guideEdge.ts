// Which edge of the screen the guide strips sit at, kept for this device
// (2026-11-18). The choice belongs to the device in the person's hand, like
// the navigation hand (lib/navigationHand.ts), so it lives in a plain file:
// it never travels through sync and is read synchronously at startup.
// Missing or unreadable reads as 'top', where the strips always sat before.
import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import type { GuideEdge } from './guideRoom';

const FILE_NAME = 'guide_edge.txt';

function edgeFile(): File {
  return new File(Paths.document, FILE_NAME);
}

function readEdge(): GuideEdge {
  try {
    const file = edgeFile();
    if (file.exists) return file.textSync().trim() === 'bottom' ? 'bottom' : 'top';
  } catch {
    // Falls back to the default below.
  }
  return 'top';
}

let current: GuideEdge | null = null;
const listeners = new Set<() => void>();

export function getChosenGuideEdge(): GuideEdge {
  if (current === null) current = readEdge();
  return current;
}

export function setChosenGuideEdge(next: GuideEdge): void {
  if (getChosenGuideEdge() === next) return;
  current = next;
  try {
    edgeFile().write(next);
  } catch {
    // Holds for this run; the next launch falls back to the top.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useChosenGuideEdge(): GuideEdge {
  return useSyncExternalStore(subscribe, getChosenGuideEdge, getChosenGuideEdge);
}

export const GUIDE_TO_BOTTOM_LABEL = 'Move these boxes to the bottom';
export const GUIDE_TO_TOP_LABEL = 'Move these boxes to the top';
