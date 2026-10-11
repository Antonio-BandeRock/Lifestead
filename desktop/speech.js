// Speech into words on this computer (voice step 6, 1.0.66.24).
//
// The phone listens through its own recognizer. A computer has none the app
// can use, so the Windows app runs whisper.cpp (desktop/fetch-whisper.js puts
// it in resources/whisper) on what the microphone heard, here in the main
// process, and nothing said leaves the computer.
//
// The engine needs a model, a 148 MB file the app does not ship, so an
// installer that already carries the 161 MB food database does not double in
// size for people who never speak to it. It is downloaded once, after the
// person says yes (components/DesktopSpeechHost.tsx), from a pinned revision,
// and checked against its hash before it is used; after that no network is
// involved at all. It lands in <data folder>/speech/.
//
// The page records and hands over 16 kHz mono samples
// (lib/desktop/speechRecognitionShim.ts). whisper-cli reads a WAV file, and
// in this release prints nothing when the WAV comes on stdin, so each piece
// is written to <data folder>/speech/heard-*.wav for the moment it takes to
// read it and deleted in a finally, whatever happens.
//
// Mac: no binary is built for it yet, so `shipped` is false there and the
// app keeps saying speech works on the phone.

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');

const MODEL = {
  file: 'ggml-base.bin',
  // Multilingual, so the languages the app is to gain later need no second
  // download; the language is named on each run.
  url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-base.bin',
  sha256: '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe',
  bytes: 147951465,
};

// Numbers written as people write them: without it "three thirty" comes back
// as "330", which no reader in the app takes for a time.
const STYLE_PROMPT = 'Lunch at 12:15. Call Dr. Lopez at 3:30 pm. 2 cups of rice, 1.5 kg of carrots.';

const SAMPLE_RATE = 16000;
const LONGEST_SECONDS = 180;

function engineFolder(app) {
  return app.isPackaged ? path.join(process.resourcesPath, 'whisper') : path.join(__dirname, 'whisper');
}

function engineFile(app) {
  return path.join(engineFolder(app), 'whisper-cli.exe');
}

function speechFolder(userData) {
  return path.join(userData, 'speech');
}

function modelFile(userData) {
  return path.join(speechFolder(userData), MODEL.file);
}

/** True when this install carries the engine (Windows builds from 1.0.66.24). */
function shipped(app) {
  return process.platform === 'win32' && fs.existsSync(engineFile(app));
}

/** 'en-US' to 'en'; anything unreadable to 'en'. */
function whisperLanguage(lang) {
  const match = /^([a-z]{2,3})(?:[-_]|$)/i.exec(String(lang || ''));
  return match ? match[1].toLowerCase() : 'en';
}

/**
 * The words whisper printed, as one line. Its markers for sounds that are not
 * speech ("[BLANK_AUDIO]", "(wind blowing)", "[Music]") are dropped, so a
 * silent recording reads as nothing heard rather than as a note saying so.
 */
