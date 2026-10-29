// Every sideways row in the app (2026-10-28). Reported on Windows: "The
// windows version can't assume the user will have a touch screen. All of
// the horizontal scrolls don't work." A phone swipes a row along with a
// finger; a computer with a mouse has no finger, so on the desktop (and any
// web build) the same row gains:
//
//   - an arrow at each end, shown only while there is more that way, which
//     moves the row along by most of what is on screen;
//   - dragging with the mouse, the way a finger would, without the release
//     at the end of a drag being taken as a tap on the card underneath;
//   - the scrollbar, so the row says it is a row.
//
// A trackpad's sideways swipe and Shift with the wheel already work in the
// browser and are left alone. The mouse wheel on its own still scrolls the
// page, since taking it over inside every row would trap the page under
// the pointer.
//
// On a phone this is exactly a horizontal ScrollView, nothing added. Use it
// in place of <ScrollView horizontal> everywhere;
// scripts/audit_horizontal_scroll.js keeps a bare one from coming back.
import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useCallback, useEffect, useRef, useState, type ForwardedRef } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';
import { colors } from '../constants/colors';
import { t } from '../lib/i18n';

export type HorizontalScrollProps = Omit<ScrollViewProps, 'horizontal'>;

// No touch to count on: the desktop app and any web build.
const MOUSE_ROW = Platform.OS === 'web';
// How far the pointer moves before a press becomes a drag.
const DRAG_START = 5;
// How much of what is on screen one press of an arrow moves the row.
const ARROW_STEP = 0.8;

export const HorizontalScroll = forwardRef<ScrollView, HorizontalScrollProps>(function HorizontalScroll(props, ref) {
  if (!MOUSE_ROW) return <ScrollView ref={ref} horizontal {...props} />;
  return <MouseRow {...props} forwardedRef={ref} />;
});

function setRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

type DomNode = HTMLElement & { scrollLeft: number };

function MouseRow({ forwardedRef, onLayout, onContentSizeChange, onScroll, showsHorizontalScrollIndicator, ...rest }: HorizontalScrollProps & { forwardedRef: ForwardedRef<ScrollView> }) {
  const inner = useRef<ScrollView | null>(null);
  const [viewWidth, setViewWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [x, setX] = useState(0);

  const attach = useCallback(
    (node: ScrollView | null) => {
      inner.current = node;
      setRef(forwardedRef, node);
    },
    [forwardedRef],
  );

  // Dragging with the mouse, on the scrolling element itself.
  useEffect(() => {
    const scroller = inner.current as unknown as { getScrollableNode?: () => DomNode } | null;
    const node = scroller?.getScrollableNode?.();
    if (!node || typeof window === 'undefined') return;
    let startX = 0;
    let startLeft = 0;
    let dragged = false;
    const swallowClick = (event: MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
    };
    const move = (event: PointerEvent) => {
      const dx = event.clientX - startX;
      if (!dragged && Math.abs(dx) < DRAG_START) return;
      dragged = true;
      event.preventDefault();
      node.scrollLeft = startLeft - dx;
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      node.style.cursor = '';
      if (dragged) {
        // The click that follows the release belongs to the drag.
        node.addEventListener('click', swallowClick, true);
        setTimeout(() => node.removeEventListener('click', swallowClick, true), 0);
      }
    };
    const down = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      if (node.scrollWidth <= node.clientWidth) return;
      startX = event.clientX;
      startLeft = node.scrollLeft;
      dragged = false;
      node.style.cursor = 'grabbing';
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };
    node.addEventListener('pointerdown', down);
    return () => {
      node.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  const handleLayout = (event: LayoutChangeEvent) => {
    setViewWidth(event.nativeEvent.layout.width);
    onLayout?.(event);
  };
  const handleContentSize = (width: number, height: number) => {
    setContentWidth(width);
    onContentSizeChange?.(width, height);
  };
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setX(event.nativeEvent.contentOffset.x);
    onScroll?.(event);
  };

  const room = Math.max(0, contentWidth - viewWidth);
  const canBack = x > 2;
  const canForward = room > 0 && x < room - 2;
  const step = (direction: -1 | 1) => {
    const next = Math.min(room, Math.max(0, x + direction * viewWidth * ARROW_STEP));
    inner.current?.scrollTo({ x: next, animated: true });
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        {...rest}
        ref={attach}
        horizontal
        showsHorizontalScrollIndicator={showsHorizontalScrollIndicator ?? true}
        scrollEventThrottle={rest.scrollEventThrottle ?? 16}
        onLayout={handleLayout}
        onContentSizeChange={handleContentSize}
        onScroll={handleScroll}
      />
      {canBack ? (
        <View style={[styles.arrowLane, styles.laneStart]} pointerEvents="box-none">
          <TouchableOpacity style={styles.arrow} onPress={() => step(-1)} accessibilityRole="button" accessibilityLabel={t('Back along the row')}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      ) : null}
      {canForward ? (
        <View style={[styles.arrowLane, styles.laneEnd]} pointerEvents="box-none">
          <TouchableOpacity style={styles.arrow} onPress={() => step(1)} accessibilityRole="button" accessibilityLabel={t('On along the row')}>
            <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  arrowLane: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
  laneStart: { left: 4 },
  laneEnd: { right: 4 },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
