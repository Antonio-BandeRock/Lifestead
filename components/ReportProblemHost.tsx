// Report a Problem: the button against the edge and the sheet a report is
// written in (tester plan T4, 2026-10-31). Mounted once at the app root
// (app/_layout.tsx) and drawing nothing at all outside the tester version.
// lib/problemReport.ts holds the shape of a report and every word that goes
// into the email, lib/reportProblem.ts how a long press on a band reaches
// here, lib/crashNote.ts what went wrong when the app last closed by itself,
// and lib/problemReportSend.ts the hand-off to the tester's email app.
//
// Two ways in, the same two Tell Claude has in the developer version: the
// button covers every screen, and a long press on a fold band names that
// band as the place. The place is filled in from the screen the sheet was
// opened on and can be changed to any tab, or to not one place in
// particular.
//
// Deliberately NOT a Modal, for the reason TellClaudeHost gives: AppKeyboard
// is a View drawn at the root, and a Modal would cover it.
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT, PILL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { TAB_ROUTES } from '../constants/tabs';
import { textShadow, typography } from '../constants/typography';
import { APP_VERSION } from '../constants/version';
import { isTesterBuild } from '../lib/appVariant';
import { clearCrashNote, readCrashNote } from '../lib/crashNote';
import { useNavigationHand } from '../lib/navigationHand';
import {
  PROBLEM_REPORT_ADDRESS,
  PROBLEM_REPORT_CAPTIONS,
  PROBLEM_REPORT_KINDS,
  PROBLEM_REPORT_LABELS,
  describeProblemPlace,
  problemReportProblem,
} from '../lib/problemReport';
import type { ProblemReportKind, ProblemReportPlace } from '../lib/problemReport';
import { describeReportDevice, sendProblemReport } from '../lib/problemReportSend';
import { registerReportProblemOpener, setReportProblemEnabled } from '../lib/reportProblem';
import type { ReportProblemTarget } from '../lib/reportProblem';
import { currentTellClaudeScreen } from '../lib/tellClaude';
import { t } from '../lib/i18n';
import { PlainTextZone } from './EditableText';
import { HorizontalScroll } from './HorizontalScroll';
import { NotesInput } from './NotesInput';
import { ThumbRow } from './ThumbRow';
import { useWalkMark } from './WalkMark';

// The places a report can be about, beyond the tabs.
const OTHER_PLACES = ['Profile', 'Info'];
const NOT_ONE_PLACE = 'Not one place';

type Open = {
  // Where the sheet was opened, kept so choosing that tab again brings the
  // lens and band back.
  start: ProblemReportPlace;
  place: ProblemReportPlace;
  crash: string | null;
};

type Done = 'opened' | 'copied' | 'failed';

