// Voice Control, from the quick-access menu (1.0.66.11).
//
// Direct instruction, 2026-10-10: "Voice control is for the app, not for the
// phone. I want to make it clear that I do mean they can do everything in the
// app by voice command using plain words, and not just some things."
//
// So this sheet knows no screen. It opens listening; when the person stops
// talking it gets out of the way, asks lib/voiceControlRegistry.ts what is on
// the screen in front (every button by its words, every text box by its label
// or hint, every scrolling view, this tab's lenses, and the tabs), measures
// which of them can be seen, and lets lib/voiceControl.ts decide. A command
// that lands is done and the sheet stays closed. One that names two things
// shows both to pick from, top to bottom as they sit on screen, and one that
// names nothing comes back with what was heard and the shapes to say.
//
// Since 1.0.66.26 it also reaches past the screen in front. Direct
// instruction, 2026-10-10: "Voice Control should be total ability to anything
// in the app." A lens on another tab is found in lib/voiceLensDirectory.ts
// and opened through that tab's route parameter, so "open Horticulture" said
// on Home lands on Garden > Horticulture. A reminder, timer or day counter
// said outright ("remind me tomorrow at 8 to start working") is read by
// lib/spokenCommand.ts and made at once, the same way Quick Capture makes it,
// with Undo keeping the words as a note in Capture. A reminder with no clear
// time is offered the times Quick Capture offers, unless the words name
// something on the screen.
//
// On a computer that cannot listen, the same commands are typed instead.
//
// Saying "Lifestead" opens this sheet too, when that is turned on in Profile
// (components/WakeWordListener.tsx); words said after it in the same breath
// are carried out without the sheet listening again.
//
// Not a Modal, for the same reason as StoreLocationSheet. Mounted in
// app/_layout.tsx before AppKeyboard.
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KEYBOARD_HEIGHT } from '../constants/appKeyboard';
import { colors } from '../constants/colors';
import { useFooterBandHeight, useHubMenuCardSpan, useMenuCardBottom } from '../constants/floatingButton';
import { TAB_ROUTES } from '../constants/tabs';
import { textShadow, typography } from '../constants/typography';
import { useVoiceDictation, type VoiceDictationErrorKind } from '../hooks/useVoiceDictation';
import { desktopHearsSpeech, isDesktopApp } from '../lib/desktop/bridge';
import { DESKTOP_MIC_NOT_ALLOWED, DESKTOP_NO_MICROPHONE } from '../lib/desktop/speechModel';
import { scheduleReminder } from '../lib/db';
import { commandFromSpoken, undoSpokenCommand, writeSpokenCommand, type UnlockDone } from '../lib/lockedCaptures';
import { explainNotYet } from '../lib/notYet';
import { subscribeQuickAccess } from '../lib/quickAccess';
import { describeQuickReminderSet, quickReminderOptions } from '../lib/quickReminder';
import { syncReminderNotifications } from '../lib/reminderNotifications';
import { readSpokenCommand } from '../lib/spokenCommand';
import { describeNotFound, resolveVoiceCommand, VOICE_EXAMPLES, type VoiceElsewhere, type VoiceTarget } from '../lib/voiceControl';
import { VOICE_LENS_DIRECTORY, type VoiceLensPlace } from '../lib/voiceLensDirectory';
import {
  voiceControls,
  voiceFields,
  voiceLensSets,
  voiceScrollers,
  type VoiceNode,
} from '../lib/voiceControlRegistry';
import { AppTextInput } from './AppTextInput';
import { ThumbRow } from './ThumbRow';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY, BUTTON_SECONDARY_TEXT } from '../constants/buttons';

// Shorter than Store Its Location's pause: a command is a few words.
export const COMMAND_PAUSE_MS = 1600;

const MIC_ERRORS: Record<Exclude<VoiceDictationErrorKind, 'no-speech'>, string> = {
  permission: 'The microphone is not allowed for Lifestead. It can be turned on in the phone’s Settings, under this app.',
  unavailable: 'Speech recognition is not available on this phone right now. Type the command instead.',
  other: 'Something went wrong listening. Tap the microphone to try again.',
};

