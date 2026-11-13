// The ten ease-of-use questions, offered once after two weeks of use
// (2026-11-12, direct instruction: inside the tester app, answers by email).
//
// Only in the tester and developer versions, never the store one. In the
// tester version it waits until the device is through the tester door. It
// comes up a little after the app opens rather than at once, so it never lands
// on top of whatever the app shows first.
//
// Deliberately not a Modal, the GardenPlateOfferHost reasoning: a native
// Modal is a separate window and would cover AppKeyboard and the pickers.
// Every answer is a tap, so it needs neither.
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BUTTON_PRIMARY,
  BUTTON_PRIMARY_TEXT,
  BUTTON_SECONDARY,
  BUTTON_SECONDARY_TEXT,
  PILL_ON,
  PILL_ON_TEXT,
  PILL_SMALL,
  PILL_TEXT,
} from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { APP_VARIANT, isTesterBuild } from '../lib/appVariant';
import { t } from '../lib/i18n';
import { explainNotYet } from '../lib/notYet';
import { testerDoorOpen, useTesterAccess } from '../lib/testerAccess';
import { answersComplete, surveyDue, USABILITY_QUESTIONS, USABILITY_SCALE, type SurveyState } from '../lib/usabilitySurvey';
import {
  declineSurvey,
  loadSurveyState,
  noteSurveyFirstSeen,
  sendResultText,
  sendSurvey,
  snoozeSurvey,
} from '../lib/usabilitySurveyState';

/** How long after opening the app the questions may come up, ms. */
const SETTLE_MS = 20_000;

export function UsabilitySurveyHost() {
  if (!isTesterBuild() && APP_VARIANT !== 'dev') return null;
  return <UsabilitySurveyInner />;
}

function UsabilitySurveyInner() {
  const access = useTesterAccess();
  const doorOpen = isTesterBuild() ? testerDoorOpen(access) : true;
  const [state, setState] = useState<SurveyState | null>(null);
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(() => USABILITY_QUESTIONS.map(() => null));
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!doorOpen) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const now = Date.now();
        const loaded = await noteSurveyFirstSeen(await loadSurveyState(), now);
        if (cancelled) return;
        setState(loaded);
        if (surveyDue(loaded, now)) setOpen(true);
      })();
    }, SETTLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [doorOpen]);

  if (!open || !state) return null;

  const name = access.state.kind === 'ok' ? access.state.approval.name : access.name;
  const answeredCount = answers.filter((a) => a !== null).length;

  function choose(index: number, value: number) {
    setAnswers((current) => current.map((a, i) => (i === index ? value : a)));
  }

  async function notNow() {
    if (state) await snoozeSurvey(state, Date.now());
    setOpen(false);
  }

  async function dontAsk() {
    if (state) await declineSurvey(state);
    setOpen(false);
  }

  async function send() {
    if (!state || sending) return;
    if (!answersComplete(answers)) {
      explainNotYet(t('Tap one answer for each of the ten. {count} still need an answer.', { count: 10 - answeredCount }));
      return;
    }
    setSending(true);
    try {
      const result = await sendSurvey(state, answers, name, Date.now());
      setDone(sendResultText(result));
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.backdrop}>
      <Pressable accessibilityLabel="Not now" style={StyleSheet.absoluteFill} onPress={() => void notNow()} />
      <View style={styles.card}>
        <Text style={styles.title}>How easy is Lifestead to use?</Text>
        {done ? (
          <>
            <Text style={styles.message}>{done}</Text>
            <Text style={styles.message}>Thank you.</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.okButton} onPress={() => setOpen(false)} hitSlop={8}>
                <Text style={styles.okButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.intro}>
              Ten short statements. Tap how much you agree with each one, from 1 for strongly disagree to 5 for strongly agree. Your answers go to the
              developer by email, and nothing from your records goes with them.
            </Text>
            <ScrollView style={styles.questions} contentContainerStyle={styles.questionsContent}>
              {USABILITY_QUESTIONS.map((question, index) => (
                <View key={question} style={styles.question}>
                  <Text style={styles.questionText}>{`${index + 1}. ${t(question)}`}</Text>
                  <View style={styles.scaleRow}>
                    {USABILITY_SCALE.map((label, scaleIndex) => {
                      const value = scaleIndex + 1;
                      const on = answers[index] === value;
                      return (
                        <TouchableOpacity
                          key={label}
                          style={[styles.pill, on ? styles.pillOn : null]}
                          onPress={() => choose(index, value)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: on }}
                          accessibilityLabel={label}
                          hitSlop={4}
                        >
                          <Text style={on ? styles.pillOnText : styles.pillText}>{String(value)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={styles.ends}>
                    <Text style={styles.endText}>Strongly disagree</Text>
                    <Text style={styles.endText}>Strongly agree</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.okButton} onPress={() => void send()} disabled={sending} hitSlop={8}>
                <Text style={styles.okButtonText}>{sending ? 'Sending' : 'Send Answers'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => void notNow()} hitSlop={8}>
                <Text style={styles.cancelButtonText}>Not Now</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => void dontAsk()} hitSlop={8} style={styles.dontAsk}>
              <Text style={styles.dontAskText}>Don&apos;t ask me again</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: colors.menuSurface,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
  },
  title: { ...typography.bodyEmphasis, color: colors.textPrimary, fontSize: 18, marginBottom: 8, ...textShadow },
  intro: { ...typography.body, color: colors.textSecondary, marginBottom: 10, ...textShadow },
  message: { ...typography.body, color: colors.textSecondary, marginTop: 6, ...textShadow },
  questions: { flexGrow: 0, flexShrink: 1 },
  questionsContent: { gap: 14, paddingBottom: 4 },
  question: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surfaceMuted,
  },
  questionText: { ...typography.body, color: colors.textPrimary, marginBottom: 10, ...textShadow },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  pill: { ...PILL_SMALL, flex: 1 },
  pillOn: { ...PILL_ON },
  pillText: { ...PILL_TEXT },
  pillOnText: { ...PILL_ON_TEXT },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  endText: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  okButton: { ...BUTTON_PRIMARY },
  okButtonText: { ...BUTTON_PRIMARY_TEXT },
  cancelButton: { ...BUTTON_SECONDARY },
  cancelButtonText: { ...BUTTON_SECONDARY_TEXT },
  dontAsk: { marginTop: 12, alignSelf: 'flex-start' },
  dontAskText: { ...typography.caption, color: colors.textSecondary, textDecorationLine: 'underline', ...textShadow },
});
