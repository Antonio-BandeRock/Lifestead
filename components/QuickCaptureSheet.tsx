// The quick voice note, 1.0.61.14 (2026-10-05). Direct request: "a quick
// access button for capturing a voice record note that gets transcripted so
// they can act on it later in the app, placing it where it would need to go."
//
// Opened from the quick-access menu on the thumb side
// (components/QuickAccessButton.tsx) since 1.0.66.6, when its own edge tab
// joined that menu. Choosing Voice Note starts listening straight away over
// whatever screen is open; the words appear as they are heard; when speech
// stops the note is saved to the Capture inbox as a spoken note with nothing
// more to press. Sorting stays the inbox's rule: nothing is put anywhere by
// itself. Where lib/captureSuggest.ts has a good guess, the sheet offers it
// as one tap, and Open Capture is there for anything more.
//
// Saving the moment speech stops is deliberate. The point is getting a thought
// out of a head in the few seconds before it is gone, and a Save button is one
// more thing to remember. Nothing is lost by it: a note saved by mistake is
// deleted in the inbox like any other.
//
// Commands (voice step 3, 1.0.66.21). "Remind me to call the pharmacy
// tomorrow at 10", "set a timer for 20 minutes" and "count down 30 days" are
// made straight away by lib/spokenCommand.ts's reading, the same as over the
// lock screen, with an Undo that keeps the words as a note instead. A
// reminder with no clear time is kept as a note and offers the times it
// could mean, and a note that names a day offers a reminder for it: nothing
// is set from a guess.
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { useFooterBandHeight } from '../constants/floatingButton';
import { textShadow, typography } from '../constants/typography';
import { useVoiceDictation, type VoiceDictationErrorKind } from '../hooks/useVoiceDictation';
import { createCaptureNote, deleteCaptureNote, setCaptureNoteDestination } from '../lib/captureNotesDb';
import { scheduleReminder } from '../lib/db';
import { commandFromSpoken, undoSpokenCommand, writeSpokenCommand, type UnlockDone } from '../lib/lockedCaptures';
import { describeQuickReminderSet, quickReminderOptions } from '../lib/quickReminder';
import { syncReminderNotifications } from '../lib/reminderNotifications';
import type { RepeatConfig } from '../lib/repeatRule';
import { readSpokenCommand, type SpokenWhen } from '../lib/spokenCommand';
import { suggestDestinations, suggestionLine, type CaptureSuggestion } from '../lib/captureSuggest';
import { loadSuggestModel } from '../lib/captureSuggestDb';
import { desktopHearsSpeech } from '../lib/desktop/bridge';
import { announcePhoneOnly } from '../lib/desktop/phoneOnly';
import { useNavigationHand } from '../lib/navigationHand';
import { explainNotYet } from '../lib/notYet';
import { subscribeQuickAccess } from '../lib/quickAccess';
import { useInfoAlert } from './InfoAlert';
import { ThumbRow } from './ThumbRow';

const GAP_ABOVE_FOOTER = 8;

type Stage =
  | { kind: 'listening' }
  | { kind: 'saving' }
  | {
      kind: 'saved';
      id: string;
      text: string;
      suggestions: CaptureSuggestion[];
      placed: string | null;
      /** Times a reminder for this note could be set for, when the words named one. */
      offers: SpokenWhen[];
      /** What a reminder from the offers would be called, and how it repeats. */
      reminderTitle: string;
      repeat: RepeatConfig | null;
      /** Why a reminder that was asked for was not set. */
      unclear: string | null;
    }
  | { kind: 'reminded'; line: string }
  | { kind: 'made'; heading: string; done: UnlockDone; undone: boolean }
  | { kind: 'nothing' }
  | { kind: 'failed'; message: string };

const ERROR_WORDS: Record<Exclude<VoiceDictationErrorKind, 'no-speech'>, string> = {
  permission: 'The microphone is not allowed for this app. It can be turned on in the phone settings, under Apps.',
  unavailable: 'Speech recognition is not available on this phone right now.',
  other: 'Something went wrong while listening. Try again.',
};

