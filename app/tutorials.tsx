// Tutorials (1.0.68.14), opened from Profile and offered when setup is done.
//
// Direct request, 2026-10-12: "If they need to, they can go through any of
// the tutorials for any tab individually or in succession any time by
// selecting it in Profile." So this page starts a run of any size: every
// tab from the beginning, one tab, one tab and every tab after it, one lens,
// or one how-to on a lens. A run that was stopped can be carried on from
// where it stopped.
//
// Tabs are listed with the one chosen in setup first, the same order a run
// from the beginning takes. Each tab folds open to its lenses, and each lens
// to its how-tos. A how-to gone through before carries a tick and nothing
// more: no count, no figure, nothing that grades anybody.
//
// Every how-to can also be read rather than run (1.0.68.16): Read it lists
// its lines, numbered, each with a picture of that moment on the phone
// beside it once one has been taken (lib/tutorialShots.ts). The written
// lines are the same on every plan, since reading how a thing works is not
// the thing itself.
//
// Read it in Tutorials on a tab's card on Home (2026-10-28) opens this
// page with that tab and that lens folded open, and scrolled to the tab;
// the page itself is unchanged, by direct instruction ("the profile area
// should remain as is").
//
// Starting a run goes to Home first, where the round button is, so the
// tutorial's first line ("Tap the round button and choose ...") is true.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useRef, useState, type ComponentProps } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CalmBands, HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandNoHairlines, homeBandStyle } from '../components/HomeSectionBand';
import { colors } from '../constants/colors';
import { useFloatingButtonScrollPadding } from '../constants/floatingButton';
import { textShadow, typography } from '../constants/typography';
import { loadTutorialState, resumeTutorials, startTutorials, type TutorialState } from '../lib/tutorialDb';
import { currentHowToKey } from '../lib/tutorialRun';
import { TUTORIAL_SHOTS } from '../lib/tutorialShots';
import {
  CARRY_ON_LABEL,
  DONE_BEFORE_LABEL,
  HIDE_READ_LABEL,
  HIDE_STEPS_LABEL,
  NO_SHOT_YET_LINE,
  READ_STEPS_LABEL,
  SHOW_STEPS_LABEL,
  START_ALL_LABEL,
  START_ALL_LINE,
  START_FROM_TAB_LABEL,
  START_LENS_LABEL,
  START_TAB_LABEL,
  TUTORIALS_HEADING,
  TUTORIALS_LEAD,
  howToByKey,
  writtenSteps,
  type HowTo,
  type TutorialScope,
} from '../lib/tutorials';

