import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { AppActionSheet, type AppActionSheetAction } from './AppActionSheet';
import { AppTextInput } from './AppTextInput';
import { useInfoAlert } from './InfoAlert';
import { PopoverSelect } from './PopoverSelect';
import { KeepRemindingPicker } from './KeepRemindingPicker';
import { TabBand, useTabBandStyles } from './TabBand';
import { useBandFolds } from '../hooks/useBandFolds';
import { BUTTON_SHADOW, colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import {
  CHECK_EVERY_UNITS,
  checkStanding,
  cleanCheckTimes,
  cleanEveryN,
  defaultCheckSchedule,
  describeCheckSchedule,
  describeDue,
  formatHour,
  localDayKey,
  MAX_CHECK_TIMES,
  REMINDER_DAY_NAMES,
  toggleReminderDay,
  describeCheckRoutine,
  describeChecksSummary,
  groupChecksByRoutine,
  MAX_CHECK_NAME,
  routineForCheck,
  summarizeChecks,
  type CheckEveryUnit,
  type CheckRepeat,
  type CheckSchedule,
  type CheckStanding,
  type DoneCheck,
  type Routine,
} from '../lib/routines';
import {
  createDoneCheck,
  deleteDoneCheck,
  getDoneChecks,
  getRoutines,
  markDoneCheck,
  moveDoneCheck,
  undoLastCheckMark,
  updateDoneCheck,
} from '../lib/routinesDb';
import { syncReminderNotifications } from '../lib/reminderNotifications';
import { explainNotYet } from '../lib/notYet';
import { t } from '../lib/i18n';
import { useWalkMark } from './WalkMark';
import { RecordPhotos } from './RecordPhotos';
import { ThumbRow } from './ThumbRow';

// The To Do List: the things you need to do regularly, and whether you did.
//
// Life's tenth area, 2026-09-17, from the daily-living program (CLAUDE.md
// item 28), first called Did I Do It. The audience is somebody standing on
// the stairs at eleven in the morning trying to remember whether they took
// the pill. The question stays the point: a glance answers whether it was
// done, instead of a walk back upstairs or a second payment of the same bill.
//
// A SCHEDULE OF ITS OWN, 2026-10-28, direct instruction: "it needs to have a
// true schedule built around it, including days of the week and it
// continually repeats and is available to be checked off the next time the
// time is for it to be done again." So every thing has one or more times a
// day, on days of the week or every N days, weeks or months, and each time
// is checked off on its own. "No set pattern" is gone ("These things are
// things they need to do regularly"), and so is the once-a-period answer it
// replaced. The lens is called the To Do List on screen; its key stays
// 'didIDoIt' so saved places and how-tos keep working, and the one-off list
// that was called To-Do is Tasks.
//
// HOW THIS RELATES TO ROUTINES, 2026-09-17: "Did I Do it should be related
// to Routines, not treated separately." And the split agreed 2026-10-28: a
// routine only puts things in order. A thing a routine walks past is listed
// under it and reminded with it, never on its own, so nothing speaks twice.
// The button on a card here is for the times the thing was done without
// walking anything.

type Props = { tabColor: string };

type CheckForm = { id: string | null; name: string } & CheckSchedule;

const REPEAT_OPTIONS: { label: string; value: CheckRepeat }[] = [
  { label: 'On days of the week', value: 'days' },
  { label: 'Every few days, weeks or months', value: 'every' },
];

const UNIT_OPTIONS = CHECK_EVERY_UNITS.map((entry) => ({ label: entry.plural, value: entry.key }));

const TIME_HOUR_OPTIONS = Array.from({ length: 24 }, (unused, hour) => ({ label: formatHour(hour), value: String(hour) }));
const TIME_MINUTE_OPTIONS = Array.from({ length: 12 }, (unused, index) => ({
  label: `:${String(index * 5).padStart(2, '0')}`,
  value: String(index * 5),
}));

const DAY_WORDS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_WORDS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function hourOf(time: string): string {
  return String(Number(time.split(':')[0]));
}

function minuteOf(time: string): string {
  return String(Number(time.split(':')[1]));
}

function dayFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function sayDay(key: string, todayKey: string): string {
  const date = dayFromKey(key);
  const today = dayFromKey(todayKey);
  const apart = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (apart === 0) return t('Today');
  if (apart === 1) return t('Tomorrow');
  return t('{weekday}, {month} {day}', {
    weekday: t(DAY_WORDS[date.getDay()]),
    month: t(MONTH_WORDS[date.getMonth()]),
    day: date.getDate(),
  });
}

/** The days an 'every' schedule can count from: the one it has, then the
 *  next five weeks, which reaches every weekday and most days of a month. */
function startOptions(current: string): { label: string; value: string }[] {
  const now = new Date();
  const todayKey = localDayKey(now);
  const keys: string[] = [];
  for (let offset = 0; offset < 35; offset += 1) {
    keys.push(localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)));
  }
  if (!keys.includes(current)) keys.unshift(current);
  return keys.map((key) => ({ label: sayDay(key, todayKey), value: key }));
}