export function QuickCaptureSheet() {
  const hand = useNavigationHand();
  const footerHeight = useFooterBandHeight();
  const router = useRouter();
  const [showInfoAlert, infoAlertElement] = useInfoAlert();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'listening' });
  const [heard, setHeard] = useState('');
  const savedOnce = useRef(false);
  const bottom = footerHeight + GAP_ABOVE_FOOTER;

  async function save(text: string) {
    if (savedOnce.current) return;
    savedOnce.current = true;
    setStage({ kind: 'saving' });
    try {
      const saidAt = new Date();
      const read = readSpokenCommand(text, saidAt);
      const { command, kept } = commandFromSpoken(read, saidAt);
      if (command) {
        const done = await writeSpokenCommand(command, text, saidAt);
        void syncReminderNotifications();
        setStage({ kind: 'made', heading: kept.heading, done, undone: false });
        return;
      }
      const id = await createCaptureNote(text, 'spoken');
      if (!id) {
        setStage({ kind: 'nothing' });
        return;
      }
      let suggestions: CaptureSuggestion[] = [];
      try {
        suggestions = suggestDestinations(text, await loadSuggestModel());
      } catch {
        // A guess is a courtesy; the note is saved either way.
      }
      const offers =
        read.kind === 'reminderAsk'
          ? [...read.offers, ...quickReminderOptions(saidAt)]
          : read.kind === 'note'
            ? read.offers
            : [];
      setStage({
        kind: 'saved',
        id,
        text,
        suggestions,
        placed: null,
        offers,
        reminderTitle: read.kind === 'reminderAsk' ? read.title : text,
        repeat: read.kind === 'reminderAsk' ? read.repeat : null,
        unclear: read.kind === 'reminderAsk' ? read.unclear : null,
      });
    } catch (error) {
      savedOnce.current = false;
      setStage({ kind: 'failed', message: error instanceof Error && error.message ? error.message : 'The note could not be saved.' });
    }
  }

  const { status, start, stop } = useVoiceDictation({
    onResult: (transcript, isFinal) => {
      setHeard(transcript);
      if (isFinal) {
        const text = transcript.trim();
        if (text) void save(text);
        else setStage({ kind: 'nothing' });
      }
    },
    onError: (kind) => {
      if (kind === 'no-speech') {
        setStage({ kind: 'nothing' });
        return;
      }
      setStage({ kind: 'failed', message: ERROR_WORDS[kind] });
    },
  });

  function begin() {
    savedOnce.current = false;
    setHeard('');
    setStage({ kind: 'listening' });
    void start();
  }

  function openSheet() {
    if (!desktopHearsSpeech() && announcePhoneOnly(showInfoAlert, 'voice')) return;
    setOpen(true);
    begin();
  }

  function close() {
    if (status === 'listening') stop();
    setOpen(false);
  }

  // Stopping by hand keeps what was heard: the recognizer's last partial is
  // saved, since pressing Done means "that is the note".
  function finishNow() {
    const text = heard.trim();
    if (!text) {
      explainNotYet('Nothing has been heard yet. Say the note, or press Cancel.');
      return;
    }
    if (status === 'listening') stop();
    void save(text);
  }

  async function place(suggestion: CaptureSuggestion) {
    if (stage.kind !== 'saved') return;
    try {
      await setCaptureNoteDestination(stage.id, suggestion.key);
      setStage({ ...stage, placed: suggestion.label });
    } catch (error) {
      setStage({ kind: 'failed', message: error instanceof Error && error.message ? error.message : 'The note could not be moved.' });
    }
  }

  // A reminder from one of the offered times. The note it came from goes,
  // since the words now live on the reminder and there is nothing to sort.
  async function remindAt(offer: SpokenWhen) {
    if (stage.kind !== 'saved') return;
    try {
      await scheduleReminder({
        title: stage.reminderTitle,
        scheduledFor: offer.scheduledFor,
        ...(stage.repeat ? { repeat: stage.repeat } : {}),
      });
      await deleteCaptureNote(stage.id);
      void syncReminderNotifications();
      setStage({ kind: 'reminded', line: `${stage.reminderTitle}. ${describeQuickReminderSet(offer.scheduledFor, new Date())}` });
    } catch (error) {
      setStage({ kind: 'failed', message: error instanceof Error && error.message ? error.message : 'The reminder could not be set.' });
    }
  }

  async function undoMade() {
    if (stage.kind !== 'made' || stage.undone) return;
    try {
      await undoSpokenCommand(stage.done);
      setStage({ ...stage, undone: true });
    } catch (error) {
      setStage({ kind: 'failed', message: error instanceof Error && error.message ? error.message : 'It could not be undone.' });
    }
  }

  function openInbox() {
    close();
    router.push('/capture');
  }

  // The listener is subscribed once, so it reaches the latest openSheet
  // through a ref rather than the one from the first render.
  const openSheetRef = useRef(openSheet);
  openSheetRef.current = openSheet;
  useEffect(
    () =>
      subscribeQuickAccess((sheet) => {
        if (sheet === 'voiceNote') openSheetRef.current();
      }),
    [],
  );

  const sheetSide = hand === 'right' ? { right: 8 } : { left: 8 };

  return (
    <>
      <Modal visible={open} transparent animationType="none" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} accessible={false}>
          <Pressable style={[styles.sheet, { bottom }, sheetSide]} onPress={() => undefined} accessible={false}>
            {stage.kind === 'listening' ? (
              <>
                <View style={styles.titleRow}>
                  <Ionicons name="mic" size={18} color={colors.primary} />
                  <Text style={styles.title}>{status === 'listening' ? 'Listening' : 'Starting the microphone'}</Text>
                </View>
                <Text style={heard ? styles.heard : styles.hint}>
                  {heard || 'Say the note. It is saved to Capture as soon as you stop talking.'}
                </Text>
                <ThumbRow primary="last" style={styles.actions}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={close}>
                    <Text style={styles.secondaryText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={finishNow}>
                    <Text style={styles.primaryText}>Done</Text>
                  </TouchableOpacity>
                </ThumbRow>
              </>
            ) : null}
            {stage.kind === 'saving' ? <Text style={styles.hint}>Saving…</Text> : null}
            {stage.kind === 'saved' ? (
              <>
                <View style={styles.titleRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <Text style={styles.title}>{stage.placed ? `Saved under ${stage.placed}` : 'Saved to Capture'}</Text>
                </View>
                <Text style={styles.heard}>{stage.text}</Text>
                {!stage.placed
                  ? stage.suggestions.map((suggestion) => (
                      <TouchableOpacity key={suggestion.key} style={styles.suggestion} onPress={() => void place(suggestion)}>
                        <Ionicons name="arrow-forward" size={16} color={colors.textPrimary} />
                        <Text style={styles.suggestionText}>{suggestionLine(suggestion)}</Text>
                      </TouchableOpacity>
                    ))
                  : null}
                {!stage.placed && stage.suggestions.length === 0 && stage.offers.length === 0 ? (
                  <Text style={styles.hint}>It is waiting in Capture to be sorted whenever suits.</Text>
                ) : null}
                {!stage.placed && stage.unclear ? <Text style={styles.hint}>{stage.unclear}</Text> : null}
                {!stage.placed && stage.offers.length > 0 ? (
                  <>
                    <Text style={styles.hint}>{stage.unclear ? 'Pick the time it should be:' : 'Or have the phone say it:'}</Text>
                    <View style={styles.offerRow}>
                      {stage.offers.map((offer) => (
                        <TouchableOpacity
                          key={offer.scheduledFor + offer.label}
                          style={styles.suggestion}
                          onPress={() => void remindAt(offer)}
                        >
                          <Ionicons name="alarm-outline" size={16} color={colors.textPrimary} />
                          <Text style={styles.suggestionText}>{offer.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : null}
                <ThumbRow primary="first" style={styles.actions}>
                  <TouchableOpacity style={styles.primaryButton} onPress={close}>
                    <Text style={styles.primaryText}>Done</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryButton} onPress={openInbox}>
                    <Text style={styles.secondaryText}>Open Capture</Text>
                  </TouchableOpacity>
                </ThumbRow>
              </>
            ) : null}
            {stage.kind === 'reminded' ? (
              <>
                <View style={styles.titleRow}>
                  <Ionicons name="alarm" size={18} color={colors.primary} />
                  <Text style={styles.title}>Reminder set</Text>
                </View>
                <Text style={styles.heard}>{stage.line}</Text>
                <ThumbRow primary="first" style={styles.actions}>
                  <TouchableOpacity style={styles.primaryButton} onPress={close}>
                    <Text style={styles.primaryText}>Done</Text>
                  </TouchableOpacity>
                </ThumbRow>
              </>
            ) : null}
            {stage.kind === 'made' ? (
              <>
                <View style={styles.titleRow}>
                  <Ionicons name={stage.undone ? 'arrow-undo' : 'checkmark-circle'} size={18} color={colors.primary} />
                  <Text style={styles.title}>{stage.undone ? 'Undone, kept as a note' : stage.heading}</Text>
                </View>
                <Text style={styles.heard}>{stage.undone ? stage.done.text : stage.done.line}</Text>
                {stage.undone ? <Text style={styles.hint}>The words are waiting in Capture.</Text> : null}
                <ThumbRow primary="first" style={styles.actions}>
                  <TouchableOpacity style={styles.primaryButton} onPress={close}>
                    <Text style={styles.primaryText}>Done</Text>
                  </TouchableOpacity>
                  {stage.undone ? null : (
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => void undoMade()}>
                      <Text style={styles.secondaryText}>Undo</Text>
                    </TouchableOpacity>
                  )}
                </ThumbRow>
              </>
            ) : null}
            {stage.kind === 'nothing' || stage.kind === 'failed' ? (
              <>
                <Text style={styles.title}>{stage.kind === 'nothing' ? 'Nothing was heard' : 'Not saved'}</Text>
                <Text style={styles.hint}>
                  {stage.kind === 'nothing' ? 'No words came through, so nothing was saved.' : stage.message}
                </Text>
                <ThumbRow primary="first" style={styles.actions}>
                  <TouchableOpacity style={styles.primaryButton} onPress={begin}>
                    <Text style={styles.primaryText}>Try Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryButton} onPress={close}>
                    <Text style={styles.secondaryText}>Close</Text>
                  </TouchableOpacity>
                </ThumbRow>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
      {infoAlertElement}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute',
    left: 8,
    right: 8,
    padding: 14,
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...typography.bodyEmphasis, color: colors.textPrimary, fontWeight: '400', ...textShadow },
  heard: { ...typography.body, color: colors.textPrimary, ...textShadow },
  hint: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  suggestionText: { ...typography.caption, color: colors.textPrimary, flexShrink: 1, ...textShadow },
  offerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  primaryButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, backgroundColor: colors.primary },
  primaryText: { ...typography.bodyEmphasis, color: colors.textOnPrimary, fontWeight: '400' },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryText: { ...typography.bodyEmphasis, color: colors.textPrimary, fontWeight: '400', ...textShadow },
});
