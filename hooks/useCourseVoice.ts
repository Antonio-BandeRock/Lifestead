// The voice for a course's target language (2026-11-05). On-device only: a voice
// that needs the internet is not counted (lib/learnCourseSpeech.ts), so what works
// today works in airplane mode.
//
// A language with no voice is said once on this device and the button goes away.
// It is looked for again each time a sitting opens, so installing a voice brings
// the button back without anything else being done. Android can list a voice whose
// data has not been downloaded, which only shows when it fails to speak, so a
// failure is treated the same way as finding none.

import * as Speech from 'expo-speech';
import { useCallback, useEffect, useState } from 'react';
import type { CourseCard } from '../lib/learnCourseFile';
import { markVoiceTold, voiceAlreadyTold } from '../lib/learnCoursesDb';
import { pickVoice, speechParts, type VoiceLike } from '../lib/learnCourseSpeech';
import { t } from '../lib/i18n';

const LIST_RETRY_MS = 800;

export function useCourseVoice(code: string, language: string, watching: boolean, tell: (title: string, message: string) => void) {
  const [voice, setVoice] = useState<VoiceLike | null>(null);

  const sayNone = useCallback(async () => {
    if (await voiceAlreadyTold(code).catch(() => true)) return;
    await markVoiceTold(code).catch(() => {});
    tell(
      t('No voice for this language'),
      t('This device has no voice for {language} that works without the internet, so the Hear It button stays hidden. Once one is installed in the device settings, the button comes back.', { language }),
    );
  }, [code, language, tell]);

  useEffect(() => {
    if (!watching || !code) return;
    let live = true;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const look = async (again: boolean) => {
      const voices = await Speech.getAvailableVoicesAsync().catch(() => []);
      if (!live) return;
      // The list can come back empty while the speech engine is still starting.
      if (voices.length === 0 && again) {
        retry = setTimeout(() => void look(false), LIST_RETRY_MS);
        return;
      }
      const found = pickVoice(voices, code);
      setVoice(found);
      if (!found) void sayNone();
    };
    void look(true);
    return () => {
      live = false;
      if (retry) clearTimeout(retry);
      void Speech.stop();
    };
  }, [watching, code, sayNone]);

  const speak = useCallback(
    (card: CourseCard) => {
      if (!voice) return;
      void Speech.stop();
      Speech.speak(speechParts(card, code).join('. '), {
        language: code,
        voice: voice.identifier,
        onError: () => {
          setVoice(null);
          void sayNone();
        },
      });
    },
    [voice, code, sayNone],
  );

  return { canSpeak: voice !== null, speak };
}