function cleanTranscript(stdout) {
  return String(stdout || '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\*[^*]*\*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A 16-bit mono WAV around little-endian PCM samples. */
function wavFromPcm16(pcm, sampleRate = SAMPLE_RATE) {
  const data = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

let download = null; // { received, promise, controller }

function status(app, userData) {
  const ready = fs.existsSync(modelFile(userData));
  return {
    shipped: shipped(app),
    model: ready ? 'ready' : download ? 'downloading' : 'missing',
    received: download ? download.received : ready ? MODEL.bytes : 0,
    total: MODEL.bytes,
  };
}

async function fetchModel(net, userData, onProgress) {
  const folder = speechFolder(userData);
  fs.mkdirSync(folder, { recursive: true });
  const partial = `${modelFile(userData)}.part`;
  const controller = new AbortController();
  download.controller = controller;
  const response = await net.fetch(MODEL.url, { redirect: 'follow', signal: controller.signal });
  if (!response.ok || !response.body) throw new Error(`The download answered ${response.status}.`);
  const hash = crypto.createHash('sha256');
  const out = fs.createWriteStream(partial);
  let lastSent = 0;
  try {
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      hash.update(value);
      if (!out.write(value)) await new Promise((resolve) => out.once('drain', resolve));
      download.received += value.length;
      if (download.received - lastSent > 2 * 1024 * 1024) {
        lastSent = download.received;
        onProgress({ received: download.received, total: MODEL.bytes });
      }
    }
    await new Promise((resolve, reject) => out.end((error) => (error ? reject(error) : resolve())));
  } catch (error) {
    out.destroy();
    fs.rmSync(partial, { force: true });
    throw error;
  }
  if (hash.digest('hex') !== MODEL.sha256) {
    fs.rmSync(partial, { force: true });
    throw new Error('The downloaded file did not match the one published, so it was thrown away. Try again later.');
  }
  fs.renameSync(partial, modelFile(userData));
}

/**
 * Downloads the model once. A second call while one is running joins it.
 * Resolves { ok: true } or { ok: false, problem } with a sentence.
 */
function downloadModel(net, userData, onProgress) {
  if (fs.existsSync(modelFile(userData))) return Promise.resolve({ ok: true });
  if (download) return download.promise;
  download = { received: 0, controller: null, promise: null };
  download.promise = fetchModel(net, userData, onProgress)
    .then(() => ({ ok: true }))
    .catch((error) => ({
      ok: false,
      problem:
        error && error.name === 'AbortError'
          ? 'The download was stopped.'
          : `The speech model could not be downloaded. ${error && error.message ? error.message : ''}`.trim(),
    }))
    .finally(() => {
      download = null;
    });
  return download.promise;
}

function cancelDownload() {
  if (download && download.controller) download.controller.abort();
}

/**
 * Turns 16 kHz mono 16-bit samples into words. Resolves the text, which is
 * empty when nothing was said. Rejects with a sentence.
 */
async function transcribe(app, userData, pcmBytes, lang) {
  if (!shipped(app)) throw new Error('This computer has no speech engine installed.');
  if (!fs.existsSync(modelFile(userData))) throw new Error('The speech model has not been downloaded yet.');
  const pcm = new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, Math.floor(pcmBytes.byteLength / 2));
  if (pcm.length === 0) return '';
  const limited = pcm.length > SAMPLE_RATE * LONGEST_SECONDS ? pcm.subarray(pcm.length - SAMPLE_RATE * LONGEST_SECONDS) : pcm;
  const folder = speechFolder(userData);
  fs.mkdirSync(folder, { recursive: true });
  const wav = path.join(folder, `heard-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.wav`);
  try {
    fs.writeFileSync(wav, wavFromPcm16(limited));
    const threads = String(Math.max(1, Math.min(8, os.cpus().length - 1)));
    const stdout = await new Promise((resolve, reject) => {
      execFile(
        engineFile(app),
        ['-m', modelFile(userData), '-f', wav, '-l', whisperLanguage(lang), '-t', threads, '-nt', '-np', '--prompt', STYLE_PROMPT],
        { windowsHide: true, timeout: 120000, maxBuffer: 4 * 1024 * 1024, cwd: engineFolder(app) },
        (error, out) => {
          if (error) reject(new Error('The speech engine stopped before it finished.'));
          else resolve(out);
        },
      );
    });
    return cleanTranscript(stdout);
  } finally {
    fs.rmSync(wav, { force: true });
  }
}

/** Leftovers from a run that ended mid-transcription. */
function clearLeftovers(userData) {
  const folder = speechFolder(userData);
  if (!fs.existsSync(folder)) return;
  for (const name of fs.readdirSync(folder)) {
    if (/^heard-.*\.wav$/.test(name) || name.endsWith('.part')) fs.rmSync(path.join(folder, name), { force: true });
  }
}

module.exports = {
  MODEL,
  SAMPLE_RATE,
  shipped,
  status,
  downloadModel,
  cancelDownload,
  transcribe,
  clearLeftovers,
  whisperLanguage,
  cleanTranscript,
  wavFromPcm16,
};
