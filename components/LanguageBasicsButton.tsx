// Language Basics on an edge tab of its own (2026-11-11). Asked after the
// Language Basics card sat hidden on a Home kept to Simple View: "Can we add it
// as its own quick access button on the left (or right side) like the current
// quick access buttons, and then let the user know that is where they will find
// it, and use the same icon as language to represent it."
//
// Drawn only while languageButton is on (lib/visualPreferences.ts), chosen in
// Profile > Simple View or in the one question app/language-basics.tsx asks
// (askWhereLanguageBasicsGoes below). It sits on the far side from the hand,
// one slot above the navigation switch (components/HandSwitchButton.tsx), so it
// never stacks into Voice Control or Search near the thumb. A tap opens the same
// list the Home card shows (LanguageBasicsList), in the place and at the size
// of a LensHub menu.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { BUTTON_SECONDARY, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { useFooterBandHeight, useHubMenuCardSpan, useMenuCardBottom, useMenuCardFit } from '../constants/floatingButton';
import { textShadow, typography } from '../constants/typography';
import { useVisualPreferences } from '../hooks/useVisualPreferences';
import { t } from '../lib/i18n';
import { useLanguage } from '../lib/language';
import { farSide, getNavigationHand, useNavigationHand } from '../lib/navigationHand';
import { getVisualPreferences, isShownOnHome, modalAnimationType, setVisualPreferences } from '../lib/visualPreferences';
import { EDGE_TAB_HEIGHT, EdgeTab } from './EdgeTab';
import { LanguageBasicsList, loadLanguageSetsOnHome, type LanguageSetOnHome } from './LanguageBasicsHomeCard';
import { cardHeightFor } from './LensHub';

// The navigation switch sits 8 above the footer and is EDGE_TAB_HEIGHT tall; this sits 8 above that.
const ABOVE_FOOTER = 8 + EDGE_TAB_HEIGHT + 8;

function whereItIs(side: 'left' | 'right'): string {
  return side === 'left'
    ? t('Language Basics is the button with the language icon at the left edge, just above the navigation switch.')
    : t('Language Basics is the button with the language icon at the right edge, just above the navigation switch.');
}

/**
 * Asked once, when a unit goes to Home or a group is studied while Simple View
 * hides the Language Basics card: a button at the edge, or the card kept in
 * Simple View. Nothing is asked when either is already chosen.
 */
export async function askWhereLanguageBasicsGoes(): Promise<void> {
  const prefs = await getVisualPreferences();
  if (!prefs.simpleView || prefs.languageSimpleViewAsked || prefs.languageButton) return;
  if (isShownOnHome(prefs, 'languageBasics')) return;
  const side = farSide(getNavigationHand());
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
          void setVisualPreferences({ languageSimpleViewAsked: true, languageButton: true }).then(() =>
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
  const [open, setOpen] = useState(false);
  const [sets, setSets] = useState<LanguageSetOnHome[] | null>(null);

  const { fontScale } = useWindowDimensions();
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

  if (!prefs.languageButton) return null;

  return (
    <>
      <EdgeTab
        side={farSide(hand)}
        bottom={footerHeight + ABOVE_FOOTER}
        onPress={() => setOpen(true)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel="Language Basics"
        accessibilityHint="Opens the language units you put on Home and the groups you studied together"
      >
        <Ionicons name="language-outline" size={18} color={colors.textPrimary} />
      </EdgeTab>
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
