// Checks saying "Lifestead" to start (voice step 7, 1.0.66.25): finding the
// word and what follows it in lib/wakeWord.ts, when listening should run,
// the wait before listening again, the sentences under the Profile switch,
// and the microphone claims in lib/micClaim.ts. It also reads the listener
// and the computer's recognizer for the two promises that matter most: a
// phone listens on the device only, and a computer asked for final words
// only does not read the recording again every second and a half. Exits
// non-zero on any failure.

// eslint-config-expo lints this repo as app code, which has no __dirname.
/* global __dirname */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function source(relPath) {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
}

function load(relPath) {
  const { outputText } = ts.transpileModule(source(relPath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: path.basename(relPath),
  });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, (name) => {
    throw new Error(`${relPath} must stay free of runtime imports (${name})`);
  });
  return module.exports;
}

const wake = load('lib/wakeWord.ts');
const mic = load('lib/micClaim.ts');

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

// Finding the word.
check('word alone', wake.findWakeWord('Lifestead'), { after: '' });
check('word with a command', wake.findWakeWord('Lifestead, go to Garden.'), { after: 'go to Garden.' });
check('lower case, no comma', wake.findWakeWord('lifestead go to garden'), { after: 'go to garden' });
check('two words', wake.findWakeWord('life stead open Trends'), { after: 'open Trends' });
check('hyphen', wake.findWakeWord('Life-stead scroll down'), { after: 'scroll down' });
check('lifested', wake.findWakeWord('lifested go back'), { after: 'go back' });
check('lifesteed', wake.findWakeWord('Lifesteed, help'), { after: 'help' });
check('in the middle of talk', wake.findWakeWord('okay so Lifestead go to Food'), { after: 'go to Food' });
check('last mention wins', wake.findWakeWord('Lifestead um Lifestead go to Life'), { after: 'go to Life' });
check('lifestyle is not the word', wake.findWakeWord('a healthy lifestyle'), null);
check('lifesteading is not the word', wake.findWakeWord('lifesteadings'), null);
check('nothing said', wake.findWakeWord(''), null);
check('ordinary talk', wake.findWakeWord('what time is dinner'), null);

// Joining stretches of speech.
check('first stretch', wake.mergeHeard('', ' Lifestead '), 'Lifestead');
check('iOS repeats the whole', wake.mergeHeard('Lifestead', 'Lifestead go to Garden'), 'Lifestead go to Garden');
check('Android hands the next stretch', wake.mergeHeard('Lifestead', 'go to Garden'), 'Lifestead go to Garden');

// Waiting before listening again.
check('ended on its own', wake.restartDelay(0), 300);
check('one failure', wake.restartDelay(1), 1000);
check('two failures', wake.restartDelay(2), 3000);
check('three failures', wake.restartDelay(3), 9000);
check('capped', wake.restartDelay(10), 30000);

// When to listen.
const moment = { turnedOn: true, appInFront: true, locked: false, micInUse: false };
check('everything right', wake.shouldListenForWakeWord(moment), true);
check('turned off', wake.shouldListenForWakeWord({ ...moment, turnedOn: false }), false);
check('app put away', wake.shouldListenForWakeWord({ ...moment, appInFront: false }), false);
check('locked', wake.shouldListenForWakeWord({ ...moment, locked: true }), false);
check('mic in use', wake.shouldListenForWakeWord({ ...moment, micInUse: true }), false);

// The sentences.
const statuses = ['off', 'listening', 'waiting', 'needs-pack', 'no-permission', 'no-microphone', 'needs-model', 'not-here'];
const banned = /[–—]| -- |\breal\b|\bgenuine(ly)?\b|\bown\b/i;
for (const status of statuses) {
  for (const onComputer of [false, true]) {
    const sentence = wake.wakeStatusSentence(status, onComputer);
    check(`${status} on ${onComputer ? 'computer' : 'phone'} has words`, typeof sentence === 'string' && sentence.length > 10, true);
    check(`${status} on ${onComputer ? 'computer' : 'phone'} style`, banned.test(sentence), false);
  }
}
check('phone sentence names the phone', wake.wakeStatusSentence('no-microphone', false).includes('phone'), true);
check('computer sentence names the computer', wake.wakeStatusSentence('no-microphone', true).includes('computer'), true);
for (const text of [wake.WAKE_WORD_LEAD, wake.wakeWordCost(false), wake.wakeWordCost(true)]) {
  check(`style: ${text.slice(0, 30)}`, banned.test(text), false);
}
check('lead says nothing is sent', wake.WAKE_WORD_LEAD.includes('Nothing is sent anywhere'), true);
check('lead says open and unlocked only', wake.WAKE_WORD_LEAD.includes('open on the screen and unlocked'), true);

// Microphone claims.
async function claims() {
  const order = [];
  mic.setWakeYield(
    () =>
      new Promise((resolve) => {
        order.push('yield asked');
        setTimeout(() => {
          order.push('yielded');
          resolve();
        }, 20);
      }),
  );
  let heard = 0;
  const unsubscribe = mic.subscribeMicClaims(() => {
    heard += 1;
  });
  check('nothing claimed at first', mic.micClaimed(), false);
  await mic.claimMic();
  order.push('claimed');
  check('claim waits for the listener to let go', order, ['yield asked', 'yielded', 'claimed']);
  check('claimed', mic.micClaimed(), true);
  await mic.claimMic();
  mic.releaseMic();
  check('one claim still held', mic.micClaimed(), true);
  mic.releaseMic();
  check('all let go', mic.micClaimed(), false);
  mic.releaseMic();
  check('an extra release does not go below none', mic.micClaimed(), false);
  check('every change is told', heard, 5);
  unsubscribe();
  mic.setWakeYield(null);
  await mic.claimMic();
  check('a claim with no listener goes ahead', mic.micClaimed(), true);
  mic.releaseMic();
}

// The two promises, read from the code that keeps them.
const listener = source('components/WakeWordListener.tsx');
check('phone listens on the device only', /requiresOnDeviceRecognition:\s*!desktop/.test(listener), true);
check('computer asks for final words only', /interimResults:\s*!desktop/.test(listener), true);
check('no pack means no listening', /status:\s*'needs-pack'/.test(listener), true);
const shim = source('lib/desktop/speechRecognitionShim.ts');
check('computer skips the rereads when asked', /if \(options\.interimResults !== false\) current\.interim = setInterval/.test(shim), true);

claims()
  .catch((error) => {
    failures += 1;
    console.log('FAIL  claims threw', error);
  })
  .finally(() => {
    console.log(`${total - failures} of ${total} checks passed.`);
    if (failures > 0) process.exit(1);
  });
