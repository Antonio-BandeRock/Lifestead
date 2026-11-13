// The short menu an edge tab opens (components/EdgeTab.tsx), shared by the
// quick-access tab (components/QuickAccessButton.tsx) and the flash cards and
// reading tab (components/StudyButton.tsx). It sits right above its tab on
// the thumb side: each choice in a dark pressed-in well, the wells on the
// lighter menu panel, so the list stands out from whatever screen is behind
// it. A menu with more than one group puts each group's name on the panel
// above its wells.
//
// While it is open, every other hub button, every other edge tab and the
// header's Updates button carry a stand-in over the backdrop
// (lib/hubHandoff.ts), so a change of mind goes straight there and this menu
// goes away.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { type HubKey } from '../lib/hubHandoff';
import { HubStandIns } from './HubHandoff';

export const EDGE_MENU_WIDTH = 250;

export type EdgeMenuChoice = {
  key: string;
  label: string;
  /** An Ionicons name, or a drawn icon of its own. */
  icon: ComponentProps<typeof Ionicons>['name'] | ((color: string) => ReactNode);
  run: () => void;
};

export type EdgeMenuGroup = { heading?: string; choices: EdgeMenuChoice[] };

export function EdgeTabMenu({
  hubKey,
  side,
  bottom,
  maxHeight,
  groups,
  onClose,
}: {
  hubKey: HubKey;
  side: 'left' | 'right';
  bottom: number;
  maxHeight: number;
  groups: EdgeMenuGroup[];
  onClose: () => void;
}) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);

  function pick(run: () => void) {
    onClose();
    run();
  }

  const menuSide = side === 'right' ? { right: 8 } : { left: 8 };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
      <HubStandIns selfKey={hubKey} close={onClose} />
      <View style={[styles.panel, menuSide, { bottom, maxHeight }]}>
        <ScrollView contentContainerStyle={styles.list} bounces={false}>
          {groups.map((group, index) => (
            <View key={group.heading ?? index} style={styles.list}>
              {group.heading ? (
                <Text style={[styles.heading, index > 0 ? styles.headingAfter : null]} accessibilityRole="header">
                  {group.heading}
                </Text>
              ) : null}
              {group.choices.map((choice) => (
                <Pressable
                  key={choice.key}
                  onPress={() => pick(choice.run)}
                  accessibilityRole="button"
                  accessibilityLabel={choice.label}
                  style={({ pressed }) => [styles.well, pressed ? styles.wellPressed : null]}
                >
                  {typeof choice.icon === 'function' ? (
                    choice.icon(colors.textPrimary)
                  ) : (
                    <Ionicons name={choice.icon} size={20} color={colors.textPrimary} style={textShadow} />
                  )}
                  <Text style={styles.label}>{choice.label}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The panel behind every choice: the lighter menu grey with a firm border and a
  // drop shadow, so the list lifts off the screen behind it.
  panel: {
    position: 'absolute',
    width: EDGE_MENU_WIDTH,
    backgroundColor: colors.menuSurface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  // 8 to 4 and wells 12 to 6 padding in 1.0.66.7, direct instruction: half
  // the space between, each choice about a quarter shorter (48 to 36 dp).
  list: { gap: 4 },
  // A group's name sits on the panel itself, which is its surface.
  heading: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: 6, paddingTop: 2, ...textShadow },
  headingAfter: { paddingTop: 8 },
  // Each choice in a pressed-in well: darker than the panel, its top edge
  // shaded and its bottom edge catching light, the way a recess reads.
  well: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.6)',
    borderLeftColor: 'rgba(0,0,0,0.45)',
    borderRightColor: 'rgba(255,255,255,0.08)',
    borderBottomColor: 'rgba(255,255,255,0.18)',
  },
  wellPressed: { backgroundColor: 'rgba(0,0,0,0.55)' },
  label: { ...typography.bodyEmphasis, fontWeight: '400', color: colors.textPrimary, flexShrink: 1, ...textShadow },
});
