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
//
// A bottle shared with a partner (lib/sharedSupply.ts): with a partner
// connected, the form offers "Shared with" them. Once shared, the count is
// the whole bottle, both people's doses come off it, and the amount one dose
// uses is this person's share of a tablet (half a tablet is 0.5).
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppTextInput } from './AppTextInput';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import {
  BUTTON_PRIMARY,
  BUTTON_PRIMARY_TEXT,
  BUTTON_SECONDARY,
  BUTTON_SECONDARY_TEXT,
  PILL,
  PILL_ON,
  PILL_ON_TEXT,
  PILL_TEXT,
} from '../constants/buttons';
import { saveTreatmentSupply, type TreatmentDetails } from '../lib/medDetailsDb';
import type { SupplyReading } from '../lib/medSupply';
import { parseDoseAmount } from '../lib/doseAmount';
import { t } from '../lib/i18n';
import {
  bottleForTreatment,
  getSharingPartner,
  saveBottleCount,
  shareBottle,
  stopSharingBottle,
  type SharedBottleRow,
} from '../lib/sharedSupplyDb';

type Props = {
  treatmentId: string;
  /** The med's name, which a shared bottle carries to the partner's phone. */
  name?: string;
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

export function SupplyCountForm({ treatmentId, name, details, reading, defaultUnit, tabColor, cancelLabel = 'Cancel', onDone, onProblem }: Props) {
  const styles = makeStyles(tabColor);
  const [onHand, setOnHand] = useState('');
  const [unit, setUnit] = useState('');
  const [perDose, setPerDose] = useState('1');
  const [leadDays, setLeadDays] = useState('7');
  const [saving, setSaving] = useState(false);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [bottle, setBottle] = useState<SharedBottleRow | null>(null);
  const [share, setShare] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [partner, found] = await Promise.all([getSharingPartner(), bottleForTreatment(treatmentId).catch(() => null)]);
      if (!live) return;
      setPartnerName(partner?.name ?? null);
      setBottle(found);
      if (found) {
        if (found.unit) setUnit(found.unit);
        setLeadDays(numberText(found.leadDays));
      }
    })();
    return () => {
      live = false;
    };
  }, [treatmentId]);

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
      onProblem('Almost there', 'Use numbers for how many you have, how many you take each time, and the days ahead.');
      return;
    }
    if (!clear && count === null) {
      onProblem('Almost there', t('Type how many you have right now, or tap {button}.', { button: t(cancelLabel) }));
      return;
    }
    setSaving(true);
    try {
      const counted = { unit: unit.trim() || null, leadDays: lead ?? 7 };
      await saveTreatmentSupply(treatmentId, {
        onHand: count,
        unit: counted.unit,
        perDose: each && each > 0 ? each : 1,
        leadDays: counted.leadDays,
      });
      if (count !== null) {
        if (bottle) await saveBottleCount(bottle.id, { onHand: count, ...counted });
        else if (share && partnerName) await shareBottle(treatmentId, name?.trim() || counted.unit || 'Shared bottle', { onHand: count, ...counted });
      }
      onDone(true);
    } catch (error) {
      onProblem('Could not save', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function stopSharing() {
    if (!bottle) return;
    setSaving(true);
    try {
      await stopSharingBottle(bottle.id);
      onDone(true);
    } catch (error) {
      onProblem('Could not save', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  const shared = bottle !== null || share;
  // The amount for one dose is easy to read as the whole count (150 typed in
  // both boxes once gave "About 2 days left"), so the label names the unit
  // typed above it, and a dose as large as everything on hand is pointed out
  // while it is being typed.
  const typedUnit = unit.trim();
  const eachLabel = typedUnit
    ? shared
      ? t('How many {unit} you take each time (your dose only)', { unit: typedUnit })
      : t('How many {unit} you take each time', { unit: typedUnit })
    : shared
      ? 'How many you take each time (your dose only)'
      : 'How many you take each time';
  const countNow = parseDoseAmount(onHand);
  const eachNow = parseDoseAmount(perDose);
  const wholeCount =
    typeof countNow === 'number' && typeof eachNow === 'number' && !Number.isNaN(countNow) && !Number.isNaN(eachNow) && countNow > 1 && eachNow >= countNow;

  return (
    <View style={styles.form}>
      {bottle ? (
        <Text style={styles.caption}>
          {partnerName
            ? t('Shared with {name}. This count is the whole bottle, and both of your doses come off it.', { name: partnerName })
            : 'Shared with your partner. This count is the whole bottle, and both of your doses come off it.'}
        </Text>
      ) : partnerName ? (
        <View style={styles.inlineRow}>
          <TouchableOpacity style={[styles.pill, share && styles.pillOn]} onPress={() => setShare(!share)}>
            <Text style={share ? styles.pillOnText : styles.pillText}>{t('Shared with {name}', { name: partnerName })}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {share && !bottle && partnerName ? (
        <Text style={styles.caption}>
          {t('{name} is asked which of their meds takes from it. Then the count goes down by both of your doses.', { name: partnerName })}
        </Text>
      ) : null}
      <Text style={styles.label}>How many you have now, and what they are</Text>
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
      <Text style={styles.label}>{eachLabel}</Text>
      <AppTextInput style={[styles.input, styles.numberInput]} keyboardType="decimal-pad" value={perDose} onChangeText={setPerDose} />
      <Text style={styles.caption}>
        {wholeCount
          ? t('One dose would use all {count} you have. Put how many you take each time, such as 1 or 2.', { count: onHand.trim() })
          : 'One dose, not the whole bottle. Half a tablet is 0.5.'}
      </Text>
      <Text style={styles.label}>Remind me when this many days are left</Text>
      <AppTextInput style={[styles.input, styles.numberInput]} keyboardType="number-pad" value={leadDays} onChangeText={setLeadDays} />
      <Text style={styles.caption}>
        Each dose you mark taken comes off the count by itself, and the reminder to get more comes when that many days are left.
      </Text>
      <View style={styles.actions}>
        {bottle ? (
          <TouchableOpacity style={styles.secondaryButton} disabled={saving} onPress={() => void stopSharing()}>
            <Text style={styles.secondaryButtonText}>Stop sharing</Text>
          </TouchableOpacity>
        ) : details?.supplyCountedAt ? (
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
    pill: { ...PILL, marginTop: 8 },
    pillOn: { ...PILL_ON },
    pillOnText: { ...PILL_ON_TEXT },
    pillText: { ...PILL_TEXT },
    primaryButton: { ...BUTTON_PRIMARY },
    primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
    secondaryButton: { ...BUTTON_SECONDARY },
    secondaryButtonText: { ...BUTTON_SECONDARY_TEXT },
  });
}
