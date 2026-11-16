// Steps under one to-do (Q47), on Life > To-Do and Work's To-Do. One compact
// line under the to-do, the shape of Questions on an appointment; a tap
// opens the list, where a step is added by typing or speaking, ticked, moved
// up or down, changed or taken off. The opener says how many are still to
// do and nothing else: no percentage, no streak. Every rule and sentence is
// lib/todoExtras.ts.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { t } from '../lib/i18n';
import { explainNotYet } from '../lib/notYet';
import { cleanStepText, moveTodoStep, orderTodoSteps, stepsLabel, type TodoStep } from '../lib/todoExtras';
import { addTodoStep, deleteTodoStep, renameTodoStep, reorderTodoSteps, setTodoStepDone } from '../lib/todosDb';
import { AppTextInput } from './AppTextInput';
import { useConfirmSheet } from './ConfirmSheet';

export function TodoSteps({
  todoId,
  steps,
  tabColor,
  closed,
  onChanged,
  openerRef,
  addRef,
}: {
  todoId: string;
  steps: TodoStep[];
  tabColor: string;
  /** A closed to-do shows its steps but takes no new ones. */
  closed: boolean;
  onChanged: () => Promise<void> | void;
  /** A how-to's rings, from the screen's walkMark. */
  openerRef?: (node: unknown) => void;
  addRef?: (node: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, confirmElement] = useConfirmSheet();
  const ordered = orderTodoSteps(steps);

  if (closed && steps.length === 0) return null;

  const run = async (work: () => Promise<unknown>, failed: string) => {
    setMessage(null);
    try {
      await work();
      await onChanged();
    } catch (error) {
      console.error('[TodoSteps]', error);
      setMessage(t(failed));
    }
  };

  const handleAdd = async () => {
    if (!cleanStepText(draft)) {
      explainNotYet(t('Type or say the step first, then tap Add the step.'));
      return;
    }
    await run(() => addTodoStep(todoId, draft), 'The step was not saved. Try again.');
    setDraft('');
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!cleanStepText(editing.value)) {
      explainNotYet(t('A step needs some words. To take it off, tap the bin beside it.'));
      return;
    }
    await run(() => renameTodoStep(editing.id, editing.value), 'The step was not changed. Try again.');
    setEditing(null);
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const order = moveTodoStep(steps, id, direction);
    if (!order) return;
    await run(() => reorderTodoSteps(order), 'The step did not move. Try again.');
  };

  const handleRemove = async (step: TodoStep) => {
    const ok = await confirm({ title: t('Take this step off?'), confirmLabel: t('Take it off'), destructive: true });
    if (!ok) return;
    await run(() => deleteTodoStep(step.id), 'The step is still there. Try again.');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        ref={openerRef}
        style={styles.row}
        onPress={() => setOpen((value) => !value)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Ionicons name="list-outline" size={16} color={tabColor} />
        <Text style={[styles.label, { color: tabColor }]}>{stepsLabel(steps, t)}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={tabColor} />
      </TouchableOpacity>
      {open ? (
        <View style={styles.body}>
          {ordered.length === 0 ? <Text style={styles.caption}>{t('No steps yet. Break it into the pieces you would do one at a time.')}</Text> : null}
          {ordered.map((step, index) => {
            const editingThis = editing?.id === step.id;
            const ticked = Boolean(step.doneAt);
            return (
              <View key={step.id} style={styles.stepRow}>
                <View style={styles.stepTop}>
                  <TouchableOpacity
                    onPress={() => void run(() => setTodoStepDone(step.id, !ticked), 'The tick was not saved. Try again.')}
                    hitSlop={8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: ticked }}
                    accessibilityLabel={step.text}
                  >
                    <Ionicons name={ticked ? 'checkbox' : 'square-outline'} size={22} color={ticked ? colors.textMuted : tabColor} />
                  </TouchableOpacity>
                  {editingThis ? (
                    <AppTextInput
                      style={[styles.input, styles.grow]}
                      value={editing.value}
                      onChangeText={(value) => setEditing({ ...editing, value })}
                      onVoiceResult={(value) => setEditing({ ...editing, value })}
                      micColor={tabColor}
                    />
                  ) : (
                    <TouchableOpacity
                      style={styles.grow}
                      onPress={() => setEditing({ id: step.id, value: step.text })}
                      accessibilityRole="button"
                      accessibilityHint={t('Change the step')}
                    >
                      <Text style={[styles.stepText, ticked ? styles.tickedText : null]}>{step.text}</Text>
                    </TouchableOpacity>
                  )}
                  {!editingThis ? (
                    <View style={styles.rowIcons}>
                      <TouchableOpacity
                        onPress={() => void handleMove(step.id, 'up')}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={t('Move up')}
                        style={index === 0 ? styles.dim : undefined}
                      >
                        <Ionicons name="chevron-up" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => void handleMove(step.id, 'down')}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={t('Move down')}
                        style={index === ordered.length - 1 ? styles.dim : undefined}
                      >
                        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => void handleRemove(step)} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('Take this step off?')}>
                        <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
                {editingThis ? (
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.secondary} onPress={() => setEditing(null)} accessibilityRole="button">
                      <Text style={styles.secondaryText}>{t('Cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.primary} onPress={() => void handleSaveEdit()} accessibilityRole="button">
                      <Text style={styles.primaryText}>{t('Save')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}
          {!closed ? (
            <View ref={addRef} collapsable={false} style={styles.addBox}>
              <AppTextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                onVoiceResult={(value) => setDraft(value)}
                micColor={tabColor}
                placeholder={t('e.g. Find last year’s receipt')}
                onSubmitEditing={() => void handleAdd()}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.primary} onPress={() => void handleAdd()} accessibilityRole="button">
                <Text style={styles.primaryText}>{t('Add the step')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {message ? <Text style={[styles.caption, { color: colors.statusRedOnSurface }]}>{message}</Text> : null}
        </View>
      ) : null}
      {confirmElement}
    </View>
  );
}

const plain = { textShadowColor: 'transparent', textShadowRadius: 0 } as const;

const styles = StyleSheet.create({
  container: { marginLeft: 34 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  label: { ...typography.caption, ...plain },
  body: { gap: 8, marginTop: 8 },
  stepRow: { gap: 6, backgroundColor: colors.surfaceMuted, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  stepTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  grow: { flex: 1 },
  rowIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dim: { opacity: 0.35 },
  stepText: { ...typography.body, color: colors.textPrimary, ...plain },
  tickedText: { color: colors.textMuted },
  caption: { ...typography.caption, color: colors.textMuted, ...plain },
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
  addBox: { gap: 8, backgroundColor: colors.surfaceMuted, borderRadius: 10, padding: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primary: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  primaryText: { ...BUTTON_PRIMARY_TEXT },
  secondary: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  secondaryText: { ...BUTTON_SECONDARY_TEXT },
});
