// Which sound and vibration each kind of reminder has on this phone
// (2026-10-12; lib/alertTones.ts has the why). The choice belongs to the
// phone in the person's hand rather than to their records, the same as the
// navigation hand (lib/navigationHand.ts): it lives in a plain file, never
// travels through sync, and is read synchronously so the reminder code can
// pick a channel without waiting.
import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { type AlertChoice, isDefaultAlert, toneFor, vibrationFor } from './alertTones';
import type { ReminderKindKey } from './reminderPreferences';

export type AlertChoices = Partial<Record<ReminderKindKey, AlertChoice>>;

const FILE_NAME = 'alert_choices.json';

function choicesFile(): File {
  return new File(Paths.document, FILE_NAME);
}

function readChoices(): AlertChoices {
  try {
    const file = choicesFile();
    if (!file.exists) return {};
    const parsed = JSON.parse(file.textSync()) as Record<string, { sound?: unknown; vibration?: unknown }>;
    const result: AlertChoices = {};
    for (const [kind, value] of Object.entries(parsed ?? {})) {
      if (!value || typeof value !== 'object') continue;
      const choice = {
        sound: toneFor(typeof value.sound === 'string' ? value.sound : 'default').key,
        vibration: vibrationFor(typeof value.vibration === 'string' ? value.vibration : 'default').key,
      };
      if (!isDefaultAlert(choice)) result[kind as ReminderKindKey] = choice;
    }
    return result;
  } catch {
    return {};
  }
}

let current: AlertChoices | null = null;
const listeners = new Set<() => void>();

export function getAlertChoices(): AlertChoices {
  if (current === null) current = readChoices();
  return current;
}

export function alertChoiceFor(kind: ReminderKindKey): AlertChoice | undefined {
  return getAlertChoices()[kind];
}

export function setAlertChoice(kind: ReminderKindKey, choice: AlertChoice): void {
  const next: AlertChoices = { ...getAlertChoices() };
  if (isDefaultAlert(choice)) delete next[kind];
  else next[kind] = choice;
  current = next;
  try {
    choicesFile().write(JSON.stringify(next));
  } catch {
    // Holds for this run; the next launch reads what was last written.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAlertChoices(): AlertChoices {
  return useSyncExternalStore(subscribe, getAlertChoices, getAlertChoices);
}
