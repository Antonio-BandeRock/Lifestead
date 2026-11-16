// The tester's review on a screen of its own (components/TesterReview.tsx),
// reached from For Testers on Home once a review opens, two weeks before
// its day. On the day itself the same review covers the whole app
// (components/TesterGate.tsx) until it is sent.
import { View, StyleSheet, Text } from 'react-native';
import { TesterReview } from '../components/TesterReview';
import { HOME_BAND_CONTENT_PADDING, homeBandStyle } from '../components/HomeSectionBand';
import { colors } from '../constants/colors';
import { useFloatingButtonScrollPadding } from '../constants/floatingButton';
import { textShadow, typography } from '../constants/typography';
import { useTesterAccess } from '../lib/testerAccess';
import { useTesterChrome } from '../lib/testerGraduation';
import { t } from '../lib/i18n';

export default function TesterReviewScreen() {
  const access = useTesterAccess();
  const shown = useTesterChrome();
  const scrollPadding = useFloatingButtonScrollPadding();
  const state = access.state;
  if (!shown || !access.loaded || state.kind !== 'ok') {
    return (
      <View style={styles.screen}>
        <View style={styles.band}>
          <Text style={styles.body}>{t('There is no tester review on this device.')}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.screen}>
      <TesterReview approvedAt={state.approval.issued} name={access.name || state.approval.name} covered={false} contentStyle={{ paddingBottom: scrollPadding }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  band: { ...homeBandStyle, borderColor: colors.tabProfile, padding: HOME_BAND_CONTENT_PADDING },
  body: { ...typography.body, color: colors.textPrimary, ...textShadow },
});
