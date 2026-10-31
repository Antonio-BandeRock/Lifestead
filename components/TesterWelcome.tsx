// The welcome for people testing the app (tester plan T5, 2026-10-31).
//
// Not a one-time card. Direct decision, 2026-10-30: it stays on Home and
// also sits in Getting Set Up, so what testing asks of somebody, and how to
// say what they found, is never more than one look away. It is drawn only in
// the tester version; every other version has no such card, no switch for
// it and no place for it in Profile's lists (lib/visualPreferences.ts).
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_SECONDARY, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { APP_VERSION } from '../constants/version';
import { isTesterBuild } from '../lib/appVariant';
import { t } from '../lib/i18n';
import { PROBLEM_REPORT_ADDRESS } from '../lib/problemReport';
import { openReportProblem } from '../lib/reportProblem';
import { useWalkMark } from './WalkMark';

export const TESTER_WELCOME_TITLE = 'Thank You for Testing Lifestead';

type Props = {
  /** Getting Set Up shows the heading inside the card; Home has it on the band. */
  showHeading?: boolean;
};

export function TesterWelcome({ showHeading = false }: Props) {
  const walkMark = useWalkMark();
  if (!isTesterBuild()) return null;
  return (
    <View style={styles.body}>
      {showHeading ? <Text style={styles.heading}>{TESTER_WELCOME_TITLE}</Text> : null}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  heading: { ...typography.sectionTitle, ...textShadow, color: colors.textPrimary },
  line: { ...typography.body, ...textShadow, color: colors.textPrimary },
  caption: { ...typography.caption, ...textShadow, color: colors.textSecondary },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { ...BUTTON_SECONDARY, flexDirection: 'row', alignItems: 'center', gap: 6 },
  buttonText: { ...BUTTON_SECONDARY_TEXT },
});
