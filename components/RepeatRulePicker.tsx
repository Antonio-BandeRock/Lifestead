import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppTextInput } from './AppTextInput';
import { PILL, PILL_ON, PILL_ON_TEXT, PILL_SMALL, PILL_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { describeRepeat, validateRepeatRule, weekdayOf, type RepeatConfig } from '../lib/repeatRule';

// The one repeat picker, moved out of app/(tabs)/schedule.tsx on 2026-11-15
// so a Garden task can repeat the same way a Schedules item does (a
// component never imports a route). Recurrence is decided once, at
// creation time: editing an existing occurrence only ever touches that one
// row. Five patterns (A1 of the competitive build plan, 2026-09-26; the
// dates each lands on are worked out in lib/repeatRule.ts), then how it
// should eventually stop: never, after a fixed number of times, or on a
// specific date. startDate is the day the series is being set up for,
// which seeds the weekday chosen first and names the day of the month.
// color is the tab's colour, which every label and input text takes.
const REPEAT_PATTERNS: { type: RepeatConfig['type']; label: string }[] = [
  { type: 'none', label: 'Just once' },
  { type: 'daily', label: 'Every day' },
  { type: 'weekly', label: 'Days of the week' },
  { type: 'every_n_days', label: 'Every few days' },
  { type: 'monthly', label: 'Every month' },
];

const WEEKDAY_CHIPS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function todayDateString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function RepeatRulePicker({
  repeat,
  onChange,
  startDate,
  color,
}: {
  repeat: RepeatConfig;
  onChange: (repeat: RepeatConfig) => void;
  startDate?: string;
  color: string;
}) {
  const anchor = startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : todayDateString();
  const label = [styles.label, { color }];
  const input = [styles.input, { color }];

  function choosePattern(type: RepeatConfig['type']) {
    if (type === 'none') {
      onChange({ type: 'none' });
      return;
    }
    const kept = { endType: repeat.endType ?? 'indefinite', count: repeat.count, until: repeat.until } as const;
    if (type === 'weekly') {
      onChange({ type, ...kept, interval: 1, weekdays: repeat.weekdays?.length ? repeat.weekdays : [weekdayOf(anchor)] });
    } else if (type === 'every_n_days') {
      onChange({ type, ...kept, interval: repeat.type === 'every_n_days' ? repeat.interval : 2 });
    } else if (type === 'monthly') {
      onChange({ type, ...kept, interval: 1 });
    } else {
      onChange({ type, ...kept });
    }
  }

  function toggleWeekday(day: number) {
    const current = repeat.weekdays ?? [];
    const next = current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => a - b);
    onChange({ ...repeat, weekdays: next });
  }

  const intervalLabel =
    repeat.type === 'every_n_days' ? 'How many days apart' : repeat.type === 'weekly' ? 'How many weeks apart' : 'How many months apart';
  const summaryError = repeat.type === 'none' ? null : validateRepeatRule(repeat);

  return (
    <>
      <Text style={label}>Repeat</Text>
      <View style={styles.pillRow}>
        {REPEAT_PATTERNS.map((pattern) => (
          <TouchableOpacity
            key={pattern.type}
            style={[styles.pill, repeat.type === pattern.type && styles.pillActive]}
            onPress={() => choosePattern(pattern.type)}
          >
            <Text style={[styles.pillText, repeat.type === pattern.type && styles.pillTextActive]}>{pattern.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {repeat.type === 'weekly' ? (
        <View style={[styles.pillRow, { marginTop: 8 }]}>
          {WEEKDAY_CHIPS.map((name, day) => {
            const chosen = (repeat.weekdays ?? []).includes(day);
            return (
              <TouchableOpacity key={name} style={[styles.pillSmall, chosen && styles.pillActive]} onPress={() => toggleWeekday(day)}>
                <Text style={[styles.pillTextSmall, chosen && styles.pillTextActive]}>{name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {repeat.type === 'weekly' || repeat.type === 'every_n_days' || repeat.type === 'monthly' ? (
        <>
          <Text style={[label, { marginTop: 8 }]}>{intervalLabel}</Text>
          <AppTextInput
            style={[input, styles.timeInput]}
            placeholder={repeat.type === 'every_n_days' ? 'e.g. 3' : '1'}
            keyboardType="number-pad"
            value={repeat.interval ? String(repeat.interval) : ''}
            onChangeText={(text) => onChange({ ...repeat, interval: Number(text) || undefined })}
          />
        </>
      ) : null}

      {repeat.type !== 'none' ? (
        <>
          <View style={[styles.pillRow, { marginTop: 8 }]}>
            {(['indefinite', 'count', 'until_date'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.pillSmall, repeat.endType === option && styles.pillActive]}
                onPress={() => onChange({ ...repeat, endType: option })}
              >
                <Text style={[styles.pillTextSmall, repeat.endType === option && styles.pillTextActive]}>
                  {option === 'indefinite' ? 'Indefinitely' : option === 'count' ? 'A number of times' : 'Until a date'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {repeat.endType === 'count' ? (
            <AppTextInput
              style={[input, styles.timeInput, { marginTop: 8 }]}
              placeholder="e.g. 14"
              keyboardType="number-pad"
              value={repeat.count ? String(repeat.count) : ''}
              onChangeText={(text) => onChange({ ...repeat, count: Number(text) || undefined })}
            />
          ) : null}
          {repeat.endType === 'until_date' ? (
            <AppTextInput
              style={[input, { marginTop: 8 }]}
              placeholder="YYYY-MM-DD"
              value={repeat.until ?? ''}
              onChangeText={(text) => onChange({ ...repeat, until: text })}
            />
          ) : null}
          <Text style={[styles.helperText, { color }]}>
            {summaryError ?? `${describeRepeat(repeat, anchor)}.`}
            {repeat.type === 'monthly' && !summaryError ? ' A shorter month lands on its last day.' : ''}
            {' '}Generates entries about 60 days ahead at a time, topped up automatically as time passes. Editing or
            skipping one day never affects any other.
          </Text>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, marginBottom: 6, marginTop: 10, ...textShadow },
  helperText: { ...typography.caption, marginTop: 4, marginBottom: 8, ...textShadow },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { ...PILL },
  pillSmall: { ...PILL_SMALL },
  pillActive: { ...PILL_ON },
  pillText: { ...PILL_TEXT, textTransform: 'capitalize' },
  pillTextSmall: { ...PILL_TEXT },
  pillTextActive: { ...PILL_ON_TEXT },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceMuted,
    ...typography.body,
    ...textShadow,
  },
  timeInput: { width: 56, textAlign: 'center' },
});
