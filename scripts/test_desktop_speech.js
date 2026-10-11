// Checks speech on the computer (voice step 6, 1.0.66.24): the arithmetic
// in lib/desktop/speechAudio.ts (bringing the microphone down to 16 kHz,
// telling speech from room noise, deciding when somebody has finished), the
// pure parts of desktop/speech.js (language, transcript cleaning, the WAV
// around the samples), and the words in lib/desktop/speechModel.ts.
//
// With --model <ggml-base.bin> --wav <16 kHz mono 16-bit wav> it also runs
// the engine fetched into desktop/whisper (node desktop/fetch-whisper.js)
// through speech.js's transcribe, the same path the app takes, and prints
// what it heard. Without them that part is skipped and says so. Exits
// non-zero on any failure.

// eslint-config-expo lints this repo as app code, which has no __dirname.
/* global __dirname */

const fs = require('fs');
const os = require('os');
const path = require('path');
const ts = require('typescript');

function load(relPath, stubs = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    if (name in stubs) return stubs[name];
    throw new Error(`${relPath} must stay free of runtime imports (${name})`);
  });
  return module.exports;
}

const audio = load('lib/desktop/speechAudio.ts');
const model = load('lib/desktop/speechModel.ts');
const speech = require(path.join(__dirname, '..', 'desktop', 'speech.js'));

let failures = 0;
let total = 0;
function check(name, actual, expected) {
  total += 1;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures += 1;
    console.log(`FAIL  ${name}\n      expected ${e}\n      got      ${a}`);
  }
}

// --- Downsampling -----------------------------------------------------------
{
  const input = new Float32Array(48000).map((_, i) => (i % 3 === 0 ? 0.3 : 0));
  const out = audio.downsample(input, 48000);
  check('48 kHz to 16 kHz keeps one sample in three', out.length, 16000);
  check('averaging three samples', Math.round(out[0] * 1000) / 1000, 0.1);
  const same = audio.downsample(new Float32Array([0.1, 0.2]), 16000);
  check('16 kHz in is left alone', Array.from(same).map((v) => Math.round(v * 10) / 10), [0.1, 0.2]);
  check('44.1 kHz comes down to the right length', audio.downsample(new Float32Array(44100), 44100).length, 16000);
}

// --- Loudness and the 16-bit bytes ------------------------------------------
check('silence has no loudness', audio.loudness(new Float32Array(100)), 0);
check('an empty piece has no loudness', audio.loudness(new Float32Array(0)), 0);
check('a steady 0.5 reads as 0.5', audio.loudness(new Float32Array(10).fill(0.5)), 0.5);
{
  const bytes = audio.toPcm16Bytes([new Float32Array([1, -1]), new Float32Array([0, 2])]);
  const pcm = new Int16Array(bytes.buffer);
  check('pieces join into one run of samples', Array.from(pcm), [32767, -32768, 0, 32767]);
  check('two bytes per sample', bytes.byteLength, 8);
}

// --- Speech against room noise ----------------------------------------------
check('a whisper below the floor is not speech', audio.isSpeech(0.005, null), false);
check('talking in a quiet room is speech', audio.isSpeech(0.05, 0.002), true);
check('a fan three times louder than the voice hides it', audio.isSpeech(0.05, 0.03), false);
check('the first level sets the floor', audio.nextNoiseFloor(null, 0.01), 0.01);
check('a quieter moment drops the floor at once', audio.nextNoiseFloor(0.02, 0.005), 0.005);
{
  let floor = 0.002;
  for (let i = 0; i < 20; i += 1) floor = audio.nextNoiseFloor(floor, 0.1);
  check('a few seconds of speech barely lift the floor', floor < 0.02, true);
}

// --- When listening ends ----------------------------------------------------
const decide = (elapsed, sinceSpeech, continuous = false) => audio.listeningDecision({ elapsed, sinceSpeech, continuous });
check('nothing yet, early on: listen', decide(2000, null), 'listen');
check('nothing said for 8 seconds: stop with nothing', decide(audio.NOTHING_SAID_MS, null), 'nothing-said');
check('continuous callers keep their own first-word timer', decide(20000, null, true), 'listen');
check('mid-sentence: listen', decide(4000, 300), 'listen');
check('a pause after speech: finish', decide(4000, audio.END_OF_SPEECH_MS), 'finish');
check('continuous callers stop by themselves', decide(4000, 5000, true), 'listen');
check('three minutes is the longest', decide(audio.LONGEST_LISTEN_MS, 100, true), 'finish');
check('three minutes of nothing', decide(audio.LONGEST_LISTEN_MS, null, true), 'nothing-said');

