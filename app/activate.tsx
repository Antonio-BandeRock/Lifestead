// Opening Lifestead Test with an approval (tester plan T12, 2026-10-31).
// Reached from the activation link, https://lifestead.ghostead.com/activate#a=TOKEN,
// through the landing page's button to lifesteadtest://activate?a=TOKEN.
// The approval is checked and kept here; the gate over the app lifts by
// itself once it is good (components/TesterGate.tsx).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandStyle } from '../components/HomeSectionBand';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { useFloatingButtonScrollPadding } from '../constants/floatingButton';
import { textShadow, typography } from '../constants/typography';
import { isTesterBuild } from '../lib/appVariant';
import { activateFromText, activateResultText } from '../lib/testerAccess';

export default function ActivateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ a?: string; '#'?: string }>();
  const scrollPadding = useFloatingButtonScrollPadding();
  const input = params.a ? `?a=${params.a}` : params['#'] ? `#${params['#']}` : '';
  const [answer, setAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (!isTesterBuild()) return;
    let live = true;
    void activateFromText(input).then((result) => {
      if (live) setAnswer(activateResultText(result));
    });
    return () => {
      live = false;
    };
  }, [input]);

  const text = !isTesterBuild()
    ? 'This link is for Lifestead Test, the version for testers. Open it on the phone or computer that has Lifestead Test.'
    : answer ?? 'Checking the approval.';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]}>
      <View style={styles.band}>
        <Text style={styles.body}>{text}</Text>
        <TouchableOpacity style={styles.primary} onPress={() => router.replace('/')} accessibilityRole="button">
          <Text style={styles.primaryText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: HOME_BAND_GAP, paddingTop: HOME_BAND_GAP },
  band: { ...homeBandStyle, borderColor: colors.tabProfile, padding: HOME_BAND_CONTENT_PADDING, gap: 10 },
  body: { ...typography.body, color: colors.textPrimary, ...textShadow },
  primary: { ...BUTTON_PRIMARY },
  primaryText: { ...BUTTON_PRIMARY_TEXT },
});
