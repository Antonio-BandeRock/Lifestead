// Saying "Lifestead" to start a command (voice step 7, 1.0.66.25).
//
// Decided 2026-10-10: voice control is for the app, not the phone, so the
// word is heard only while Lifestead is open on the screen and unlocked,
// never with it closed. Hearing it opens Voice Control
// (components/VoiceCommandSheet.tsx); words said after it in the same breath
// ("Lifestead, go to Garden") are carried in and done without a second
// listen. Off until the person turns it on in Profile, on each device
// separately (lib/wakeWordSetting.ts).
//
// This file is the arithmetic and the words, with no React and no native
// module, so scripts/test_wake_word.js checks it. The listening itself is
// components/WakeWordListener.tsx.

export const WAKE_WORD = 'Lifestead';

// After the word, how long a pause means the person has finished. The same
// as Voice Control's own pause, since what follows is a command.
export const WAKE_PAUSE_MS = 1600;

// The ways a recognizer writes the word: lifestead, life stead, life-stead,
// lifested, life sted, lifesteed. "Lifestyle" is not one of them.
const WAKE_PATTERN = /\blife[\s-]?ste(?:a|e)?d\b/i;

/**
 * Null when the word is not in what was heard. Otherwise the words after
 * its last mention, with the comma or full stop after it dropped, which is
 * empty when the person said the word alone.
 */
export function findWakeWord(heard: string): { after: string } | null {
  const pattern = new RegExp(WAKE_PATTERN.source, 'gi');
  let last: RegExpExecArray | null = null;
  for (let match = pattern.exec(heard); match; match = pattern.exec(heard)) last = match;
  if (!last) return null;
  const after = heard
    .slice(last.index + last[0].length)
    .replace(/^[\s,.:;!?'"]+/, '')
    .trim();
  return { after };
}

/**
 * Android hands back each stretch of speech on its own and iOS the whole so
 * far, so a stretch that does not start with what is settled is added to it.
 */
export function mergeHeard(settled: string, latest: string): string {
  const next = latest.trim();
  if (!settled) return next;
  return next.toLowerCase().startsWith(settled.toLowerCase()) ? next : `${settled} ${next}`;
}

/**
 * How long to wait before listening again. A session that ended on its own
 * starts again almost at once; one that failed waits longer each time in a
 * row, so a broken recognizer is not hammered.
 */
export function restartDelay(failuresInARow: number): number {
  if (failuresInARow <= 0) return 300;
  return Math.min(30000, 1000 * 3 ** (failuresInARow - 1));
}

export type WakeListenMoment = {
  turnedOn: boolean;
  /** The app is in front of the person, not put away. */
  appInFront: boolean;
  /** App Lock is on and nobody has unlocked yet. */
  locked: boolean;
  /** Another part of the app has the microphone (a mic button, a recording). */
  micInUse: boolean;
};

/** Whether listening for the word should be running right now. */
export function shouldListenForWakeWord(moment: WakeListenMoment): boolean {
  return moment.turnedOn && moment.appInFront && !moment.locked && !moment.micInUse;
}

export type WakeStatus =
  | 'off'
  | 'listening'
  | 'waiting'
  | 'needs-pack'
  | 'no-permission'
  | 'no-microphone'
  | 'needs-model'
  | 'not-here';

/** The line under the switch in Profile, saying what the word is doing now. */
export function wakeStatusSentence(status: WakeStatus, onComputer: boolean): string {
  const device = onComputer ? 'computer' : 'phone';
  switch (status) {
    case 'off':
      return 'Off. Voice Control is still in the quick-access menu.';
    case 'listening':
      return `On. Listening for “${WAKE_WORD}” while the app is open.`;
    case 'waiting':
      return 'On. Paused while another microphone in the app is in use, or while the app is put away or locked.';
    case 'needs-pack':
      return `On, but not listening yet. This needs the offline speech pack, so that nothing heard leaves the ${device}. Download it under Speech on This Phone.`;
    case 'no-permission':
      return onComputer
        ? 'On, but Windows is not letting Lifestead use the microphone. Turn it on in Windows Settings > Privacy & security > Microphone.'
        : 'On, but the microphone is not allowed for Lifestead. Turn it on in the phone’s Settings, under this app.';
    case 'no-microphone':
      return `On, but no microphone was found on this ${device}. It starts listening once one is connected.`;
    case 'needs-model':
      return 'On, but the speech model is not on this computer yet. Press Download the Speech Model below.';
    case 'not-here':
      return `This ${device} cannot listen for the word.`;
  }
}

export const WAKE_WORD_LEAD =
  `Say “${WAKE_WORD}” to open Voice Control without a press, or say a command straight after it: ` +
  `“${WAKE_WORD}, go to Garden.” It listens only while the app is open on the screen and unlocked, and stops ` +
  'when you put the app away. What it hears is turned into words on this device and dropped unless it starts ' +
  'with the word. Nothing is sent anywhere.';

export function wakeWordCost(onComputer: boolean): string {
  return onComputer
    ? 'The computer reads each stretch of talking it hears, so a busy room keeps it working.'
    : 'Listening uses more battery while the app is open, and the phone shows its microphone dot the whole time.';
}
