// Setup before the app, 1.0.68.11, walked page by page since 1.0.68.13.
//
// 1.0.68.11, direct request: "we need to have a truly guided setup that
// happens before the rest of the app is loaded for them". 1.0.68.13, direct
// request: Done on a question made "that part just disappear in a flash and
// then the screen doesn't automatically go somewhere they should be working
// on next ... The user is taken step by step through everything they need
// to do in the app until it is down to how to use the app."
//
// So setup is one walk (lib/setupFlow.ts): the interview's questions and the
// getting-set-up items of every part of life chosen, grouped into named
// parts. Every page says which part it is in, fades in at the top of the
// screen, and says what was answered on the page before, with Change.
//
//   - Answering moves to the next page by itself. Back goes to the one
//     before, and a page already answered has Keep this and go on.
//   - An item opens its screen with setup set aside, and a strip above that
//     screen names what to do there, with Back to Setup and Later. Once the
//     record exists the strip says Saved and offers Next in setup.
//   - Finish Later lets the person in. Setup comes back the next time the
//     app starts, at the first thing still waiting.
//   - Run Setup Again in Profile walks every page from the start, each
//     showing its answer as it stands.
//   - An item's Set it up also starts that item's guide walk
//     (lib/storyWalk.ts), so the screen it opens shows each step with the
//     button to press ringed. 1.0.68.14.
//   - Once nothing is waiting, Setup is done. Start the tutorials walks
//     every tab and lens (lib/tutorials.ts, 1.0.68.14); Open Lifestead starts
//     the tour strip (lib/guidedTour.ts).
//
// Every word and answer of a question is the interview's
// (components/YourStoryInterview.tsx in 'setup' mode), so nothing here asks
// twice or keeps a second record.
//
// Mounted inside UnlockedApp so it never shows over the lock, and ahead of
// OverlayRoot and AppKeyboard so a picker and the drawn keyboard draw over
// it. The first-launch agreement is mounted after it and stays on top.
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { useFloatingButtonScrollPadding } from '../constants/floatingButton';
import { showGuidedTour } from '../lib/guidedTourDb';
import { setStoryWalk, startStoryWalk } from '../lib/storyWalk';
import { startTutorials } from '../lib/tutorialDb';
import { SETUP_TUTORIALS_LABEL, SETUP_TUTORIALS_LINE } from '../lib/tutorials';
import { GUIDES } from '../lib/yourStoryGuides';
import {
  buildSetupFlow,
  firstOpenStep,
  PART_BY_KEY,
  SETUP_AWAY_CAPTION,
  SETUP_AWAY_SAVED,
  SETUP_GO_LABEL,
  SETUP_HOW_HEADING,
  SETUP_HOW_LINES,
  SETUP_KEEP_LABEL,
  SETUP_KEEP_LINE,
  SETUP_NEXT_LABEL,
  SETUP_RERUN_LINE,
  SETUP_SKIP,
  SETUP_SKIP_LABEL,
  stepAfter,
  stepBefore,
  subscribeRunSetupAgain,
  type SetupStep,
} from '../lib/setupFlow';
import type { StoryDestination, YourStoryItemKey } from '../lib/yourStory';
import { setYourStoryItemAside } from '../lib/yourStoryDb';
import {
  CHANGE_LABEL,
  JUST_ANSWERED_LABEL,
  LATER,
  LATER_LABEL,
  SETUP_BACK_LABEL,
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
import { loadYourStoryEverything, setYourStoryAnswer } from '../lib/yourStoryInterviewDb';
import { answerVaultSetupNotNow } from '../lib/vaultSession';
import { goToStoryDestination } from './GuidedTourHost';
import { GuideStripAnchor } from './GuideRoom';
import { useStoryWalk } from './StoryWalkHost';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandStyle } from './HomeSectionBand';
import { YourStoryInterview } from './YourStoryInterview';

// Finish Later lasts until the app next starts, so it is kept here rather
// than as an answer.
let putOffThisRun = false;

type Phase = 'reading' | 'asking' | 'away' | 'done' | 'closed';

type Destination = Exclude<StoryDestination, { kind: 'beats' }>;

// Questions that open another screen and can be left until Later from it.
const LATER_FROM_AWAY = new Set(['meds', 'backup', 'security']);

