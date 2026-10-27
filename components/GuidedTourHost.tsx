// The guided tour after setup (1.0.68.11): the strip at the top of every
// screen naming the one thing to do now, with Go there. Every decision
// (what is walked, in what order, when a stop ends) is in lib/guidedTour.ts;
// this file looks for the records and draws the strip. Mounted once at the
// app root beside StoryWalkHost, and it steps aside while a Walk me through
// it strip is showing, since that one is already leading the person.
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import {
  TOUR_DONE_LABEL,
  TOUR_GO_LABEL,
  TOUR_HIDE_LABEL,
  TOUR_PASS_LABEL,
  TOUR_WHY_LABEL,
  currentTourStop,
  subscribeTourChanged,
  type TourStop,
} from '../lib/guidedTour';
import { hideGuidedTour, passTourStop } from '../lib/guidedTourDb';
import { WALK_GROW_LABEL, WALK_SAVED_LINE, WALK_SHRINK_LABEL } from '../lib/storyWalk';
import type { StoryDestination } from '../lib/yourStory';
import { loadYourStoryEverything } from '../lib/yourStoryInterviewDb';
import { GuideStripAnchor } from './GuideRoom';
import { useStoryWalk } from './StoryWalkHost';

// How often the record is looked for while a stop waits on it.
const RECORD_CHECK_MS = 6000;
const TOUR_CAPTION = 'Next thing to do';

export function goToStoryDestination(router: ReturnType<typeof useRouter>, destination: StoryDestination): void {
  if (destination.kind === 'route') {
    router.push({ pathname: destination.pathname, params: destination.params } as Href);
  } else if (destination.kind === 'home') {
    router.push({ pathname: '/', params: { openHomeSection: destination.section } } as Href);
  } else if (destination.kind === 'quickLog') {
    router.push({ pathname: '/', params: { openHomeQuickLog: destination.form } } as Href);
  }
}

export function GuidedTourHost() {
  const walk = useStoryWalk();
  const pathname = usePathname();
  const router = useRouter();
  const [stop, setStop] = useState<TourStop | null>(null);
  const [small, setSmall] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  // The stop that just went on record, said once above the next one so the
  // strip never changes under somebody without saying why.
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const shown = useRef<TourStop | null>(null);
  const pressed = useRef(false);

  const look = useCallback(async () => {
    try {
      const { interview } = await loadYourStoryEverything(false);
      const next = currentTourStop(interview);
      const before = shown.current;
      if (before && next?.key !== before.key) {
        setJustSaved(pressed.current ? null : before.doThis);
        setWhyOpen(false);
      }
      pressed.current = false;
      shown.current = next;
      setStop(next);
    } catch (error) {
      console.warn('Guided tour: record check failed', error);
    }
  }, []);

  useEffect(() => subscribeTourChanged(() => void look()), [look]);
  useEffect(() => {
    void look();
  }, [pathname, look]);
  useEffect(() => {
    if (!stop) return;
    const timer = setInterval(() => void look(), RECORD_CHECK_MS);
    return () => clearInterval(timer);
  }, [stop, look]);

  if (!stop || walk) return null;

  const pass = () => {
    pressed.current = true;
    void passTourStop(stop.key);
  };

  return (
    <GuideStripAnchor slot="tour" style={styles.anchor}>
      <View style={styles.strip} accessibilityLiveRegion="polite">
        {justSaved && !small ? (
          <View style={styles.sayRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={textShadow} />
            <Text style={styles.caption}>{`${WALK_SAVED_LINE} ${justSaved}`}</Text>
          </View>
        ) : null}
        {small ? null : <Text style={styles.caption}>{TOUR_CAPTION}</Text>}
        <View style={styles.sayRow}>
          <Ionicons name="footsteps-outline" size={18} color={colors.primary} style={textShadow} />
          <Text style={styles.say} numberOfLines={small ? 2 : undefined}>
            {stop.doThis}
          </Text>
          <TouchableOpacity
            onPress={() => setSmall((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={small ? WALK_GROW_LABEL : WALK_SHRINK_LABEL}
            hitSlop={10}
          >
            <Ionicons name={small ? 'chevron-down' : 'chevron-up'} size={18} color={colors.primary} style={textShadow} />
          </TouchableOpacity>
        </View>
        {whyOpen && !small ? <Text style={styles.after}>{stop.why}</Text> : null}
        {small ? null : (
          <View style={styles.actions}>
            <TourButton
              icon="arrow-forward"
              label={TOUR_GO_LABEL}
              onPress={() => {
                setJustSaved(null);
                goToStoryDestination(router, stop.destination);
              }}
            />
            {stop.hasRecord ? null : <TourButton icon="checkmark" label={TOUR_DONE_LABEL} onPress={pass} />}
            <TourButton icon="help-circle-outline" label={TOUR_WHY_LABEL} onPress={() => setWhyOpen((value) => !value)} />
            {stop.hasRecord ? <TourButton icon="play-skip-forward-outline" label={TOUR_PASS_LABEL} onPress={pass} /> : null}
            <TourButton icon="close" label={TOUR_HIDE_LABEL} onPress={() => void hideGuidedTour()} />
          </View>
        )}
      </View>
    </GuideStripAnchor>
  );
}

function TourButton({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={14} color={colors.primary} style={textShadow} />
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', left: 12, right: 12 },
  strip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  caption: { ...typography.caption, color: colors.textMuted, flexShrink: 1, ...textShadow },
  sayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  say: { ...typography.body, color: colors.textPrimary, flex: 1, ...textShadow },
  after: { ...typography.body, color: colors.textSecondary, ...textShadow },
  actions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  buttonText: { ...typography.body, color: colors.primary, ...textShadow },
});
