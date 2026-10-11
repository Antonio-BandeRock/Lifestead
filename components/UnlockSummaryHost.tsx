// The card that says what commands said over the lock screen did, shown at
// the unlock that writes them in (voice step 3, 1.0.66.21). Each line has an
// Undo, which takes the reminder or counter back and keeps the words as a
// note in Capture, so a wrong reading loses nothing. Mounted once at the app
// root (app/_layout.tsx), beside NotYetHost. Only commands are listed: a
// plain note goes into Capture the way it always has.
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { dismissUnlockDone, subscribeUnlockDone, undoUnlockDone, type UnlockDone } from '../lib/lockedCaptures';
import { useNavigationHand } from '../lib/navigationHand';
import { modalAnimationType } from '../lib/visualPreferences';

export function UnlockSummaryHost() {
  const navigationHand = useNavigationHand();
  const [items, setItems] = useState<UnlockDone[]>([]);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [undone, setUndone] = useState<string[]>([]);

  useEffect(() => subscribeUnlockDone(setItems), []);

  async function undo(item: UnlockDone) {
    if (undoing) return;
    setUndoing(item.id);
    try {
      const line = item.line;
      await undoUnlockDone(item);
      setUndone((before) => [...before, line]);
    } finally {
      setUndoing(null);
    }
  }

  function close() {
    setUndone([]);
    dismissUnlockDone();
  }

  const visible = items.length > 0 || undone.length > 0;

  return (
    <Modal visible={visible} transparent animationType={modalAnimationType('fade')} onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.card}>
          <Text style={styles.title}>Done while the phone was locked</Text>
          <ScrollView style={styles.list}>
            {items.map((item) => (
              <View key={item.id} style={styles.row}>
                <Text style={styles.line}>{item.line}</Text>
                <Pressable
                  style={styles.undoButton}
                  onPress={() => void undo(item)}
                  disabled={undoing === item.id}
                  hitSlop={6}
                  accessibilityLabel={`Undo ${item.line}`}
                >
                  <Text style={styles.undoText}>{undoing === item.id ? 'Undoing…' : 'Undo'}</Text>
                </Pressable>
              </View>
            ))}
            {undone.map((line) => (
              <Text key={line} style={styles.undoneLine}>
                Undone, and the words kept as a note in Capture: {line}
              </Text>
            ))}
          </ScrollView>
          <View style={[styles.buttonRow, { justifyContent: navigationHand === 'left' ? 'flex-start' : 'flex-end' }]}>
            <Pressable style={styles.okButton} onPress={close} hitSlop={8}>
              <Text style={styles.okButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.menuSurface,
    borderRadius: 14,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
  },
  title: {
    ...typography.bodyEmphasis,
    color: colors.textPrimary,
    fontSize: 18,
    marginBottom: 10,
    ...textShadow,
  },
  list: { marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  line: { ...typography.body, color: colors.textPrimary, flex: 1, ...textShadow },
  undoneLine: { ...typography.caption, color: colors.textMuted, paddingVertical: 6, ...textShadow },
  undoButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.menuSurface,
  },
  undoText: { ...typography.bodyEmphasis, color: colors.primary, ...textShadow },
  buttonRow: { flexDirection: 'row' },
  okButton: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.primary },
  okButtonText: {
    ...typography.bodyEmphasis,
    color: colors.textOnPrimary,
    // Dark text: cancel any shadow inherited from a base style it is
    // composed with. See constants/typography.ts.
    textShadowColor: 'transparent',
    textShadowRadius: 0,
  },
});
