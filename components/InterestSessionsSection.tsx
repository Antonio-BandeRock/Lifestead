// Interests > Sessions (2026-10-30, Interests stage 2): time given to an
// interest, typed afterwards or kept by a timer, with an optional project,
// a note and where it was left off, plus a practice time per interest that
// raises a reminder on the days chosen.
//
// A session is a record of time given, and nothing here counts a run of
// days, compares weeks or says how much is enough. Every sentence is in
// lib/interestSessions.ts, checked by scripts/test_interest_sessions.js.

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { groupInterests, interestChoices, localDayOf, type Interest } from '../lib/interests';
import { listInterests, setInterestPractice } from '../lib/interestsDb';
import {
  PRACTICE_DAY_PILLS,
  describePractice,
  describeSessionLine,
  describeSessionTotal,
  describeTimer,
  formatMinutes,
  formatPracticeTime,
  groupSessionsByMonth,
  readDuration,
  readPracticeTime,
  readSessionDay,
  type InterestSession,
} from '../lib/interestSessions';
import {
  addInterestSession,
  deleteInterestSession,
  discardInterestTimer,
  listInterestSessions,
  startInterestTimer,
  stopInterestTimer,
  updateInterestSession,
} from '../lib/interestSessionsDb';
import { listProjects } from '../lib/projectsDb';
import type { Project } from '../lib/projects';
import { explainNotYet } from '../lib/notYet';
import { syncReminderNotifications } from '../lib/reminderNotifications';
import { AppActionSheet, type AppActionSheetAction } from './AppActionSheet';
import { useWalkMark } from './WalkMark';
import { AppTextInput } from './AppTextInput';
import { PopoverSelect } from './PopoverSelect';
import { ThumbRow } from './ThumbRow';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, PILL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';

const NO_PROJECT = '__no_project__';
const NO_INTEREST = '__no_interest__';

type Props = { tabColor: string };

type SessionForm = {
  /** Null for a new session. */
  id: string | null;
  /** 'timer' asks only what the timer is for. */
  mode: 'log' | 'timer';
  interestId: string | null;
  projectId: string | null;
  day: string;
  length: string;
  note: string;
  leftOff: string;
};

const DAY_HELP = 'That day could not be read. Try "yesterday", "Monday", "28 October", or leave it empty for today. A day still to come cannot have a session yet.';
const LENGTH_HELP = 'That could not be read as a length of time. Try "45", "45 min", "1h 20m" or "1:20", or leave it empty if it was not timed.';
const TIME_HELP = 'That could not be read as a time of day. Try "7pm", "7:30 pm" or "19:30".';

