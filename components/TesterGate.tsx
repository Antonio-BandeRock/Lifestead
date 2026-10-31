// The door of the tester version (tester plan T12, 2026-10-31).
//
// Over the whole app, in the tester version only, until this device has an
// approval that has not ended. In turn it shows the tester agreement, a
// name and Ask for Access, then waiting with a box to paste the link that
// comes back. When an approval ends it asks for more time with one press;
// when the approval is for another device it says so. Nothing underneath is
// touched: records stay where they are and open again once access is back.
//
// Drawn ahead of OverlayRoot and AppKeyboard in app/_layout.tsx, so the
// keyboard draws over its text boxes.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { isTesterBuild } from '../lib/appVariant';
import { t } from '../lib/i18n';
import { explainNotYet } from '../lib/notYet';
import { PROBLEM_REPORT_ADDRESS } from '../lib/problemReport';
import {
  acceptTesterAgreement,
  activateFromText,
  activateResultText,
  askForAccess,
  startTesterAccessWatch,
  useTesterAccess,
  type AskResult,
} from '../lib/testerAccess';
import { endDay } from '../lib/testerApproval';
import {
  TESTER_AGREEMENT_BUTTON,
  TESTER_AGREEMENT_INTRO,
  TESTER_AGREEMENT_POINTS,
  TESTER_AGREEMENT_TITLE,
} from '../lib/testerAgreement';
import { AppTextInput } from './AppTextInput';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandStyle } from './HomeSectionBand';

export function TesterGate() {
  if (!isTesterBuild()) return null;
  return <TesterGateInner />;
}

function askedText(result: AskResult): string {
  if (result === 'opened') return 'Your email app is open with the request in it. Press Send there, and the link will come back to this email address.';
  if (result === 'copied') return t('No email app opened, so the request is copied. Paste it into an email to {address}.', { address: PROBLEM_REPORT_ADDRESS });
  return t('No email app opened and the request could not be copied. Write to {address} and ask for access.', { address: PROBLEM_REPORT_ADDRESS });
}

function TesterGateInner() {
  const insets = useSafeAreaInsets();
  const access = useTesterAccess();
  const [name, setName] = useState('');
  const [pasted, setPasted] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => startTesterAccessWatch(), []);
  useEffect(() => {
    if (access.name && !name) setName(access.name);
  }, [access.name, name]);

  if (access.state.kind === 'ok') return null;

  async function ask(renewal: boolean) {
    if (!name.trim()) {
      explainNotYet('Write your name first, so the request says who it is from.');
      return;
    }
    setBusy(true);
    try {
      setMessage(askedText(await askForAccess(name, renewal)));
    } finally {
      setBusy(false);
    }
  }

  async function applyPasted() {
    if (!pasted.trim()) {
      explainNotYet('Paste the link from the approval email first.');
      return;
    }
    setBusy(true);
    try {
      const result = await activateFromText(pasted);
      setMessage(activateResultText(result));
      if (result === 'ok') setPasted('');
    } finally {
      setBusy(false);
    }
  }

  const content = { paddingTop: insets.top + HOME_BAND_GAP, paddingBottom: insets.bottom + HOME_BAND_GAP * 2 };

  // Until the stored access is read, a plain cover, so the app never shows
  // for a moment before the gate.
  if (!access.loaded) return <View style={styles.cover} />;

  if (!access.agreed) {
    return (
      <View style={styles.cover}>
        <ScrollView contentContainerStyle={[styles.content, content]}>
          <View style={styles.band}>
            <Text style={styles.title} accessibilityRole="header">
              {TESTER_AGREEMENT_TITLE}
            </Text>
            <Text style={styles.body}>{TESTER_AGREEMENT_INTRO}</Text>
          </View>
          {TESTER_AGREEMENT_POINTS.map((point) => (
            <View key={point.heading} style={styles.band}>
              <View style={styles.headingRow}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.tabProfile} style={textShadow} />
                <Text style={styles.heading}>{point.heading}</Text>
              </View>
              <Text style={styles.body}>{point.body}</Text>
            </View>
          ))}
          <View style={styles.band}>
            <TouchableOpacity style={styles.primary} onPress={() => void acceptTesterAgreement()} accessibilityRole="button">
              <Text style={styles.primaryText}>{TESTER_AGREEMENT_BUTTON}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const state = access.state;
  const renewal = state.kind === 'expired';
  const title =
    state.kind === 'expired'
      ? 'Your test time has ended'
      : state.kind === 'wrongDevice'
        ? 'This copy was approved for a different device'
        : access.askedAt
          ? 'Waiting for approval'
          : 'Ask for access';
  const lead =
    state.kind === 'expired'
      ? t('Access on this device ended on {day}. Your records are all still here, and open again as soon as more time is approved.', { day: endDay(state.approval) })
      : state.kind === 'wrongDevice'
        ? 'Each phone or computer is approved by itself, so an approval cannot move to another device, and a restored backup asks again. Ask from this one.'
        : access.askedAt
          ? 'Once your request is sent and approved, a link comes back by email. Press it on this device, or copy it and paste it below.'
          : 'Lifestead Test opens on devices that have been approved. Write your name and press Ask for Access, and your email app opens with the request ready to send.';

  return (
    <View style={styles.cover}>
      <ScrollView contentContainerStyle={[styles.content, content]} keyboardShouldPersistTaps="handled">
        <View style={styles.band}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.body}>{lead}</Text>
        </View>
        <View style={styles.band}>
          {renewal && access.name ? null : (
            <>
              <Text style={styles.label}>Your name</Text>
              <AppTextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t('First and last name')}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </>
          )}
          <TouchableOpacity
            style={[access.askedAt && !renewal ? styles.secondary : styles.primary, busy && styles.busy]}
            onPress={() => void ask(renewal)}
            disabled={busy}
            accessibilityRole="button"
          >
            <Text style={access.askedAt && !renewal ? styles.secondaryText : styles.primaryText}>
              {renewal ? 'Ask to Renew' : access.askedAt ? 'Ask Again' : 'Ask for Access'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.caption}>
            The request carries your name and a code for this device, nothing else. It goes to testers@ghostead.com.
          </Text>
        </View>
        {access.askedAt || renewal || state.kind === 'wrongDevice' ? (
          <View style={styles.band}>
            <Text style={styles.label}>The link from the approval email</Text>
            <AppTextInput
              style={styles.input}
              value={pasted}
              onChangeText={setPasted}
              placeholder={t('Paste it here')}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <TouchableOpacity style={[styles.primary, busy && styles.busy]} onPress={() => void applyPasted()} disabled={busy} accessibilityRole="button">
              <Text style={styles.primaryText}>Use This Link</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {message ? (
          <View style={styles.band}>
            <Text style={styles.body}>{message}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.background, zIndex: 900, elevation: 900 },
  content: { gap: HOME_BAND_GAP },
  band: {
    ...homeBandStyle,
    borderColor: colors.tabProfile,
    padding: HOME_BAND_CONTENT_PADDING,
    gap: 10,
  },
  title: { ...typography.sectionTitle, fontSize: 22, color: colors.tabProfileText, ...textShadow },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { ...typography.body, color: colors.textPrimary, flex: 1, ...textShadow },
  body: { ...typography.body, color: colors.textPrimary, ...textShadow },
  label: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow },
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
  primary: { ...BUTTON_PRIMARY },
  primaryText: { ...BUTTON_PRIMARY_TEXT },
  secondary: { ...BUTTON_SECONDARY },
  secondaryText: { ...BUTTON_SECONDARY_TEXT },
  busy: { opacity: 0.6 },
});
