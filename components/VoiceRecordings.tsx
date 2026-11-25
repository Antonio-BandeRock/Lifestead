// Sound recordings kept with a record (1.0.96.2): what somebody said, kept
// as sound, on a diary entry or a Health Journal entry. A recording is an
// attachment (lib/attachmentsDb.ts), so it travels to the person's other
// device encrypted, the way every file does.
//
// Recording needs a phone and says so on a computer. A computer plays what
// the phone recorded.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type AudioPlayer,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import type { Attachment, AttachmentOwnerKind } from '../lib/attachments';
import { addAttachmentFromFile, attachmentBase64, attachmentUriHere, listAttachmentsOf, removeAttachment } from '../lib/attachmentsDb';
import { isDesktopApp } from '../lib/desktop/bridge';
import { announcePhoneOnly } from '../lib/desktop/phoneOnly';
import { t } from '../lib/i18n';
import { appLocale } from '../lib/language';
import { claimMic, releaseMic } from '../lib/micClaim';
import { explainNotYet } from '../lib/notYet';
import { saveOrSay } from '../lib/saveProblem';
import { useConfirmSheet } from './ConfirmSheet';
import { useInfoAlert } from './InfoAlert';

function clock(millis: number): string {
  const seconds = Math.floor(millis / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function VoiceRecordings({
  ownerKind,
  ownerId,
  tabColor,
  readOnly = false,
  onChanged,
}: {
  ownerKind: AttachmentOwnerKind;
  ownerId: string;
  tabColor: string;
  /** Plays only, on a page that is being read. */
  readOnly?: boolean;
  onChanged?: () => void;
}) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showInfoAlert, infoAlertElement] = useInfoAlert();
  const [confirm, confirmElement] = useConfirmSheet();
  const player = useRef<{ player: AudioPlayer; release: () => void } | null>(null);

  const load = useCallback(async () => {
    const list = await listAttachmentsOf(ownerKind, ownerId);
    setItems(list.filter((item) => item.mimeType.startsWith('audio/')));
  }, [ownerKind, ownerId]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const stopPlaying = useCallback(() => {
    player.current?.release();
    player.current = null;
    setPlayingId(null);
  }, []);

  useEffect(
    () => () => {
      player.current?.release();
      player.current = null;
    },
    [],
  );

  const play = async (item: Attachment) => {
    setMessage(null);
    if (playingId === item.id) {
      stopPlaying();
      return;
    }
    stopPlaying();
    try {
      const uri = isDesktopApp()
        ? await attachmentBase64(item).then((data) => (data ? `data:${item.mimeType};base64,${data}` : null))
        : await attachmentUriHere(item);
      if (!uri) {
        setMessage(t('{name} has not arrived on this device yet.', { name: item.name }));
        return;
      }
      const next = createAudioPlayer(uri);
      const subscription = next.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) stopPlaying();
      });
      player.current = {
        player: next,
        release: () => {
          subscription.remove();
          next.remove();
        },
      };
      next.play();
      setPlayingId(item.id);
    } catch (error) {
      console.warn('A recording could not be played', error);
      setMessage(t('{name} could not be played on this device.', { name: item.name }));
    }
  };

  const remove = async (item: Attachment) => {
    const ok = await confirm({
      title: t('Remove {name}?', { name: item.name }),
      message: 'The recording goes from this device and from the Files folder in your shared folder. The entry stays.',
      confirmLabel: t('Remove'),
      destructive: true,
    });
    if (!ok) return;
    if (playingId === item.id) stopPlaying();
    const done = await saveOrSay('The recording was not removed. Try again.', async () => {
      await removeAttachment(item);
      return true;
    });
    if (!done) return;
    await load();
    onChanged?.();
  };

  const keep = async (uri: string) => {
    const now = new Date();
    const when = now.toLocaleString(appLocale(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(/[:/\\]/g, '.');
    const result = await addAttachmentFromFile(ownerKind, ownerId, {
      uri,
      name: `${t('Recording')} ${when}.m4a`,
      mimeType: 'audio/mp4',
      sizeBytes: null,
    });
    if (result.status === 'problem') setMessage(result.message);
    await load();
    onChanged?.();
  };

  if (readOnly && items.length === 0) return null;

  return (
    <View style={styles.container}>
      {infoAlertElement}
      {confirmElement}
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <TouchableOpacity
            style={styles.rowMain}
            onPress={() => void play(item)}
            accessibilityRole="button"
            accessibilityLabel={playingId === item.id ? t('Stop playing') : t('Play {name}', { name: item.name })}
          >
            <Ionicons name={playingId === item.id ? 'stop-circle-outline' : 'play-circle-outline'} size={24} color={tabColor} />
            <Text style={styles.name}>{item.name.replace(/\.m4a$/, '')}</Text>
          </TouchableOpacity>
          {readOnly ? null : (
            <TouchableOpacity onPress={() => void remove(item)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('Remove {name}', { name: item.name })}>
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      ))}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {readOnly ? null : isDesktopApp() ? (
        <TouchableOpacity style={styles.button} onPress={() => announcePhoneOnly(showInfoAlert, 'voice')} accessibilityRole="button">
          <Ionicons name="mic-outline" size={16} color={colors.textPrimary} />
          <Text style={styles.buttonText}>Record Your Voice</Text>
        </TouchableOpacity>
      ) : (
        <RecordButton onStart={stopPlaying} onRecorded={keep} say={showInfoAlert} />
      )}
    </View>
  );
}

// The recorder is made only where it can record.
function RecordButton({
  onStart,
  onRecorded,
  say,
}: {
  onStart: () => void;
  onRecorded: (uri: string) => Promise<void>;
  say: (title: string, message: string) => void;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);

  // The microphone is claimed while it records, so listening for
  // "Lifestead" (components/WakeWordListener.tsx) lets go of it first.
  const claimed = useRef(false);
  const letGo = useCallback(() => {
    if (!claimed.current) return;
    claimed.current = false;
    releaseMic();
  }, []);
  useEffect(() => letGo, [letGo]);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        say(
          'The microphone is off for Lifestead',
          "Recording needs the microphone. Turn it on for Lifestead in the phone's Settings, under Apps, then come back and press Record Your Voice again.",
        );
        return;
      }
      onStart();
      if (!claimed.current) {
        claimed.current = true;
        await claimMic();
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
    } catch (error) {
      console.warn('Recording could not start', error);
      letGo();
      explainNotYet('Recording could not start. Another app may be using the microphone. Close it and try again.');
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('No recording came back');
      await onRecorded(uri);
    } catch (error) {
      console.warn('The recording could not be kept', error);
      explainNotYet('The recording was not kept. Record it again.');
    } finally {
      setRecording(false);
      setBusy(false);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      letGo();
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={() => void (recording ? stop() : start())} disabled={busy} accessibilityRole="button">
      <Ionicons name={recording ? 'stop-circle-outline' : 'mic-outline'} size={16} color={recording ? colors.danger : colors.textPrimary} />
      <Text style={styles.buttonText}>
        {recording ? t('Stop, {time}', { time: clock(state.durationMillis ?? 0) }) : 'Record Your Voice'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { ...typography.body, flex: 1, color: colors.textPrimary, textShadowColor: 'transparent', textShadowRadius: 0 },
  message: { ...typography.caption, color: colors.statusRedOnSurface, textShadowColor: 'transparent', textShadowRadius: 0 },
  button: { ...BUTTON_SECONDARY_COMPACT, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  buttonText: { ...BUTTON_SECONDARY_TEXT },
});
