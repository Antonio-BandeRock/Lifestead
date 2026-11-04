// Approve a Tester, in the developer version (tester plan T12, 2026-10-31).
// Reached from an approval request link (app/approve.tsx) or from
// Developer Tools. Developer only: metro.config.js leaves it out of the
// tester and store versions.
//
// Since 1.0.81.2 it is a code each way, by direct instruction: the tester's
// email carries a request code, pasted or typed here; Approve fetches the
// request it stands for, keeps a record of who asked (name, which device,
// which copy of the app), signs the approval and gives back an approval code
// for the reply, which the tester types on the waiting screen. Every
// approval is listed under Approved Testers. A request link from an older
// tester version still works, and one arriving on a link (the phone's Open
// in Lifestead, or the PC's, through DesktopLinkWatcher) is approved at once.
// Only when the site cannot be reached does the reply carry a link instead.
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY, BUTTON_SECONDARY_TEXT, PILL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { t } from '../lib/i18n';
import { explainNotYet } from '../lib/notYet';
import { isDesktopApp } from '../lib/desktop/bridge';
import { extractCode, findCodes, formatCode } from '../lib/testerApproval';
import {
  approveRequest,
  getMyApprovalKey,
  listTesterApprovals,
  sendMyApprovalKey,
  type Approved,
  type MyApprovalKey,
  type TesterApprovalRecord,
} from '../lib/testerApprove';
import { AppTextInput } from './AppTextInput';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandStyle } from './HomeSectionBand';

