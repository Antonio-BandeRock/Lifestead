// How many of a med or supplement are on hand: the one form for it, used by
// the Tracking button on each row of Life > My Meds, by On hand inside a
// med's Details, and by the question asked right after a new one is saved.
//
// Tony, 2026-11-18: "This stuff can't be cryptic or hidden for no good
// reason. Keep the tracking switch and make it point to how many the person
// has on hand and that way it at least tracks their usage of it and tells
// them at a specific point when they are getting low. The count should
// always be asked when the new supplement is saved."
//
// The count is taken once and drawn down by the doses marked taken; the
// arithmetic and every sentence are in lib/medSupply.ts, and the reminder
// before it runs out comes from lib/reminderSources.ts.
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppTextInput } from './AppTextInput';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { saveTreatmentSupply, type TreatmentDetails } from '../lib/medDetailsDb';
import type { SupplyReading } from '../lib/medSupply';
import { parseDoseAmount } from '../lib/doseAmount';
import { t } from '../lib/i18n';

type Props = {
  treatmentId: string;
  details: TreatmentDetails | undefined;
  reading: SupplyReading | undefined;
  /** What one is called, used when nothing has been counted yet (capsule, tablet). */
  defaultUnit?: string | null;
  tabColor: string;
  /** "Not now" after a new one is saved; "Cancel" everywhere else. */
  cancelLabel?: string;
  onDone: (saved: boolean) => void;
  onProblem: (title: string, message: string) => void;
};

function numberText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

export function SupplyCountForm({ treatmentId, details, reading, defaultUnit, tabColor, cancelLabel = 'Cancel', onDone, onProblem }: Props) {
  const styles = makeStyles(tabColor);
  const [onHand, setOnHand] = useState('');
  const [unit, setUnit] = useState('');
  const [perDose, setPerDose] = useState('1');
  const [leadDays, setLeadDays] = useState('7');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOnHand(reading?.remaining !== null && reading?.remaining !== undefined ? numberText(reading.remaining) : '');
    setUnit(details?.supplyUnit ?? defaultUnit ?? '');
    setPerDose(numberText(details?.supplyPerDose ?? 1));
    setLeadDays(numberText(details?.refillLeadDays ?? 7));
  }, [details, reading, defaultUnit]);

  async function save(clear = false) {
    const count = clear ? null : parseDoseAmount(onHand);
    const each = parseDoseAmount(perDose);
    const lead = parseDoseAmount(leadDays);
    if (Number.isNaN(count) || Number.isNaN(each) || Number.isNaN(lead)) {
      onProblem('Almost there', 'Use numbers for how many you have, how many one dose uses, and the days ahead.');
      return;
    }
    if (!clear && count === null) {
      onProblem('Almost there', t('Type how many you have right now, or tap {button}.', { button: t(cancelLabel) }));
      return;
    }
    setSaving(true);
    try {
      await saveTreatmentSupply(treatmentId, {
        onHand: count,
        unit: unit.trim() || null,
        perDose: each && each > 0 ? each : 1,
        leadDays: lead ?? 7,
      });
      onDone(true);
    } catch (error) {
      onProblem('Could not save', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.label}>How many do you have right now</Text>
      <View style={styles.inlineRow}>
        <AppTextInput
          style={[styles.input, styles.numberInput]}
          keyboardType="decimal-pad"
          value={onHand}
          onChangeText={setOnHand}
          placeholder="30"
        />
        <AppTextInput
          style={[styles.input, styles.flexInput]}
          value={unit}
          onChangeText={setUnit}
          placeholder="tablets, capsules, ml"
        />
      </View>
      <Text style={styles.label}>How many one dose uses</Text>
      <AppTextInput style={[styles.input, styles.numberInput]} keyboardType="decimal-pad" value={perDose} onChangeText={setPerDose} />
      <Text style={styles.label}>Tell me when this many days are left</Text>
      <AppTextInput style={[styles.input, styles.numberInput]} keyboardType="number-pad" value={leadDays} onChangeText={setLeadDays} />
      <Text style={styles.caption}>
        Each dose you mark taken comes off the count, and a reminder comes that many days before they run out.
      </Text>
      <View style={styles.actions}>
        {details?.supplyCountedAt ? (
          <TouchableOpacity style={styles.secondaryButton} disabled={saving} onPress={() => save(true)}>
            <Text style={styles.secondaryButtonText}>Stop counting</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.secondaryButton} disabled={saving} onPress={() => onDone(false)}>
          <Text style={styles.secondaryButtonText}>{cancelLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} disabled={saving} onPress={() => save()}>
          <Text style={styles.primaryButtonText}>Save the count</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(tabColor: string) {
  return StyleSheet.create({
    actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10, marginTop: 12 },
    caption: { ...typography.caption, color: tabColor, marginTop: 8, ...textShadow },
    flexInput: { flex: 1 },
    form: { gap: 2 },
    inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      ...typography.body,
      color: tabColor,
      ...textShadow,
    },
    label: { ...typography.label, color: tabColor, marginBottom: 6, marginTop: 10, ...textShadow },
    numberInput: { width: 88 },
    primaryButton: { ...BUTTON_PRIMARY },
    primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
    secondaryButton: { ...BUTTON_SECONDARY },
    secondaryButtonText: { ...BUTTON_SECONDARY_TEXT },
  });
}
