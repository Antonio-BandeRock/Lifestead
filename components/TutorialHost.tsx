// The tutorial strip (1.0.68.14): the line to do now, at the top of every
// screen while a tutorial runs. Mounted once at the app root beside
// StoryWalkHost, and drawn the same way, so a tutorial and Walk me through
// it look and move alike. What goes in each tutorial is lib/tutorials.ts;
// the run itself is lib/tutorialRun.ts.
//
// A line moves on by itself when the screen it names opens or the ringed
// button is tapped; Next moves on from anything, and Next on a how-to's
// last line goes on to the next how-to. Skip this one jumps there straight
// away, and Stop ends the run, keeping where it stopped so Profile can carry
// on from there.
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import {
  WALK_BACK_LABEL,
  WALK_GROW_LABEL,
  WALK_NEXT_LABEL,
  WALK_SHRINK_LABEL,
  canStepBack,
  setWalkMark,
  subscribeStoryWalk,
  tapMovesOn,
  walkBack,
  walkNext,
  walkPosition,
} from '../lib/storyWalk';
import { currentTellClaudeScreen, subscribeTellClaudeScreen, type TellClaudeScreen } from '../lib/tellClaude';
import { markHowToGoneThrough, saveTutorialResume } from '../lib/tutorialDb';
import {
  currentHowToKey,
  getTutorialRun,
  nextHowTo,
  runFinished,
  setTutorialRun,
  subscribeTutorialRun,
  type TutorialRun,
} from '../lib/tutorialRun';
import {
  TUTORIAL_CAPTION,
  TUTORIAL_CLOSE_LABEL,
  TUTORIAL_FINISHED_LINE,
  TUTORIAL_SKIP_LABEL,
  TUTORIAL_STOP_LABEL,
  buildTutorials,
  howToByKey,
} from '../lib/tutorials';
import { SHOW_ME_LABEL, requestShowMe, subscribeSpotTapped } from '../lib/walkSpots';
import { WalkButton } from './StoryWalkHost';

export function useTutorialRun(): TutorialRun | null {
  const [run, setRun] = useState<TutorialRun | null>(getTutorialRun);
  useEffect(() => {
    setRun(getTutorialRun());
    return subscribeTutorialRun(setRun);
  }, []);
  return run;
}

function useReportedScreen(): TellClaudeScreen {
  const [screen, setScreen] = useState<TellClaudeScreen>(currentTellClaudeScreen);
  useEffect(() => {
    setScreen(currentTellClaudeScreen());
    return subscribeTellClaudeScreen(setScreen);
  }, []);
  return screen;
}

