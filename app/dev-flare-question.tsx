// Opened by the link hashimotosapp://dev-flare-question, which a PC can send
// over USB (adb shell am start -d ...), so the flare question can be tried on
// the locked phone without waiting for the check-in time (2026-10-11). It
// queues the question twenty seconds ahead, time enough to lock the phone,
// and goes straight on to Home. A testing build only: in a store build the
// link does nothing but open Home.
import * as Updates from 'expo-updates';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { sendTestFlareQuestion } from '../lib/reminderNotifications';

const TESTING_BUILD = __DEV__ || Updates.channel === 'preview';

export default function DevFlareQuestion() {
  useEffect(() => {
    void (async () => {
      if (TESTING_BUILD) await sendTestFlareQuestion(20);
      router.replace('/');
    })();
  }, []);
  return null;
}
