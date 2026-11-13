// Language Basics on an edge tab of its own (2026-11-11). Asked after the
// Language Basics card sat hidden on a Home kept to Simple View: "Can we add it
// as its own quick access button on the left (or right side) like the current
// quick access buttons, and then let the user know that is where they will find
// it, and use the same icon as language to represent it."
//
// Drawn only while languageButton is on (lib/visualPreferences.ts), chosen in
// Profile > Simple View or in the one question app/language-basics.tsx asks
// (askWhereLanguageBasicsGoes below). It sits on the thumb side, one slot above
// Voice Control (components/VoiceControlButton.tsx), with Search moved up one
// slot above it (components/ThumbSearchButton.tsx). 2026-11-12, direct
// correction: with left-hand navigation it had been drawn on the right, the far
// side, "and it is supposed to be on the left", with the other quick buttons. A tap opens the same
// list the Home card shows (LanguageBasicsList), in the place and at the size
// of a LensHub menu.
//
// 2026-11-12, widened to every flash card and all the reading. Direct request:
// "a new quick select button on the left side of the screen to include the
// different flash cards for language and others. Maybe this is a good place
// also for a quick shortcut to all of the Reading material as well? It should
// have the icon for it be a flipping card. A single card paired with a curved
// two-way arrow effectively communicating the front-and-back active recall
// process." So the tab wore FlipCardIcon until 2026-11-13, when Tony moved
// the flip card to Flashcards (the lens that was Learn) and gave this tab
// Learn's old graduation cap. It is drawn unless switched off
// (studyButton, on by default). A tap opens the edge-tab menu
// (components/EdgeTabMenu.tsx) in two groups: Flash Cards (Language Basics,
// which still opens the list below, Languages and Flashcards) and Reading (every
// reading lens, and the Library cards on Home).
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlipCardIcon } from './FlipCardIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { BUTTON_SECONDARY, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { useFooterBandHeight, useHubMenuCardSpan, useMenuCardBottom, useMenuCardFit } from '../constants/floatingButton';
import { textShadow, typography } from '../constants/typography';
import { useVisualPreferences } from '../hooks/useVisualPreferences';
import { t } from '../lib/i18n';
import { useLanguage } from '../lib/language';
import { getNavigationHand, useNavigationHand } from '../lib/navigationHand';
import { getVisualPreferences, isHomeSectionVisible, isShownOnHome, modalAnimationType, setVisualPreferences } from '../lib/visualPreferences';
import { sortByLabel } from '../lib/choiceOrder';
import { registerHubSpot } from '../lib/hubHandoff';
import { EDGE_TAB_HEIGHT, EDGE_TAB_WIDTH, EdgeTab } from './EdgeTab';
import { VOICE_CONTROL_ABOVE_FOOTER } from './VoiceControlButton';
import { EdgeTabMenu, type EdgeMenuChoice } from './EdgeTabMenu';
import { LanguageBasicsList, loadLanguageSetsOnHome, type LanguageSetOnHome } from './LanguageBasicsHomeCard';
import { cardHeightFor } from './LensHub';

// Voice Control sits VOICE_CONTROL_ABOVE_FOOTER up and is EDGE_TAB_HEIGHT tall; this sits 8 above that.
export const STUDY_ABOVE_FOOTER = VOICE_CONTROL_ABOVE_FOOTER + EDGE_TAB_HEIGHT + 8;
const ABOVE_FOOTER = STUDY_ABOVE_FOOTER;

function whereItIs(side: 'left' | 'right'): string {
  return side === 'left'
    ? t('Language Basics is in the menu of the button with the graduation cap icon at the left edge, just above Voice Control.')
    : t('Language Basics is in the menu of the button with the graduation cap icon at the right edge, just above Voice Control.');
}


/**
 * Asked once, when a unit goes to Home or a group is studied while Simple View
 * hides the Language Basics card: a button at the edge, or the card kept in
 * Simple View. Nothing is asked when either is already chosen.
 */
export async function askWhereLanguageBasicsGoes(): Promise<void> {
  const prefs = await getVisualPreferences();
  if (!prefs.simpleView || prefs.languageSimpleViewAsked || prefs.studyButton !== false) return;
  if (isShownOnHome(prefs, 'languageBasics')) return;
  const side = getNavigationHand();
  Alert.alert(
    t('Simple View hides Language Basics on Home'),
    t('Your units and the groups you study together can open from a button at the edge of the screen, or Simple View can keep the Language Basics card on Home. Either can be changed in Profile, under Simple View.'),
    [
      {
        text: t('Not Now'),
        style: 'cancel',
        onPress: () => void setVisualPreferences({ languageSimpleViewAsked: true }),
      },
      {
        text: t('Keep the Card'),
        onPress: () => {
          const extras = prefs.simpleViewExtras ?? [];
          void setVisualPreferences({
            languageSimpleViewAsked: true,
            simpleViewExtras: extras.includes('languageBasics') ? extras : [...extras, 'languageBasics'],
          });
        },
      },
      {
        text: t('A Button at the Edge'),
        onPress: () => {
          void setVisualPreferences({ languageSimpleViewAsked: true, studyButton: true }).then(() =>
            Alert.alert(t('Language Basics'), whereItIs(side)),
          );
        },
      },
    ],
  );
}

