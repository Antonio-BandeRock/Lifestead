// One card of a set of language basics being studied (2026-11-05). Tap to turn it
// over, then press one of three indicators: + shows it more often, = keeps it in the
// same rotation, - shows it less often. What a card holds is drawn through CourseText,
// so it stays as written whatever the app is in; the labels and buttons around it are
// ordinary Text and follow the app.
//
// The check in Type the Answer shows the form and never decides anything: the person
// presses the indicator, and the check is kept beside it.

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppTextInput } from './AppTextInput';
import { useWalkMark } from './WalkMark';
import { CourseText } from './CourseText';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { checkTypedForm, courseCardLayout, facesOf, hiddenFormIndex, type CourseDirection, type CourseLayout, type TypedCheck } from '../lib/learnCourseCard';
import type { CourseCard } from '../lib/learnCourseFile';
import type { LearnGrade } from '../lib/learnSchedule';
import { t } from '../lib/i18n';
import { explainNotYet } from '../lib/notYet';

const useNativeDriver = Platform.OS !== 'web';

const INDICATORS: { grade: LearnGrade; sign: string; word: string; label: string }[] = [
  { grade: 'notYet', sign: '+', word: 'More often', label: 'Show this card more often' },
  { grade: 'knewIt', sign: '=', word: 'Same', label: 'Keep this card in the same rotation' },
  { grade: 'easily', sign: '−', word: 'Less often', label: 'Show this card less often' },
];

type Props = {
  card: CourseCard;
  direction: CourseDirection;
  day: string;
  typeAnswer: boolean;
  showSource: boolean;
  canSpeak: boolean;
  onSpeak: (card: CourseCard) => void;
  onGrade: (grade: LearnGrade, matched: boolean | null) => void;
  /** Opens what this card's deck builds on. Offered only once the card is turned, so it never gives the answer away. */
  onInfo: () => void;
};

function FormList({ items, large }: { items: string[]; large?: boolean }) {
  return (
    <View style={styles.formList}>
      {items.map((item, index) => (
        <CourseText key={`${index}-${item}`} style={large ? styles.formLarge : styles.form}>
          {item}
        </CourseText>
      ))}
    </View>
  );
}

function OneSide({ value }: { value: string[] | string }) {
  return typeof value === 'string' ? <CourseText style={styles.main}>{value}</CourseText> : <FormList items={value} large />;
}

/** The table on the back of a verb: each form beside the matching one in the other language. */
function VerbTable({ layout, targetLeft }: { layout: Extract<CourseLayout, { kind: 'verb' }>; targetLeft: boolean }) {
  const forms = layout.nativeForms;
  if (!forms) {
    return (
      <View style={styles.formList}>
        {targetLeft ? <CourseText style={styles.main}>{layout.nativeText}</CourseText> : null}
        <CourseText style={styles.head}>{layout.targetHead}</CourseText>
        <FormList items={layout.targetForms} />
      </View>
    );
  }
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <CourseText style={[styles.head, styles.tableCell]}>{targetLeft ? layout.targetHead : layout.nativeHead}</CourseText>
        <CourseText style={[styles.head, styles.tableCell]}>{targetLeft ? layout.nativeHead : layout.targetHead}</CourseText>
      </View>
      {layout.targetForms.map((form, index) => (
        <View key={`${index}-${form}`} style={styles.tableRow}>
          <CourseText style={[styles.form, styles.tableCell]}>{targetLeft ? form : forms[index]}</CourseText>
          <CourseText style={[styles.form, styles.tableCell]}>{targetLeft ? forms[index] : form}</CourseText>
        </View>
      ))}
    </View>
  );
}

function Example({ text }: { text: string }) {
  return text ? <CourseText style={styles.example}>{text}</CourseText> : null;
}

