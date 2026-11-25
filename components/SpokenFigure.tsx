// The one wrapper a drawn chart goes in, so a screen reader reads it as a
// single picture with its figures in words (lib/chartWords.ts, 2026-11-24).
// Spoken only, never printed. node scripts/audit_screen_reader.js fails on a
// chart drawn outside it.
import type { ReactNode } from 'react';
import { View, type AccessibilityActionEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useLanguage } from '../lib/language';

export function SpokenFigure({
  words,
  style,
  actions,
  onAction,
  children,
}: {
  /** Already in the app's language. A function, so it is worked out again when the language changes. */
  words: () => string;
  style?: StyleProp<ViewStyle>;
  /** Things a tap on the drawing does, offered by name, since a screen reader cannot find a dot. */
  actions?: readonly { name: string; label: string }[];
  onAction?: (name: string) => void;
  children: ReactNode;
}) {
  useLanguage();
  return (
    <View
      style={style}
      accessible
      accessibilityRole="image"
      accessibilityLabel={words()}
      accessibilityActions={actions}
      onAccessibilityAction={onAction ? (event: AccessibilityActionEvent) => onAction(event.nativeEvent.actionName) : undefined}
    >
      {children}
    </View>
  );
}
