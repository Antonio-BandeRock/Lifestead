// One course (2026-11-05): its study path, the sitting, the choices and the plain
// counts. Every decision is in the pure lib/learnCourse*.ts modules.
//
// A written exception to the rest of Learn: this screen says how many cards are
// ready today, because a course is studied on a path and the brief asked for it. It
// never says overdue or late, and a day away takes nothing from any count here. The
// share of answers stays behind How It Has Gone, like everywhere else.
//
// Answers are kept as they are made, and the schedule is only worked out again when
// a sitting ends, so grading a card never waits on a replay of the whole course.
// Card content, unit names, groups and sources stay in the course's language through
// CourseText and asWritten; everything around them follows the app.

import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppActionSheet } from '../components/AppActionSheet';
import { CourseCardView } from '../components/CourseCardView';
import { CourseText } from '../components/CourseText';
import { CalmBands, HOME_BAND_ACCENT_WIDTH } from '../components/HomeSectionBand';
import { useInfoAlert } from '../components/InfoAlert';
import { LearnHowItHasGone } from '../components/LearnHowItHasGone';
import { PopoverSelect } from '../components/PopoverSelect';
import { TabBand, useTabBandStyles } from '../components/TabBand';
import { useWalkMark } from '../components/WalkMark';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT, PILL_ON, PILL_ON_TEXT, PILL_SMALL, PILL_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { useFloatingButtonScrollPadding } from '../constants/floatingButton';
import { textShadow, typography } from '../constants/typography';
import { useBandFolds } from '../hooks/useBandFolds';
import { useCourseVoice } from '../hooks/useCourseVoice';
import { t } from '../lib/i18n';
import { localDayOf } from '../lib/interests';
import { courseCardLayout } from '../lib/learnCourseCard';
import type { CourseCard } from '../lib/learnCourseFile';
import {
  courseStats,
  filterChoices,
  hasFilter,
  newLeftToday,
  planFilterSitting,
  planMixSitting,
  planPathSitting,
  unitStandings,
  type CourseFilter,
  type CourseSitting,
} from '../lib/learnCoursePath';
import { replayCourse } from '../lib/learnCourseSchedule';
import { addCourseAnswer, getCourseSettings, listCourseReviews, loadCourse, removeImportedCourse, saveCourseSettings, type CourseSettings, type OpenedCourse } from '../lib/learnCoursesDb';
import type { LearnDeck } from '../lib/learnDecks';
import type { LearnGrade, LearnReview } from '../lib/learnSchedule';
import { explainNotYet } from '../lib/notYet';

const TAB_COLOR = colors.tabInterests;
const NO_DECKS: LearnDeck[] = [];
const DAILY_CHOICES = [5, 10, 15, 20, 30, 50];
const ANY = '__any';

const TYPE_LABELS: Record<string, string> = {
  Rule: 'Rule',
  Word: 'Word',
  Phrase: 'Phrase',
  Set: 'Set of forms',
  'Contrast pair': 'Contrast pair',
  Verb: 'Verb',
};
const STATUS_LABELS: Record<string, string> = { Core: 'Core cards', Recognize: 'Cards to recognize' };

type Sitting = { queue: string[]; index: number; practised: string[]; kept: LearnReview[] };

function today(): string {
  return localDayOf(new Date().toISOString());
}

