// The line a list on Interests shows while it is narrowed to one interest
// (2026-11-15), opened from that interest on My Interests. It says which
// interest, and one tap shows every interest again.
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { t } from '../lib/i18n';

export function OnlyInterestLine({ name, onShowEvery }: { name: string; onShowEvery: () => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.caption}>{t('Only {name} is shown.', { name })}</Text>
      <TouchableOpacity onPress={onShowEvery} accessibilityRole="button">
        <Text style={styles.link}>Show Every Interest</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  caption: { ...typography.caption, color: colors.textPrimary, ...textShadow },
  link: { ...typography.body, color: colors.primary, ...textShadow },
});
