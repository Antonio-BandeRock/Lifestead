// Questions for one visit (K4), under each appointment on Schedules >
// Appointments. One compact line, the AttachedFiles shape; a tap opens the
// list, where a question is added by typing or speaking, moved up or down,
// ticked once asked and answered after the visit. Health notes from Capture
// come in with one tap each, and the visit's page prints or saves as a PDF.
// Every rule and sentence is lib/visitQuestions.ts.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { t } from '../lib/i18n';
import { explainNotYet } from '../lib/notYet';
import { exportHtmlAsPdf, printHtml } from '../lib/reportPdf';
import { buildVisitPageHtml, cleanQuestionText, questionsLabel, type NoteToOffer, type PageAppointment, type VisitQuestion } from '../lib/visitQuestions';
import {
  addVisitQuestion,
  listNotesToOffer,
  listVisitQuestions,
  loadVisitPageInputs,
  moveVisitQuestion,
  removeVisitQuestion,
  setVisitQuestionAnswer,
  setVisitQuestionAsked,
  updateVisitQuestionText,
} from '../lib/visitQuestionsDb';
import { AppTextInput } from './AppTextInput';
import { useConfirmSheet } from './ConfirmSheet';
import { NotesInput } from './NotesInput';

type Editing = { id: string; field: 'text' | 'answer'; value: string };

