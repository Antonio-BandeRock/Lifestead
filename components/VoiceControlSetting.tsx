import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { readLockStateSync } from '../lib/appLockDevice';
import { isDesktopApp } from '../lib/desktop/bridge';
import { explainNotYet } from '../lib/notYet';
import LockedCapture from '../modules/locked-capture';

// Profile > Device & Account > Voice Control (2026-10-11). Direct request:
// "Why is it located under app lock? ... Let's keep it in Device & Account
// listed on its own as Voice Control, and explain about it there." It sat
// in App Lock since 1.0.62.1 because the shade buttons began as lock-screen
// capture; nothing here needs App Lock to work.
//
// One switch posts all three shade buttons (Voice Note, Photo and Voice
// Control, ShadeButtons.kt in modules/locked-capture), since the build on
// the phone has no way to post one without the others. The caption says
// so rather than leaving the other two to turn up unexplained.
export function VoiceControlSetting() {
  const [showing, setShowing] = useState(() => LockedCapture?.isShowingShadeButtons() ?? false);
  if (isDesktopApp()) return null;
  const lockOn = readLockStateSync()?.phase === 'on';
  return (
    <View>
      <Text style={styles.text}>
        Voice Control works Lifestead in plain words. Say a tab or lens to open it, the words on a button to press it,
        or the name of a box to fill it in, and it acts on the screen you were on. Pull down the notification shade and press Voice Control. The phone
        asks for its unlock first{lockOn ? ', then your Lifestead code,' : ','} and then it listens.
      </Text>
      <Text style={styles.subLabel}>Voice Control in the notification shade</Text>
      <View style={styles.pillRow}>
        {[true, false].map((on) => (
          <TouchableOpacity
            key={String(on)}
            style={[styles.pill, showing === on ? styles.pillActive : null]}
            activeOpacity={0.85}
            onPress={() => {
              if (!LockedCapture) {
                explainNotYet('This needs the next full install of Lifestead on this phone.');
                return;
              }
              if (on === showing) return;
              if (on) {
                if (!LockedCapture.showShadeButtons()) {
                  explainNotYet('Notifications are turned off for Lifestead, so the button has nowhere to show. They can be turned on in the phone settings, under Apps.');
                  return;
                }
              } else LockedCapture.hideShadeButtons();
              setShowing(LockedCapture.isShowingShadeButtons());
            }}
          >
            <Text style={[styles.pillText, showing === on ? styles.pillTextActive : null]}>{on ? 'Shown' : 'Hidden'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.caption}>
        {`This switch also puts Voice Note and Photo in the shade, and hides them with it. Voice Note starts listening and Photo opens the camera, both into Capture. ${
          lockOn
            ? 'With App Lock on they work over the lock screen with no code, and what you keep is sealed until Lifestead is next unlocked.'
            : 'With App Lock set up they work over the lock screen with no code; without it the phone asks to be unlocked first.'
        } All three can also be added as quick settings tiles, by editing the phone's quick settings.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: { ...typography.body, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textMuted, marginTop: 6, ...textShadow },
  subLabel: { ...typography.label, color: colors.textPrimary, marginTop: 14, marginBottom: 6, ...textShadow },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { ...typography.body, color: colors.textSecondary, ...textShadow },
  pillTextActive: { color: colors.textOnPrimary, textShadowColor: 'transparent', textShadowRadius: 0 },
});
