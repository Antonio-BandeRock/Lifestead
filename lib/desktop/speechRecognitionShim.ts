// expo-speech-recognition on the computer (voice step 6, 1.0.66.24).
//
// metro.config.js resolves the package here in the desktop build, so
// hooks/useVoiceDictation.ts and lib/voicePackDevice.ts run unchanged. The
// microphone is recorded in the window, brought down to 16 kHz
// (lib/desktop/speechAudio.ts), and handed to the main process, where
// whisper.cpp turns it into words on this computer (desktop/speech.js).
// Nothing is sent anywhere.
//
// whisper.cpp reads a whole recording rather than listening as it goes, so
// while somebody talks the recording so far is read again every second and a
// half, which is what puts words in the box before they stop; the last read
// happens when listening stops and is the final result. A read only starts
// when something new has been said since the one before and none is running,
// so a quiet room costs nothing.
//
// Only what this app calls is here: start, stop, abort, the permission and
// availability questions, the locale questions, and the result, end and
// error events.
import { useEffect, useRef } from 'react';
import {
  downsample,
  isSpeech,
  listeningDecision,
  loudness,
  nextNoiseFloor,
  toPcm16Bytes,
} from './speechAudio';

type ResultEvent = { results: { transcript: string; confidence: number; segments: never[] }[]; isFinal: boolean };
type ErrorEvent = { error: string; message: string };
type EventMap = { result: ResultEvent; end: null; error: ErrorEvent; start: null };
type EventName = keyof EventMap;

const listeners: { [K in EventName]: Set<(event: EventMap[K]) => void> } = {
  result: new Set(),
  end: new Set(),
  error: new Set(),
  start: new Set(),
};

function emit<K extends EventName>(name: K, event: EventMap[K]): void {
  for (const listener of Array.from(listeners[name])) {
    try {
      listener(event);
    } catch (error) {
      console.error(`[speech] ${name} listener failed`, error);
    }
  }
}

export function useSpeechRecognitionEvent<K extends EventName>(name: K, listener: (event: EventMap[K]) => void): void {
  const latest = useRef(listener);
  latest.current = listener;
  useEffect(() => {
    const forward = (event: EventMap[K]) => latest.current(event);
    listeners[name].add(forward);
    return () => {
      listeners[name].delete(forward);
    };
  }, [name]);
}

// How often the recording so far is read again while somebody talks.
const INTERIM_EVERY_MS = 1500;
// Samples per piece the microphone hands over (about 85 ms at 48 kHz).
const PIECE = 4096;

type Session = {
  lang: string;
  continuous: boolean;
  stream: MediaStream;
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  chunks: Float32Array[];
  startedAt: number;
  lastSpeechAt: number | null;
  floor: number | null;
  heardSinceRead: boolean;
  reading: Promise<void> | null;
  /** Null when the caller asked for the final words only. */
  interim: ReturnType<typeof setInterval> | null;
  finishing: boolean;
};

let session: Session | null = null;
let starting = false;
// Set when the computer says it has no microphone at all.
let noMicrophone = false;

function speechBridge() {
  return typeof window !== 'undefined' ? window.insideStoryDesktop?.speech : undefined;
}

// Electron puts "Error invoking remote method ..." in front of a sentence
// thrown in the main process; the person only needs the sentence.
function plainProblem(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/^Error invoking remote method '[^']*': (Error: )?/, '');
}

function release(current: Session): void {
  if (current.interim) clearInterval(current.interim);
  current.processor.onaudioprocess = null;
  try {
    current.source.disconnect();
    current.processor.disconnect();
  } catch {
    // Already disconnected.
  }
  for (const track of current.stream.getTracks()) track.stop();
  void current.context.close().catch(() => undefined);
}

async function read(current: Session): Promise<string> {
  const bridge = speechBridge();
  if (!bridge) throw new Error('This computer has no speech engine.');
  return bridge.transcribe(toPcm16Bytes(current.chunks), current.lang);
}

function resultEvent(transcript: string, isFinal: boolean): ResultEvent {
  return { results: [{ transcript, confidence: 1, segments: [] }], isFinal };
}

function readSoFar(current: Session): void {
  if (current.finishing || current.reading || !current.heardSinceRead) return;
  current.heardSinceRead = false;
  current.reading = read(current)
    .then((text) => {
      if (session === current && !current.finishing && text) emit('result', resultEvent(text, false));
    })
    .catch((error) => console.warn('[speech] A reading while listening failed', error))
    .finally(() => {
      current.reading = null;
    });
}

