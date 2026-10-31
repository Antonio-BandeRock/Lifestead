// The welcome for people testing the app (tester plan T5, 2026-10-31).
//
// Not a one-time card. Direct decision, 2026-10-30: it stays on Home and
// also sits in Getting Set Up, so what testing asks of somebody, and how to
// say what they found, is never more than one look away. It is drawn only in
// the tester version; every other version has no such card, no switch for
// it and no place for it in Profile's lists (lib/visualPreferences.ts).
//
// T6 added the two ways a tester learns about updates: What Changed reads
// the last few release notes again, and a line appears when a new installer
// is needed, since an update over the air cannot bring native changes.
//
// T12 added how long this device's access lasts, and Ask to Renew once
// the end is two weeks away or less (lib/testerAccess.ts).
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { formatReleaseNotesMessage, getRecentReleaseNotes } from '../constants/releaseNotes';
import { textShadow, typography } from '../constants/typography';
import { APP_VERSION } from '../constants/version';
import { isTesterBuild } from '../lib/appVariant';
import { t } from '../lib/i18n';
import { explainNotYet } from '../lib/notYet';
import { PROBLEM_REPORT_ADDRESS } from '../lib/problemReport';
import { openReportProblem } from '../lib/reportProblem';
import { askForAccess, useTesterAccess } from '../lib/testerAccess';
import { endDay } from '../lib/testerApproval';
import type { InstallerWaiting } from '../lib/testerInstaller';
import { checkTesterInstaller } from '../lib/testerInstallerCheck';
import { useInfoAlert } from './InfoAlert';
import { useWalkMark } from './WalkMark';

export const TESTER_WELCOME_TITLE = 'Thank You for Testing Lifestead';

/** How many versions What Changed reads back. */
const NOTES_SHOWN = 4;

type Props = {
  /** Getting Set Up shows the heading inside the card; Home has it on the band. */
  showHeading?: boolean;
};

export function TesterWelcome({ showHeading = false }: Props) {
  const walkMark = useWalkMark();
  const [showInfoAlert, infoAlertElement] = useInfoAlert();
  const [installer, setInstaller] = useState<InstallerWaiting | null>(null);
  const tester = isTesterBuild();
  const access = useTesterAccess();
  const [renewSent, setRenewSent] = useState<string | null>(null);

  useEffect(() => {
    if (!tester) return;
    let live = true;
    void checkTesterInstaller().then((found) => {
      if (live) setInstaller(found);
    });
    return () => {
      live = false;
    };
  }, [tester]);

  if (!tester) return null;

  const showWhatChanged = () => {
    const notes = getRecentReleaseNotes(APP_VERSION, NOTES_SHOWN);
    showInfoAlert(
      t('What Changed'),
      notes.length === 0
        ? t('There are no notes for this version yet.')
        : formatReleaseNotesMessage(notes, t),
    );
  };

  const openInstaller = () => {
    if (!installer) return;
    void Linking.openURL(installer.downloadUrl).catch(() => {
      showInfoAlert(t('Could Not Open the Link'), t('Write to {address} and we will send the new installer.', { address: PROBLEM_REPORT_ADDRESS }));
    });
  };

  const okState = access.state.kind === 'ok' ? access.state : null;
  const askToRenew = async () => {
    const name = access.name || okState?.approval.name || '';
    if (!name) {
      explainNotYet(t('Your name is missing from this device, so the request would not say who it is from. Write to {address} instead.', { address: PROBLEM_REPORT_ADDRESS }));
      return;
    }
    const sent = await askForAccess(name, true);
    setRenewSent(
      sent === 'opened'
        ? t('Your email app has the request ready. Send it, and the new link will come back by email.')
        : sent === 'copied'
          ? t('No email app opened, so the request is copied. Paste it into an email to {address}.', { address: PROBLEM_REPORT_ADDRESS })
          : t('The request could not be made. Write to {address} and ask for more time.', { address: PROBLEM_REPORT_ADDRESS }),
    );
  };

  return (
    <View style={styles.body}>
      {showHeading ? <Text style={styles.heading}>{TESTER_WELCOME_TITLE}</Text> : null}
      {okState ? (
        <View style={styles.installer}>
          <Text style={styles.line}>
            {okState.renewSoon
              ? t('This device can open the test version until {day}, {count} days from now. Ask for more time now and nothing stops in between.', { day: endDay(okState.approval), count: okState.daysLeft })
              : t('This device can open the test version until {day}.', { day: endDay(okState.approval) })}
          </Text>
          {okState.renewSoon ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                ref={walkMark.ref('tester.renew')}
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={() => void askToRenew()}
                accessibilityRole="button"
              >
                <Ionicons name="time-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.primaryButtonText}>Ask to Renew</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {renewSent ? <Text style={styles.caption}>{renewSent}</Text> : null}
        </View>
      ) : null}
      {installer ? (
        <View style={styles.installer}>
          <Text style={styles.line}>
            {t('A new installer, version {version}, is ready. Updates cannot bring this one by themselves. Installing it over the one you have keeps everything you have put in.', { version: installer.version })}
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              ref={walkMark.ref('tester.installer')}
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={openInstaller}
              accessibilityRole="button"
            >
              <Ionicons name="download-outline" size={18} color={colors.textPrimary} />
              <Text style={styles.primaryButtonText}>Get the New Installer</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      <Text style={styles.line}>
        This is the test version. It has everything the paid version has, and it keeps your records on this phone the
        way the finished app will.
      </Text>
      <Text style={styles.line}>
        When something goes wrong, or you wish something worked differently, tap the flag at the edge of the screen, or
        press and hold any band. Say what happened by typing or with the mic, and it goes by email to the people
        building the app.
      </Text>
      <Text style={styles.line}>Updates arrive by themselves and never take away what you have put in.</Text>
      <Text style={styles.line}>Please keep this version to yourself. It was made for you and this device.</Text>
      <Text style={styles.caption}>{t('Version {version}. Questions go to {address}.', { version: APP_VERSION, address: PROBLEM_REPORT_ADDRESS })}</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          ref={walkMark.ref('tester.report')}
          style={styles.button}
          activeOpacity={0.8}
          onPress={() => openReportProblem({})}
          accessibilityRole="button"
        >
          <Ionicons name="flag-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.buttonText}>Report a Problem</Text>
        </TouchableOpacity>
        <TouchableOpacity
          ref={walkMark.ref('tester.whatChanged')}
          style={styles.button}
          activeOpacity={0.8}
          onPress={showWhatChanged}
          accessibilityRole="button"
        >
          <Ionicons name="newspaper-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.buttonText}>What Changed</Text>
        </TouchableOpacity>
      </View>
      {infoAlertElement}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  heading: { ...typography.sectionTitle, ...textShadow, color: colors.textPrimary },
  line: { ...typography.body, ...textShadow, color: colors.textPrimary },
  caption: { ...typography.caption, ...textShadow, color: colors.textSecondary },
  installer: { gap: 10 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { ...BUTTON_SECONDARY, flexDirection: 'row', alignItems: 'center', gap: 6 },
  buttonText: { ...BUTTON_SECONDARY_TEXT },
  primaryButton: { ...BUTTON_PRIMARY, flexDirection: 'row', alignItems: 'center', gap: 6 },
  primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
});
