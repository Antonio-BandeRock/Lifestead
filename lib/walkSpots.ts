// Where an outlined button is on the screen (1.0.68.14).
//
// Direct request, 2026-10-12: "The tutorials should literally walk them
// through every step for every lens ... with easy to follow visual and
// written instructions", answered with a live walkthrough over the actual
// screen. The outline from components/WalkMark.ts says which button a line
// is about; this file is what lets the app also find that button, so
// components/WalkSpotlight.tsx can draw a ring round it, Show me can move a
// pointing hand onto it, and a tap that lands on it moves the line on by
// itself rather than waiting for Next.
//
// Every button that carries a walk mark also hands its node in here through
// walkMark.ref(name). The same name can be mounted more than once (a tab
// screen kept alive behind the one in front), so a measurement takes the
// copy that is drawn at a size, preferring one inside the window.
//
// No React Native import, so scripts/test_tutorials.js checks the
// arithmetic in plain node.

export type SpotRect = { x: number; y: number; width: number; height: number };

export type SpotNode = {
  measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
  // A web element, which can be scrolled to.
  scrollIntoView?: (options?: { block?: string; behavior?: string }) => void;
};

// Where the button is compared with what is on screen.
export type SpotWhere = 'here' | 'above' | 'below' | 'missing';

export type SpotMeasure = { where: SpotWhere; rect: SpotRect | null; node: SpotNode | null };

const spots = new Map<string, Set<SpotNode>>();

export function registerSpot(name: string, node: SpotNode): void {
  let set = spots.get(name);
  if (!set) {
    set = new Set();
    spots.set(name, set);
  }
  set.add(node);
}

export function unregisterSpot(name: string, node: SpotNode): void {
  spots.get(name)?.delete(node);
}

