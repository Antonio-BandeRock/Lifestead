// Marks with Colors from the quick-access menu (2026-11-24): what it does, and
// On or Off. The same card as Low Stimulation's. Nothing changes until a
// button is pressed.
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { colors } from '../constants/colors';
import { useHubMenuCardSpan, useMenuCardBottom, useMenuCardFit } from '../constants/floatingButton';
import { textShadow, typography } from '../constants/typography';
import { useVisualPreferences } from '../hooks/useVisualPreferences';
import { COLOR_MARKS_INTRO, COLOR_MARKS_PARTS } from '../lib/colorMarksWords';
import { subscribeQuickAccess } from '../lib/quickAccess';
import { modalAnimationType, setVisualPreferences } from '../lib/visualPreferences';
import { cardHeightFor } from './LensHub';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT } from '../constants/buttons';

export function ColorMarksSheet() {
  const prefs = useVisualPreferences();
  const [open, setOpen] = useState(false);
  useEffect(
    () =>
      subscribeQuickAccess((sheet) => {
        if (sheet === 'colorMarks') setOpen(true);
      }),
    [],
  );

  const { fontScale } = useWindowDimensions();
  const { left, width } = useHubMenuCardSpan();
  const sheetBottom = useMenuCardBottom();
  const fit = useMenuCardFit(cardHeightFor(fontScale), 200);

  const on = prefs.colorMarks;

  function choose() {
    setOpen(false);
    void setVisualPreferences({ colorMarks: !on });
  }

  return (
    <>
      <Modal
        visible={open}
        transparent
        animationType={modalAnimationType('fade')}
        onRequestClose={() => setOpen(false)}
      >
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessible={false} />
          <View style={[styles.sheet, { left, width, bottom: sheetBottom, height: fit.height }]}>
            <Text style={styles.title}>{on ? 'Marks with Colors is on' : 'Marks with Colors'}</Text>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              <Text style={styles.body}>{COLOR_MARKS_INTRO}</Text>
              {COLOR_MARKS_PARTS.map((part) => (
                <View key={part.title} style={styles.part}>
                  <Text style={styles.partTitle}>{part.title}</Text>
                  <Text style={styles.body}>{part.text}</Text>
                </View>
              ))}
              {on ? (
                <Text style={styles.body}>
                  Turning it off leaves the colors on their own again.
                </Text>
              ) : null}
            </ScrollView>
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.quietButton} activeOpacity={0.85} onPress={() => setOpen(false)}>
                <Text style={styles.quietButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} activeOpacity={0.85} onPress={choose}>
                <Text style={styles.buttonText}>{on ? 'Turn Off' : 'Turn On'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    backgroundColor: colors.menuSurface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  title: { ...typography.bodyEmphasis, fontSize: 16, fontWeight: '400', color: colors.textPrimary, marginBottom: 8, ...textShadow },
  scroll: { flex: 1 },
  scrollContent: { gap: 10, paddingBottom: 4 },
  part: { gap: 2 },
  partTitle: { ...typography.bodyEmphasis, fontWeight: '400', color: colors.textPrimary, ...textShadow },
  body: { ...typography.body, color: colors.textSecondary, ...textShadow },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  button: { ...BUTTON_PRIMARY, flex: 1 },
  buttonText: { ...BUTTON_PRIMARY_TEXT },
  quietButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  quietButtonText: { ...typography.bodyEmphasis, color: colors.textSecondary, ...textShadow },
});