async function finish(current: Session): Promise<void> {
  if (current.finishing) return;
  current.finishing = true;
  release(current);
  const heardAnything = current.lastSpeechAt !== null;
  try {
    if (current.reading) await current.reading;
    if (!heardAnything) {
      emit('error', { error: 'no-speech', message: 'Nothing was heard.' });
    } else {
      const text = await read(current);
      if (text) emit('result', resultEvent(text, true));
      else emit('error', { error: 'no-speech', message: 'Nothing was heard clearly enough to write down.' });
    }
  } catch (error) {
    emit('error', { error: 'client', message: plainProblem(error) });
  } finally {
    if (session === current) session = null;
    emit('end', null);
  }
}

function giveUp(current: Session, error: string, message: string): void {
  if (current.finishing) return;
  current.finishing = true;
  release(current);
  if (session === current) session = null;
  emit('error', { error, message });
  emit('end', null);
}

function microphoneProblem(error: unknown): ErrorEvent {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return { error: 'not-allowed', message: 'This computer is not letting Lifestead use the microphone.' };
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    noMicrophone = true;
    return { error: 'audio-capture', message: 'This computer has no microphone connected.' };
  }
  return { error: 'audio-capture', message: 'The microphone could not be opened. It may be in use by another program.' };
}

type StartOptions = { lang?: string; continuous?: boolean; interimResults?: boolean };

async function begin(options: StartOptions): Promise<void> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (error) {
    starting = false;
    emit('error', microphoneProblem(error));
    emit('end', null);
    return;
  }
  noMicrophone = false;
  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(PIECE, 1, 1);
  const current: Session = {
    lang: options.lang ?? 'en-US',
    continuous: options.continuous === true,
    stream,
    context,
    source,
    processor,
    chunks: [],
    startedAt: Date.now(),
    lastSpeechAt: null,
    floor: null,
    heardSinceRead: false,
    reading: null,
    interim: null,
    finishing: false,
  };
  // Listening for "Lifestead" asks for final words only, so a busy room
  // costs one reading per stretch of talk rather than one every second and a
  // half (components/WakeWordListener.tsx).
  if (options.interimResults !== false) current.interim = setInterval(() => readSoFar(current), INTERIM_EVERY_MS);
  processor.onaudioprocess = (event) => {
    if (current.finishing) return;
    const piece = downsample(event.inputBuffer.getChannelData(0), context.sampleRate);
    current.chunks.push(piece);
    const level = loudness(piece);
    const now = Date.now();
    if (isSpeech(level, current.floor)) {
      current.lastSpeechAt = now;
      current.heardSinceRead = true;
    }
    current.floor = nextNoiseFloor(current.floor, level);
    const next = listeningDecision({
      elapsed: now - current.startedAt,
      sinceSpeech: current.lastSpeechAt === null ? null : now - current.lastSpeechAt,
      continuous: current.continuous,
    });
    if (next === 'finish') void finish(current);
    else if (next === 'nothing-said') giveUp(current, 'no-speech', 'Nothing was heard.');
  };
  source.connect(processor);
  // A ScriptProcessor only runs while connected onward; it writes nothing,
  // so nothing is heard through the speakers.
  processor.connect(context.destination);
  session = current;
  starting = false;
  emit('start', null);
}

export const ExpoSpeechRecognitionModule = {
  start(options: StartOptions = {}): void {
    if (session || starting) return;
    starting = true;
    void begin(options);
  },
  stop(): void {
    if (session) void finish(session);
  },
  abort(): void {
    if (session) giveUp(session, 'aborted', 'Listening was stopped.');
  },
  async requestPermissionsAsync() {
    const answer = (granted: boolean) => ({
      granted,
      status: granted ? 'granted' : 'denied',
      canAskAgain: true,
      expires: 'never' as const,
    });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) track.stop();
      noMicrophone = false;
      return answer(true);
    } catch (error) {
      const problem = microphoneProblem(error);
      // No microphone is not a refusal; isRecognitionAvailable says it.
      return answer(problem.error !== 'not-allowed');
    }
  },
  async getPermissionsAsync() {
    return { granted: true, status: 'granted', canAskAgain: true, expires: 'never' as const };
  },
  isRecognitionAvailable(): boolean {
    return speechBridge()?.shipped === true && !noMicrophone;
  },
  supportsOnDeviceRecognition(): boolean {
    return true;
  },
  supportsRecording(): boolean {
    return false;
  },
  async getSupportedLocales(_options: unknown = {}) {
    // whisper's model hears every language this app is planned to speak.
    const locales = ['en-US', 'en-GB', 'en-AU', 'es-MX', 'es-ES', 'de-DE', 'fr-FR', 'fi-FI', 'nb-NO', 'sv-SE', 'ja-JP'];
    return { locales, installedLocales: locales };
  },
  getDefaultRecognitionService() {
    return { packageName: 'whisper.cpp' };
  },
  getSpeechRecognitionServices(): string[] {
    return ['whisper.cpp'];
  },
  async androidTriggerOfflineModelDownload(_options: unknown) {
    return { status: 'opened_dialog' as const, message: '' };
  },
};

export default { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent };
