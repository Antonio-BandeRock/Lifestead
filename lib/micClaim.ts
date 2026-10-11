// Who has the microphone (voice step 7, 1.0.66.25).
//
// The speech recognizer runs one session at a time, and its events reach
// every listener in the app whoever started it. Listening for "Lifestead"
// (components/WakeWordListener.tsx) holds a session for as long as the app is
// open, so anything else that wants the microphone claims it here first: every
// mic button through hooks/useVoiceDictation.ts, and a recording through
// components/VoiceoverRecorder.tsx. A claim stops the word listener and waits
// until its session has ended, so the next session's events are never mixed
// with the last one's. The listener starts again once every claim is let go.

let claims = 0;
let yieldWake: (() => Promise<void>) | null = null;
const listeners = new Set<() => void>();

function changed(): void {
  for (const listener of Array.from(listeners)) listener();
}

/** Takes the microphone; resolves once the word listener has let go of it. */
export async function claimMic(): Promise<void> {
  claims += 1;
  changed();
  if (yieldWake) await yieldWake();
}

/** Gives back one claim. */
export function releaseMic(): void {
  claims = Math.max(0, claims - 1);
  changed();
}

export function micClaimed(): boolean {
  return claims > 0;
}

/** Set by the word listener: stops its session and resolves when it has ended. */
export function setWakeYield(next: (() => Promise<void>) | null): void {
  yieldWake = next;
}

export function subscribeMicClaims(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
