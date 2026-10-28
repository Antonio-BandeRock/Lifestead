import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GUIDE_GAP,
  guideRoomHeight,
  guideSlotOffset,
  reportGuideHeight,
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
  useEffect(() => () => reportGuideHeight(slot, 0), [slot]);
  return (
    <View
      pointerEvents="box-none"
      style={[{ position: 'absolute', zIndex: 999 }, style, { top: insets.top + GUIDE_GAP + offset }]}
      onLayout={(event) => reportGuideHeight(slot, event.nativeEvent.layout.height)}
    >
      {children}
    </View>
  );
}

/**
 * The room the strips take now, redrawn whenever it changes. On a phone the
 * root Stack puts it in every screen's contentStyle (app/_layout.tsx).
 */
export function useGuideRoomHeight(): number {
  return useGuideRoomNumber(readRoom);
}

function readRoom(): number {
  return guideRoomHeight();
}

// On a phone the padding goes INSIDE each screen (1.0.75.5). Padding the
// view around the native Stack moved nothing on Android: the screens kept
// the frame they were first given, so Setup's strip sat over Life > Did I Do
// It and its + Add something to check button, the one the walk asked to tap.
// Inside the screen it is ordinary layout and follows every change. The
// desktop has no native screens, so the view around the Stack still does it
// there, which also keeps the version bar below the strips.
const PAD_AROUND_STACK = Platform.OS === 'web';

/** Wraps the screens in app/_layout.tsx and, on the desktop, pushes them below the strips. */
export function GuideRoomView({ children }: { children: ReactNode }) {
  const room = useGuideRoomHeight();
  return <View style={{ flex: 1, paddingTop: PAD_AROUND_STACK ? room : 0 }}>{children}</View>;
}

/** The padding a phone's screens take inside, 0 on the desktop. */
export function useGuideRoomScreenPadding(): number {
  const room = useGuideRoomHeight();
  return PAD_AROUND_STACK ? 0 : room;
}
