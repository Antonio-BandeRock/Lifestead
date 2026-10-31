// Interests > Money > Could This Pay? (2026-10-30, Interests stage 5c): a
// worksheet for one interest or several together. It opens with what the
// records already hold (what went out, what came in, the hours on Sessions),
// then takes the person's own numbers for a month of selling and works them
// out, with every number used listed in words beside the result and what the
// sums cannot say at the end.
//
// It never says whether to start, carry on or stop, and gives no tax or
// legal advice. Every sentence is in lib/couldThisPay.ts, checked by
// scripts/test_could_this_pay.js.

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import {
  BUTTON_PRIMARY_COMPACT,
  BUTTON_PRIMARY_TEXT,
  BUTTON_SECONDARY_COMPACT,
  BUTTON_SECONDARY_TEXT,
  PILL,
  PILL_ON,
  PILL_ON_TEXT,
  PILL_TEXT,
} from '../constants/buttons';
import {
  describePayRecords,
  gatherPayRecords,
  missingForPay,
  PAY_FIELD_LABELS,
  PAY_FIELD_PLACEHOLDERS,
  payFieldKind,
  unreadablePayField,
  workOutPay,
  type PayField,
  type PayResult,
  type PayWords,
} from '../lib/couldThisPay';
import { getPayWorksheet, lastPayWorksheetInterests, savePayWorksheet } from '../lib/couldThisPayDb';
import { groupInterests, type Interest } from '../lib/interests';
import { listInterests } from '../lib/interestsDb';
import type { MoneyEntry } from '../lib/interestMoney';
import { listInterestMoney } from '../lib/interestMoneyDb';
import type { InterestSession } from '../lib/interestSessions';
import { listInterestSessions } from '../lib/interestSessionsDb';
import type { InterestThing } from '../lib/interestThings';
import { listInterestThings } from '../lib/interestThingsDb';
import { explainNotYet } from '../lib/notYet';
import { AppTextInput } from './AppTextInput';
import { useWalkMark } from './WalkMark';

type Props = { tabColor: string };

const PAY_GROUPS: { heading: string; fields: PayField[] }[] = [
  { heading: 'One sale', fields: ['price', 'perMonth', 'materialsEach', 'minutesEach', 'feePercent'] },
  { heading: 'Each month', fields: ['overheadMonth', 'runningMinutesMonth', 'taxPercent', 'wantMonth'] },
  { heading: 'Before starting', fields: ['startingCosts', 'livingMonth', 'slowMonths'] },
];

