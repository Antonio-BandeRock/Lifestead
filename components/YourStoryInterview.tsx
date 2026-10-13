// Your Story's interview, 1.0.52.5 (lib/yourStoryInterview.ts holds every
// question and sentence). The app asks what it needs, one question at a
// time, and each answer goes straight into the same record Profile or Life
// keeps, so nothing asked here is kept twice.
//
//   page  what has been answered, one line each with Change, then the
//         question being asked, open.
//   card  the question being asked, open, for the Home card. Nothing once
//         every question has an answer.
//   setup the one question setup is showing (showKey), for the setup before
//         the app (components/FirstSetup.tsx), which owns Back, the answered
//         line and moving on, and is told each answer through onAnswered.
//
// 1.0.68.11, direct request: the choices "a little smaller and not in pill
// form and laid out more cleanly. I like the way the menu for the quick
// access choices look. Do them that way." So every list of choices is a
// panel of pressed-in wells, the quick access menu's look
// (components/QuickAccessButton.tsx), a filled circle marking what is
// chosen. Once a question is answered, the card and setup say what was
// answered, with Change, above the next question, since the answer used to
// vanish too fast to notice.
//
// A question where several things can be chosen (conditions, parts of life,
// eating styles, allergies) stays open while choices are made, until Done,
// since the first tap would otherwise answer it and move on.
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { AppTextInput } from './AppTextInput';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { getConditionStagingModel } from '../lib/conditionStages';
import {
  addFoodAllergy,
  addNeuroProfile,
  getUserProfile,
  removeFoodAllergy,
  removeNeuroProfile,
  setConditionStage,
  setDietPreferenceSelected,
  setUserConditionSelected,
  setUserProfile,
} from '../lib/db';
import { routeForDigestEntry } from '../lib/digestNavigation';
import { ALL_NEURO_PROFILE_KEYS, NEURO_PROFILE_CAPTIONS, NEURO_PROFILE_LABELS, type NeuroProfileKey } from '../lib/neuroProfile';
import type { StoryDestination } from '../lib/yourStory';
import { bringYourStoryItemBack, setYourStoryItemAside } from '../lib/yourStoryDb';
import {
  ADD_MEDS_LABEL,
  ALL_TABS_LABEL,
  BY_ITSELF,
  BY_ITSELF_HEADING,
  CHANGE_LABEL,
  COMMON_ALLERGENS,
  DONE_LABEL,
  EATING_STYLES,
  FREE_BEFORE_SETUP,
  FREE_BEFORE_SETUP_HEADING,
  FULL_HOME_LABEL,
  HERE_FOR_MY_DAY,
  HERE_FOR_MY_DAY_LABEL,
  INTERVIEW_ANSWERED_HEADING,
  INTERVIEW_FINISHED_LINE,
  INTERVIEW_HEADING,
  INTERVIEW_LEAD,
  JUST_ANSWERED_LABEL,
  LATER,
  LATER_LABEL,
  LEAVE_OUT_LABEL,
  NEEDS_FROM_YOU,
  NEEDS_FROM_YOU_HEADING,
  NEURO_PROFILE_NOTE,
  NONE_OF_THESE_LABEL,
  NOT_NOW_LABEL,
  NOT_SURE_LABEL,
  NO_ALLERGIES_LABEL,
  NO_STYLE_LABEL,
  OPEN_PROFILE_LABEL,
  PLAN_THIS_WAY_LABEL,
  READ_MORE_LABEL,
  SET_UP_BACKUP_LABEL,
  SECURITY_APP_LOCK_LABEL,
  SECURITY_BOTH_LABEL,
  SECURITY_VAULT_LABEL,
  SIMPLE_VIEW_LABEL,
  START_ALL,
  showsFreeLine,
  TAKE_NOTHING_LABEL,
  TOUR_TABS,
  type InterviewQuestionView,
  type InterviewView,
} from '../lib/yourStoryInterview';
import { clearYourStoryAnswer, setYourStoryAnswer } from '../lib/yourStoryInterviewDb';
import { BeatPicker } from './BeatPicker';
import { usePlayfulWording } from '../hooks/usePlayfulWording';
import { wording } from '../lib/playfulCopy';
import { setVisualPreferences } from '../lib/visualPreferences';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_DIVIDER_COLOR, homeBandStyle } from './HomeSectionBand';
import { PopoverSelect } from './PopoverSelect';
import { VAULT_DEFAULT_CATEGORIES } from '../lib/vault';
import { answerVaultSetupNotNow, setVaultCategories } from '../lib/vaultSession';

