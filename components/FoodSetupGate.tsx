// The food questions asked before the app plans anything (2026-11-04, direct
// instruction: "All automatic ways in the app to get them to a grocery list
// need to start with the setup information about how they need to eat, and
// any conditions they might have, and if they haven't yet set those things up
// then they need to in order for the app to create their correct meal plan.").
//
// The same questions setup asks, in the same words and saved to the same
// places (lib/yourStoryInterview.ts buildFoodSetup): conditions, the healing
// stage of any staged condition, eating style and allergies. A question
// already answered is not asked again. Each one can still be put off, the way
// it can in setup, since nobody has to name a condition to use the app; a
// question put off this run is passed and the plan is made on what is known.
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { buildFoodSetup } from '../lib/yourStoryInterview';
import { loadYourStoryEverything } from '../lib/yourStoryInterviewDb';
import type { InterviewView } from '../lib/yourStoryInterview';
import { goToStoryDestination } from './GuidedTourHost';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandStyle } from './HomeSectionBand';
import { YourStoryInterview } from './YourStoryInterview';

type Props = {
  /** Called once every food question is answered or put off, with the answers as they stand. */
  onReady: (view: InterviewView) => void;
  /** The line under the heading saying what the answers are for. */
  lead: string;
};

export function FoodSetupGate({ onReady, lead }: Props) {
  const router = useRouter();
  const [view, setView] = useState<InterviewView | null>(null);
  const [failed, setFailed] = useState(false);
  const [held, setHeld] = useState<string | null>(null);
  // Questions answered or put off here, so one answered with a choice that
  // does not close it (a condition) is not shown again from a stale read.
  const [passed, setPassed] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const everything = await loadYourStoryEverything(false);
      setView(buildFoodSetup(everything.interview.facts));
      setFailed(false);
    } catch (error) {
      console.warn('Food questions: could not read what is set up', error);
      setFailed(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const waiting = view ? view.questions.filter((question) => !question.answered && !passed.includes(question.key)) : [];
  const candidateKey = waiting[0]?.key ?? null;
  const shown = held ?? candidateKey;
  useEffect(() => {
    if (!held && candidateKey) setHeld(candidateKey);
  }, [held, candidateKey]);

  const ready = view !== null && shown === null;
  useEffect(() => {
    if (ready && view) onReady(view);
  }, [ready, view, onReady]);

  const answered = useCallback((key: string) => {
    setPassed((was) => (was.includes(key) ? was : [...was, key]));
    setHeld(null);
  }, []);

  if (failed) {
    return (
      <View style={styles.band}>
        <Text style={styles.lead}>The food questions could not be read just now. Try again in a moment.</Text>
      </View>
    );
  }
  if (!view || ready) {
    return (
      <View style={styles.band}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <View style={styles.band}>
        <Text style={styles.heading}>First, how you eat</Text>
        <Text style={styles.lead}>{lead}</Text>
      </View>
      <YourStoryInterview
        mode="setup"
        interview={view}
        showKey={shown ?? undefined}
        onAnswered={answered}
        onChanged={() => void load()}
        go={(destination) => goToStoryDestination(router, destination)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: HOME_BAND_GAP },
  band: {
    ...homeBandStyle,
    borderColor: colors.tabLife,
    padding: HOME_BAND_CONTENT_PADDING,
    gap: 6,
  },
  heading: { ...typography.sectionTitle, color: colors.textPrimary },
  lead: { ...typography.body, color: colors.textSecondary },
});