// How long an approval can last. The tester version reads any length, so
// this list is the developer's choice alone.
const LENGTHS = [90, 180, 270, 365] as const;

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
  const [records, setRecords] = useState<TesterApprovalRecord[]>([]);
  const approvedFor = useRef('');
  const [days, setDays] = useState<number>(LENGTHS[0]);

  const loadRecords = useCallback(() => {
    void listTesterApprovals()
      .then(setRecords)
      .catch((error: unknown) => console.warn('[approveTester] could not read the list', error));
  }, []);

  useEffect(() => {
    void getMyApprovalKey().then(setMine).catch(() => setMine(null));
    loadRecords();
  }, [loadRecords]);
  useEffect(() => {
    if (!initial || approvedFor.current === initial) return;
    approvedFor.current = initial;
    setInput(initial);
    void approve(initial);
    // approve reads only what it is handed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  async function approve(text: string = input, length: number = days, replaces?: string) {
    if (!text.trim()) {
      explainNotYet('Type or paste the request code from the tester\'s email first. It looks like K7M2-QX9P.');
      return;
    }
    setBusy(true);
    setCopied(false);
    try {
      const done = await approveRequest(text, length, replaces);
      setResult(done);
      if (done.ok) {
        loadRecords();
        // A copy without a press can be refused (a window not in front);
        // Copy the Reply is still there when it is.
        const went = await Clipboard.setStringAsync(replyText(done)).then(() => true, () => false);
        setCopied(went);
      }
    } finally {
      setBusy(false);
    }
  }

  // The box hides Android's paste menu (AppTextInput), so what was copied is
  // read here. A whole copied email is fine: only the code goes in the box.
  async function paste() {
    const text = await Clipboard.getStringAsync().catch(() => '');
    if (!text.trim()) {
      explainNotYet('Nothing is copied yet. In the tester\'s email, press and hold the request code, choose Copy, then press Paste.');
      return;
    }
    const code = findCodes(text)[0];
    if (code) setInput(formatCode(code));
    else if (extractCode(text, 'r')) setInput(text.trim());
    else {
      explainNotYet('No request code was found in what is copied. It looks like K7M2-QX9P: eight letters and numbers with a dash.');
      return;
    }
    setResult(null);
  }

  // A different length after approving signs the same request again, in
  // place of the record just made, so the copied reply always carries the
  // length on screen and the list holds one line for it.
  function chooseLength(length: number) {
    setDays(length);
    if (result && result.ok) void approve(input, length, result.recordId ?? undefined);
  }

  async function sendKey() {
    const problem = await sendMyApprovalKey().catch((error: unknown) => String(error));
    setKeySent(problem ?? 'Sent. Tell Claude it is there, and the next update trusts this device.');
  }

  async function send(done: Approval) {
    await Share.share({ message: replyText(done) });
  }

  async function copy(done: Approval) {
    await Clipboard.setStringAsync(replyText(done));
    setCopied(true);
  }

  return (
    <View style={styles.column}>
      <View style={styles.band}>
        <Text style={styles.label}>The request code from the tester&apos;s email</Text>
        <AppTextInput
          style={[styles.input, styles.codeInput]}
          value={input}
          onChangeText={(text) => {
            setInput(text);
            setResult(null);
          }}
          placeholder="K7M2-QX9P"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <TouchableOpacity style={[styles.secondary, busy && styles.busy]} onPress={() => void paste()} disabled={busy} accessibilityRole="button">
          <Text style={styles.secondaryText}>Paste</Text>
        </TouchableOpacity>
        <Text style={styles.label}>How long it lasts</Text>
        <View style={styles.pills}>
          {LENGTHS.map((length) => (
            <TouchableOpacity
              key={length}
              style={[styles.pill, days === length && styles.pillActive]}
              onPress={() => chooseLength(length)}
              accessibilityRole="button"
              accessibilityState={{ selected: days === length }}
            >
              <Text style={days === length ? styles.pillActiveText : styles.pillText}>{t('{count} days', { count: length })}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[styles.primary, busy && styles.busy]} onPress={() => void approve()} disabled={busy} accessibilityRole="button">
          <Text style={styles.primaryText}>{t('Approve for {count} Days', { count: days })}</Text>
        </TouchableOpacity>
        <Text style={styles.caption}>
          Approving reads the request the code stands for, keeps who asked in the list below, and gives back an approval code. The reply is copied. Choosing another length afterwards approves it again.
        </Text>
        {mine && !mine.trusted ? (
          <>
            <Text style={styles.warning}>
              This device&apos;s approval key is not in the tester version yet, so its approvals will not open anything until it is.
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
          <Text style={styles.caption}>{t('Device: {device}', { device: shortDevice(result.request.device) })}</Text>
          <Text style={styles.caption}>{t('App: {app}', { app: result.request.app ?? t('not given (an older test version)') })}</Text>
          {result.code ? (
            <>
              <Text style={styles.label}>The approval code to send back</Text>
              <Text style={styles.code} selectable>
                {formatCode(result.code)}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.warning}>The site could not be reached, so the reply carries the link instead of a code.</Text>
              <Text style={styles.approvalLink} selectable>
                {result.link}
              </Text>
            </>
          )}
          {copied ? <Text style={styles.body}>The reply is copied. Go back to their email, press Reply, and paste it.</Text> : null}
          <TouchableOpacity style={styles.primary} onPress={() => void copy(result)} accessibilityRole="button">
            <Text style={styles.primaryText}>{copied ? 'Copied' : 'Copy the Reply'}</Text>
          </TouchableOpacity>
          {isDesktopApp() ? null : (
            <TouchableOpacity style={styles.secondary} onPress={() => void send(result)} accessibilityRole="button">
              <Text style={styles.secondaryText}>Send Another Way</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.caption}>
            {result.code ? 'The approval code works only on the device that asked, for two weeks.' : 'The link opens Lifestead Test only on the device that asked.'}
          </Text>
        </View>
      ) : null}
      <View style={styles.band}>
        <Text style={styles.heading}>Approved Testers</Text>
        {records.length === 0 ? (
          <Text style={styles.caption}>Nobody has been approved from this device yet.</Text>
        ) : (
          records.map((record) => (
            <View key={record.id} style={styles.record}>
              <Text style={styles.body}>{approvedLine(record.name, record.platform === 'computer' ? 'computer' : 'phone', record.renewal, record.untilDay)}</Text>
              <Text style={styles.caption}>
                {t('Approved {day}. Device: {device}. App: {app}.', {
                  day: record.approvedAt.slice(0, 10),
                  device: shortDevice(record.device),
                  app: record.app ?? t('not given (an older test version)'),
                })}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

type Approval = Extract<Approved, { ok: true }>;

/** Enough of the device code to tell two devices apart on the list. */
function shortDevice(device: string): string {
  return device.length > 12 ? device.slice(0, 12) : device;
}

function replyText(done: Approval): string {
  const name = done.request.name;
  if (!done.code) {
    return `${t('{name}, here is your link for Lifestead Test. Open it on the device you asked from:', { name })}
${done.link}`;
  }
  return t('{name}, you are approved for Lifestead Test until {day}. On the device you asked from, type this code in Lifestead Test and press Use This Code: {code}', {
    name,
    day: done.until,
    code: formatCode(done.code),
  });
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
  heading: { ...typography.body, color: colors.tabProfileText, ...textShadow },
  record: { gap: 2 },
  label: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  body: { ...typography.body, color: colors.textPrimary, ...textShadow },
  approvalLink: { ...typography.caption, color: colors.textPrimary, ...textShadow },
  code: { ...typography.sectionTitle, fontSize: 28, letterSpacing: 3, textAlign: 'center', color: colors.textPrimary, ...textShadow },
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
  codeInput: { fontSize: 22, letterSpacing: 2, textAlign: 'center' },
  primary: { ...BUTTON_PRIMARY },
  primaryText: { ...BUTTON_PRIMARY_TEXT },
  secondary: { ...BUTTON_SECONDARY },
  secondaryText: { ...BUTTON_SECONDARY_TEXT },
  busy: { opacity: 0.6 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { ...PILL },
  pillActive: { ...PILL_ON },
  pillText: { ...PILL_TEXT },
  pillActiveText: { ...PILL_ON_TEXT },
});
