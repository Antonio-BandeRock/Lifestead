// A ScrollView the guided tour can move (Tony, 2026-11-19: "Yes, we need
// continuity throughout the app at all times"). Home and Getting Set Up
// bring the section a tour line is about up to the top of the page through
// useBringToTopHost (components/BringToTop.tsx, 1.0.93.2); every other tab
// scrolled its own ScrollView, which the tour knew nothing about, so its
// lines rang a spot without moving the screen to it.
//
// This stands in for ScrollView on those tabs: it keeps how far it is
// scrolled and registers itself with lib/walkSpots.ts as a frame, so
// bringSpotToTop picks the frame a spot is drawn in (the smallest one
// holding it, so a list inside a page wins over the page) and scrolls it
// there. Everything else is passed through untouched. A sideways list is
// never registered: the tour brings sections down a page, not along a row.
import { forwardRef, useCallback, useEffect, useRef, type ForwardedRef } from 'react';
import { ScrollView, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewProps } from 'react-native';
import { registerWalkScroller, type SpotNode } from '../lib/walkSpots';

type Measurable = { measureInWindow: NonNullable<SpotNode['measureInWindow']>; contains?: SpotNode['contains'] };

// On a phone the ScrollView is itself measurable; on a computer
// react-native-web hands back a component whose scrolling element is a DOM
// node, measured the way react-native-web measures every other view.
function frameOf(scroll: ScrollView | null): Measurable | null {
  if (!scroll) return null;
  const direct = scroll as unknown as Partial<Measurable>;
  if (typeof direct.measureInWindow === 'function') return direct as Measurable;
  const node = (scroll as unknown as { getScrollableNode?: () => unknown }).getScrollableNode?.() as
    | {
        getBoundingClientRect?: () => { left: number; top: number; width: number; height: number };
        contains?: (other: unknown) => boolean;
      }
    | null
    | undefined;
  if (!node?.getBoundingClientRect) return null;
  return {
    measureInWindow: (callback) => {
      const box = node.getBoundingClientRect!();
      callback(box.left, box.top, box.width, box.height);
    },
    contains: (other) => node.contains?.(other) === true,
  };
}

function assignRef<T>(ref: ForwardedRef<T>, value: T | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

export const WalkScrollView = forwardRef<ScrollView, ScrollViewProps>(function WalkScrollView(props, ref) {
  const { onScroll, scrollEventThrottle, horizontal } = props;
  const inner = useRef<ScrollView | null>(null);
  const scrollY = useRef(0);
  const setRef = useCallback(
    (node: ScrollView | null) => {
      inner.current = node;
      assignRef(ref, node);
    },
    [ref],
  );
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    },
    [onScroll],
  );
  useEffect(() => {
    if (horizontal) return undefined;
    return registerWalkScroller({
      frame: () => frameOf(inner.current) as SpotNode | null,
      bring: (node) => {
        // After the line's spot has drawn, the same arithmetic as
        // useBringToTopHost: where the spot is below the top of the frame,
        // added to how far the frame is scrolled now.
        setTimeout(() => {
          const frame = frameOf(inner.current);
          if (!frame || typeof node.measureInWindow !== 'function') return;
          frame.measureInWindow((_fx, frameY) => {
            node.measureInWindow!((_sx, spotY) => {
              const y = Math.max(0, scrollY.current + spotY - frameY);
              inner.current?.scrollTo({ y, animated: true });
            });
          });
        }, 120);
      },
    });
  }, [horizontal]);
  return <ScrollView {...props} ref={setRef} onScroll={handleScroll} scrollEventThrottle={scrollEventThrottle ?? 16} />;
});