// While a screen is open for an item, how often its record is looked for.
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
  const [flow, setFlow] = useState<SetupStep[]>([]);
  const [phase, setPhase] = useState<Phase>(putOffThisRun ? 'closed' : 'reading');
  const [current, setCurrentState] = useState<string | null>(null);
  const [justDone, setJustDone] = useState<string | null>(null);
  const walk = useStoryWalk();
  const scroller = useRef<ScrollView>(null);
  const fade = useRef(new Animated.Value(1)).current;

  const currentRef = useRef<string | null>(null);
  // Run Setup Again: every page in turn, answered or not.
  const reviewRef = useRef(false);
  // The page just answered, so the next load moves on from it.
  const advanceFrom = useRef<string | null>(null);
  // Back from another screen: move on if what was asked there is settled.
  const returning = useRef(false);

  const setCurrent = useCallback((key: string | null) => {
    currentRef.current = key;
    setCurrentState(key);
  }, []);

  const nextAfter = useCallback((steps: SetupStep[], from: string): string | null => {
    if (reviewRef.current) return stepAfter(steps, from)?.key ?? null;
    return firstOpenStep(steps)?.key ?? null;
  }, []);

  const load = useCallback(async () => {
    try {
      const { interview: next } = await loadYourStoryEverything(false);
      const steps = buildSetupFlow(next);
      setInterview(next);
      setFlow(steps);
      const from = advanceFrom.current;
      advanceFrom.current = null;
      const back = returning.current;
      returning.current = false;
      let target = currentRef.current;
      const shown = target ? steps.find((step) => step.key === target) : null;
      if (from) target = nextAfter(steps, from);
      else if (!shown) target = reviewRef.current ? (steps[0]?.key ?? null) : (firstOpenStep(steps)?.key ?? null);
      else if (back && shown.settled) target = nextAfter(steps, shown.key);
      setPhase((was) => {
        if (was === 'closed' || was === 'away') return was;
        if (target) return 'asking';
        // Setup is done only said when setup was shown this run.
        return was === 'asking' ? 'done' : 'closed';
      });
      if (target !== currentRef.current) {
        if (from) setJustDone(from);
        setCurrent(target);
      }
    } catch (error) {
      console.warn('Setup: could not read what is set up', error);
      setPhase('closed');
    }
  }, [nextAfter, setCurrent]);

  useEffect(() => {
    if (putOffThisRun) return;
    void load();
  }, [load]);

  useEffect(
    () =>
      subscribeRunSetupAgain(() => {
        putOffThisRun = false;
        reviewRef.current = true;
        advanceFrom.current = null;
        returning.current = false;
        setJustDone(null);
        setCurrent(null);
        setPhase('reading');
        void load().then(() => setPhase((was) => (was === 'reading' ? 'asking' : was)));
      }),
    [load, setCurrent],
  );

  // A new page starts at the top and fades in, so moving on is seen.
  useEffect(() => {
    if (!current) return;
    scroller.current?.scrollTo({ y: 0, animated: false });
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [current, fade]);

  // While another screen is open, look for its record now and then, so
  // the strip can say Saved without the person coming back to check.
  useEffect(() => {
    if (phase !== 'away') return;
    const timer = setInterval(() => void load(), AWAY_LOOK_MS);
    return () => clearInterval(timer);
  }, [phase, load]);

  const go = useCallback(
    (destination: Destination, item?: YourStoryItemKey, onRecord?: boolean) => {
      setPhase('away');
      goToStoryDestination(router, destination);
      const walk = item ? guideWalkForItem(item) : null;
      if (walk) startStoryWalk(walk.guide, walk.entryKey, !!onRecord);
    },
    [router],
  );

  const moveOn = useCallback(
    (key: string) => {
      setStoryWalk(null);
      advanceFrom.current = key;
      setPhase('asking');
      void load();
    },
    [load],
  );

  const answer = useCallback(
    async (step: SetupStep, value: string) => {
      try {
        if (step.key === 'security') answerVaultSetupNotNow();
        await setYourStoryAnswer(step.key, value);
      } catch (error) {
        console.warn('Setup: could not save the answer', error);
      }
      moveOn(step.key);
    },
    [moveOn],
  );

  const onAnswered = useCallback((key: string) => {
    advanceFrom.current = key;
  }, []);

  // A guide walk on the same step already says what to do, at the top of
  // the screen (1.0.75.5): the strip here then drops its own copy of the
  // step and keeps only its buttons on one row, so the two strips do not
  // say the same thing twice and take a third of the screen between them.
  const walking = !!walk;

  if (phase === 'reading' || phase === 'closed' || !interview) return null;

  const step = current ? (flow.find((entry) => entry.key === current) ?? null) : null;

  if (phase === 'away') {
    // An item is saved once its record exists; a question once answered.
    const saved = !!step && (step.kind === 'item' ? step.onRecord : step.settled);
    return (
      <GuideStripAnchor slot="setup" style={styles.awayAnchor}>
        <View style={[styles.awayStrip, walking && styles.awayStripSmall]}>
          {walking ? null : <Text style={styles.caption}>{SETUP_AWAY_CAPTION}</Text>}
          {step && !walking ? <Text style={styles.awayTitle}>{step.title}</Text> : null}
          {saved ? <Text style={styles.caption}>{SETUP_AWAY_SAVED}</Text> : null}
          <View style={styles.awayButtons}>
            {walking ? <Text style={styles.caption}>{SETUP_AWAY_CAPTION}</Text> : null}
            {saved && step ? (
              <TouchableOpacity style={styles.awayButton} accessibilityRole="button" onPress={() => moveOn(step.key)}>
                <Text style={styles.awayButtonText}>{SETUP_NEXT_LABEL}</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.textOnButton} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.awayButton}
                accessibilityRole="button"
                onPress={() => {
                  setStoryWalk(null);
                  returning.current = true;
                  setPhase('asking');
                  void load();
                }}
              >
                <Ionicons name="arrow-back" size={16} color={colors.textOnButton} />
                <Text style={styles.awayButtonText}>{SETUP_RETURN_LABEL}</Text>
              </TouchableOpacity>
            )}
            {step && !step.settled && (step.kind === 'item' || LATER_FROM_AWAY.has(step.key)) ? (
              <TouchableOpacity style={styles.awayLater} accessibilityRole="button" onPress={() => void answer(step, LATER)}>
                <Text style={styles.awayLaterText}>{LATER_LABEL}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </GuideStripAnchor>
    );
  }

  const part = step ? PART_BY_KEY[step.part] : null;
  const isFirst = !!step && flow[0]?.key === step.key;
  const before = step ? stepBefore(flow, step.key) : null;
  const last = justDone && justDone !== current ? (flow.find((entry) => entry.key === justDone) ?? null) : null;

  function renderItem(item: SetupStep) {
    const def = item.item;
    if (!def) return null;
    const destination = def.destination.kind === 'beats' ? null : def.destination;
    return (
      <View style={[styles.band, styles.bandAccent]}>
        <Text style={styles.question}>{item.title}</Text>
        <Text style={styles.lead}>{def.why}</Text>
        {item.summary ? <Text style={styles.caption}>{item.summary}</Text> : null}
        <View style={styles.links}>
          {destination ? (
            <TouchableOpacity style={styles.goButton} accessibilityRole="button" onPress={() => go(destination, def.key, item.onRecord)}>
              <Text style={styles.goText}>{SETUP_GO_LABEL}</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.textOnButton} />
            </TouchableOpacity>
          ) : null}
          {item.settled ? null : (
            <>
              <TouchableOpacity style={styles.link} accessibilityRole="button" onPress={() => void answer(item, LATER)}>
                <Text style={styles.linkMuted}>{LATER_LABEL}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.link} accessibilityRole="button" onPress={() => void answer(item, SETUP_SKIP)}>
                <Text style={styles.linkMuted}>{SETUP_SKIP_LABEL}</Text>
              </TouchableOpacity>
              {def.setAside ? (
                <TouchableOpacity
                  style={styles.link}
                  accessibilityRole="button"
                  onPress={() =>
                    void setYourStoryItemAside(def.key)
                      .catch((error) => console.warn('Setup: could not set the item aside', error))
                      .then(() => moveOn(item.key))
                  }
                >
                  <Text style={styles.linkMuted}>{def.setAside.label}</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>
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
        {phase === 'done' || !step || !part ? (
          <View style={[styles.band, styles.bandAccent]}>
            <Text style={styles.heading}>{SETUP_DONE_HEADING}</Text>
            {/* 1.0.68.14: "When the user has completed the profile settings
                the app needs, then they are offered the tutorials". */}
            <Text style={styles.lead}>{SETUP_TUTORIALS_LINE}</Text>
            <TouchableOpacity
              style={styles.goButton}
              accessibilityRole="button"
              onPress={() => {
                reviewRef.current = false;
                setPhase('closed');
                void startTutorials({ kind: 'all' }).then((started) => {
                  if (started) router.navigate('/');
                });
              }}
            >
              <Text style={styles.goText}>{SETUP_TUTORIALS_LABEL}</Text>
              <Ionicons name="school-outline" size={16} color={colors.textOnButton} />
            </TouchableOpacity>
            <Text style={styles.lead}>{SETUP_DONE_LINE}</Text>
            <TouchableOpacity
              style={styles.goButton}
              accessibilityRole="button"
              onPress={() => {
                reviewRef.current = false;
                setPhase('closed');
                void showGuidedTour();
              }}
            >
              <Text style={styles.goText}>{SETUP_OPEN_APP_LABEL}</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.textOnButton} />
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={[styles.page, { opacity: fade }]}>
            <View style={[styles.band, styles.bandAccent]}>
              <Text style={styles.caption}>{SETUP_HEADING}</Text>
              <Text style={styles.heading}>{part.name}</Text>
              <Text style={styles.lead}>{part.line}</Text>
              {isFirst ? <Text style={styles.caption}>{reviewRef.current ? SETUP_RERUN_LINE : SETUP_LEAD}</Text> : null}
            </View>
            {/* Just under the part's heading (direct request, 2026-10-28), so
                Back is in the same place on every page rather than under
                however long the page happens to be. */}
            {before ? (
              <View style={[styles.band, styles.links]}>
                <TouchableOpacity style={styles.link} accessibilityRole="button" onPress={() => setCurrent(before.key)}>
                  <Ionicons name="arrow-back" size={13} color={colors.primary} style={textShadow} />
                  <Text style={styles.linkText}>{SETUP_BACK_LABEL}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {isFirst ? (
              <View style={styles.band}>
                <Text style={styles.question}>{SETUP_HOW_HEADING}</Text>
                {SETUP_HOW_LINES.map((entry) => (
                  <View key={entry.label} style={styles.howRow}>
                    <Text style={styles.howLabel}>{entry.label}</Text>
                    <Text style={styles.caption}>{entry.line}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {last && last.settled ? (
              <View style={[styles.band, styles.answeredRow]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={textShadow} />
                <View style={styles.answeredText}>
                  <Text style={styles.caption}>
                    {last.kind === 'question' ? `${JUST_ANSWERED_LABEL}: ${last.title}` : last.title}
                  </Text>
                  {last.summary ? <Text style={styles.answeredLine}>{last.summary}</Text> : null}
                </View>
                <TouchableOpacity style={styles.link} accessibilityRole="button" onPress={() => setCurrent(last.key)}>
                  <Text style={styles.linkText}>{CHANGE_LABEL}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {step.kind === 'question' ? (
              <YourStoryInterview
                mode="setup"
                interview={interview}
                showKey={step.key}
                onAnswered={onAnswered}
                onChanged={() => void load()}
                go={go}
              />
            ) : (
              renderItem(step)
            )}
            {step.settled ? (
              <View style={styles.band}>
                <Text style={styles.caption}>{SETUP_KEEP_LINE}</Text>
                <TouchableOpacity style={styles.goButton} accessibilityRole="button" onPress={() => moveOn(step.key)}>
                  <Text style={styles.goText}>{SETUP_KEEP_LABEL}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.textOnButton} />
                </TouchableOpacity>
              </View>
            ) : null}
          </Animated.View>
        )}
        {phase === 'done' || !step ? null : (
          <View style={styles.band}>
            <TouchableOpacity
              style={styles.laterRow}
              accessibilityRole="button"
              onPress={() => {
                putOffThisRun = true;
                reviewRef.current = false;
                setPhase('closed');
              }}
            >
              <Text style={styles.laterLabel}>{SETUP_FINISH_LATER_LABEL}</Text>
              <Ionicons name="arrow-forward" size={13} color={colors.primary} style={textShadow} />
            </TouchableOpacity>
            <Text style={styles.caption}>{SETUP_FINISH_LATER_LINE}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFillObject, zIndex: 999, backgroundColor: colors.background },
  content: { gap: HOME_BAND_GAP, paddingTop: HOME_BAND_GAP },
  page: { gap: HOME_BAND_GAP },
  band: {
    ...homeBandStyle,
    borderColor: colors.border,
    padding: HOME_BAND_CONTENT_PADDING,
    gap: 8,
    backgroundColor: colors.surface,
  },
  bandAccent: { borderColor: colors.primary },
  heading: { ...typography.sectionTitle, color: colors.textPrimary, ...textShadow },
  question: { ...typography.bodyEmphasis, color: colors.textPrimary, ...textShadow },
  lead: { ...typography.body, color: colors.textSecondary, ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow, flexShrink: 1 },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, backgroundColor: colors.surface },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  linkText: { ...typography.caption, color: colors.primary, ...textShadow },
  linkMuted: { ...typography.caption, color: colors.textMuted, ...textShadow },
  answeredRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  answeredText: { flex: 1, gap: 1 },
  howRow: { gap: 1 },
  howLabel: { ...typography.body, color: colors.primary, ...textShadow },
  answeredLine: { ...typography.body, color: colors.textPrimary, ...textShadow },
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
  awayLater: { paddingVertical: 8 },
  awayLaterText: { ...typography.body, color: colors.textMuted, ...textShadow },
});
