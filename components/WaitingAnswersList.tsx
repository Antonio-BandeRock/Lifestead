// The answerable list of reminders still showing (1.0.60.3), drawn the same
// way on Home's Waiting for an Answer card and on the full screen
// (app/waiting-answers.tsx). Each group carries the buttons its
// notifications carry, and a switch for each kind of reminder in it, so one
// that is not wanted can be turned off from the place it was noticed. Direct
// request, 2026-10-03: "In this group there should be a way to easily turn
// on or off any of these notifications as well as others." The others are
// one tap away in Profile > Reminders, laid out by tab and lens.
//
// A press here is the same press as on the notification: the same record is
// written, the notification leaves the phone, and so does every other copy
// of it. No button asks for typing (1.0.67.1), so the list and the lock
// screen answer the same way. Tapping a reminder's words opens the place it
// lives.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { useReminderPreferences } from '../hooks/useReminderPreferences';
import { useWalkMark } from './WalkMark';
import { reminderActionTitle, type ReminderActionId } from '../lib/reminderActions';
import { kindsShowing } from '../lib/reminderKindGroups';
import { answerFromList, openWaitingReminder, syncReminderNotifications } from '../lib/reminderNotifications';
import {
  REMINDER_KIND_LABELS,
  isReminderKindEnabled,
  setReminderKindEnabled,
  type ReminderKindKey,
} from '../lib/reminderPreferences';
import { SNOOZE_MINUTES } from '../lib/quietHours';
import { waitingFor, type WaitingGroup, type WaitingItem } from '../lib/waitingAnswers';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP } from './HomeSectionBand';
import { useTabBandStyles } from './TabBand';
import { PILL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';

type Props = {
  groups: WaitingGroup[];
  now: number;
  reload: () => Promise<void>;
  tabColor: string;
  // On Home the list sits inside one band, so each group is a plain column
  // there; on the full screen each group is a band of its own.
  nested?: boolean;
};

export function WaitingAnswersList({ groups, now, reload, tabColor, nested = false }: Props) {
  const router = useRouter();
  const walkMark = useWalkMark();
  const prefs = useReminderPreferences();
  const band = useTabBandStyles(tabColor);
  // Reminders being answered right now, so a second tap does nothing.
  const [busy, setBusy] = useState<Set<string>>(new Set());

  async function answer(item: WaitingItem, action: ReminderActionId) {
    if (busy.has(item.identifier)) return;
    setBusy((current) => new Set(current).add(item.identifier));
    try {
      await answerFromList(item.copies, action, null);
    } catch (error) {
      console.error('[waiting-answers] the answer could not be saved', error);
    } finally {
      setBusy((current) => {
        const next = new Set(current);
        next.delete(item.identifier);
        return next;
      });
      // A sleep answer brings the energy question, and a flare answer the
      // next flare question, which show up here too.
      await reload();
    }
  }

  async function open(item: WaitingItem) {
    const target = await openWaitingReminder(item.identifier);
    if (target) router.push(target);
    else void reload();
  }

  async function toggleKind(key: ReminderKindKey) {
    try {
      await setReminderKindEnabled(key, !isReminderKindEnabled(prefs, key));
      await syncReminderNotifications();
    } catch (error) {
      console.error('[waiting-answers] the reminder switch could not be saved', error);
    }
  }

  return (
    <View style={styles.column}>
      {groups.map((group, groupIndex) => {
        const kinds = kindsShowing(
          group.items.map((item) => item.kind),
          REMINDER_KIND_LABELS,
        );
        return (
          <View key={group.key} style={nested ? styles.column : [band.box, styles.column]}>
            <Text style={styles.groupTitle}>
              {group.label} ({group.items.length})
            </Text>
            {group.items.map((item, itemIndex) => {
              const isBusy = busy.has(item.identifier);
              const first = groupIndex === 0 && itemIndex === 0;
              return (
                <View key={item.identifier} style={[band.row, styles.item, isBusy ? styles.itemBusy : null]}>
                  <TouchableOpacity
                    ref={first ? walkMark.ref('home.waitingOpen') : undefined}
                    onPress={() => void open(item)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                  >
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.body ? <Text style={styles.itemBody}>{item.body}</Text> : null}
                    <Text style={styles.itemWhen}>{waitingFor(item.shownAt, now)}</Text>
                  </TouchableOpacity>
                  <View ref={first ? walkMark.ref('home.waitingAnswer') : undefined} collapsable={false} style={styles.buttons}>
                    {item.actions.map((action) => {
                      const quiet = action === 'snooze' || action === 'flareNo' || action === 'flareTagOther';
                      return (
                        <TouchableOpacity
                          key={action}
                          style={[styles.button, quiet ? [styles.buttonQuiet, { borderColor: tabColor }] : styles.buttonFilled]}
                          onPress={() => void answer(item, action)}
                          disabled={isBusy}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                        >
                          <Text style={quiet ? styles.buttonQuietText : styles.buttonFilledText}>
                            {item.actionTitles?.[action] ?? reminderActionTitle(action, SNOOZE_MINUTES)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
            {kinds.length > 0 ? (
              <View ref={groupIndex === 0 ? walkMark.ref('home.waitingKinds') : undefined} collapsable={false} style={[band.row, styles.switches]}>
                <Text style={styles.switchCaption}>
                  Tap to stop or start this kind of reminder.
                </Text>
                <View style={styles.buttons}>
                  {kinds.map((key) => {
                    const on = isReminderKindEnabled(prefs, key);
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[styles.pill, on && styles.pillActive]}
                        onPress={() => void toggleKind(key)}
                        activeOpacity={0.8}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: on }}
                      >
                        <Text style={on ? styles.pillTextOn : styles.pillText}>
                          {REMINDER_KIND_LABELS[key]}: {on ? 'On' : 'Off'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
      <TouchableOpacity
        ref={walkMark.ref('home.waitingChoose')}
        style={[styles.choose, { borderColor: tabColor }, nested ? null : styles.chooseBetweenBands]}
        onPress={() => router.push({ pathname: '/profile', params: { section: 'reminders' } })}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text style={styles.chooseText}>Choose Which Reminders Come</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: HOME_BAND_GAP },
  groupTitle: { ...typography.bodyEmphasis, color: colors.textPrimary, fontWeight: '400', ...textShadow },
  item: { gap: 10 },
  itemBusy: { opacity: 0.5 },
  itemTitle: { ...typography.bodyEmphasis, color: colors.textPrimary, fontWeight: '400', ...textShadow },
  itemBody: { ...typography.body, color: colors.textSecondary, marginTop: 2, ...textShadow },
  itemWhen: { ...typography.caption, color: colors.textMuted, marginTop: 4, ...textShadow },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The answer itself is filled, since it is the thing to tap; Snooze, No
  // and Something else are outlined.
  buttonFilled: { backgroundColor: colors.primary },
  buttonFilledText: { ...typography.body, color: colors.background },
  buttonQuiet: { borderWidth: 1, backgroundColor: colors.surface },
  buttonQuietText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  switches: { gap: 8 },
  switchCaption: { ...typography.caption, color: colors.textSecondary, lineHeight: 17, ...textShadow },
  pill: { ...PILL },
  pillText: { ...PILL_TEXT },
  pillTextOn: { ...PILL_ON_TEXT },
  choose: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  chooseBetweenBands: { marginHorizontal: HOME_BAND_CONTENT_PADDING },
  chooseText: { ...typography.bodyEmphasis, color: colors.textPrimary, fontWeight: '400', ...textShadow },
  pillActive: { ...PILL_ON },
});
