// "Yesterday was a bigger day. How are you this morning?" (Q20, 1.0.91.8),
// asked on Home's Morning Check-In card and in the daily check-in only when
// yesterday had an activity rated Hard or Very hard, or more steps or
// exercise minutes than the person's usual. The caption says which, so the
// question never arrives without its reason. Trends > Pacing reads the
// answers beside those days and never says one caused the other.

import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type TextStyle } from 'react-native';
import { PILL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';
import {
  biggerDayReasonWords,
  MORNING_AFTER_LEVELS,
  MORNING_AFTER_QUESTION,
  type BiggerDayReason,
  type MorningAfter,
} from '../lib/exertion';
import { tl } from '../lib/i18n';

export function MorningAfterQuestion({
  reasons,
  value,
  onChange,
  labelStyle,
  captionStyle,
  markRef,
}: {
  reasons: BiggerDayReason[];
  value: MorningAfter | null;
  onChange: (next: MorningAfter | null) => void;
  labelStyle: StyleProp<TextStyle>;
  captionStyle: StyleProp<TextStyle>;
  /** A how-to ring on the pill row, from walkMark.ref. */
  markRef?: (node: unknown) => void;
}) {
  if (reasons.length === 0) return null;
  return (
    <View style={styles.block}>
      <Text style={labelStyle}>{tl(MORNING_AFTER_QUESTION)}</Text>
      <Text style={captionStyle}>{tl(biggerDayReasonWords(reasons))}</Text>
      <View ref={markRef as never} collapsable={false} style={styles.row}>
        {MORNING_AFTER_LEVELS.map((level) => {
          const on = value === level.key;
          return (
            <TouchableOpacity
              key={level.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.pill, on && styles.pillOn]}
              onPress={() => onChange(on ? null : level.key)}
            >
              <Text style={[styles.pillText, on && styles.pillOnText]}>{level.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { ...PILL },
  pillOn: { ...PILL_ON },
  pillText: { ...PILL_TEXT },
  pillOnText: { ...PILL_ON_TEXT },
});
