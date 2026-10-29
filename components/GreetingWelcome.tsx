// The welcome-back and first-week lines, in the greeting at the top of Home
// since 2026-10-28. They were the first two things the One Next Thing card
// could say (components/NextThing.tsx), and moved here so they reach
// everybody who opens Home, Simple View included, while One Next Thing keeps
// to the next thing to set up in Your Guide.
//
// After a gap of a few days with nothing recorded it is the welcome-back line
// (lib/welcomeBack.ts), which asks for nothing about the days in between. On
// days one, two and seven of somebody's use it is the first-week line
// (lib/firstWeek.ts). Neither is a list: one sentence, one way in, and Not
// now sets it aside for the visit. Most days it draws nothing at all.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { firstWeekDay, firstWeekLine, type FirstWeekLine } from '../lib/firstWeek';
import { getFirstDay } from '../lib/firstWeekDb';
import { welcomeBackFor, type WelcomeBack } from '../lib/welcomeBack';
import { latestRecordMs } from '../lib/welcomeBackDb';
import { useWalkMark } from './WalkMark';
import { PILL, PILL_TEXT } from '../constants/buttons';

export function GreetingWelcome({ tabColor }: { tabColor: string }) {
  const walkMark = useWalkMark();
  const router = useRouter();
  const [welcome, setWelcome] = useState<WelcomeBack | null>(null);
  const [firstWeek, setFirstWeek] = useState<FirstWeekLine | null>(null);
  const [notNow, setNotNow] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void latestRecordMs()
        .then((latest) => {
          if (live) setWelcome(welcomeBackFor(latest, Date.now()));
        })
        .catch(() => {});
      void getFirstDay()
        .then((firstDay) => {
          if (live) setFirstWeek(firstWeekLine(firstWeekDay(firstDay, Date.now())));
        })
        .catch(() => {});
      return () => {
        live = false;
      };
    }, []),
  );

  if (notNow) return null;
  let sentence: string;
  let action: string;
  let go: () => void;
  if (welcome) {
    sentence = welcome.sentence;
    action = welcome.action;
    go = () => router.push('/capture' as Href);
  } else if (firstWeek) {
    const line = firstWeek;
    sentence = line.sentence;
    action = line.action;
    go = () => router.push({ pathname: line.pathname, params: line.params } as Href);
  } else {
    return null;
  }

  return (
    <View style={styles.body}>
      <Text style={styles.sentence}>{sentence}</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          ref={walkMark.ref('home.welcomeGo')}
          style={styles.goPill}
          activeOpacity={0.8}
          onPress={go}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-forward-circle-outline" size={18} color={tabColor} />
          <Text style={styles.goPillText}>{action}</Text>
        </TouchableOpacity>
        <TouchableOpacity ref={walkMark.ref('home.welcomeNotNow')} onPress={() => setNotNow(true)} hitSlop={8} accessibilityRole="button">
          <Text style={styles.quiet}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10, marginTop: 10 },
  sentence: { ...typography.body, ...textShadow, color: colors.textPrimary },
  buttonRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14 },
  goPill: { ...PILL, flexDirection: 'row', alignItems: 'center', gap: 6 },
  goPillText: { ...PILL_TEXT },
  quiet: { ...typography.caption, ...textShadow, color: colors.textSecondary },
});
