// A tab's tutorials on Home (2026-10-28), inside that tab's band. Direct
// request: "Instead of having a central tutorials band on the Home screen,
// we could have them inside of each separate Tab band ... each laid out
// like the Getting Setup. I like the card you've read idea."
//
// So one sideways row of cards, one card per lens, drawn the way Getting Set
// Up draws its cards: a strip in the tab's colour, the lens's name, what it
// does for you, and what the tutorial shows. Start runs that lens's
// tutorial over the screen itself. A card whose how-tos have all been gone
// through turns green with the day and moves to the end of the row, and
// still runs again with one tap. Read it in Tutorials opens Profile's
// Tutorials page at that lens, where the written steps and pictures are.
//
// Reads its own state, and again whenever a tutorial run starts or ends,
// so a card turns green the moment the run that finished it closes.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { colors, hexToRgba } from '../constants/colors';
import { TAB_ROUTES } from '../constants/tabs';
import { textShadow, typography } from '../constants/typography';
import { t } from '../lib/i18n';
import { loadTutorialState, startTutorials, type TutorialState } from '../lib/tutorialDb';
import { subscribeTutorialRun } from '../lib/tutorialRun';
import {
  DONE_BEFORE_LABEL,
  TUTORIAL_CARD_AGAIN_LABEL,
  TUTORIAL_CARD_LINE,
  TUTORIAL_CARD_READ_LABEL,
  TUTORIAL_CARD_SHOWS_LABEL,
  TUTORIAL_CARD_START_LABEL,
  TUTORIAL_CARD_TITLES_SHOWN,
  tabTutorialCards,
  type TutorialCardView,
} from '../lib/tutorials';
import { storyDate } from '../lib/yourStory';
import type { TourPath } from '../lib/yourStoryInterview';
import { setupCardWidth } from './SetupCardShelves';
import { useWalkMark } from './WalkMark';

const DONE_COLOR = colors.statusGreenOnSurface;
// Dark text on a filled button carries no shadow.
const NO_SHADOW = { textShadowColor: 'transparent', textShadowRadius: 0 } as const;