export default function LearnCourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = typeof id === 'string' ? id : '';
  const router = useRouter();
  const walkMark = useWalkMark();
  const scrollPadding = useFloatingButtonScrollPadding();
  const bands = useTabBandStyles(TAB_COLOR);
  const folds = useBandFolds();
  const [showInfoAlert, infoAlertElement] = useInfoAlert();

  const [course, setCourse] = useState<OpenedCourse | null>(null);
  const [missing, setMissing] = useState(false);
  const [settings, setSettings] = useState<CourseSettings | null>(null);
  const [reviews, setReviews] = useState<LearnReview[]>([]);
  const [sitting, setSitting] = useState<Sitting | null>(null);
  const [doneLine, setDoneLine] = useState<string | null>(null);
  const [filter, setFilter] = useState<CourseFilter>({});
  const [askRemove, setAskRemove] = useState(false);

  const load = useCallback(() => {
    if (!courseId) {
      setMissing(true);
      return;
    }
    Promise.all([loadCourse(courseId), getCourseSettings(courseId), listCourseReviews(courseId)])
      .then(([opened, kept, answers]) => {
        setCourse(opened);
        setMissing(!opened);
        setSettings(kept);
        setReviews(answers);
      })
      .catch(() => setMissing(true));
  }, [courseId]);

  useFocusEffect(load);

  const day = today();
  const cards = useMemo(() => course?.cards ?? [], [course]);
  const cardById = useMemo(() => new Map<string, CourseCard>(cards.map((card) => [card.id, card])), [cards]);
  const states = useMemo(() => replayCourse(reviews), [reviews]);
  const choices = useMemo(() => filterChoices(cards), [cards]);
  const hasVerbTable = useMemo(() => cards.some((card) => card.type === 'Verb' && courseCardLayout(card).kind === 'verb'), [cards]);
  const openedByHand = useMemo(() => settings?.openedUnits ?? [], [settings]);
  const dailyLimit = settings?.dailyNewLimit ?? 15;
  const standings = useMemo(() => unitStandings(cards, states, openedByHand, day), [cards, states, openedByHand, day]);
  const answeredToday = useMemo(() => new Set(reviews.filter((review) => review.day === day).map((review) => review.cardId)), [reviews, day]);
  const stats = useMemo(() => courseStats(cards, states, reviews.map((review) => review.day), day), [cards, states, reviews, day]);

  const deck = course?.deck ?? null;
  const voice = useCourseVoice(deck?.targetCode ?? '', deck?.targetLanguage ?? '', sitting !== null, showInfoAlert);

  async function changeSettings(patch: Partial<CourseSettings>) {
    setSettings(await saveCourseSettings(courseId, patch));
  }

  function begin(plan: CourseSitting, empty: string) {
    if (plan.cardIds.length === 0) {
      explainNotYet(empty);
      return;
    }
    setDoneLine(null);
    setSitting({ queue: plan.cardIds, index: 0, practised: [], kept: [] });
    if (settings && !settings.active) void changeSettings({ active: true });
  }

  const nothingOnPath = t('Nothing is ready today, and today\'s new cards are done. You can raise the number of new cards under Settings, and Mix goes back over what you have seen.');

  function studyPath(unit: number | null) {
    begin(planPathSitting({ cards, states, today: day, dailyLimit, openedByHand, unit }), nothingOnPath);
  }

  function studyMix() {
    begin(planMixSitting(cards, states, openedByHand, day, answeredToday), t('Mix goes over cards you have already seen, and there are none left to go over today.'));
  }

  function studyFilter() {
    if (!hasFilter(filter)) {
      explainNotYet(t('Choose at least one thing above to narrow the cards first.'));
      return;
    }
    begin(planFilterSitting(cards, states, filter, day, answeredToday), t('No card matches these choices, or each one that does has been answered today.'));
  }

  function finish(current: Sitting) {
    setSitting(null);
    if (current.kept.length > 0) {
      setReviews((all) => [...all, ...current.kept]);
      setDoneLine(current.kept.length === 1 ? t('1 card answered in this sitting.') : t('{n} cards answered in this sitting.', { n: current.kept.length }));
    }
  }

  async function answer(grade: LearnGrade, matched: boolean | null) {
    if (!sitting) return;
    const cardId = sitting.queue[sitting.index];
    let kept = sitting.kept;
    try {
      kept = [...kept, await addCourseAnswer(courseId, cardId, grade, matched)];
    } catch {
      explainNotYet(t('That answer could not be saved. Your earlier answers are safe.'));
      return;
    }
    let queue = sitting.queue;
    let practised = sitting.practised;
    if (grade === 'notYet' && !practised.includes(cardId)) {
      queue = [...queue, cardId];
      practised = [...practised, cardId];
    }
    const next = { queue, practised, kept, index: sitting.index + 1 };
    if (next.index < queue.length) setSitting(next);
    else finish(next);
  }

  async function remove() {
    setAskRemove(false);
    await removeImportedCourse(courseId);
    if (course?.hasBundled) load();
    else router.back();
  }

  const title = deck ? t(deck.name) : t('Course');

  if (missing || !course || !deck || !settings) {
    return (
      <CalmBands>
        <View style={styles.screen}>
          <Stack.Screen options={{ title }} />
          <View style={bands.boxMuted}>
            <Text style={styles.caption}>{missing ? 'This course is no longer on this device.' : 'Opening the course…'}</Text>
          </View>
        </View>
      </CalmBands>
    );
  }

  if (sitting) {
    const card = cardById.get(sitting.queue[sitting.index]);
    return (
      <CalmBands>
        <View style={styles.screen}>
          <Stack.Screen options={{ title }} />
          {infoAlertElement}
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]} keyboardShouldPersistTaps="handled">
            <View style={[bands.box, styles.gap]}>
              <Text style={styles.caption}>{t('Card {n} of {total}', { n: sitting.index + 1, total: sitting.queue.length })}</Text>
              {card ? (
                <CourseCardView
                  key={`${card.id}-${sitting.index}`}
                  card={card}
                  direction={settings.direction}
                  day={day}
                  typeAnswer={settings.typeAnswer}
                  showSource={choices.sources.length > 0}
                  canSpeak={voice.canSpeak}
                  onSpeak={voice.speak}
                  onGrade={(grade, matched) => void answer(grade, matched)}
                />
              ) : null}
              <TouchableOpacity ref={walkMark.ref('learn.courseStop')} style={[styles.secondaryButton, walkMark('learn.courseStop')]} onPress={() => finish(sitting)} accessibilityRole="button">
                <Text style={styles.secondaryText}>Stop for Now</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </CalmBands>
    );
  }

  const openStandings = standings.filter((standing) => standing.open);
  const readyNow = openStandings.reduce((sum, standing) => sum + standing.ready, 0);
  const freshOpen = openStandings.reduce((sum, standing) => sum + standing.fresh, 0);
  const newToday = Math.min(newLeftToday(states, day, dailyLimit), freshOpen);
  const dailyChoices = DAILY_CHOICES.includes(dailyLimit) ? DAILY_CHOICES : [...DAILY_CHOICES, dailyLimit].sort((a, b) => a - b);
  const anyLabel = t('Any');

  const picker = (label: string, options: { label: string; value: string }[], selected: string | null, set: (value: string | null) => void, asWritten: boolean) =>
    options.length === 0 ? null : (
      <View style={styles.pickerBlock} key={label}>
        <Text style={styles.label}>{t(label)}</Text>
        <PopoverSelect
          tabColor={TAB_COLOR}
          options={[{ label: anyLabel, value: ANY }, ...options]}
          selected={selected}
          placeholder={anyLabel}
          asWritten={asWritten}
          onSelect={(value) => set(value === ANY ? null : value)}
          searchable={options.length > 12}
        />
      </View>
    );

  return (
    <CalmBands>
      <View style={styles.screen}>
        <Stack.Screen options={{ title }} />
        {infoAlertElement}
        <AppActionSheet
          visible={askRemove}
          onClose={() => setAskRemove(false)}
          title={t('Remove this course?')}
          message={course.hasBundled ? t('The course that came with the app takes its place. What you studied stays.') : t('What you studied stays, and importing this course again brings it back.')}
          actions={[{ label: t('Remove This Course'), destructive: true, onPress: () => void remove() }]}
        />
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]}>
          <View style={[bands.box, styles.gap]}>
            <Text style={styles.body}>{deck.name}</Text>
            {deck.description ? <Text style={styles.caption}>{deck.description}</Text> : null}
            {deck.level ? <Text style={styles.caption}>{deck.level}</Text> : null}
          </View>

          <View style={[bands.box, styles.gap]}>
            <Text style={styles.body}>{t('{ready} ready today, {fresh} new today', { ready: readyNow, fresh: newToday })}</Text>
            <View style={styles.row}>
              <TouchableOpacity ref={walkMark.ref('learn.courseStudy')} style={[styles.primaryButton, walkMark('learn.courseStudy')]} onPress={() => studyPath(null)} accessibilityRole="button">
                <Text style={styles.primaryText}>Study Now</Text>
              </TouchableOpacity>
              <TouchableOpacity ref={walkMark.ref('learn.courseMix')} style={[styles.secondaryButton, walkMark('learn.courseMix')]} onPress={studyMix} accessibilityRole="button">
                <Text style={styles.secondaryText}>Mix</Text>
              </TouchableOpacity>
            </View>
            {doneLine ? <Text style={styles.caption}>{doneLine}</Text> : null}
          </View>

          <TabBand folds={folds} color={TAB_COLOR} id={`learn-course:${courseId}:units`} title={t('Study Path')} icon="trail-sign-outline" count={standings.length} markRef={walkMark.ref('learn.courseUnits')}>
            <View style={bands.rows}>
              {standings.map((standing) => (
                <View key={standing.unit} style={[bands.row, styles.gap]}>
                  <CourseText style={styles.body}>{standing.name}</CourseText>
                  <Text style={styles.caption}>{t('{learned} learned, {ready} ready, {fresh} new', { learned: standing.learned, ready: standing.ready, fresh: standing.fresh })}</Text>
                  {standing.open ? (
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => studyPath(standing.unit)} accessibilityRole="button">
                      <Text style={styles.secondaryText}>Study This Unit</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <Text style={styles.caption}>Opens once most of the unit before it is learned.</Text>
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => void changeSettings({ openedUnits: [...settings.openedUnits, standing.unit] })}
                        accessibilityRole="button"
                      >
                        <Text style={styles.secondaryText}>Open This Unit</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}
            </View>
          </TabBand>

          <TabBand folds={folds} color={TAB_COLOR} id={`learn-course:${courseId}:choose`} title={t('Choose Cards')} icon="funnel-outline" markRef={walkMark.ref('learn.courseChoose')}>
            <View style={styles.gap}>
              <Text style={styles.caption}>This steps outside the path, such as everything from one lesson the night before class.</Text>
              {picker('Unit', choices.units.map((unit) => ({ label: unit.label, value: String(unit.value) })), filter.unit == null ? null : String(filter.unit), (value) => setFilter({ ...filter, unit: value === null ? null : Number(value) }), true)}
              {picker('Group', choices.groups.map((group) => ({ label: group, value: group })), filter.group ?? null, (value) => setFilter({ ...filter, group: value }), true)}
              {picker('Kind of card', choices.types.map((type) => ({ label: t(TYPE_LABELS[type] ?? type), value: type })), filter.type ?? null, (value) => setFilter({ ...filter, type: value }), false)}
              {picker('Status', choices.statuses.map((status) => ({ label: t(STATUS_LABELS[status] ?? status), value: status })), filter.status ?? null, (value) => setFilter({ ...filter, status: value }), false)}
              {picker('Source', choices.sources.map((source) => ({ label: source, value: source })), filter.source ?? null, (value) => setFilter({ ...filter, source: value }), true)}
              <View style={styles.row}>
                <TouchableOpacity style={styles.primaryButton} onPress={studyFilter} accessibilityRole="button">
                  <Text style={styles.primaryText}>Study These</Text>
                </TouchableOpacity>
                {hasFilter(filter) ? (
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => setFilter({})} accessibilityRole="button">
                    <Text style={styles.secondaryText}>Clear Choices</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </TabBand>

          <TabBand folds={folds} color={TAB_COLOR} id={`learn-course:${courseId}:settings`} title={t('Settings')} icon="options-outline" markRef={walkMark.ref('learn.courseSettings')}>
            <View style={styles.gap}>
              <Text style={styles.label}>Which side comes first</Text>
              <View style={styles.row}>
                {(['targetFirst', 'nativeFirst'] as const).map((direction) => {
                  const on = settings.direction === direction;
                  return (
                    <TouchableOpacity key={direction} style={[styles.pill, on && styles.pillActive]} onPress={() => void changeSettings({ direction })} accessibilityRole="button">
                      <Text style={on ? styles.pillOnText : styles.pillText}>{direction === 'targetFirst' ? 'What you are learning' : 'What you already know'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.label}>New cards a day</Text>
              <View style={styles.row}>
                {dailyChoices.map((choice) => {
                  const on = dailyLimit === choice;
                  return (
                    <TouchableOpacity key={choice} style={[styles.pill, on && styles.pillActive]} onPress={() => void changeSettings({ dailyNewLimit: choice })} accessibilityRole="button">
                      <Text style={on ? styles.pillOnText : styles.pillText}>{String(choice)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {hasVerbTable ? (
                <>
                  <Text style={styles.label}>On verb cards</Text>
                  <View style={styles.row}>
                    {[false, true].map((typeAnswer) => {
                      const on = settings.typeAnswer === typeAnswer;
                      return (
                        <TouchableOpacity key={String(typeAnswer)} style={[styles.pill, on && styles.pillActive]} onPress={() => void changeSettings({ typeAnswer })} accessibilityRole="button">
                          <Text style={on ? styles.pillOnText : styles.pillText}>{typeAnswer ? 'Type the Answer' : 'Just Turn Them Over'}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : null}
              <TouchableOpacity style={styles.secondaryButton} onPress={() => void changeSettings({ active: !settings.active })} accessibilityRole="button">
                <Text style={styles.secondaryText}>{settings.active ? 'Set This Course Aside' : 'Back to Studying This'}</Text>
              </TouchableOpacity>
              {course.imported ? (
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setAskRemove(true)} accessibilityRole="button">
                  <Text style={styles.secondaryText}>Remove This Course</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </TabBand>

          <TabBand folds={folds} color={TAB_COLOR} id={`learn-course:${courseId}:counts`} title={t('Counts')} icon="stats-chart-outline" markRef={walkMark.ref('learn.courseCounts')}>
            <View style={styles.gap}>
              <Text style={styles.body}>{t('{seen} of {total} cards seen', { seen: stats.seen, total: stats.total })}</Text>
              <Text style={styles.body}>{t('{n} learned', { n: stats.learned })}</Text>
              <Text style={styles.body}>{t('{n} ready today', { n: stats.ready })}</Text>
              <Text style={styles.body}>{stats.daysStudied === 1 ? t('1 day studied') : t('{n} days studied', { n: stats.daysStudied })}</Text>
              <LearnHowItHasGone decks={NO_DECKS} answers={reviews.length} onlyDeck={courseId} />
            </View>
          </TabBand>
        </ScrollView>
      </View>
    </CalmBands>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: HOME_BAND_ACCENT_WIDTH },
  gap: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerBlock: { gap: 4 },
  label: { ...typography.label, color: colors.textPrimary, ...textShadow },
  body: { ...typography.body, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textMuted, ...textShadow },
  primaryButton: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  primaryText: BUTTON_PRIMARY_TEXT,
  secondaryButton: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  secondaryText: BUTTON_SECONDARY_TEXT,
  pill: PILL_SMALL,
  pillActive: PILL_ON,
  pillText: PILL_TEXT,
  pillOnText: PILL_ON_TEXT,
});
