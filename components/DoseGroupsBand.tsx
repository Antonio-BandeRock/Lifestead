// Taken together: dose groups on Life > My Meds (2026-11-20). Meds and
// supplements taken at the same time share one reminder, and the reminder
// opens app/dose-group.tsx with the whole list.
//
// The app offers a group where two or more meds already share a time, and
// makes nothing until the person says yes. "No thanks" is remembered for that
// time, so the same offer is not put again. The rules live in
// lib/doseGroups.ts and the reading and writing in lib/doseGroupsDb.ts.
//
// Changing a group's time moves every member's planned doses from today on,
// prescriptions included, because the person chose it here themselves. The
// confirm says which meds move and, when a prescription is among them, that
// its time is worth checking with a pharmacist or prescriber first.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import {
  BUTTON_PRIMARY_COMPACT,
  BUTTON_PRIMARY_TEXT,
  BUTTON_SECONDARY_COMPACT,
  BUTTON_SECONDARY_TEXT,
} from '../constants/buttons';
import { textShadow, typography } from '../constants/typography';
import type { useBandFolds } from '../hooks/useBandFolds';
import { groupingOffers, memberTreatmentIds, suggestedGroupName, type DoseGroup, type DoseGroupMember } from '../lib/doseGroups';
import {
  addDoseGroupMember,
  createDoseGroup,
  declineGroupingOffer,
  listDeclinedGroupingTimes,
  listDoseGroupMembers,
  listDoseGroups,
  listUpcomingDoseTimes,
  removeDoseGroupMember,
  renameDoseGroup,
  retimeDoseGroup,
  retireDoseGroup,
} from '../lib/doseGroupsDb';
import { t } from '../lib/i18n';
import { explainNotYet } from '../lib/notYet';
import { syncReminderNotifications } from '../lib/reminderNotifications';
import { formatTime12 } from '../lib/timeOfDay';
import { AppTextInput } from './AppTextInput';
import { useConfirmSheet } from './ConfirmSheet';
import { HOME_BAND_GAP } from './HomeSectionBand';
import { PopoverSelect } from './PopoverSelect';
import { TabBand } from './TabBand';
import { useWalkMark } from './WalkMark';

type Folds = ReturnType<typeof useBandFolds>;
type DoseTime = { treatmentId: string; treatmentName: string; treatmentType: string; time: string };

