// Interests > Languages (2026-11-05): the sets of basics for the language this person
// speaks. A set is what to learn first so the rest gets easier, not a course to get
// through, so there is no catalogue to browse and nothing to finish. Studying opens
// app/language-basics.tsx. Fully separate from Learn: nothing here counts toward
// Things You Now Know, and Learn's decks never appear here.

import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWalkMark } from './WalkMark';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { t } from '../lib/i18n';
import { useLanguage } from '../lib/language';
import { setsForLanguage } from '../lib/languageBasics';
import { listCourses, type CourseEntry } from '../lib/learnCoursesDb';

export function LanguagesSection() {
  const router = useRouter();
  const walkMark = useWalkMark();
  const language = useLanguage();
  const [sets, setSets] = useState<CourseEntry[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void listCourses()
        .then((all) => {
          if (live) setSets(setsForLanguage(all, language));
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
    return <Text style={styles.caption}>There are no language basics yet for the language this app is in.</Text>;
  }
  return (
    <View style={styles.list}>
      {sets.map((set, index) => (
        <View key={set.deck.id} style={styles.item}>
          <Text style={styles.name}>{t(set.deck.name)}</Text>
          <Text style={styles.caption}>{t(set.deck.description)}</Text>
          {set.settings.openedUnits.length > 0 ? <Text style={styles.caption}>{t('{n} on Home', { n: set.settings.openedUnits.length })}</Text> : null}
          <TouchableOpacity
            ref={index === 0 ? walkMark.ref('languages.open') : undefined}
            style={[styles.button, index === 0 ? walkMark('languages.open') : null]}
            onPress={() => router.push({ pathname: '/language-basics', params: { id: set.deck.id } })}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Open</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 14 },
  item: { gap: 6 },
  name: { ...typography.bodyEmphasis, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textMuted, ...textShadow },
  button: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  buttonText: BUTTON_PRIMARY_TEXT,
});
