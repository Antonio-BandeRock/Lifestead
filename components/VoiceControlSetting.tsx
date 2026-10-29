import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { readLockStateSync } from '../lib/appLockDevice';
import { isDesktopApp } from '../lib/desktop/bridge';
import { explainNotYet } from '../lib/notYet';
import { SHADE_BUTTON_KINDS, setShadeButtonHidden } from '../lib/shadeButtonChoice';
import LockedCapture, { type ShadeButtonKind } from '../modules/locked-capture';
import { PILL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';

// Profile > Device & Account > Notification Shade Buttons. Voice Control
// moved here out of App Lock on 2026-10-11 by direct request: "Why is it
// located under app lock? ... Let's keep it in Device & Account listed on
// its own as Voice Control, and explain about it there." On 2026-10-12:
// "Where are voice note and photo turned off? I don't see it anywhere. Maybe
// they should be with the on off of voice control and the section named
// something that is more appropriate for all three to be in?" So the card
// is named for where the three buttons live, and each has a switch.
//
// A build from before 2026-10-12 can only post all three together
// (ShadeButtons.kt in modules/locked-capture), so on one of those the card
// shows one switch and says so.
//
// On by default since 1.0.75.3 (lib/shadeButtonChoice.ts): Hidden here is
// the only thing that keeps a button out of the shade.

const NOTIFICATIONS_OFF =
  'Notifications are turned off for Lifestead, so the button has nowhere to show. They can be turned on in the phone settings, under Apps.';

function ShownHidden({ showing, onChange }: { showing: boolean; onChange: (on: boolean) => void }) {
  return (
    <View style={styles.pillRow}>
      {[true, false].map((on) => (
        <TouchableOpacity
          key={String(on)}
          style={[styles.pill, showing === on ? styles.pillActive : null]}
          activeOpacity={0.85}
          onPress={() => {
            if (on !== showing) onChange(on);
          }}
        >
          <Text style={[styles.pillText, showing === on ? styles.pillTextActive : null]}>{on ? 'Shown' : 'Hidden'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function VoiceControlSetting() {
  const separate = typeof LockedCapture?.showShadeButton === 'function';
  const read = (kind: ShadeButtonKind) =>
    separate ? (LockedCapture?.isShowingShadeButton?.(kind) ?? false) : (LockedCapture?.isShowingShadeButtons() ?? false);
  const [showing, setShowing] = useState(() => ({
    command: read('command'),
    voice: read('voice'),
    photo: read('photo'),
  }));
  if (isDesktopApp()) return null;
  const lockOn = readLockStateSync()?.phase === 'on';

  const change = (kind: ShadeButtonKind, on: boolean) => {
    if (!LockedCapture) {
      explainNotYet('This needs the next full install of Lifestead on this phone.');
      return;
    }
    if (separate) setShadeButtonHidden(kind, !on);
    else for (const each of SHADE_BUTTON_KINDS) setShadeButtonHidden(each, !on);
    if (separate) {
      if (on) {
        if (!LockedCapture.showShadeButton?.(kind)) {
          explainNotYet(NOTIFICATIONS_OFF);
          return;
        }
      } else LockedCapture.hideShadeButton?.(kind);
    } else if (on) {
      if (!LockedCapture.showShadeButtons()) {
        explainNotYet(NOTIFICATIONS_OFF);
        return;
      }
    } else LockedCapture.hideShadeButtons();
    setShowing({ command: read('command'), voice: read('voice'), photo: read('photo') });
  };

  const captureLine = lockOn
    ? 'With the phone locked it works over the lock screen: your Lifestead code, then it saves, sealed until Lifestead is next unlocked.'
    : 'With the phone locked it asks for the phone unlock first. With App Lock set up it works over the lock screen instead.';

  return (
    <View>
      <Text style={styles.text}>
        Three buttons Lifestead can keep in the notification shade, so they are one pull down away from anywhere on the
        phone. All three are there from the start, and each can be hidden on its own. One swiped away comes back the
        next time Lifestead opens; Hidden here keeps it away.
      </Text>

      <Text style={styles.subLabel}>Voice Control</Text>
      <Text style={styles.text}>
        Works Lifestead in plain words. Say a tab or lens to open it, the words on a button to press it, or the name of a
        box to fill it in. With the phone locked, it asks for the phone unlock first
        {lockOn ? ', then your Lifestead code,' : ','} and then it listens.
      </Text>
      {separate ? (
        <ShownHidden showing={showing.command} onChange={(on) => change('command', on)} />
      ) : null}

      <Text style={styles.subLabel}>Voice Note</Text>
      <Text style={styles.text}>Starts listening and saves what you say into Capture. {captureLine}</Text>
      {separate ? <ShownHidden showing={showing.voice} onChange={(on) => change('voice', on)} /> : null}

      <Text style={styles.subLabel}>Photo</Text>
      <Text style={styles.text}>Opens the camera and saves the photo into Capture. {captureLine}</Text>
      {separate ? <ShownHidden showing={showing.photo} onChange={(on) => change('photo', on)} /> : null}

      {separate ? null : (
        <>
          <Text style={styles.subLabel}>All three buttons</Text>
          <ShownHidden showing={showing.voice} onChange={(on) => change('voice', on)} />
          <Text style={styles.caption}>
            Lifestead as installed on this phone shows and hides the three together. A switch for each one comes with the
            next full install.
          </Text>
        </>
      )}

      <Text style={styles.caption}>
        Each can also be added as a quick settings tile, by editing the phone&apos;s quick settings.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: { ...typography.body, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textMuted, marginTop: 10, ...textShadow },
  subLabel: { ...typography.label, color: colors.textPrimary, marginTop: 14, marginBottom: 6, ...textShadow },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pill: { ...PILL },
  pillActive: { ...PILL_ON },
  pillText: { ...PILL_TEXT },
  pillTextActive: { ...PILL_ON_TEXT },
});
