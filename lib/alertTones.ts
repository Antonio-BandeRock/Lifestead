// The sounds and vibrations a kind of reminder can be given (2026-10-12).
// Direct requests: "Are we able to assign a sound to each type of reminder
// ... and have those sounds listed in Profile under reminders to set them up
// there? They need to be sounds that are attention getting, not songs or the
// same sounds for use as ringers", then "Please include vibration versions
// for the phone, too."
//
// The tones are made by scripts/make_alert_tones.js and bundled into the app
// (app.json, expo-notifications "sounds"), so a new tone needs a full
// install. Android fixes a notification's sound and vibration when its
// channel is first made and lets an app change neither afterwards, so a kind
// with a choice of its own gets a channel whose id names that choice
// (kindChannelId), and changing the choice moves the kind to a new channel.
//
// Pure, with only a type import, so scripts/test_alert_tones.js can load it.
import type { ReminderKindKey } from './reminderPreferences';

export type AlertTone = { key: string; label: string; file: string };

// 'default' is the phone's notification sound and 'silent' is none. Every
// other key has a file ls_<key>.wav in assets/sounds.
export const ALERT_TONES: AlertTone[] = [
  { key: 'default', label: 'Phone’s notification sound', file: '' },
  { key: 'silent', label: 'No sound', file: '' },
  { key: 'bell', label: 'Bell', file: 'ls_bell.wav' },
  { key: 'chime', label: 'Chime', file: 'ls_chime.wav' },
  { key: 'falling', label: 'Falling notes', file: 'ls_falling.wav' },
  { key: 'glass', label: 'Glass', file: 'ls_glass.wav' },
  { key: 'knock', label: 'Knock', file: 'ls_knock.wav' },
  { key: 'marimba', label: 'Marimba', file: 'ls_marimba.wav' },
  { key: 'ping', label: 'Ping', file: 'ls_ping.wav' },
  { key: 'pulse', label: 'Pulse', file: 'ls_pulse.wav' },
  { key: 'rising', label: 'Rising notes', file: 'ls_rising.wav' },
  { key: 'sonar', label: 'Sonar', file: 'ls_sonar.wav' },
  { key: 'sweep', label: 'Sweep', file: 'ls_sweep.wav' },
  { key: 'triple_beep', label: 'Three beeps', file: 'ls_triple_beep.wav' },
  { key: 'two_down', label: 'Two notes down', file: 'ls_two_down.wav' },
  { key: 'two_up', label: 'Two notes up', file: 'ls_two_up.wav' },
  { key: 'urgent', label: 'Urgent', file: 'ls_urgent.wav' },
  { key: 'warble', label: 'Warble', file: 'ls_warble.wav' },
];

export type VibrationChoice = { key: string; label: string; pattern: number[] };

// Android's pattern: wait, buzz, pause, buzz, ... in milliseconds. 'default'
// keeps the buzz each kind already had, and 'none' turns it off.
export const VIBRATION_CHOICES: VibrationChoice[] = [
  { key: 'default', label: 'Lifestead’s usual buzz', pattern: [] },
  { key: 'none', label: 'No vibration', pattern: [] },
  { key: 'short', label: 'One short buzz', pattern: [0, 200] },
  { key: 'double', label: 'Two quick buzzes', pattern: [0, 150, 120, 150] },
  { key: 'triple', label: 'Three quick buzzes', pattern: [0, 120, 100, 120, 100, 120] },
  { key: 'long', label: 'One long buzz', pattern: [0, 800] },
  { key: 'heartbeat', label: 'Heartbeat', pattern: [0, 90, 90, 180, 500, 90, 90, 180] },
  { key: 'rising', label: 'Getting stronger', pattern: [0, 80, 140, 160, 140, 320] },
  { key: 'wave', label: 'Waves', pattern: [0, 350, 200, 350, 200, 350] },
  { key: 'insistent', label: 'Insistent', pattern: [0, 500, 150, 500, 150, 500, 150, 500] },
  { key: 'sos', label: 'Three short, three long, three short', pattern: [0, 100, 100, 100, 100, 100, 300, 350, 100, 350, 100, 350, 300, 100, 100, 100, 100, 100] },
];

export type AlertChoice = { sound: string; vibration: string };

export const DEFAULT_ALERT: AlertChoice = { sound: 'default', vibration: 'default' };

export function toneFor(key: string): AlertTone {
  return ALERT_TONES.find((tone) => tone.key === key) ?? ALERT_TONES[0];
}

export function vibrationFor(key: string): VibrationChoice {
  return VIBRATION_CHOICES.find((choice) => choice.key === key) ?? VIBRATION_CHOICES[0];
}

export function isDefaultAlert(choice: AlertChoice | undefined): boolean {
  return !choice || (toneFor(choice.sound).key === 'default' && vibrationFor(choice.vibration).key === 'default');
}

// Every channel this file names starts with this, so a channel left behind
// by an earlier choice can be found and removed.
export const KIND_CHANNEL_PREFIX = 'kind-';

// The channel a kind with a choice of its own posts to. The id carries the
// choice, so changing it lands on a channel Android has not seen before.
export function kindChannelId(kind: ReminderKindKey, choice: AlertChoice): string {
  return `${KIND_CHANNEL_PREFIX}${kind}-${toneFor(choice.sound).key}-${vibrationFor(choice.vibration).key}`;
}

// What a kind's choice reads as in one line.
export function describeAlert(choice: AlertChoice | undefined): string {
  const c = choice ?? DEFAULT_ALERT;
  return `${toneFor(c.sound).label} · ${vibrationFor(c.vibration).label}`;
}
