// Inside Knowledge on Home, in the Interests group (2026-10-31, Learn part
// 6e): things you now know, which decks have cards back for their day, and
// a way into Interests > Learn. The words are in lib/insideKnowledge.ts.
// No share of answers ever shows here; those stay behind How It Has Gone.

import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { t } from '../lib/i18n';
import { localDayOf } from '../lib/interests';
import { insideKnowledge, type InsideKnowledge } from '../lib/insideKnowledge';
import { listLearnReviews } from '../lib/learnDb';
import { LEARN_DECKS, type LearnDeck } from '../lib/learnDecks';
import { listMyDecks } from '../lib/learnMyDecksDb';
import { loadRecordDecks } from '../lib/learnRecordDecksDb';
import { useWalkMark } from './WalkMark';

export function InsideKnowledgeCard() {
  const walkMark = useWalkMark();
  const [lines, setLines] = useState<InsideKnowledge | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      const today = localDayOf(new Date().toISOString());
      void Promise.all([
        listLearnReviews(),
        listMyDecks().catch((): LearnDeck[] => []),
        loadRecordDecks(today, t).catch((): LearnDeck[] => []),
      ])
        .then(([reviews, mine, fromRecords]) => {
          if (live) setLines(insideKnowledge([...LEARN_DECKS, ...mine, ...fromRecords], reviews, today, t));
        })
        .catch(() => {
          if (live) setLines(null);
        });
      return () => {
        live = false;
      };
    }, []),
  );

  return (
    <View style={styles.body}>
      {lines ? (
        <>
          <Text style={styles.known}>{lines.known}</Text>
          <Text style={styles.caption}>{lines.ready}</Text>
        </>
      ) : null}
      <TouchableOpacity
        ref={walkMark.ref('home.insideKnowledgeOpen')}
        style={[styles.row, walkMark('home.insideKnowledgeOpen')]}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/interests', params: { openInterestsLens: 'learn' } })}
        accessibilityRole="button"
      >
        <Ionicons name="school-outline" size={18} color={colors.tabInterests} style={textShadow} />
        <Text style={styles.rowText}>Open Learn</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={textShadow} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 6 },
  known: { ...typography.label, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textMuted, ...textShadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  rowText: { ...typography.body, color: colors.textPrimary, flex: 1, ...textShadow },
});
