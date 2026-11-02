// The door of the tester version (tester plan T12, 2026-10-31).
//
// Over the whole app, in the tester version only, until this device has an
// approval that has not ended and the agreement is read. In turn, by direct
// instruction (2026-11-02, 1.0.79.1): a name and Ask for Access, which
// emails testers@ghostead.com; then the box to paste the link that comes
// back, with Ask Again under it; then Before you start testing, which holds
// what a fresh install used to show as an update message and Lifestead's
// general points; then setup (components/FirstSetup.tsx). When an approval ends it asks for more time with one press;
// when the approval is for another device it says so. Nothing underneath is
// touched: records stay where they are and open again once access is back.
//
// Drawn ahead of OverlayRoot and AppKeyboard in app/_layout.tsx. Its
// elevation keeps the edge buttons under it, so the keyboard carries a
// higher one (2000) to draw over its text boxes, and Report a Problem's
// flag and sheet sit between the two. Setup waits until this lets the
// person in (components/FirstSetup.tsx).
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
import { AGREEMENT_FOOTNOTE } from '../lib/agreement';
import { recordAgreement } from '../lib/agreementDb';
import { useNavigationHand } from '../lib/navigationHand';
import { PROBLEM_REPORT_ADDRESS } from '../lib/problemReport';
import { REPORT_FLAG_ROOM } from '../lib/reportProblem';
import {
  acceptTesterAgreement,
  activateFromText,
  activateResultText,
  askForAccess,
  startTesterAccessWatch,
  testerDoorOpen,
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
import { AgreementPoints } from './AgreementPoints';
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
  const hand = useNavigationHand();
  const [name, setName] = useState('');
  const [pasted, setPasted] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [agreeing, setAgreeing] = useState(false);

  useEffect(() => startTesterAccessWatch(), []);
  useEffect(() => {
    if (access.name && !name) setName(access.name);
  }, [access.name, name]);

  if (testerDoorOpen(access)) return null;

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
      // Once it works the next screen is the agreement, so a line saying it
      // worked would only be left behind for later.
      setMessage(result === 'ok' ? null : activateResultText(result));
      if (result === 'ok') setPasted('');
    } finally {
      setBusy(false);
    }
  }

  // The tester's points and Lifestead's general points are read on one
  // screen, and I Agree keeps both, so FirstLaunchAgreement has nothing left
  // to ask on a first install.
  async function agree() {
    if (agreeing) return;
    setAgreeing(true);
    try {
      await recordAgreement().catch((error: unknown) => {
        console.warn('[testerGate] could not keep the general agreement', error);
      });
      await acceptTesterAgreement();
    } finally {
      setAgreeing(false);
    }
  }

  // The Report a Problem flag sits against one edge at mid-height, over
  // this screen, so the words keep out from under it on that side.
  const flagSide = hand === 'right' ? { paddingRight: REPORT_FLAG_ROOM } : { paddingLeft: REPORT_FLAG_ROOM };
  const content = { paddingTop: insets.top + HOME_BAND_GAP, paddingBottom: insets.bottom + HOME_BAND_GAP * 2, ...flagSide };

  // Until the stored access is read, a plain cover, so the app never shows
  // for a moment before the gate.
  if (!access.loaded) return <View style={styles.cover} />;

  const state = access.state;

  // Third, once this device is approved: what testing asks of somebody.
  if (state.kind === 'ok') {
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
          <AgreementPoints />
          <View style={styles.band}>
            <TouchableOpacity
              style={[styles.primary, agreeing && styles.busy]}
              onPress={() => void agree()}
              disabled={agreeing}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>{TESTER_AGREEMENT_BUTTON}</Text>
            </TouchableOpacity>
            <Text style={styles.caption}>{AGREEMENT_FOOTNOTE}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  const renewal = state.kind === 'expired';
  const wrongDevice = state.kind === 'wrongDevice';
  // Second, once the request has gone (or an approval needs replacing): the
  // box for the link that comes back, ahead of asking again.
  const waiting = !!access.askedAt || renewal || wrongDevice;

  const title = renewal
    ? 'Your test time has ended'
    : wrongDevice
      ? 'This copy was approved for a different device'
      : waiting
        ? 'Enter your approval link'
        : 'Ask for access';
  const lead = renewal
    ? t('Access on this device ended on {day}. Your records are all still here, and open again as soon as more time is approved.', { day: endDay(state.approval) })
    : wrongDevice
      ? 'Each phone or computer is approved by itself, so an approval cannot move to another device, and a restored backup asks again. Ask from this one.'
      : waiting
        ? 'Once your request is approved, a link comes back by email from testers@ghostead.com. Press it on this device, or copy it and paste it below.'
        : 'Lifestead Test opens on devices that have been approved. Write your name and press Ask for Access, and your email app opens with a request to testers@ghostead.com, ready to send.';

  const askBand = (
    <View style={styles.band}>
      {waiting && !renewal && !wrongDevice ? <Text style={styles.label}>No email yet, or did it go astray?</Text> : null}
      {access.name && waiting ? null : (
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
        style={[waiting && !renewal ? styles.secondary : styles.primary, busy && styles.busy]}
        onPress={() => void ask(renewal)}
        disabled={busy}
        accessibilityRole="button"
      >
        <Text style={waiting && !renewal ? styles.secondaryText : styles.primaryText}>
          {renewal ? 'Ask to Renew' : waiting ? 'Ask Again' : 'Ask for Access'}
        </Text>
      </TouchableOpacity>
      <Text style={styles.caption}>
        The request carries your name and a code for this device, nothing else. It goes to testers@ghostead.com.
      </Text>
    </View>
  );

  const linkBand = (
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
  );

  return (
    <View style={styles.cover}>
      <ScrollView contentContainerStyle={[styles.content, content]} keyboardShouldPersistTaps="handled">
        <View style={styles.band}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.body}>{lead}</Text>
        </View>
        {message ? (
          <View style={styles.band}>
            <Text style={styles.body}>{message}</Text>
          </View>
        ) : null}
        {renewal ? askBand : null}
        {waiting ? linkBand : null}
        {renewal ? null : askBand}
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