export default function TutorialsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ openTab?: string; openLens?: string }>();
  const scrollPadding = useFloatingButtonScrollPadding();
  const scrollRef = useRef<ScrollView>(null);
  // Scrolled to once, the first time the tab asked for is laid out.
  const scrolledTo = useRef(false);
  const [state, setState] = useState<TutorialState | null>(null);
  const [openTabs, setOpenTabs] = useState<Set<string>>(() => new Set(params.openTab ? [params.openTab] : []));
  const [openLenses, setOpenLenses] = useState<Set<string>>(() => new Set(params.openLens ? [params.openLens] : []));
  const [openReads, setOpenReads] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let live = true;
      loadTutorialState()
        .then((found) => {
          if (live) setState(found);
        })
        .catch((error) => console.warn('Tutorials: could not read', error));
      return () => {
        live = false;
      };
    }, []),
  );

  const toHome = () => router.navigate('/' as Href);

  const start = async (scope: TutorialScope) => {
    if (await startTutorials(scope)) toHome();
  };

  const carryOn = async () => {
    if (await resumeTutorials()) toHome();
  };

  const toggle = (set: Set<string>, key: string, apply: (next: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  };

  const resumeKey = state?.resume ? currentHowToKey(state.resume) : null;
  const resumeAt = state && resumeKey ? howToByKey(state.tabs).get(resumeKey) ?? null : null;

  return (
    <CalmBands>
      <View style={styles.screen}>
        <Stack.Screen options={{ title: TUTORIALS_HEADING }} />
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]}>
          <View style={styles.card}>
            <Text style={styles.lead}>{TUTORIALS_LEAD}</Text>
            <Action icon="play" label={START_ALL_LABEL} line={START_ALL_LINE} onPress={() => void start({ kind: 'all' })} filled />
            {resumeAt ? (
              <Action
                icon="play-forward"
                label={CARRY_ON_LABEL}
                line={`${resumeAt.lens.lens ? `${resumeAt.tab.title}, ${resumeAt.lens.name}` : resumeAt.tab.title}: ${resumeAt.howTo.title}`}
                onPress={() => void carryOn()}
              />
            ) : null}
          </View>

          {state?.tabs.map((tab) => {
            const tabOpen = openTabs.has(tab.path);
            return (
              <View
                key={tab.path}
                style={styles.card}
                onLayout={
                  tab.path === params.openTab
                    ? (event) => {
                        if (scrolledTo.current) return;
                        scrolledTo.current = true;
                        scrollRef.current?.scrollTo({ y: event.nativeEvent.layout.y, animated: true });
                      }
                    : undefined
                }
              >
                <TouchableOpacity
                  style={styles.foldRow}
                  onPress={() => toggle(openTabs, tab.path, setOpenTabs)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: tabOpen }}
                >
                  <Text style={styles.tabTitle}>{tab.title}</Text>
                  <Ionicons name={tabOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.tabProfileText} style={textShadow} />
                </TouchableOpacity>
                {tabOpen ? (
                  <>
                    <Text style={styles.caption}>{tab.answer}</Text>
                    <View style={styles.buttonRow}>
                      <SmallButton icon="play" label={START_TAB_LABEL} onPress={() => void start({ kind: 'tab', path: tab.path })} />
                      <SmallButton
                        icon="play-forward"
                        label={START_FROM_TAB_LABEL}
                        onPress={() => void start({ kind: 'fromTab', path: tab.path })}
                      />
                    </View>
                    {tab.lenses.map((lens) => {
                      const lensOpen = openLenses.has(lens.key);
                      const allDone = lens.howTos.every((howTo) => state.doneKeys.has(howTo.key));
                      return (
                        <View key={lens.key} style={styles.lensRow}>
                          <View style={styles.lensHead}>
                            <View style={styles.lensText}>
                              <Text style={styles.lensName}>
                                {lens.name}
                                {allDone ? '  ' : ''}
                                {allDone ? <Ionicons name="checkmark" size={15} color={colors.primary} accessibilityLabel={DONE_BEFORE_LABEL} /> : null}
                              </Text>
                              {lens.line ? <Text style={styles.caption}>{lens.line}</Text> : null}
                            </View>
                            <SmallButton icon="play" label={START_LENS_LABEL} onPress={() => void start({ kind: 'lens', key: lens.key })} />
                          </View>
                          {lens.howTos.length > 0 ? (
                            <TouchableOpacity
                              onPress={() => toggle(openLenses, lens.key, setOpenLenses)}
                              accessibilityRole="button"
                              accessibilityState={{ expanded: lensOpen }}
                            >
                              <Text style={styles.link}>{lensOpen ? HIDE_STEPS_LABEL : SHOW_STEPS_LABEL}</Text>
                            </TouchableOpacity>
                          ) : null}
                          {lensOpen
                            ? lens.howTos.map((howTo) => (
                                <View key={howTo.key} style={styles.howToBlock}>
                                <TouchableOpacity
                                  style={styles.howToRow}
                                  onPress={() => void start({ kind: 'howTo', key: howTo.key })}
                                  accessibilityRole="button"
                                >
                                  <Ionicons
                                    name={state.doneKeys.has(howTo.key) ? 'checkmark-circle-outline' : 'play-circle-outline'}
                                    size={18}
                                    color={colors.primary}
                                    style={textShadow}
                                    accessibilityLabel={state.doneKeys.has(howTo.key) ? DONE_BEFORE_LABEL : undefined}
                                  />
                                  <Text style={styles.howToTitle}>{howTo.title}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => toggle(openReads, howTo.key, setOpenReads)}
                                  accessibilityRole="button"
                                  accessibilityState={{ expanded: openReads.has(howTo.key) }}
                                >
                                  <Text style={[styles.link, styles.readLink]}>{openReads.has(howTo.key) ? HIDE_READ_LABEL : READ_STEPS_LABEL}</Text>
                                </TouchableOpacity>
                                {openReads.has(howTo.key) ? <WrittenSteps howTo={howTo} /> : null}
                                </View>
                              ))
                            : null}
                        </View>
                      );
                    })}
                  </>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </CalmBands>
  );
}

type IconName = ComponentProps<typeof Ionicons>['name'];

function WrittenSteps({ howTo }: { howTo: HowTo }) {
  return (
    <View style={styles.written}>
      {writtenSteps(howTo).map((step, index) => {
        const shot = TUTORIAL_SHOTS[step.shot];
        return (
          <View key={`${step.shot}-${index}`} style={styles.writtenStep}>
            <Text style={styles.writtenNumber}>{index + 1}.</Text>
            <View style={styles.writtenBody}>
              <Text style={styles.writtenLine}>{step.say}</Text>
              {shot ? (
                <Image
                  source={shot.source}
                  style={[styles.shot, { aspectRatio: shot.width / shot.height }]}
                  resizeMode="contain"
                  accessibilityLabel={step.say}
                />
              ) : (
                <Text style={styles.caption}>{NO_SHOT_YET_LINE}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Action({ icon, label, line, onPress, filled }: { icon: IconName; label: string; line: string; onPress: () => void; filled?: boolean }) {
  return (
    <TouchableOpacity style={[styles.action, filled ? styles.actionFilled : null]} onPress={onPress} accessibilityRole="button">
      {filled ? (
        <Ionicons name={icon} size={20} color={colors.textOnButton} />
      ) : (
        <Ionicons name={icon} size={20} color={colors.primary} style={textShadow} />
      )}
      <View style={styles.actionText}>
        <Text style={[styles.actionLabel, filled ? styles.actionLabelFilled : null]}>{label}</Text>
        <Text style={[styles.actionLine, filled ? styles.actionLineFilled : null]}>{line}</Text>
      </View>
    </TouchableOpacity>
  );
}

function SmallButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.smallButton} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={14} color={colors.primary} style={textShadow} />
      <Text style={styles.smallButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: HOME_BAND_GAP },
  card: {
    ...homeBandStyle,
    ...homeBandNoHairlines,
    borderColor: colors.tabProfile,
    padding: HOME_BAND_CONTENT_PADDING,
    gap: 10,
  },
  lead: { ...typography.body, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  actionFilled: { backgroundColor: colors.primary },
  actionText: { flex: 1, gap: 2 },
  actionLabel: { ...typography.bodyEmphasis, color: colors.primary, fontWeight: '400', ...textShadow },
  actionLabelFilled: { color: colors.textOnButton, textShadowColor: 'transparent', textShadowRadius: 0 },
  actionLine: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  actionLineFilled: { color: colors.textOnButton, textShadowColor: 'transparent', textShadowRadius: 0 },
  foldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  tabTitle: { ...typography.sectionTitle, color: colors.tabProfileText, fontWeight: '400', flex: 1, ...textShadow },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 6 },
  smallButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  smallButtonText: { ...typography.body, color: colors.primary, ...textShadow },
  lensRow: { gap: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  lensHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  lensText: { flex: 1, gap: 2 },
  lensName: { ...typography.body, color: colors.textPrimary, ...textShadow },
  link: { ...typography.caption, color: colors.primary, paddingVertical: 4, ...textShadow },
  howToBlock: { gap: 0 },
  readLink: { paddingLeft: 32 },
  written: { gap: 12, paddingLeft: 32, paddingBottom: 6 },
  writtenStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  writtenNumber: { ...typography.body, color: colors.textSecondary, ...textShadow },
  writtenBody: { flex: 1, gap: 6 },
  writtenLine: { ...typography.body, color: colors.textPrimary, ...textShadow },
  shot: { width: '70%', borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  howToRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6, paddingLeft: 6 },
  howToTitle: { ...typography.body, color: colors.textPrimary, flex: 1, ...textShadow },
});
