// Where the guide strips sit, and how much room the app gives them
// (1.0.74.10).
//
// Direct instruction, 2026-10-27, after Setup's "Setting up" strip covered
// the passcode keys and buttons on the App Lock screen: "boxes telling them
// how to setup something for setup can never be in the way of what the user
// needs to see, type in, or tap."
//
// Every strip that guides somebody through the app (a walk through a guide,
// a tutorial, the tour, Setup's away strip, and the Back to Your Story pill)
// used to float over the screen at a place of its own, so whatever was drawn
// under it could not be reached. Now each one reports its height to a slot
// here, the slots stack from the top in one fixed order, and the root layout
// pushes the whole screen down by what they take (components/GuideRoom.tsx).
// Nothing is ever under a strip, and the bottom of the screen, where the app
// keyboard and the footer are, is left alone.
//
// Pure, with no React in it, so scripts/test_guide_room.js can check it.

export type GuideSlot = 'walk' | 'tutorial' | 'tour' | 'setup' | 'return';

/** Top to bottom. */
export const GUIDE_SLOT_ORDER: readonly GuideSlot[] = ['walk', 'tutorial', 'tour', 'setup', 'return'];

/** Between two strips, and between the last strip and the screen below. */
export const GUIDE_GAP = 6;

const heights = new Map<GuideSlot, number>();
const listeners = new Set<() => void>();
let version = 0;

export function reportGuideHeight(slot: GuideSlot, height: number): void {
  const next = height > 0 ? Math.ceil(height) : 0;
  if ((heights.get(slot) ?? 0) === next) return;
  if (next === 0) heights.delete(slot);
  else heights.set(slot, next);
  version += 1;
  for (const listener of listeners) listener();
}

export function subscribeGuideRoom(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Changes whenever any height does: the snapshot for useSyncExternalStore. */
export function guideRoomVersion(): number {
  return version;
}

/** How far below the first strip's top this slot's strip starts. */
export function guideSlotOffset(slot: GuideSlot, from: ReadonlyMap<GuideSlot, number> = heights): number {
  let offset = 0;
  for (const each of GUIDE_SLOT_ORDER) {
    if (each === slot) return offset;
    const height = from.get(each) ?? 0;
    if (height > 0) offset += height + GUIDE_GAP;
  }
  return offset;
}

/**
 * The room the screen is pushed down by: every strip showing, with the gap
 * above the first and below the last. 0 when no strip is showing. The strips
 * start just under the status bar, and every screen already leaves the
 * status bar clear at its top, so pushing the screen down by this much puts
 * its first row of content just under the last strip.
 */
export function guideRoomHeight(from: ReadonlyMap<GuideSlot, number> = heights): number {
  let total = 0;
  for (const each of GUIDE_SLOT_ORDER) {
    const height = from.get(each) ?? 0;
    if (height > 0) total += height + GUIDE_GAP;
  }
  return total === 0 ? 0 : GUIDE_GAP + total;
}

/** For the tests: the slots in use now. */
export function guideHeightsNow(): ReadonlyMap<GuideSlot, number> {
  return new Map(heights);
}
