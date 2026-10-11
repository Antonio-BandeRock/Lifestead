// Listens for "Lifestead" while the app is open (voice step 7, 1.0.66.25).
// The words, the arithmetic and the rules for when to listen are in
// lib/wakeWord.ts; the switch is in Profile (components/WakeWordPanel.tsx).
//
// One session at a time, held only while the setting is on, the app is in
// front, nothing is locked and no other part of the app has the microphone
// (lib/micClaim.ts). A phone listens continuously, on the device only: with
// no offline speech pack it does not listen at all, since sending everything
// said near the phone to a speech service is not something a person turning
// on a wake word would expect. A computer listens with whisper.cpp in short
// stretches (lib/desktop/speechRecognitionShim.ts), reading each stretch of
// talk once.
//
// What is heard without the word is dropped as soon as the recognizer
// settles it. Hearing the word opens Voice Control with whatever followed it
// in the same breath; nothing following means it opens listening.
//
// Draws nothing. Mounted once in app/_layout.tsx.
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { isLockedNow } from '../lib/appLockSession';
import { desktopHearsSpeech, isDesktopApp } from '../lib/desktop/bridge';
import { isLockedCaptureShowing } from '../lib/lockedCaptures';
import { micClaimed, setWakeYield, subscribeMicClaims } from '../lib/micClaim';
import { openQuickAccessSheet } from '../lib/quickAccess';
import { findInstalledLocale } from '../lib/voicePack';
import {
  findWakeWord,
  mergeHeard,
  restartDelay,
  shouldListenForWakeWord,
  WAKE_PAUSE_MS,
  WAKE_WORD,
  type WakeStatus,
} from '../lib/wakeWord';
import { getWakeWordOn, setWakeStatus, useWakeWordOn } from '../lib/wakeWordSetting';

const LANG = 'en-US';
// After a microphone is given back, long enough for its session to finish.
const AFTER_CLAIM_MS = 900;
// After opening Voice Control, long enough for it to claim the microphone.
const AFTER_WAKE_MS = 1500;
// While locked, how often to look again; and how often to look again for a
// microphone or a speech model on a computer.
const LOOK_AGAIN_MS = 3000;
const LOOK_AGAIN_SLOW_MS = 15000;
// The longest a claim waits for a session to end before going ahead.
const YIELD_LIMIT_MS = 4000;

type Ready = { ok: true; lang: string } | { ok: false; status: WakeStatus; lookAgainMs: number | null };

type SpeechResult = { results: { transcript: string }[]; isFinal: boolean };

