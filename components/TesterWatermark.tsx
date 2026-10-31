// The tester's first name, faint and slanted across every screen of the
// tester version (tester plan T12, 2026-10-31). A screenshot or a screen
// recording passed around says whose copy it came from, which is the part of
// keeping a test copy private that the approval itself cannot do. It takes
// no touches, and it is not on any other version.
//
// The only text in the app drawn straight on the background with no surface
// of its own, on purpose: a surface would hide the screen it is marking. It
// has a written exemption in scripts/audit_bare_text_on_background.js. It
// ignores the phone's font size, since it is a mark and not reading text,
// and a larger size would only crowd the grid.
import { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '../constants/colors';
import { isTesterBuild } from '../lib/appVariant';
import { useTesterAccess } from '../lib/testerAccess';
import { firstName } from '../lib/testerApproval';

const ROW_GAP = 120;
const COLUMN_GAP = 170;

export function TesterWatermark() {
  if (!isTesterBuild()) return null;
  return <TesterWatermarkInner />;
}

function TesterWatermarkInner() {
  const access = useTesterAccess();
  const { width, height } = useWindowDimensions();
  const name = access.state.kind === 'ok' ? firstName(access.state.approval.name) : '';
  // Enough rows and columns to cover the screen once it is turned, since
  // the turned grid has to reach the corners.
  const cells = useMemo(() => {
    const reach = Math.hypot(width, height);
    const rows = Math.ceil(reach / ROW_GAP) + 1;
    const columns = Math.ceil(reach / COLUMN_GAP) + 1;
    const out: { key: string; top: number; left: number }[] = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < columns; c += 1) {
        out.push({ key: `${r}-${c}`, top: r * ROW_GAP, left: c * COLUMN_GAP + (r % 2) * (COLUMN_GAP / 2) });
      }
    }
    return { reach, out };
  }, [width, height]);
  if (!name) return null;
  return (
    <View pointerEvents="none" style={styles.layer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View
        style={[
          styles.grid,
          { width: cells.reach, height: cells.reach, top: (height - cells.reach) / 2, left: (width - cells.reach) / 2 },
        ]}
      >
        {cells.out.map((cell) => (
          <Text key={cell.key} style={[styles.mark, { top: cell.top, left: cell.left }]} allowFontScaling={false} numberOfLines={1}>
            {name}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', zIndex: 5000, elevation: 5000 },
  grid: { position: 'absolute', transform: [{ rotate: '-30deg' }] },
  mark: {
    position: 'absolute',
    fontSize: 22,
    color: colors.textPrimary,
    opacity: 0.07,
  },
});