type Props = {
  mode: 'card' | 'page' | 'setup';
  interview: InterviewView | null;
  onChanged: () => void;
  go: (destination: Exclude<StoryDestination, { kind: 'beats' }>) => void;
  // Told which question is showing, so setup can scroll back to the top.
  onQuestionShown?: (key: string | null) => void;
  // Setup only: the question to show, and told once it has been answered
  // so setup can move to the next page (1.0.68.13).
  showKey?: string;
  onAnswered?: (key: string) => void;
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEARS = (() => {
  const now = new Date().getFullYear();
  const years: string[] = [];
  for (let year = now; year >= 1900; year -= 1) years.push(String(year));
  return years;
})();
const DAYS = Array.from({ length: 31 }, (_, index) => String(index + 1));

function validBirthDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  const same = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return same && date.getTime() <= Date.now();
}

const profileRoute: Exclude<StoryDestination, { kind: 'beats' }> = { kind: 'route', pathname: '/profile' };
// Profile opened at Backup & Restore.
const backupRoute: Exclude<StoryDestination, { kind: 'beats' }> = {
  kind: 'route',
  pathname: '/profile',
  params: { section: 'backup' },
};
// Profile opened at App Lock, where the vault's choices and code are.
const appLockProfileRoute: Exclude<StoryDestination, { kind: 'beats' }> = {
  kind: 'route',
  pathname: '/profile',
  params: { section: 'applock' },
};
const appLockSetupRoute: Exclude<StoryDestination, { kind: 'beats' }> = { kind: 'route', pathname: '/app-lock-setup' };
const myMedsRoute: Exclude<StoryDestination, { kind: 'beats' }> = {
  kind: 'route',
  pathname: '/life',
  params: { openLifeLens: 'myMeds' },
};

