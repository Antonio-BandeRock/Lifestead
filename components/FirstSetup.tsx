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
// 2026-11-02, direct request: one part of setup on screen at a time. First
// the parts of life to follow (components/BeatPicker.tsx, with Select all),
// then "where would you like to start" as a list of those parts. Opening one
// shows its questions, one at a time, then its setup cards, each with what it
// feeds (lib/setupSections.ts holds which questions and cards belong to which
// part, and every why). Done with this part or Skip this part goes back to
// the list, a done part dimmed and a skipped one moved to the end. With every
// part settled come the last questions: the neuro profile, backup, how
// records are kept closed, then how much Home shows, and then Home.
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
//
// In the tester version it waits for the tester gate (2026-10-31): setup
// drew over the gate, so a new tester met setup before being let in.
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { useFloatingButtonScrollPadding } from '../constants/floatingButton';
import { isTesterBuild } from '../lib/appVariant';
import { showGuidedTour } from '../lib/guidedTourDb';
import { testerDoorOpen, useTesterAccess } from '../lib/testerAccess';
import { cardDoneOn, cardWaitingOn, setupCardByKey, viewSetupCard, type SetupCardView } from '../lib/setupCards';
import { setStoryWalk, startStoryWalk } from '../lib/storyWalk';
import { startTutorials } from '../lib/tutorialDb';
import { SETUP_TUTORIALS_LABEL, SETUP_TUTORIALS_LINE } from '../lib/tutorials';
import { GUIDES, type GuideRecords } from '../lib/yourStoryGuides';
import { SETUP_AWAY_CAPTION, subscribeRunSetupAgain } from '../lib/setupFlow';
import {
  BEAT_LABELS,
  HEADING_TAKING_SHAPE,
  type BeatKey,
  type StoryDestination,
  type YourStoryItemKey,
  type YourStoryView,
} from '../lib/yourStory';
import {
  BEAT_START_PATH,
  CARD_WHY,
  CARD_WHY_LABEL,
  CLOSING_HEADING,
  REQUIRED_HEADING,
  REQUIRED_LEAD,
  requiredQuestions,
  LIST_ALL_SETTLED,
  LIST_CHANGE_PARTS_LABEL,
  LIST_FIRST_HEADING,
  LIST_LEAD,
  LIST_NEXT_HEADING,
  PART_DONE,
  PART_DONE_CAPTION,
  PART_SKIPPED,
  PART_SKIPPED_CAPTION,
  partAnswerKey,
  PARTS_NEXT_LABEL,
  SECTION_BACK_LABEL,
  SECTION_CARDS,
  SECTION_CARDS_HEADING,
  SECTION_CARDS_LEAD,
  SECTION_DONE_LABEL,
  SECTION_DONE_NEXT_LABEL,
  SECTION_SKIP_NEXT_LABEL,
  SECTION_QUESTION_FIRST,
  SECTION_SKIP_LABEL,
  SECTION_WHY,
  SECTION_WHY_LABEL,
  SETUP_PARTS_CHOSEN,
  SETUP_PARTS_KEY,
  closingQuestions,
  listParts,
  sectionQuestions,
  setupStage,
  setupWaiting,
  ON_RECORD_HEADING,
  ON_RECORD_LEAD,
  requiredOnRecord,
} from '../lib/setupSections';
import { explainNotYet } from '../lib/notYet';
import { t } from '../lib/i18n';
import { TAB_ROUTES } from '../constants/tabs';
import {
  SETUP_AWAY_SAVED_CARD,
  SETUP_CONTINUE_LABEL,
  SETUP_DONE_HEADING,
  SETUP_DONE_LINE,
  SETUP_FINISH_LATER_LABEL,
  SETUP_FINISH_LATER_LINE,
  SETUP_HEADING,
  SETUP_LEAD,
  SETUP_OPEN_APP_LABEL,
  SETUP_RETURN_LABEL,
  QUESTION_BY_KIND,
  type InterviewView,
} from '../lib/yourStoryInterview';
import { loadYourStoryEverything, setYourStoryAnswer } from '../lib/yourStoryInterviewDb';
import { BringToTopProvider, useBringToTopHost } from './BringToTop';
import { goToStoryDestination } from './GuidedTourHost';
import { GuideStripAnchor } from './GuideRoom';
import { useStoryWalk } from './StoryWalkHost';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandStyle } from './HomeSectionBand';
import { YourStoryInterview } from './YourStoryInterview';
import { BeatPicker } from './BeatPicker';
import { SetupCard } from './SetupCardShelves';
import { useInfoAlert } from './InfoAlert';
import { TesterWelcome } from './TesterWelcome';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';