// --- desktop/speech.js pure parts -------------------------------------------
check('en-US speaks en', speech.whisperLanguage('en-US'), 'en');
check('es_MX speaks es', speech.whisperLanguage('es_MX'), 'es');
check('nb-NO speaks nb', speech.whisperLanguage('nb-NO'), 'nb');
check('nothing given speaks en', speech.whisperLanguage(undefined), 'en');
check('a sound marker is dropped', speech.cleanTranscript('[BLANK_AUDIO]\n'), '');
check(
  'markers dropped and lines joined',
  speech.cleanTranscript(' Lunch at 12:15.\n (wind blowing) Call Dr. Lopez *coughs* at 3:30.\r\n'),
  'Lunch at 12:15. Call Dr. Lopez at 3:30.',
);
{
  const wav = speech.wavFromPcm16(new Int16Array([1, -1, 300]));
  check('WAV is header plus samples', wav.length, 44 + 6);
  check('RIFF', wav.toString('ascii', 0, 4), 'RIFF');
  check('16 kHz', wav.readUInt32LE(24), 16000);
  check('mono', wav.readUInt16LE(22), 1);
  check('data length', wav.readUInt32LE(40), 6);
  check('first sample', wav.readInt16LE(44), 1);
}
check('the model is pinned by hash', /^[0-9a-f]{64}$/.test(speech.MODEL.sha256), true);
check('the model comes from a pinned revision', /\/resolve\/[0-9a-f]{40}\//.test(speech.MODEL.url), true);

// --- The words the person reads ---------------------------------------------
{
  const q = model.downloadQuestion(speech.MODEL.bytes);
  check('the question names the size', q.message.includes('148 MB'), true);
  check('the question says it stays on the computer', q.message.includes('never leaves it'), true);
  check('a yes is Download It', q.confirmLabel, 'Download It');
  check('progress reads in megabytes', model.downloadingSentence(74_000_000, 148_000_000).includes('74 of 148 MB so far (50%)'), true);
  check('progress never claims 100% before it is done', model.downloadingSentence(148_000_000, 148_000_000).includes('(99%)'), true);
  const words = [q.title, q.message, model.DOWNLOAD_STARTED, model.DOWNLOAD_DONE, model.DESKTOP_MIC_NOT_ALLOWED, model.DESKTOP_NO_MICROPHONE].join(' ');
  check('no dashes in place of punctuation', /[–—]| -- /.test(words), false);
}

// --- The engine, end to end (optional) --------------------------------------
async function endToEnd() {
  const args = process.argv.slice(2);
  const at = (flag) => (args.indexOf(flag) >= 0 ? args[args.indexOf(flag) + 1] : null);
  const modelPath = at('--model');
  const wavPath = at('--wav');
  if (!modelPath || !wavPath) {
    console.log('skipped the engine run (pass --model <ggml-base.bin> --wav <file.wav> to include it)');
    return;
  }
  const app = { isPackaged: false };
  if (!speech.shipped(app)) {
    failures += 1;
    console.log('FAIL  the engine is not in desktop/whisper; run node desktop/fetch-whisper.js');
    return;
  }
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'lifestead-speech-'));
  try {
    fs.mkdirSync(path.join(userData, 'speech'));
    const target = path.join(userData, 'speech', speech.MODEL.file);
    try {
      fs.linkSync(modelPath, target);
    } catch {
      fs.copyFileSync(modelPath, target);
    }
    const wav = fs.readFileSync(wavPath);
    const dataAt = wav.indexOf('data', 12, 'ascii');
    const pcm = new Uint8Array(wav.subarray(dataAt + 8, dataAt + 8 + wav.readUInt32LE(dataAt + 4)));
    const started = Date.now();
    const text = await speech.transcribe(app, userData, pcm, 'en-US');
    total += 1;
    console.log(`engine heard (${Date.now() - started} ms): "${text}"`);
    if (!text) {
      failures += 1;
      console.log('FAIL  the engine heard nothing');
    }
    const left = fs.readdirSync(path.join(userData, 'speech')).filter((name) => name.endsWith('.wav'));
    check('the recording is deleted after reading', left, []);
  } finally {
    fs.rmSync(userData, { recursive: true, force: true });
  }
}

endToEnd()
  .catch((error) => {
    failures += 1;
    console.log(`FAIL  engine run: ${error.message}`);
  })
  .finally(() => {
    console.log(`${total - failures}/${total} passed`);
    process.exit(failures === 0 ? 0 : 1);
  });