export function CourseCardView({ card, direction, day, typeAnswer, showSource, canSpeak, onSpeak, onGrade, onInfo }: Props) {
  const walkMark = useWalkMark();
  const reducedMotion = useReducedMotion();
  const [turned, setTurned] = useState(false);
  const [typed, setTyped] = useState('');
  const [check, setCheck] = useState<TypedCheck | null>(null);
  const [squeeze] = useState(() => new Animated.Value(1));

  // A Rule card whose native side holds the rule carries its front in the learner's
  // language as meaning: that is drawn as the card's native side, and the rule goes
  // under the example on the back, smaller.
  const layout = useMemo(() => courseCardLayout(card.meaning ? { ...card, native: card.meaning } : card), [card]);
  const faces = facesOf(card, direction);
  const targetFirst = direction === 'targetFirst';
  const typing = typeAnswer && layout.kind === 'verb';
  const hiddenIndex = layout.kind === 'verb' ? hiddenFormIndex(card.id, day, layout.targetForms.length) : 0;
  const hiddenForm = layout.kind === 'verb' ? layout.targetForms[hiddenIndex] : '';
  const hiddenHint = layout.kind === 'verb' ? (layout.nativeForms?.[hiddenIndex] ?? '') : '';

  const graded = useRef(false);

  function grade(value: LearnGrade) {
    if (graded.current) return;
    graded.current = true;
    onGrade(value, check === null ? null : check !== 'different');
  }

  function turn(next: boolean) {
    if (reducedMotion) {
      setTurned(next);
      return;
    }
    Animated.timing(squeeze, { toValue: 0, duration: 90, useNativeDriver }).start(() => {
      setTurned(next);
      Animated.timing(squeeze, { toValue: 1, duration: 90, useNativeDriver }).start();
    });
  }

  function runCheck() {
    if (!typed.trim()) {
      explainNotYet(t('Type the missing form first, or press Show the Answer.'));
      return;
    }
    setCheck(checkTypedForm(typed, hiddenForm));
    turn(true);
  }

  // A front that asks for a form leaves that form out. A front showing the known
  // language gives only the hint, since the other target forms would be half the answer.
  function typingFront(): ReactNode {
    if (layout.kind !== 'verb') return null;
    return (
      <>
        <CourseText style={styles.head}>{layout.targetHead}</CourseText>
        {targetFirst ? (
          <View style={styles.formList}>
            {layout.targetForms.map((form, index) => (
              <CourseText key={`${index}-${form}`} style={styles.formLarge}>
                {index === hiddenIndex ? '_____' : form}
              </CourseText>
            ))}
          </View>
        ) : null}
        {hiddenHint ? <CourseText style={styles.example}>{hiddenHint}</CourseText> : null}
      </>
    );
  }

  function front(): ReactNode {
    if (typing) return typingFront();
    switch (layout.kind) {
      case 'verb':
        return targetFirst ? (
          <>
            <CourseText style={styles.head}>{layout.targetHead}</CourseText>
            <FormList items={layout.targetForms} large />
          </>
        ) : layout.nativeForms ? (
          <>
            <CourseText style={styles.head}>{layout.nativeHead}</CourseText>
            <FormList items={layout.nativeForms} large />
          </>
        ) : (
          <CourseText style={styles.main}>{layout.nativeText}</CourseText>
        );
      case 'pairs':
        return <FormList items={targetFirst ? layout.target : layout.native} large />;
      case 'list':
        return <OneSide value={targetFirst ? layout.target : layout.native} />;
      default:
        return <CourseText style={styles.main}>{targetFirst ? layout.target : layout.native}</CourseText>;
    }
  }

  function back(): ReactNode {
    switch (layout.kind) {
      case 'verb':
        return <VerbTable layout={layout} targetLeft={targetFirst} />;
      case 'pairs':
        return <FormList items={targetFirst ? layout.native : layout.target} large />;
      case 'list':
        return <OneSide value={targetFirst ? layout.native : layout.target} />;
      default:
        return <CourseText style={styles.main}>{targetFirst ? layout.native : layout.target}</CourseText>;
    }
  }

  // In reverse the target side is the answer, and on a typed card so is the voice's
  // first line, so the speaker waits for the turn in both.
  const speakerShows = canSpeak && (turned || (targetFirst && !typing));

  return (
    <View style={styles.wrap}>
      <Animated.View ref={walkMark.ref('languages.card')} style={[styles.card, walkMark('languages.card'), { transform: [{ scaleX: squeeze }] }]}>
        <Pressable
          style={styles.face}
          onPress={() => turn(!turned)}
          accessibilityRole="button"
          accessibilityLabel={turned ? t('Turn back to the front') : t('Turn over to the back')}
        >
          {turned ? back() : front()}
          {!turned && !typing ? <Example text={faces.frontExample} /> : null}
          {turned ? <Example text={faces.backExample} /> : null}
          {turned && card.meaning ? <CourseText style={styles.rule}>{card.native}</CourseText> : null}
          {turned && card.replyTarget ? (
            <View style={styles.remember}>
              <Text style={styles.small}>Then you could say</Text>
              <CourseText style={styles.example}>{card.replyTarget}</CourseText>
              {card.replyNative ? <CourseText style={styles.rememberText}>{card.replyNative}</CourseText> : null}
            </View>
          ) : null}
          {turned && check !== null ? (
            <Text style={styles.checkLine}>{check === 'match' ? t('That is it.') : check === 'accents' ? t('That is it, with the accents written this way:') : t('The form is:')}</Text>
          ) : null}
          {turned && check !== null && check !== 'match' ? <CourseText style={styles.main}>{hiddenForm}</CourseText> : null}
          {turned && card.remember ? (
            <View style={styles.remember}>
              <Text style={styles.small}>Remember</Text>
              <CourseText style={styles.rememberText}>{card.remember}</CourseText>
            </View>
          ) : null}
          {showSource && card.source ? <CourseText style={styles.small}>{card.source}</CourseText> : null}
        </Pressable>
      </Animated.View>

      {typing && !turned ? (
        <View style={styles.typeBox}>
          <AppTextInput
            style={styles.input}
            value={typed}
            onChangeText={setTyped}
            placeholder={t('Type the missing form')}
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            onSubmitEditing={runCheck}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.row}>
            <TouchableOpacity style={styles.primaryButton} onPress={runCheck} accessibilityRole="button">
              <Text style={styles.primaryText}>Check</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => turn(true)} accessibilityRole="button">
              <Text style={styles.secondaryText}>Show the Answer</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {speakerShows || turned ? (
        <View style={styles.row}>
          {speakerShows ? (
            <TouchableOpacity ref={walkMark.ref('languages.hear')} style={[styles.speaker, walkMark('languages.hear')]} onPress={() => onSpeak(card)} accessibilityRole="button">
              <Ionicons name="volume-medium-outline" size={18} color={colors.textPrimary} />
              <Text style={styles.secondaryText}>Hear It</Text>
            </TouchableOpacity>
          ) : null}
          {turned ? (
            <TouchableOpacity ref={walkMark.ref('languages.cardInfo')} style={[styles.speaker, walkMark('languages.cardInfo')]} onPress={onInfo} accessibilityRole="button">
              <Ionicons name="information-circle-outline" size={18} color={colors.textPrimary} />
              <Text style={styles.secondaryText}>How This Fits</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {turned ? (
        <View ref={walkMark.ref('languages.grade')} style={[styles.grades, walkMark('languages.grade')]}>
          {INDICATORS.map((indicator) => (
            <TouchableOpacity key={indicator.grade} style={styles.gradeButton} onPress={() => grade(indicator.grade)} accessibilityRole="button" accessibilityLabel={t(indicator.label)}>
              <Text style={styles.gradeSign}>{indicator.sign}</Text>
              <Text style={styles.gradeWord}>{t(indicator.word)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : !typing ? (
        <Text style={styles.caption}>Tap the card to turn it over.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  card: { backgroundColor: colors.surfaceMuted, borderRadius: 10, minHeight: 220 },
  face: { padding: 16, gap: 12, minHeight: 220, justifyContent: 'center' },
  main: { ...typography.screenTitle, color: colors.textPrimary, ...textShadow },
  head: { ...typography.label, color: colors.textMuted, ...textShadow },
  formList: { gap: 6 },
  form: { ...typography.body, color: colors.textPrimary, ...textShadow },
  formLarge: { ...typography.sectionTitle, color: colors.textPrimary, ...textShadow },
  example: { ...typography.body, fontStyle: 'italic', color: colors.textSecondary, ...textShadow },
  table: { gap: 8 },
  tableRow: { flexDirection: 'row', gap: 10 },
  tableCell: { flex: 1 },
  remember: { gap: 2 },
  rememberText: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  small: { ...typography.caption, color: colors.textMuted, ...textShadow },
  rule: { ...typography.body, color: colors.textSecondary, ...textShadow },
  checkLine: { ...typography.body, color: colors.textPrimary, ...textShadow },
  typeBox: { gap: 8 },
  input: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surfaceMuted, borderRadius: 10, padding: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grades: { flexDirection: 'row', gap: 8 },
  gradeButton: { ...BUTTON_SECONDARY_COMPACT, flex: 1, alignItems: 'center', gap: 2 },
  gradeSign: { ...BUTTON_SECONDARY_TEXT, ...typography.sectionTitle },
  gradeWord: { ...BUTTON_SECONDARY_TEXT, ...typography.caption, textAlign: 'center' },
  speaker: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 },
  primaryButton: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  primaryText: BUTTON_PRIMARY_TEXT,
  secondaryButton: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  secondaryText: BUTTON_SECONDARY_TEXT,
  caption: { ...typography.caption, color: colors.textMuted, ...textShadow },
});
