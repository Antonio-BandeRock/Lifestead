// Opening a folded header scrolls it to the top of the page, the way
// Profile's menus have since 1.0.63.16. Direct request, 2026-10-28, for
// Getting Set Up on Home: each tab "collapsable and it works like the menus
// of Profile works by collapsing the previous opened menu and opening the
// new one at the top of the screen just under the header."
//
// A screen that scrolls provides this around its ScrollView; anything
// inside it that folds calls bringToTop(header) once it opens. The header
// and the scrolling frame are both measured in the window after the fold
// has redrawn, and the difference is added to how far the page is scrolled
// now, the same arithmetic as bringHeaderToTop in app/profile.tsx.
import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from 'react-native';

type BringToTop = (header: View | null) => void;

const BringToTopContext = createContext<BringToTop | null>(null);

export function useBringToTop(): BringToTop | null {
  return useContext(BringToTopContext);
}

// For the screen: hand its ScrollView and the View it sits at the top of,
// and pass onScroll to the ScrollView with scrollEventThrottle set.
export function useBringToTopHost(scrollRef: RefObject<ScrollView | null>, frameRef: RefObject<View | null>) {
  const scrollY = useRef(0);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  }, []);
  const bringToTop = useCallback<BringToTop>(
    (header) => {
      setTimeout(() => {
        const frame = frameRef.current;
        if (!header || !frame) return;
        frame.measureInWindow((_fx, frameY) => {
          header.measureInWindow((_hx, headerY) => {
            const y = Math.max(0, scrollY.current + headerY - frameY);
            scrollRef.current?.scrollTo({ y, animated: true });
          });
        });
      }, 120);
    },
    [scrollRef, frameRef],
  );
  return useMemo(() => ({ bringToTop, onScroll }), [bringToTop, onScroll]);
}

export function BringToTopProvider({ value, children }: { value: BringToTop; children: ReactNode }) {
  return <BringToTopContext.Provider value={value}>{children}</BringToTopContext.Provider>;
}
