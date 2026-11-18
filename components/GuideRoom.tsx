import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { PanResponder, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { t } from '../lib/i18n';
import { useFooterBandHeight } from '../constants/floatingButton';
import { useActiveField } from './ActiveInputContext';
import {
  GUIDE_TO_BOTTOM_LABEL,
  GUIDE_TO_TOP_LABEL,
  getChosenGuideEdge,
  setChosenGuideEdge,
  useChosenGuideEdge,
} from '../lib/guideEdge';
import {
  GUIDE_GAP,
  edgeAfterDrag,
  effectiveGuideEdge,
  guideEdge,
  setGuideEdge,
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
  const footer = useFooterBandHeight();
  const offset = useGuideRoomNumber(() => guideSlotOffset(slot));
  const below = useGuideRoomNumber(guideRoomTop);
  const edge = useGuideEdge();
  useEffect(() => () => reportGuideHeight(slot, 0), [slot]);
  // Dragged up or down far enough, the strips move to that edge
  // (2026-11-18). A tap still reaches the strip's buttons: the drag only
  // starts once the finger has moved.
  const [drag, setDrag] = useState(0);
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 12 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_event, gesture) => setDrag(gesture.dy),
      onPanResponderRelease: (_event, gesture) => {
        setDrag(0);
        setChosenGuideEdge(edgeAfterDrag(guideEdge(), gesture.dy));
      },
      onPanResponderTerminate: () => setDrag(0),
    }),
  ).current;
  const place =
    edge === 'bottom'
      ? { bottom: footer + GUIDE_GAP + offset }
      : { top: Math.max(insets.top, below) + GUIDE_GAP + offset };
  return (
    <View
      pointerEvents="box-none"
      style={[{ position: 'absolute', zIndex: 999 }, style, place, drag ? { transform: [{ translateY: drag }] } : null]}
      onLayout={(event) => reportGuideHeight(slot, event.nativeEvent.layout.height)}
      {...pan.panHandlers}
    >
      {children}
    </View>
  );
}

/** The edge the strips sit at now. */
export function useGuideEdge() {
  return useGuideRoomNumber(guideEdgeNumber) === 1 ? 'bottom' : 'top';
}

function guideEdgeNumber(): number {
  return guideEdge() === 'bottom' ? 1 : 0;
}

/**
 * Keeps the edge in step with the person's choice and the keyboard: the
 * strips go to the top while a field is being typed in. Drawn once, inside
 * the ActiveInputProvider (app/_layout.tsx).
 */
export function GuideEdgeSync() {
  const chosen = useChosenGuideEdge();
  const typing = useActiveField() !== null;
  useEffect(() => {
    setGuideEdge(effectiveGuideEdge(chosen, typing));
  }, [chosen, typing]);
  return null;
}

/**
 * The tap way to move the strips to the other edge, for anyone who would
 * rather not drag and for a mouse. Each strip puts it beside its fold
 * chevron.
 */
export function GuideEdgeButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const edge = useGuideEdge();
  const toBottom = edge === 'top';
  return (
    <TouchableOpacity
      onPress={() => setChosenGuideEdge(getChosenGuideEdge() === 'bottom' ? 'top' : 'bottom')}
      accessibilityRole="button"
      accessibilityLabel={t(toBottom ? GUIDE_TO_BOTTOM_LABEL : GUIDE_TO_TOP_LABEL)}
      hitSlop={10}
      style={style}
    >
      <Ionicons name={toBottom ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={18} color={colors.primary} />
    </TouchableOpacity>
  );
}

/**
 * The padding a screen takes for the strips: at its top when they sit at
 * the top, and at its bottom, with the footer under them, when they sit at
 * the bottom. Nothing on the screen is ever under a strip either way.
 */
export function useGuideRoomPadding(): { paddingTop: number; paddingBottom: number } {
  const room = useGuideRoomHeight();
  const edge = useGuideEdge();
  const footer = useFooterBandHeight();
  return useMemo(
    () =>
      edge === 'bottom'
        ? { paddingTop: 0, paddingBottom: room > 0 ? room + footer : 0 }
        : { paddingTop: room, paddingBottom: 0 },
    [edge, room, footer],
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
