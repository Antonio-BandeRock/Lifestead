// Profile > Say Lifestead to Start (voice step 7, 1.0.66.25): what the word
// does, what listening costs, what the listener is doing now, and the switch.
// The words are in lib/wakeWord.ts and the listening in
// components/WakeWordListener.tsx.
import { useState } from 'react';
import { Text, TouchableOpacity, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { isDesktopApp } from '../lib/desktop/bridge';
import { ensureDesktopSpeechModel } from '../lib/desktop/speechModel';
import { WAKE_WORD_LEAD, wakeStatusSentence, wakeWordCost } from '../lib/wakeWord';
import { setWakeWordOn, useWakeStatus, useWakeWordOn } from '../lib/wakeWordSetting';

type Props = {
  textStyle: StyleProp<TextStyle>;
  buttonStyle: StyleProp<ViewStyle>;
  buttonTextStyle: StyleProp<TextStyle>;
};

export function WakeWordPanel({ textStyle, buttonStyle, buttonTextStyle }: Props) {
  const on = useWakeWordOn();
  const status = useWakeStatus();
  const desktop = isDesktopApp();
  const [busy, setBusy] = useState(false);

  async function turnOn() {
    setBusy(true);
    try {
      // Asked here, where the person chose it, rather than by surprise later.
      if (!desktop) await ExpoSpeechRecognitionModule.requestPermissionsAsync().catch(() => null);
      else await ensureDesktopSpeechModel();
    } finally {
      setBusy(false);
    }
    setWakeWordOn(true);
  }

  return (
    <>
      <Text style={textStyle}>{WAKE_WORD_LEAD}</Text>
      <Text style={textStyle}>{wakeWordCost(desktop)}</Text>
      <Text style={textStyle}>{wakeStatusSentence(on ? status : 'off', desktop)}</Text>
      {on && status === 'needs-model' ? (
        <TouchableOpacity style={buttonStyle} onPress={() => void ensureDesktopSpeechModel()}>
          <Text style={buttonTextStyle}>Download the Speech Model</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={buttonStyle} disabled={busy} onPress={() => (on ? setWakeWordOn(false) : void turnOn())}>
        <Text style={buttonTextStyle}>{on ? 'Stop Listening for the Word' : busy ? 'Turning It On' : 'Listen for the Word'}</Text>
      </TouchableOpacity>
    </>
  );
}
