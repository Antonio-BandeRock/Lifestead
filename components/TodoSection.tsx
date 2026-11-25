// To-dos (C10, 2026-09-30): things to do, each with an optional day and an
// optional repeat. Life > To-Do shows every one, work and personal; Work's
// To-Do pill shows the work ones.
//
// A to-do is typed as a sentence and read through the same reader Capture
// uses (lib/planSentence.ts, C9), so "pay the water bill on the 20th" or
// "call mum every Sunday" arrives with its day and its repeat, and what was
// read is shown before anything is kept. Words with no day in them are a
// to-do with no day.
//
// What a to-do past its day looks like is the point of the design: it stays
// under From earlier, still open, where it can be done or let go, and no
// word on this screen calls it late, missed or failed. The grouping, every
// caption and every sentence said back are in lib/todos.ts, checked by
// scripts/test_todos.js.
//
// Q47: a to-do can hold steps (components/TodoSteps.tsx) and carry labels
// of the person's own. Label pills above the list filter it to one label,
// and a to-do added while a label is chosen carries that label. The rules
// are lib/todoExtras.ts, checked by scripts/test_todo_extras.js.

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import {
  TODO_AREA_LABELS,
  TODO_AREAS,
  describeTodoAnswered,
  describeTodoCaption,
  describeTodoWhen,
  groupTodos,
  letGoLabel,
  readTodoWhen,
  readTodoWords,
  type Todo,
  type TodoArea,
  type TodoDoingKind,
} from '../lib/todos';
import {
  addTodo,
  answerTodo,
  deleteTodo,
  listAllTodoLabels,
  listLabelsFor,
  listStepsFor,
  listTodos,
  reopenTodo,
  setTodoLabels,
  updateTodo,
} from '../lib/todosDb';
import { emptyLabelWords, labelWordsOf, labelsInUse, readLabelWords, sortedLabels, todoHasLabel, type TodoStep } from '../lib/todoExtras';
import { t } from '../lib/i18n';
import { TodoSteps } from './TodoSteps';
import { syncReminderNotifications } from '../lib/reminderNotifications';
import { describeRepeat } from '../lib/repeatRule';
import { formatTime12 } from '../lib/timeOfDay';
import { AppActionSheet, type AppActionSheetAction } from './AppActionSheet';
import { useWalkMark } from './WalkMark';
import { AppTextInput } from './AppTextInput';
import { ThumbRow } from './ThumbRow';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, PILL, PILL_ON, PILL_ON_TEXT, PILL_SMALL, PILL_TEXT } from '../constants/buttons';
import { ReadProblem } from './ReadProblem';
import { saveOrSay } from '../lib/saveProblem';


function todayLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export type TodoScope = TodoArea | 'everything';

type Props = {
  tabColor: string;
  /** 'everything' on Life, 'work' inside Work. */
  scope: TodoScope;
};

type Editing = {
  id: string;
  title: string;
  notes: string;
  area: TodoArea;
  when: string;
  labels: string;
};

/** The When field's starting words for a to-do being changed. */
function whenWordsOf(todo: Todo, today: string): string {
  if (!todo.dueOn) return '';
  const at = todo.dueTime ? ` at ${formatTime12(todo.dueTime).toLowerCase().replace(' ', '')}` : '';
  const day = todo.dueOn === today ? 'today' : todo.dueOn;
  if (!todo.repeat) return `${day}${at}`;
  return `${describeRepeat(todo.repeat, todo.anchorOn ?? todo.dueOn).toLowerCase()} from ${todo.dueOn}${at}`;
}