function makeController(desktop: boolean) {
  let disposed = false;
  let active = false;
  let starting = false;
  let session = 0;
  let acted = false;
  let settled = '';
  let after: string | null = null;
  let lastError: string | null = null;
  let failures = 0;
  let inFront = AppState.currentState === 'active';
  let pauseTimer: ReturnType<typeof setTimeout> | null = null;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;
  let waiters: (() => void)[] = [];

  const clearPause = () => {
    if (pauseTimer) clearTimeout(pauseTimer);
    pauseTimer = null;
  };
  const clearRestart = () => {
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = null;
  };
  const flushWaiters = () => {
    const now = waiters;
    waiters = [];
    now.forEach((resolve) => resolve());
  };

  function wanted(): boolean {
    return (
      !disposed &&
      shouldListenForWakeWord({
        turnedOn: getWakeWordOn(),
        appInFront: inFront,
        locked: isLockedNow() || isLockedCaptureShowing(),
        micInUse: micClaimed(),
      })
    );
  }

  function later(ms: number): void {
    clearRestart();
    restartTimer = setTimeout(() => {
      restartTimer = null;
      kick();
    }, ms);
  }

  function abortSession(): void {
    clearPause();
    if (!active) return;
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // Already ending.
    }
  }

  /** Starts listening when it should and is not already; stops when it should not. */
  function kick(delayMs = 0): void {
    if (disposed) return;
    if (!getWakeWordOn()) {
      clearRestart();
      abortSession();
      setWakeStatus('off');
      return;
    }
    if (!wanted()) {
      clearRestart();
      abortSession();
      setWakeStatus('waiting');
      // Unlocking says nothing to anybody, so look again while in front.
      if (inFront && !micClaimed()) later(LOOK_AGAIN_MS);
      return;
    }
    if (active || starting) return;
    if (delayMs > 0) {
      later(delayMs);
      return;
    }
    clearRestart();
    void begin();
  }

  async function readiness(): Promise<Ready> {
    if (desktop) {
      const speech = typeof window !== 'undefined' ? window.insideStoryDesktop?.speech : undefined;
      if (!speech || !desktopHearsSpeech()) return { ok: false, status: 'not-here', lookAgainMs: null };
      const status = await speech.status();
      if (status.model !== 'ready') return { ok: false, status: 'needs-model', lookAgainMs: LOOK_AGAIN_SLOW_MS };
      return { ok: true, lang: LANG };
    }
    const permission = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!permission.granted) return { ok: false, status: 'no-permission', lookAgainMs: null };
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return { ok: false, status: 'not-here', lookAgainMs: null };
    if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) return { ok: false, status: 'needs-pack', lookAgainMs: null };
    const locales = await ExpoSpeechRecognitionModule.getSupportedLocales({});
    const found = findInstalledLocale(locales.installedLocales, LANG);
    if (!found) return { ok: false, status: 'needs-pack', lookAgainMs: null };
    return { ok: true, lang: found };
  }

  async function begin(): Promise<void> {
    if (active || starting || !wanted()) return;
    starting = true;
    let ready: Ready;
    try {
      ready = await readiness();
    } catch (error) {
      console.warn('[wakeWord] Could not check the recognizer', error);
      starting = false;
      flushWaiters();
      failures += 1;
      later(restartDelay(failures));
      return;
    }
    starting = false;
    if (!wanted()) {
      flushWaiters();
      kick();
      return;
    }
    if (!ready.ok) {
      flushWaiters();
      setWakeStatus(ready.status);
      // A phone's pack or permission is looked at again when the app comes
      // back to the front, which is where somebody fixing it returns from.
      if (ready.lookAgainMs) later(ready.lookAgainMs);
      return;
    }
    session += 1;
    active = true;
    acted = false;
    settled = '';
    after = null;
    lastError = null;
    setWakeStatus('listening');
    try {
      ExpoSpeechRecognitionModule.start({
        lang: ready.lang,
        // A computer reads each stretch of talk once, at its end.
        interimResults: !desktop,
        requiresOnDeviceRecognition: !desktop,
        continuous: !desktop,
        contextualStrings: [WAKE_WORD],
        maxAlternatives: 1,
      });
    } catch (error) {
      console.warn('[wakeWord] Listening did not start', error);
      active = false;
      flushWaiters();
      failures += 1;
      later(restartDelay(failures));
    }
  }

  function openVoiceControl(words: string): void {
    acted = true;
    clearPause();
    openQuickAccessSheet('voiceCommand', words);
  }

  function act(): void {
    if (acted) return;
    const words = after ?? '';
    abortSession();
    openVoiceControl(words);
  }

  function onStart(): void {
    // A claim that came while the session was opening stops it here.
    if (active && !wanted()) abortSession();
  }

  function onResult(event: SpeechResult): void {
    if (!active || acted) return;
    const best = event.results[0]?.transcript ?? '';
    if (!best.trim()) return;
    const whole = mergeHeard(settled, best);
    const found = findWakeWord(whole);
    if (found) after = found.after;
    if (after === null) {
      // Not for the app: dropped once the recognizer has settled it.
      if (event.isFinal) settled = '';
      return;
    }
    if (event.isFinal) settled = whole;
    if (desktop && event.isFinal) {
      act();
      return;
    }
    clearPause();
    pauseTimer = setTimeout(act, WAKE_PAUSE_MS);
  }

  function onEnd(): void {
    if (!active) return;
    active = false;
    clearPause();
    if (!acted && after !== null) openVoiceControl(after);
    flushWaiters();
    const error = lastError;
    if (error === 'not-allowed' || error === 'service-not-allowed') {
      setWakeStatus('no-permission');
      return;
    }
    if (error === 'audio-capture') {
      setWakeStatus('no-microphone');
      later(LOOK_AGAIN_SLOW_MS);
      return;
    }
    if (error === 'language-not-supported') {
      setWakeStatus('needs-pack');
      return;
    }
    const routine = error === null || ['no-speech', 'speech-timeout', 'aborted', 'no-match'].includes(error);
    failures = routine ? 0 : failures + 1;
    kick(acted ? AFTER_WAKE_MS : restartDelay(failures));
  }

  function onError(error: string): void {
    if (!active) return;
    lastError = error;
    // An end follows an error; if one never comes, carry on as if it had.
    const which = session;
    setTimeout(() => {
      if (active && session === which) onEnd();
    }, 1500);
  }

  /** For lib/micClaim.ts: lets go of the microphone and resolves once it has. */
  function yieldMic(): Promise<void> {
    clearRestart();
    if (!active && !starting) return Promise.resolve();
    return new Promise((resolve) => {
      const limit = setTimeout(resolve, YIELD_LIMIT_MS);
      waiters.push(() => {
        clearTimeout(limit);
        resolve();
      });
      abortSession();
    });
  }

  function setInFront(next: boolean): void {
    inFront = next;
    kick();
  }

  function dispose(): void {
    disposed = true;
    clearRestart();
    abortSession();
    flushWaiters();
  }

  return { kick, onStart, onResult, onEnd, onError, yieldMic, setInFront, dispose };
}

export function WakeWordListener() {
  const turnedOn = useWakeWordOn();
  const controllerRef = useRef<ReturnType<typeof makeController> | null>(null);
  if (!controllerRef.current) controllerRef.current = makeController(isDesktopApp());
  const controller = controllerRef.current;

  useSpeechRecognitionEvent('start', () => controller.onStart());
  useSpeechRecognitionEvent('result', (event) => controller.onResult(event));
  useSpeechRecognitionEvent('error', (event) => controller.onError(event.error));
  useSpeechRecognitionEvent('end', () => controller.onEnd());

  useEffect(() => {
    setWakeYield(controller.yieldMic);
    const appState = AppState.addEventListener('change', (state) => controller.setInFront(state === 'active'));
    const claims = subscribeMicClaims(() => controller.kick(micClaimed() ? 0 : AFTER_CLAIM_MS));
    return () => {
      setWakeYield(null);
      appState.remove();
      claims();
      controller.dispose();
    };
  }, [controller]);

  useEffect(() => {
    controller.kick();
  }, [controller, turnedOn]);

  return null;
}
