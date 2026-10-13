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
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { getWalkMark, subscribeWalkMark, type WalkMark } from '../lib/storyWalk';
import {
  measureSpot,
  reportTap,
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
  const heightRef = useRef(height);
  heightRef.current = height;
  const markRef = useRef(mark);
  markRef.current = mark;

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
      const found = await measureSpot(mark, heightRef.current);
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
          let found = await measureSpot(name, heightRef.current);
          if (found.where !== 'here' && found.where !== 'missing' && found.node?.scrollIntoView) {
            found.node.scrollIntoView({ block: 'center', behavior: 'smooth' });
            await new Promise((resolve) => setTimeout(resolve, 600));
            found = await measureSpot(name, heightRef.current);
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

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0.45] });

  return (
    <View pointerEvents="none" style={styles.layer}>
      {rect ? (
        <Animated.View
          style={[
            styles.ring,
            {
              left: rect.x - RING_PAD,
              top: rect.y - RING_PAD,
              width: rect.width + RING_PAD * 2,
              height: rect.height + RING_PAD * 2,
              borderRadius: Math.min(rect.height, rect.width) / 2 + RING_PAD,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
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

function sameRect(a: SpotRect | null, b: SpotRect | null): boolean {
  if (!a || !b) return a === b;
  return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1;
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
