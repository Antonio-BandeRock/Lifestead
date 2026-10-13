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

export async function measureSpot(name: string, windowHeight: number): Promise<SpotMeasure> {
  const nodes = [...(spots.get(name) ?? [])];
  const rects = await Promise.all(nodes.map(measureOne));
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

export function setActiveSpot(name: string | null, rect: SpotRect | null): void {
  activeName = name;
  activeRect = rect;
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
