// Setup before the app, 1.0.68.11; the Home cards since 1.0.75.10.
//
// 1.0.68.11, direct request: "we need to have a truly guided setup that
// happens before the rest of the app is loaded for them". From 1.0.68.13 to
// 1.0.75.9 that was a walk, one page at a time. 2026-10-28, direct request:
// "Replace the walk with the Home cards, on folding band per tab, but with a
// header area above them and them not being indented since they are not on
// the home screen. Move the option to continue to the Home screen to the top
// inside of the Getting Set Up header."
//
// So setup is the same screen as Getting Set Up on Home
// (components/YourStorySection.tsx in 'setup' mode): the interview's open
// question while one is left, Before anything else, then a folding band per
// tab of setup cards (components/SetupCardShelves.tsx), each band full width
// with nothing indented. Opening a tab closes the one open before and brings
// it to the top (components/BringToTop.tsx).
//
//   - The header band comes first, with Finish Later at its top, which
//     lets the person in. Setup comes back the next time the app starts
//     while something on the walk (lib/setupFlow.ts) is still waiting.
//   - Set It Up on a card opens its screen with setup set aside, starts the
//     card's guide walk (lib/storyWalk.ts) so each step's button is ringed,
//     and shows a strip above that screen naming the card, with Back to
//     Setup. Once the card's record exists the strip says Saved.
//   - Once nothing is waiting, the header offers Open Lifestead, which
//     starts the tour strip (lib/guidedTour.ts), and Start the tutorials
//     (lib/tutorials.ts), in place of Finish Later.
//   - Run Setup Again in Profile opens it again with every answer as it
//     stands.
//
// Every word and answer of a question is the interview's
// (components/YourStoryInterview.tsx), so nothing here asks twice or keeps
// a second record.
//
// Mounted inside UnlockedApp so it never shows over the lock, and ahead of
// OverlayRoot and AppKeyboard so a picker and the drawn keyboard draw over
// it. The first-launch agreement is mounted after it and stays on top.
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { useFloatingButtonScrollPadding } from '../constants/floatingButton';
import { showGuidedTour } from '../lib/guidedTourDb';
import { cardDoneOn, type SetupCardView } from '../lib/setupCards';
import { setStoryWalk, startStoryWalk } from '../lib/storyWalk';
import { startTutorials } from '../lib/tutorialDb';
import { SETUP_TUTORIALS_LABEL, SETUP_TUTORIALS_LINE } from '../lib/tutorials';
import { GUIDES, type GuideRecords } from '../lib/yourStoryGuides';
import { buildSetupFlow, firstOpenStep, SETUP_AWAY_CAPTION, subscribeRunSetupAgain } from '../lib/setupFlow';
import { HEADING_TAKING_SHAPE, type StoryDestination, type YourStoryItemKey, type YourStoryView } from '../lib/yourStory';
import {
  SETUP_AWAY_SAVED_CARD,
  SETUP_DONE_HEADING,
  SETUP_DONE_LINE,
  SETUP_FINISH_LATER_LABEL,
  SETUP_FINISH_LATER_LINE,
  SETUP_HEADING,
  SETUP_LEAD,
  SETUP_OPEN_APP_LABEL,
  SETUP_RETURN_LABEL,
  type InterviewView,
} from '../lib/yourStoryInterview';
import { loadYourStoryEverything } from '../lib/yourStoryInterviewDb';
import { BringToTopProvider, useBringToTopHost } from './BringToTop';
import { goToStoryDestination } from './GuidedTourHost';
import { GuideStripAnchor } from './GuideRoom';
import { useStoryWalk } from './StoryWalkHost';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandStyle } from './HomeSectionBand';
import { YourStorySection } from './YourStorySection';

// Finish Later lasts until the app next starts, so it is kept here rather
// than as an answer.
let putOffThisRun = false;

type Phase = 'reading' | 'asking' | 'away' | 'closed';

// While a screen is open for a card, how often its record is looked for.
const AWAY_LOOK_MS = 4000;

// The guide step that sets up an item, so its screen can show the steps.
function guideWalkForItem(item: YourStoryItemKey): { guide: (typeof GUIDES)[number]['key']; entryKey: string } | null {
  for (const guide of GUIDES) {
    const entry = guide.entries.find((candidate) => candidate.item === item);
    if (entry) return { guide: guide.key, entryKey: entry.key };
  }
  return null;
}