export function VisitQuestions({
  appointment,
  tabColor,
  openerRef,
  openerMarkStyle,
  addRef,
  pageRef,
}: {
  appointment: PageAppointment;
  tabColor: string;
  /** A how-to's rings, from the screen's walkMark. */
  openerRef?: (node: unknown) => void;
  openerMarkStyle?: StyleProp<ViewStyle>;
  addRef?: (node: unknown) => void;
  pageRef?: (node: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<VisitQuestion[]>([]);
  const [notes, setNotes] = useState<NoteToOffer[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, confirmElement] = useConfirmSheet();

  const load = useCallback(async () => {
    const [list, offered] = await Promise.all([listVisitQuestions(appointment.id), listNotesToOffer()]);
    setQuestions(list);
    setNotes(offered);
  }, [appointment.id]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const run = async (work: () => Promise<unknown>, failed: string) => {
    setMessage(null);
    try {
      await work();
      await load();
    } catch (error) {
      console.error('[VisitQuestions]', error);
      setMessage(t(failed));
    }
  };

  const handleAdd = async () => {
    if (!cleanQuestionText(draft)) {
      explainNotYet(t('Type or say the question first, then tap Add the question.'));
      return;
    }
    await run(() => addVisitQuestion(appointment.id, draft), 'The question was not saved. Try again.');
    setDraft('');
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (editing.field === 'text') {
      if (!cleanQuestionText(editing.value)) {
        explainNotYet(t('A question needs some words. To take it off the list, tap the bin beside it.'));
        return;
      }
      await run(() => updateVisitQuestionText(editing.id, editing.value), 'The question was not changed. Try again.');
    } else {
      await run(() => setVisitQuestionAnswer(editing.id, editing.value), 'The answer was not saved. Try again.');
    }
    setEditing(null);
  };

  const handleRemove = async (question: VisitQuestion) => {
    const ok = await confirm({
      title: t('Take this question off?'),
      message: question.answer ? t('Its answer goes with it.') : undefined,
      confirmLabel: t('Take it off'),
      destructive: true,
    });
    if (!ok) return;
    await run(() => removeVisitQuestion(question.id), 'The question is still there. Try again.');
  };

  const handlePage = async (how: 'print' | 'pdf') => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const html = buildVisitPageHtml(await loadVisitPageInputs(appointment), t);
      if (how === 'print') {
        const result = await printHtml(html);
        if (result.status === 'failed') setMessage(result.message);
      } else {
        const day = appointment.scheduledFor.slice(0, 10);
        const result = await exportHtmlAsPdf(html, `lifestead-visit-${day}`, t('Share the visit page'));
        if (result.status === 'failed') setMessage(result.message);
        else if (result.status === 'savedOnly') setMessage(t('This device has nothing to share the page with, so it was kept in the app.'));
      }
    } catch (error) {
      console.error('[VisitQuestions] page', error);
      setMessage(t('The page could not be put together. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const label = questionsLabel(questions, t);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        ref={openerRef}
        style={[styles.row, openerMarkStyle]}
        onPress={() => setOpen((value) => !value)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Ionicons name="help-circle-outline" size={16} color={tabColor} />
        <Text style={[styles.label, { color: tabColor }]}>{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={tabColor} />
      </TouchableOpacity>
      {open ? (
        <View style={styles.body}>
          {questions.length === 0 ? (
            <Text style={styles.caption}>{t('Nothing written for this visit yet. What do you want to ask?')}</Text>
          ) : null}
          {questions.map((question, index) => {
            const editingText = editing?.id === question.id && editing.field === 'text';
            const editingAnswer = editing?.id === question.id && editing.field === 'answer';
            return (
              <View key={question.id} style={styles.questionRow}>
                <View style={styles.questionTop}>
                  <TouchableOpacity
                    onPress={() => void run(() => setVisitQuestionAsked(question.id, !question.asked), 'The tick was not saved. Try again.')}
                    hitSlop={8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: question.asked }}
                    accessibilityLabel={t('Asked')}
                  >
                    <Ionicons name={question.asked ? 'checkbox' : 'square-outline'} size={22} color={tabColor} />
                  </TouchableOpacity>
                  {editingText ? (
                    <AppTextInput
                      style={[styles.input, styles.grow]}
                      value={editing.value}
                      onChangeText={(value) => setEditing({ ...editing, value })}
                      onVoiceResult={(value) => setEditing({ ...editing, value })}
                      micColor={tabColor}
                      multiline
                    />
                  ) : (
                    <TouchableOpacity
                      style={styles.grow}
                      onPress={() => setEditing({ id: question.id, field: 'text', value: question.text })}
                      accessibilityRole="button"
                      accessibilityHint={t('Change the question')}
                    >
                      <Text style={styles.questionText}>{question.text}</Text>
                    </TouchableOpacity>
                  )}
                  {!editingText ? (
                    <View style={styles.rowIcons}>
                      <TouchableOpacity
                        onPress={() => void run(() => moveVisitQuestion(appointment.id, question.id, 'up'), 'The question did not move. Try again.')}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={t('Move up')}
                        style={index === 0 ? styles.dim : undefined}
                      >
                        <Ionicons name="chevron-up" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => void run(() => moveVisitQuestion(appointment.id, question.id, 'down'), 'The question did not move. Try again.')}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={t('Move down')}
                        style={index === questions.length - 1 ? styles.dim : undefined}
                      >
                        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => void handleRemove(question)} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('Take this question off?')}>
                        <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
                {editingAnswer ? (
                  <NotesInput
                    style={styles.input}
                    value={editing.value}
                    onChangeText={(value) => setEditing({ ...editing, value })}
                    micColor={tabColor}
                    placeholder={t('What you were told')}
                    multiline
                  />
                ) : question.answer ? (
                  <TouchableOpacity onPress={() => setEditing({ id: question.id, field: 'answer', value: question.answer ?? '' })} accessibilityRole="button">
                    <Text style={styles.answerText}>{t('Answer: {answer}', { answer: question.answer })}</Text>
                  </TouchableOpacity>
                ) : !editingText ? (
                  <TouchableOpacity onPress={() => setEditing({ id: question.id, field: 'answer', value: '' })} accessibilityRole="button">
                    <Text style={[styles.link, { color: tabColor }]}>{t('Write the answer')}</Text>
                  </TouchableOpacity>
                ) : null}
                {editingText || editingAnswer ? (
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

          <View ref={addRef} collapsable={false} style={styles.addBox}>
            <AppTextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              onVoiceResult={(value) => setDraft(value)}
              micColor={tabColor}
              placeholder={t('e.g. Should my levels be checked again before the next visit?')}
              multiline
            />
            <TouchableOpacity style={styles.primary} onPress={() => void handleAdd()} accessibilityRole="button">
              <Text style={styles.primaryText}>{t('Add the question')}</Text>
            </TouchableOpacity>
          </View>

          {notes.length > 0 ? (
            <View style={styles.notesBox}>
              <TouchableOpacity onPress={() => setShowNotes((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: showNotes }}>
                <Text style={[styles.link, { color: tabColor }]}>
                  {t('From your health notes ({count})', { count: notes.length })}
                </Text>
              </TouchableOpacity>
              {showNotes
                ? notes.map((note) => (
                    <View key={note.id} style={styles.noteRow}>
                      <Text style={[styles.caption, styles.grow]}>{note.text}</Text>
                      <TouchableOpacity
                        style={styles.secondary}
                        onPress={() => void run(() => addVisitQuestion(appointment.id, note.text, note.id), 'The note was not brought in. Try again.')}
                        accessibilityRole="button"
                      >
                        <Text style={styles.secondaryText}>{t('Add')}</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                : null}
            </View>
          ) : null}

          {message ? <Text style={[styles.caption, { color: colors.statusRedOnSurface }]}>{message}</Text> : null}
          <View ref={pageRef} collapsable={false} style={styles.actions}>
            <TouchableOpacity style={styles.secondary} onPress={() => void handlePage('print')} disabled={busy} accessibilityRole="button">
              <Text style={styles.secondaryText}>{busy ? t('Putting the page together…') : t('Print the page')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => void handlePage('pdf')} disabled={busy} accessibilityRole="button">
              <Text style={styles.secondaryText}>{t('Save as PDF')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      {confirmElement}
    </View>
  );
}

const plain = { textShadowColor: 'transparent', textShadowRadius: 0 } as const;

const styles = StyleSheet.create({
  container: { marginTop: 4 },
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
  questionRow: { gap: 6, backgroundColor: colors.surfaceMuted, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  questionTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  grow: { flex: 1 },
  rowIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dim: { opacity: 0.35 },
  questionText: { ...typography.body, color: colors.textPrimary, ...plain },
  answerText: { ...typography.body, color: colors.textPrimary, marginLeft: 32, ...plain },
  link: { ...typography.caption, marginLeft: 32, ...plain },
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
  notesBox: { gap: 8, backgroundColor: colors.surfaceMuted, borderRadius: 10, padding: 10 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primary: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  primaryText: { ...BUTTON_PRIMARY_TEXT },
  secondary: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  secondaryText: { ...BUTTON_SECONDARY_TEXT },
});
