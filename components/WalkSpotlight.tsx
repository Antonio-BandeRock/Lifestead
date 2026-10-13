// The ring and the pointing hand (1.0.68.14).
//
// Direct request, 2026-10-12: every tool on every lens gets a how-to "that
// goes through the steps one by one with easy to follow visual and written
// instructions", chosen as a live walkthrough over the actual screen. The
// strip (StoryWalkHost or TutorialHost) gives the written line; this draws
// the visual half over whatever screen is open:
//
//   - a ring that pulses round the button the line is about, found through
//     lib/walkSpots.ts and measured again a few times a second, so it
//     follows a screen that scrolls or a form that opens;
//   - Show me, which moves a pointing hand from the middle of the screen
//     onto the button and taps it twice in the air. When the button is off
//     the screen it says which way to scroll (a computer scrolls to it), and
//     when it is not drawn yet it says to do the line before it first.
//
// It never catches a touch (pointerEvents none), so everything under it
// works as it always does. A tap that lands on the ringed button is
// reported by the root view in app/_layout.tsx, and the strip moves on.
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFooterBandHeight } from '../constants/floatingButton';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { getWalkMark, subscribeWalkMark, type WalkMark } from '../lib/storyWalk';
import {
  measureNode,
  measureSpot,
  reportTap,
  sameRect,
  setActiveSpot,
  SHOW_ME_ABOVE,
  SHOW_ME_BELOW,
  SHOW_ME_MISSING,
  subscribeShowMe,
  type SpotRect,
} from '../lib/walkSpots';

// How often the ringed button is measured while a line names one.
const MEASURE_MS = 400;
const HAND_SIZE = 44;
const RING_PAD = 6;
// How far the ring breathes out on each side. A fixed distance rather than a
// share of its size, so the ring round a button the width of the screen grows
// as little as the ring round an icon and never runs off the edge.
const RING_GROW = 5;
const FOOTER_MARKS: readonly WalkMark[] = ['hub', 'corner', 'bookmarks'];