type Box = { x: number; y: number; width: number; height: number };
// `stay` keeps the sheet open after the pick, for a reminder time, whose
// answer is said here.
type Choice = { key: string; name: string; where: string; run: () => void; stay?: boolean };
type Made = { heading: string; done: UnlockDone; undone: boolean };

const TAB_TITLE = new Map<string, string>(TAB_ROUTES.map((tab) => [String(tab.path), tab.title]));

// Every lens on a tab other than the one in front. Home's lenses are mostly
// ways to another tab's lens, so one whose name a lens elsewhere also has is
// left to that tab, and Home's repeats are said once.
function lensesElsewhere(currentPath: string): { targets: VoiceElsewhere[]; places: Map<string, VoiceLensPlace> } {
  const places = new Map<string, VoiceLensPlace>();
  const targets: VoiceElsewhere[] = [];
  const namedOffHome = new Set(VOICE_LENS_DIRECTORY.filter((place) => place.tab !== '/').map((place) => place.label.toLowerCase()));
  const homeSeen = new Set<string>();
  for (const place of VOICE_LENS_DIRECTORY) {
    if (place.tab === currentPath) continue;
    const tabTitle = TAB_TITLE.get(place.tab);
    if (!tabTitle) continue;
    if (place.tab === '/') {
      const label = place.label.toLowerCase();
      if (namedOffHome.has(label) || homeSeen.has(label)) continue;
      homeSeen.add(label);
    }
    const id = `${place.tab}|${place.key}`;
    places.set(id, place);
    targets.push({ id, name: place.label, tab: tabTitle });
  }
  return { targets, places };
}

