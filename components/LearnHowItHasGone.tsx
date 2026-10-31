// Interests > Learn, How It Has Gone (2026-10-31, Learn part 6e): the link at
// the foot of the lens that opens the shares of answers, by direct decision
// that percentages are kept but never pushed. Closed every time the lens is
// opened, never remembered open, and nothing from it appears anywhere else
// in Learn, on Home or in a notification. Every sentence comes from
// lib/learnHowItHasGone.ts and states a figure with no word on how it went.

import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import type { LearnDeck } from '../lib/learnDecks';
import { listGoneReviews } from '../lib/learnDb';
import { howItHasGone, type GoneLine, type HowItHasGone } from '../lib/learnHowItHasGone';
import { t } from '../lib/i18n';
import { useWalkMark } from './WalkMark';

type Props = {
  /** Every deck the person can see, for the titles and the kind of each card. */
  decks: LearnDeck[];
  /** How many answers are kept, so an open page reads again after a sitting. */
  answers: number;
};

export function LearnHowItHasGone({ decks, answers }: Props) {
  const walkMark = useWalkMark();
  const [open, setOpen] = useState(false);
  const [figures, setFigures] = useState<HowItHasGone | null>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    void listGoneReviews()
      .then((reviews) => {
        if (!live) return;
        const deckTitle = (id: string) => decks.find((deck) => deck.id === id)?.title;
        const cardById = (id: string) => {
          for (const deck of decks) {
            const card = deck.cards.find((c) => c.id === id);
            if (card) return card;
          }
          return undefined;
        };
        setFigures(howItHasGone(reviews, (id) => {
          const title = deckTitle(id);
          return title ? t(title) : undefined;
        }, cardById, t));
      })
      .catch(() => {
        if (live) setFigures({ total: 0, decks: [], kinds: [], months: [], checks: [] });
      });
    return () => {
      live = false;
    };
  }, [open, decks, answers]);

  if (!open) {
    return (
      <TouchableOpacity
        ref={walkMark.ref('learn.howItHasGone')}
        style={walkMark('learn.howItHasGone')}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
      >
        <Text style={styles.linkText}>How It Has Gone</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>How It Has Gone</Text>
      <Text style={styles.caption}>
        Shares of your answers, counted from every card you have answered. They say what has happened, and nothing more.
      </Text>
      {figures === null ? (
        <Text style={styles.caption}>Reading your answers…</Text>
      ) : figures.total === 0 ? (
        <Text style={styles.body}>There are no answers yet. Once you go through a deck, the shares appear here.</Text>
      ) : (
        ([
          ['By deck', figures.decks],
          ['By kind of card', figures.kinds],
          ['By month', figures.months],
          ['Where a card could check', figures.checks],
        ] as [string, GoneLine[]][])
          .filter(([, lines]) => lines.length > 0)
          .map(([heading, lines]) => (
            <View style={styles.band} key={heading}>
              <Text style={styles.heading}>{t(heading)}</Text>
              {lines.map((line) => (
                <View key={line.label} style={styles.line}>
                  <Text style={styles.label}>{line.label}</Text>
                  <Text style={styles.caption}>{line.text}</Text>
                </View>
              ))}
            </View>
          ))
      )}
      <TouchableOpacity onPress={() => setOpen(false)} accessibilityRole="button">
        <Text style={styles.linkText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  band: { gap: 6, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: colors.tabInterests },
  line: { gap: 2 },
  heading: { ...typography.label, color: colors.textPrimary, ...textShadow },
  label: { ...typography.body, color: colors.textPrimary, ...textShadow },
  body: { ...typography.body, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textMuted, ...textShadow },
  linkText: { ...typography.body, color: colors.primary, ...textShadow },
});
