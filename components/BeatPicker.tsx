// The parts of life Your Story follows, 2026-09-24 (lib/yourStory.ts).
//
// A closed list of ten, and deliberately so: this is the one list in the
// app with no "add one of your own", because each part of life chosen here
// switches on a section of Your Story that somebody has to have written.
// An eleventh typed in would switch on nothing. Choosing never hides anything
// anywhere else in the app, and the note under the question says so.
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { ALL_BEATS, BEAT_CAPTIONS, BEAT_LABELS, BEATS_NOTE, BEATS_QUESTION, type BeatKey } from '../lib/yourStory';
import { addBeat, listBeats, removeBeat } from '../lib/yourStoryDb';
import { explainNotYet } from '../lib/notYet';
import { PARTS_CLEAR_ALL_LABEL, PARTS_NONE_YET, PARTS_SELECT_ALL_LABEL } from '../lib/setupSections';

type Props = {
  // Called after every change, so whatever shows Your Story can rebuild.
  onChanged?: (beats: BeatKey[]) => void;
  // A card that already carries the question in its heading can leave it off.
  showQuestion?: boolean;
  // Closes the chooser. Choosing one part of life never closes it, since
  // most people follow more than one.
  onDone?: () => void;
  // Setup (1.0.79.7): the button reads this instead of Done choosing, a
  // Select all row sits above the list, and pressing it with nothing
  // chosen says why rather than going on.
  doneLabel?: string;
  selectAll?: boolean;
};

export function BeatPicker({ onChanged, showQuestion = true, onDone, doneLabel, selectAll = false }: Props) {
  const [chosen, setChosen] = useState<BeatKey[] | null>(null);

  useEffect(() => {
    let live = true;
    void listBeats().then((beats) => {
      if (live) setChosen(beats);
    });
    return () => {
      live = false;
    };
  }, []);

  const toggle = useCallback(
    async (key: BeatKey) => {
      const current = chosen ?? [];
      const on = current.includes(key);
      if (on) await removeBeat(key);
      else await addBeat(key);
      const next = await listBeats();
      setChosen(next);
      onChanged?.(next);
    },
    [chosen, onChanged],
  );

  const everyOn = chosen != null && ALL_BEATS.every((key) => chosen.includes(key));
  const toggleAll = useCallback(async () => {
    const current = chosen ?? [];
    if (everyOn) {
      for (const key of current) await removeBeat(key);
    } else {
      for (const key of ALL_BEATS) if (!current.includes(key)) await addBeat(key);
    }
    const next = await listBeats();
    setChosen(next);
    onChanged?.(next);
  }, [chosen, everyOn, onChanged]);

  const pressDone = useCallback(() => {
    if (selectAll && (chosen ?? []).length === 0) {
      explainNotYet(PARTS_NONE_YET);
      return;
    }
    onDone?.();
  }, [chosen, onDone, selectAll]);

  return (
    <View style={styles.wrap}>
      {showQuestion ? <Text style={styles.question}>{BEATS_QUESTION}</Text> : null}
      {selectAll ? (
        <TouchableOpacity
          style={styles.selectAll}
          onPress={() => void toggleAll()}
          disabled={chosen == null}
          accessibilityRole="button"
        >
          <Text style={styles.selectAllText}>{everyOn ? PARTS_CLEAR_ALL_LABEL : PARTS_SELECT_ALL_LABEL}</Text>
        </TouchableOpacity>
      ) : null}
      <View style={styles.list}>
        {ALL_BEATS.map((key) => {
          const on = chosen?.includes(key) ?? false;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.row, on && styles.rowOn]}
              onPress={() => void toggle(key)}
              disabled={chosen == null}
              activeOpacity={0.75}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${BEAT_LABELS[key]}, ${BEAT_CAPTIONS[key]}`}
            >
              <Ionicons
                name={on ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={on ? colors.primary : colors.textMuted}
                style={textShadow}
              />
              <View style={styles.rowText}>
                <Text style={styles.label}>{BEAT_LABELS[key]}</Text>
                <Text style={styles.caption}>{BEAT_CAPTIONS[key]}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.note}>{BEATS_NOTE}</Text>
      {onDone ? (
        <TouchableOpacity style={styles.done} onPress={pressDone} accessibilityRole="button">
          <Text style={styles.doneText}>{doneLabel ?? 'Done choosing'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Always placed inside a Your Story item, which sits on colors.surface;
  // the same colour here keeps the question and note on a surface of their own.
  wrap: { gap: 10, backgroundColor: colors.surface },
  question: { ...typography.body, color: colors.textPrimary, ...textShadow },
  list: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  rowOn: { borderColor: colors.primary },
  rowText: { flex: 1, gap: 1 },
  label: { ...typography.body, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  note: { ...typography.caption, color: colors.textMuted, ...textShadow },
  done: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  doneText: BUTTON_PRIMARY_TEXT,
  selectAll: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  selectAllText: BUTTON_SECONDARY_TEXT,
});