function measure(node: VoiceNode): Promise<Box | null | 'unknown'> {
  return new Promise((resolve) => {
    if (!node || typeof node.measureInWindow !== 'function') {
      resolve(node ? 'unknown' : null);
      return;
    }
    const timer = setTimeout(() => resolve(null), 400);
    try {
      node.measureInWindow((x, y, width, height) => {
        clearTimeout(timer);
        resolve({ x, y, width, height });
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 80));
}

export function VoiceCommandSheet() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const footerHeight = useFooterBandHeight();
  const menuBottom = useMenuCardBottom();
  const { left, width } = useHubMenuCardSpan();
  const desktop = isDesktopApp();
  // A computer that cannot listen (a Mac, or an installer from before
  // 1.0.66.24) types only; Windows listens with whisper.cpp and keeps the
  // box to type in as well.
  const noMic = desktop && !desktopHearsSpeech();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [heard, setHeard] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [micProblem, setMicProblem] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [typingFocused, setTypingFocused] = useState(false);
  const [made, setMade] = useState<Made | null>(null);
  const openRef = useRef(false);
  openRef.current = open;
  const windowRef = useRef({ windowWidth, windowHeight });
  windowRef.current = { windowWidth, windowHeight };

  const { status, start, stop } = useVoiceDictation({
    pauseMs: COMMAND_PAUSE_MS,
    onResult: (transcript, isFinal) => {
      if (!openRef.current) return;
      setHeard(transcript);
      if (isFinal) void carryOut(transcript);
    },
    onError: (kind) => {
      if (kind === 'no-speech') return;
      setMicProblem(
        desktop && kind === 'permission' ? DESKTOP_MIC_NOT_ALLOWED : desktop && kind === 'unavailable' ? DESKTOP_NO_MICROPHONE : MIC_ERRORS[kind],
      );
    },
  });
  const listening = status === 'listening';

  function reset() {
    setHeard('');
    setMessage(null);
    setShowHelp(false);
    setChoices([]);
    setMicProblem(null);
    setTyped('');
    setTypingFocused(false);
    setMade(null);
  }

  function listen() {
    if (noMic) return;
    reset();
    void start();
  }

  function close() {
    stop();
    setWorking(false);
    setOpen(false);
  }

  function answer(text: string | null, help = false, list: Choice[] = []) {
    setMessage(text);
    setShowHelp(help);
    setChoices(list);
    setWorking(false);
  }

  // A reminder, timer or day counter said outright is made before anything
  // on the screen is looked at, the way Quick Capture makes one.
  async function makeSpoken(spoken: string, saidAt: Date): Promise<boolean> {
    const read = readSpokenCommand(spoken, saidAt);
    if (read.kind !== 'reminder' && read.kind !== 'timer' && read.kind !== 'days') return false;
    const { command, kept } = commandFromSpoken(read, saidAt);
    if (!command) return false;
    try {
      const done = await writeSpokenCommand(command, spoken, saidAt);
      void syncReminderNotifications();
      setMade({ heading: kept.heading, done, undone: false });
      answer(null);
    } catch (error) {
      answer(error instanceof Error && error.message ? error.message : 'It could not be made.');
    }
    return true;
  }

  async function undoMade() {
    if (!made || made.undone) return;
    try {
      await undoSpokenCommand(made.done);
      setMade({ ...made, undone: true });
    } catch (error) {
      answer(error instanceof Error && error.message ? error.message : 'It could not be undone.');
    }
  }

  function reminderTimes(spoken: string, saidAt: Date): boolean {
    const read = readSpokenCommand(spoken, saidAt);
    if (read.kind !== 'reminderAsk') return false;
    const seen = new Set<string>();
    const list: Choice[] = [];
    for (const offer of [...read.offers, ...quickReminderOptions(saidAt)]) {
      if (seen.has(offer.scheduledFor)) continue;
      seen.add(offer.scheduledFor);
      list.push({
        key: offer.scheduledFor,
        name: offer.label,
        where: `Remind me: ${read.title}`,
        stay: true,
        run: () => {
          void (async () => {
            try {
              await scheduleReminder({ title: read.title, scheduledFor: offer.scheduledFor, repeat: read.repeat });
              void syncReminderNotifications();
              answer(`Reminder set: ${read.title}. ${describeQuickReminderSet(offer.scheduledFor, new Date())}`);
            } catch (error) {
              answer(error instanceof Error && error.message ? error.message : 'The reminder could not be set.');
            }
          })();
        },
      });
    }
    answer(`${read.unclear} Pick when to be reminded.`, false, list);
    return true;
  }

  async function carryOut(spoken: string) {
    stop();
    setMade(null);
    const saidAt = new Date();
    if (await makeSpoken(spoken, saidAt)) return;
    // Out of the way first, so this sheet's own buttons are not on screen
    // when the screen is read.
    setWorking(true);
    await nextFrame();
    const { windowWidth: w, windowHeight: h } = windowRef.current;
    const onScreen = (box: Box) => box.width > 0 && box.height > 0 && box.x < w && box.x + box.width > 0 && box.y < h && box.y + box.height > 0;

    // Every button and box on the screen in front with a name, measured:
    // seen ones first, ones scrolled out of sight second, ones with no size
    // (inside something folded shut) never.
    const controls = voiceControls().filter((entry) => entry.focused() && entry.canPress());
    const controlBoxes = await Promise.all(controls.map((entry) => measure(entry.node())));
    const fields = voiceFields().filter((entry) => entry.focused() && entry.canType());
    const fieldBoxes = await Promise.all(fields.map((entry) => measure(entry.node())));
    // A box of no size is inside something folded shut; one that could not
    // be measured at all is left out the same way.
    const drawn = (box: Box | null | 'unknown'): box is Box | 'unknown' =>
      box !== null && (box === 'unknown' || (box.width > 0 && box.height > 0));
    type Placed = VoiceTarget & { y: number; seen: boolean; run: () => void };
    const placedControls: Placed[] = [];
    for (const [index, entry] of controls.entries()) {
      const box = controlBoxes[index];
      const name = entry.name().trim();
      if (!name || !drawn(box)) continue;
      placedControls.push({
        id: `c${index}`,
        name,
        y: box === 'unknown' ? 0 : box.y,
        seen: box === 'unknown' || onScreen(box),
        run: () => entry.press(),
      });
    }
    const placedFields: (Placed & { setText: (text: string) => void })[] = [];
    for (const [index, entry] of fields.entries()) {
      const box = fieldBoxes[index];
      const name = entry.name().trim();
      if (!name || !drawn(box)) continue;
      placedFields.push({
        id: `f${index}`,
        name,
        y: box === 'unknown' ? 0 : box.y,
        seen: box === 'unknown' || onScreen(box),
        run: () => entry.focus(),
        setText: (text) => entry.setText(text),
      });
    }
    const lensRuns = new Map<string, () => void>();
    const lenses: VoiceTarget[] = [];
    voiceLensSets()
      .filter((set) => set.focused())
      .forEach((set, setIndex) => {
        for (const option of set.options()) {
          const id = `l${setIndex}:${option.key}`;
          lenses.push({ id, name: option.label });
          lensRuns.set(id, () => set.select(option.key));
        }
      });
    const tabs: VoiceTarget[] = [...TAB_ROUTES.map((tab, index) => ({ id: `t${index}`, name: tab.title })), { id: 'profile', name: 'Profile' }];
    const currentPath = pathRef.current;
    const currentTab = TAB_TITLE.get(currentPath);
    const { targets: elsewhere, places } = lensesElsewhere(currentPath);

    const seenFirst = (list: Placed[]) => [...list.filter((item) => item.seen), ...list.filter((item) => !item.seen)];
    let command = resolveVoiceCommand(spoken, {
      tabs,
      lenses,
      controls: placedControls.filter((item) => item.seen),
      fields: placedFields.filter((item) => item.seen),
      currentTab,
      elsewhere,
    });
    if (command.kind === 'notFound' || (command.kind === 'type' && command.fieldIds.length === 0)) {
      command = resolveVoiceCommand(spoken, {
        tabs,
        lenses,
        controls: seenFirst(placedControls),
        fields: seenFirst(placedFields),
        currentTab,
        elsewhere,
      });
    }
    if (command.kind === 'notFound' && reminderTimes(spoken, saidAt)) return;
    const openElsewhere = (id: string) => {
      const place = places.get(id);
      if (!place) return;
      router.navigate({ pathname: place.tab, params: { [place.param]: place.key } } as Href);
    };

    const whereOnScreen = (y: number) => (y < h / 3 ? 'Near the top' : y < (2 * h) / 3 ? 'In the middle' : 'Near the bottom');

    switch (command.kind) {
      case 'help':
        answer(null, true);
        return;
      case 'back':
        if (router.canGoBack()) {
          router.back();
          close();
        } else {
          answer('This is as far back as it goes.');
        }
        return;
      case 'scroll': {
        const scrollers = voiceScrollers().filter((entry) => entry.focused() && entry.vertical());
        const boxes = await Promise.all(scrollers.map((entry) => measure(entry.node())));
        let best = -1;
        let bestArea = 0;
        let bestHeight = h;
        boxes.forEach((box, index) => {
          if (box === null) return;
          if (box === 'unknown') {
            if (best === -1) best = index;
            return;
          }
          if (!onScreen(box)) return;
          const area = box.width * box.height;
          if (area > bestArea) {
            bestArea = area;
            best = index;
            bestHeight = box.height;
          }
        });
        if (best === -1) {
          answer('Nothing on this screen scrolls.');
          return;
        }
        scrollers[best].scroll(command.move, bestHeight);
        close();
        return;
      }
      case 'tab': {
        const path: Href = command.id === 'profile' ? '/profile' : TAB_ROUTES[Number(command.id.slice(1))].path;
        close();
        router.navigate(path);
        return;
      }
      case 'lens': {
        close();
        lensRuns.get(command.id)?.();
        return;
      }
      case 'elsewhere': {
        if (command.ids.length === 1) {
          close();
          openElsewhere(command.ids[0]);
          return;
        }
        const list = command.ids.map((id) => {
          const target = elsewhere.find((item) => item.id === id);
          return { key: id, name: target?.name ?? id, where: `On ${target?.tab ?? 'another tab'}`, run: () => openElsewhere(id) };
        });
        answer(`${list.length} lenses are called that. Pick the one you mean.`, false, list);
        return;
      }
      case 'press': {
        const matched = placedControls.filter((item) => command.ids.includes(item.id));
        if (matched.length === 1) {
          close();
          matched[0].run();
          return;
        }
        const list = [...matched]
          .sort((a, b) => a.y - b.y)
          .map((item) => ({
            key: item.id,
            name: item.name,
            where: item.seen ? whereOnScreen(item.y) : 'Further down the screen',
            run: item.run,
          }));
        answer(`${list.length} things are called that. Pick the one you mean.`, false, list);
        return;
      }
      case 'type': {
        const matched = placedFields.filter((item) => command.fieldIds.includes(item.id));
        if (matched.length === 0) {
          answer('There is no box to type into on this screen.');
          return;
        }
        if (matched.length === 1) {
          close();
          matched[0].setText(command.text);
          return;
        }
        const list = [...matched]
          .sort((a, b) => a.y - b.y)
          .map((item) => ({
            key: item.id,
            name: item.name,
            where: item.seen ? whereOnScreen(item.y) : 'Further down the screen',
            run: () => item.setText(command.text),
          }));
        answer(`Which box should “${command.text}” go in?`, false, list);
        return;
      }
      case 'notFound':
        answer(describeNotFound(command.heard));
        return;
    }
  }

  useEffect(
    () =>
      subscribeQuickAccess((sheet, spoken) => {
        if (sheet !== 'voiceCommand') return;
        reset();
        setWorking(false);
        setOpen(true);
        // "Lifestead, go to Garden" arrives with the command already said.
        const said = spoken?.trim() ?? '';
        if (said) {
          setHeard(said);
          void carryOut(said);
          return;
        }
        if (!noMic) void start();
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!open) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || working) return null;

  const bottom = !desktop && typingFocused ? footerHeight + KEYBOARD_HEIGHT + 8 : menuBottom;
  const maxHeight = Math.max(160, windowHeight - bottom - insets.top - 16);

  function doTyped() {
    if (!typed.trim()) {
      explainNotYet('Type a command in the box first, such as Go to Garden.');
      return;
    }
    setHeard(typed);
    void carryOut(typed);
  }

  function pick(choice: Choice) {
    if (!choice.stay) close();
    choice.run();
  }

  const micCaption = listening
    ? heard
      ? 'Listening. Stops a moment after you finish.'
      : 'Listening. Say what to do.'
    : 'Tap the microphone and say what to do.';

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={close} accessible={false} />
      <View style={[styles.sheet, { left, width, bottom, maxHeight }]}>
        <View style={styles.titleRow}>
          <Ionicons name="megaphone-outline" size={20} color={colors.textPrimary} style={textShadow} />
          <Text style={styles.title}>Voice Control</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {choices.length === 0 && !made ? (
            <View style={styles.exampleBox}>
              <Text style={styles.caption}>{showHelp ? 'Anything on the screen can be said by its name:' : 'Say it like this:'}</Text>
              {(showHelp ? VOICE_EXAMPLES : VOICE_EXAMPLES.slice(0, 3)).map((example) => (
                <Text key={example} style={styles.example}>
                  “{example}”
                </Text>
              ))}
              {showHelp ? (
                <Text style={styles.caption}>
                  A button answers to the words on it, a box to the words written in it, and a tab or lens to its name, on this tab or any other. A reminder, timer or day counter can be said whole.
                </Text>
              ) : null}
            </View>
          ) : null}
          {!noMic ? (
            <View style={styles.micArea}>
              <TouchableOpacity
                style={[styles.mic, listening ? styles.micListening : null]}
                activeOpacity={0.85}
                onPress={listening ? stop : listen}
                accessibilityRole="button"
                accessibilityLabel={listening ? 'Stop listening' : 'Say a command'}
              >
                <Ionicons name={listening ? 'mic' : 'mic-outline'} size={34} color={listening ? colors.textOnPrimary : colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.caption}>{micCaption}</Text>
            </View>
          ) : null}
          {desktop ? (
            <AppTextInput
              style={styles.input}
              placeholder="Type a command (Go to Garden)"
              placeholderTextColor={colors.textMuted}
              value={typed}
              onChangeText={setTyped}
              onFocus={() => setTypingFocused(true)}
              returnKeyType="go"
              onSubmitEditing={doTyped}
              disableKeyboardLift
              voice={false}
            />
          ) : null}
          {heard ? (
            <View style={styles.heardBox}>
              <Text style={styles.heardLabel}>Heard</Text>
              <Text style={styles.body}>{heard}</Text>
            </View>
          ) : null}
          {made ? (
            <View style={styles.heardBox}>
              <View style={styles.titleRow}>
                <Ionicons name={made.undone ? 'arrow-undo' : 'checkmark-circle'} size={18} color={colors.primary} />
                <Text style={styles.choiceName}>{made.undone ? 'Undone, kept as a note' : made.heading}</Text>
              </View>
              <Text style={styles.body}>{made.undone ? made.done.text : made.done.line}</Text>
              {made.undone ? <Text style={styles.caption}>The words are waiting in Capture.</Text> : null}
              {made.undone ? null : (
                <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={() => void undoMade()}>
                  <Text style={styles.secondaryText}>Undo</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
          {message ? <Text style={styles.problem}>{message}</Text> : null}
          {micProblem ? <Text style={styles.problem}>{micProblem}</Text> : null}
          {choices.map((choice) => (
            <TouchableOpacity key={choice.key} style={styles.choice} activeOpacity={0.85} onPress={() => pick(choice)}>
              <Text style={styles.choiceName}>{choice.name}</Text>
              <Text style={styles.caption}>{choice.where}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ThumbRow primary="last" style={styles.actions}>
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={close}>
            <Text style={styles.secondaryText}>Close</Text>
          </TouchableOpacity>
          {desktop ? (
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={doTyped}>
              <Text style={styles.primaryText}>Do It</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={() => answer(null, true)}>
              <Text style={styles.secondaryText}>What Can I Say</Text>
            </TouchableOpacity>
          )}
        </ThumbRow>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute',
    backgroundColor: colors.menuSurface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...typography.bodyEmphasis, fontSize: 16, fontWeight: '400', color: colors.textPrimary, ...textShadow },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: 10 },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  body: { ...typography.body, color: colors.textPrimary, ...textShadow },
  problem: { ...typography.caption, color: colors.accent, ...textShadow },
  exampleBox: {
    gap: 2,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  example: { ...typography.body, color: colors.textPrimary, ...textShadow },
  micArea: { alignItems: 'center', gap: 6 },
  mic: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  micListening: { backgroundColor: colors.primary },
  heardBox: { gap: 2, padding: 10, borderRadius: 10, backgroundColor: colors.surfaceMuted },
  heardLabel: { ...typography.caption, color: colors.textMuted, ...textShadow },
  choice: {
    gap: 2,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceName: { ...typography.body, color: colors.textPrimary, ...textShadow },
  input: {
    ...typography.body,
    ...textShadow,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceMuted,
  },
  actions: { flexDirection: 'row', gap: 12 },
  primaryButton: { ...BUTTON_PRIMARY, flex: 1 },
  primaryText: { ...BUTTON_PRIMARY_TEXT },
  secondaryButton: { ...BUTTON_SECONDARY, flex: 1 },
  secondaryText: { ...BUTTON_SECONDARY_TEXT },
});
