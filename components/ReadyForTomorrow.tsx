// Ready for Tomorrow (Q60, 1.0.96.4), on Schedules and as a Home band from
// the person's evening time on. Every rule and sentence is in
// lib/readyForTomorrow.ts; what is here reads, draws and saves the two
// things there are to save: a start made, and a start-ahead time.
//
// A closed vault that holds medications or appointments keeps their lines
// off this screen, as it does on the tab they come from.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { useBandFolds } from '../hooks/useBandFolds';
import { sortByLabel } from '../lib/choiceOrder';
import { clockLabel, type TimelineRoute } from '../lib/dayTimeline';
import { t } from '../lib/i18n';
import { explainNotYet } from '../lib/notYet';
import {
  hoursFrom,
  lengthWords,
  ownLeadProblem,
  isReadyTime,
  planPrep,
  prepDetail,
  prepMealWords,
  prepSentence,
  tomorrowLines,
  tonightRoutines,
  type PrepLine,
} from '../lib/readyForTomorrow';
import { listDishNames, markPrep, readReady, removeOwnLead, saveOwnLead, type ReadyData } from '../lib/readyForTomorrowDb';
import { PREP_KIND_LABELS, type PrepKind } from '../lib/recipePrep';
import { syncReminderNotifications } from '../lib/reminderNotifications';
import {
  getCachedReminderPreferences,
  getReminderPreferences,
  readyTomorrowTimeOf,
  subscribeToReminderPreferences,
} from '../lib/reminderPreferences';
import { saveOrSay } from '../lib/saveProblem';
import { useVaultReloadKey } from '../lib/vaultReads';
import { useVault } from '../lib/vaultSession';
import { AppTextInput } from './AppTextInput';
import { KIND_COLORS, KIND_ICONS } from './DayTimeline';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, HomeSectionBand } from './HomeSectionBand';
import { PopoverSelect } from './PopoverSelect';
import { ReadProblem } from './ReadProblem';
import { useWalkMark } from './WalkMark';

const READ_FAILED = 'Tomorrow could not be read just now. Nothing you recorded is lost.';

/** Whether the evening time has come, kept current while the app is open. */
export function useReadyTimeReached(): boolean {
  const [reached, setReached] = useState(() => isReadyTime(new Date(), readyTomorrowTimeOf(getCachedReminderPreferences())));
  useEffect(() => {
    const look = () => setReached(isReadyTime(new Date(), readyTomorrowTimeOf(getCachedReminderPreferences())));
    getReminderPreferences()
      .then(look)
      .catch((error) => console.warn('[ReadyForTomorrow] the evening time could not be read', error));
    const timer = setInterval(look, 60_000);
    const stop = subscribeToReminderPreferences(look);
    return () => {
      clearInterval(timer);
      stop();
    };
  }, []);
  return reached;
}

function useReady() {
  const [data, setData] = useState<ReadyData | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [failed, setFailed] = useState(false);
  const vault = useVault();
  const vaultKey = useVaultReloadKey();

  const load = useCallback(async () => {
    const at = Date.now();
    try {
      const next = await readReady(at);
      setNow(at);
      setData(next);
      setFailed(false);
    } catch (error) {
      console.error('[ReadyForTomorrow] could not be read', error);
      setFailed(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- vaultKey reads again as the vault opens or closes
    }, [load, vaultKey]),
  );

  const view = useMemo(() => {
    if (!data) return null;
    const closed = vault.closed ? vault.categories : [];
    return {
      ...planPrep(data.meals, data.own, data.marks, now),
      routines: tonightRoutines(data.items, now),
      lines: tomorrowLines(data.items, now, data.extras, closed),
      own: data.own,
    };
  }, [data, now, vault.closed, vault.categories]);

  const mark = async (line: PrepLine) => {
    await saveOrSay('That was not marked. Try again.', async () => {
      await markPrep(line.key, !line.done);
      await load();
      void syncReminderNotifications();
    });
  };

  return { view, now, failed, load, mark };
}

function useOpenRoute() {
  const router = useRouter();
  return (route: TimelineRoute) => router.push({ pathname: route.pathname, params: route.params ?? {} } as unknown as Href);
}

function PrepRow({
  line,
  now,
  tabColor,
  onMark,
  markRef,
}: {
  line: PrepLine;
  now: number;
  tabColor: string;
  onMark?: () => void;
  markRef?: (node: unknown) => void;
}) {
  const words = (
    <View style={styles.rowText}>
      <Text style={[styles.title, line.done ? styles.doneTitle : null]}>{prepSentence(line, t)}</Text>
      <Text style={styles.caption}>{prepDetail(line, now, t)}</Text>
      <Text style={styles.caption}>{prepMealWords(line, now, t)}</Text>
    </View>
  );
  if (!onMark) return <View style={[styles.row, { borderLeftColor: tabColor }]}>{words}</View>;
  return (
    <TouchableOpacity
      ref={markRef}
      style={[styles.row, { borderLeftColor: tabColor }]}
      onPress={onMark}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: line.done }}
    >
      <Ionicons name={line.done ? 'checkbox' : 'square-outline'} size={22} color={line.done ? colors.textMuted : tabColor} />
      {words}
    </TouchableOpacity>
  );
}

