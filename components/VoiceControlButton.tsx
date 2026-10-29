// Voice Control on an edge tab of its own, 1.0.75.15 (2026-10-28). Direct
// request: "Let's move voice control out of the quick access and make it its
// own quick access just above the quick access we have right now."
//
// The same EdgeTab shape as the quick-access tab (components/
// QuickAccessButton.tsx), on the thumb side, stacked 8 above it. A tap opens
// the Voice Control sheet that stays mounted at the root
// (components/VoiceCommandSheet.tsx), the same way the menu choice did.
// Search near the thumb (components/ThumbSearchButton.tsx) sits one slot
// above this one.
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { useFooterBandHeight } from '../constants/floatingButton';
import { useNavigationHand } from '../lib/navigationHand';
import { openQuickAccessSheet } from '../lib/quickAccess';
import { EDGE_TAB_HEIGHT, EdgeTab } from './EdgeTab';

// The quick-access tab sits 8 above the footer and is EDGE_TAB_HEIGHT tall;
// this one sits 8 above that.
export const VOICE_CONTROL_ABOVE_FOOTER = 8 + EDGE_TAB_HEIGHT + 8;

export function VoiceControlButton() {
  const hand = useNavigationHand();
  const footerHeight = useFooterBandHeight();

  return (
    <EdgeTab
      side={hand}
      bottom={footerHeight + VOICE_CONTROL_ABOVE_FOOTER}
      onPress={() => openQuickAccessSheet('voiceCommand')}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      accessibilityRole="button"
      accessibilityLabel="Voice Control"
      accessibilityHint="Opens Voice Control, to work the screen in front of you by voice"
    >
      <Ionicons name="megaphone-outline" size={18} color={colors.textPrimary} />
    </EdgeTab>
  );
}
