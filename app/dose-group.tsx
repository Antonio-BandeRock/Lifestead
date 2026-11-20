// One dose group, full screen: what the reminder stood for (Tony,
// 2026-11-20: "The reminder, when tapped, should go to a full screen list of
// exactly what they take, and how much of it, along with any additional
// information about taking things with food or water or whatever
// interactions that science knows of with something taken at the same time.
// It could also provide a suggestion here to move something to another time
// and suggest that time based on data of rules between elements and food and
// meds").
//
// What is on it, top to bottom:
//   1. The group's name and time, and Took them all.
//   2. Each med or supplement: how much, whether it is taken yet, what the
//      nutrient timing table says about food, water or fat, and what the
//      meals on today's plan near it mean for it (lib/doseMealTiming.ts).
//   3. What the interaction rules say about two things in the group taken at
//      the same time, with the rule's citation. A supplement or OTC item gets
//      a time to move to and one tap that moves it (lib/doseGroups.ts). A
//      prescription never does: the screen gives the reason and says to
//      check with a pharmacist or prescriber.
//
// Nothing here tells anybody to stop, start or skip a dose. A move only ever
// changes the time a planned dose is taken at, from today on.
//
// The vault: medications are a listed category, so the screen hides the
// list itself while the vault is closed, the way My Meds does.
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import {
  BUTTON_PRIMARY,
  BUTTON_PRIMARY_TEXT,
  BUTTON_SECONDARY_COMPACT,
  BUTTON_SECONDARY_TEXT,
} from '../constants/buttons';
import { useFloatingButtonScrollPadding } from '../constants/floatingButton';
import { textShadow, typography } from '../constants/typography';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandStyle } from '../components/HomeSectionBand';
import { WalkScrollView } from '../components/WalkScrollView';
import { getDayMealAndDoseTimeline, setScheduleItemStatus } from '../lib/db';
import {
  doseToMove,
  memberTreatmentIds,
  pairNotes,
  suggestMove,
  type DoseGroup,
  type DosePairNote,
  type MoveSuggestion,
} from '../lib/doseGroups';
import { getDoseGroup, listDoseGroupMembers, listDoseGroups, moveDoseToTime } from '../lib/doseGroupsDb';
import {
  doseFoodNotes,
  doseGuidance,
  type DoseFoodNote,
  type DoseGuidanceLine,
  type TimelineDose,
} from '../lib/doseMealTiming';
import { t } from '../lib/i18n';
import { explainNotYet } from '../lib/notYet';
import { syncReminderNotifications } from '../lib/reminderNotifications';
import { formatTime12 } from '../lib/timeOfDay';
import { useListedClosed } from '../lib/vaultSession';

const ACCENT = colors.tabSchedules;

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Item = {
  dose: TimelineDose;
  guidance: DoseGuidanceLine[];
  foodNotes: DoseFoodNote[];
};

type PairView = {
  note: DosePairNote;
  /** The dose a move would be for, when one of the two can be moved. */
  moveFor: TimelineDose | null;
  suggestion: MoveSuggestion | null;
};

type Loaded = {
  group: DoseGroup | null;
  items: Item[];
  pairs: PairView[];
};

