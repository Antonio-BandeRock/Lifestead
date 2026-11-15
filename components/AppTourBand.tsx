// The App Tour on Home (direct request, 2026-11-14): "The tour should go
// from tab to tab, and lens to lens within each tab explaining what
// everything is and what it is for ... it needs to be available through the
// home screen as well with each tab's tour listed within it as well as
// listed in each tab's Home band."
//
// The tour is the tutorials themselves, run in order: Start from the
// Beginning goes through every tab and every lens, and each row below starts
// one tab's. Each tab's own cards stay in its band (TabTutorialCards). A
// tick beside a tab whose tutorials have all been gone through, and nothing
// more: no count, no figure, the same rule as the tab cards.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { TAB_ROUTES } from '../constants/tabs';
import { textShadow, typography } from '../constants/typography';
import { t } from '../lib/i18n';
import { loadTutorialState, startTutorials, type TutorialState } from '../lib/tutorialDb';
import { subscribeTutorialRun } from '../lib/tutorialRun';
import { useWalkMark } from './WalkMark';

export const APP_TOUR_BAND_TITLE = 'App Tour';
export const APP_TOUR_LINE =
  'Goes from tab to tab and lens to lens on the screens themselves, saying what each one is and what it is for. Start from the beginning for the whole app, or tap a tab for that one only.';
export const APP_TOUR_START_LABEL = 'Start from the Beginning';

export function AppTourBand() {
  const router = useRouter();
  const walkMark = useWalkMark();
  const [state, setState] = useState<TutorialState | null>(null);

  const reload = useCallback(() => {
    loadTutorialState()
      .then(setState)
      .catch((error) => console.warn('App Tour: could not read the tutorials', error));
  }, []);

  useFocusEffect(reload);
  useEffect(() => subscribeTutorialRun(() => reload()), [reload]);

  const startAll = () => {
    void startTutorials({ kind: 'all' }).then((started) => {
      if (started) router.navigate('/');
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.line}>{APP_TOUR_LINE}</Text>
      <TouchableOpacity
        ref={walkMark.ref('home.tourStart')}
        style={[styles.startButton, walkMark('home.tourStart')]}
        onPress={startAll}
        accessibilityRole="button"
      >
        <Ionicons name="play" size={15} color={colors.textOnButton} />
        <Text style={styles.startText}>{APP_TOUR_START_LABEL}</Text>
      </TouchableOpacity>
      {(state?.tabs ?? []).map((tab, index) => {
        const route = TAB_ROUTES.find((r) => r.path === tab.path);
        const howTos = tab.lenses.flatMap((lens) => lens.howTos);
        if (howTos.length === 0) return null;
        const done = howTos.every((howTo) => state?.doneKeys.has(howTo.key));
        const lenses = tab.lenses.map((lens) => t(lens.name)).join(', ');
        return (
          <TouchableOpacity
            key={tab.path}
            ref={index === 0 ? walkMark.ref('home.tourTab') : undefined}
            style={[styles.row, index === 0 && walkMark('home.tourTab')]}
            onPress={() => void startTutorials({ kind: 'tab', path: tab.path })}
            accessibilityRole="button"
          >
            <Ionicons name={route?.icon ?? 'ellipse-outline'} size={18} color={route?.color ?? colors.primary} style={textShadow} />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{t(tab.title)}</Text>
              {lenses ? <Text style={styles.rowDetail}>{lenses}</Text> : null}
            </View>
            {done ? (
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.statusGreenOnSurface} style={textShadow} accessibilityLabel={t('Gone through')} />
            ) : (
              <Ionicons name="play-circle-outline" size={18} color={colors.primary} style={textShadow} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  line: { ...typography.body, color: colors.textSecondary, ...textShadow },
  startButton: { ...BUTTON_PRIMARY, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 },
  startText: { ...BUTTON_PRIMARY_TEXT },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { ...typography.bodyEmphasis, color: colors.textPrimary, ...textShadow },
  rowDetail: { ...typography.caption, color: colors.textMuted, ...textShadow },
});