export function FirstSetup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = useFloatingButtonScrollPadding();
  const [interview, setInterview] = useState<InterviewView | null>(null);
  const [view, setView] = useState<YourStoryView | null>(null);
  const [records, setRecords] = useState<GuideRecords>({});
  // Nothing on the walk is waiting any more.
  const [allDone, setAllDone] = useState(false);
  const [phase, setPhase] = useState<Phase>(putOffThisRun ? 'closed' : 'reading');
  // The card opened from setup, so the strip can name it and say once it
  // is saved; null for anything else opened from here.
  const [awayCard, setAwayCard] = useState<SetupCardView | null>(null);
  const walk = useStoryWalk();
  const scroller = useRef<ScrollView>(null);
  const frame = useRef<View>(null);
  const { bringToTop, onScroll } = useBringToTopHost(scroller, frame);
  // Run Setup Again shows setup even with nothing waiting.
  const reviewRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const everything = await loadYourStoryEverything(false);
      const waiting = !!firstOpenStep(buildSetupFlow(everything.interview));
      setInterview(everything.interview);
      setView(everything.view);
      setRecords(everything.records);
      setAllDone(!waiting);
      setPhase((was) => {
        if (was !== 'reading') return was;
        return waiting || reviewRef.current ? 'asking' : 'closed';
      });
    } catch (error) {
      console.warn('Setup: could not read what is set up', error);
      setPhase('closed');
    }
  }, []);

  useEffect(() => {
    if (putOffThisRun) return;
    void load();
  }, [load]);

  useEffect(
    () =>
      subscribeRunSetupAgain(() => {
        putOffThisRun = false;
        reviewRef.current = true;
        setAwayCard(null);
        setPhase('reading');
        void load();
      }),
    [load],
  );

  // While another screen is open, look for its record now and then, so
  // the strip can say Saved without the person coming back to check.
  useEffect(() => {
    if (phase !== 'away') return;
    const timer = setInterval(() => void load(), AWAY_LOOK_MS);
    return () => clearInterval(timer);
  }, [phase, load]);

  const goAway = useCallback(
    (destination: StoryDestination, card: SetupCardView | null) => {
      if (destination.kind === 'beats') return;
      setAwayCard(card);
      setPhase('away');
      goToStoryDestination(router, destination);
      const guideWalk = card?.def.item ? guideWalkForItem(card.def.item) : null;
      if (guideWalk) startStoryWalk(guideWalk.guide, guideWalk.entryKey, !!card?.doneOn);
    },
    [router],
  );

  const goElsewhere = useCallback((destination: StoryDestination) => goAway(destination, null), [goAway]);
  const goCard = useCallback((card: SetupCardView) => goAway(card.def.destination, card), [goAway]);

  const comeBack = useCallback(() => {
    setStoryWalk(null);
    setAwayCard(null);
    setPhase('asking');
    void load();
  }, [load]);

  const close = useCallback(() => {
    reviewRef.current = false;
    setPhase('closed');
  }, []);

  // A guide walk on the same card already says what to do, at the top of
  // the screen (1.0.75.5): the strip here then drops its own copy and keeps
  // only its button on one row.
  const walking = !!walk;

  if (phase === 'reading' || phase === 'closed' || !interview) return null;

  if (phase === 'away') {
    const saved = !!awayCard && !!view && !!cardDoneOn(awayCard.def, view, records);
    return (
      <GuideStripAnchor slot="setup" style={styles.awayAnchor}>
        <View style={[styles.awayStrip, walking && styles.awayStripSmall]}>
          {walking ? null : <Text style={styles.caption}>{SETUP_AWAY_CAPTION}</Text>}
          {awayCard && !walking ? <Text style={styles.awayTitle}>{awayCard.def.title}</Text> : null}
          {saved ? <Text style={styles.caption}>{SETUP_AWAY_SAVED_CARD}</Text> : null}
          <View style={styles.awayButtons}>
            {walking ? <Text style={styles.caption}>{SETUP_AWAY_CAPTION}</Text> : null}
            <TouchableOpacity style={styles.awayButton} accessibilityRole="button" onPress={comeBack}>
              <Ionicons name="arrow-back" size={16} color={colors.textOnButton} />
              <Text style={styles.awayButtonText}>{SETUP_RETURN_LABEL}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GuideStripAnchor>
    );
  }

  return (
    <View style={[styles.cover, { paddingTop: insets.top }]}>
      <View ref={frame} style={styles.frame} collapsable={false}>
        <BringToTopProvider value={bringToTop}>
          <ScrollView
            ref={scroller}
            contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
            keyboardShouldPersistTaps="handled"
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            <View style={[styles.band, styles.bandAccent]}>
              {/* The way on to Home, at the top inside the header (direct
                  request, 2026-10-28), so it is never under a long list. */}
              {allDone ? (
                <>
                  <TouchableOpacity
                    style={styles.goButton}
                    accessibilityRole="button"
                    onPress={() => {
                      close();
                      void showGuidedTour();
                    }}
                  >
                    <Text style={styles.goText}>{SETUP_OPEN_APP_LABEL}</Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.textOnButton} />
                  </TouchableOpacity>
                  <Text style={styles.caption}>{SETUP_DONE_LINE}</Text>
                  <TouchableOpacity
                    style={styles.laterRow}
                    accessibilityRole="button"
                    onPress={() => {
                      close();
                      void startTutorials({ kind: 'all' }).then((started) => {
                        if (started) router.navigate('/');
                      });
                    }}
                  >
                    <Ionicons name="school-outline" size={14} color={colors.primary} style={textShadow} />
                    <Text style={styles.laterLabel}>{SETUP_TUTORIALS_LABEL}</Text>
                  </TouchableOpacity>
                  <Text style={styles.caption}>{SETUP_TUTORIALS_LINE}</Text>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.laterRow}
                    accessibilityRole="button"
                    onPress={() => {
                      putOffThisRun = true;
                      close();
                    }}
                  >
                    <Text style={styles.laterLabel}>{SETUP_FINISH_LATER_LABEL}</Text>
                    <Ionicons name="arrow-forward" size={13} color={colors.primary} style={textShadow} />
                  </TouchableOpacity>
                  <Text style={styles.caption}>{SETUP_FINISH_LATER_LINE}</Text>
                </>
              )}
              <View style={styles.rule} />
              <Text style={styles.caption}>{SETUP_HEADING}</Text>
              <Text style={styles.heading}>{allDone ? SETUP_DONE_HEADING : HEADING_TAKING_SHAPE}</Text>
              <Text style={styles.lead}>{SETUP_LEAD}</Text>
            </View>
            <YourStorySection
              mode="setup"
              view={view}
              interview={interview}
              records={records}
              onChanged={() => void load()}
              goOverride={goElsewhere}
              onCardGo={goCard}
            />
          </ScrollView>
        </BringToTopProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFillObject, zIndex: 999, backgroundColor: colors.background },
  frame: { flex: 1 },
  content: { gap: HOME_BAND_GAP, paddingTop: HOME_BAND_GAP },
  band: {
    ...homeBandStyle,
    borderColor: colors.border,
    padding: HOME_BAND_CONTENT_PADDING,
    gap: 8,
    backgroundColor: colors.surface,
  },
  bandAccent: { borderColor: colors.primary },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 2 },
  heading: { ...typography.sectionTitle, color: colors.textPrimary, ...textShadow },
  lead: { ...typography.body, color: colors.textSecondary, ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow, flexShrink: 1 },
  laterRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 2 },
  laterLabel: { ...typography.body, color: colors.primary, ...textShadow },
  goButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.buttonColor,
  },
  goText: { ...typography.bodyEmphasis, color: colors.textOnButton },
  // At the top in its slot (components/GuideRoom.tsx), with the screen moved
  // down below it (1.0.74.10). It used to float 90 above the bottom edge,
  // which put it over the App Lock keys and buttons: "boxes telling them how
  // to setup something for setup can never be in the way of what the user
  // needs to see, type in, or tap."
  awayAnchor: { left: 0, right: 0, alignItems: 'center', paddingHorizontal: 16 },
  awayStrip: {
    alignSelf: 'stretch',
    maxWidth: 480,
    gap: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  awayStripSmall: { paddingVertical: 6, gap: 2 },
  awayTitle: { ...typography.body, color: colors.textPrimary, ...textShadow },
  awayButtons: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 },
  awayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.buttonColor,
  },
  awayButtonText: { ...typography.bodyEmphasis, color: colors.textOnButton },
});
