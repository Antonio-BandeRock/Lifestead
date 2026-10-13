// The desktop's Test data version (desktop/versions.js) fills itself the
// first time it opens, and again after Start Fresh, from
// lib/testDataGenerator.ts. While it fills, this covers the whole window
// with what it is writing; when it is done it reloads the window, so every
// screen that read the empty database on the way in reads the records now.
//
// Draws nothing anywhere else: not on a phone, not in the person's own
// desktop app, and not in any other version.

import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { isDesktopApp, versionPreview } from '../lib/desktop/bridge';
import { fillTestData, isTestDataFilled, TEST_DATA_FUTURE_DAYS, TEST_DATA_PAST_DAYS } from '../lib/testDataGenerator';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandStyle } from './HomeSectionBand';

function isTestDataVersion(): boolean {
  return isDesktopApp() && versionPreview()?.key === 'test-data';
}

type State =
  | { kind: 'checking' }
  | { kind: 'filling'; step: string; done: number; total: number }
  | { kind: 'failed'; message: string }
  | { kind: 'idle' };

export function TestDataFiller() {
  const [state, setState] = useState<State>(() => (isTestDataVersion() ? { kind: 'checking' } : { kind: 'idle' }));

  useEffect(() => {
    if (!isTestDataVersion()) return;
    let stopped = false;
    void (async () => {
      try {
        if (await isTestDataFilled()) {
          if (!stopped) setState({ kind: 'idle' });
          return;
        }
        await fillTestData((step, done, total) => {
          if (!stopped) setState({ kind: 'filling', step, done, total });
        });
        if (typeof window !== 'undefined') window.location.reload();
      } catch (error) {
        if (!stopped) setState({ kind: 'failed', message: error instanceof Error ? error.message : String(error) });
      }
    })();
    return () => {
      stopped = true;
    };
  }, []);

  if (state.kind === 'idle') return null;

  return (
    <View style={styles.cover}>
      <View style={styles.band}>
        <Text style={styles.heading}>Filling the test data</Text>
        <Text style={styles.lead}>
          A made-up person, {TEST_DATA_PAST_DAYS} days behind today and {TEST_DATA_FUTURE_DAYS} ahead. This takes a few minutes, and the window reloads by itself when it is done.
        </Text>
        {state.kind === 'failed' ? (
          <Text style={styles.problem}>It stopped partway: {state.message} Close this window, then press Start Fresh beside Test data in the versions window to wipe this copy and try again.</Text>
        ) : (
          <View style={styles.row}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.step}>
              {state.kind === 'filling' ? `${state.step} (part ${Math.min(state.done + 1, state.total)} of ${state.total})` : 'Looking at this copy'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFillObject, zIndex: 1000, backgroundColor: colors.background, justifyContent: 'center', paddingVertical: HOME_BAND_GAP },
  band: { ...homeBandStyle, borderColor: colors.primary, padding: HOME_BAND_CONTENT_PADDING, gap: 10, backgroundColor: colors.surface },
  heading: { ...typography.sectionTitle, color: colors.textPrimary, ...textShadow },
  lead: { ...typography.body, color: colors.textSecondary, ...textShadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  step: { ...typography.body, color: colors.textPrimary, ...textShadow, flexShrink: 1 },
  problem: { ...typography.body, color: colors.textPrimary, ...textShadow },
});