export function LanguageBasicsButton() {
  const prefs = useVisualPreferences();
  const hand = useNavigationHand();
  const footerHeight = useFooterBandHeight();
  const language = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [sets, setSets] = useState<LanguageSetOnHome[] | null>(null);

  const { fontScale, width: windowWidth, height: windowHeight } = useWindowDimensions();
  const side = hand;
  const bottom = footerHeight + ABOVE_FOOTER;
  const menuBottom = bottom + EDGE_TAB_HEIGHT + 6;
  const menuMaxHeight = Math.max(160, windowHeight - menuBottom - insets.top - 16);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const shown = prefs.studyButton !== false;

  // A change of mind goes straight to another hub's menu (lib/hubHandoff.ts),
  // the way the quick-access tab does it.
  const tabLeft = side === 'right' ? windowWidth - EDGE_TAB_WIDTH : 0;
  useEffect(() => {
    if (!shown) return undefined;
    return registerHubSpot({ key: 'study', left: tabLeft, bottom, width: EDGE_TAB_WIDTH, height: EDGE_TAB_HEIGHT, open: () => setMenuOpen(true) });
  }, [shown, tabLeft, bottom]);
  const { left, width } = useHubMenuCardSpan();
  const sheetBottom = useMenuCardBottom();
  const fit = useMenuCardFit(cardHeightFor(fontScale), 200);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setSets(null);
    void loadLanguageSetsOnHome(language)
      .then((on) => {
        if (live) setSets(on);
      })
      .catch(() => {
        if (live) setSets([]);
      });
    return () => {
      live = false;
    };
  }, [open, language]);

  if (!shown) return null;

  const lens = (pathname: string, param: string, key: string) => () => router.push({ pathname, params: { [param]: key } } as never);
  // Each group alphabetical, top to bottom as drawn; icons are the lenses' own.
  const flashCards: EdgeMenuChoice[] = sortByLabel([
    { key: 'basics', label: 'Language Basics', icon: 'chatbubbles-outline', run: () => setOpen(true) },
    { key: 'languages', label: 'Languages', icon: 'language-outline', run: lens('/interests', 'openInterestsLens', 'languages') },
    { key: 'learn', label: 'Flashcards', icon: (color) => <FlipCardIcon color={color} />, run: lens('/interests', 'openInterestsLens', 'learn') },
  ]);
  const reading: EdgeMenuChoice[] = sortByLabel([
    { key: 'conditions', label: 'Conditions', icon: 'pulse-outline', run: lens('/life', 'openLifeLens', 'conditions') },
    { key: 'earthMatters', label: 'Earth Matters', icon: 'earth-outline', run: lens('/life', 'openLifeLens', 'earthMatters') },
    { key: 'healthLiteracy', label: 'Health Literacy', icon: 'reader-outline', run: lens('/life', 'openLifeLens', 'healthLiteracy') },
    { key: 'horticulture', label: 'Horticulture', icon: 'leaf-outline', run: lens('/garden', 'openGardenLens', 'horticulture') },
    { key: 'searchReading', label: 'Search Reading', icon: 'search-outline', run: lens('/life', 'openLifeLens', 'searchReading') },
    // The Library cards only while Home shows them; a hidden section's link would land elsewhere.
    ...(isHomeSectionVisible(prefs, 'digestCards')
      ? [{ key: 'library', label: 'Library', icon: 'library-outline' as const, run: lens('/', 'openHomeSection', 'digestCards') }]
      : []),
  ]);

  return (
    <>
      <EdgeTab
        side={side}
        bottom={bottom}
        onPress={() => setMenuOpen((was) => !was)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel="Flash cards and reading"
        accessibilityHint="Opens Language Basics, Languages, Flashcards and every part of the reading"
        accessibilityState={{ expanded: menuOpen }}
      >
        <Ionicons name="school-outline" size={18} color={colors.textPrimary} />
      </EdgeTab>
      {menuOpen ? (
        <EdgeTabMenu
          hubKey="study"
          side={side}
          bottom={menuBottom}
          maxHeight={menuMaxHeight}
          groups={[
            { heading: 'Flash Cards', choices: flashCards },
            { heading: 'Reading Material', choices: reading },
          ]}
          onClose={closeMenu}
        />
      ) : null}
      <Modal visible={open} transparent animationType={modalAnimationType('fade')} onRequestClose={() => setOpen(false)}>
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessible={false} />
          <View style={[styles.sheet, { left, width, bottom: sheetBottom, height: fit.height }]}>
            <Text style={styles.title}>Language Basics</Text>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {sets === null ? null : <LanguageBasicsList sets={sets} onLeave={() => setOpen(false)} />}
            </ScrollView>
            <TouchableOpacity style={styles.button} activeOpacity={0.85} onPress={() => setOpen(false)} accessibilityRole="button">
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
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
  button: { ...BUTTON_SECONDARY, marginTop: 10 },
  buttonText: BUTTON_SECONDARY_TEXT,
});
