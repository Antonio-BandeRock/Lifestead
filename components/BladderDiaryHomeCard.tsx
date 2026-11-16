// The bladder diary on Home (Q23, 1.0.91.9), in the Signals group. Drawn
// only while a diary is open, the way the interest timer is drawn only
// while one runs: three days of taps are easier kept from the first screen
// than from a lens two taps in. Trip and Leak open the full form on
// Signals > Bladder, since each asks how much, the urge and the leak;
// Going to bed and Up for the day need nothing more than the time, so they
// are saved from here.

import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { diaryStage, isDiaryOpen, stageLine, type BladderDiary, type BladderEntry } from '../lib/bladderDiary';
import { addBladderEntry, getLatestBladderDiary, listBladderEntries } from '../lib/bladderDiaryDb';
import { t } from '../lib/i18n';
import { saveOrSay } from '../lib/saveProblem';
import { useWalkMark } from './WalkMark';

export type OpenBladderDiary = { diary: BladderDiary; entries: BladderEntry[] };

function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function localTime(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** The open diary and its entries, read each time Home comes into view.
 *  Null when no diary is open today. */
export function useOpenBladderDiary(): { open: OpenBladderDiary | null; reload: () => void } {
  const [open, setOpen] = useState<OpenBladderDiary | null>(null);
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      void getLatestBladderDiary()
        .then(async (diary) => {
          if (!diary || !isDiaryOpen(diary, localToday())) {
            if (live) setOpen(null);
            return;
          }
          const entries = await listBladderEntries(diary.id);
          if (live) setOpen({ diary, entries });
        })
        .catch(() => {
          if (live) setOpen(null);
        });
      return () => {
        live = false;
      };
    // attempt is the read-again trigger after a save from the card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt]),
  );
  return { open, reload: () => setAttempt((n) => n + 1) };
}

/** What today holds so far, in counts, and the last mark. */
export function todaySoFar(entries: BladderEntry[], today: string): string {
  const mine = entries.filter((entry) => entry.at.slice(0, 10) === today);
  const trips = mine.filter((entry) => entry.kind === 'void').length;
  const leaks = mine.filter((entry) => entry.kind === 'leak' || entry.leak != null).length;
  if (trips === 0 && leaks === 0) return t('Nothing logged today yet.');
  const tripWords = trips === 1 ? t('1 trip') : t('{count} trips', { count: trips });
  if (leaks === 0) return t('Today so far: {trips}.', { trips: tripWords });
  const leakWords = leaks === 1 ? t('1 leak') : t('{count} leaks', { count: leaks });
  return t('Today so far: {trips}, {leaks}.', { trips: tripWords, leaks: leakWords });
}

export function BladderDiaryHomeCard({ open, onChanged }: { open: OpenBladderDiary; onChanged: () => void }) {
  const walkMark = useWalkMark();
  const [saved, setSaved] = useState<string | null>(null);
  const today = localToday();
  const stage = diaryStage(open.diary, today);

  function openForm(kind: 'void' | 'leak') {
    router.push({ pathname: '/log', params: { openSignalsLens: 'nocturia', bladderLog: kind } });
  }

  async function logMark(kind: 'bed' | 'up') {
    const time = localTime();
    const ok = await saveOrSay('That was not saved. Try again.', async () => {
      await addBladderEntry(open.diary.id, { at: `${today}T${time}`, kind, volumeMl: null, urgency: null, leak: null, note: null });
      return true;
    });
    if (!ok) return;
    setSaved(kind === 'bed' ? t('Going to bed at {time} saved.', { time }) : t('Up for the day at {time} saved.', { time }));
    onChanged();
  }

  return (
    <View style={styles.body}>
      <Text style={styles.bodyText}>{stageLine(stage, t)}</Text>
      {stage.stage === 'before' ? null : <Text style={styles.caption}>{todaySoFar(open.entries, today)}</Text>}
      {saved ? <Text style={styles.caption}>{saved}</Text> : null}
      {stage.stage === 'before' ? null : (
        <View style={styles.row}>
          <TouchableOpacity ref={walkMark.ref('home.bladderTrip')} style={[styles.button, walkMark('home.bladderTrip')]} onPress={() => openForm('void')} accessibilityRole="button">
            <Text style={styles.buttonText}>Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => openForm('leak')} accessibilityRole="button">
            <Text style={styles.buttonText}>Leak</Text>
          </TouchableOpacity>
          <TouchableOpacity ref={walkMark.ref('home.bladderBed')} style={[styles.button, walkMark('home.bladderBed')]} onPress={() => void logMark('bed')} accessibilityRole="button">
            <Text style={styles.buttonText}>Going to bed</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => void logMark('up')} accessibilityRole="button">
            <Text style={styles.buttonText}>Up for the day</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 8 },
  bodyText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { ...BUTTON_SECONDARY_COMPACT },
  buttonText: { ...BUTTON_SECONDARY_TEXT },
});
