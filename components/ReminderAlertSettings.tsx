import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, Vibration, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { setAlertChoice, useAlertChoices } from '../lib/alertChoices';
import { ALERT_TONES, DEFAULT_ALERT, toneFor, VIBRATION_CHOICES, vibrationFor } from '../lib/alertTones';
import { isDesktopApp } from '../lib/desktop/bridge';
import { groupReminderKinds } from '../lib/reminderKindGroups';
import { rescheduleAllReminders } from '../lib/reminderNotifications';
import { ALL_REMINDER_KIND_KEYS, REMINDER_KIND_LABELS, type ReminderKindKey } from '../lib/reminderPreferences';
import { PopoverSelect } from './PopoverSelect';

// Profile > Your Health > Reminder Sounds & Vibration (1.0.68.4). Direct
// request, 2026-10-12: "Are we able to assign a sound to each type of
// reminder ... They need to be sounds that are attention getting, not songs
// or the same sounds for use as ringers," then "Please include vibration
// versions for the phone, too." The tones are made by
// scripts/make_alert_tones.js and travel inside the app; the choice is kept
// on this phone (lib/alertChoices.ts) and reaches Android as a channel per
// kind (ensureKindChannels in lib/reminderNotifications.ts).

// Static requires so the bundler carries each tone for the preview.
const TONE_ASSETS: Record<string, number> = {
  bell: require('../assets/sounds/ls_bell.wav'),
  chime: require('../assets/sounds/ls_chime.wav'),
  falling: require('../assets/sounds/ls_falling.wav'),
  glass: require('../assets/sounds/ls_glass.wav'),
  knock: require('../assets/sounds/ls_knock.wav'),
  marimba: require('../assets/sounds/ls_marimba.wav'),
  ping: require('../assets/sounds/ls_ping.wav'),
  pulse: require('../assets/sounds/ls_pulse.wav'),
  rising: require('../assets/sounds/ls_rising.wav'),
  sonar: require('../assets/sounds/ls_sonar.wav'),
  sweep: require('../assets/sounds/ls_sweep.wav'),
  triple_beep: require('../assets/sounds/ls_triple_beep.wav'),
  two_down: require('../assets/sounds/ls_two_down.wav'),
  two_up: require('../assets/sounds/ls_two_up.wav'),
  urgent: require('../assets/sounds/ls_urgent.wav'),
  warble: require('../assets/sounds/ls_warble.wav'),
};

const SOUND_OPTIONS = ALERT_TONES.map((tone) => ({ label: tone.label, value: tone.key }));
const VIBRATION_OPTIONS = VIBRATION_CHOICES.map((choice) => ({ label: choice.label, value: choice.key }));
const GROUPS = groupReminderKinds(ALL_REMINDER_KIND_KEYS, REMINDER_KIND_LABELS);

export function ReminderAlertSettings() {
  const choices = useAlertChoices();
  const player = useRef<AudioPlayer | null>(null);
  const reschedule = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      player.current?.remove();
      if (reschedule.current) clearTimeout(reschedule.current);
    },
    [],
  );

  if (isDesktopApp()) return null;

  const preview = (soundKey: string) => {
    player.current?.remove();
    player.current = null;
    const asset = TONE_ASSETS[soundKey];
    if (!asset) return;
    try {
      player.current = createAudioPlayer(asset);
      player.current.play();
    } catch {
      // A preview that cannot play leaves the choice as made.
    }
  };

  // Reminders already queued keep the channel they were queued on, so they
  // are queued again once the person stops changing things.
  const requeue = () => {
    if (reschedule.current) clearTimeout(reschedule.current);
    reschedule.current = setTimeout(() => void rescheduleAllReminders(), 1500);
  };

  const change = (kind: ReminderKindKey, part: 'sound' | 'vibration', value: string) => {
    const before = choices[kind] ?? DEFAULT_ALERT;
    setAlertChoice(kind, { ...before, [part]: value });
    if (part === 'sound') preview(value);
    else {
      const pattern = vibrationFor(value).pattern;
      try {
        if (pattern.length > 0) Vibration.vibrate(pattern);
      } catch {
        // A phone that will not buzz on request still keeps the choice.
      }
    }
    requeue();
  };

  return (
    <View>
      <Text style={styles.text}>
        A sound and a vibration for each kind of reminder, so you can tell a dose from a bill without looking. Picking one
        plays it. The sounds are short tones made for Lifestead, none of them a song or a ringtone.
      </Text>
      <Text style={styles.caption}>
        The phone&apos;s sounds and every vibration work now. The Lifestead tones play here now and on a reminder once
        the next full install of Lifestead is on this phone. Chosen here, kept on this phone only.
      </Text>
      {GROUPS.map((group) => (
        <View key={group.tab}>
          <Text style={styles.tabLabel}>{group.tab}</Text>
          {group.lenses.map((lens) =>
            lens.keys.map((kind) => {
              const choice = choices[kind] ?? DEFAULT_ALERT;
              return (
                <View key={kind} style={styles.row}>
                  <Text style={styles.kindLabel}>
                    {REMINDER_KIND_LABELS[kind]}
                    <Text style={styles.lens}>{`  ${lens.lens}`}</Text>
                  </Text>
                  <View style={styles.pickers}>
                    <View style={styles.picker}>
                      <PopoverSelect
                        options={SOUND_OPTIONS}
                        selected={toneFor(choice.sound).key}
                        minWidth={110}
                        tabColor={colors.menuIconMuted}
                        groundSurface
                        onSelect={(value) => change(kind, 'sound', value)}
                      />
                    </View>
                    <View style={styles.picker}>
                      <PopoverSelect
                        options={VIBRATION_OPTIONS}
                        selected={vibrationFor(choice.vibration).key}
                        minWidth={110}
                        tabColor={colors.menuIconMuted}
                        groundSurface
                        onSelect={(value) => change(kind, 'vibration', value)}
                      />
                    </View>
                  </View>
                </View>
              );
            }),
          )}
        </View>
      ))}
      <Text style={styles.caption}>
        On iPhone a reminder plays its sound, and the vibration is the one the phone always uses.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: { ...typography.body, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textMuted, marginTop: 10, ...textShadow },
  tabLabel: { ...typography.label, color: colors.textPrimary, marginTop: 16, ...textShadow },
  row: { marginTop: 10 },
  kindLabel: { ...typography.body, color: colors.textPrimary, marginBottom: 6, ...textShadow },
  lens: { ...typography.caption, color: colors.textMuted },
  pickers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  picker: { flexGrow: 1, flexBasis: 140 },
});
