// One next thing, C16 and C18 of the competitive build plan (Phase 2,
// 2026-09-26), and the start of Simple View. One sentence and one button,
// never a list. After a gap of a few days with nothing recorded it is the
// welcome-back line (lib/welcomeBack.ts), which asks for nothing about the
// days in between; otherwise it is the first Your Story item not done yet,
// with the button going straight to where it is done. With neither, the
// card says Your Story is up to date and offers Capture.
//
// P1 (1.0.68.5): on days one, two and seven of somebody's use, a first-week
// line (lib/firstWeek.ts) came after the welcome-back line.
//
// 2026-10-28: both of those moved into the greeting at the top of Home
// (components/GreetingWelcome.tsx), so they reach Simple View too, and this
// card keeps to the next thing to set up in Your Guide.
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { useWalkMark } from './WalkMark';
import type { StoryDestination, YourStoryView } from '../lib/yourStory';

type Props = {
  view: YourStoryView | null;
  tabColor: string;
  /** Opens a Your Story destination the way the Your Story card does. */
  onGo: (destination: StoryDestination) => void;
};

export function NextThing({ view, tabColor, onGo }: Props) {
  const walkMark = useWalkMark();
  const router = useRouter();

  let sentence: string;
  let action: string;
  let go: () => void;
  if (view?.nextItem && view.nextItem.def.kind !== 'waiting') {
    const item = view.nextItem;
    sentence = item.sentence;
    action = 'Take me there';
    go = () => onGo(item.def.destination);
  } else {
    sentence = 'Your Guide has nothing waiting to be set up. Anything on your mind can go in Capture.';
    action = 'Open Capture';
    go = () => router.push('/capture' as Href);
  }

  return (
    <View style={styles.body}>
      <Text style={styles.sentence}>{sentence}</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity ref={walkMark.ref('home.nextGo')} style={[styles.button, { borderColor: tabColor }]} activeOpacity={0.8} onPress={go}>
          <Ionicons name="arrow-forward-circle-outline" size={18} color={tabColor} />
          <Text style={[styles.buttonText, { color: tabColor }]}>{action}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  sentence: { ...typography.body, ...textShadow, color: colors.textPrimary },
  buttonRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  buttonText: { ...typography.bodyEmphasis, textShadowColor: 'transparent', textShadowRadius: 0 },
});
