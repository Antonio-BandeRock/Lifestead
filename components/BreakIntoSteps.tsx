// Break it into small steps (Q61), inside a to-do's Steps. A list to start
// from is picked, changed until it fits, and saved only by Add these steps.
// The lists and the matching are lib/stepPatterns.ts; all of it is on the
// phone.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { sortByLabel } from '../lib/choiceOrder';
import { t } from '../lib/i18n';
import { explainNotYet } from '../lib/notYet';
import type { Routine } from '../lib/routines';
import { getRoutines } from '../lib/routinesDb';
import { saveOrSay } from '../lib/saveProblem';
import { patternsFor, stepSources } from '../lib/stepPatterns';
import { cleanStepText, orderTodoSteps } from '../lib/todoExtras';
import { addTodoSteps, listStepsFor, listTodos } from '../lib/todosDb';
import { AppTextInput } from './AppTextInput';
import { PopoverSelect } from './PopoverSelect';

type Piece = { id: number; text: string };
type Earlier = { id: string; title: string; steps: string[] };

export function BreakIntoSteps({
  todoId,
  title,
  tabColor,
  onSaved,
  onClose,
}: {
  todoId: string;
  title: string;
  tabColor: string;
  onSaved: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [earlier, setEarlier] = useState<Earlier[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [changed, setChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const nextId = useRef(1);

  useEffect(() => {
    let current = true;
    void (async () => {
      try {
        const found = await getRoutines();
        const todos = await listTodos('everything');
        const steps = await listStepsFor(todos.map((todo) => todo.id));
        if (!current) return;
        setRoutines(found);
        setEarlier(
          todos.map((todo) => ({ id: todo.id, title: todo.title, steps: orderTodoSteps(steps.get(todo.id) ?? []).map((step) => step.text) })),
        );
      } catch (error) {
        // The kept lists are still there to start from.
        console.warn('[BreakIntoSteps] routines and earlier tasks could not be read', error);
      }
    })();
    return () => {
      current = false;
    };
  }, []);

  const sources = useMemo(() => sortByLabel(stepSources(routines, earlier, todoId, t)), [routines, earlier, todoId]);
  const matched = useMemo(() => patternsFor(title), [title]);

  const pieceOf = (text: string): Piece => ({ id: nextId.current++, text });

  /** A list picked after something was changed is added below it, so what
   *  was typed is never lost. */
  const pick = (id: string) => {
    const source = sources.find((item) => item.id === id);
    if (!source) return;
    const added = source.steps.map(pieceOf);
    setPieces((before) => (changed ? [...before.filter((piece) => piece.text.trim()), ...added] : added));
  };

  const save = async () => {
    if (!pieces.some((piece) => cleanStepText(piece.text))) {
      explainNotYet(t('Choose a list or type a step first, then tap Add these steps.'));
      return;
    }
    setSaving(true);
    await saveOrSay('The steps were not saved. Try again.', async () => {
      await addTodoSteps(todoId, pieces.map((piece) => piece.text));
      onClose();
      await onSaved();
    });
    setSaving(false);
  };

  return (
    <View style={styles.box}>
      <Text style={styles.caption}>Choose a list to start from, then change it until it fits. Nothing is saved until you tap Add these steps.</Text>
      {matched.length > 0 ? (
        <View style={styles.actions}>
          {matched.map((pattern) => (
            <TouchableOpacity key={pattern.id} style={styles.secondary} onPress={() => pick(`list:${pattern.id}`)} accessibilityRole="button">
              <Text style={styles.secondaryText}>{t(pattern.label)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <PopoverSelect
        options={sources.map((source) => ({ value: source.id, label: source.label }))}
        selected={null}
        onSelect={pick}
        tabColor={tabColor}
        placeholder={matched.length > 0 ? t('Choose another list') : t('Choose a list')}
        searchable
      />
      {pieces.map((piece) => (
        <View key={piece.id} style={styles.pieceRow}>
          <AppTextInput
            style={[styles.input, styles.grow]}
            value={piece.text}
            onChangeText={(text) => {
              setChanged(true);
              setPieces((before) => before.map((item) => (item.id === piece.id ? { ...item, text } : item)));
            }}
            micColor={tabColor}
          />
          <TouchableOpacity
            onPress={() => {
              setChanged(true);
              setPieces((before) => before.filter((item) => item.id !== piece.id));
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('Take it off')}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ))}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.secondary}
          onPress={() => {
            setChanged(true);
            setPieces((before) => [...before, pieceOf('')]);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Add another step</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={onClose} accessibilityRole="button">
          <Text style={styles.secondaryText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primary} onPress={() => void save()} disabled={saving} accessibilityRole="button">
          <Text style={styles.primaryText}>Add these steps</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const plain = { textShadowColor: 'transparent', textShadowRadius: 0 } as const;

const styles = StyleSheet.create({
  box: { gap: 8, backgroundColor: colors.surfaceMuted, borderRadius: 10, padding: 10 },
  caption: { ...typography.caption, color: colors.textMuted, ...plain },
  pieceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.textPrimary,
    ...plain,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primary: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  primaryText: { ...BUTTON_PRIMARY_TEXT },
  secondary: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  secondaryText: { ...BUTTON_SECONDARY_TEXT },
});
