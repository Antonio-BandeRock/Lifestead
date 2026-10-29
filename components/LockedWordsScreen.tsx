// The words screen shown over the phone's lock screen when one of the flare
// questions is tapped (next rebuild after 1.0.67.1). Direct request,
// 2026-10-11, for anything a notification needs that is more than a tap:
// "I still want it. Put it into the next rebuild."
//
// Shown by LockedCaptureActivity in mode "words" (plugins/withCaptureTile.js),
// with the question's title and data handed over by the patched
// expo-notifications builder. A box to type in, a microphone, Save and
// Cancel. Nothing here reads a record: the words are handed in the way a
// button press is (handInReminderWords), sealed for the next unlock while App
// Lock holds no key, otherwise written at once. The question stays on the
// lock screen, so its buttons can still be pressed afterwards.

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { useVoiceDictation, type VoiceDictationErrorKind } from '../hooks/useVoiceDictation';
import { setLockedCaptureShowing } from '../lib/lockedCaptures';
import { FLARE_FOLLOW_UP_KIND } from '../lib/reminderActions';
import { handInReminderWords } from '../lib/reminderNotifications';
import LockedCapture from '../modules/locked-capture';
import { AppTextInput } from './AppTextInput';
import { StandaloneKeyboard } from './StandaloneKeyboard';
import {  } from '../lib/i18n';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY, BUTTON_SECONDARY_TEXT } from '../constants/buttons';

type Props = { identifier?: string; title?: string; data?: string };

type Stage = { kind: 'writing' } | { kind: 'saving' } | { kind: 'saved'; how: 'sealed' | 'written' } | { kind: 'failed'; message: string };

const ERROR_WORDS: Record<Exclude<VoiceDictationErrorKind, 'no-speech'>, string> = {
  permission: 'The microphone is not allowed for Lifestead. It can be turned on in the phone settings, under Apps, once the phone is unlocked.',
  unavailable: 'Speech recognition is not available on this phone right now.',
  other: 'Something went wrong while listening. Try again.',
};

function close() {
  LockedCapture?.finishCapture();
}

