// One set of language basics (2026-11-05): what to learn first so the rest gets easier.
// 26 plainly named units in the order they should be learned, each turned on or off for
// Home, each divided into decks with an information icon saying how a deck relates to
// the ones before it. Any number of units can be studied together, in learning order or
// at random. Every decision is in lib/languageBasics.ts.
//
// Calm by design: nothing here counts what is waiting, nothing locks, a day away takes
// nothing from anything, and three indicators on the card say how often it should come
// back rather than whether the person got it right.
//
// Answers are kept as they are made, and the ladder is only worked out again when a
// sitting ends, so an answer never waits on a replay of the whole set. Everything a set
// says stays as written through CourseText; everything around it follows the app.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { CourseCardView } from '../components/CourseCardView';
import { CourseText } from '../components/CourseText';
import { CalmBands, HOME_BAND_ACCENT_WIDTH } from '../components/HomeSectionBand';
import { useInfoAlert } from '../components/InfoAlert';
import { LanguageDeckInfo } from '../components/LanguageDeckInfo';
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
import { deckInfo, deckKeyOf, newLeftToday, planSitting, replayLadder, unitsOf, type DeckInfo, type SittingOrder } from '../lib/languageBasics';
import { courseCardLayout } from '../lib/learnCourseCard';
import type { CourseCard } from '../lib/learnCourseFile';
import { addCourseAnswer, getCourseSettings, listCourseReviews, loadCourse, saveCourseSettings, withStudyGroup, type CourseSettings, type OpenedCourse } from '../lib/learnCoursesDb';
import type { LearnGrade, LearnReview } from '../lib/learnSchedule';
import { explainNotYet } from '../lib/notYet';

const TAB_COLOR = colors.tabInterests;
const DAILY_CHOICES = [5, 10, 15, 20, 30, 50];

/** What a sitting was asked for, so Keep Going can ask again. */
type Scope = { kind: 'units'; units: number[]; order: SittingOrder } | { kind: 'deck'; key: string };
type Sitting = { scope: Scope; goingOver: boolean; queue: string[]; index: number; practised: string[]; kept: LearnReview[] };
type ShownInfo = { title: string; info: DeckInfo; cardRemember?: string };

function today(): string {
  return localDayOf(new Date().toISOString());
}