export function WalkSpotlight() {
  const { width, height } = useWindowDimensions();
  const [mark, setMark] = useState<WalkMark | null>(getWalkMark);
  const [rect, setRect] = useState<SpotRect | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [handShown, setHandShown] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const hand = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const handOpacity = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const footerHeight = useFooterBandHeight();
  const markRef = useRef(mark);
  markRef.current = mark;
  // How far down a button can be and still be seen. A button the list has
  // scrolled under the footer band is still inside the window, so it would
  // be ringed over the bottom bar; it counts as further down instead. The
  // footer's own buttons are the exception.
  const heightRef = useRef(height);
  heightRef.current = mark && FOOTER_MARKS.includes(mark) ? height : height - footerHeight;
  // The layer's own place in the window: every rect is measured from it, so
  // the ring sits where the button is drawn and a tap (counted from the top
  // of the screen) is checked against the same place.
  const layerRef = useRef<View | null>(null);
  const layerOrigin = async () => {
    const at = await measureNode(layerRef.current as unknown as Parameters<typeof measureNode>[0]);
    return at ? { x: at.x, y: at.y } : null;
  };

  useEffect(() => {
    setMark(getWalkMark());
    return subscribeWalkMark(setMark);
  }, []);

  // Measure the button while a line names it.
  useEffect(() => {
    setNotice(null);
    if (!mark) {
      setRect(null);
      setActiveSpot(null, null);
      return;
    }
    let live = true;
    const look = async () => {
      const origin = await layerOrigin();
      if (!origin) return;
      const found = await measureSpot(mark, heightRef.current, origin);
      if (!live) return;
      const shown = found.where === 'here' ? found.rect : null;
      setRect((was) => (sameRect(was, shown) ? was : shown));
      setActiveSpot(mark, shown);
    };
    void look();
    const timer = setInterval(() => void look(), MEASURE_MS);
    return () => {
      live = false;
      clearInterval(timer);
      setActiveSpot(null, null);
    };
  }, [mark]);

  // The ring breathes, so the eye finds it.
  useEffect(() => {
    if (!rect) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [rect, pulse]);

  // A computer has no root touch view, so a click on the page is checked here.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onUp = (event: PointerEvent) => reportTap(event.clientX, event.clientY);
    document.addEventListener('pointerup', onUp, true);
    return () => document.removeEventListener('pointerup', onUp, true);
  }, []);

  // Show me.
  useEffect(
    () =>
      subscribeShowMe(() => {
        const name = markRef.current;
        if (!name) return;
        void (async () => {
          const origin = await layerOrigin();
          let found = await measureSpot(name, heightRef.current, origin);
          if (found.where !== 'here' && found.where !== 'missing' && found.node?.scrollIntoView) {
            found.node.scrollIntoView({ block: 'center', behavior: 'smooth' });
            await new Promise((resolve) => setTimeout(resolve, 600));
            found = await measureSpot(name, heightRef.current, await layerOrigin());
          }
          if (found.where !== 'here' || !found.rect) {
            setNotice(found.where === 'below' ? SHOW_ME_BELOW : found.where === 'above' ? SHOW_ME_ABOVE : SHOW_ME_MISSING);
            return;
          }
          setNotice(null);
          const target = found.rect;
          // The fingertip is the top-left of the icon, so the hand lands
          // with its tip on the middle of the button.
          const endX = target.x + target.width / 2 - HAND_SIZE * 0.3;
          const endY = target.y + target.height / 2 - HAND_SIZE * 0.1;
          hand.setValue({ x: width / 2 - HAND_SIZE / 2, y: heightRef.current / 2 });
          handOpacity.setValue(0);
          ripple.setValue(0);
          setHandShown(true);
          const native = Platform.OS !== 'web';
          Animated.sequence([
            Animated.timing(handOpacity, { toValue: 1, duration: 200, useNativeDriver: native }),
            Animated.timing(hand, { toValue: { x: endX, y: endY }, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: native }),
            Animated.timing(ripple, { toValue: 1, duration: 450, useNativeDriver: native }),
            Animated.timing(ripple, { toValue: 0, duration: 0, useNativeDriver: native }),
            Animated.timing(ripple, { toValue: 1, duration: 450, useNativeDriver: native }),
            Animated.delay(500),
            Animated.timing(handOpacity, { toValue: 0, duration: 300, useNativeDriver: native }),
          ]).start(() => setHandShown(false));
        })();
      }),
    [hand, handOpacity, ripple, width],
  );

  // A notice says its piece and goes.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!mark) return null;

  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0.45] });
  const ring = rect ? ringBox(rect, width) : null;

  return (
    <View ref={layerRef} collapsable={false} pointerEvents="none" style={styles.layer}>
      {ring ? (
        <Animated.View
          style={[
            styles.ring,
            {
              left: ring.x,
              top: ring.y,
              width: ring.width,
              height: ring.height,
              borderRadius: Math.min(ring.height, ring.width) / 2,
              opacity: ringOpacity,
              transform: [
                { scaleX: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + (RING_GROW * 2) / ring.width] }) },
                { scaleY: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + (RING_GROW * 2) / ring.height] }) },
              ],
            },
          ]}
        />
      ) : null}
      {handShown ? (
        <Animated.View style={[styles.hand, { opacity: handOpacity, transform: hand.getTranslateTransform() }]}>
          <Animated.View
            style={[
              styles.ripple,
              {
                opacity: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
                transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.6] }) }],
              },
            ]}
          />
          <MaterialCommunityIcons name="gesture-tap" size={HAND_SIZE} color={colors.textPrimary} style={styles.handIcon} />
        </Animated.View>
      ) : null}
      {notice ? (
        <View style={[styles.noticeAnchor, { top: height / 2 - 40 }]}>
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** The ring's box: the button with room round it, kept inside the window
 * with room for the ring to breathe. */
function ringBox(rect: SpotRect, windowWidth: number): SpotRect {
  const edge = RING_GROW + 2;
  const left = Math.max(edge, rect.x - RING_PAD);
  const right = Math.min(windowWidth - edge, rect.x + rect.width + RING_PAD);
  return { x: left, y: rect.y - RING_PAD, width: Math.max(right - left, 1), height: rect.height + RING_PAD * 2 };
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 1200, elevation: 30 },
  ring: { position: 'absolute', borderWidth: 3, borderColor: colors.primary },
  hand: { position: 'absolute', left: 0, top: 0, width: HAND_SIZE, height: HAND_SIZE },
  handIcon: { textShadowColor: '#000', textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } },
  ripple: {
    position: 'absolute',
    left: HAND_SIZE * 0.3 - 22,
    top: HAND_SIZE * 0.1 - 22,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  noticeAnchor: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  notice: {
    maxWidth: 420,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  noticeText: { ...typography.body, color: colors.textPrimary, textAlign: 'center', ...textShadow },
});
