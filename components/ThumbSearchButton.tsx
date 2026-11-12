// Search near the thumb, 1.0.61.15 (2026-10-05). Direct request: "Search boxes
// at the top of a lens are the hardest thing to reach one-handed." An edge tab
// on the thumb side, stacked above the quick-access tab
// (components/QuickAccessButton.tsx) and the Voice Control tab above it
// (components/VoiceControlButton.tsx, since 1.0.75.15), the same shape, shown only while the
// screen on view has a lens search box (lib/thumbSearch.ts). A tap moves that
// box's search into the app keyboard's search row, just above the keys, so
// the words go in at the bottom of the screen and the list narrows above.
//
// Not on the desktop app, where a search box is a mouse click away and the
// typing comes from a real keyboard.
import { Ionicons } from '@expo/vector-icons';
import { useSyncExternalStore } from 'react';
import { colors } from '../constants/colors';
import { useFooterBandHeight } from '../constants/floatingButton';
import { isDesktopApp } from '../lib/desktop/bridge';
import { useVisualPreferences } from '../hooks/useVisualPreferences';
import { useNavigationHand } from '../lib/navigationHand';
import { hasThumbSearch, openThumbSearch, subscribeThumbSearch } from '../lib/thumbSearch';
import { EDGE_TAB_HEIGHT, EdgeTab } from './EdgeTab';
import { VOICE_CONTROL_ABOVE_FOOTER } from './VoiceControlButton';

// Voice Control sits VOICE_CONTROL_ABOVE_FOOTER up and is EDGE_TAB_HEIGHT tall,
// and the flash cards and reading tab sits 8 above that while it is shown
// (components/LanguageBasicsButton.tsx, 2026-11-12); this one sits 8 above
// whichever is topmost, so it never moves the tabs under it.
const ABOVE_VOICE = VOICE_CONTROL_ABOVE_FOOTER + EDGE_TAB_HEIGHT + 8;
const ABOVE_STUDY = ABOVE_VOICE + EDGE_TAB_HEIGHT + 8;

export function ThumbSearchButton() {
  const hand = useNavigationHand();
  const footerHeight = useFooterBandHeight();
  const prefs = useVisualPreferences();
  const available = useSyncExternalStore(subscribeThumbSearch, hasThumbSearch, hasThumbSearch);
  if (!available || isDesktopApp()) return null;
  const aboveFooter = prefs.studyButton !== false ? ABOVE_STUDY : ABOVE_VOICE;

  return (
    <EdgeTab
      side={hand}
      bottom={footerHeight + aboveFooter}
      onPress={() => {
        openThumbSearch();
      }}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      accessibilityRole="button"
      accessibilityLabel="Search near my thumb"
      accessibilityHint="Puts this screen's search box just above the keys"
    >
      <Ionicons name="search-outline" size={18} color={colors.textPrimary} />
    </EdgeTab>
  );
}
