// Say an Appointment, at the top of the appointment form in Schedules >
// Appointments (step 5 of the voice order, 1.0.66.23). One sentence fills
// the boxes below it; each part is listed beside the words it came from, and
// what was left empty is said. Nothing is saved until the form's Save. The
// reading is lib/spokenAppointment.ts.
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { listAppointmentNames } from '../lib/db';
import { explainNotYet } from '../lib/notYet';
import { readSpokenAppointment, type AppointmentVocabulary, type SpokenAppointment } from '../lib/spokenAppointment';
import { AppTextInput } from './AppTextInput';

export function SpokenAppointmentBox({
  tabColor,
  onFill,
}: {
  tabColor: string;
  onFill: (reading: SpokenAppointment) => void;
}) {
  const [text, setText] = useState('');
  const [reading, setReading] = useState<SpokenAppointment | null>(null);
  const [vocab, setVocab] = useState<AppointmentVocabulary>({});

  useEffect(() => {
    let live = true;
    listAppointmentNames()
      .then((names) => {
        if (live) setVocab(names);
      })
      .catch(() => {
        // Without earlier names, what was heard is kept as said.
      });
    return () => {
      live = false;
    };
  }, []);

  function fill(spoken: string) {
    const read = readSpokenAppointment(spoken, new Date(), vocab);
    if (!read) {
      explainNotYet('Say or type the appointment first, for example "dentist with Dr. Lopez next Tuesday at 3:30".');
      return;
    }
    setReading(read);
    onFill(read);
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Say an Appointment</Text>
      <AppTextInput
        onVoiceResult={(spoken, isFinal) => {
          setText(spoken);
          if (isFinal) fill(spoken);
        }}
        micColor={tabColor}
        style={styles.input}
        multiline
        placeholder="Dentist with Dr. Lopez next Tuesday at 3:30 at the Main Street clinic for 45 minutes"
        value={text}
        onChangeText={setText}
      />
      <TouchableOpacity style={styles.button} onPress={() => fill(text)}>
        <Text style={[styles.buttonText, { color: tabColor }]}>Fill the Boxes From This</Text>
      </TouchableOpacity>
      {reading ? (
        <View style={styles.reading}>
          {reading.pieces.map((piece, index) => (
            <Text key={`p${index}`} style={styles.line}>
              “{piece.words}”: {piece.reads}
            </Text>
          ))}
          {reading.unsettled.map((line, index) => (
            <Text key={`u${index}`} style={styles.note}>
              {line}
            </Text>
          ))}
          <Text style={styles.note}>Check the boxes below, then Save. Nothing is kept until you do.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  title: { ...typography.bodyEmphasis, color: colors.textPrimary, marginBottom: 8, ...textShadow },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.textPrimary,
    ...textShadow,
    minHeight: 64,
  },
  button: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: colors.surface,
  },
  buttonText: { ...typography.bodyEmphasis, ...textShadow },
  reading: { marginTop: 10, gap: 4 },
  line: { ...typography.body, color: colors.textPrimary, ...textShadow },
  note: { ...typography.caption, color: colors.textSecondary, ...textShadow },
});
