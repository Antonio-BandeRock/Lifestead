/* global __dirname, Buffer */
// Makes the alert tones a reminder can be given in Profile > Reminder Sounds
// (2026-10-12). Direct request: "a sound to each type of reminder ... They
// need to be sounds that are attention getting, not songs or the same sounds
// for use as ringers." Each is written here from sine waves and a little
// noise, so Lifestead owns every one and no licence is involved. All are
// short (under two seconds), bright (most energy between 800 Hz and 3 kHz,
// where a phone speaker is loudest and an ear is most alert), and none
// repeats long enough to sound like a ringtone.
//
// Writes assets/sounds/ls_<key>.wav, 16-bit mono at 44.1 kHz. The names are
// lowercase with underscores because Android files them under res/raw, which
// accepts nothing else. app.json's expo-notifications "sounds" list and
// ALERT_TONES in lib/alertTones.ts must name the same files;
// scripts/test_alert_tones.js holds the three together.
//
//   node scripts/make_alert_tones.js
const fs = require('fs');
const path = require('path');

const RATE = 44100;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');

// A note: start (s), length (s), frequency (Hz), loudness, how fast it dies
// away (per second), and extra partials as [ratio, loudness].
function note(buffer, { at, length, freq, gain = 1, decay = 4, partials = [], glideTo = null }) {
  const start = Math.round(at * RATE);
  const count = Math.round(length * RATE);
  let phase = 0;
  const phases = partials.map(() => 0);
  for (let i = 0; i < count && start + i < buffer.length; i++) {
    const t = i / RATE;
    const f = glideTo === null ? freq : freq + (glideTo - freq) * (i / count);
    // 4 ms attack and 12 ms release so nothing clicks.
    const attack = Math.min(1, t / 0.004);
    const release = Math.min(1, (count - i) / (RATE * 0.012));
    const envelope = attack * release * Math.exp(-decay * t);
    phase += (2 * Math.PI * f) / RATE;
    let value = Math.sin(phase);
    partials.forEach(([ratio, level], index) => {
      phases[index] += (2 * Math.PI * f * ratio) / RATE;
      value += level * Math.sin(phases[index]);
    });
    buffer[start + i] += gain * envelope * value;
  }
}

function knock(buffer, at, freq) {
  note(buffer, { at, length: 0.12, freq, decay: 40, partials: [[2.7, 0.4]] });
  const start = Math.round(at * RATE);
  for (let i = 0; i < RATE * 0.02; i++) buffer[start + i] += (Math.random() * 2 - 1) * 0.5 * Math.exp(-i / (RATE * 0.004));
}

const BELL = [[2.0, 0.5], [2.76, 0.35], [5.4, 0.15]];
const GLASS = [[2.32, 0.4], [4.25, 0.2]];
const MARIMBA = [[4.0, 0.25], [9.2, 0.05]];

const TONES = {
  chime: (b) => {
    note(b, { at: 0, length: 1.2, freq: 1318.5, decay: 3, partials: BELL });
    note(b, { at: 0.18, length: 1.2, freq: 1760, decay: 3, partials: BELL, gain: 0.8 });
  },
  two_up: (b) => {
    note(b, { at: 0, length: 0.22, freq: 1046.5, decay: 2, partials: [[2, 0.2]] });
    note(b, { at: 0.26, length: 0.34, freq: 1568, decay: 2, partials: [[2, 0.2]] });
  },
  two_down: (b) => {
    note(b, { at: 0, length: 0.22, freq: 1568, decay: 2, partials: [[2, 0.2]] });
    note(b, { at: 0.26, length: 0.34, freq: 1046.5, decay: 2, partials: [[2, 0.2]] });
  },
  triple_beep: (b) => {
    for (let i = 0; i < 3; i++) note(b, { at: i * 0.2, length: 0.12, freq: 2093, decay: 1, partials: [[3, 0.15]] });
  },
  rising: (b) => {
    [880, 1108.7, 1318.5, 1760].forEach((freq, i) => note(b, { at: i * 0.12, length: 0.3, freq, decay: 5, partials: [[2, 0.3]] }));
  },
  falling: (b) => {
    [1760, 1318.5, 1108.7, 880].forEach((freq, i) => note(b, { at: i * 0.12, length: 0.3, freq, decay: 5, partials: [[2, 0.3]] }));
  },
  bell: (b) => note(b, { at: 0, length: 1.8, freq: 987.8, decay: 2, partials: BELL }),
  ping: (b) => note(b, { at: 0, length: 0.9, freq: 2637, decay: 6, partials: [[1.5, 0.2]] }),
  knock: (b) => {
    knock(b, 0, 520);
    knock(b, 0.16, 520);
    knock(b, 0.5, 520);
  },
  pulse: (b) => {
    note(b, { at: 0, length: 0.16, freq: 1396.9, decay: 0, partials: [[3, 0.33], [5, 0.2]], gain: 0.7 });
    note(b, { at: 0.24, length: 0.16, freq: 1396.9, decay: 0, partials: [[3, 0.33], [5, 0.2]], gain: 0.7 });
  },
  marimba: (b) => {
    [1046.5, 1318.5, 1568, 2093].forEach((freq, i) => note(b, { at: i * 0.09, length: 0.5, freq, decay: 9, partials: MARIMBA }));
  },
  warble: (b) => {
    for (let i = 0; i < 8; i++) note(b, { at: i * 0.11, length: 0.11, freq: i % 2 ? 1760 : 1318.5, decay: 0, partials: [[2, 0.2]], gain: 0.75 });
  },
  sonar: (b) => {
    note(b, { at: 0, length: 1.4, freq: 1480, decay: 3.5 });
    note(b, { at: 0.45, length: 1.0, freq: 1480, decay: 4.5, gain: 0.35 });
  },
  glass: (b) => {
    note(b, { at: 0, length: 1.0, freq: 2349.3, decay: 5, partials: GLASS });
    note(b, { at: 0.14, length: 1.0, freq: 2793.8, decay: 5, partials: GLASS, gain: 0.7 });
  },
  sweep: (b) => {
    note(b, { at: 0, length: 0.28, freq: 700, glideTo: 2200, decay: 0, partials: [[2, 0.2]], gain: 0.7 });
    note(b, { at: 0.34, length: 0.28, freq: 700, glideTo: 2200, decay: 0, partials: [[2, 0.2]], gain: 0.7 });
  },
  urgent: (b) => {
    for (let r = 0; r < 2; r++) [1318.5, 1568, 2093].forEach((freq, i) => note(b, { at: r * 0.5 + i * 0.1, length: 0.1, freq, decay: 0, partials: [[2, 0.25]], gain: 0.8 }));
  },
};

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

fs.mkdirSync(OUT, { recursive: true });
// The same noise every run, so a re-run writes the same bytes (a renamed or
// rewritten asset with new bytes is what reaches a phone).
let seed = 7;
Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
for (const [key, draw] of Object.entries(TONES)) {
  const buffer = new Float64Array(Math.round(RATE * 2));
  draw(buffer);
  let end = buffer.length;
  while (end > 1 && Math.abs(buffer[end - 1]) < 0.0005) end--;
  const used = buffer.slice(0, Math.min(buffer.length, end + Math.round(RATE * 0.02)));
  const peak = used.reduce((m, s) => Math.max(m, Math.abs(s)), 0) || 1;
  const scaled = Array.from(used, (s) => (s / peak) * 0.9);
  fs.writeFileSync(path.join(OUT, `ls_${key}.wav`), wav(scaled));
  console.log(`ls_${key}.wav  ${(scaled.length / RATE).toFixed(2)} s`);
}
