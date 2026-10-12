// Setup before the app, 1.0.68.11. Direct request: "we need to have a truly
// guided setup that happens before the rest of the app is loaded for them
// ... and then they can open the app and have a guided tour letting them
// know which things they need to do in the order they need to do them."
//
// Your Guide's interview questions, one to a screen, over the whole app
// while any is without an answer. Every word and every answer is the
// interview's (lib/yourStoryInterview.ts, components/YourStoryInterview.tsx
// in 'setup' mode), so nothing here asks twice or keeps a second record.
//
//   - A question that needs another screen (My Meds, Backup & Restore, App
//     Lock) opens it with setup set aside, and Back to Setup floats over
//     that screen until the person returns.
//   - Finish Later lets the person in. Setup comes back the next time the
//     app starts, at the first question without an answer.
//   - Once every question has an answer, Setup is done says what the tour
//     strip will do, and Open Lifestead starts it (lib/guidedTour.ts).
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
import type { StoryDestination } from '../lib/yourStory';
import {
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
import { goToStoryDestination } from './GuidedTourHost';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandStyle } from './HomeSectionBand';
import { YourStoryInterview } from './YourStoryInterview';

// Finish Later lasts until the app next starts, so it is kept here rather
// than as an answer.
let putOffThisRun = false;

type Phase = 'reading' | 'asking' | 'away' | 'done' | 'closed';

export function FirstSetup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = useFloatingButtonScrollPadding();
  const [interview, setInterview] = useState<InterviewView | null>(null);
  const [phase, setPhase] = useState<Phase>(putOffThisRun ? 'closed' : 'reading');
  const scroller = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const { interview: next } = await loadYourStoryEverything(false);
      setInterview(next);
      setPhase((was) => {
        if (was === 'closed' || was === 'away') return was;
        if (next.next) return 'asking';
        // Setup is done only said when setup was shown this run.
        return was === 'asking' ? 'done' : 'closed';
      });
    } catch (error) {
      console.warn('Setup: could not read the interview', error);
      setPhase('closed');
    }
  }, []);

  useEffect(() => {
    if (putOffThisRun) return;
    void load();
  }, [load]);

  const onQuestionShown = useCallback(() => {
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const go = useCallback(
    (destination: Exclude<StoryDestination, { kind: 'beats' }>) => {
      setPhase('away');
      goToStoryDestination(router, destination);
    },
    [router],
  );

  if (phase === 'reading' || phase === 'closed' || !interview) return null;

  if (phase === 'away') {
    return (
      <View pointerEvents="box-none" style={[styles.returnAnchor, { bottom: insets.bottom + 90 }]}>
        <TouchableOpacity
          style={styles.returnButton}
          accessibilityRole="button"
          onPress={() => {
            setPhase('asking');
            void load();
          }}
        >
          <Ionicons name="arrow-back" size={16} color={colors.textOnButton} />
          <Text style={styles.returnText}>{SETUP_RETURN_LABEL}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.cover, { paddingTop: insets.top }]}>
      <ScrollView
        ref={scroller}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        {phase === 'done' ? (
          <View style={[styles.band, styles.bandAccent]}>
            <Text style={styles.heading}>{SETUP_DONE_HEADING}</Text>
            <Text style={styles.lead}>{SETUP_DONE_LINE}</Text>
            <TouchableOpacity
              style={styles.openButton}
              accessibilityRole="button"
              onPress={() => {
                setPhase('closed');
                void showGuidedTour();
              }}
            >
              <Text style={styles.openText}>{SETUP_OPEN_APP_LABEL}</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.textOnButton} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.band, styles.bandAccent]}>
              <Text style={styles.heading}>{SETUP_HEADING}</Text>
              <Text style={styles.lead}>{SETUP_LEAD}</Text>
            </View>
            <YourStoryInterview
              mode="setup"
              interview={interview}
              onChanged={() => void load()}
              go={go}
              onQuestionShown={onQuestionShown}
            />
            <View style={styles.band}>
              <TouchableOpacity
                style={styles.laterRow}
                accessibilityRole="button"
                onPress={() => {
                  putOffThisRun = true;
                  setPhase('closed');
                }}
              >
                <Text style={styles.laterLabel}>{SETUP_FINISH_LATER_LABEL}</Text>
                <Ionicons name="arrow-forward" size={13} color={colors.primary} style={textShadow} />
              </TouchableOpacity>
              <Text style={styles.caption}>{SETUP_FINISH_LATER_LINE}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFillObject, zIndex: 999, backgroundColor: colors.background },
  content: { gap: HOME_BAND_GAP, paddingTop: HOME_BAND_GAP },
  band: {
    ...homeBandStyle,
    borderColor: colors.border,
    padding: HOME_BAND_CONTENT_PADDING,
    gap: 8,
    backgroundColor: colors.surface,
  },
  bandAccent: { borderColor: colors.primary },
  heading: { ...typography.sectionTitle, color: colors.textPrimary, ...textShadow },
  lead: { ...typography.body, color: colors.textSecondary, ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  laterRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 2 },
  laterLabel: { ...typography.body, color: colors.primary, ...textShadow },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.buttonColor,
  },
  openText: { ...typography.bodyEmphasis, color: colors.textOnButton },
  returnAnchor: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 999 },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.buttonColor,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  returnText: { ...typography.bodyEmphasis, color: colors.textOnButton },
});