function TimedRow({
  kind,
  title,
  at,
  notes,
  onPress,
}: {
  kind: keyof typeof KIND_ICONS;
  title: string;
  at: number | null;
  notes: string[];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.row, { borderLeftColor: KIND_COLORS[kind] }]} onPress={onPress} accessibilityRole="button">
      <Ionicons name={KIND_ICONS[kind]} size={16} color={KIND_COLORS[kind]} />
      <View style={styles.rowText}>
        <Text style={styles.title}>{title}</Text>
        {notes.map((note) => (
          <Text key={note} style={styles.caption}>
            {note}
          </Text>
        ))}
      </View>
      <Text style={styles.caption}>{at === null ? t('Any time') : clockLabel(at)}</Text>
    </TouchableOpacity>
  );
}

export function ReadyForTomorrow({ tabColor }: { tabColor: string }) {
  const { view, now, failed, load, mark } = useReady();
  const folds = useBandFolds();
  const open = useOpenRoute();
  const router = useRouter();
  const walkMark = useWalkMark();

  if (!view) {
    return failed ? <ReadProblem message={READ_FAILED} onTryAgain={() => void load()} /> : null;
  }

  const band = (id: string) => ({
    kind: 'fold' as const,
    color: tabColor,
    expanded: folds.isOpen(`ready:${id}`),
    onToggle: () => folds.toggle(`ready:${id}`),
  });

  return (
    <View style={styles.column}>
      {failed ? <ReadProblem message={READ_FAILED} onTryAgain={() => void load()} /> : null}
      <HomeSectionBand {...band('tonight')} title="Start tonight" icon="moon-outline">
        <View style={styles.body}>
          {view.tonight.length === 0 && view.routines.length === 0 ? (
            <Text style={styles.caption}>Nothing planned has to be started tonight.</Text>
          ) : null}
          {view.tonight.map((line, index) => (
            <PrepRow
              key={line.key}
              line={line}
              now={now}
              tabColor={tabColor}
              onMark={() => void mark(line)}
              markRef={index === 0 ? walkMark.ref('ready.done') : undefined}
            />
          ))}
          {view.routines.length > 0 ? <Text style={styles.caption}>Routines still to come tonight</Text> : null}
          {view.routines.map((item) => (
            <TimedRow key={item.id} kind={item.kind} title={t(item.title)} at={item.start} notes={[]} onPress={() => open(item.route)} />
          ))}
        </View>
      </HomeSectionBand>
      <HomeSectionBand {...band('tomorrow')} title="Tomorrow" icon="sunny-outline" markRef={walkMark.ref('ready.tomorrow')}>
        <View style={styles.body}>
          {view.lines.length === 0 ? <Text style={styles.caption}>Nothing is recorded for tomorrow.</Text> : null}
          {view.lines.map((line) => (
            <TimedRow key={line.id} kind={line.kind} title={t(line.title)} at={line.at} notes={line.notes} onPress={() => open(line.route)} />
          ))}
        </View>
      </HomeSectionBand>
      {view.tomorrow.length > 0 ? (
        <HomeSectionBand {...band('startTomorrow')} title="Start tomorrow" icon="time-outline">
          <View style={styles.body}>
            {view.tomorrow.map((line) => (
              <PrepRow key={line.key} line={line} now={now} tabColor={tabColor} />
            ))}
          </View>
        </HomeSectionBand>
      ) : null}
      <HomeSectionBand {...band('own')} title="Start-ahead times of your own" icon="create-outline">
        <OwnLeads own={view.own} tabColor={tabColor} now={now} onChanged={load} addRef={walkMark.ref('ready.ownAdd')} />
      </HomeSectionBand>
      <HomeSectionBand
        kind="action"
        color={tabColor}
        title="The evening reminder"
        icon="notifications-outline"
        caption="Turn it on and choose its time in Profile, Notifications."
        onPress={() => router.push({ pathname: '/profile', params: { section: 'reminders' } })}
      />
    </View>
  );
}

