// Approve a Tester, in the developer version (tester plan T12, 2026-10-31).
// Reached from an approval request link (app/approve.tsx) or from
// Developer Tools. Developer only: metro.config.js leaves it out of the
// tester and store versions.
//
// A request that arrives on a link (the phone's Open in Lifestead, or the
// PC's, through DesktopLinkWatcher) is approved at once and the reply is
// copied, so all that is left is Reply and Paste in the email.
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { t } from '../lib/i18n';
import { explainNotYet } from '../lib/notYet';
import { isDesktopApp } from '../lib/desktop/bridge';
import { approveRequest, getMyApprovalKey, sendMyApprovalKey, type Approved, type MyApprovalKey } from '../lib/testerApprove';
import { AppTextInput } from './AppTextInput';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandStyle } from './HomeSectionBand';

type Props = {
  /** The request that came in on a link, if one did. */
  initial?: string;
};

export function ApproveTesterPanel({ initial = '' }: Props) {
  const [input, setInput] = useState(initial);
  const [result, setResult] = useState<Approved | null>(null);
  const [mine, setMine] = useState<MyApprovalKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [keySent, setKeySent] = useState<string | null>(null);
  const approvedFor = useRef('');

  useEffect(() => {
    void getMyApprovalKey().then(setMine).catch(() => setMine(null));
  }, []);
  useEffect(() => {
    if (!initial || approvedFor.current === initial) return;
    approvedFor.current = initial;
    setInput(initial);
    void approve(initial);
    // approve reads only what it is handed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  async function approve(text: string = input) {
    if (!text.trim()) {
      explainNotYet('Paste the link from the tester\'s email first.');
      return;
    }
    setBusy(true);
    setCopied(false);
    try {
      const done = await approveRequest(text);
      setResult(done);
      if (done.ok) {
        // A copy without a press can be refused (a window not in front);
        // Copy the Reply is still there when it is.
        const went = await Clipboard.setStringAsync(replyText(done.link, done.request.name)).then(() => true, () => false);
        setCopied(went);
      }
    } finally {
      setBusy(false);
    }
  }

  // The box hides Android's paste menu (AppTextInput), so the copied request
  // is read from the clipboard here.
  async function pasteRequest() {
    const copied = await Clipboard.getStringAsync().catch(() => '');
    if (!copied.trim()) {
      explainNotYet('Nothing is copied yet. Copy the request link from the tester\'s email first.');
      return;
    }
    setInput(copied);
    void approve(copied);
  }

  async function sendKey() {
    const problem = await sendMyApprovalKey().catch((error: unknown) => String(error));
    setKeySent(problem ?? 'Sent. Tell Claude it is there, and the next update trusts this device.');
  }

  async function send(url: string, name: string) {
    await Share.share({ message: replyText(url, name) });
  }

  async function copy(url: string, name: string) {
    await Clipboard.setStringAsync(replyText(url, name));
    setCopied(true);
  }

  return (
    <View style={styles.column}>
      <View style={styles.band}>
        <Text style={styles.label}>The request link from the tester&apos;s email</Text>
        <AppTextInput
          style={styles.input}
          value={input}
          onChangeText={(text) => {
            setInput(text);
            setResult(null);
          }}
          placeholder="Paste it here"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
        <TouchableOpacity style={[styles.primary, busy && styles.busy]} onPress={() => void pasteRequest()} disabled={busy} accessibilityRole="button">
          <Text style={styles.primaryText}>Paste and Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondary, busy && styles.busy]} onPress={() => void approve()} disabled={busy} accessibilityRole="button">
          <Text style={styles.secondaryText}>Approve for 90 Days</Text>
        </TouchableOpacity>
        <Text style={styles.caption}>
          Quickest: in the tester&apos;s email, tap the link, then Open in Lifestead. It is approved at once and the reply is copied.
        </Text>
        {mine && !mine.trusted ? (
          <>
            <Text style={styles.warning}>
              This device&apos;s approval key is not in the tester version yet, so its links will not open anything until it is.
            </Text>
            <TouchableOpacity style={styles.secondary} onPress={() => void sendKey()} accessibilityRole="button">
              <Text style={styles.secondaryText}>Send My Approval Key to Claude</Text>
            </TouchableOpacity>
            {keySent ? <Text style={styles.caption}>{keySent}</Text> : null}
          </>
        ) : null}
      </View>
      {result && !result.ok ? (
        <View style={styles.band}>
          <Text style={styles.warning}>{result.reason}</Text>
        </View>
      ) : null}
      {result && result.ok ? (
        <View style={styles.band}>
          <Text style={styles.body}>{approvedLine(result.request.name, result.request.platform, result.request.renewal, result.until)}</Text>
          <Text style={styles.approvalLink} selectable>
            {result.link}
          </Text>
          {copied ? <Text style={styles.body}>The reply is copied. Go back to their email, press Reply, and paste it.</Text> : null}
          <TouchableOpacity style={styles.primary} onPress={() => void copy(result.link, result.request.name)} accessibilityRole="button">
            <Text style={styles.primaryText}>{copied ? 'Copied' : 'Copy the Reply'}</Text>
          </TouchableOpacity>
          {isDesktopApp() ? null : (
            <TouchableOpacity style={styles.secondary} onPress={() => void send(result.link, result.request.name)} accessibilityRole="button">
              <Text style={styles.secondaryText}>Send Another Way</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.caption}>The link opens Lifestead Test only on the device that asked.</Text>
        </View>
      ) : null}
    </View>
  );
}

function replyText(url: string, name: string): string {
  return `${t('{name}, here is your link for Lifestead Test. Open it on the device you asked from:', { name })}
${url}`;
}

function approvedLine(name: string, platform: 'phone' | 'computer', renewal: boolean, day: string): string {
  const values = { name, day };
  if (platform === 'phone') {
    return renewal ? t('{name}, a phone, asking for more time. Approved until {day}.', values) : t('{name}, a phone. Approved until {day}.', values);
  }
  return renewal ? t('{name}, a computer, asking for more time. Approved until {day}.', values) : t('{name}, a computer. Approved until {day}.', values);
}

const styles = StyleSheet.create({
  column: { gap: HOME_BAND_GAP },
  band: { ...homeBandStyle, borderColor: colors.tabProfile, padding: HOME_BAND_CONTENT_PADDING, gap: 10 },
  label: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  body: { ...typography.body, color: colors.textPrimary, ...textShadow },
  approvalLink: { ...typography.caption, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  warning: { ...typography.caption, color: colors.danger, ...textShadow },
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