export default function DoseGroupScreen() {
  const params = useLocalSearchParams<{ id?: string; on?: string }>();
  const groupId = typeof params.id === 'string' ? params.id : '';
  const day = typeof params.on === 'string' && /^\d{4}-\d\d-\d\d$/.test(params.on) ? params.on : todayLocal();
  const scrollPadding = useFloatingButtonScrollPadding();
  const vaultClosed = useListedClosed(['medications']);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [moved, setMoved] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [group, groups, members, data] = await Promise.all([
      getDoseGroup(groupId),
      listDoseGroups(),
      listDoseGroupMembers(),
      getDayMealAndDoseTimeline(day),
    ]);
    if (!group) return { group: null, items: [], pairs: [] };
    const memberIds = new Set(memberTreatmentIds(group.id, members));
    const inGroup = data.doses.filter((dose) => memberIds.has(dose.treatmentId) && dose.time === group.timeOfDay);
    const items: Item[] = inGroup.map((dose) => ({
      dose,
      guidance: doseGuidance(dose, data.timings, data.nutrientNames),
      foodNotes: doseFoodNotes(dose, data.meals, data.rules, data.nutrientNames),
    }));
    const live = inGroup.filter((dose) => dose.status !== 'skipped');
    const pairs: PairView[] = pairNotes(live, data.rules).map((note) => {
      const a = live.find((dose) => dose.id === note.aId);
      const b = live.find((dose) => dose.id === note.bId);
      const moveFor = note.kind === 'separate' && a && b ? doseToMove(a, b) : null;
      const suggestion = moveFor ? suggestMove(moveFor, note, data.doses, data.meals, data.rules, groups) : null;
      return { note, moveFor, suggestion };
    });
    return { group, items, pairs };
  }, [groupId, day]);

  const reload = useCallback(async () => {
    try {
      setLoaded(await load());
      setError(null);
    } catch (caught) {
      console.error('[DoseGroup] Failed to load', caught);
      setError('This list could not be loaded. Give it another try.');
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  async function markTaken(ids: string[]) {
    if (busy) return;
    if (ids.length === 0) {
      explainNotYet('Everything in this group is already marked for today.');
      return;
    }
    setBusy(true);
    try {
      for (const id of ids) await setScheduleItemStatus(id, 'logged');
      await syncReminderNotifications();
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function moveIt(view: PairView, group: DoseGroup) {
    if (busy || !view.suggestion) return;
    const suggestion = view.suggestion;
    setBusy(true);
    try {
      const count = await moveDoseToTime(suggestion.treatmentId, suggestion.from, suggestion.to, group.id, suggestion.joinsGroupId);
      await syncReminderNotifications();
      setMoved(
        count > 0
          ? t('{name} is at {time} from today on.', { name: suggestion.treatmentName, time: formatTime12(suggestion.to) })
          : t('{name} had no planned doses left at {time} to move.', { name: suggestion.treatmentName, time: formatTime12(suggestion.from) }),
      );
      await reload();
    } finally {
      setBusy(false);
    }
  }

  const group = loaded?.group ?? null;
  const title = group ? group.name : 'Dose group';
  const open = loaded?.items.filter((item) => item.dose.status === 'planned') ?? [];

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title }} />
      <WalkScrollView contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]}>
        {error ? (
          <View style={styles.card}>
            <Text style={styles.muted}>{error}</Text>
          </View>
        ) : null}

        {loaded == null && !error ? (
          <View style={styles.card}>
            <Text style={styles.muted}>Loading…</Text>
          </View>
        ) : null}

        {loaded != null && !group ? (
          <View style={styles.card}>
            <Text style={styles.muted}>This group is not there any more. Each of its meds has a separate reminder in Schedules, Meds.</Text>
          </View>
        ) : null}

        {group && vaultClosed ? (
          <View style={styles.card}>
            <Text style={styles.heading}>{group.name}</Text>
            <Text style={styles.muted}>Medications are in the vault. Open the vault to see what this group holds.</Text>
          </View>
        ) : null}

        {group && !vaultClosed && loaded ? (
          <>
            <View style={styles.card}>
              <Text style={styles.heading}>{group.name}</Text>
              <Text style={styles.caption}>
                {t('{time}, {count} items.', { time: formatTime12(group.timeOfDay), count: loaded.items.length })}
                {group.retiredAt ? ` ${t('This group was retired, so each of its meds has a reminder again.')}` : ''}
              </Text>
              {loaded.items.length === 0 ? (
                <Text style={styles.muted}>Nothing in this group is planned at this time today.</Text>
              ) : (
                <TouchableOpacity
                  style={[BUTTON_PRIMARY, styles.allButton, open.length === 0 && styles.dimmed]}
                  onPress={() => void markTaken(open.map((item) => item.dose.id))}
                  disabled={busy}
                  accessibilityRole="button"
                >
                  <Text style={BUTTON_PRIMARY_TEXT}>Took them all</Text>
                </TouchableOpacity>
              )}
              {moved ? <Text style={styles.caption}>{moved}</Text> : null}
            </View>

            {loaded.items.map((item) => (
              <View key={item.dose.id} style={styles.card}>
                <View style={styles.itemTop}>
                  <View style={styles.itemMain}>
                    <Text style={styles.itemName}>{item.dose.treatmentName}</Text>
                    <Text style={styles.caption}>
                      {[item.dose.doseLabel, kindWord(item.dose.treatmentType)].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                  {item.dose.status === 'planned' ? (
                    <TouchableOpacity
                      style={BUTTON_SECONDARY_COMPACT}
                      onPress={() => void markTaken([item.dose.id])}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={t('Mark {name} taken', { name: item.dose.treatmentName })}
                    >
                      <Text style={BUTTON_SECONDARY_TEXT}>Taken</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.statusWord}>{statusWord(item.dose.status)}</Text>
                  )}
                </View>
                {item.guidance.map((line) => (
                  <View key={line.nutrientName} style={styles.noteBlock}>
                    <Text style={styles.noteHead}>{t('{nutrient}: best taken {when}', { nutrient: line.nutrientName, when: line.bestTaken })}</Text>
                    {line.citation ? <Text style={styles.citation}>{line.citation}</Text> : null}
                  </View>
                ))}
                {item.foodNotes.map((note, index) => (
                  <View key={`${note.kind}-${index}`} style={styles.noteBlock}>
                    <Text style={[styles.noteHead, note.kind === 'clash' && styles.clash]}>{note.headline}</Text>
                    <Text style={styles.caption}>{note.detail}</Text>
                    {note.citation ? <Text style={styles.citation}>{note.citation}</Text> : null}
                  </View>
                ))}
                {item.guidance.length === 0 && item.foodNotes.length === 0 ? (
                  <Text style={styles.muted}>Nothing in the timing table or today&apos;s meals bears on this one.</Text>
                ) : null}
              </View>
            ))}

            {loaded.pairs.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.heading}>Taken at the same time</Text>
                {loaded.pairs.map((view) => (
                  <View key={`${view.note.ruleId}-${view.note.aId}-${view.note.bId}`} style={styles.pairBlock}>
                    <Text style={[styles.noteHead, view.note.severity === 'major' && styles.clash]}>
                      {`${view.note.aName} and ${view.note.bName}`}
                    </Text>
                    <Text style={styles.caption}>{view.note.guidance}</Text>
                    {view.note.mechanism ? <Text style={styles.caption}>{view.note.mechanism}</Text> : null}
                    <Text style={styles.citation}>{view.note.citation}</Text>
                    {renderMove(view, group)}
                  </View>
                ))}
              </View>
            ) : loaded.items.length > 1 ? (
              <View style={styles.card}>
                <Text style={styles.muted}>No interaction rule in the app names two things in this group together.</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </WalkScrollView>
    </View>
  );

  function renderMove(view: PairView, current: DoseGroup) {
    if (view.note.kind === 'together') {
      return <Text style={styles.caption}>This one is about taking both at all, which a different time does not change. Worth raising with your pharmacist or prescriber.</Text>;
    }
    if (!view.moveFor) {
      return (
        <Text style={styles.caption}>
          {t('Both are prescriptions, so when each is taken is for you and your pharmacist or prescriber to settle. The rule asks for {hours} hours between them.', {
            hours: view.note.hours ?? 0,
          })}
        </Text>
      );
    }
    if (!view.suggestion) {
      return (
        <Text style={styles.caption}>
          {t('No time between 6 a.m. and 10 p.m. keeps {name} clear of everything else today. Your pharmacist can help find one.', { name: view.moveFor.treatmentName })}
        </Text>
      );
    }
    const suggestion = view.suggestion;
    return (
      <View style={styles.moveBlock}>
        <Text style={styles.caption}>{suggestion.why}</Text>
        <TouchableOpacity
          style={BUTTON_SECONDARY_COMPACT}
          onPress={() => void moveIt(view, current)}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={BUTTON_SECONDARY_TEXT}>
            {suggestion.joinsGroupName
              ? t('Move {name} to {group}', { name: suggestion.treatmentName, group: suggestion.joinsGroupName })
              : t('Move {name} to {time}', { name: suggestion.treatmentName, time: formatTime12(suggestion.to) })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}

function kindWord(type: string): string {
  if (type === 'prescription') return t('prescription');
  if (type === 'otc') return t('over the counter');
  if (type === 'supplement') return t('supplement');
  return '';
}

function statusWord(status: string): string {
  if (status === 'logged') return t('Taken');
  if (status === 'skipped') return t('Skipped');
  return status;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: HOME_BAND_GAP },
  card: {
    ...homeBandStyle,
    borderColor: ACCENT,
    padding: HOME_BAND_CONTENT_PADDING,
    gap: 8,
  },
  heading: { ...typography.sectionTitle, color: ACCENT, fontWeight: '400', ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, lineHeight: 18, ...textShadow },
  muted: { ...typography.caption, color: colors.textMuted, ...textShadow },
  citation: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', ...textShadow },
  allButton: { marginTop: 4 },
  dimmed: { opacity: 0.5 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemMain: { flex: 1, gap: 2 },
  itemName: { ...typography.bodyEmphasis, color: colors.textPrimary, fontWeight: '400', ...textShadow },
  statusWord: { ...typography.caption, color: ACCENT, ...textShadow },
  noteBlock: { gap: 2, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border },
  noteHead: { ...typography.body, color: colors.textPrimary, ...textShadow },
  clash: { color: colors.danger },
  pairBlock: { gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  moveBlock: { gap: 6, alignItems: 'flex-start' },
});
