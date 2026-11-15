import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { TabBand, useTabBandStyles } from './TabBand';
import { useBandFolds } from '../hooks/useBandFolds';
import { useWalkMark } from './WalkMark';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { formatMarkClock, localDayKey } from '../lib/routines';
import { formatTodoDay } from '../lib/todos';
import { shiftDay, type LookBackDay, type LookBackItem, type LookBackWalk } from '../lib/didIDoIt';
import { getLookBackDay } from '../lib/didIDoItDb';
import { explainNotYet } from '../lib/notYet';
import { t } from '../lib/i18n';

// Life > Did I Do It: one day looked back on, made only of what was checked
// off (direct instruction, 2026-11-15; the rules are in lib/didIDoIt.ts).
// Things checked off on their own come first, then each routine with the
// steps done on each walk under it. Nothing here writes: things are set up
// and checked off on the To Do List, Tasks and Routines.

function clock(iso: string): string {
  return formatMarkClock(new Date(iso));
}

function timesLine(item: LookBackItem): string {
  return item.times.map(clock).join(', ');
}

function walkLine(walk: LookBackWalk): string {
  const started = clock(walk.startedAt);
  if (walk.finished) return t('Walked through, started {time}', { time: started });
  return t('Started {time}, put down after {done} of {total} steps', { time: started, done: walk.stepsDone, total: walk.stepsTotal });
}

export function DidIDoItLookBack({ tabColor }: { tabColor: string }) {
  const router = useRouter();
  const band = useTabBandStyles(tabColor);
  const folds = useBandFolds();
  const walkMark = useWalkMark();
  const styles = useMemo(() => makeStyles(tabColor), [tabColor]);
  const today = localDayKey(new Date());
  const [day, setDay] = useState(today);
  const [data, setData] = useState<LookBackDay | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void getLookBackDay(day)
        .then((next) => {
          if (!live) return;
          setFailed(false);
          setData(next);
        })
        .catch((error) => {
          console.warn('[DidIDoItLookBack] Could not read the day', error);
          if (live) setFailed(true);
        });
      return () => {
        live = false;
      };
    // attempt is the Try again trigger: a new value reads again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [day, attempt]),
  );

  const dayLabel = day === today ? t('Today') : day === shiftDay(today, -1) ? t('Yesterday') : formatTodoDay(day, today);
  const empty = data != null && data.day === day && data.onTheirOwn.length === 0 && data.routines.length === 0;

  return (
    <View style={band.column}>
      <View style={band.box}>
        <Text style={styles.dayTitle}>{dayLabel}</Text>
        <Text style={styles.caption}>
          Only what was checked off is listed. Anything not here was not checked off that day.
        </Text>
        <View style={styles.dayRow}>
          <TouchableOpacity
            ref={walkMark.ref('lookBack.earlier')}
            style={[styles.dayButton, walkMark('lookBack.earlier')]}
            onPress={() => setDay(shiftDay(day, -1))}
            accessibilityRole="button"
          >
            <Text style={styles.dayButtonText}>Earlier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dayButton, day === today ? styles.dimmed : null]}
            onPress={() => (day === today ? explainNotYet('This is today. There is nothing later to look back on yet.') : setDay(shiftDay(day, 1)))}
            accessibilityRole="button"
          >
            <Text style={styles.dayButtonText}>Later</Text>
          </TouchableOpacity>
          {day !== today ? (
            <TouchableOpacity style={styles.dayButton} onPress={() => setDay(today)} accessibilityRole="button">
              <Text style={styles.dayButtonText}>Today</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {failed ? (
        <View style={band.box}>
          <Text style={styles.body}>That day could not be read just now. Nothing you recorded is lost.</Text>
          <TouchableOpacity style={[styles.dayButton, styles.tryAgain]} onPress={() => setAttempt((n) => n + 1)} accessibilityRole="button">
            <Text style={styles.dayButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!failed && empty ? (
        <View style={band.boxMuted}>
          <Text style={styles.body}>Nothing was checked off on this day.</Text>
          <View style={styles.linkRow}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/life', params: { openLifeLens: 'didIDoIt' } })}>
              <Text style={styles.link}>Open the To Do List</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push({ pathname: '/life', params: { openLifeLens: 'routines' } })}>
              <Text style={styles.link}>Open Routines</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {!failed && data && data.day === day && data.onTheirOwn.length > 0 ? (
        <TabBand
          folds={folds}
          color={tabColor}
          id="life:lookBack:onTheirOwn"
          title={t('On their own')}
          icon="checkmark-outline"
          count={data.onTheirOwn.length}
          markRef={walkMark.ref('lookBack.onTheirOwn')}
        >
          <View style={band.rows}>
            {data.onTheirOwn.map((item) => (
              <View key={item.key} style={band.row}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.caption}>
                  {item.kind === 'task' ? t('Task, done at {times}', { times: timesLine(item) }) : t('Checked off at {times}', { times: timesLine(item) })}
                </Text>
              </View>
            ))}
          </View>
        </TabBand>
      ) : null}

      {!failed && data && data.day === day
        ? data.routines.map((routine, index) => (
            <TabBand
              key={routine.routineId}
              folds={folds}
              color={tabColor}
              id={`life:lookBack:routine:${routine.routineId}`}
              title={routine.name}
              icon="footsteps-outline"
              markRef={index === 0 ? walkMark.ref('lookBack.routine') : undefined}
            >
              <View style={band.rows}>
                {routine.walks.map((walk) => (
                  <View key={walk.runId} style={band.row}>
                    <Text style={styles.name}>{walkLine(walk)}</Text>
                    {walk.steps ? (
                      walk.steps.map((step, stepIndex) => (
                        <Text key={`${walk.runId}-${stepIndex}`} style={styles.step}>
                          {t('{step}, at {time}', { step: step.text, time: clock(step.at) })}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.caption}>
                        {t('{done} steps done. This walk is from before each step was kept, so only the count is known.', { done: walk.stepsDone })}
                      </Text>
                    )}
                  </View>
                ))}
                {routine.outsideWalks.length > 0 ? (
                  <View style={band.row}>
                    <Text style={styles.name}>{routine.walks.length > 0 ? t('Also checked off') : t('Checked off')}</Text>
                    {routine.outsideWalks.map((item) => (
                      <Text key={item.key} style={styles.step}>
                        {t('{step}, at {time}', { step: item.name, time: timesLine(item) })}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            </TabBand>
          ))
        : null}
    </View>
  );
}

function makeStyles(tabColor: string) {
  return StyleSheet.create({
    dayTitle: { ...typography.sectionTitle, color: colors.textPrimary, ...textShadow },
    caption: { ...typography.caption, color: colors.textMuted, marginTop: 4, ...textShadow },
    body: { ...typography.body, color: colors.textSecondary, ...textShadow },
    name: { ...typography.bodyEmphasis, color: colors.textPrimary, ...textShadow },
    step: { ...typography.body, color: colors.textSecondary, marginTop: 4, ...textShadow },
    dayRow: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
    dayButton: { ...BUTTON_SECONDARY_COMPACT },
    dayButtonText: { ...BUTTON_SECONDARY_TEXT },
    dimmed: { opacity: 0.5 },
    tryAgain: { alignSelf: 'flex-start', marginTop: 12 },
    linkRow: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' },
    link: { ...typography.caption, color: tabColor, ...textShadow },
  });
}