export function TodoSection({ tabColor, scope }: Props) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [words, setWords] = useState('');
  const [area, setArea] = useState<TodoArea>(scope === 'work' ? 'work' : 'personal');
  const [ignoreDay, setIgnoreDay] = useState(false);
  const [saidBack, setSaidBack] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message?: string; actions: AppActionSheetAction[] } | null>(null);

  const [readFailed, setReadFailed] = useState(false);
  const [stepsByTodo, setStepsByTodo] = useState<Map<string, TodoStep[]>>(new Map());
  const [labelsByTodo, setLabelsByTodo] = useState<Map<string, string[]>>(new Map());
  const [allLabels, setAllLabels] = useState<string[]>([]);
  const [chosenLabel, setChosenLabel] = useState<string | null>(null);

  const load = useCallback(async () => {
    setReadFailed(false);
    try {
      const list = await listTodos(scope);
      const ids = list.map((todo) => todo.id);
      const [steps, labels, everyLabel] = await Promise.all([listStepsFor(ids), listLabelsFor(ids), listAllTodoLabels()]);
      setTodos(list);
      setStepsByTodo(steps);
      setLabelsByTodo(labels);
      setAllLabels(everyLabel);
    } catch (error) {
      console.warn('[TodoSection] could not read', error);
      setReadFailed(true);
    }
  }, [scope]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const today = todayLocal();
  const reading = useMemo(() => (words.trim() ? readTodoWords(words, new Date()) : null), [words]);
  const labelChoices = labelsInUse(labelsByTodo);
  // A chosen label that no longer appears on any to-do lets the filter go.
  const activeLabel = chosenLabel && labelChoices.some((label) => label.toLocaleLowerCase() === chosenLabel.toLocaleLowerCase()) ? chosenLabel : null;
  const shown = todos.filter((todo) => todoHasLabel(labelsByTodo.get(todo.id), activeLabel));
  const groups = groupTodos(shown, today);
  const openCount = todos.filter((todo) => !todo.doneAt).length;
  // The first open to-do carries the tutorial rings for the row buttons
  // (lib/toolHowTos.ts).
  const walkMark = useWalkMark();
  const firstOpenId = groups.find((group) => group.key !== 'closed')?.todos[0]?.id;

  async function afterChange(message: string | null) {
    setSaidBack(message);
    await load();
    void syncReminderNotifications();
  }

  async function handleAdd() {
    if (!reading || !reading.title) return;
    const dueOn = ignoreDay ? null : reading.dueOn;
    const dueTime = ignoreDay ? null : reading.dueTime;
    const repeat = ignoreDay ? null : reading.repeat;
    const added = await saveOrSay('The task was not added. Try again.', async () => {
      const id = await addTodo({ title: reading.title, area: scope === 'work' ? 'work' : area, dueOn, dueTime, repeat });
      if (activeLabel) await setTodoLabels(id, [activeLabel]);
      return true;
    });
    if (!added) return;
    setWords('');
    setIgnoreDay(false);
    await afterChange(`Added: ${reading.title}, ${describeTodoWhen(dueOn, repeat, today, dueTime).toLowerCase()}.`);
  }

  async function handleAnswer(todo: Todo, kind: TodoDoingKind) {
    const result = await saveOrSay('That was not recorded. Try again.', () => answerTodo(todo.id, kind, today));
    if (!result) return;
    await afterChange(describeTodoAnswered(todo.title, result.plan, kind, today));
  }

  async function handleReopen(todo: Todo) {
    const reopened = await saveOrSay('The task was not opened again. Try again.', async () => { await reopenTodo(todo.id); return true; });
    if (!reopened) return;
    await afterChange(`${todo.title}: open again.`);
  }

  function askRemove(todo: Todo) {
    setConfirm({
      title: `Remove ${todo.title}?`,
      message: 'It comes off the list, with its steps, its labels and the record of each time it was done. To keep the record, mark it done or let it go instead.',
      actions: [
        {
          label: 'Remove',
          destructive: true,
          onPress: async () => {
            setConfirm(null);
            if (editing?.id === todo.id) setEditing(null);
            const removed = await saveOrSay('The task was not removed. Try again.', async () => { await deleteTodo(todo.id); return true; });
            if (!removed) return;
            await afterChange(`${todo.title}: removed.`);
          },
        },
        { label: 'Keep it', onPress: () => setConfirm(null) },
      ],
    });
  }

  function startEdit(todo: Todo) {
    setEditError(null);
    setEditing({ id: todo.id, title: todo.title, notes: todo.notes ?? '', area: todo.area, when: whenWordsOf(todo, today), labels: labelWordsOf(labelsByTodo.get(todo.id) ?? []) });
  }

  async function saveEdit() {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) {
      setEditError('Say what the task is.');
      return;
    }
    const when = readTodoWhen(editing.when, new Date());
    if (!when) {
      setEditError('The day could not be read. Try "tomorrow", "tomorrow at 3pm", "15 October" or "every Monday", or leave it empty for no day.');
      return;
    }
    const changed = await saveOrSay('The task was not changed. Try again.', async () => {
      await updateTodo(editing.id, { title, notes: editing.notes, area: editing.area, dueOn: when.dueOn, dueTime: when.dueTime, repeat: when.repeat });
      await setTodoLabels(editing.id, readLabelWords(editing.labels, allLabels));
      return true;
    });
    if (!changed) return;
    setEditing(null);
    await afterChange(`${title}: changed, ${describeTodoWhen(when.dueOn, when.repeat, today, when.dueTime).toLowerCase()}.`);
  }

  function renderAreaPills(selected: TodoArea, onSelect: (value: TodoArea) => void) {
    return (
      <View style={styles.pillRow}>
        {TODO_AREAS.map((value) => {
          const on = selected === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.pill, on && styles.pillActive]}
              onPress={() => onSelect(value)}
            >
              <Text style={[styles.pillText, on ? styles.pillTextOn : null]}>{TODO_AREA_LABELS[value]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function renderEditForm() {
    if (!editing) return null;
    const when = readTodoWhen(editing.when, new Date());
    return (
      <View style={[styles.nestedForm, { borderLeftColor: tabColor }]}>
        <AppTextInput
          style={styles.textInput}
          value={editing.title}
          onChangeText={(title) => setEditing({ ...editing, title })}
          placeholder="What to do"
        />
        <AppTextInput
          style={styles.textInput}
          value={editing.when}
          onChangeText={(value) => setEditing({ ...editing, when: value })}
          placeholder="When: tomorrow at 3pm, 15 October, every Monday, or empty"
        />
        <Text style={styles.captionText}>{when ? describeTodoWhen(when.dueOn, when.repeat, today, when.dueTime) : 'Not read yet'}</Text>
        <AppTextInput
          style={styles.textInput}
          value={editing.notes}
          onChangeText={(notes) => setEditing({ ...editing, notes })}
          placeholder="Notes (optional)"
          multiline
        />
        <AppTextInput
          style={styles.textInput}
          value={editing.labels}
          onChangeText={(labels) => setEditing({ ...editing, labels })}
          placeholder={t('Labels, with commas between: house, car')}
        />
        {scope === 'everything' ? renderAreaPills(editing.area, (value) => setEditing({ ...editing, area: value })) : null}
        {editError ? <Text style={styles.errorText}>{editError}</Text> : null}
        <ThumbRow primary="first" style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={saveEdit}>
            <Text style={styles.primaryButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditing(null)}>
            <Text style={styles.linkText}>Cancel</Text>
          </TouchableOpacity>
        </ThumbRow>
      </View>
    );
  }

  function renderRow(todo: Todo) {
    const closed = Boolean(todo.doneAt);
    const caption = describeTodoCaption(todo, today);
    const where = scope === 'everything' && todo.area === 'work' ? 'Work' : null;
    const labels = sortedLabels(labelsByTodo.get(todo.id) ?? []);
    return (
      <View key={todo.id} style={styles.todoBlock}>
        <View style={styles.itemRow}>
          <TouchableOpacity
            ref={todo.id === firstOpenId ? walkMark.ref('todo.done') : undefined}
            onPress={() => (closed ? handleReopen(todo) : handleAnswer(todo, 'done'))}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: closed }}
            accessibilityLabel={closed ? `${todo.title}, done. Open it again` : `Mark ${todo.title} done`}
            hitSlop={8}
          >
            <Ionicons name={closed ? 'checkbox' : 'square-outline'} size={24} color={closed ? colors.textMuted : tabColor} />
          </TouchableOpacity>
          <View style={styles.itemText}>
            <Text style={[styles.bodyText, closed ? styles.doneText : null]}>{todo.title}</Text>
            {caption || where ? <Text style={styles.captionText}>{[where, caption].filter(Boolean).join(' · ')}</Text> : null}
            {todo.notes && !closed ? <Text style={styles.captionText} numberOfLines={2}>{todo.notes}</Text> : null}
            {labels.length > 0 ? (
              <View style={styles.pillRow}>
                {labels.map((label) => (
                  <TouchableOpacity
                    key={label}
                    style={styles.labelChip}
                    onPress={() => setChosenLabel(label)}
                    accessibilityRole="button"
                    accessibilityHint={t('Show only the tasks with this label')}
                  >
                    <Text style={styles.pillText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        </View>
        <TodoSteps
          todoId={todo.id}
          title={todo.title}
          steps={stepsByTodo.get(todo.id) ?? []}
          tabColor={tabColor}
          closed={closed}
          onChanged={load}
          openerRef={todo.id === firstOpenId ? walkMark.ref('todo.steps') : undefined}
        />
        {editing?.id === todo.id ? (
          renderEditForm()
        ) : (
          <View style={styles.linkRow}>
            {closed ? null : (
              <>
                <TouchableOpacity ref={todo.id === firstOpenId ? walkMark.ref('todo.change') : undefined} onPress={() => startEdit(todo)}>
                  <Text style={styles.linkText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity ref={todo.id === firstOpenId ? walkMark.ref('todo.letGo') : undefined} onPress={() => handleAnswer(todo, 'let_go')}>
                  <Text style={styles.linkText}>{letGoLabel(todo)}</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity ref={todo.id === firstOpenId ? walkMark.ref('todo.remove') : undefined} onPress={() => askRemove(todo)}>
              <Text style={[styles.linkText, { color: colors.danger }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  if (readFailed) return <ReadProblem message="Your to do list could not be read just now. Nothing you recorded is lost." onTryAgain={() => void load()} />;

  return (
    <View style={styles.section}>
      <AppTextInput
        style={styles.textInput}
        value={words}
        onChangeText={(value) => {
          setWords(value);
          setIgnoreDay(false);
        }}
        placeholder={scope === 'work' ? 'Send the report on Friday' : 'Pay the water bill on the 20th'}
        onSubmitEditing={handleAdd}
        returnKeyType="done"
      />
      {reading ? (
        <View style={styles.previewBlock}>
          <Text style={styles.bodyText}>{reading.title}</Text>
          <Text style={styles.captionText}>
            {ignoreDay ? 'No day' : describeTodoWhen(reading.dueOn, reading.repeat, today, reading.dueTime)}
          </Text>
          {!ignoreDay ? reading.notes.map((line) => (
            <Text key={line} style={styles.captionText}>{line}</Text>
          )) : null}
          {reading.dueOn ? (
            <TouchableOpacity onPress={() => setIgnoreDay(!ignoreDay)}>
              <Text style={styles.linkText}>{ignoreDay ? 'Use the day it read' : 'Keep it without a day'}</Text>
            </TouchableOpacity>
          ) : null}
          {scope === 'everything' ? renderAreaPills(area, setArea) : null}
          <TouchableOpacity ref={walkMark.ref('todo.add')} style={styles.primaryButton} onPress={handleAdd}>
            <Text style={styles.primaryButtonText}>Add to the List</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {saidBack ? <Text style={styles.captionText}>{saidBack}</Text> : null}

      {labelChoices.length > 0 ? (
        <View ref={walkMark.ref('todo.labels')} collapsable={false} style={styles.pillRow}>
          <TouchableOpacity
            style={[styles.pill, activeLabel === null && styles.pillActive]}
            onPress={() => setChosenLabel(null)}
            accessibilityRole="button"
            accessibilityState={{ selected: activeLabel === null }}
          >
            <Text style={[styles.pillText, activeLabel === null ? styles.pillTextOn : null]}>{t('Every label')}</Text>
          </TouchableOpacity>
          {labelChoices.map((label) => {
            const on = activeLabel !== null && activeLabel.toLocaleLowerCase() === label.toLocaleLowerCase();
            return (
              <TouchableOpacity
                key={label}
                style={[styles.pill, on && styles.pillActive]}
                onPress={() => setChosenLabel(on ? null : label)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.pillText, on ? styles.pillTextOn : null]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
      {activeLabel ? (
        <Text style={styles.captionText}>
          {shown.length === 0 ? emptyLabelWords(activeLabel, t) : t('Showing the tasks labelled {label}. A task added now carries it too.', { label: activeLabel })}
        </Text>
      ) : null}

      {todos.length === 0 ? (
        <Text style={styles.captionText}>
          {scope === 'work'
            ? 'Nothing on the work list. Type a task as you would say it, with a day or a repeat if it has one.'
            : 'Nothing on the list. Type a task as you would say it: "renew the car insurance on 12 November", "water the ferns every 3 days", or just "buy stamps". A task with a day reminds you on that day, and one left open stays here until it is done or let go.'}
        </Text>
      ) : openCount === 0 ? (
        <Text style={styles.captionText}>Everything on the list is done.</Text>
      ) : null}

      {groups.map((group) => {
        if (group.key === 'closed') {
          return (
            <View key={group.key} style={styles.group}>
              <TouchableOpacity ref={walkMark.ref('todo.showDone')} onPress={() => setShowClosed(!showClosed)} style={styles.groupToggle}>
                <Ionicons name={showClosed ? 'chevron-down' : 'chevron-forward'} size={16} color={tabColor} />
                <Text style={styles.groupHeading}>{`${group.label} (${group.todos.length})`}</Text>
              </TouchableOpacity>
              {showClosed ? group.todos.map(renderRow) : null}
            </View>
          );
        }
        return (
          <View key={group.key} style={styles.group}>
            <Text style={styles.groupHeading}>{group.label}</Text>
            {group.todos.map(renderRow)}
          </View>
        );
      })}

      <AppActionSheet
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        message={confirm?.message}
        actions={confirm?.actions ?? []}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  group: { gap: 8 },
  groupToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupHeading: { ...typography.label, color: colors.textPrimary, ...textShadow },
  previewBlock: { gap: 4 },
  todoBlock: { gap: 4 },
  bodyText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  captionText: { ...typography.caption, color: colors.textMuted, ...textShadow },
  doneText: { color: colors.textMuted },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemText: { flex: 1, gap: 2 },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingLeft: 34 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { ...PILL },
  labelChip: { ...PILL_SMALL, alignSelf: 'flex-start' },
  pillText: { ...PILL_TEXT },
  pillTextOn: { ...PILL_ON_TEXT },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
  },
  nestedForm: { gap: 8, paddingLeft: 10, borderLeftWidth: 2, marginVertical: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  primaryButton: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
  errorText: { color: colors.danger },
  linkText: { ...typography.body, color: colors.primary, ...textShadow },
  pillActive: { ...PILL_ON },
});
