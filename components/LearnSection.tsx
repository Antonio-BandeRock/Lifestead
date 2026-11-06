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
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import {
  BUTTON_PRIMARY_COMPACT,
  BUTTON_PRIMARY_TEXT,
  BUTTON_SECONDARY_COMPACT,
  BUTTON_SECONDARY_TEXT,
  PILL_ON,
  PILL_ON_TEXT,
  PILL_SMALL,
  PILL_TEXT,
} from '../constants/buttons';
import { deckFileBase, renderDeckHtml, type DeckPrintLayout } from '../lib/learnPrint';
import { exportHtmlAsPdf, printHtml } from '../lib/reportPdf';
import { localDayOf } from '../lib/interests';
import { LEARN_DECKS, type LearnDeck } from '../lib/learnDecks';
import { loadRecordDecks } from '../lib/learnRecordDecksDb';
import { listMyDecks } from '../lib/learnMyDecksDb';
import { addLearnReview, listLearnReviews } from '../lib/learnDb';
import {
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
import { kindOf } from '../lib/learnKinds';
import { LearnCardView } from './LearnCardView';
import { LearnHowItHasGone } from './LearnHowItHasGone';
import { LearnMyDecksEditor } from './LearnMyDecksEditor';
import { useWalkMark } from './WalkMark';

type Props = { tabColor: string };

type SittingState = {
  deckId: string;
  queue: string[];
  index: number;
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
  const [recordDecks, setRecordDecks] = useState<LearnDeck[]>([]);
  const [myDecks, setMyDecks] = useState<LearnDeck[]>([]);
  const [printing, setPrinting] = useState<{ deckId: string; layout: DeckPrintLayout; busy: boolean; said: string | null } | null>(null);

  const load = useCallback(async () => {
    const [all, fromRecords, mine] = await Promise.all([
      listLearnReviews(),
      loadRecordDecks(today(), t),
      listMyDecks().catch((): LearnDeck[] => []),
    ]);
    setReviews(all);
    setRecordDecks(fromRecords);
    setMyDecks(mine);
  }, []);

  const studyMine = myDecks.filter((deck) => deck.cards.length > 0);
  const allDecks = [...LEARN_DECKS, ...studyMine, ...recordDecks];
  const firstRecord = LEARN_DECKS.length + studyMine.length;
  const deckById = (id: string) => allDecks.find((deck) => deck.id === id);
  const cardById = (id: string) => {
    for (const deck of allDecks) {
      const card = deck.cards.find((c) => c.id === id);
      if (card) return { deck, card };
    }
    return undefined;
  };

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
    setSitting({ deckId, queue: plan.cardIds, index: 0, practised: [] });
  }

  async function answer(grade: LearnGrade, matched: boolean | null) {
    if (!sitting) return;
    const cardId = sitting.queue[sitting.index];
    const found = cardById(cardId);
    const review = await addLearnReview(sitting.deckId, cardId, grade, found ? kindOf(found.card) : null, matched);
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
      setSitting({ ...sitting, queue, practised, index: next });
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

  async function sendToPaper(deck: LearnDeck, how: 'print' | 'pdf') {
    if (!printing || printing.busy) return;
    const layout = printing.layout;
    setPrinting({ ...printing, busy: true, said: null });
    const html = renderDeckHtml(deck, layout, t);
    let said: string | null = null;
    if (how === 'print') {
      const result = await printHtml(html);
      if (result.status === 'failed') said = result.message;
    } else {
      const result = await exportHtmlAsPdf(html, deckFileBase(deck), 'Save this deck as a PDF');
      if (result.status === 'failed') said = result.message;
      else if (result.status === 'savedOnly') said = 'The PDF is saved on this device. Nothing here could take it further.';
    }
    setPrinting({ deckId: deck.id, layout, busy: false, said });
  }

  const known = countKnown(reviews);
  const current = sitting ? cardById(sitting.queue[sitting.index]) : undefined;

  return (
    <View style={styles.section}>
      <Text style={styles.knownText}>{describeKnown(known)}</Text>

      {allDecks.map((deck, index) => {
        const ids = deck.cards.map((card) => card.id);
        const standing = deckStanding(ids, reviews, day);
        const open = sitting?.deckId === deck.id;
        return (
          <View key={deck.id} style={styles.deckGroup}>
            {studyMine.length > 0 && index === LEARN_DECKS.length ? <Text style={styles.groupHeading}>Decks You Made</Text> : null}
            {index === firstRecord ? <Text style={styles.groupHeading}>From Your Records</Text> : null}
            <View
              ref={index === firstRecord ? walkMark.ref('learn.records') : walkMark.ref('learn.deck')}
              style={[
                styles.deckBlock,
                { borderLeftColor: tabColor },
                index === firstRecord ? walkMark('learn.records') : walkMark('learn.deck'),
              ]}
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
                  {printing?.deckId === deck.id ? (
                    <View style={styles.printBlock}>
                      <View style={styles.pillRow}>
                        {(['list', 'cards'] as const).map((layout) => (
                          <TouchableOpacity
                            key={layout}
                            ref={layout === 'cards' ? walkMark.ref('learn.printLayout') : undefined}
                            style={[styles.pill, printing.layout === layout && styles.pillActive, layout === 'cards' ? walkMark('learn.printLayout') : null]}
                            onPress={() => setPrinting({ ...printing, layout, said: null })}
                            accessibilityRole="button"
                          >
                            <Text style={printing.layout === layout ? styles.pillActiveText : styles.pillText}>
                              {layout === 'list' ? 'A List to Read' : 'Cards to Cut Out'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={styles.captionText}>
                        {printing.layout === 'list'
                          ? 'Every card in turn, the question and then its answer, with why each option is or is not the answer.'
                          : 'Eight cards to a sheet, a page of questions and then a page of answers. Print on both sides, flipping on the long edge, and each answer lands on the back of its question.'}
                      </Text>
                      <View style={styles.pillRow}>
                        <TouchableOpacity
                          ref={walkMark.ref('learn.printSend')}
                          style={[styles.primaryButton, printing.busy && styles.busy, walkMark('learn.printSend')]}
                          onPress={() => void sendToPaper(deck, 'print')}
                          disabled={printing.busy}
                          accessibilityRole="button"
                        >
                          <Text style={styles.primaryButtonText}>{printing.busy ? 'Getting it ready…' : 'Print'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.secondaryButton, printing.busy && styles.busy]}
                          onPress={() => void sendToPaper(deck, 'pdf')}
                          disabled={printing.busy}
                          accessibilityRole="button"
                        >
                          <Text style={styles.secondaryButtonText}>Save as a PDF</Text>
                        </TouchableOpacity>
                      </View>
                      {printing.said ? <Text style={styles.bodyText}>{printing.said}</Text> : null}
                      <TouchableOpacity onPress={() => setPrinting(null)} accessibilityRole="button">
                        <Text style={styles.linkText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      ref={walkMark.ref('learn.print')}
                      style={walkMark('learn.print')}
                      onPress={() => setPrinting({ deckId: deck.id, layout: 'cards', busy: false, said: null })}
                      accessibilityRole="button"
                    >
                      <Text style={styles.linkText}>Print the Deck</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : current && sitting ? (
                <View style={styles.cardBlock}>
                  <Text style={styles.captionText}>
                    {t('Card {n} of {total}', { n: sitting.index + 1, total: sitting.queue.length })}
                  </Text>
                  <LearnCardView
                    key={`${sitting.index}:${current.card.id}`}
                    card={current.card}
                    day={day}
                    onGrade={(grade, matched) => void answer(grade, matched)}
                  />
                  <TouchableOpacity onPress={() => setSitting(null)} accessibilityRole="button">
                    <Text style={styles.linkText}>Stop for Now</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
      {recordDecks.length === 0 ? (
        <Text style={styles.captionText}>
          Decks from your records appear here once there is something to make them from: what you take in Life &gt; My Meds, what is growing
          in Garden, meals in Food, or time on an interest in Sessions.
        </Text>
      ) : null}
      <LearnMyDecksEditor tabColor={tabColor} decks={myDecks} onChanged={load} />
      <LearnHowItHasGone decks={[...allDecks, ...myDecks]} answers={reviews.length} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  knownText: { ...typography.label, color: colors.textPrimary, ...textShadow },
  deckGroup: { gap: 6 },
  deckBlock: { gap: 6, paddingLeft: 8, borderLeftWidth: 2 },
  cardBlock: { gap: 8, marginTop: 4 },
  groupHeading: {
    ...typography.label,
    color: colors.textPrimary,
    ...textShadow,
  },
  bodyText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  captionText: {
    ...typography.caption,
    color: colors.textMuted,
    ...textShadow,
  },
  primaryButton: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
  linkText: { ...typography.body, color: colors.primary, ...textShadow },
  printBlock: { gap: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { ...PILL_SMALL },
  pillActive: { ...PILL_ON },
  pillText: { ...PILL_TEXT },
  pillActiveText: { ...PILL_ON_TEXT },
  secondaryButton: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  secondaryButtonText: { ...BUTTON_SECONDARY_TEXT },
  busy: { opacity: 0.6 },
});
