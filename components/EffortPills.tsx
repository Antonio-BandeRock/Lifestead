// "How hard did it feel?" as four pills, for every place an activity is
// logged (Q20, 1.0.91.8): Signals > Exercise, Home's quick log and the end
// of a workout. One tap picks a word, a second tap on it takes it back off,
// and leaving it unpicked is fine. The screen puts its own label above, in
// its tab's colour; this is only the row.

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PILL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';
import { EFFORT_LEVELS, type EffortLevel } from '../lib/exertion';

export function EffortPills({
  value,
  onChange,
  firstRef,
}: {
  value: EffortLevel | null;
  onChange: (next: EffortLevel | null) => void;
  /** A how-to ring on the first pill, from walkMark.ref. */
  firstRef?: (node: unknown) => void;
}) {
  return (
    <View style={styles.row}>
      {EFFORT_LEVELS.map((level, index) => {
        const on = value === level.key;
        return (
          <TouchableOpacity
            key={level.key}
            ref={index === 0 ? firstRef : undefined}
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
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { ...PILL },
  pillOn: { ...PILL_ON },
  pillText: { ...PILL_TEXT },
  pillOnText: { ...PILL_ON_TEXT },
});