function OwnLeads({
  own,
  tabColor,
  now,
  onChanged,
  addRef,
}: {
  own: ReadyData['own'];
  tabColor: string;
  now: number;
  onChanged: () => Promise<void>;
  addRef: (node: unknown) => void;
}) {
  const [dishes, setDishes] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<PrepKind>('thaw');
  const [hours, setHours] = useState('');

  useEffect(() => {
    listDishNames(now)
      .then(setDishes)
      .catch((error) => {
        // Only the list to pick from is lost; a name can still be typed.
        console.warn('[ReadyForTomorrow] dish names could not be read', error);
      });
  }, [now]);

  const kinds = sortByLabel((Object.keys(PREP_KIND_LABELS) as PrepKind[]).map((value) => ({ value, label: t(PREP_KIND_LABELS[value]) })));
  const dishOptions = sortByLabel(dishes.map((dish) => ({ value: dish, label: t(dish) })));

  const save = async () => {
    const problem = ownLeadProblem(name, hours, t);
    const read = hoursFrom(hours);
    if (problem || read === null) {
      if (problem) explainNotYet(problem);
      return;
    }
    await saveOrSay('The time was not saved. Try again.', async () => {
      await saveOwnLead(name, kind, read);
      setName('');
      setHours('');
      await onChanged();
      void syncReminderNotifications();
    });
  };

  const remove = async (key: string) => {
    await saveOrSay('The time is still there. Try again.', async () => {
      await removeOwnLead(key);
      await onChanged();
      void syncReminderNotifications();
    });
  };

  return (
    <View style={styles.body}>
      <Text style={styles.caption}>Yours is used in place of the one in the recipe. 0 hours means nothing has to be started.</Text>
      {own.map((lead) => (
        <View key={lead.key} style={[styles.row, { borderLeftColor: tabColor }]}>
          <View style={styles.rowText}>
            <Text style={styles.title}>{t(lead.name)}</Text>
            <Text style={styles.caption}>
              {lead.hours === 0 ? t('Nothing to start ahead') : [t(PREP_KIND_LABELS[lead.kind]), lengthWords(lead.hours, t)].join(' · ')}
            </Text>
          </View>
          <TouchableOpacity style={styles.secondary} onPress={() => void remove(lead.key)} accessibilityRole="button">
            <Text style={styles.secondaryText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}
      <View style={styles.field}>
        <Text style={styles.label}>Dish</Text>
        {dishOptions.length > 0 ? (
          <PopoverSelect
            options={dishOptions}
            selected={dishes.includes(name) ? name : null}
            onSelect={setName}
            tabColor={tabColor}
            placeholder={t('Pick a dish')}
            searchable={dishOptions.length > 8}
          />
        ) : null}
        <AppTextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('Or type its name')} micColor={tabColor} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>What it needs</Text>
        <PopoverSelect options={kinds} selected={kind} onSelect={(value) => setKind(value as PrepKind)} tabColor={tabColor} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Hours ahead</Text>
        <AppTextInput style={[styles.input, styles.short]} value={hours} onChangeText={setHours} placeholder="12" keyboardType="numeric" />
      </View>
      <TouchableOpacity ref={addRef} style={styles.primary} onPress={() => void save()} accessibilityRole="button">
        <Text style={styles.primaryText}>Save the time</Text>
      </TouchableOpacity>
    </View>
  );
}

export function ReadyForTomorrowHomeCard({ tabColor }: { tabColor: string }) {
  const { view, now, failed, load, mark } = useReady();
  const open = useOpenRoute();
  const router = useRouter();
  if (!view) return failed ? <ReadProblem message={READ_FAILED} onTryAgain={() => void load()} /> : null;
  return (
    <View style={styles.card}>
      {view.tonight.map((line) => (
        <PrepRow key={line.key} line={line} now={now} tabColor={tabColor} onMark={() => void mark(line)} />
      ))}
      <Text style={styles.label}>Tomorrow</Text>
      {view.lines.length === 0 ? <Text style={styles.caption}>Nothing is recorded for tomorrow.</Text> : null}
      {view.lines.map((line) => (
        <TimedRow key={line.id} kind={line.kind} title={t(line.title)} at={line.at} notes={[]} onPress={() => open(line.route)} />
      ))}
      <TouchableOpacity
        style={styles.secondary}
        onPress={() => router.push({ pathname: '/schedule', params: { openScheduleLens: 'readyForTomorrow' } })}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryText}>Open Ready for Tomorrow</Text>
      </TouchableOpacity>
    </View>
  );
}

const plain = { textShadowColor: 'transparent', textShadowRadius: 0 } as const;

const styles = StyleSheet.create({
  column: { gap: HOME_BAND_GAP },
  body: { gap: 8 },
  card: { gap: 8, paddingHorizontal: HOME_BAND_CONTENT_PADDING, paddingVertical: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    borderLeftWidth: 3,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  rowText: { flex: 1, gap: 2 },
  title: { ...typography.body, color: colors.textPrimary, ...plain },
  doneTitle: { color: colors.textMuted },
  caption: { ...typography.caption, color: colors.textMuted, ...plain },
  label: { ...typography.label, color: colors.textPrimary, ...plain },
  field: { gap: 6, alignItems: 'flex-start' },
  input: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.textPrimary,
    ...plain,
  },
  short: { alignSelf: 'flex-start', width: 100 },
  primary: { ...BUTTON_PRIMARY },
  primaryText: { ...BUTTON_PRIMARY_TEXT },
  secondary: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  secondaryText: { ...BUTTON_SECONDARY_TEXT },
});