export function InterestSessionsSection({ tabColor }: Props) {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<InterestSession[]>([]);
  const [form, setForm] = useState<SessionForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [stopping, setStopping] = useState<{ note: string; leftOff: string }>({ note: '', leftOff: '' });
  const [practice, setPractice] = useState<{ interestId: string; days: number[]; time: string } | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showPractice, setShowPractice] = useState(false);
  const [saidBack, setSaidBack] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message?: string; actions: AppActionSheetAction[] } | null>(null);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    setInterests(await listInterests());
    setProjects(await listProjects('everything'));
    setSessions(await listInterestSessions());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const running = sessions.find((session) => session.running) ?? null;

  // The timer line moves on by itself while one is going.
  useEffect(() => {
    if (!running) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [running]);

  const today = localDayOf(new Date().toISOString());
  const walkMark = useWalkMark();
  const { current } = groupInterests(interests);
  const nameOf = (id: string) => interests.find((interest) => interest.id === id)?.name ?? 'An interest no longer listed';
  const projectNameOf = (id: string | null) => (id ? (projects.find((project) => project.id === id)?.name ?? null) : null);
  const months = groupSessionsByMonth(sessions);
  const firstSessionId = months[0]?.sessions[0]?.id;

  async function afterChange(message: string | null) {
    setSaidBack(message);
    await load();
  }

  function projectChoices(interestId: string | null, keepId: string | null) {
    const linked = projects.filter(
      (project) =>
        project.linkKind === 'interest' &&
        project.linkId === interestId &&
        (project.status === 'active' || project.status === 'paused' || project.id === keepId),
    );
    return [{ label: 'No project', value: NO_PROJECT }, ...linked.map((project) => ({ label: project.name, value: project.id }))];
  }

  function needsAnInterest(): boolean {
    if (current.length > 0) return false;
    explainNotYet('A session belongs to an interest. Add one on My Interests first, then come back here.');
    return true;
  }

  function startLog() {
    if (needsAnInterest()) return;
    setFormError(null);
    setForm({ id: null, mode: 'log', interestId: current.length === 1 ? current[0].id : null, projectId: null, day: '', length: '', note: '', leftOff: '' });
  }

  function startTimerForm() {
    if (needsAnInterest()) return;
    if (running) {
      explainNotYet(`A timer is already going for ${nameOf(running.interestId)}. Stop it or throw it away first.`);
      return;
    }
    setFormError(null);
    setForm({ id: null, mode: 'timer', interestId: current.length === 1 ? current[0].id : null, projectId: null, day: '', length: '', note: '', leftOff: '' });
  }

  function startChange(session: InterestSession) {
    setFormError(null);
    setForm({
      id: session.id,
      mode: 'log',
      interestId: session.interestId,
      projectId: session.projectId,
      day: session.doneOn === today ? '' : session.doneOn,
      length: session.minutes === null ? '' : String(session.minutes),
      note: session.note ?? '',
      leftOff: session.leftOff ?? '',
    });
  }

  async function saveForm() {
    if (!form) return;
    if (!form.interestId) {
      explainNotYet('Pick the interest this time was for first.');
      return;
    }
    const name = nameOf(form.interestId);
    if (form.mode === 'timer') {
      await startInterestTimer(form.interestId, form.projectId);
      setForm(null);
      setStopping({ note: '', leftOff: '' });
      await afterChange(`Timer started for ${name}.`);
      return;
    }
    const day = readSessionDay(form.day, today);
    if (!day.ok || !day.day) {
      setFormError(DAY_HELP);
      return;
    }
    const length = readDuration(form.length);
    if (!length.ok) {
      setFormError(LENGTH_HELP);
      return;
    }
    const input = {
      interestId: form.interestId,
      projectId: form.projectId,
      doneOn: day.day,
      minutes: length.minutes,
      note: form.note,
      leftOff: form.leftOff,
    };
    if (form.id) {
      await updateInterestSession(form.id, input);
      setForm(null);
      await afterChange(`${name}: session changed.`);
    } else {
      await addInterestSession(input);
      setForm(null);
      await afterChange(length.minutes === null ? `${name}: session kept.` : `${name}: ${formatMinutes(length.minutes)} kept.`);
    }
  }

  async function stopTimer() {
    if (!running) return;
    const name = nameOf(running.interestId);
    const minutes = await stopInterestTimer(running.id, stopping);
    setStopping({ note: '', leftOff: '' });
    await afterChange(`${name}: ${formatMinutes(minutes)} kept.`);
  }

  function askDiscard() {
    if (!running) return;
    setConfirm({
      title: 'Throw this timer away?',
      message: 'Nothing is kept from it. To keep the time, tap Stop and Keep instead.',
      actions: [
        {
          label: 'Throw It Away',
          destructive: true,
          onPress: async () => {
            setConfirm(null);
            await discardInterestTimer(running.id);
            await afterChange('Timer thrown away.');
          },
        },
        { label: 'Keep it going', onPress: () => setConfirm(null) },
      ],
    });
  }

  function askRemove(session: InterestSession) {
    setConfirm({
      title: 'Remove this session?',
      message: `${nameOf(session.interestId)}, ${describeSessionLine(session, today)}. It comes off the list for good.`,
      actions: [
        {
          label: 'Remove',
          destructive: true,
          onPress: async () => {
            setConfirm(null);
            setOpenId(null);
            await deleteInterestSession(session.id);
            await afterChange('Session removed.');
          },
        },
        { label: 'Keep it', onPress: () => setConfirm(null) },
      ],
    });
  }

  function startPractice(interest: Interest) {
    setPracticeError(null);
    setPractice({
      interestId: interest.id,
      days: interest.practiceDays ?? [],
      time: interest.practiceTime ? formatPracticeTime(interest.practiceTime) : '',
    });
  }

  async function savePractice() {
    if (!practice) return;
    if (practice.days.length === 0) {
      explainNotYet('Tap at least one day for the practice time, or tap Turn Off to have none.');
      return;
    }
    const time = readPracticeTime(practice.time);
    if (!time) {
      setPracticeError(TIME_HELP);
      return;
    }
    await setInterestPractice(practice.interestId, practice.days, time);
    const name = nameOf(practice.interestId);
    setPractice(null);
    await syncReminderNotifications();
    await afterChange(`${name}: ${describePractice(practice.days, time)}.`);
  }

  async function turnOffPractice() {
    if (!practice) return;
    const name = nameOf(practice.interestId);
    await setInterestPractice(practice.interestId, [], null);
    setPractice(null);
    await syncReminderNotifications();
    await afterChange(`${name}: no practice time.`);
  }

  function renderInterestPicker(selected: string | null, onSelect: (id: string) => void) {
    return (
      <PopoverSelect
        options={[{ label: 'Pick an interest', value: NO_INTEREST }, ...interestChoices(interests, selected)]}
        selected={selected ?? NO_INTEREST}
        onSelect={(value) => onSelect(value === NO_INTEREST ? '' : value)}
        tabColor={tabColor}
        searchable
        width={260}
      />
    );
  }

  function renderForm() {
    if (!form) return null;
    const choices = projectChoices(form.interestId, form.projectId);
    return (
      <View style={[styles.nestedForm, { borderLeftColor: tabColor }]}>
        <Text style={styles.captionText}>Which interest</Text>
        {renderInterestPicker(form.interestId, (id) => setForm({ ...form, interestId: id || null, projectId: null }))}
        {choices.length > 1 ? (
          <>
            <Text style={styles.captionText}>For a project (optional)</Text>
            <PopoverSelect
              options={choices}
              selected={form.projectId ?? NO_PROJECT}
              onSelect={(value) => setForm({ ...form, projectId: value === NO_PROJECT ? null : value })}
              tabColor={tabColor}
              width={260}
            />
          </>
        ) : null}
        {form.mode === 'log' ? (
          <>
            <AppTextInput
              style={styles.textInput}
              value={form.day}
              onChangeText={(day) => setForm({ ...form, day })}
              placeholder="Which day (empty for today): yesterday, Monday"
            />
            <AppTextInput
              style={styles.textInput}
              value={form.length}
              onChangeText={(length) => setForm({ ...form, length })}
              placeholder="How long (optional): 45 min, 1h 20m"
            />
            <AppTextInput
              style={styles.textInput}
              value={form.note}
              onChangeText={(note) => setForm({ ...form, note })}
              placeholder="What you did (optional)"
              multiline
            />
            <AppTextInput
              style={styles.textInput}
              value={form.leftOff}
              onChangeText={(leftOff) => setForm({ ...form, leftOff })}
              placeholder="Where you left off (optional)"
              multiline
            />
          </>
        ) : (
          <Text style={styles.captionText}>The timer keeps going while the app is closed. Stop it when you finish.</Text>
        )}
        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
        <ThumbRow primary="first" style={styles.actionRow}>
          <TouchableOpacity
            ref={form.mode === 'timer' ? walkMark.ref('session.start') : walkMark.ref('session.save')}
            style={styles.primaryButton}
            onPress={saveForm}
          >
            <Text style={styles.primaryButtonText}>{form.mode === 'timer' ? 'Start the Timer' : form.id ? 'Save' : 'Keep the Session'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setForm(null)}>
            <Text style={styles.linkText}>Cancel</Text>
          </TouchableOpacity>
        </ThumbRow>
      </View>
    );
  }

  function renderRunning() {
    if (!running) return null;
    const project = projectNameOf(running.projectId);
    return (
      <View style={[styles.nestedForm, { borderLeftColor: tabColor }]}>
        <View style={styles.timerHead}>
          <Ionicons name="timer-outline" size={18} color={tabColor} />
          <Text style={styles.bodyText}>{project ? `${nameOf(running.interestId)}, ${project}` : nameOf(running.interestId)}</Text>
        </View>
        <Text style={styles.captionText}>{describeTimer(running.startedAt ?? running.createdAt, now)}</Text>
        <AppTextInput
          style={styles.textInput}
          value={stopping.note}
          onChangeText={(note) => setStopping({ ...stopping, note })}
          placeholder="What you did (optional)"
          multiline
        />
        <AppTextInput
          style={styles.textInput}
          value={stopping.leftOff}
          onChangeText={(leftOff) => setStopping({ ...stopping, leftOff })}
          placeholder="Where you left off (optional)"
          multiline
        />
        <ThumbRow primary="first" style={styles.actionRow}>
          <TouchableOpacity ref={walkMark.ref('session.stop')} style={styles.primaryButton} onPress={stopTimer}>
            <Text style={styles.primaryButtonText}>Stop and Keep</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={askDiscard}>
            <Text style={[styles.linkText, { color: colors.danger }]}>Throw Away</Text>
          </TouchableOpacity>
        </ThumbRow>
      </View>
    );
  }

  function renderPractice() {
    return (
      <View style={styles.group}>
        <TouchableOpacity
          ref={walkMark.ref('session.practice')}
          onPress={() => setShowPractice(!showPractice)}
          style={styles.groupToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: showPractice }}
        >
          <Ionicons name={showPractice ? 'chevron-down' : 'chevron-forward'} size={16} color={tabColor} />
          <Text style={styles.groupHeading}>Practice Times</Text>
        </TouchableOpacity>
        {showPractice ? (
          <>
            <Text style={styles.captionText}>A reminder on the days you pick. Done keeps a session for that day, and one left unanswered is let go.</Text>
            {current.length === 0 ? <Text style={styles.captionText}>No interests yet. Add one on My Interests.</Text> : null}
            {current.map((interest, index) =>
              practice?.interestId === interest.id ? (
                <View key={interest.id} style={[styles.nestedForm, { borderLeftColor: tabColor }]}>
                  <Text style={styles.bodyText}>{interest.name}</Text>
                  <View style={styles.pillRow}>
                    {PRACTICE_DAY_PILLS.map((pill) => {
                      const on = practice.days.includes(pill.day);
                      return (
                        <TouchableOpacity
                          key={pill.day}
                          style={[styles.pill, on && styles.pillActive]}
                          onPress={() =>
                            setPractice({
                              ...practice,
                              days: on ? practice.days.filter((day) => day !== pill.day) : [...practice.days, pill.day],
                            })
                          }
                          accessibilityRole="switch"
                          accessibilityState={{ checked: on }}
                        >
                          <Text style={[styles.pillText, on ? styles.pillTextOn : null]}>{pill.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <AppTextInput
                    style={styles.textInput}
                    value={practice.time}
                    onChangeText={(time) => setPractice({ ...practice, time })}
                    placeholder="At what time: 7pm, or 19:30"
                  />
                  {practiceError ? <Text style={styles.errorText}>{practiceError}</Text> : null}
                  <ThumbRow primary="first" style={styles.actionRow}>
                    <TouchableOpacity ref={walkMark.ref('session.practiceSave')} style={styles.primaryButton} onPress={savePractice}>
                      <Text style={styles.primaryButtonText}>Save</Text>
                    </TouchableOpacity>
                    {interest.practiceTime ? (
                      <TouchableOpacity onPress={turnOffPractice}>
                        <Text style={styles.linkText}>Turn Off</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity onPress={() => setPractice(null)}>
                      <Text style={styles.linkText}>Cancel</Text>
                    </TouchableOpacity>
                  </ThumbRow>
                </View>
              ) : (
                <TouchableOpacity
                  key={interest.id}
                  ref={index === 0 ? walkMark.ref('session.practiceOpen') : undefined}
                  style={styles.row}
                  onPress={() => startPractice(interest)}
                  accessibilityRole="button"
                >
                  <View style={styles.itemText}>
                    <Text style={styles.bodyText}>{interest.name}</Text>
                    <Text style={styles.captionText}>{describePractice(interest.practiceDays ?? [], interest.practiceTime ?? null) ?? 'No practice time'}</Text>
                  </View>
                  <Ionicons name="create-outline" size={16} color={tabColor} />
                </TouchableOpacity>
              ),
            )}
          </>
        ) : null}
      </View>
    );
  }

  function renderSession(session: InterestSession) {
    const open = openId === session.id;
    const first = session.id === firstSessionId;
    if (form?.id === session.id) return <View key={session.id}>{renderForm()}</View>;
    return (
      <View key={session.id} style={[styles.sessionBlock, { borderLeftColor: tabColor }]}>
        <TouchableOpacity
          ref={first ? walkMark.ref('session.row') : undefined}
          onPress={() => setOpenId(open ? null : session.id)}
          style={styles.row}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
        >
          <View style={styles.itemText}>
            <Text style={styles.bodyText}>{nameOf(session.interestId)}</Text>
            <Text style={styles.captionText}>{describeSessionLine(session, today, projectNameOf(session.projectId))}</Text>
            {session.note ? <Text style={styles.captionText}>{session.note}</Text> : null}
            {open && session.leftOff ? <Text style={styles.captionText}>{`Where you left off: ${session.leftOff}`}</Text> : null}
          </View>
        </TouchableOpacity>
        {open ? (
          <View style={styles.links}>
            <TouchableOpacity ref={first ? walkMark.ref('session.change') : undefined} onPress={() => startChange(session)}>
              <Text style={styles.linkText}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => askRemove(session)}>
              <Text style={[styles.linkText, { color: colors.danger }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.captionText}>
        Time you give to an interest, with what you did and where you left off. Time it while you go, or add it afterwards.
      </Text>

      {renderRunning()}

      {form && !form.id ? (
        renderForm()
      ) : (
        <View style={styles.buttonRow}>
          <TouchableOpacity ref={walkMark.ref('session.timer')} style={styles.primaryButton} onPress={startTimerForm}>
            <Text style={styles.primaryButtonText}>Start a Timer</Text>
          </TouchableOpacity>
          <TouchableOpacity ref={walkMark.ref('session.log')} style={styles.primaryButton} onPress={startLog}>
            <Text style={styles.primaryButtonText}>Add a Session</Text>
          </TouchableOpacity>
        </View>
      )}
      {saidBack ? <Text style={styles.captionText}>{saidBack}</Text> : null}

      {renderPractice()}

      {months.length === 0 ? (
        <Text style={styles.captionText}>No sessions yet. Each one you keep shows here by month.</Text>
      ) : (
        months.map((month) => (
          <View key={month.month} style={styles.group}>
            <Text style={styles.groupHeading}>{month.label}</Text>
            <Text style={styles.captionText}>{describeSessionTotal(month.sessions)}</Text>
            {month.sessions.map(renderSession)}
          </View>
        ))
      )}

      <AppActionSheet
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        message={confirm?.message}
        actions={confirm?.actions ?? []}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  group: { gap: 8 },
  groupToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupHeading: { ...typography.label, color: colors.textPrimary, ...textShadow },
  sessionBlock: { gap: 6, paddingLeft: 8, borderLeftWidth: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  timerHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bodyText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  captionText: { ...typography.caption, color: colors.textMuted, ...textShadow },
  itemText: { flex: 1, gap: 2 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { ...PILL },
  pillActive: { ...PILL_ON },
  pillText: { ...PILL_TEXT },
  pillTextOn: { ...PILL_ON_TEXT },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
  },
  nestedForm: { gap: 8, padding: 12, borderRadius: 10, borderLeftWidth: 2, marginVertical: 4, backgroundColor: colors.surfaceMuted },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  primaryButton: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
  errorText: { color: colors.danger },
  linkText: { ...typography.body, color: colors.primary, ...textShadow },
});
