import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GUIDE_GAP,
  guideRoomHeight,
  guideRoomTop,
  guideSlotOffset,
  reportGuideHeight,
  setGuideRoomTop,
  subscribeGuideRoom,
  type GuideSlot,
} from '../lib/guideRoom';

// The React half of lib/guideRoom.ts (1.0.74.10): where a guide strip goes,
// and the view that moves the screen down so no strip ever covers it.

// Each number is read as the store's snapshot, never worked out in render
// (1.0.75.6). This app builds with React Compiler, which keeps the result of
// a call like guideRoomHeight() made in render until something it can see
// changes, and a module's Map is nothing it can see: the room was worked out
// once, as 0, and the screen was never moved down. A snapshot is a number
// React compares itself, so every change of height redraws.
function useGuideRoomNumber(read: () => number): number {
  return useSyncExternalStore(subscribeGuideRoom, read, read);
}

/**
 * The anchor every guide strip is drawn in. It sits in its slot's place at
 * the top, reports its height so the slots below it and the screen move
 * down, and gives the room back the moment the strip stops being drawn.
 * `style` carries the strip's own sideways placement (left and right).
 */
export function GuideStripAnchor({
  slot,
  style,
  children,
}: {
  slot: GuideSlot;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const offset = useGuideRoomNumber(() => guideSlotOffset(slot));
  const below = useGuideRoomNumber(guideRoomTop);
  useEffect(() => () => reportGuideHeight(slot, 0), [slot]);
  return (
    <View
      pointerEvents="box-none"
      style={[{ position: 'absolute', zIndex: 999 }, style, { top: Math.max(insets.top, below) + GUIDE_GAP + offset }]}
      onLayout={(event) => reportGuideHeight(slot, event.nativeEvent.layout.height)}
    >
      {children}
    </View>
  );
}

/**
 * The room the strips take now, redrawn whenever it changes. The root Stack
 * puts it in every screen's contentStyle except the tabs (app/_layout.tsx),
 * and the tabs put it under the Lifestead header (app/(tabs)/_layout.tsx).
 */
export function useGuideRoomHeight(): number {
  return useGuideRoomNumber(readRoom);
}

function readRoom(): number {
  return guideRoomHeight();
}

// The padding goes INSIDE each screen (1.0.75.5), never around the whole
// app: around the app it pushed the Lifestead header down below the strips
// (1.0.75.6), where the header belongs at the top with the strips under it
// (1.0.75.7). Tabs take it under the header, every other screen at its top.

/** Wraps the screens in app/_layout.tsx. */
export function GuideRoomView({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}

/**
 * Tells the strips where the Lifestead header ends while a tab is showing,
 * so they start under it, and gives the top back when the tab is covered or
 * closes.
 */
export function useGuideStripsBelow(bottom: number, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    setGuideRoomTop(bottom);
    return () => setGuideRoomTop(0);
  }, [bottom, active]);
}