export default function LanguageBasicsScreen() {
  const params = useLocalSearchParams<{ id: string; unit?: string; together?: string; group?: string; order?: string }>();
  const setId = typeof params.id === 'string' ? params.id : '';
  const walkMark = useWalkMark();
  const scrollPadding = useFloatingButtonScrollPadding();
  const bands = useTabBandStyles(TAB_COLOR);
  const folds = useBandFolds();
  const openFold = folds.open;
  const [showInfoAlert, infoAlertElement] = useInfoAlert();

  const [set, setSet] = useState<OpenedCourse | null>(null);
  const [missing, setMissing] = useState(false);
  const [settings, setSettings] = useState<CourseSettings | null>(null);
  const [reviews, setReviews] = useState<LearnReview[]>([]);
  const [sitting, setSitting] = useState<Sitting | null>(null);
  const [lastScope, setLastScope] = useState<Scope | null>(null);
  const [doneLine, setDoneLine] = useState<string | null>(null);
  const [chosen, setChosen] = useState<number[]>([]);
  const [order, setOrder] = useState<SittingOrder>('learning');
  const [shown, setShown] = useState<ShownInfo | null>(null);
  const [reloaded, setReloaded] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  // Where Home sent this screen, applied once and scrolled to when that band is laid out.
  const arrival = useRef(false);
  const scrollToUnit = useRef<number | null>(null);
  // A group chosen on Home starts its sitting as soon as the set has loaded.
  const startGroup = useRef<{ units: number[]; order: SittingOrder } | null>(null);

  const load = useCallback(() => {
    const opened = setId ? loadCourse(setId) : null;
    setSet(opened);
    setMissing(!opened);
    if (!opened) return;
    Promise.all([getCourseSettings(setId), listCourseReviews(setId)])
      .then(([kept, answers]) => {
        setSettings(kept);
        setReviews(answers);
        if (arrival.current) return;
        arrival.current = true;
        const unit = Number(params.unit);
        if (Number.isInteger(unit) && unit > 0) {
          scrollToUnit.current = unit;
          openFold(`language:${setId}:unit:${unit}`);
        }
        const group = typeof params.group === 'string' ? params.group.split(',').map(Number).filter((value) => Number.isInteger(value) && value > 0) : [];
        if (group.length > 0) {
          startGroup.current = { units: group, order: params.order === 'random' ? 'random' : 'learning' };
          setReloaded((count) => count + 1);
        }
        if (params.together) {
          setChosen(kept.openedUnits);
          openFold(`language:${setId}:together`);
        }
      })
      .catch(() => setMissing(true));
  }, [setId, params.unit, params.together, params.group, params.order, openFold]);

  useFocusEffect(load);

  const day = today();
  const cards = useMemo(() => set?.cards ?? [], [set]);
  const cardById = useMemo(() => new Map<string, CourseCard>(cards.map((card) => [card.id, card])), [cards]);
  const units = useMemo(() => (set ? unitsOf(cards, set.outline) : []), [set, cards]);
  const answered = useMemo(() => new Set(reviews.map((review) => review.cardId)), [reviews]);
  const hasVerbTable = useMemo(() => cards.some((card) => card.type === 'Verb' && courseCardLayout(card).kind === 'verb'), [cards]);

  const deck = set?.deck ?? null;
  const voice = useCourseVoice(deck?.targetCode ?? '', deck?.targetLanguage ?? '', sitting !== null, showInfoAlert);

  async function changeSettings(patch: Partial<CourseSettings>) {
    setSettings(await saveCourseSettings(setId, patch));
  }

  function begin(scope: Scope, known: LearnReview[]) {
    const knownStates = replayLadder(known);
    const answeredToday = new Set(known.filter((review) => review.day === day).map((review) => review.cardId));
    const plan =
      scope.kind === 'deck'
        ? planSitting({ cards: cards.filter((card) => deckKeyOf(card) === scope.key), states: knownStates, today: day, order: 'learning', newLeft: null, answeredToday })
        : planSitting({
            cards: cards.filter((card) => scope.units.includes(card.unit)),
            states: knownStates,
            today: day,
            order: scope.order,
            newLeft: newLeftToday(knownStates, day, settings?.dailyNewLimit ?? 15),
            answeredToday,
          });
    if (plan.cardIds.length === 0) {
      explainNotYet(t('There are no cards to show here yet.'));
      return;
    }
    setDoneLine(null);
    setLastScope(scope);
    setSitting({ scope, goingOver: plan.goingOver, queue: plan.cardIds, index: 0, practised: [], kept: [] });
  }

  function studyTogether() {
    if (chosen.length === 0) {
      explainNotYet(t('Choose at least one unit first.'));
      return;
    }
    // Kept for Home, so the same group opens again in one tap.
    if (settings) void changeSettings({ studyGroups: withStudyGroup(settings.studyGroups, { units: chosen, order }) });
    begin({ kind: 'units', units: chosen, order }, reviews);
  }

  function finish(current: Sitting) {
    setSitting(null);
    setReviews((all) => [...all, ...current.kept]);
    if (current.kept.length > 0) {
      setDoneLine(current.kept.length === 1 ? t('1 card answered in this sitting.') : t('{n} cards answered in this sitting.', { n: current.kept.length }));
    }
  }

  async function answer(grade: LearnGrade, matched: boolean | null) {
    if (!sitting) return;
    const cardId = sitting.queue[sitting.index];
    let kept = sitting.kept;
    try {
      kept = [...kept, await addCourseAnswer(setId, cardId, grade, matched)];
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
    const next = { ...sitting, queue, practised, kept, index: sitting.index + 1 };
    if (next.index < queue.length) setSitting(next);
    else finish(next);
  }

  function infoFor(key: string, title: string, cardRemember?: string) {
    if (!set) return;
    setShown({ title, info: deckInfo(key, cards, set.outline, answered), cardRemember });
  }

  function toggleHome(unit: number, on: boolean) {
    if (!settings) return;
    void changeSettings({ openedUnits: on ? [...settings.openedUnits, unit].sort((a, b) => a - b) : settings.openedUnits.filter((value) => value !== unit) });
  }

  function toggleChosen(unit: number) {
    setChosen((current) => (current.includes(unit) ? current.filter((value) => value !== unit) : [...current, unit].sort((a, b) => a - b)));
  }

  // A group chosen on Home: once the set and its answers are in, its sitting starts.
  useEffect(() => {
    const group = startGroup.current;
    if (!group || !set || !settings || reloaded === 0) return;
    startGroup.current = null;
    begin({ kind: 'units', units: group.units, order: group.order }, reviews);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloaded, set, settings, reviews]);

  const title = deck ? t(deck.name) : t('Languages');
  const infoModal = <LanguageDeckInfo title={shown?.title ?? null} info={shown?.info ?? null} cardRemember={shown?.cardRemember} onClose={() => setShown(null)} />;

  if (missing || !set || !deck || !settings) {
    return (
      <CalmBands>
        <View style={styles.screen}>
          <Stack.Screen options={{ title }} />
          <View style={bands.boxMuted}>
            <Text style={styles.caption}>{missing ? 'These basics are not in this version of the app.' : 'Opening…'}</Text>
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
          {infoModal}
          {/* Its own key per card, so every card opens at the top instead of where the list or the last card was scrolled. */}
          <ScrollView key={`sitting-${sitting.index}`}contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]} keyboardShouldPersistTaps="handled">
            <View style={[bands.box, styles.gap]}>
              <Text style={styles.caption}>{t('Card {n} of {total}', { n: sitting.index + 1, total: sitting.queue.length })}</Text>
              {sitting.goingOver ? <Text style={styles.caption}>Nothing is waiting here today, so these are extra cards to go over.</Text> : null}
              {card ? (
                <CourseCardView
                  key={`${card.id}-${sitting.index}`}
                  card={card}
                  direction={settings.direction}
                  day={day}
                  typeAnswer={settings.typeAnswer}
                  showSource={false}
                  canSpeak={voice.canSpeak}
                  onSpeak={voice.speak}
                  onGrade={(grade, matched) => void answer(grade, matched)}
                  onInfo={() => infoFor(deckKeyOf(card), set.outline.groups[deckKeyOf(card)]?.name ?? card.group, card.remember)}
                />
              ) : null}
              <TouchableOpacity ref={walkMark.ref('languages.stop')} style={[styles.secondaryButton, walkMark('languages.stop')]} onPress={() => finish(sitting)} accessibilityRole="button">
                <Text style={styles.secondaryText}>Stop for Now</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </CalmBands>
    );
  }

  const dailyLimit = settings.dailyNewLimit;
  const dailyChoices = DAILY_CHOICES.includes(dailyLimit) ? DAILY_CHOICES : [...DAILY_CHOICES, dailyLimit].sort((a, b) => a - b);

  return (
    <CalmBands>
      <View style={styles.screen}>
        <Stack.Screen options={{ title }} />
        {infoAlertElement}
        {infoModal}
        <ScrollView key="list" ref={scrollRef} contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]}>
          <View style={[bands.box, styles.gap]}>
            <Text style={styles.body}>{t(deck.name)}</Text>
            <Text style={styles.caption}>{t(deck.description)}</Text>
            {doneLine ? <Text style={styles.body}>{doneLine}</Text> : null}
            {doneLine && lastScope ? (
              <TouchableOpacity ref={walkMark.ref('languages.keepGoing')} style={[styles.secondaryButton, walkMark('languages.keepGoing')]} onPress={() => begin(lastScope, reviews)} accessibilityRole="button">
                <Text style={styles.secondaryText}>Keep Going</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TabBand folds={folds} color={TAB_COLOR} id={`language:${setId}:together`} title={t('Study Several Together')} icon="albums-outline" markRef={walkMark.ref('languages.together')}>
            <View style={styles.gap}>
              <View style={styles.row}>
                <TouchableOpacity
                  ref={walkMark.ref('languages.selectAll')}
                  style={[styles.secondaryButton, walkMark('languages.selectAll')]}
                  onPress={() => setChosen(units.map((unit) => unit.unit))}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryText}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setChosen(settings.openedUnits)} accessibilityRole="button">
                  <Text style={styles.secondaryText}>Choose Those That Are On</Text>
                </TouchableOpacity>
                {chosen.length > 0 ? (
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => setChosen([])} accessibilityRole="button">
                    <Text style={styles.secondaryText}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.gap}>
                {units.map((unit) => {
                  const ticked = chosen.includes(unit.unit);
                  return (
                    <TouchableOpacity key={unit.unit} style={styles.tick} onPress={() => toggleChosen(unit.unit)} accessibilityRole="checkbox" accessibilityState={{ checked: ticked }}>
                      <Ionicons name={ticked ? 'checkbox-outline' : 'square-outline'} size={20} color={colors.textPrimary} style={textShadow} />
                      <CourseText style={styles.tickText}>{`${unit.unit}. ${unit.name}`}</CourseText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.label}>Which order</Text>
              <View style={styles.row}>
                {(['learning', 'random'] as const).map((choice) => {
                  const on = order === choice;
                  return (
                    <TouchableOpacity key={choice} style={[styles.pill, on && styles.pillActive]} onPress={() => setOrder(choice)} accessibilityRole="button">
                      <Text style={on ? styles.pillOnText : styles.pillText}>{choice === 'learning' ? 'In Learning Order' : 'Random'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity ref={walkMark.ref('languages.studyTogether')} style={[styles.primaryButton, walkMark('languages.studyTogether')]} onPress={studyTogether} accessibilityRole="button">
                <Text style={styles.primaryText}>Study</Text>
              </TouchableOpacity>
            </View>
          </TabBand>

          {units.map((unit, unitIndex) => (
            <View
              key={unit.unit}
              onLayout={(event) => {
                if (scrollToUnit.current !== unit.unit) return;
                scrollToUnit.current = null;
                scrollRef.current?.scrollTo({ y: event.nativeEvent.layout.y, animated: false });
              }}
            >
              <TabBand
                folds={folds}
                color={TAB_COLOR}
                id={`language:${setId}:unit:${unit.unit}`}
                title={`${unit.unit}. ${unit.name}`}
                icon="book-outline"
                markRef={unitIndex === 0 ? walkMark.ref('languages.unit') : undefined}
              >
                <View style={styles.gap}>
                  {unit.description ? <CourseText style={styles.caption}>{unit.description}</CourseText> : null}
                  <View ref={unitIndex === 0 ? walkMark.ref('languages.onHome') : undefined} style={[styles.switchRow, unitIndex === 0 ? walkMark('languages.onHome') : null]}>
                    <Text style={styles.switchLabel}>Show on Home</Text>
                    <Switch value={settings.openedUnits.includes(unit.unit)} onValueChange={(on) => toggleHome(unit.unit, on)} trackColor={{ true: TAB_COLOR, false: colors.border }} />
                  </View>
                  <TouchableOpacity
                    ref={unitIndex === 0 ? walkMark.ref('languages.studyUnit') : undefined}
                    style={[styles.primaryButton, unitIndex === 0 ? walkMark('languages.studyUnit') : null]}
                    onPress={() => begin({ kind: 'units', units: [unit.unit], order: 'learning' }, reviews)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryText}>Study This Unit</Text>
                  </TouchableOpacity>
                  <View style={bands.rows}>
                    {unit.decks.map((one, deckIndex) => {
                      const marked = unitIndex === 0 && deckIndex === 0;
                      return (
                        <View key={one.key} style={[bands.row, styles.gap]}>
                          <View style={styles.deckHead}>
                            <CourseText style={styles.deckName}>{one.name}</CourseText>
                            <TouchableOpacity
                              ref={marked ? walkMark.ref('languages.deckInfo') : undefined}
                              style={marked ? walkMark('languages.deckInfo') : undefined}
                              onPress={() => infoFor(one.key, one.name)}
                              hitSlop={8}
                              accessibilityRole="button"
                              accessibilityLabel={t('How this deck fits with the ones before it')}
                            >
                              <Ionicons name="information-circle-outline" size={22} color={colors.textPrimary} style={textShadow} />
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.caption}>{one.cards.length === 1 ? t('1 card') : t('{n} cards', { n: one.cards.length })}</Text>
                          <TouchableOpacity
                            ref={marked ? walkMark.ref('languages.deckStudy') : undefined}
                            style={[styles.secondaryButton, marked ? walkMark('languages.deckStudy') : null]}
                            onPress={() => begin({ kind: 'deck', key: one.key }, reviews)}
                            accessibilityRole="button"
                          >
                            <Text style={styles.secondaryText}>Study</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </TabBand>
            </View>
          ))}

          <TabBand folds={folds} color={TAB_COLOR} id={`language:${setId}:settings`} title={t('Settings')} icon="options-outline" markRef={walkMark.ref('languages.settings')}>
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
              <Text style={styles.caption}>This applies when you study units. A deck you choose yourself always opens.</Text>
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
  tick: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  tickText: { ...typography.body, color: colors.textPrimary, flex: 1, ...textShadow },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  switchLabel: { ...typography.body, color: colors.textPrimary, flex: 1, ...textShadow },
  deckHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deckName: { ...typography.body, color: colors.textPrimary, flex: 1, ...textShadow },
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
