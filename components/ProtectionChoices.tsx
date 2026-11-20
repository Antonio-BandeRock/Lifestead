// How Lifestead is protected, the four choices at the top of Profile > App
// Lock (Tony, 2026-11-19): "Yes, build it with 4 options. App lock being
// another code should be a choice for the user to make when they are setting
// up their choice of options for the lock to be applied."
//
// Each choice pairs the two things that already exist, App Lock and the
// vault, and protectionSteps in lib/vault.ts says what moving to it takes, in
// an order that never leaves records in the vault with nothing to close
// them. App Lock is turned on and off on its own screen, since that restarts
// the app; everything else happens here. With both chosen, the person picks
// whether the vault opens with the App Lock code or a separate one.

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_SECONDARY, BUTTON_SECONDARY_TEXT, PILL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { canUseBiometrics } from '../lib/appLockDevice';
import { deviceWord } from '../lib/appLockWords';
import { isDesktopApp } from '../lib/desktop/bridge';
import { explainNotYet } from '../lib/notYet';
import {
  PROTECTION_CHOICES,
  PROTECTION_LABELS,
  PROTECTION_NOTES,
  protectionSteps,
  VAULT_DEFAULT_CATEGORIES,
  type ProtectionChoice,
} from '../lib/vault';
import { setVaultCategories, setVaultOwnCode, switchVaultToAppLockCode, useVault } from '../lib/vaultSession';
import { getVaultSettings } from '../lib/vaultState';
import { ChoosePasscode } from './AppLockGate';

export function ProtectionChoices({ appLockOn }: { appLockOn: boolean }) {
  const router = useRouter();
  const vault = useVault();
  const [pending, setPending] = useState<ProtectionChoice | null>(null);
  const [choosingSeparate, setChoosingSeparate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // From the live view, which redraws as the vault changes; protectionChoice
  // in lib/vault.ts is the same rule, kept pure for scripts/test_vault.js.
  const current: ProtectionChoice = appLockOn ? (vault.on ? 'both' : 'app') : vault.on ? 'records' : 'none';
  const separate = vault.key === 'own-code';

  // Carries out what is left of the steps toward a choice. A vault code, when
  // one is needed, is asked for in place, and the rest waits for it.
  const carryOut = (target: ProtectionChoice) => {
    const steps = protectionSteps(appLockOn, getVaultSettings(), target);
    if (steps.includes('emptyVault') && vault.closed) {
      explainNotYet('Open the vault first. Taking records out of it while it is closed would show them to whoever is holding this phone.');
      return;
    }
    if (steps.includes('turnOffAppLock') && target === 'records' && vault.closed) {
      explainNotYet('Open the vault first, so its records can be moved to a vault code of their own.');
      return;
    }
    if (steps.includes('chooseRecords')) setVaultCategories(VAULT_DEFAULT_CATEGORIES);
    if (steps.includes('chooseVaultCode')) {
      setPending(target);
      setNote(null);
      return;
    }
    if (steps.includes('emptyVault')) setVaultCategories([]);
    setPending(null);
    if (steps.includes('turnOnAppLock')) {
      router.push('/app-lock-setup');
      return;
    }
    if (steps.includes('turnOffAppLock')) {
      router.push({ pathname: '/app-lock-setup', params: { mode: 'off' } });
      return;
    }
    setNote(null);
  };

  const choose = (target: ProtectionChoice) => {
    if (target === current && !pending) return;
    carryOut(target);
  };

  const vaultCodeChosen = async (passcode: string, kind: 'digits' | 'phrase', after: ProtectionChoice | null) => {
    setBusy(true);
    try {
      const wantsFingerprint = !isDesktopApp() && (await canUseBiometrics());
      await setVaultOwnCode(passcode, kind, wantsFingerprint, appLockOn ? true : undefined);
      setChoosingSeparate(false);
      if (after) carryOut(after);
      else setNote('The vault now opens with the separate code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Text style={styles.subLabel}>How Lifestead is protected</Text>
      {PROTECTION_CHOICES.map((choice) => {
        const on = choice === current;
        return (
          <TouchableOpacity
            key={choice}
            style={styles.row}
            activeOpacity={0.85}
            onPress={() => choose(choice)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <Ionicons
              name={on ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={on ? colors.primary : colors.textMuted}
            />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{PROTECTION_LABELS[choice]}</Text>
              <Text style={styles.rowNote}>
                {choice === 'none'
                  ? `Anyone holding this ${deviceWord()} while it is unlocked can open Lifestead and read everything in it.`
                  : PROTECTION_NOTES[choice]}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {pending ? (
        <View style={styles.askBox}>
          <ChoosePasscode
            title="Choose a vault code"
            intro={
              appLockOn
                ? 'This code opens the records in the vault. Once it is set, App Lock is turned off on the next screen, and the vault keeps those records closed with this code.'
                : 'This code opens the records in the vault and nothing else. Without App Lock the file is not encrypted, so the vault keeps the records off the screen.'
            }
            busy={busy}
            onChosen={(passcode, kind) => void vaultCodeChosen(passcode, kind, pending)}
          />
          <TouchableOpacity style={styles.quietButton} activeOpacity={0.85} onPress={() => setPending(null)}>
            <Text style={styles.quietButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {current === 'both' && !pending ? (
        <>
          <Text style={styles.subLabel}>What opens the health records</Text>
          <View style={styles.pillRow}>
            {[false, true].map((own) => (
              <TouchableOpacity
                key={String(own)}
                style={[styles.pill, separate === own ? styles.pillActive : null]}
                activeOpacity={0.85}
                onPress={() => {
                  if (own === separate) return;
                  if (vault.closed) {
                    explainNotYet('Open the vault first, then choose what opens it.');
                    return;
                  }
                  if (own) setChoosingSeparate(true);
                  else
                    void switchVaultToAppLockCode().then(() =>
                      setNote('The vault opens with your App Lock code again.'),
                    );
                }}
              >
                <Text style={[styles.pillText, separate === own ? styles.pillTextActive : null]}>
                  {own ? 'A separate code' : 'The App Lock code'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.caption}>
            {separate
              ? 'The vault has a code of its own, so someone who knows the App Lock code still cannot open the health records.'
              : 'One code opens the app and the vault. Anyone who knows it can open both.'}
          </Text>
          {choosingSeparate ? (
            <View style={styles.askBox}>
              <ChoosePasscode
                title="Choose a separate vault code"
                intro="This code opens the vault and nothing else. Lifestead still asks for the App Lock code when it opens."
                busy={busy}
                onChosen={(passcode, kind) => void vaultCodeChosen(passcode, kind, null)}
              />
              <TouchableOpacity style={styles.quietButton} activeOpacity={0.85} onPress={() => setChoosingSeparate(false)}>
                <Text style={styles.quietButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      ) : null}

      {note ? <Text style={styles.caption}>{note}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  subLabel: { ...typography.label, color: colors.textPrimary, marginTop: 14, marginBottom: 6, ...textShadow },
  caption: { ...typography.caption, color: colors.textMuted, marginTop: 6, ...textShadow },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  rowText: { flex: 1, minWidth: 0 },
  rowLabel: { ...typography.body, color: colors.textPrimary, ...textShadow },
  rowNote: { ...typography.caption, color: colors.textMuted, marginTop: 2, ...textShadow },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { ...PILL },
  pillActive: { ...PILL_ON },
  pillText: { ...PILL_TEXT },
  pillTextActive: { ...PILL_ON_TEXT },
  askBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  quietButton: { ...BUTTON_SECONDARY, marginTop: 14 },
  quietButtonText: { ...BUTTON_SECONDARY_TEXT },
});
