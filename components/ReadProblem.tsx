import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { HOME_BAND_CONTENT_PADDING } from './HomeSectionBand';

// What a list says when its records could not be read (2026-11-15). Before
// this, a failed read on several Food lenses left an empty list, which
// reads as "you have nothing here" and is the one thing a failed read must
// never look like. The sentence names what could not be read, says nothing
// recorded is lost, and Try Again reads it again.
export function ReadProblem({
  message,
  onTryAgain,
  style,
}: {
  // The whole sentence, e.g. 'Your recipes could not be read just now.
  // Nothing you recorded is lost.' Whole so each language can phrase it.
  message: string;
  onTryAgain: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.box, style]}>
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity style={styles.button} onPress={onTryAgain} accessibilityRole="button">
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginHorizontal: HOME_BAND_CONTENT_PADDING,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
    gap: 10,
  },
  text: { ...typography.body, color: colors.textPrimary, ...textShadow },
  button: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  buttonText: { ...BUTTON_SECONDARY_TEXT },
});