// Every quarter hour from 5 a.m. to 11:45 p.m., for a group's new time.
const TIME_OPTIONS = (() => {
  const options: { label: string; value: string }[] = [];
  for (let minutes = 5 * 60; minutes < 24 * 60; minutes += 15) {
    const value = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    options.push({ label: formatTime12(value), value });
  }
  return options;
})();

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DoseGroupsBand({ folds, tabColor, reloadKey }: { folds: Folds; tabColor: string; reloadKey?: number }) {
  const router = useRouter();
  const walkMark = useWalkMark();
  const styles = useMemo(() => makeStyles(tabColor), [tabColor]);
  const [confirmSheet, confirmSheetElement] = useConfirmSheet();
  const [groups, setGroups] = useState<DoseGroup[]>([]);
  const [members, setMembers] = useState<DoseGroupMember[]>([]);
  const [doseTimes, setDoseTimes] = useState<DoseTime[]>([]);
  const [declined, setDeclined] = useState<string[]>([]);
  const [offerNames, setOfferNames] = useState<Record<string, string>>({});
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [g, m, d, no] = await Promise.all([listDoseGroups(), listDoseGroupMembers(), listUpcomingDoseTimes(), listDeclinedGroupingTimes()]);
    setGroups(g);
    setMembers(m);
    setDoseTimes(d);
    setDeclined(no);
  }, []);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const nameOf = useMemo(() => new Map(doseTimes.map((dose) => [dose.treatmentId, dose.treatmentName])), [doseTimes]);
  const typeOf = useMemo(() => new Map(doseTimes.map((dose) => [dose.treatmentId, dose.treatmentType])), [doseTimes]);
  const offers = useMemo(() => groupingOffers(doseTimes, groups, members, declined), [doseTimes, groups, members, declined]);

  async function run(work: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await work();
      await syncReminderNotifications();
      await load();
    } finally {
      setBusy(false);
    }
  }

  // Nothing to say until a med has two or more doses to share a time with.
  if (groups.length === 0 && offers.length === 0) return null;

  return (
    <TabBand folds={folds} color={tabColor} id="life:myMeds:taken-together" title="Taken together" icon="albums-outline" count={groups.length}>
      {confirmSheetElement}
      <View ref={walkMark.ref('myMeds.takenTogether')} style={[styles.box, walkMark('myMeds.takenTogether')]}>
        <Text style={styles.caption}>
          Meds and supplements taken at the same time can share one reminder. Its notification names the group and how many are due, and opens the whole list with how much of each and what to take them with.
        </Text>
      </View>

      {offers.map((offer) => {
        const name = offerNames[offer.time] ?? suggestedGroupName(offer.time);
        return (
          <View key={`offer-${offer.time}`} style={styles.box}>
            <Text style={styles.title}>{t('{count} at {time}', { count: offer.treatmentIds.length, time: formatTime12(offer.time) })}</Text>
            <Text style={styles.caption}>{offer.names.join(', ')}</Text>
            <Text style={styles.caption}>Make them one group with one reminder? Nothing changes until you say yes.</Text>
            <AppTextInput
              style={styles.input}
              value={name}
              onChangeText={(text: string) => setOfferNames((current) => ({ ...current, [offer.time]: text }))}
              accessibilityLabel="Group name"
            />
            <View style={styles.row}>
              <TouchableOpacity
                style={BUTTON_PRIMARY_COMPACT}
                disabled={busy}
                onPress={() => {
                  if (!name.trim()) {
                    explainNotYet('Give the group a name first.');
                    return;
                  }
                  void run(() => createDoseGroup(name, offer.time, offer.treatmentIds));
                }}
              >
                <Text style={BUTTON_PRIMARY_TEXT}>Make the group</Text>
              </TouchableOpacity>
              <TouchableOpacity style={BUTTON_SECONDARY_COMPACT} disabled={busy} onPress={() => void run(() => declineGroupingOffer(offer.time))}>
                <Text style={BUTTON_SECONDARY_TEXT}>No thanks</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {groups.map((group) => {
        const ids = memberTreatmentIds(group.id, members);
        const inAnyGroup = new Set(
          members.filter((member) => groups.some((g) => g.id === member.groupId && g.timeOfDay === group.timeOfDay)).map((member) => member.treatmentId),
        );
        const addable = doseTimes
          .filter((dose) => dose.time === group.timeOfDay && !inAnyGroup.has(dose.treatmentId))
          .map((dose) => ({ label: dose.treatmentName, value: dose.treatmentId }));
        const isRenaming = renaming?.id === group.id;
        return (
          <View key={group.id} style={styles.box}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/dose-group', params: { id: group.id, on: todayLocal() } })}
              accessibilityRole="button"
              accessibilityLabel={t('Open {name}', { name: group.name })}
            >
              <Text style={styles.title}>{`${group.name}, ${formatTime12(group.timeOfDay)}`}</Text>
              <Text style={styles.caption}>{t('{count} items. Tap to see the full list.', { count: ids.length })}</Text>
            </TouchableOpacity>

            {ids.map((id) => (
              <View key={id} style={styles.memberRow}>
                <Text style={styles.member}>{nameOf.get(id) ?? t('A med no longer active')}</Text>
                <TouchableOpacity
                  disabled={busy}
                  onPress={() => void run(() => removeDoseGroupMember(group.id, id))}
                  accessibilityRole="button"
                  accessibilityLabel={t('Take {name} out of {group}', { name: nameOf.get(id) ?? '', group: group.name })}
                >
                  <Text style={styles.action}>Take out</Text>
                </TouchableOpacity>
              </View>
            ))}

            {isRenaming ? (
              <View style={styles.row}>
                <AppTextInput
                  style={[styles.input, styles.grow]}
                  value={renaming.name}
                  onChangeText={(text: string) => setRenaming({ id: group.id, name: text })}
                  accessibilityLabel="New group name"
                />
                <TouchableOpacity
                  style={BUTTON_PRIMARY_COMPACT}
                  disabled={busy}
                  onPress={() => {
                    if (!renaming.name.trim()) {
                      explainNotYet('Type the new name first.');
                      return;
                    }
                    void run(async () => {
                      await renameDoseGroup(group.id, renaming.name);
                      setRenaming(null);
                    });
                  }}
                >
                  <Text style={BUTTON_PRIMARY_TEXT}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.row}>
              {addable.length > 0 ? (
                <PopoverSelect
                  options={addable}
                  selected={null}
                  placeholder="Add a med at this time"
                  tabColor={tabColor}
                  onSelect={(value) => void run(() => addDoseGroupMember(group.id, value))}
                />
              ) : null}
              <PopoverSelect
                options={TIME_OPTIONS}
                selected={group.timeOfDay}
                placeholder="Change the time"
                tabColor={tabColor}
                searchable
                onSelect={async (value) => {
                  if (value === group.timeOfDay) return;
                  const names = ids.map((id) => nameOf.get(id)).filter(Boolean).join(', ');
                  const hasPrescription = ids.some((id) => typeOf.get(id) === 'prescription');
                  const ok = await confirmSheet({
                    title: t('Move {name} to {time}?', { name: group.name, time: formatTime12(value) }),
                    message: [
                      t('Every planned dose of {names} at {from} moves to {to}, from today on. Doses already marked stay where they were.', {
                        names,
                        from: formatTime12(group.timeOfDay),
                        to: formatTime12(value),
                      }),
                      hasPrescription ? t('A prescription is in this group. When it is taken is worth checking with your pharmacist or prescriber first.') : '',
                    ]
                      .filter(Boolean)
                      .join('\n\n'),
                    confirmLabel: 'Move them',
                  });
                  if (ok) void run(() => retimeDoseGroup(group.id, value));
                }}
              />
            </View>

            <View style={styles.row}>
              {!isRenaming ? (
                <TouchableOpacity onPress={() => setRenaming({ id: group.id, name: group.name })} accessibilityRole="button">
                  <Text style={styles.action}>Rename</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                disabled={busy}
                accessibilityRole="button"
                onPress={async () => {
                  const ok = await confirmSheet({
                    title: t('Retire {name}?', { name: group.name }),
                    message: t('Each med in it keeps its doses and times, and gets a separate reminder again.'),
                    confirmLabel: 'Retire it',
                  });
                  if (ok) void run(() => retireDoseGroup(group.id));
                }}
              >
                <Text style={styles.actionRemove}>Retire the group</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </TabBand>
  );
}

function makeStyles(tabColor: string) {
  return StyleSheet.create({
    box: {
      gap: 8,
      padding: 12,
      borderRadius: 10,
      backgroundColor: colors.surface,
      marginBottom: HOME_BAND_GAP,
    },
    title: { ...typography.bodyEmphasis, color: tabColor, fontWeight: '400', ...textShadow },
    caption: { ...typography.caption, color: colors.textSecondary, lineHeight: 18, ...textShadow },
    member: { ...typography.body, color: colors.textPrimary, flex: 1, ...textShadow },
    memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, borderTopWidth: 1, borderTopColor: colors.border },
    action: { ...typography.captionEmphasis, color: tabColor, ...textShadow },
    actionRemove: { ...typography.captionEmphasis, color: colors.danger, ...textShadow },
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
    grow: { flexGrow: 1 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surfaceMuted,
      ...typography.body,
      color: tabColor,
    },
  });
}
