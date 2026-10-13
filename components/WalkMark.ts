// Walk me through it, stage 2 (1.0.51.11): the outline on the button a walk
// line names. One hook per component, called once at the top:
//
//   const walkMark = useWalkMark();
//   <TouchableOpacity ref={walkMark.ref('upkeep.add')} style={[styles.button, walkMark('upkeep.add')]}>
//
// walkMark returns undefined unless a walk is showing a line about that
// button, so a screen with no walk under way gets exactly the style it always
// had. An outline is drawn outside the box and takes up no room, so marking a
// button never moves anything around it. The names, and which line uses
// which, are in lib/storyWalk.ts.
//
// walkMark.ref (1.0.68.14) hands the button's node to lib/walkSpots.ts, so
// the ring, Show me and a tap on the button can find where it is drawn.
// It does nothing else, so a button that carries it looks and acts the same.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { colors } from '../constants/colors';
import { getWalkMark, subscribeWalkMark, type WalkMark } from '../lib/storyWalk';
import { registerSpot, unregisterSpot, type SpotNode } from '../lib/walkSpots';

// Typed by its own shape, so the one value fits a button and a text box alike.
const MARKED = {
  outlineColor: colors.primary,
  outlineStyle: 'solid' as const,
  outlineWidth: 3,
  outlineOffset: 3,
};

// The three floating buttons are square boxes around round artwork, so their
// outline is drawn round and a little further out.
const ROUND = { ...MARKED, outlineOffset: 6, borderRadius: 999 };
const ROUND_MARKS: readonly WalkMark[] = ['hub', 'corner', 'bookmarks'];

// A callback ref that takes any node, so it fits a TouchableOpacity, a View
// and a text box alike.
type SpotRef = (node: unknown) => void;

export type WalkMarkFn = ((name: WalkMark) => typeof MARKED | undefined) & { ref: (name: WalkMark) => SpotRef };

export function useWalkMark(): WalkMarkFn {
  const [active, setActive] = useState<WalkMark | null>(getWalkMark);
  useEffect(() => {
    setActive(getWalkMark());
    return subscribeWalkMark(setActive);
  }, []);
  // One ref per name for the life of the component, so React does not
  // hand the node out and back on every draw.
  const refs = useRef(new Map<WalkMark, SpotRef>());
  const ref = useCallback((name: WalkMark): SpotRef => {
    let made = refs.current.get(name);
    if (!made) {
      let held: SpotNode | null = null;
      made = (node: unknown) => {
        if (held) unregisterSpot(name, held);
        held = node ? (node as SpotNode) : null;
        if (held) registerSpot(name, held);
      };
      refs.current.set(name, made);
    }
    return made;
  }, []);
  // A button that hands over its node gets the measured ring from
  // WalkSpotlight, so the outline is left off it; two rings round one
  // button, a little apart, read as a mistake. The outline stays for a
  // button that only takes the style.
  const style = useCallback(
    (name: WalkMark) => (active !== name || refs.current.has(name) ? undefined : ROUND_MARKS.includes(name) ? ROUND : MARKED),
    [active],
  );
  return useMemo(() => Object.assign((name: WalkMark) => style(name), { ref }), [style, ref]);
}