function measureOne(node: SpotNode): Promise<SpotRect | null> {
  return new Promise((resolve) => {
    if (typeof node.measureInWindow !== 'function') {
      resolve(null);
      return;
    }
    let settled = false;
    // A node taken off screen can leave the callback unanswered.
    const timer = setTimeout(() => {
      if (!settled) resolve(null);
    }, 300);
    try {
      node.measureInWindow((x, y, width, height) => {
        settled = true;
        clearTimeout(timer);
        const ok = [x, y, width, height].every((value) => typeof value === 'number' && Number.isFinite(value));
        resolve(ok && width > 0 && height > 0 ? { x, y, width, height } : null);
      });
    } catch {
      settled = true;
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/** Where a rect is against a window of this height. */
export function spotWhere(rect: SpotRect | null, windowHeight: number): SpotWhere {
  if (!rect) return 'missing';
  if (rect.y + rect.height <= 0) return 'above';
  if (rect.y >= windowHeight) return 'below';
  return 'here';
}

/** The copy of a mark to point at: one on screen first, then the nearest. */
export function pickSpot(rects: (SpotRect | null)[], windowHeight: number): number {
  let best = -1;
  let bestDistance = Infinity;
  rects.forEach((rect, index) => {
    if (!rect) return;
    const where = spotWhere(rect, windowHeight);
    const distance = where === 'here' ? -1 : where === 'above' ? -(rect.y + rect.height) : rect.y - windowHeight;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

/**
 * A rect measured in the window, moved to be measured from a layer whose
 * top left is at `origin` in the same window. On Android with the app drawn
 * under the status bar, measureInWindow counts from below the status bar
 * while the ring's layer and every touch count from the top of the screen,
 * which put the ring a status bar's height above the button it was round.
 * Measuring the layer the same way and taking the one from the other cancels
 * that out wherever the window starts.
 */
export function fromOrigin(rect: SpotRect | null, origin: { x: number; y: number } | null): SpotRect | null {
  if (!rect || !origin) return rect;
  return { ...rect, x: rect.x - origin.x, y: rect.y - origin.y };
}

/** Where a node is in the window, or null when it is not drawn. */
export function measureNode(node: SpotNode | null): Promise<SpotRect | null> {
  return node ? measureOne(node) : Promise.resolve(null);
}

export async function measureSpot(name: string, windowHeight: number, origin: { x: number; y: number } | null = null): Promise<SpotMeasure> {
  const nodes = [...(spots.get(name) ?? [])];
  const rects = (await Promise.all(nodes.map(measureOne))).map((rect) => fromOrigin(rect, origin));
  const at = pickSpot(rects, windowHeight);
  if (at < 0) return { where: 'missing', rect: null, node: null };
  return { where: spotWhere(rects[at], windowHeight), rect: rects[at], node: nodes[at] };
}

/** Whether a tap at x, y landed on the rect, with a little room round it. */
export function spotHit(rect: SpotRect | null, x: number, y: number, slack = 8): boolean {
  if (!rect) return false;
  return x >= rect.x - slack && x <= rect.x + rect.width + slack && y >= rect.y - slack && y <= rect.y + rect.height + slack;
}

// The ring's last measurement of the button outlined right now, which a tap
// is checked against.
let activeName: string | null = null;
let activeRect: SpotRect | null = null;

const spotListeners = new Set<(rect: SpotRect | null) => void>();

export function sameRect(a: SpotRect | null, b: SpotRect | null): boolean {
  if (!a || !b) return a === b;
  return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1;
}

export function setActiveSpot(name: string | null, rect: SpotRect | null): void {
  const moved = !sameRect(activeRect, rect);
  activeName = name;
  activeRect = rect;
  if (moved) for (const listener of spotListeners) listener(rect);
}

export function getActiveSpot(): SpotRect | null {
  return activeRect;
}

/** Heard by the strips, so a strip can step out of the ring's way. */
export function subscribeActiveSpot(listener: (rect: SpotRect | null) => void): () => void {
  spotListeners.add(listener);
  return () => {
    spotListeners.delete(listener);
  };
}

/**
 * Where the strip goes. It rests at the top, and when the ringed button is
 * under it (an Add button at the top of a lens) it moves to just below the
 * ring, or just above when there is no room below, so the button it talks
 * about is never hidden by the line about it.
 */
export function stripTop(ring: SpotRect | null, stripHeight: number, restingTop: number, windowHeight: number, gap = 14): number {
  if (!ring || stripHeight <= 0) return restingTop;
  const ringTop = ring.y - gap;
  const ringBottom = ring.y + ring.height + gap;
  if (ringBottom <= restingTop || ringTop >= restingTop + stripHeight) return restingTop;
  if (ringBottom + stripHeight <= windowHeight) return ringBottom;
  if (ringTop - stripHeight >= 0) return ringTop - stripHeight;
  return restingTop;
}

const tapListeners = new Set<(name: string) => void>();

/** A tap anywhere in the app, from the root view (or the page, on a computer). */
export function reportTap(x: number, y: number): void {
  if (!activeName || !spotHit(activeRect, x, y)) return;
  const name = activeName;
  for (const listener of tapListeners) listener(name);
}

/** Heard by whichever strip set the mark, so a tap on it moves the line on. */
export function subscribeSpotTapped(listener: (name: string) => void): () => void {
  tapListeners.add(listener);
  return () => {
    tapListeners.delete(listener);
  };
}

// Show me, pressed on a strip and drawn by components/WalkSpotlight.tsx.
const showListeners = new Set<() => void>();

export function requestShowMe(): void {
  for (const listener of showListeners) listener();
}

export function subscribeShowMe(listener: () => void): () => void {
  showListeners.add(listener);
  return () => {
    showListeners.delete(listener);
  };
}

export const SHOW_ME_LABEL = 'Show me';
export const SHOW_ME_BELOW = 'It is further down this screen. Scroll down to the button with the ring round it.';
export const SHOW_ME_ABOVE = 'It is further up this screen. Scroll up to the button with the ring round it.';
export const SHOW_ME_MISSING = 'It is not on this screen yet. Do the line above first, and it appears.';

// Bringing the section a line is about up under the line (1.0.93.2).
// Direct request, 2026-11-18, going through Home's tour: "when it gets to
// Today it just has the tour information without the app having moved to
// that area of the home band. Make sure they all bring the section they are
// talking about to the top just under the description." A phone never
// scrolled to the ringed spot; only a computer did, and only on Show me.
//
// A screen that scrolls registers here through useBringToTopHost
// (components/BringToTop.tsx): its frame, which already starts below the
// guide strips, and the same bring-to-top its folds use. When a line names
// a spot, the spot is brought to the top of the frame it is drawn in, once
// per line, so the person can still scroll about while it waits.

export type WalkScroller = { frame: () => SpotNode | null; bring: (node: SpotNode) => void };

const scrollers = new Set<WalkScroller>();

export function registerWalkScroller(scroller: WalkScroller): () => void {
  scrollers.add(scroller);
  return () => {
    scrollers.delete(scroller);
  };
}

/**
 * Which frame a spot is drawn in: one drawn at a size and across the spot's
 * middle. Among those that also hold its top, the smallest, so a list
 * inside a page wins over the page; with none holding its top (the spot is
 * scrolled away above or below), the largest, the page itself.
 */
export function pickFrame(spot: SpotRect, frames: (SpotRect | null)[]): number {
  const middle = spot.x + spot.width / 2;
  let inside = -1;
  let insideArea = Infinity;
  let widest = -1;
  let widestArea = -1;
  frames.forEach((frame, index) => {
    if (!frame || middle < frame.x || middle > frame.x + frame.width) return;
    const area = frame.width * frame.height;
    if (spot.y >= frame.y && spot.y < frame.y + frame.height && area < insideArea) {
      inside = index;
      insideArea = area;
    }
    if (area > widestArea) {
      widest = index;
      widestArea = area;
    }
  });
  return inside >= 0 ? inside : widest;
}

/** Brings a spot to the top of the scrolling frame it is in. False when no frame holds it. */
export async function bringSpotToTop(node: SpotNode): Promise<boolean> {
  const spot = await measureOne(node);
  if (!spot) return false;
  const list = [...scrollers];
  const frames = await Promise.all(list.map((scroller) => measureNode(scroller.frame())));
  const at = pickFrame(spot, frames);
  if (at < 0) return false;
  list[at].bring(node);
  return true;
}
