// Interests > Learn (2026-10-30, Learn part 6a): ready-made decks gone
// through a few cards at a time, each card coming back on the day the
// schedule in lib/learnSchedule.ts gives it. Things you now know sits at the
// top and is the only figure on the lens: a count that only grows.
//
// A sitting offers what is ready plus a few new cards. A card answered Not
// Yet comes back once more at the end of the same sitting, as practice that
// does not move its schedule. Nothing here counts what is waiting, how late
// a card is, or how often an answer was wrong. Every sentence is in
// lib/learnSchedule.ts, checked by scripts/test_learn.js.

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, PILL, PILL_TEXT } from '../constants/buttons';
import { localDayOf } from '../lib/interests';
import { LEARN_DECKS, cardById, deckById } from '../lib/learnDecks';
import { addLearnReview, listLearnReviews } from '../lib/learnDb';
import {
  LEARN_GRADES,
  LEARN_GRADE_LABELS,
  countKnown,
  deckStanding,
  describeDeckReady,
  describeKnown,
  describeSittingDone,
  planSitting,
  type LearnGrade,
  type LearnReview,
} from '../lib/learnSchedule';
import { explainNotYet } from '../lib/notYet';
import { t } from '../lib/i18n';
import { useWalkMark } from './WalkMark';

type Props = { tabColor: string };

type SittingState = {
  deckId: string;
  queue: string[];
  index: number;
  turned: boolean;
  /** Cards already put back once for practice, so each comes back only once. */
  practised: string[];
};

function today(): string {
  return localDayOf(new Date().toISOString());
}

export function LearnSection({ tabColor }: Props) {
  const walkMark = useWalkMark();
  const [reviews, setReviews] = useState<LearnReview[]>([]);
  const [sitting, setSitting] = useState<SittingState | null>(null);
  const [doneLine, setDoneLine] = useState<{ deckId: string; text: string } | null>(null);

  const load = useCallback(async () => {
    setReviews(await listLearnReviews());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const day = today();

  function startSitting(deckId: string) {
    const deck = deckById(deckId);
    if (!deck) return;
    const plan = planSitting(
      deck.cards.map((card) => card.id),
      reviews,
      day,
    );
    if (plan.cardIds.length === 0) {
      explainNotYet(describeDeckReady(deckStanding(deck.cards.map((card) => card.id), reviews, day), day));
      return;
    }
    setDoneLine(null);
    setSitting({ deckId, queue: plan.cardIds, index: 0, turned: false, practised: [] });
  }

  async function answer(grade: LearnGrade) {
    if (!sitting) return;
    const cardId = sitting.queue[sitting.index];
    const review = await addLearnReview(sitting.deckId, cardId, grade);
    const all = [...reviews, review];
    setReviews(all);
    let queue = sitting.queue;
    let practised = sitting.practised;
    if (grade === 'notYet' && !practised.includes(cardId)) {
      queue = [...queue, cardId];
      practised = [...practised, cardId];
    }
    const next = sitting.index + 1;
    if (next < queue.length) {
      setSitting({ ...sitting, queue, practised, index: next, turned: false });
      return;
    }
    const deck = deckById(sitting.deckId);
    const ids = deck ? deck.cards.map((card) => card.id) : [];
    const after = planSitting(ids, all, day);
    setDoneLine({
      deckId: sitting.deckId,
      text: describeSittingDone(countKnown(all), after.cardIds.length, after.nextReadyOn, day),
    });
    setSitting(null);
  }

  const known = countKnown(reviews);
  const current = sitting ? cardById(sitting.queue[sitting.index]) : undefined;

  return (
    <View style={styles.section}>
      <Text style={styles.knownText}>{describeKnown(known)}</Text>

      {LEARN_DECKS.map((deck) => {
        const ids = deck.cards.map((card) => card.id);
        const standing = deckStanding(ids, reviews, day);
        const open = sitting?.deckId === deck.id;
        return (
          <View
            key={deck.id}
            ref={walkMark.ref('learn.deck')}
            style={[styles.deckBlock, { borderLeftColor: tabColor }, walkMark('learn.deck')]}
          >
            <Text style={styles.groupHeading}>{deck.title}</Text>
            <Text style={styles.captionText}>{deck.about}</Text>
            {!open ? (
              <>
                <Text style={styles.bodyText}>{describeDeckReady(standing, day)}</Text>
                {doneLine?.deckId === deck.id ? <Text style={styles.bodyText}>{doneLine.text}</Text> : null}
                <TouchableOpacity
                  ref={walkMark.ref('learn.study')}
                  style={[styles.primaryButton, walkMark('learn.study')]}
                  onPress={() => startSitting(deck.id)}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryButtonText}>Study</Text>
                </TouchableOpacity>
              </>
            ) : current && sitting ? (
              <View style={styles.cardBlock}>
                <Text style={styles.captionText}>
                  {t('Card {n} of {total}', { n: sitting.index + 1, total: sitting.queue.length })}
                </Text>
                <Text style={styles.bodyText}>{current.card.front}</Text>
                {!sitting.turned ? (
                  <TouchableOpacity
                    ref={walkMark.ref('learn.turn')}
                    style={[styles.primaryButton, walkMark('learn.turn')]}
                    onPress={() => setSitting({ ...sitting, turned: true })}
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryButtonText}>Turn It Over</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <Text style={styles.answerText}>{current.card.back}</Text>
                    {current.card.source ? (
                      <TouchableOpacity
                        ref={walkMark.ref('learn.source')}
                        style={walkMark('learn.source')}
                        onPress={() => {
                          if (current.card.source) void Linking.openURL(current.card.source.url);
                        }}
                        accessibilityRole="link"
                      >
                        <Text style={styles.linkText}>{current.card.source.source}</Text>
                      </TouchableOpacity>
                    ) : null}
                    <Text style={styles.captionText}>How did that go?</Text>
                    <View
                      ref={walkMark.ref('learn.grade')}
                      style={[styles.pillRow, walkMark('learn.grade')]}
                    >
                      {LEARN_GRADES.map((grade) => (
                        <TouchableOpacity
                          key={grade}
                          style={styles.pill}
                          onPress={() => void answer(grade)}
                          accessibilityRole="button"
                        >
                          <Text style={styles.pillText}>{LEARN_GRADE_LABELS[grade]}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
                <TouchableOpacity onPress={() => setSitting(null)} accessibilityRole="button">
                  <Text style={styles.linkText}>Stop for Now</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  knownText: { ...typography.label, color: colors.textPrimary, ...textShadow },
  deckBlock: { gap: 6, paddingLeft: 8, borderLeftWidth: 2 },
  cardBlock: { gap: 8, marginTop: 4 },
  groupHeading: { ...typography.label, color: colors.textPrimary, ...textShadow },
  bodyText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  answerText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  captionText: { ...typography.caption, color: colors.textMuted, ...textShadow },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { ...PILL },
  pillText: { ...PILL_TEXT },
  primaryButton: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
  linkText: { ...typography.body, color: colors.primary, ...textShadow },
});
