// The arithmetic behind listening on a computer (voice step 6, 1.0.66.24):
// bringing the microphone's samples down to the 16 kHz whisper.cpp reads,
// telling speech from room noise, and deciding when somebody has finished.
// No React and no bridge, so scripts/test_desktop_speech.js checks it; the
// recording itself is lib/desktop/speechRecognitionShim.ts.

export const SPEECH_SAMPLE_RATE = 16000;

/** Averages the input down to outRate (the microphone runs at 44.1 or 48 kHz). */
export function downsample(input: Float32Array, inRate: number, outRate: number = SPEECH_SAMPLE_RATE): Float32Array {
  if (inRate === outRate) return input.slice();
  const ratio = inRate / outRate;
  const length = Math.floor(input.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += input[j];
    out[i] = end > start ? sum / (end - start) : 0;
  }
  return out;
}

/** How loud a stretch of samples is, 0 to 1. */
export function loudness(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

/** Float samples to the 16-bit little-endian bytes the main process writes into a WAV. */
export function toPcm16Bytes(chunks: readonly Float32Array[]): Uint8Array {
  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const pcm = new Int16Array(total);
  let at = 0;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i += 1) {
      const clamped = Math.max(-1, Math.min(1, chunk[i]));
      pcm[at] = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
      at += 1;
    }
  }
  return new Uint8Array(pcm.buffer);
}

// Quieter than this is never speech, however still the room.
const QUIETEST_SPEECH = 0.012;
// Speech stands this many times above the room's own noise.
const ABOVE_ROOM = 3;

/**
 * Follows the room's noise so a fan or a hum is not heard as talking. The
 * floor creeps up slowly and drops at once, so speech never raises it much.
 */
export function nextNoiseFloor(floor: number | null, level: number): number {
  if (floor === null) return level;
  return level < floor ? level : floor * 0.995 + level * 0.005;
}

export function isSpeech(level: number, floor: number | null): boolean {
  return level >= Math.max(QUIETEST_SPEECH, (floor ?? 0) * ABOVE_ROOM);
}

export type ListeningMoment = {
  /** Milliseconds since listening started. */
  elapsed: number;
  /** Milliseconds since speech was last heard, or null when none has been. */
  sinceSpeech: number | null;
  /** True when the caller keeps listening past pauses (it stops by itself). */
  continuous: boolean;
};

// Without continuous listening, a pause this long after speech ends it.
export const END_OF_SPEECH_MS = 1500;
// With nothing said, listening gives up after this long.
export const NOTHING_SAID_MS = 8000;
// Nobody's sentence runs this long; listening stops here regardless.
export const LONGEST_LISTEN_MS = 180000;

/** What listening does next: keep going, finish with what was heard, or stop with nothing. */
export function listeningDecision(moment: ListeningMoment): 'listen' | 'finish' | 'nothing-said' {
  if (moment.elapsed >= LONGEST_LISTEN_MS) return moment.sinceSpeech === null ? 'nothing-said' : 'finish';
  if (moment.sinceSpeech === null) {
    // A caller listening continuously has its own timer for this.
    return !moment.continuous && moment.elapsed >= NOTHING_SAID_MS ? 'nothing-said' : 'listen';
  }
  if (!moment.continuous && moment.sinceSpeech >= END_OF_SPEECH_MS) return 'finish';
  return 'listen';
}
