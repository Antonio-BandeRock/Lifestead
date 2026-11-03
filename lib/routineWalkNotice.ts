// The notification that stays up while a routine is being walked (B3,
// Phase 2), so somebody who puts the phone down between steps can see
// which step they are on from the notification shade or the lock screen
// without opening the app.
//
// It says the step and the time that step came up, and since 1.0.79.12 it
// carries a running clock too: a step with a length counts down to when it
// should be done, and a step without one counts up from when it came up.
// Android draws and ticks that clock itself (the chronometer, through the
// patched notification builder in patches/expo-notifications+*.patch, so it
// needs the rebuild); a build without it ignores the two data fields and
// shows the words alone, which is why the words still say the time. It
// updates each time the step changes and is taken down when the walk
// finishes or the screen closes.
//
// Android only, and never on the desktop, the same as the emergency lines
// in lib/emergencyLockScreen.ts, whose pattern this follows. It never asks
// for permission: without it, nothing is posted.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isDesktopApp } from './desktop/bridge';
import { inAppLanguage } from './notificationWords';
import { t } from './i18n';

const NOTIFICATION_ID = 'inside-story-routine-walk';
const CHANNEL_ID = 'routine-walk';

function supported(): boolean {
  return Platform.OS === 'android' && !isDesktopApp();
}

export type RoutineWalkNotice = {
  title: string;
  body: string;
  /** Epoch milliseconds the clock counts from, or down to when countDown. */
  clockAt: number;
  countDown: boolean;
};

function clock(at: Date): string {
  const hours = at.getHours();
  const minutes = String(at.getMinutes()).padStart(2, '0');
  const suffix = hours < 12 ? 'am' : 'pm';
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelve}:${minutes} ${suffix}`;
}

/** The words, kept apart from posting them so they can be checked. */
export function routineWalkNotice(input: {
  routineName: string;
  position: number;
  total: number;
  stepText: string;
  stepMinutes: number | null;
  stepStartedAt: Date;
}): RoutineWalkNotice {
  // Each piece goes through t() here, because the clock and the length sit
  // side by side in the sentence and no lookup could tell them apart later.
  const length = input.stepMinutes
    ? input.stepMinutes === 1
      ? t(', about 1 minute')
      : t(', about {n} minutes', { n: input.stepMinutes })
    : '';
  const started = input.stepStartedAt.getTime();
  return {
    title: t('{title}: step {n} of {m}', { title: input.routineName, n: input.position + 1, m: input.total }),
    clockAt: input.stepMinutes ? started + input.stepMinutes * 60_000 : started,
    countDown: Boolean(input.stepMinutes),
    body: t('{stepText}. Up since {clock}{length}.', { stepText: input.stepText, clock: t(clock(input.stepStartedAt)), length }),
  };
}

export async function showRoutineWalkNotice(notice: RoutineWalkNotice): Promise<void> {
  if (!supported()) return;
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: t('Routine in progress'),
      description: t('The step you are on while walking a routine, taken down when you finish or leave it.'),
      importance: Notifications.AndroidImportance.LOW,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: null,
      vibrationPattern: null,
      showBadge: false,
    });
    await Notifications.scheduleNotificationAsync(inAppLanguage({
      identifier: NOTIFICATION_ID,
      content: {
        title: notice.title,
        body: notice.body,
        sticky: true,
        autoDismiss: false,
        sound: false,
        data: { chronometerAt: notice.clockAt, chronometerCountDown: notice.countDown },
      },
      trigger: { channelId: CHANNEL_ID },
    }));
  } catch (error) {
    console.warn('[routineWalkNotice] Could not put the notice up', error);
  }
}

export async function clearRoutineWalkNotice(): Promise<void> {
  if (!supported()) return;
  await Notifications.dismissNotificationAsync(NOTIFICATION_ID).catch(() => undefined);
}
