// The tester's half of the code each way (1.0.81.2, by direct instruction):
// the request code this device sent, and the box for the approval code that
// comes back, with Paste and Use This Code. Used by the door
// (components/TesterGate.tsx) and by Ask to Renew on For Testers
// (components/TesterWelcome.tsx), so both work the same way.
//
// Paste only fills the box. What was copied is often the whole reply email,
// so the code is found inside it (findCodes), this device's request code is
// skipped since a reply quotes it, and the person still presses Use This
// Code. An activation link from an older approval is used at once, since it
// cannot be shown as a code.
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { t } from '../lib/i18n';
import { explainNotYet } from '../lib/notYet';
import { activateFromText, activateResultText, useTesterAccess } from '../lib/testerAccess';
import { extractCode, findCodes, formatCode } from '../lib/testerApproval';
import { AppTextInput } from './AppTextInput';

/** The request code this device sent, set large so it can be read out. */
export function TesterRequestCode() {
  const access = useTesterAccess();
  if (!access.requestCode) return null;
  return (
    <View style={styles.group}>
      <Text style={styles.label}>Your request code</Text>
      <Text style={styles.code} selectable>
        {formatCode(access.requestCode)}
      </Text>
      <Text style={styles.caption}>
        This is the code in your email. It is not the one to type below: the approval comes back as a different code.
      </Text>
    </View>
  );
}

export function TesterCodeBox() {
  const access = useTesterAccess();
  const [typed, setTyped] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function tryCode(text: string) {
    setBusy(true);
    try {
      const result = await activateFromText(text);
      // Once it works the screen changes, so a line saying it worked would
      // only be left behind.
      setMessage(result === 'ok' ? null : activateResultText(result));
      if (result === 'ok') setTyped('');
    } finally {
      setBusy(false);
    }
  }

  async function paste() {
    const copied = await Clipboard.getStringAsync().catch(() => '');
    if (!copied.trim()) {
      explainNotYet('Nothing is copied yet. In the approval email, press and hold the code, choose Copy, then come back and press Paste.');
      return;
    }
    const code = findCodes(copied).find((one) => one !== access.requestCode);
    if (code) {
      setTyped(formatCode(code));
      setMessage(null);
      return;
    }
    if (extractCode(copied, 'a')) {
      await tryCode(copied);
      return;
    }
    explainNotYet(
      access.requestCode && findCodes(copied).includes(access.requestCode)
        ? 'What is copied holds only your request code. The approval code is a different one, in the reply email.'
        : 'No approval code was found in what is copied. It looks like K7M2-QX9P: eight letters and numbers with a dash.',
    );
  }

  function pressUse() {
    if (!typed.trim()) {
      explainNotYet('Type or paste the code from the approval email first. It looks like K7M2-QX9P.');
      return;
    }
    void tryCode(typed);
  }

  return (
    <View style={styles.group}>
      <Text style={styles.label}>The code from the approval email</Text>
      <AppTextInput
        style={[styles.input, styles.codeInput]}
        value={typed}
        onChangeText={setTyped}
        placeholder="K7M2-QX9P"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <TouchableOpacity style={[styles.secondary, busy && styles.busy]} onPress={() => void paste()} disabled={busy} accessibilityRole="button">
        <Text style={styles.secondaryText}>Paste</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.primary, busy && styles.busy]} onPress={pressUse} disabled={busy} accessibilityRole="button">
        <Text style={styles.primaryText}>Use This Code</Text>
      </TouchableOpacity>
      {message ? <Text style={styles.body}>{message}</Text> : null}
      <Text style={styles.caption}>{t('Small letters, spaces and the dash do not matter. A code works for two weeks.')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  label: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  body: { ...typography.body, color: colors.textPrimary, ...textShadow },
  code: { ...typography.body, fontSize: 24, letterSpacing: 2, textAlign: 'center', color: colors.textPrimary, ...textShadow },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  codeInput: { fontSize: 22, letterSpacing: 2, textAlign: 'center' },
  primary: { ...BUTTON_PRIMARY },
  primaryText: { ...BUTTON_PRIMARY_TEXT },
  secondary: { ...BUTTON_SECONDARY },
  secondaryText: { ...BUTTON_SECONDARY_TEXT },
  busy: { opacity: 0.6 },
});
