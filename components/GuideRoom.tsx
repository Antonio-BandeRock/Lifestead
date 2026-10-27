import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GUIDE_GAP,
  guideRoomHeight,
  guideRoomVersion,
  guideSlotOffset,
  reportGuideHeight,
  subscribeGuideRoom,
  type GuideSlot,
} from '../lib/guideRoom';

// The React half of lib/guideRoom.ts (1.0.74.10): where a guide strip goes,
// and the view that moves the screen down so no strip ever covers it.

function useGuideRoomVersion(): number {
  return useSyncExternalStore(subscribeGuideRoom, guideRoomVersion, guideRoomVersion);
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
  useGuideRoomVersion();
  useEffect(() => () => reportGuideHeight(slot, 0), [slot]);
  return (
    <View
      pointerEvents="box-none"
      style={[{ position: 'absolute', zIndex: 999 }, style, { top: insets.top + GUIDE_GAP + guideSlotOffset(slot) }]}
      onLayout={(event) => reportGuideHeight(slot, event.nativeEvent.layout.height)}
    >
      {children}
    </View>
  );
}

/** Wraps the screens in app/_layout.tsx and pushes them below the strips. */
export function GuideRoomView({ children }: { children: ReactNode }) {
  useGuideRoomVersion();
  return <View style={{ flex: 1, paddingTop: guideRoomHeight() }}>{children}</View>;
}
