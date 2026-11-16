// The tab tucked into the screen edge just above the footer, shared by the
// navigation switch (components/HandSwitchButton.tsx) and the quick voice
// note (components/QuickCaptureButton.tsx, the quick-access tab since
// 1.0.66.6, components/QuickAccessButton.tsx), 2026-10-07. Direct request: "Can
// we modify the navigation button, and the microphone buttons on the lower
// corners to have the pressed-in look behind the icons, so maybe round out
// the end of the tab it sits on so it follows the round of the pressed-in
// icon?"
//
// The tab is flat against the edge and its inner end is a half circle drawn
// around the same centre as the well, so the edge of the tab runs an even
// EDGE_TAB_MARGIN outside the well all the way round. The well carries the
// ground theme's buttonColor quietly, the same way TabHub's button does,
// since neither tab belongs to one tab colour.
//
// Every edge tab registers its spot with lib/hubHandoff.ts under its
// `hubKey` (2026-11-13), so while any menu is open a tap on this tab still
// lands: the menu closes and the tab does what it does. `hubOpen` is what
// that tap does when it differs from onPress (a tab whose own tap toggles
// its menu wants a stand-in that only opens it).
import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, type GestureResponderEvent, type PressableProps } from 'react-native';
import { colors } from '../constants/colors';
import { registerHubSpot, type HubKey } from '../lib/hubHandoff';
import { ActiveRingCircle } from './ActiveRingCircle';

export const EDGE_TAB_WELL = 32;
const EDGE_TAB_MARGIN = 4;
export const EDGE_TAB_HEIGHT = EDGE_TAB_WELL + EDGE_TAB_MARGIN * 2;
// The thumb-side stack, counted in slots from the footer up, 8 apart.
// Slot 0 is kept empty (direct instruction, 2026-11-16: "Move all 3 icons up
// so the amount of space at the bottom of them will have enough room for one
// more icon ... I don't want another one there, I just want the space").
// From the bottom: Quick Access, flash cards and reading while shown, Voice
// Control at the top ("Move the voice note icon on the left side to the top
// of the 3 icons there"), and search near the thumb above whichever is top.
const EDGE_TAB_GAP = 8;
export const EDGE_SLOT_QUICK = 1;
export const EDGE_SLOT_STUDY = 2;
export function edgeSlotVoice(studyShown: boolean): number {
  return studyShown ? EDGE_SLOT_STUDY + 1 : EDGE_SLOT_STUDY;
}
export function edgeSlotSearch(studyShown: boolean): number {
  return edgeSlotVoice(studyShown) + 1;
}
// How far above the footer a tab in this slot sits.
export function edgeTabAboveFooter(slot: number): number {
  return EDGE_TAB_GAP + slot * (EDGE_TAB_HEIGHT + EDGE_TAB_GAP);
}
// Room from the screen edge to where the well starts, plus the well and the
// margin past it, so the half circle's centre is the well's centre.
const EDGE_TAB_LEAD = 6;
export const EDGE_TAB_WIDTH = EDGE_TAB_LEAD + EDGE_TAB_WELL + EDGE_TAB_MARGIN;
const EDGE_TAB_WELL_GLOW_OPACITY = 0.28;
const EDGE_TAB_WELL_RIM_OPACITY = 0.45;

export function EdgeTab({
  side,
  bottom,
  hubKey,
  hubOpen,
  children,
  ...pressableProps
}: {
  side: 'left' | 'right';
  bottom: number;
  hubKey: HubKey;
  hubOpen?: () => void;
  children: ReactNode;
} & Omit<PressableProps, 'style' | 'children'>) {
  const { width: windowWidth } = useWindowDimensions();
  const left = side === 'right' ? windowWidth - EDGE_TAB_WIDTH : 0;
  // The registered function stays the same across renders and reads the
  // latest tap through a ref, since onPress is usually a fresh closure.
  const onPress = pressableProps.onPress;
  const openRef = useRef<() => void>(() => {});
  openRef.current = hubOpen ?? (() => onPress?.({} as GestureResponderEvent));
  useEffect(
    () =>
      registerHubSpot({ key: hubKey, left, bottom, width: EDGE_TAB_WIDTH, height: EDGE_TAB_HEIGHT, open: () => openRef.current() }),
    [hubKey, left, bottom],
  );
  return (
    <Pressable
      {...pressableProps}
      style={({ pressed }) => [
        styles.tab,
        side === 'right' ? styles.onRight : styles.onLeft,
        { bottom },
        pressed ? styles.pressed : null,
      ]}
    >
      <ActiveRingCircle
        size={EDGE_TAB_WELL}
        glowColor={colors.buttonColor}
        glowOpacity={EDGE_TAB_WELL_GLOW_OPACITY}
        rimColor={colors.buttonColor}
        rimOpacity={EDGE_TAB_WELL_RIM_OPACITY}
      >
        {children}
      </ActiveRingCircle>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    position: 'absolute',
    width: EDGE_TAB_WIDTH,
    height: EDGE_TAB_HEIGHT,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.85,
  },
  onRight: {
    right: 0,
    alignItems: 'flex-start',
    paddingLeft: EDGE_TAB_MARGIN - 1,
    borderRightWidth: 0,
    borderTopLeftRadius: EDGE_TAB_HEIGHT / 2,
    borderBottomLeftRadius: EDGE_TAB_HEIGHT / 2,
  },
  onLeft: {
    left: 0,
    alignItems: 'flex-end',
    paddingRight: EDGE_TAB_MARGIN - 1,
    borderLeftWidth: 0,
    borderTopRightRadius: EDGE_TAB_HEIGHT / 2,
    borderBottomRightRadius: EDGE_TAB_HEIGHT / 2,
  },
  pressed: { opacity: 1 },
});
