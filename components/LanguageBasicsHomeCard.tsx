// Language basics on Home, in the Interests group (2026-11-05): the units a person has
// turned on, in the order they should be learned, each opening that unit. Named from
// the outline alone, so Home never reads a card. No count of what is waiting.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CourseText } from './CourseText';
import { useWalkMark } from './WalkMark';
import { BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { t } from '../lib/i18n';
import { useLanguage } from '../lib/language';
import { setsForLanguage, unitsTurnedOn } from '../lib/languageBasics';
import { listCourses, type StudyGroup } from '../lib/learnCoursesDb';

type OnHome = { id: string; name: string; units: { unit: number; name: string }[]; groups: StudyGroup[] };

export function LanguageBasicsHomeCard() {
  const walkMark = useWalkMark();
  const language = useLanguage();
  const [sets, setSets] = useState<OnHome[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void listCourses()
        .then((all) => {
          if (!live) return;
          const on = setsForLanguage(all, language)
            .filter((set) => set.settings.openedUnits.length > 0 || set.settings.studyGroups.length > 0)
            .map((set) => ({
              id: set.deck.id,
              name: set.deck.name,
              units: unitsTurnedOn(set.loadOutline(), set.settings.openedUnits),
              groups: set.settings.studyGroups,
            }));
          setSets(on);
        })
        .catch(() => {
          if (live) setSets([]);
        });
      return () => {
        live = false;
      };
    }, [language]),
  );

  if (sets === null) return null;
  if (sets.length === 0) {
    return (
      <View style={styles.body}>
        <Text style={styles.caption}>Turn units on under Interests, Languages, and they show here in the order they should be learned.</Text>
        <TouchableOpacity
          ref={walkMark.ref('home.languageBasicsOpen')}
          style={[styles.button, walkMark('home.languageBasicsOpen')]}
          onPress={() => router.push({ pathname: '/interests', params: { openInterestsLens: 'languages' } })}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Open Languages</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={styles.body}>
      {sets.map((set, setIndex) => (
        <View key={set.id} style={styles.set}>
          <Text style={styles.name}>{t(set.name)}</Text>
          {set.units.map((unit, unitIndex) => {
            const marked = setIndex === 0 && unitIndex === 0;
            return (
              <TouchableOpacity
                key={unit.unit}
                ref={marked ? walkMark.ref('home.languageBasicsUnit') : undefined}
                style={[styles.row, marked ? walkMark('home.languageBasicsUnit') : null]}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/language-basics', params: { id: set.id, unit: String(unit.unit) } })}
                accessibilityRole="button"
              >
                <CourseText style={styles.rowText}>{`${unit.unit}. ${unit.name}`}</CourseText>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={textShadow} />
              </TouchableOpacity>
            );
          })}
          {set.units.length > 0 ? (
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push({ pathname: '/language-basics', params: { id: set.id, together: '1' } })}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Study These Together</Text>
            </TouchableOpacity>
          ) : null}
          {set.groups.length > 0 ? <Text style={styles.caption}>Studied together before</Text> : null}
          {set.groups.map((group, groupIndex) => {
            const marked = setIndex === 0 && groupIndex === 0;
            const label = group.units.length === 1 ? t('Unit {units}', { units: group.units[0] }) : t('Units {units}', { units: group.units.join(', ') });
            return (
              <TouchableOpacity
                key={group.units.join(',')}
                ref={marked ? walkMark.ref('home.languageBasicsGroup') : undefined}
                style={[styles.row, marked ? walkMark('home.languageBasicsGroup') : null]}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/language-basics', params: { id: set.id, group: group.units.join(','), order: group.order } })}
                accessibilityRole="button"
              >
                <Ionicons name="albums-outline" size={18} color={colors.textSecondary} style={textShadow} />
                <Text style={styles.rowText}>{group.order === 'random' ? t('{label}, random order', { label }) : label}</Text>
                <Ionicons name="play" size={18} color={colors.textSecondary} style={textShadow} />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  set: { gap: 6 },
  name: { ...typography.bodyEmphasis, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textMuted, ...textShadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rowText: { ...typography.body, color: colors.textPrimary, flex: 1, ...textShadow },
  button: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  buttonText: BUTTON_SECONDARY_TEXT,
});
