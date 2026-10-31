// Approve a Tester (tester plan T12, 2026-10-31). Opened by a request link,
// https://lifestead.ghostead.com/approve#r=CODE, through the landing page's
// button to lifesteaddev://approve?r=CODE, or from Developer Tools. Only
// the developer version approves; any other version says so.
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApproveTesterPanel } from '../components/ApproveTesterPanel';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandStyle } from '../components/HomeSectionBand';
import { colors } from '../constants/colors';
import { useFloatingButtonScrollPadding } from '../constants/floatingButton';
import { textShadow, typography } from '../constants/typography';
import { isDeveloperBuild } from '../lib/appVariant';

export default function ApproveScreen() {
  const params = useLocalSearchParams<{ r?: string; '#'?: string }>();
  const scrollPadding = useFloatingButtonScrollPadding();
  const initial = params.r ? `?r=${params.r}` : params['#'] ? `#${params['#']}` : '';
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]} keyboardShouldPersistTaps="handled">
      {isDeveloperBuild() ? (
        <ApproveTesterPanel initial={initial} />
      ) : (
        <View style={styles.band}>
          <Text style={styles.body}>This link is for approving testers, which only the developer version of Lifestead does.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: HOME_BAND_GAP, paddingTop: HOME_BAND_GAP },
  band: { ...homeBandStyle, borderColor: colors.tabProfile, padding: HOME_BAND_CONTENT_PADDING },
  body: { ...typography.body, color: colors.textPrimary, ...textShadow },
});