// Finish Later lasts until the app next starts, so it is kept here rather
// than as an answer.
let putOffThisRun = false;

type Phase = 'reading' | 'asking' | 'away' | 'closed';

// Which part of setup is on screen; only one at a time (direct request,
// 2026-11-02: "none of the other parts are available on the screen until
// they select either Done ... or they choose to skip that section").
type Step = 'parts' | 'required' | 'list' | 'section' | 'closing';

const BEAT_ICONS: Record<BeatKey, keyof typeof Ionicons.glyphMap> = {
  health: 'medkit-outline',
  food: 'restaurant-outline',
  movement: 'walk-outline',
  home: 'home-outline',
  garden: 'leaf-outline',
  money: 'cash-outline',
  routines: 'repeat-outline',
  work: 'briefcase-outline',
  family: 'people-outline',
  interests: 'color-palette-outline',
};

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
  // The part of life being set up, or null for the list of parts.
  const [section, setSection] = useState<BeatKey | null>(null);
  // Change the parts of life, from the list.
  const [changingParts, setChangingParts] = useState(false);
  // The question on screen, held until it is answered or put off.
  const [held, setHeld] = useState<string | null>(null);
  // Questions answered this run, so one answered with a choice that does
  // not close it (a condition) is not shown again from a stale read.
  const [passed, setPassed] = useState<string[]>([]);
  const { width: windowWidth } = useWindowDimensions();
  const [showInfoAlert, infoAlertElement] = useInfoAlert();
  const [phase, setPhase] = useState<Phase>(putOffThisRun ? 'closed' : 'reading');
  // The card opened from setup, so the strip can name it and say once it
  // is saved; null for anything else opened from here.
  const [awayCard, setAwayCard] = useState<SetupCardView | null>(null);
  // The question that opened another screen (Add my medicines opens My
  // Meds), so the strip can say Saved once its record exists and offer to
  // carry on. 2026-11-13, direct report: after adding medicines nothing said
  // that setup was waiting with more to come.
  const [awayQuestion, setAwayQuestion] = useState<string | null>(null);
  const shownQuestionRef = useRef<string | null>(null);
  const walk = useStoryWalk();
  const scroller = useRef<ScrollView>(null);
  const frame = useRef<View>(null);
  const { bringToTop, onScroll } = useBringToTopHost(scroller, frame);
  // Run Setup Again shows setup even with nothing waiting.
  const reviewRef = useRef(false);
  const testerAccess = useTesterAccess();
  const gateOpen = !isTesterBuild() || testerDoorOpen(testerAccess);

  const load = useCallback(async (): Promise<InterviewView | null> => {
    try {
      const everything = await loadYourStoryEverything(false);
      const waiting = setupWaiting(everything.interview);
      setInterview(everything.interview);
      setView(everything.view);
      setRecords(everything.records);
      setPhase((was) => {
        if (was !== 'reading') return was;
        return waiting || reviewRef.current ? 'asking' : 'closed';
      });
      return everything.interview;
    } catch (error) {
      console.warn('Setup: could not read what is set up', error);
      setPhase('closed');
      return null;
    }
  }, []);

  useEffect(() => {
    if (putOffThisRun || !gateOpen) return;
    void load();
  }, [load, gateOpen]);

  useEffect(
    () =>
      subscribeRunSetupAgain(() => {
        putOffThisRun = false;
        reviewRef.current = true;
        setAwayCard(null);
        setSection(null);
        setChangingParts(false);
        setHeld(null);
        setPassed([]);
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
    (destination: StoryDestination, card: SetupCardView | null, fromQuestion: string | null = null) => {
      if (destination.kind === 'beats') return;
      setAwayCard(card);
      setAwayQuestion(fromQuestion);
      setPhase('away');
      goToStoryDestination(router, destination);
      const item = card?.def.item ?? (fromQuestion as YourStoryItemKey | null);
      const guideWalk = item ? guideWalkForItem(item) : null;
      if (guideWalk) startStoryWalk(guideWalk.guide, guideWalk.entryKey, !!card?.doneOn);
    },
    [router],
  );

  const goElsewhere = useCallback((destination: StoryDestination) => goAway(destination, null), [goAway]);
  const goFromQuestion = useCallback(
    (destination: StoryDestination) => goAway(destination, null, shownQuestionRef.current),
    [goAway],
  );
  const goCard = useCallback((card: SetupCardView) => goAway(card.def.destination, card), [goAway]);

  const comeBack = useCallback(() => {
    setStoryWalk(null);
    setAwayCard(null);
    setAwayQuestion(null);
    setPhase('asking');
    void load();
  }, [load]);

  const close = useCallback(() => {
    reviewRef.current = false;
    setPhase('closed');
  }, []);

  // After the last question, Home (direct request, 2026-11-02: "then they
  // see the Home screen"), with the tour strip started.
  const openApp = useCallback(() => {
    close();
    router.navigate('/');
    void showGuidedTour();
  }, [close, router]);

  const stage = interview ? setupStage(interview) : 'parts';
  // What the app needs comes before any part is opened (1.0.80.9).
  const step: Step =
    changingParts || stage === 'parts'
      ? 'parts'
      : stage === 'required'
        ? 'required'
        : section
          ? 'section'
          : stage === 'closing'
            ? 'closing'
            : 'list';
  const allDone = stage === 'finished';

  // Each step opens at the top, so the new question or part is the first
  // thing in view.
  const stepKey = `${step}:${section ?? ''}`;
  const shownStep = useRef(stepKey);
  useEffect(() => {
    if (shownStep.current === stepKey) return;
    shownStep.current = stepKey;
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, [stepKey]);

  // The question showing in a part or in the last questions. It is held
  // while it is being answered, since choosing one condition already counts
  // as an answer and the rest may still be chosen; Done, Later or a single
  // choice lets it go.
  const waitingQuestions =
    !interview
      ? []
      : step === 'required'
        ? requiredQuestions(interview)
        : step === 'section' && section
          ? sectionQuestions(interview, section)
          : step === 'closing'
            ? closingQuestions(interview)
            : [];
  const candidate = waitingQuestions.find((question) => !passed.includes(question.key)) ?? null;
  const candidateKey = candidate?.key ?? null;
  const shownQuestion = held ?? candidateKey;
  shownQuestionRef.current = shownQuestion;
  useEffect(() => {
    if (!held && candidateKey) setHeld(candidateKey);
  }, [held, candidateKey]);
  const answered = useCallback((key: string) => {
    setPassed((was) => (was.includes(key) ? was : [...was, key]));
    setHeld(null);
  }, []);

  const finishParts = useCallback(async () => {
    try {
      await setYourStoryAnswer(SETUP_PARTS_KEY, SETUP_PARTS_CHOSEN);
    } catch (error) {
      console.warn('Setup: could not keep the parts of life', error);
    }
    setChangingParts(false);
    await load();
  }, [load]);

  const openPart = useCallback(
    async (beat: BeatKey) => {
      // The first part chosen is where the tour starts too.
      if (interview && !interview.facts.answers.startTab) {
        try {
          await setYourStoryAnswer('startTab', BEAT_START_PATH[beat]);
        } catch (error) {
          console.warn('Setup: could not keep where to start', error);
        }
      }
      setHeld(null);
      setSection(beat);
      await load();
    },
    [interview, load],
  );

  const settlePart = useCallback(
    async (beat: BeatKey, how: typeof PART_DONE | typeof PART_SKIPPED) => {
      try {
        await setYourStoryAnswer(partAnswerKey(beat), how);
      } catch (error) {
        console.warn('Setup: could not keep how a part was left', error);
      }
      setHeld(null);
      // 2026-11-13, direct instruction: setup "should always continue ... to
      // the next and the next and the next thing after that until all things
      // have been setup from the sections of the app the user chose". So
      // Done or Skip opens the next part still open, and only once none is
      // left do the last questions come. Back to the list stays for choosing
      // a different one.
      const fresh = await load();
      const next = fresh ? listParts(fresh).find((part) => part.state === 'open' && part.beat !== beat) : undefined;
      setSection(next ? next.beat : null);
    },
    [load],
  );

  // A guide walk on the same card already says what to do, at the top of
  // the screen (1.0.75.5): the strip here then drops its own copy and keeps
  // only its button on one row.
  const walking = !!walk;

  if (!gateOpen || phase === 'reading' || phase === 'closed' || !interview) return null;

  if (phase === 'away') {
    const saved = awayCard
      ? !!view && !!cardDoneOn(awayCard.def, view, records)
      : !!awayQuestion && !!interview.questions.find((question) => question.key === awayQuestion)?.answered;
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
              <Text style={styles.awayButtonText}>{saved ? SETUP_CONTINUE_LABEL : SETUP_RETURN_LABEL}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GuideStripAnchor>
    );
  }

  const shown = interview;

  function renderQuestion() {
    if (!shownQuestion) return null;
    return (
      <YourStoryInterview
        mode="setup"
        interview={shown}
        showKey={shownQuestion}
        onAnswered={answered}
        onChanged={() => void load()}
        go={goFromQuestion}
      />
    );
  }

  function renderParts() {
    const def = QUESTION_BY_KIND.beats;
    return (
      <View style={styles.band}>
        <Text style={styles.heading}>{def.question}</Text>
        <Text style={styles.lead}>{def.why}</Text>
        <BeatPicker showQuestion={false} selectAll doneLabel={PARTS_NEXT_LABEL} onDone={() => void finishParts()} onChanged={() => void load()} />
      </View>
    );
  }

  function renderList() {
    const parts = listParts(shown);
    const first = parts.every((part) => part.state === 'open');
    return (
      <View style={styles.band}>
        <Text style={styles.heading}>{allDone ? LIST_ALL_SETTLED : first ? LIST_FIRST_HEADING : LIST_NEXT_HEADING}</Text>
        {allDone ? null : <Text style={styles.lead}>{LIST_LEAD}</Text>}
        <View style={styles.parts}>
          {parts.map((part) => {
            const caption = part.state === 'done' ? PART_DONE_CAPTION : part.state === 'skipped' ? PART_SKIPPED_CAPTION : null;
            return (
              <TouchableOpacity
                key={part.beat}
                style={[styles.part, part.state === 'done' && styles.partDone]}
                accessibilityRole="button"
                accessibilityLabel={caption ? `${BEAT_LABELS[part.beat]}. ${caption}` : BEAT_LABELS[part.beat]}
                onPress={() => void openPart(part.beat)}
              >
                <Ionicons
                  name={part.state === 'done' ? 'checkmark-circle' : BEAT_ICONS[part.beat]}
                  size={22}
                  color={part.state === 'done' ? colors.statusGreenOnSurface : colors.primary}
                  style={textShadow}
                />
                <View style={styles.partText}>
                  <Text style={styles.partLabel}>{BEAT_LABELS[part.beat]}</Text>
                  {caption ? <Text style={styles.caption}>{caption}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={textShadow} />
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.laterRow} accessibilityRole="button" onPress={() => setChangingParts(true)}>
          <Text style={styles.laterLabel}>{LIST_CHANGE_PARTS_LABEL}</Text>
          <Ionicons name="arrow-forward" size={13} color={colors.primary} style={textShadow} />
        </TouchableOpacity>
      </View>
    );
  }

  function renderSection(beat: BeatKey) {
    if (!view) return null;
    const questionWaiting = !!shownQuestion;
    const cards = SECTION_CARDS[beat]
      .map((key) => setupCardByKey(key))
      .filter((found): found is NonNullable<typeof found> => !!found)
      // A card that needs one with nothing recorded is skipped with it:
      // Later or I take nothing on medicines leaves Dose times out.
      .filter((found) => !cardWaitingOn(found.def, view, records))
      .map((found) => ({
        card: viewSetupCard(found.def, view, records),
        color: TAB_ROUTES.find((route) => route.path === found.tabPath)?.color ?? colors.primary,
      }));
    const cardWidth = Math.min(windowWidth - HOME_BAND_CONTENT_PADDING * 2, 480);
    // Which part opens after this one, named on the buttons.
    const nextPart = listParts(shown).find((part) => part.state === 'open' && part.beat !== beat) ?? null;
    const nextName = nextPart ? t(BEAT_LABELS[nextPart.beat]) : null;
    return (
      <>
        <View style={[styles.band, styles.bandAccent]}>
          <View style={styles.partHead}>
            <Ionicons name={BEAT_ICONS[beat]} size={22} color={colors.primary} style={textShadow} />
            <Text style={styles.heading}>{BEAT_LABELS[beat]}</Text>
          </View>
          <Text style={styles.caption}>{SECTION_WHY_LABEL}</Text>
          <Text style={styles.lead}>{SECTION_WHY[beat]}</Text>
        </View>
        {questionWaiting ? renderQuestion() : null}
        {!questionWaiting && cards.length > 0 ? (
          <View style={styles.band}>
            <Text style={styles.heading}>{SECTION_CARDS_HEADING}</Text>
            <Text style={styles.lead}>{SECTION_CARDS_LEAD}</Text>
            {cards.map(({ card, color }) => (
              <View key={card.def.key} style={styles.cardWrap}>
                <SetupCard
                  card={card}
                  tabColor={color}
                  width={cardWidth}
                  view={view}
                  go={goElsewhere}
                  explain={showInfoAlert}
                  onCardGo={goCard}
                />
                {CARD_WHY[card.def.key] ? (
                  <View style={styles.cardWhy}>
                    <Text style={styles.caption}>{CARD_WHY_LABEL}</Text>
                    <Text style={styles.lead}>{CARD_WHY[card.def.key]}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.band}>
          <View style={styles.sectionButtons}>
            <TouchableOpacity
              style={styles.goButton}
              accessibilityRole="button"
              onPress={() => {
                if (questionWaiting) {
                  explainNotYet(SECTION_QUESTION_FIRST);
                  return;
                }
                void settlePart(beat, PART_DONE);
              }}
            >
              <Ionicons name="checkmark" size={16} color={colors.textOnButton} />
              <Text style={styles.goText}>{nextName ? t(SECTION_DONE_NEXT_LABEL, { part: nextName }) : SECTION_DONE_LABEL}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondButton} accessibilityRole="button" onPress={() => void settlePart(beat, PART_SKIPPED)}>
              <Text style={styles.secondText}>{nextName ? t(SECTION_SKIP_NEXT_LABEL, { part: nextName }) : SECTION_SKIP_LABEL}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.laterRow}
            accessibilityRole="button"
            onPress={() => {
              setHeld(null);
              setSection(null);
            }}
          >
            <Ionicons name="arrow-back" size={13} color={colors.primary} style={textShadow} />
            <Text style={styles.laterLabel}>{SECTION_BACK_LABEL}</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // What is already answered, so a question left out reads as kept rather
  // than gone. On the required step, the list of parts and the last
  // questions, since when everything was on record the required step never
  // shows.
  function renderOnRecord() {
    if (!interview) return null;
    const rows = requiredOnRecord(interview, shownQuestion);
    if (rows.length === 0) return null;
    return (
      <View style={styles.band}>
        <Text style={styles.heading}>{ON_RECORD_HEADING}</Text>
        <Text style={styles.lead}>{ON_RECORD_LEAD}</Text>
        <View style={styles.parts}>
          {rows.map((row) => {
            const name = row.condition ? t('Healing stage for {condition}', { condition: row.condition }) : row.name;
            return (
            <TouchableOpacity
              key={row.key}
              style={styles.part}
              accessibilityRole="button"
              accessibilityLabel={row.summary ? `${name}. ${row.summary}` : name}
              onPress={() => (row.destination.kind === 'beats' ? setChangingParts(true) : goElsewhere(row.destination))}
            >
              <Ionicons name="checkmark-circle" size={22} color={colors.statusGreenOnSurface} style={textShadow} />
              <View style={styles.partText}>
                <Text style={styles.partLabel}>{name}</Text>
                {row.summary ? <Text style={styles.caption}>{row.summary}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={textShadow} />
            </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  function renderRequired() {
    return (
      <>
        <View style={styles.band}>
          <Text style={styles.heading}>{REQUIRED_HEADING}</Text>
          <Text style={styles.lead}>{REQUIRED_LEAD}</Text>
        </View>
        {renderQuestion()}
        {renderOnRecord()}
      </>
    );
  }

  function renderClosing() {
    return (
      <>
        <View style={styles.band}>
          <Text style={styles.heading}>{CLOSING_HEADING}</Text>
        </View>
        {renderQuestion()}
        {renderOnRecord()}
      </>
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
                  <TouchableOpacity style={styles.goButton} accessibilityRole="button" onPress={openApp}>
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
            {step === 'parts' ? renderParts() : null}
            {step === 'required' ? renderRequired() : null}
            {step === 'list' ? renderList() : null}
            {step === 'list' ? renderOnRecord() : null}
            {step === 'section' && section ? renderSection(section) : null}
            {step === 'closing' ? renderClosing() : null}
            {isTesterBuild() && step === 'list' ? (
              <View style={styles.band}>
                <TesterWelcome showHeading />
              </View>
            ) : null}
          </ScrollView>
        </BringToTopProvider>
      </View>
      {infoAlertElement}
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
    ...BUTTON_PRIMARY_COMPACT,
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'flex-start',
  },
  goText: { ...BUTTON_PRIMARY_TEXT },
  secondButton: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  secondText: { ...BUTTON_SECONDARY_TEXT },
  sectionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  parts: { gap: 6 },
  part: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  // A part already set up, dimmed so the next one stands out.
  partDone: { opacity: 0.55 },
  partText: { flex: 1, gap: 1 },
  partLabel: { ...typography.body, color: colors.textPrimary, ...textShadow },
  partHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardWrap: { gap: 6 },
  cardWhy: { gap: 2 },
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
    ...BUTTON_PRIMARY_COMPACT,
    flexDirection: 'row',
    gap: 6,
  },
  awayButtonText: { ...BUTTON_PRIMARY_TEXT },
});