function readData(raw: string | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function LockedWordsScreen({ identifier, title, data: rawData }: Props) {
  const data = readData(rawData);
  const onFlare = data?.kind === FLARE_FOLLOW_UP_KIND;
  const [text, setText] = useState('');
  const [hearing, setHearing] = useState('');
  const [stage, setStage] = useState<Stage>({ kind: 'writing' });
  const [message, setMessage] = useState<string | null>(null);
  // What was in the box when the microphone started, so what is heard is
  // added after it rather than replacing it.
  const before = useRef('');

  useEffect(() => {
    setLockedCaptureShowing(true);
    return () => setLockedCaptureShowing(false);
  }, []);

  const { status, start, stop } = useVoiceDictation({
    onResult: (transcript, isFinal) => {
      if (!isFinal) {
        setHearing(transcript);
        return;
      }
      setHearing('');
      const heard = transcript.trim();
      if (heard) setText(before.current ? `${before.current} ${heard}` : heard);
    },
    onError: (kind) => {
      setHearing('');
      if (kind === 'no-speech') {
        setMessage('No words came through. Press the microphone to try again.');
        return;
      }
      setMessage(ERROR_WORDS[kind]);
    },
  });

  function listen() {
    if (status === 'listening') {
      stop();
      return;
    }
    setMessage(null);
    before.current = text.trim();
    void start();
  }

  async function save() {
    const words = text.trim();
    if (!words) {
      setMessage('Nothing is written yet. Type or say something, or press Cancel.');
      return;
    }
    if (!identifier || !data) {
      setStage({ kind: 'failed', message: 'This question could not be read, so the words have nowhere to go. Unlock the phone and add them in Signals.' });
      return;
    }
    if (status === 'listening') stop();
    setStage({ kind: 'saving' });
    try {
      const how = await handInReminderWords({ identifier, data, words });
      if (how === 'nothing') {
        setStage({ kind: 'failed', message: 'This question does not take words. Unlock the phone and add them in Signals.' });
        return;
      }
      setStage({ kind: 'saved', how });
    } catch (error) {
      setStage({ kind: 'failed', message: error instanceof Error && error.message ? error.message : 'The words could not be kept.' });
    }
  }

  function cancel() {
    if (status === 'listening') stop();
    close();
  }

  // Its own React root, so it carries its own safe-area provider and its own
  // app keyboard (1.0.74.10): the phone's keyboard never opens here.
  return (
    <SafeAreaProvider>
    <StandaloneKeyboard>
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>{title || (onFlare ? 'The flare' : 'Do you need to log a flare?')}</Text>
          {stage.kind === 'writing' ? (
            <>
              <Text style={styles.hint}>
                {onFlare
                  ? 'Write or say anything about this flare. It is added to the flare\'s notes.'
                  : 'Write or say how you are. It is kept as a check-in note. The Yes and No buttons stay on the lock screen.'}
              </Text>
              <AppTextInput
                voice={false}
                style={styles.box}
                value={text}
                onChangeText={setText}
                placeholder="Type here, or press the microphone"
                placeholderTextColor={colors.textMuted}
                multiline
                autoFocus
                textAlignVertical="top"
              />
              {status === 'listening' ? <Text style={styles.heard}>{hearing || 'Listening…'}</Text> : null}
              {message ? <Text style={styles.warning}>{message}</Text> : null}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.secondaryButton, status === 'listening' && styles.listening]}
                  onPress={listen}
                  accessibilityRole="button"
                  accessibilityLabel={status === 'listening' ? 'Stop listening' : 'Say it instead'}
                >
                  <Ionicons name={status === 'listening' ? 'stop' : 'mic'} size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={cancel}>
                  <Text style={styles.secondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={() => void save()}>
                  <Text style={styles.primaryText}>Save</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
          {stage.kind === 'saving' ? <Text style={styles.hint}>Saving…</Text> : null}
          {stage.kind === 'saved' ? (
            <>
              <View style={styles.titleRow}>
                <Ionicons name={stage.how === 'sealed' ? 'lock-closed' : 'checkmark-circle'} size={20} color={colors.primary} />
                <Text style={styles.title}>Kept</Text>
              </View>
              <Text style={styles.heard}>{text.trim()}</Text>
              <Text style={styles.hint}>
                {stage.how === 'sealed'
                  ? onFlare
                    ? 'It is sealed on this phone and written into the flare the next time Lifestead is unlocked, with the time you saved it.'
                    : 'It is sealed on this phone and written as a check-in note the next time Lifestead is unlocked, with the time you saved it.'
                  : onFlare
                    ? 'It is added to the flare\'s notes in Signals.'
                    : 'It is saved as a check-in note in Signals.'}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.primaryButton} onPress={close}>
                  <Text style={styles.primaryText}>Done</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
          {stage.kind === 'failed' ? (
            <>
              <Text style={styles.warning}>{stage.message}</Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={close}>
                  <Text style={styles.secondaryText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={() => setStage({ kind: 'writing' })}>
                  <Text style={styles.primaryText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
    </StandaloneKeyboard>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  card: {
    margin: 16,
    padding: 16,
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...typography.bodyEmphasis, color: colors.textPrimary, fontWeight: '400', flexShrink: 1, ...textShadow },
  heard: { ...typography.body, color: colors.textPrimary, ...textShadow },
  hint: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  warning: { ...typography.caption, color: colors.danger, ...textShadow },
  box: {
    ...typography.body,
    minHeight: 110,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.textPrimary,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  primaryButton: { ...BUTTON_PRIMARY },
  primaryText: { ...BUTTON_PRIMARY_TEXT },
  secondaryButton: { ...BUTTON_SECONDARY },
  listening: { borderColor: colors.primary },
  secondaryText: { ...BUTTON_SECONDARY_TEXT },
});
