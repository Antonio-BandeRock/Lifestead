// A timer running on Interests > Sessions, shown on Home in the Interests
// group (2026-11-15). Until then a timer started and then forgotten ran on
// unseen until the Sessions lens was opened again. The band is drawn only
// while a timer runs, the way Waiting for an Answer is drawn only while
// something waits. Stop and Keep here does what it does on the lens and on
// the notification; Throw Away stays on the lens, where the whole session
// can be seen first.

import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { t } from '../lib/i18n';
import { listInterests } from '../lib/interestsDb';
import { describeTimer, formatMinutes, type InterestSession } from '../lib/interestSessions';
import { getRunningSession, stopInterestTimer } from '../lib/interestSessionsDb';
import { clearInterestTimerNotice, ensureInterestTimerNotice } from '../lib/reminderNotifications';
import { FADING_MESSAGE_MS } from '../hooks/useFadingMessage';
import { useWalkMark } from './WalkMark';

export type RunningInterestTimer = { session: InterestSession; interestName: string };

/** The running timer, read each time Home comes into view. Null while
 *  nothing runs. Also puts the notification back if it was swiped away. */
export function useRunningInterestTimer(): { timer: RunningInterestTimer | null; reload: () => void } {
  const [timer, setTimer] = useState<RunningInterestTimer | null>(null);
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      void Promise.all([getRunningSession(), listInterests()])
        .then(([session, interests]) => {
          if (!live) return;
          if (!session) {
            setTimer(null);
            return;
          }
          const name = interests.find((interest) => interest.id === session.interestId)?.name ?? t('An interest no longer listed');
          setTimer({ session, interestName: name });
          void ensureInterestTimerNotice();
        })
        .catch(() => {
          if (live) setTimer(null);
        });
      return () => {
        live = false;
      };
    // attempt is the Try again trigger: a new value reads again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt]),
  );
  return { timer, reload: () => setAttempt((n) => n + 1) };
}

export function InterestTimerHomeCard({ timer, onChanged }: { timer: RunningInterestTimer; onChanged: () => void }) {
  const walkMark = useWalkMark();
  // What was kept stays readable for a while; then the band goes, since no
  // timer runs.
  const [kept, setKept] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { session, interestName } = timer;

  async function stop() {
    setBusy(true);
    try {
      const minutes = await stopInterestTimer(session.id, { note: null, leftOff: null });
      void clearInterestTimerNotice(session.id);
      setKept(t('{name}: {time} kept.', { name: interestName, time: formatMinutes(minutes) }));
      setTimeout(onChanged, FADING_MESSAGE_MS);
    } finally {
      setBusy(false);
    }
  }

  if (kept) {
    return (
      <View style={styles.body}>
        <Text style={styles.bodyText}>{kept}</Text>
      </View>
    );
  }
  return (
    <View style={styles.body}>
      <Text style={styles.bodyText}>{interestName}</Text>
      <Text style={styles.caption}>{describeTimer(session.startedAt ?? session.createdAt, new Date())}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          ref={walkMark.ref('home.interestTimerStop')}
          style={[styles.primary, walkMark('home.interestTimerStop')]}
          onPress={() => void stop()}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>Stop and Keep</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondary}
          onPress={() => router.push({ pathname: '/interests', params: { openInterestsLens: 'sessions' } })}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Open Sessions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 8 },
  bodyText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primary: { ...BUTTON_PRIMARY_COMPACT },
  primaryText: { ...BUTTON_PRIMARY_TEXT },
  secondary: { ...BUTTON_SECONDARY_COMPACT },
  secondaryText: { ...BUTTON_SECONDARY_TEXT },
});
