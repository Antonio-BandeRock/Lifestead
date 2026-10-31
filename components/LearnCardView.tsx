// Interests > Learn, one card on screen (2026-10-30, Learn part 6b). Draws
// each kind of question in lib/learnKinds.ts: a flip, a pick from options
// (choice, estimate, a case with its story), a gap to fill, items to put in
// order, tiles to pair, and an explanation in the person's words.
//
// Every kind ends on the same answer side: the back of the card, its source
// when it rests on a study, and the four buttons saying how it went. A check
// says what the answer is and, for a pick that is not it, why not; it never
// decides the grade, since the person knows whether a right pick was a guess.
// The sentences describePick and describeBlank in lib/learnKinds.ts give
// are put together here from pieces, so each piece is translated.
// A card drawn from the reading (entryId) also offers Read the Entry, which
// opens that entry where it lives, so its citations stay one tap away.
// A card a person made can carry a photo, shown above the question.
// The parent gives this a key per card, so every card starts fresh.

import { useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import {
  BUTTON_PRIMARY_COMPACT,
  BUTTON_PRIMARY_TEXT,
  BUTTON_SECONDARY_COMPACT,
  BUTTON_SECONDARY_TEXT,
  PILL,
  PILL_ON,
  PILL_ON_TEXT,
  PILL_TEXT,
} from '../constants/buttons';
import type { LearnCard } from '../lib/learnDecks';
import { findDigestEntryById } from '../lib/digest';
import { routeForDigestEntry } from '../lib/digestNavigation';
import {
  KIND_PROMPTS,
  PAIRS_ALL_MATCHED,
  PAIRS_NOT_A_PAIR,
  checkBlank,
  describeOrder,
  isPair,
  kindOf,
  orderIsRight,
  shuffledIndexes,
} from '../lib/learnKinds';
import { MY_DECK_PREFIX } from '../lib/learnMyDecks';
import { LEARN_GRADES, LEARN_GRADE_LABELS, type LearnGrade } from '../lib/learnSchedule';
import { explainNotYet } from '../lib/notYet';
import { t, tl } from '../lib/i18n';
import { AppTextInput } from './AppTextInput';
import { LearnCardPhoto } from './LearnCardPhoto';
import { useWalkMark } from './WalkMark';

type Props = {
  card: LearnCard;
  /** The local day, so tiles are shuffled the same way all day. */
  day: string;
  /** matched: whether the card's check agreed with the answer, null where there was none. */
  onGrade: (grade: LearnGrade, matched: boolean | null) => void;
};

export function LearnCardView({ card, day, onGrade }: Props) {
  const walkMark = useWalkMark();
  const router = useRouter();
  const entry = card.entryId ? findDigestEntryById(card.entryId) : undefined;
  const kind = kindOf(card);
  const seed = `${card.id}:${day}`;
  const [turned, setTurned] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [blankChecked, setBlankChecked] = useState<boolean | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [leftOn, setLeftOn] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [pairLine, setPairLine] = useState<string | null>(null);
  const [pairMisses, setPairMisses] = useState(0);

  const options = card.options ?? [];
  const items = card.items ?? [];
  const pairs = card.pairs ?? [];
  const answerOption = card.answer !== undefined ? options[card.answer] : undefined;

  function turnButton(label: string, onPress: () => void) {
    return (
      <TouchableOpacity
        ref={walkMark.ref('learn.turn')}
        style={[styles.primaryButton, walkMark('learn.turn')]}
        onPress={onPress}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>{label}</Text>
      </TouchableOpacity>
    );
  }

  function checkTyped() {
    if (!typed.trim()) {
      explainNotYet('Type what goes in the gap first, or tap Show the Answer.');
      return;
    }
    const accept = card.accept ?? [];
    setBlankChecked(checkBlank([...accept, ...accept.map((answer) => tl(answer))], typed));
    setTurned(true);
  }

  function pickRight(right: string) {
    if (!leftOn) {
      explainNotYet('Tap a tile on the left first, then the one it goes with.');
      return;
    }
    if (isPair(pairs, leftOn, right)) {
      const next = [...matched, leftOn];
      setMatched(next);
      setPairLine(null);
      if (next.length === pairs.length) setTurned(true);
    } else {
      setPairLine(PAIRS_NOT_A_PAIR);
      setPairMisses((n) => n + 1);
    }
    setLeftOn(null);
  }

  function pickOrderItem(item: string) {
    const next = [...chosen, item];
    setChosen(next);
    if (next.length === items.length) setTurned(true);
  }

  // Whether the card's check agreed with the answer, for How It Has Gone.
  // Null for a card with no check, or one whose answer was shown instead.
  function checkMatched(): boolean | null {
    if (kind === 'choice' || kind === 'estimate' || kind === 'case') return picked === null ? null : picked === card.answer;
    if (kind === 'blank') return blankChecked;
    if (kind === 'order') return chosen.length === items.length ? orderIsRight(items, chosen) : null;
    if (kind === 'pairs') return matched.length === pairs.length ? pairMisses === 0 : null;
    return null;
  }

  const showAnswerLink = (
    <TouchableOpacity onPress={() => setTurned(true)} accessibilityRole="button">
      <Text style={styles.linkText}>Show the Answer</Text>
    </TouchableOpacity>
  );

  let question: React.ReactNode = null;
  let afterTurn: React.ReactNode = null;

  if (kind === 'choice' || kind === 'estimate' || kind === 'case') {
    if (picked === null) {
      question = (
        <View style={styles.optionColumn}>
          {options.map((option, i) => (
            <TouchableOpacity
              key={option.text}
              ref={i === 0 ? walkMark.ref('learn.turn') : undefined}
              style={[styles.optionButton, i === 0 ? walkMark('learn.turn') : null]}
              onPress={() => {
                setPicked(i);
                setTurned(true);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.optionButtonText}>{option.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    } else {
      const pick = options[picked];
      const isAnswer = picked === card.answer;
      afterTurn = (
        <>
          <Text style={styles.captionText}>Your pick</Text>
          <Text style={styles.bodyText}>{pick.text}</Text>
          <Text style={styles.bodyText}>
            {isAnswer ? 'That is it.' : 'Not this one.'} {pick.why}
          </Text>
          {!isAnswer && answerOption ? (
            <>
              <Text style={styles.captionText}>The answer</Text>
              <Text style={styles.bodyText}>{answerOption.text}</Text>
              <Text style={styles.bodyText}>{answerOption.why}</Text>
            </>
          ) : null}
        </>
      );
    }
  } else if (kind === 'blank') {
    if (!turned) {
      question = (
        <>
          <AppTextInput
            style={styles.textInput}
            value={typed}
            onChangeText={setTyped}
            placeholder="What goes in the gap"
            returnKeyType="done"
            onSubmitEditing={checkTyped}
          />
          <View style={styles.actionRow}>
            {turnButton('Check', checkTyped)}
            {showAnswerLink}
          </View>
        </>
      );
    } else {
      afterTurn =
        blankChecked === null ? null : (
          <Text style={styles.bodyText}>
            {blankChecked ? 'That is it.' : t('The gap holds "{accept}".', { accept: tl((card.accept ?? [])[0]) })}
          </Text>
        );
    }
  } else if (kind === 'order') {
    const order = shuffledIndexes(items.length, seed).map((i) => items[i]);
    const pool = order.filter((item) => !chosen.includes(item));
    const chosenList = chosen.map((item, i) => (
      <Text key={item} style={styles.bodyText}>
        {i + 1}. {item}
      </Text>
    ));
    if (!turned) {
      question = (
        <>
          {chosenList}
          <View style={styles.optionColumn}>
            {pool.map((item, i) => (
              <TouchableOpacity
                key={item}
                ref={i === 0 ? walkMark.ref('learn.turn') : undefined}
                style={[styles.optionButton, i === 0 ? walkMark('learn.turn') : null]}
                onPress={() => pickOrderItem(item)}
                accessibilityRole="button"
              >
                <Text style={styles.optionButtonText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.actionRow}>
            {chosen.length > 0 ? (
              <TouchableOpacity onPress={() => setChosen([])} accessibilityRole="button">
                <Text style={styles.linkText}>Start Over</Text>
              </TouchableOpacity>
            ) : null}
            {showAnswerLink}
          </View>
        </>
      );
    } else {
      const complete = chosen.length === items.length;
      const right = complete && orderIsRight(items, chosen);
      afterTurn = (
        <>
          {complete ? chosenList : null}
          <Text style={styles.bodyText}>{right ? describeOrder(true) : describeOrder(false)}</Text>
          {!right
            ? items.map((item, i) => (
                <Text key={item} style={styles.bodyText}>
                  {i + 1}. {item}
                </Text>
              ))
            : null}
        </>
      );
    }
  } else if (kind === 'pairs') {
    const rights = shuffledIndexes(pairs.length, seed).map((i) => pairs[i].right);
    const matchedRights = pairs.filter((pair) => matched.includes(pair.left)).map((pair) => pair.right);
    const matchedLines = pairs
      .filter((pair) => matched.includes(pair.left))
      .map((pair) => (
        <Text key={pair.left} style={styles.bodyText}>
          {tl(pair.left)}: {tl(pair.right)}
        </Text>
      ));
    if (!turned) {
      question = (
        <>
          {matchedLines}
          <View style={styles.pairColumns}>
            <View style={styles.pairColumn}>
              {pairs
                .filter((pair) => !matched.includes(pair.left))
                .map((pair, i) => {
                  const on = leftOn === pair.left;
                  return (
                    <TouchableOpacity
                      key={pair.left}
                      ref={i === 0 ? walkMark.ref('learn.turn') : undefined}
                      style={[styles.pill, on && styles.pillActive, i === 0 ? walkMark('learn.turn') : null]}
                      onPress={() => {
                        setLeftOn(on ? null : pair.left);
                        setPairLine(null);
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={on ? styles.pillActiveText : styles.pillText}>{pair.left}</Text>
                    </TouchableOpacity>
                  );
                })}
            </View>
            <View style={styles.pairColumn}>
              {rights
                .filter((right) => !matchedRights.includes(right))
                .map((right) => (
                  <TouchableOpacity key={right} style={styles.pill} onPress={() => pickRight(right)} accessibilityRole="button">
                    <Text style={styles.pillText}>{right}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
          {pairLine ? <Text style={styles.bodyText}>{pairLine}</Text> : null}
          {showAnswerLink}
        </>
      );
    } else {
      afterTurn = (
        <>
          {matched.length === pairs.length ? <Text style={styles.bodyText}>{PAIRS_ALL_MATCHED}</Text> : null}
          {pairs.map((pair) => (
            <Text key={pair.left} style={styles.bodyText}>
              {tl(pair.left)}: {tl(pair.right)}
            </Text>
          ))}
        </>
      );
    }
  } else if (kind === 'explain') {
    if (!turned) {
      question = (
        <>
          <AppTextInput
            style={[styles.textInput, styles.textInputTall]}
            value={typed}
            onChangeText={setTyped}
            placeholder="In your words"
            multiline
          />
          {turnButton('Turn It Over', () => setTurned(true))}
        </>
      );
    } else if (typed.trim()) {
      afterTurn = (
        <>
          <Text style={styles.captionText}>What you wrote</Text>
          <Text style={styles.bodyText}>{typed.trim()}</Text>
        </>
      );
    }
  } else if (!turned) {
    question = turnButton('Turn It Over', () => setTurned(true));
  }

  return (
    <View style={styles.cardBlock}>
      <Text style={styles.captionText}>{KIND_PROMPTS[kind]}</Text>
      {card.story ? <Text style={styles.bodyText}>{card.story}</Text> : null}
      {card.id.startsWith(MY_DECK_PREFIX) ? <LearnCardPhoto cardId={card.id} /> : null}
      <Text style={styles.bodyText}>{card.front}</Text>
      {question}
      {turned ? (
        <>
          {afterTurn}
          <Text style={styles.answerText}>{card.back}</Text>
          {card.source ? (
            <TouchableOpacity
              ref={walkMark.ref('learn.source')}
              style={walkMark('learn.source')}
              onPress={() => {
                if (card.source) void Linking.openURL(card.source.url);
              }}
              accessibilityRole="link"
            >
              <Text style={styles.linkText}>{card.source.source}</Text>
            </TouchableOpacity>
          ) : null}
          {entry ? (
            <TouchableOpacity
              ref={walkMark.ref('learn.entry')}
              style={walkMark('learn.entry')}
              onPress={() => {
                if (card.entryId) router.push(routeForDigestEntry(card.entryId));
              }}
              accessibilityRole="link"
            >
              <Text style={styles.captionText}>Read the Entry</Text>
              <Text style={styles.linkText}>{'title' in entry ? entry.title : entry.foodName}</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.captionText}>How did that go?</Text>
          <View ref={walkMark.ref('learn.grade')} style={[styles.pillRow, walkMark('learn.grade')]}>
            {LEARN_GRADES.map((grade) => (
              <TouchableOpacity key={grade} style={styles.pill} onPress={() => onGrade(grade, checkMatched())} accessibilityRole="button">
                <Text style={styles.pillText}>{LEARN_GRADE_LABELS[grade]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardBlock: { gap: 8, marginTop: 4 },
  bodyText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  answerText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  captionText: { ...typography.caption, color: colors.textMuted, ...textShadow },
  linkText: { ...typography.body, color: colors.primary, ...textShadow },
  optionColumn: { gap: 8 },
  optionButton: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'stretch' },
  optionButtonText: { ...BUTTON_SECONDARY_TEXT },
  pairColumns: { flexDirection: 'row', gap: 8 },
  pairColumn: { flex: 1, gap: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { ...PILL },
  pillActive: { ...PILL_ON },
  pillText: { ...PILL_TEXT },
  pillActiveText: { ...PILL_ON_TEXT },
  primaryButton: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
  },
  textInputTall: { minHeight: 90, textAlignVertical: 'top' },
});