export function TabTutorialCards({ path }: { path: TourPath }) {
  const router = useRouter();
  const walkMark = useWalkMark();
  const { width } = useWindowDimensions();
  const cardWidth = setupCardWidth(width);
  const [state, setState] = useState<TutorialState | null>(null);

  const reload = useCallback(() => {
    loadTutorialState()
      .then(setState)
      .catch((error) => console.warn('Tutorials on Home: could not read', error));
  }, []);

  useFocusEffect(reload);
  useEffect(() => subscribeTutorialRun(() => reload()), [reload]);

  if (!state) return null;
  const cards = tabTutorialCards(state.tabs, path, state.doneKeys, state.doneOn);
  if (cards.length === 0) return null;
  const tabColor = TAB_ROUTES.find((route) => route.path === path)?.color ?? colors.primary;

  const start = (card: TutorialCardView) => {
    void startTutorials({ kind: 'lens', key: card.lens.key });
  };
  const read = (card: TutorialCardView) => {
    router.push({ pathname: '/tutorials', params: { openTab: path, openLens: card.lens.key } } as Href);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.caption}>{TUTORIAL_CARD_LINE}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {cards.map((card, index) => {
          const done = card.doneOn != null;
          const tint = done ? DONE_COLOR : tabColor;
          const first = index === 0;
          const shown = card.howTos.slice(0, TUTORIAL_CARD_TITLES_SHOWN);
          const more = card.howTos.length - shown.length;
          return (
            <View
              key={card.lens.key}
              ref={first ? walkMark.ref('home.tutorialCard') : undefined}
              style={[styles.card, { width: cardWidth, borderColor: hexToRgba(tint, done ? 0.7 : 0.55) }, first && walkMark('home.tutorialCard')]}
            >
              <View style={[styles.hero, { backgroundColor: hexToRgba(tint, 0.2) }]}>
                <View style={[styles.heroCircle, { backgroundColor: hexToRgba(tint, 0.3), borderColor: tint }]}>
                  <Ionicons name={done ? 'checkmark' : 'play'} size={30} color={tint} style={textShadow} />
                </View>
                {done ? (
                  <View style={styles.doneTag}>
                    <Ionicons name="checkmark-circle-outline" size={12} color={tint} style={textShadow} />
                    <Text style={styles.doneTagText}>
                      {card.doneOn ? t('Gone through {date}', { date: storyDate(card.doneOn) }) : t(DONE_BEFORE_LABEL)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.body}>
                <Text style={styles.title}>{t(card.lens.name)}</Text>
                {card.lens.line ? <Text style={[styles.hook, { color: tint }]}>{t(card.lens.line)}</Text> : null}
                <View style={styles.part}>
                  <View style={styles.partHead}>
                    <Ionicons name="school-outline" size={13} color={colors.textMuted} style={textShadow} />
                    <Text style={styles.partLabel}>{TUTORIAL_CARD_SHOWS_LABEL}</Text>
                  </View>
                  {shown.map((howTo) => (
                    <View key={howTo.key} style={styles.howToRow}>
                      <Ionicons
                        name={howTo.done ? 'checkmark-circle-outline' : 'ellipse-outline'}
                        size={13}
                        color={howTo.done ? DONE_COLOR : colors.textMuted}
                        style={textShadow}
                        accessibilityLabel={howTo.done ? t(DONE_BEFORE_LABEL) : undefined}
                      />
                      <Text style={styles.howToTitle}>{t(howTo.title)}</Text>
                    </View>
                  ))}
                  {more > 0 ? (
                    <Text style={styles.muted}>
                      {more === 1 ? t('And one more, in Tutorials.') : t('And {count} more, in Tutorials.', { count: more })}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.spacer} />
                <TouchableOpacity
                  ref={first ? walkMark.ref('home.tutorialStart') : undefined}
                  style={[done ? styles.againButton : styles.startButton, done ? { borderColor: tint } : { backgroundColor: tint }, first && walkMark('home.tutorialStart')]}
                  onPress={() => start(card)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(done ? TUTORIAL_CARD_AGAIN_LABEL : TUTORIAL_CARD_START_LABEL)}: ${t(card.lens.name)}`}
                >
                  {done ? (
                    <Ionicons name="refresh" size={15} color={tint} style={textShadow} />
                  ) : (
                    <Ionicons name="play" size={15} color={colors.textOnButton} style={NO_SHADOW} />
                  )}
                  <Text style={done ? styles.againButtonText : styles.startButtonText}>
                    {done ? TUTORIAL_CARD_AGAIN_LABEL : TUTORIAL_CARD_START_LABEL}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.readButton} onPress={() => read(card)} accessibilityRole="button">
                  <Text style={styles.readText}>{TUTORIAL_CARD_READ_LABEL}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, backgroundColor: colors.surface },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  row: { gap: 12, paddingRight: 12, alignItems: 'stretch' },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  hero: { height: 80, alignItems: 'center', justifyContent: 'center' },
  heroCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  doneTagText: { ...typography.caption, color: colors.textPrimary, ...textShadow },
  body: { flex: 1, padding: 12, gap: 8, backgroundColor: colors.surfaceMuted },
  title: { ...typography.sectionTitle, color: colors.textPrimary, ...textShadow },
  hook: { ...typography.body, ...textShadow },
  muted: { ...typography.caption, color: colors.textMuted, ...textShadow },
  part: { gap: 4, backgroundColor: colors.surfaceMuted },
  partHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  partLabel: { ...typography.eyebrow, color: colors.textMuted, ...textShadow },
  howToRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  howToTitle: { ...typography.caption, color: colors.textSecondary, flex: 1, ...textShadow },
  spacer: { flex: 1 },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  startButtonText: { ...typography.label, color: colors.textOnButton, ...NO_SHADOW },
  againButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    marginTop: 4,
    backgroundColor: colors.surface,
  },
  againButtonText: { ...typography.label, color: colors.textPrimary, ...textShadow },
  readButton: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.surfaceMuted },
  readText: { ...typography.caption, color: colors.primary, ...textShadow },
});