export function CouldThisPaySection({ tabColor }: Props) {
  const [open, setOpen] = useState(false);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [entries, setEntries] = useState<MoneyEntry[]>([]);
  const [things, setThings] = useState<InterestThing[]>([]);
  const [sessions, setSessions] = useState<InterestSession[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [words, setWords] = useState<PayWords>({});
  const [result, setResult] = useState<PayResult | null>(null);

  const load = useCallback(async () => {
    const all = await listInterests();
    setInterests(all);
    setEntries(await listInterestMoney());
    setThings(await listInterestThings());
    setSessions(await listInterestSessions());
    const last = (await lastPayWorksheetInterests()).filter((id) => all.some((interest) => interest.id === id));
    setChosen((was) => (was.length > 0 ? was : last));
    if (last.length > 0) {
      const kept = await getPayWorksheet(last);
      setWords((was) => (Object.keys(was).length > 0 ? was : kept));
      setResult((was) => was ?? workOutPay(kept));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const walkMark = useWalkMark();
  const { current } = groupInterests(interests);
  // A stepped-back interest stays pickable once it is on a worksheet.
  const pickable = [...current, ...interests.filter((interest) => interest.retiredAt && chosen.includes(interest.id))];
  const recordLines = chosen.length > 0 ? describePayRecords(gatherPayRecords(chosen, entries, things, sessions)) : [];

  async function toggleInterest(id: string) {
    const next = chosen.includes(id) ? chosen.filter((other) => other !== id) : [...chosen, id];
    setChosen(next);
    setResult(null);
    if (next.length > 0) {
      const kept = await getPayWorksheet(next);
      if (Object.keys(kept).length > 0) {
        setWords(kept);
        setResult(workOutPay(kept));
      }
    }
  }

  function startWorksheet() {
    if (current.length === 0 && chosen.length === 0) {
      explainNotYet('A worksheet works from one interest or several. Add one on My Interests first, then come back here.');
      return;
    }
    setOpen(true);
  }

  async function workItOut() {
    if (chosen.length === 0) {
      explainNotYet('Pick the interest, or interests, this is for first.');
      return;
    }
    const unreadable = unreadablePayField(words);
    if (unreadable) {
      explainNotYet(unreadable);
      return;
    }
    const missing = missingForPay(words);
    if (missing) {
      explainNotYet(missing);
      return;
    }
    await savePayWorksheet(chosen, words);
    setResult(workOutPay(words));
  }

  function renderPayField(field: PayField) {
    const kind = payFieldKind(field);
    return (
      <View key={field} style={styles.field}>
        <Text style={styles.captionText}>{PAY_FIELD_LABELS[field]}</Text>
        <AppTextInput
          style={styles.textInput}
          value={words[field] ?? ''}
          onChangeText={(text) => {
            setWords({ ...words, [field]: text });
            setResult(null);
          }}
          placeholder={PAY_FIELD_PLACEHOLDERS[field]}
          keyboardType={kind === 'minutes' ? 'default' : 'decimal-pad'}
        />
      </View>
    );
  }

  function renderPayResult(worked: PayResult) {
    return (
      <View ref={walkMark.ref('pay.result')} style={[styles.result, { borderLeftColor: tabColor }]}>
        <Text style={styles.groupHeading}>Worked out</Text>
        {worked.lines.map((line) => (
          <Text key={line} style={styles.bodyText}>
            {line}
          </Text>
        ))}
        <Text style={styles.setHeading}>The numbers used</Text>
        {worked.assumptions.map((line) => (
          <Text key={line} style={styles.captionText}>
            {line}
          </Text>
        ))}
        <Text style={styles.setHeading}>What these sums cannot say</Text>
        {worked.limits.map((line) => (
          <Text key={line} style={styles.captionText}>
            {line}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.captionText}>
        Sums for an interest, or several together, if you are wondering about selling from it: what comes in a month, what is left after costs and a tax set-aside, what that is an hour, and what to have put by before starting. Every number used is listed beside the result.
      </Text>
      {!open ? (
        <TouchableOpacity ref={walkMark.ref('pay.open')} style={styles.secondaryButton} onPress={startWorksheet}>
          <Text style={styles.secondaryButtonText}>Open the Worksheet</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.section}>
          <Text style={styles.setHeading}>Which interests</Text>
          <View ref={walkMark.ref('pay.interests')} style={styles.pillRow}>
            {pickable.map((interest) => {
              const on = chosen.includes(interest.id);
              return (
                <TouchableOpacity
                  key={interest.id}
                  style={[styles.pill, on && styles.pillActive]}
                  onPress={() => toggleInterest(interest.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.pillText, on ? styles.pillTextOn : null]}>{interest.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {chosen.length > 0 ? (
            <View style={styles.group}>
              <Text style={styles.setHeading}>What your records hold</Text>
              {recordLines.length > 0 ? (
                recordLines.map((line) => (
                  <Text key={line} style={styles.captionText}>
                    {line}
                  </Text>
                ))
              ) : (
                <Text style={styles.captionText}>Nothing is kept on Money, Sessions or supplies for these yet, so the worksheet works from your numbers alone.</Text>
              )}
            </View>
          ) : null}
          {PAY_GROUPS.map((group) => (
            <View key={group.heading} style={styles.group}>
              <Text style={styles.setHeading}>{group.heading}</Text>
              {group.fields.map(renderPayField)}
            </View>
          ))}
          <Text style={styles.captionText}>Anything left empty is counted as nothing, and the result says so.</Text>
          <TouchableOpacity ref={walkMark.ref('pay.work')} style={styles.primaryButton} onPress={workItOut}>
            <Text style={styles.primaryButtonText}>Work It Out</Text>
          </TouchableOpacity>
          {result ? renderPayResult(result) : null}
          <TouchableOpacity onPress={() => setOpen(false)}>
            <Text style={styles.linkText}>Close the Worksheet</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  group: { gap: 8 },
  field: { gap: 4 },
  result: { gap: 8, paddingLeft: 8, borderLeftWidth: 2 },
  groupHeading: { ...typography.label, color: colors.textPrimary, ...textShadow },
  setHeading: { ...typography.caption, color: colors.textPrimary, ...textShadow },
  bodyText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  captionText: { ...typography.caption, color: colors.textMuted, ...textShadow },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { ...PILL },
  pillActive: { ...PILL_ON },
  pillText: { ...PILL_TEXT },
  pillTextOn: { ...PILL_ON_TEXT },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
  },
  primaryButton: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
  secondaryButton: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  secondaryButtonText: { ...BUTTON_SECONDARY_TEXT },
  linkText: { ...typography.body, color: colors.primary, ...textShadow },
});