export function YourStoryInterview({ mode, interview, onChanged, go, onQuestionShown, showKey, onAnswered }: Props) {
  // The question held open while choices are being made, or reopened with
  // Change. Null means the next unanswered one.
  const [holding, setHolding] = useState<string | null>(null);
  const playful = usePlayfulWording();
  const [allergyText, setAllergyText] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const openKey = mode === 'setup' ? (showKey ?? null) : (holding ?? interview?.next?.key ?? null);
  const open = interview?.questions.find((question) => question.key === openKey) ?? null;
  // The question answered last, said above the next one with Change.
  const [justAnswered, setJustAnswered] = useState<string | null>(null);
  const openKeyRef = useRef(openKey);
  openKeyRef.current = openKey;

  useEffect(() => {
    onQuestionShown?.(openKey);
  }, [openKey, onQuestionShown]);

  useEffect(() => {
    if (open?.def.kind !== 'aboutYou') return;
    let live = true;
    void getUserProfile().then((profile) => {
      if (!live) return;
      setSex(profile.sex);
      if (profile.birthDate) {
        const [y, m, d] = profile.birthDate.split('-');
        setYear(y);
        setMonth(MONTHS[Number(m) - 1] ?? null);
        setDay(String(Number(d)));
      }
    });
    return () => {
      live = false;
    };
  }, [open?.def.kind]);

  const act = useCallback(
    async (work: () => Promise<unknown>, keepOpen: string | null) => {
      try {
        await work();
      } catch (error) {
        console.warn('Your Story interview answer failed', error);
      }
      if (keepOpen === null && openKeyRef.current) {
        setJustAnswered(openKeyRef.current);
        onAnswered?.(openKeyRef.current);
      }
      setHolding(keepOpen);
      onChanged();
    },
    [onChanged, onAnswered],
  );

  if (!interview) return null;
  if ((mode === 'card' || mode === 'setup') && !open) return null;
  const facts = interview.facts;

  // One choice in a pressed-in well, the quick access menu's look, with a
  // caption under the name when the choice needs one.
  function well(label: string, on: boolean, onPress: () => void, key?: string, caption?: string, style?: ViewStyle) {
    return (
      <Pressable
        key={key ?? label}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        style={({ pressed }) => [styles.well, caption ? styles.wellWide : null, style, pressed ? styles.wellPressed : null]}
      >
        <Ionicons
          name={on ? 'checkmark-circle' : 'ellipse-outline'}
          size={20}
          color={on ? colors.primary : colors.textSecondary}
          style={textShadow}
        />
        <View style={styles.wellText}>
          <Text style={styles.wellLabel}>{label}</Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
      </Pressable>
    );
  }

  function panel(children: ReactNode) {
    return <View style={styles.panel}>{children}</View>;
  }

  function link(label: string, onPress: () => void, muted = false) {
    return (
      <TouchableOpacity key={label} style={styles.link} onPress={onPress} accessibilityRole="button">
        <Text style={muted ? styles.linkMuted : styles.linkText}>{label}</Text>
        {muted ? null : <Ionicons name="arrow-forward" size={13} color={colors.primary} style={textShadow} />}
      </TouchableOpacity>
    );
  }

  // Done on a question where several things can be chosen: nothing chosen
  // is an answer of its own, anything chosen replaces it.
  function finishMulti(question: InterviewQuestionView, chosen: number) {
    void act(() => (chosen === 0 ? setYourStoryAnswer(question.key, 'none') : clearYourStoryAnswer(question.key)), null);
  }

  function renderChoices(question: InterviewQuestionView) {
    const key = question.key;
    switch (question.def.kind) {
      case 'conditions':
        return (
          <>
            {panel(
              facts.conditionChoices.map((code) =>
                well(
                  facts.conditionNames[code] ?? code,
                  facts.conditions.includes(code),
                  () => void act(() => setUserConditionSelected(code, !facts.conditions.includes(code)), key),
                  code,
                ),
              ),
            )}
            <View style={styles.links}>
              {facts.conditions.length > 0
                ? link(DONE_LABEL, () => finishMulti(question, facts.conditions.length))
                : link(NONE_OF_THESE_LABEL, () => finishMulti(question, 0))}
              {/* P1, 1.0.68.5: the way in that needs no condition. */}
              {facts.conditions.length > 0
                ? null
                : link(HERE_FOR_MY_DAY_LABEL, () => void act(() => setYourStoryAnswer(key, HERE_FOR_MY_DAY), null))}
            </View>
          </>
        );
      case 'neuro':
        return (
          <>
            {panel(
              ALL_NEURO_PROFILE_KEYS.map((profileKey: NeuroProfileKey) => {
                const on = facts.neuro.includes(profileKey);
                return well(
                  NEURO_PROFILE_LABELS[profileKey],
                  on,
                  () => void act(() => (on ? removeNeuroProfile(profileKey) : addNeuroProfile(profileKey)), key),
                  profileKey,
                  NEURO_PROFILE_CAPTIONS[profileKey],
                );
              }),
            )}
            <Text style={styles.caption}>{NEURO_PROFILE_NOTE}</Text>
            {/* 2026-10-03, direct request: "If the user tells the app from the
                start they have a neurodivergent mind, we can offer to be more
                direct, without the playful stuff." Offered, never switched
                silently; Profile > Playful Wording changes it later. */}
            {facts.neuro.length > 0 ? (
              <>
                <Text style={styles.caption}>{wording('plainWordingOffer', playful)}</Text>
                {panel([
                  well('Keep the jokes', playful, () => void setVisualPreferences({ playfulWording: true }), 'keep-jokes'),
                  well('Plain wording', !playful, () => void setVisualPreferences({ playfulWording: false }), 'plain-wording'),
                ])}
              </>
            ) : null}
            <View style={styles.links}>
              {facts.neuro.length > 0
                ? link(DONE_LABEL, () => finishMulti(question, facts.neuro.length))
                : link(NONE_OF_THESE_LABEL, () => finishMulti(question, 0))}
              {facts.neuro.length > 0 ? link(OPEN_PROFILE_LABEL, () => go(profileRoute)) : null}
            </View>
          </>
        );
      case 'beats':
        return (
          <BeatPicker
            showQuestion={false}
            onChanged={() => onChanged()}
            onDone={() => {
              setHolding(null);
              onAnswered?.(key);
              onChanged();
            }}
          />
        );
      case 'startTab': {
        const chosen = facts.answers.startTab?.answer ?? null;
        return (
          panel([
            ...[...TOUR_TABS]
              .sort((a, b) => a.title.localeCompare(b.title))
              .map((tab) =>
                well(tab.title, chosen === tab.path, () => void act(() => setYourStoryAnswer('startTab', tab.path), null), tab.path),
              ),
            well(ALL_TABS_LABEL, chosen === START_ALL, () => void act(() => setYourStoryAnswer('startTab', START_ALL), null)),
          ])
        );
      }
      case 'homeView': {
        const chosen = facts.answers.homeView?.answer ?? null;
        const choose = (value: 'simple' | 'full') =>
          void act(async () => {
            await setVisualPreferences({ simpleView: value === 'simple' });
            await setYourStoryAnswer('homeView', value);
          }, null);
        return (
          panel([
            well(SIMPLE_VIEW_LABEL, chosen === 'simple', () => choose('simple')),
            well(FULL_HOME_LABEL, chosen === 'full', () => choose('full')),
          ])
        );
      }
      case 'meds': {
        const setAside = facts.story.allItems.meds?.state === 'setAside';
        return (
          <View style={styles.links}>
            {link(ADD_MEDS_LABEL, () => {
              setHolding(null);
              go(myMedsRoute);
            })}
            {setAside
              ? null
              : link(TAKE_NOTHING_LABEL, () => void act(() => setYourStoryItemAside('meds'), null), true)}
            {mode === 'setup' ? link(LATER_LABEL, () => void act(() => setYourStoryAnswer('meds', LATER), null), true) : null}
          </View>
        );
      }
      case 'stage': {
        const code = question.condition?.code;
        const model = code ? getConditionStagingModel(code) : null;
        if (!code || !model) return null;
        const current = facts.stages[code];
        return (
          <>
            <Text style={styles.caption}>{`${model.frameworkName}. ${model.frameworkNote}`}</Text>
            {panel(
              model.stages.map((stage) =>
                well(
                  stage.label,
                  current === stage.code,
                  () =>
                    void act(async () => {
                      await setConditionStage(code, stage.code);
                      await clearYourStoryAnswer(key);
                    }, null),
                  stage.code,
                  stage.shortDescription,
                ),
              ),
            )}
            <View style={styles.links}>
              {link(
                NOT_SURE_LABEL,
                () =>
                  void act(async () => {
                    await setConditionStage(code, null);
                    await setYourStoryAnswer(key, 'notSure');
                  }, null),
                true,
              )}
            </View>
          </>
        );
      }
      case 'eatingStyle':
        return (
          <>
            <View style={styles.choiceList}>
              {EATING_STYLES.map((style) => {
                const on = facts.diets.includes(style.tag);
                return (
                  <View key={style.tag} style={styles.styleRow}>
                    <Text style={styles.styleName}>{style.tag}</Text>
                    <Text style={styles.caption}>{style.line}</Text>
                    <View style={styles.links}>
                      {well(
                        on ? 'Chosen' : PLAN_THIS_WAY_LABEL,
                        on,
                        () => void act(() => setDietPreferenceSelected(style.tag, !on), key),
                        undefined,
                        undefined,
                        styles.wellInline,
                      )}
                      {link(READ_MORE_LABEL, () => {
                        const target = routeForDigestEntry(style.readId);
                        go({ kind: 'route', pathname: target.pathname, params: target.params as Record<string, string> });
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={styles.links}>
              {facts.diets.length > 0
                ? link(DONE_LABEL, () => finishMulti(question, facts.diets.length))
                : link(NO_STYLE_LABEL, () => finishMulti(question, 0))}
            </View>
          </>
        );
      case 'allergies': {
        const others = facts.allergies.filter((name) => !COMMON_ALLERGENS.includes(name));
        return (
          <>
            {panel(
              [...COMMON_ALLERGENS, ...others]
                .sort((a, b) => a.localeCompare(b))
                .map((name) => {
                  const on = facts.allergies.includes(name);
                  return well(name, on, () => void act(() => (on ? removeFoodAllergy(name) : addFoodAllergy(name)), key), name);
                }),
            )}
            <View style={styles.addRow}>
              <AppTextInput
                style={styles.input}
                value={allergyText}
                onChangeText={setAllergyText}
                placeholder="Another allergy"
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={() => {
                  const name = allergyText.trim();
                  if (!name) return;
                  setAllergyText('');
                  void act(() => addFoodAllergy(name), key);
                }}
                returnKeyType="done"
              />
            </View>
            <View style={styles.links}>
              {facts.allergies.length > 0
                ? link(DONE_LABEL, () => finishMulti(question, facts.allergies.length))
                : link(NO_ALLERGIES_LABEL, () => finishMulti(question, 0))}
            </View>
          </>
        );
      }
      case 'aboutYou': {
        const save = () => {
          setDateError(null);
          const monthNumber = month ? MONTHS.indexOf(month) + 1 : 0;
          const [y, d] = [Number(year), Number(day)];
          if (!sex || !year || !monthNumber || !day || !validBirthDate(y, monthNumber, d)) {
            setDateError('Choose a sex and a whole birth date, not in the future.');
            return;
          }
          const iso = `${y}-${String(monthNumber).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          void act(async () => {
            await setUserProfile({ sex, birthDate: iso });
            await bringYourStoryItemBack('aboutYou');
          }, null);
        };
        return (
          <>
            {panel([
              well('Female', sex === 'female', () => setSex('female')),
              well('Male', sex === 'male', () => setSex('male')),
            ])}
            <View style={styles.dateRow}>
              <PopoverSelect options={YEARS} selected={year} onSelect={setYear} tabColor={colors.primary} placeholder="Year" searchable />
              <PopoverSelect options={MONTHS} selected={month} onSelect={setMonth} tabColor={colors.primary} placeholder="Month" />
              <PopoverSelect options={DAYS} selected={day} onSelect={setDay} tabColor={colors.primary} placeholder="Day" />
            </View>
            {dateError ? <Text style={styles.error}>{dateError}</Text> : null}
            <View style={styles.links}>
              {link('Save', save)}
              {link(LEAVE_OUT_LABEL, () => void act(() => setYourStoryItemAside('aboutYou'), null), true)}
            </View>
          </>
        );
      }
      case 'backup':
        return (
          <View style={styles.links}>
            {link(SET_UP_BACKUP_LABEL, () => {
              setHolding(null);
              go(backupRoute);
            })}
            {mode === 'setup'
              ? link(LATER_LABEL, () => void act(() => setYourStoryAnswer('backup', LATER), null), true)
              : link(NOT_NOW_LABEL, () => void act(() => setYourStoryAnswer('backup', 'notNow'), null), true)}
          </View>
        );
      case 'security': {
        // Choosing the vault puts the health and money records in it
        // straight away; App Lock is set up on its own screen, and a vault
        // with no App Lock gets its code in Profile.
        const appLockOn = facts.security?.appLockOn ?? false;
        return (
          <View style={styles.links}>
            {link(SECURITY_BOTH_LABEL, () => {
              setVaultCategories(VAULT_DEFAULT_CATEGORIES);
              setHolding(null);
              onChanged();
              go(appLockOn ? appLockProfileRoute : appLockSetupRoute);
            })}
            {appLockOn
              ? null
              : link(SECURITY_APP_LOCK_LABEL, () => {
                  setHolding(null);
                  go(appLockSetupRoute);
                })}
            {link(SECURITY_VAULT_LABEL, () => {
              setVaultCategories(VAULT_DEFAULT_CATEGORIES);
              setHolding(null);
              onChanged();
              go(appLockProfileRoute);
            })}
            {link(
              mode === 'setup' ? LATER_LABEL : NOT_NOW_LABEL,
              () =>
                void act(async () => {
                  answerVaultSetupNotNow();
                  await setYourStoryAnswer('security', mode === 'setup' ? LATER : 'notNow');
                }, null),
              true,
            )}
          </View>
        );
      }
    }
  }

  // U3: what is Free, said once, before the first question and never after.
  function renderFreeLine() {
    if (!interview || !showsFreeLine(interview)) return null;
    return (
      <View style={styles.freeLine}>
        <Text style={styles.subheading}>{FREE_BEFORE_SETUP_HEADING}</Text>
        <Text style={styles.caption}>{FREE_BEFORE_SETUP}</Text>
      </View>
    );
  }

  function renderOpen(question: InterviewQuestionView, bandStyle: ViewStyle = styles.bandOpen) {
    return (
      <View style={[styles.band, bandStyle]}>
        {question.def.kind === 'conditions' ? renderFreeLine() : null}
        <Text style={styles.question}>{question.question}</Text>
        <Text style={styles.why}>{question.def.why}</Text>
        {renderChoices(question)}
        {mode !== 'setup' && holding === question.key && question.answered ? (
          <View style={styles.links}>{link('Close', () => setHolding(null), true)}</View>
        ) : null}
      </View>
    );
  }

  // On Home the question sits inside the Your Story band, which already
  // carries the colour. 1.0.62.12, direct request: the coloured lines above
  // and below the question "shouldn't be there anymore", and any line that
  // separates it uses the same dark line the other areas use. So no accent
  // on the left and the dark divider top and bottom.
  // What was answered last, with Change, above the next question.
  function renderJustAnswered(bandStyle: ViewStyle) {
    const last = justAnswered ? interview?.questions.find((question) => question.key === justAnswered) : null;
    if (!last || !last.answered || last.key === openKey) return null;
    return (
      <View style={[styles.band, bandStyle, styles.answeredRow]}>
        <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={textShadow} />
        <View style={styles.answeredText}>
          <Text style={styles.caption}>{`${JUST_ANSWERED_LABEL}: ${last.question}`}</Text>
          <Text style={styles.answeredQuestion}>{last.summary ?? DONE_LABEL}</Text>
        </View>
        {link(CHANGE_LABEL, () => setHolding(last.key))}
      </View>
    );
  }

  if (mode === 'card') {
    return open ? (
      <View style={styles.cardWrap}>
        {renderJustAnswered(styles.bandInCard)}
        {renderOpen(open, styles.bandInCard)}
      </View>
    ) : null;
  }

  if (mode === 'setup') return open ? renderOpen(open) : null;

  const answered = interview.questions.filter((question) => question.answered && question.key !== openKey);
  return (
    <View style={styles.page}>
      <View style={[styles.band, styles.bandOpen]}>
        <Text style={styles.heading}>{INTERVIEW_HEADING}</Text>
        <Text style={styles.why}>{interview.finished && !holding ? INTERVIEW_FINISHED_LINE : INTERVIEW_LEAD}</Text>
      </View>
      {answered.length > 0 ? (
        <View style={styles.band}>
          <Text style={styles.subheading}>{INTERVIEW_ANSWERED_HEADING}</Text>
          {answered.map((question) => (
            <View key={question.key} style={styles.answeredRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={textShadow} />
              <View style={styles.answeredText}>
                <Text style={styles.answeredQuestion}>{question.question}</Text>
                <Text style={styles.caption}>{question.summary}</Text>
              </View>
              {link(CHANGE_LABEL, () => setHolding(question.key))}
            </View>
          ))}
        </View>
      ) : null}
      {open ? renderOpen(open) : null}
      {interview.finished && !holding ? (
        <View style={styles.band}>
          <Text style={styles.subheading}>{BY_ITSELF_HEADING}</Text>
          {BY_ITSELF.map((line) => (
            <Text key={line} style={styles.caption}>{`• ${line}`}</Text>
          ))}
          <Text style={styles.subheading}>{NEEDS_FROM_YOU_HEADING}</Text>
          {NEEDS_FROM_YOU.map((line) => (
            <Text key={line} style={styles.caption}>{`• ${line}`}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 10 },
  cardWrap: { backgroundColor: colors.surface },
  band: {
    ...homeBandStyle,
    borderColor: colors.border,
    padding: HOME_BAND_CONTENT_PADDING,
    gap: 10,
    backgroundColor: colors.surface,
  },
  bandOpen: { borderColor: colors.primary },
  bandInCard: {
    borderLeftWidth: 0,
    borderTopColor: HOME_BAND_DIVIDER_COLOR,
    borderBottomColor: HOME_BAND_DIVIDER_COLOR,
  },
  heading: { ...typography.sectionTitle, color: colors.textPrimary, ...textShadow },
  subheading: { ...typography.label, color: colors.textPrimary, ...textShadow },
  question: { ...typography.bodyEmphasis, color: colors.textPrimary, ...textShadow },
  why: { ...typography.body, color: colors.textSecondary, ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow, flexShrink: 1 },
  error: { ...typography.caption, color: colors.statusYellowStandalone, ...textShadow },
  freeLine: {
    gap: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  // The quick access menu's panel and wells (components/QuickAccessButton.tsx),
  // one column on a phone and as many as fit on a wider window.
  panel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.menuSurface,
  },
  well: {
    flexGrow: 1,
    flexBasis: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.6)',
    borderLeftColor: 'rgba(0,0,0,0.45)',
    borderRightColor: 'rgba(255,255,255,0.08)',
    borderBottomColor: 'rgba(255,255,255,0.18)',
  },
  wellWide: { flexBasis: '100%', alignItems: 'flex-start' },
  wellInline: { flexGrow: 0, flexBasis: 'auto' },
  wellPressed: { backgroundColor: 'rgba(0,0,0,0.55)' },
  wellText: { flex: 1, gap: 2 },
  wellLabel: { ...typography.body, color: colors.textPrimary, ...textShadow },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, backgroundColor: colors.surface },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  linkText: { ...typography.caption, color: colors.primary, ...textShadow },
  linkMuted: { ...typography.caption, color: colors.textMuted, ...textShadow },
  choiceList: { gap: 10, backgroundColor: colors.surface },
  styleRow: { gap: 4, backgroundColor: colors.surface },
  styleName: { ...typography.label, color: colors.textPrimary, ...textShadow },
  addRow: { backgroundColor: colors.surface },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: colors.surface },
  answeredRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.surface },
  answeredText: { flex: 1, gap: 1 },
  answeredQuestion: { ...typography.body, color: colors.textPrimary, ...textShadow },
});
