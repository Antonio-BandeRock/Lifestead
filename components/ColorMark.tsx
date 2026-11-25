// A colored dot's meaning: always spoken, and printed beside it only with
// Marks with Colors on (2026-11-24).
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { useVisualPreferences } from '../hooks/useVisualPreferences';
import { t } from '../lib/i18n';
import { useLanguage } from '../lib/language';

/** `style` is the dot's. `word` is English. A button that names itself says the word in its label. */
export function DotWithWord({ word, style }: { word: string | null; style: StyleProp<ViewStyle> }) {
  const { colorMarks } = useVisualPreferences();
  useLanguage();
  if (!word) return <View style={style} />;
  if (!colorMarks) return <View style={style} accessibilityLabel={t(word)} />;
  return (
    <View style={styles.row}>
      <View style={style} />
      <Text style={styles.word}>{word}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  word: { ...typography.caption, color: colors.textPrimary, ...textShadow },
});