export function TutorialHost() {
  const run = useTutorialRun();
  const pathname = usePathname();
  const screen = useReportedScreen();
  const insets = useSafeAreaInsets();
  const [small, setSmall] = useState(false);
  // The keys and lines are the same whichever tab comes first, so one
  // lookup serves every run.
  const byKey = useMemo(() => howToByKey(buildTutorials(null)), []);

  // A guide walk started from anywhere ends the tutorial, keeping its place.
  useEffect(
    () =>
      subscribeStoryWalk((walk) => {
        if (walk && getTutorialRun()) setTutorialRun(null);
      }),
    [],
  );

  const key = run ? currentHowToKey(run) : null;
  const found = key ? byKey.get(key) ?? null : null;
  const steps = useMemo(() => found?.howTo.steps ?? [], [found]);
  const place = { pathname, tab: screen.tab, lens: screen.lens };
  const at = run && found ? walkPosition(steps, run.cursor, run.skipped, place) : 0;
  const step = found && at < steps.length ? steps[at] : null;
  const finished = !!run && runFinished(run);

  useEffect(() => {
    setSmall(false);
  }, [key]);

  // Where a run stops is kept, so Profile can carry on from there.
  useEffect(() => {
    if (run) void saveTutorialResume(run);
  }, [run]);

  const mark = step?.mark ?? null;
  useEffect(() => {
    setWalkMark(mark, 'tutorial');
  }, [mark]);
  useEffect(() => () => setWalkMark(null, 'tutorial'), []);

  // Past the last line of a how-to, on to the next one.
  const goOn = (from: TutorialRun) => {
    const doneKey = currentHowToKey(from);
    if (doneKey) void markHowToGoneThrough(doneKey);
    setTutorialRun(nextHowTo(from));
  };

  const next = (from: TutorialRun, atNow: number) => {
    if (atNow + 1 >= steps.length) goOn(from);
    else setTutorialRun(walkNext(from, steps, atNow));
  };

  const latestRef = useRef({ run, at, step, next });
  latestRef.current = { run, at, step, next };
  useEffect(
    () =>
      subscribeSpotTapped((name) => {
        const now = latestRef.current;
        if (!now.run || !tapMovesOn(now.step, name)) return;
        now.next(now.run, now.at);
      }),
    [],
  );

  // A run whose how-to went missing (an update renamed it) moves past it.
  useEffect(() => {
    if (run && !finished && !found) setTutorialRun(nextHowTo(run));
  }, [run, finished, found]);

  // Reached by itself past a how-to's last line (a screen opened): go on.
  useEffect(() => {
    if (run && found && !finished && at >= steps.length) goOn(run);
  }, [run, found, finished, at, steps.length]);

  if (!run) return null;
  if (!finished && !found) return null;

  const stop = () => setTutorialRun(null);
  const close = () => {
    setTutorialRun(null);
    void saveTutorialResume(null);
  };

  const where = found ? (found.lens.lens ? `${found.tab.title}, ${found.lens.name}` : found.tab.title) : null;
  const say = finished ? TUTORIAL_FINISHED_LINE : step?.say ?? '';

  return (
    <View pointerEvents="box-none" style={[styles.anchor, { top: insets.top + 6 }]}>
      <View style={styles.strip} accessibilityLiveRegion="polite">
        {small || !found ? null : (
          <Text style={styles.caption} numberOfLines={2}>
            {TUTORIAL_CAPTION}, {where}: {found.howTo.title}
          </Text>
        )}
        <View style={styles.sayRow}>
          <Ionicons name={finished ? 'checkmark-circle' : 'school-outline'} size={18} color={colors.primary} style={textShadow} />
          <Text style={styles.say} numberOfLines={small ? 2 : undefined}>
            {say}
          </Text>
          <TouchableOpacity
            onPress={() => setSmall((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={small ? WALK_GROW_LABEL : WALK_SHRINK_LABEL}
            hitSlop={10}
          >
            <Ionicons name={small ? 'chevron-down' : 'chevron-up'} size={18} color={colors.primary} style={textShadow} />
          </TouchableOpacity>
        </View>
        {small ? null : (
          <View style={styles.actions}>
            {finished ? (
              <WalkButton icon="close" label={TUTORIAL_CLOSE_LABEL} onPress={close} />
            ) : (
              <>
                {canStepBack(steps, at) ? (
                  <WalkButton icon="arrow-back" label={WALK_BACK_LABEL} onPress={() => setTutorialRun(walkBack(run, at))} />
                ) : null}
                <WalkButton icon="arrow-forward" label={WALK_NEXT_LABEL} onPress={() => next(run, at)} />
                {mark ? <WalkButton icon="hand-left-outline" label={SHOW_ME_LABEL} onPress={requestShowMe} /> : null}
                <WalkButton icon="play-skip-forward-outline" label={TUTORIAL_SKIP_LABEL} onPress={() => setTutorialRun(nextHowTo(run))} />
                <WalkButton icon="close" label={TUTORIAL_STOP_LABEL} onPress={stop} />
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', left: 12, right: 12 },
  strip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  caption: { ...typography.caption, color: colors.textMuted, ...textShadow },
  sayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  say: { ...typography.body, color: colors.textPrimary, flex: 1, ...textShadow },
  actions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 },
});