export function ReportProblemHost() {
  const on = isTesterBuild();
  const hand = useNavigationHand();
  const walkMark = useWalkMark();
  const edge = hand === 'right' ? styles.buttonRightEdge : null;
  const [open, setOpen] = useState<Open | null>(null);
  const [kind, setKind] = useState<ProblemReportKind>('problem');
  const [body, setBody] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    setReportProblemEnabled(on);
  }, [on]);

  const start = useCallback((target: ReportProblemTarget, crash: string | null = null) => {
    const where = currentTellClaudeScreen();
    const place: ProblemReportPlace = { tab: where.tab, lens: where.lens, bandTitle: target.bandTitle ?? null };
    setOpen({ start: place, place, crash });
    setKind('problem');
    setBody('');
    setProblem(null);
    setDone(null);
  }, []);

  useEffect(() => registerReportProblemOpener((target) => start(target)), [start]);

  // After the app closed by itself, the next open offers to send what went
  // wrong. Once, at start: a crash note is cleared whichever way the sheet
  // is closed.
  useEffect(() => {
    if (!on) return;
    const crash = readCrashNote();
    if (crash) start({}, crash);
  }, [on, start]);

  if (!on) return null;

  function close() {
    if (open?.crash) clearCrashNote();
    setOpen(null);
  }

  function choosePlace(tab: string | null) {
    setOpen((current) => {
      if (!current) return current;
      const place = tab === current.start.tab ? current.start : { tab, lens: null, bandTitle: null };
      return { ...current, place };
    });
  }

  async function send() {
    if (!open || sending) return;
    const wrong = problemReportProblem(body, open.crash);
    if (wrong) {
      setProblem(wrong);
      return;
    }
    setSending(true);
    try {
      const result = await sendProblemReport({
        kind,
        place: open.place,
        body,
        version: APP_VERSION,
        device: describeReportDevice(),
        crash: open.crash,
        sentAt: new Date(),
      });
      if (result !== 'failed' && open.crash) clearCrashNote();
      setDone(result);
    } finally {
      setSending(false);
    }
  }

  const places = [...TAB_ROUTES.map((tab) => tab.title), ...OTHER_PLACES];

  return (
    <PlainTextZone>
      {open ? null : (
        <TouchableOpacity
          ref={walkMark.ref('report.button')}
          style={[styles.button, edge, walkMark('report.button')]}
          onPress={() => start({})}
          accessibilityLabel="Report a problem or a wish"
          hitSlop={8}
        >
          <Ionicons name="flag-outline" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      )}
      {open ? (
        <View style={styles.backdrop}>
          <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={close} />
          <View style={styles.card}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.title}>Report a problem or a wish</Text>
              {done ? (
                <>
                  <Text style={styles.message}>
                    {done === 'opened'
                      ? 'Your email app is open with the report in it. Read it over, then press Send there.'
                      : done === 'copied'
                        ? t('No email app opened, so the report is copied. Paste it into an email to {address}.', { address: PROBLEM_REPORT_ADDRESS })
                        : t('No email app opened and the report could not be copied. Write to {address} and say what happened.', { address: PROBLEM_REPORT_ADDRESS })}
                  </Text>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.okButton} onPress={() => setOpen(null)} hitSlop={8}>
                      <Text style={styles.okButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {open.crash ? (
                    <Text style={styles.crash}>
                      The app closed by itself last time. What were you doing? The details of what went wrong are added for you.
                    </Text>
                  ) : null}
                  <Text style={styles.section}>Where</Text>
                  <Text style={styles.where}>{describeProblemPlace(open.place)}</Text>
                  <HorizontalScroll showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                    {places.map((title) => (
                      <TouchableOpacity
                        key={title}
                        style={[styles.pill, open.place.tab === title ? styles.pillActive : null]}
                        onPress={() => choosePlace(title)}
                        hitSlop={6}
                      >
                        <Text style={[styles.pillText, open.place.tab === title ? styles.pillTextActive : null]}>{title}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={[styles.pill, open.place.tab === null ? styles.pillActive : null]}
                      onPress={() => choosePlace(null)}
                      hitSlop={6}
                    >
                      <Text style={[styles.pillText, open.place.tab === null ? styles.pillTextActive : null]}>{NOT_ONE_PLACE}</Text>
                    </TouchableOpacity>
                  </HorizontalScroll>
                  <Text style={styles.section}>What kind</Text>
                  <HorizontalScroll showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                    {PROBLEM_REPORT_KINDS.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[styles.pill, kind === option ? styles.pillActive : null]}
                        onPress={() => setKind(option)}
                        hitSlop={6}
                      >
                        <Text style={[styles.pillText, kind === option ? styles.pillTextActive : null]}>
                          {PROBLEM_REPORT_LABELS[option]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </HorizontalScroll>
                  <Text style={styles.caption}>{PROBLEM_REPORT_CAPTIONS[kind]}</Text>
                  <NotesInput
                    style={styles.input}
                    value={body}
                    onChangeText={(text) => {
                      setBody(text);
                      setProblem(null);
                    }}
                    multiline
                    placeholder="Type it, or tap the mic and say it"
                    placeholderTextColor={colors.textMuted}
                  />
                  {problem ? <Text style={styles.error}>{problem}</Text> : null}
                  <Text style={styles.caption}>
                    {t('It goes to {address} from your email app, with the version and the kind of phone added. Nothing is sent until you press Send there.', {
                      address: PROBLEM_REPORT_ADDRESS,
                    })}
                  </Text>
                  <ThumbRow primary="last" style={styles.buttonRow}>
                    <TouchableOpacity style={styles.cancelButton} onPress={close} hitSlop={8}>
                      <Text style={styles.cancelButtonText}>{open.crash ? 'Leave It' : 'Cancel'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.okButton} onPress={() => void send()} disabled={sending} hitSlop={8}>
                      <Text style={styles.okButtonText}>{sending ? 'Opening' : 'Write the Email'}</Text>
                    </TouchableOpacity>
                  </ThumbRow>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </PlainTextZone>
  );
}

const styles = StyleSheet.create({
  // The spot Tell Claude's button has in the developer version, which never
  // draws in this one: the left edge at about mid-height, where nothing else
  // in the app draws. It moves to the right edge for right-handed
  // navigation (lib/navigationHand.ts).
  button: {
    position: 'absolute',
    left: 0,
    top: '45%',
    paddingVertical: 10,
    paddingLeft: 6,
    paddingRight: 8,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: colors.border,
  },
  buttonRightEdge: {
    left: undefined,
    right: 0,
    paddingLeft: 8,
    paddingRight: 6,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderLeftWidth: 1,
    borderRightWidth: 0,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.menuSurface,
    borderRadius: 14,
    padding: 20,
    width: '100%',
    maxWidth: 460,
    maxHeight: '85%',
  },
  title: { ...typography.bodyEmphasis, color: colors.textPrimary, fontSize: 18, ...textShadow },
  crash: { ...typography.body, color: colors.textSecondary, marginTop: 8, ...textShadow },
  section: { ...typography.bodyEmphasis, color: colors.textPrimary, marginTop: 14, ...textShadow },
  where: { ...typography.caption, color: colors.textMuted, marginTop: 2, marginBottom: 8, ...textShadow },
  message: { ...typography.body, color: colors.textSecondary, marginTop: 6, ...textShadow },
  pillRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  pill: { ...PILL },
  pillActive: { ...PILL_ON },
  pillText: { ...PILL_TEXT },
  // Dark text: cancel the shadow the base style carries. See
  // constants/typography.ts.
  pillTextActive: { ...PILL_ON_TEXT },
  caption: { ...typography.caption, color: colors.textMuted, marginTop: 10, marginBottom: 8, ...textShadow },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 96,
    textAlignVertical: 'top',
    ...textShadow,
  },
  error: { ...typography.caption, color: colors.danger, marginTop: 6, ...textShadow },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 14, justifyContent: 'flex-start' },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelButtonText: { ...typography.bodyEmphasis, color: colors.textSecondary, ...textShadow },
  okButton: { ...BUTTON_PRIMARY },
  okButtonText: { ...BUTTON_PRIMARY_TEXT },
});