function emptyForm(): CheckForm {
  return { id: null, name: '', ...defaultCheckSchedule(new Date()) };
}

function formFor(check: DoneCheck): CheckForm {
  return {
    id: check.id,
    name: check.name,
    times: check.times,
    repeat: check.repeat,
    days: check.days,
    everyN: check.everyN,
    everyUnit: check.everyUnit,
    startsOn: check.startsOn,
    reminderOn: check.reminderOn,
    keepReminding: check.keepReminding,
  };
}

/** A new time for the form: an hour after the last one, or 9am. */
function nextTimeAfter(times: string[]): string {
  const last = times[times.length - 1];
  if (!last) return '09:00';
  const hour = Math.min(23, Number(hourOf(last)) + 1);
  return buildTime(hour, Number(minuteOf(last)));
}

export function DidIDoItSection({ tabColor }: Props) {
  // The outline on a button a Your Story walk line names (components/WalkMark.ts).
  const walkMark = useWalkMark();
  const router = useRouter();
  const [showInfoAlert, infoAlertElement] = useInfoAlert();
  const [checks, setChecks] = useState<DoneCheck[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CheckForm | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message?: string;
    actions: AppActionSheetAction[];
  } | null>(null);

  const styles = useMemo(() => makeStyles(tabColor), [tabColor]);
  const band = useTabBandStyles(tabColor);
  const folds = useBandFolds();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getDoneChecks(true), getRoutines(true)])
      .then(([loadedChecks, loadedRoutines]) => {
        setChecks(loadedChecks);
        setRoutines(loadedRoutines);
      })
      .catch((error) => showInfoAlert('Could not load', error instanceof Error ? error.message : String(error)))
      .finally(() => setLoading(false));
  }, [showInfoAlert]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // One moment for every line and for the summary above them, worked out
  // again only when the things themselves change. Read fresh on each render
  // instead, the rows and the count could be answering about two different
  // moments, which on this screen is the one thing that must not happen.
  const { standings, summary, now } = useMemo(() => {
    const moment = new Date();
    const map = new Map<string, CheckStanding>();
    for (const check of checks) map.set(check.id, checkStanding(check, moment));
    return { standings: map, summary: summarizeChecks(checks, moment), now: moment };
  }, [checks]);
  const summaryLine = describeChecksSummary(summary);

  const liveRoutines = useMemo(() => routines.filter((routine) => routine.active), [routines]);
  const groups = useMemo(() => groupChecksByRoutine(checks, routines), [checks, routines]);

  // Headings earn their place only when at least one routine walks past
  // something. With no routines at all every thing would sit under one
  // heading reading "Not part of a routine", which tells nobody anything.
  const showHeadings = groups.some((group) => group.routine !== null);

  async function saveCheck() {
    if (!form) return;
    if (!form.name.trim()) {
      explainNotYet('Give it a name first, the way you would say it out loud, like "Morning pill".');
      return;
    }
    if (cleanCheckTimes(form.times).length === 0) {
      explainNotYet('Pick at least one time of day for it.');
      return;
    }
    const { id, name, ...schedule } = form;
    const saved = id ? ((await updateDoneCheck(id, name, schedule)) ? id : null) : await createDoneCheck(name, schedule);
    if (saved) void syncReminderNotifications();
    setForm(null);
    load();
  }

  function confirmRemove(check: DoneCheck) {
    setConfirm({
      title: t('Remove {name}?', { name: check.name }),
      message:
        'Everything recorded against it goes too, and any routine step pointing at it stops recording. Retiring it instead keeps the history.',
      actions: [
        {
          label: 'Remove it',
          destructive: true,
          onPress: async () => {
            setConfirm(null);
            await deleteDoneCheck(check.id);
            load();
            void syncReminderNotifications();
          },
        },
        { label: 'Keep it', onPress: () => setConfirm(null) },
      ],
    });
  }

  function setTime(index: number, time: string) {
    if (!form) return;
    setForm({ ...form, times: form.times.map((each, i) => (i === index ? time : each)) });
  }

  function renderForm(current: CheckForm) {
    const routine = current.id ? routineForCheck(current.id, liveRoutines) : null;
    const unit = CHECK_EVERY_UNITS.find((entry) => entry.key === current.everyUnit) ?? CHECK_EVERY_UNITS[0];
    const numberOptions = Array.from({ length: unit.most }, (unused, i) => ({ label: String(i + 1), value: String(i + 1) }));
    return (
      <View style={band.box}>
        <Text style={styles.cardTitle}>{current.id ? 'Change this one' : 'Something on your To Do List'}</Text>

        <Text style={styles.label}>What you need to do</Text>
        <AppTextInput
          onVoiceResult={(text) => setForm({ ...current, name: text })}
          style={styles.input}
          value={current.name}
          onChangeText={(text) => setForm({ ...current, name: text })}
          placeholder="Morning pill"
          placeholderTextColor={colors.textMuted}
          maxLength={MAX_CHECK_NAME}
        />

        <Text style={styles.label}>At these times</Text>
        {current.times.map((time, index) => (
          <View key={`${index}`} style={styles.clockRow}>
            <PopoverSelect
              options={TIME_HOUR_OPTIONS}
              selected={hourOf(time)}
              onSelect={(value) => setTime(index, buildTime(Number(value), Number(minuteOf(time))))}
              tabColor={tabColor}
            />
            <PopoverSelect
              options={TIME_MINUTE_OPTIONS}
              selected={minuteOf(time)}
              minWidth={64}
              onSelect={(value) => setTime(index, buildTime(Number(hourOf(time)), Number(value)))}
              tabColor={tabColor}
            />
            {current.times.length > 1 ? (
              <TouchableOpacity
                onPress={() => setForm({ ...current, times: current.times.filter((unused, i) => i !== index) })}
              >
                <Text style={styles.actionTextRemove}>Take this time off</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() =>
            current.times.length >= MAX_CHECK_TIMES
              ? explainNotYet(t('Six times a day is the most one thing can have. Make a second thing for the rest.'))
              : setForm({ ...current, times: [...current.times, nextTimeAfter(current.times)] })
          }
        >
          <Text style={styles.secondaryButtonText}>+ Another time in the day</Text>
        </TouchableOpacity>
        <Text style={styles.helperText}>
          Each time is checked off on its own, so a pill at 8am and 8pm is two answers a day.
        </Text>

        <Text style={styles.label}>Which days</Text>
        <PopoverSelect
          options={REPEAT_OPTIONS}
          selected={current.repeat}
          onSelect={(value) => setForm({ ...current, repeat: value as CheckRepeat })}
          tabColor={tabColor}
        />
        {current.repeat === 'days' ? (
          <>
            <View style={[styles.dayRow, styles.dayRowSpaced]}>
              {REMINDER_DAY_NAMES.map((name, day) => {
                const on = current.days.length === 0 || current.days.includes(day);
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.dayPill, on ? styles.dayPillOn : null]}
                    onPress={() => setForm({ ...current, days: toggleReminderDay(current.days, day) })}
                  >
                    <Text style={[styles.dayPillText, on ? styles.dayPillTextOn : null]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.helperText}>Tap a day to leave it out. All seven lit means every day.</Text>
          </>
        ) : (
          <>
            <View style={[styles.clockRow, styles.dayRowSpaced]}>
              <Text style={styles.bodyText}>Every</Text>
              <PopoverSelect
                options={numberOptions}
                selected={String(cleanEveryN(current.everyN, current.everyUnit))}
                minWidth={64}
                onSelect={(value) => setForm({ ...current, everyN: Number(value) })}
                tabColor={tabColor}
              />
              <PopoverSelect
                options={UNIT_OPTIONS}
                selected={current.everyUnit}
                onSelect={(value) => {
                  const everyUnit = value as CheckEveryUnit;
                  setForm({ ...current, everyUnit, everyN: cleanEveryN(current.everyN, everyUnit) });
                }}
                tabColor={tabColor}
              />
            </View>
            <Text style={styles.label}>Starting</Text>
            <PopoverSelect
              options={startOptions(current.startsOn)}
              selected={current.startsOn}
              onSelect={(value) => setForm({ ...current, startsOn: value })}
              tabColor={tabColor}
            />
            <Text style={styles.helperText}>
              The day it starts sets the rest: every 2 weeks from a Tuesday stays on Tuesdays, and every month
              from the 15th stays on the 15th.
            </Text>
          </>
        )}
        <Text style={styles.helperText}>{describeCheckSchedule(current)}</Text>

        <Text style={styles.label}>A reminder in the notification area</Text>
        {routine ? (
          <Text style={styles.helperText}>
            {t('Reminded with {routine}. A thing a routine walks past is reminded with the routine, so it never speaks twice.', { routine: routine.name })}
          </Text>
        ) : (
          <>
            <View style={styles.dayRow}>
              {[
                { on: true, label: 'Remind me' },
                { on: false, label: 'No reminder' },
              ].map((choice) => (
                <TouchableOpacity
                  key={choice.label}
                  style={[styles.dayPill, current.reminderOn === choice.on ? styles.dayPillOn : null]}
                  onPress={() => setForm({ ...current, reminderOn: choice.on })}
                >
                  <Text style={[styles.dayPillText, current.reminderOn === choice.on ? styles.dayPillTextOn : null]}>
                    {choice.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helperText}>
              {current.reminderOn
                ? 'One reminder at each time, kept together with the rest of your To Do List. Done on it checks that time off, even with the phone locked, and it comes back at the next time.'
                : 'It stays on this list to check off, and the phone never asks.'}
            </Text>
            {current.reminderOn ? (
              <KeepRemindingPicker
                value={current.keepReminding}
                onChange={(keepReminding) => setForm({ ...current, keepReminding })}
                tabColor={tabColor}
                labelStyle={styles.label}
                helperStyle={styles.helperText}
              />
            ) : null}
          </>
        )}

        <ThumbRow primary="first" style={styles.formActions}>
          <TouchableOpacity ref={walkMark.ref('didIDoIt.save')} style={styles.primaryButton} onPress={saveCheck}>
            <Text style={styles.primaryButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setForm(null)}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ThumbRow>
      </View>
    );
  }

  if (loading) return <View style={band.boxMuted}><Text style={styles.bodyText}>Loading…</Text></View>;

  return (
    <View style={band.column}>
      {infoAlertElement}
      <AppActionSheet
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        message={confirm?.message}
        actions={confirm?.actions ?? []}
      />

      <View style={band.box}>
        <Text style={styles.cardTitle}>To Do List</Text>
        <Text style={styles.bodyText}>
          A great way to make sure you know whether you did or did not do something. Give each thing its times
          and days, check it off each time you do it, and it comes back at its next time. The reminders sit
          together in your notification area, and Done works there without unlocking the phone.
        </Text>
        {summaryLine ? <Text style={styles.rowMeta}>{summaryLine}</Text> : null}
        {!form ? (
          <TouchableOpacity
            ref={walkMark.ref('didIDoIt.add')}
            style={[styles.primaryButton, walkMark('didIDoIt.add')]}
            onPress={() => setForm(emptyForm())}
          >
            <Text style={styles.primaryButtonText}>+ Add something to do</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {form ? renderForm(form) : null}

      {checks.length === 0 && !form ? (
        <View style={band.box}>
          <Text style={styles.bodyText}>
            Nothing here yet. The ones worth adding first are the ones you have gone back upstairs to check:
            the pill, the stove, the back door.
          </Text>
        </View>
      ) : null}

      {groups.map((group) => {
        const groupKey = group.routine ? group.routine.id : 'loose';
        const rows = group.checks.map((check) => {
            const standing = standings.get(check.id);
            const done = standing?.done === true;
            const position = checks.indexOf(check);
            const first = check === groups[0].checks[0];
            const inRoutine = routineForCheck(check.id, liveRoutines);
            const reminderLine = inRoutine
              ? t('Reminded with {routine}.', { routine: inRoutine.name })
              : check.reminderOn
                ? null
                : t('No reminder.');
            return (
              <View
                key={check.id}
                style={[showHeadings ? band.row : band.box, check.active ? null : styles.dimmed, done ? styles.cardDone : null]}
              >
                <Text style={styles.cardTitle}>{check.name}</Text>
                <Text style={[styles.rowMeta, done ? styles.metaDone : null]}>{standing?.line}</Text>
                <Text style={styles.rowMeta}>
                  {reminderLine ? `${describeCheckSchedule(check, t)} ${reminderLine}` : describeCheckSchedule(check, t)}
                </Text>
                {/* A photo of the stove off or the door locked is the one answer to
                    "did I do it" that needs no remembering at all. */}
                <RecordPhotos ownerKind="done_check" ownerId={check.id} tabColor={tabColor} title={check.name} />

                {check.active ? (
                  <TouchableOpacity
                    ref={first ? walkMark.ref('didIDoIt.yes') : undefined}
                    style={styles.primaryButton}
                    onPress={async () => { await markDoneCheck(check.id, 'tap'); load(); void syncReminderNotifications(); }}
                  >
                    <Text style={styles.primaryButtonText}>
                      {done && standing?.nextDue
                        ? t('Done early for {when}', { when: describeDue(standing.nextDue, now) })
                        : 'Yes, just did it'}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <View style={styles.rowActions}>
                  {check.lastMarkedAt ? (
                    <TouchableOpacity ref={first ? walkMark.ref('didIDoIt.mistake') : undefined} onPress={async () => { await undoLastCheckMark(check.id); load(); void syncReminderNotifications(); }}>
                      <Text style={styles.actionText}>That was a mistake</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    ref={first ? walkMark.ref('didIDoIt.change') : undefined}
                    onPress={() => setForm(formFor(check))}
                  >
                    <Text style={styles.actionText}>Change</Text>
                  </TouchableOpacity>
                  {position > 0 ? (
                    <TouchableOpacity onPress={async () => { await moveDoneCheck(check.id, -1); load(); }}>
                      <Text style={styles.actionText}>Move up</Text>
                    </TouchableOpacity>
                  ) : null}
                  {position < checks.length - 1 ? (
                    <TouchableOpacity ref={first ? walkMark.ref('didIDoIt.moveDown') : undefined} onPress={async () => { await moveDoneCheck(check.id, 1); load(); }}>
                      <Text style={styles.actionText}>Move down</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity ref={first ? walkMark.ref('didIDoIt.remove') : undefined} onPress={() => confirmRemove(check)}>
                    <Text style={styles.actionTextRemove}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          });
        if (!showHeadings) return <View key={groupKey} style={band.column}>{rows}</View>;
        return (
          <TabBand
            key={groupKey}
            folds={folds}
            color={tabColor}
            id={`life:didIDoIt:${groupKey}`}
            title={group.heading}
            icon="checkmark-done-outline"
            count={group.checks.length}
          >
            <View style={band.rows}>
              <View style={band.row}>
                {group.routine ? (
                  <>
                    <Text style={styles.rowMeta}>
                      {describeCheckRoutine(group.checks[0].id, routines)}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({ pathname: '/routine', params: { id: group.routine?.id ?? '' } })
                      }
                    >
                      <Text style={styles.actionText}>Walk it</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.rowMeta}>
                    These are checked off here or from their reminders.
                  </Text>
                )}
              </View>
              {rows}
            </View>
          </TabBand>
        );
      })}
    </View>
  );
}

function makeStyles(tabColor: string) {
  return StyleSheet.create({
    // A done row steps back rather than lighting up. Nothing here is a
    // score, and a row that has been answered is finished being interesting.
    cardDone: { opacity: 0.75 },
    dimmed: { opacity: 0.6 },
    cardTitle: { ...typography.sectionTitle, color: colors.textPrimary, marginBottom: 8, ...textShadow },
    bodyText: { ...typography.body, color: colors.textSecondary, ...textShadow },
    helperText: { ...typography.caption, color: colors.textMuted, marginTop: 6, marginBottom: 4, ...textShadow },

    label: { ...typography.label, color: colors.menuLabelMuted, marginTop: 12, marginBottom: 4, ...textShadow },
    clockRow: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
    dayRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    dayRowSpaced: { marginTop: 8 },
    dayPill: {
      backgroundColor: colors.surfaceMuted, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
      paddingVertical: 8, paddingHorizontal: 10,
    },
    dayPillOn: { backgroundColor: tabColor, borderColor: tabColor },
    dayPillText: { ...typography.caption, color: colors.textMuted, ...textShadow },
    dayPillTextOn: { color: colors.textOnButton, textShadowColor: 'transparent', textShadowRadius: 0 },
    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
    input: {
      backgroundColor: colors.surfaceMuted, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary,
    },

    rowMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2, ...textShadow },
    metaDone: { color: colors.textSecondary },

    rowActions: { flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' },
    actionText: { ...typography.caption, color: tabColor, ...textShadow },
    actionTextRemove: { ...typography.caption, color: colors.danger, ...textShadow },

    formActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
    primaryButton: {
      backgroundColor: colors.buttonColor, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18,
      alignItems: 'center', marginTop: 12, ...BUTTON_SHADOW,
    },
    primaryButtonText: { ...typography.body, color: colors.textOnButton, textShadowColor: 'transparent', textShadowRadius: 0 },
    secondaryButton: {
      backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
      paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', marginTop: 12,
    },
    secondaryButtonText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  });
}
