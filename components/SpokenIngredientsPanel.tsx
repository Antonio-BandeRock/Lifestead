// Say Several Ingredients, the source every Food builder offers beside Say a
// Food Name (voice step 4, 1.0.66.22). The person says or types the whole
// list ("two carrots, a cup of spinach and half an avocado"), sees what each
// part matched with its amount, swaps or removes any of them, and then the
// builder takes them one at a time through its pending card, where cut and
// cooking method are asked as usual. The matching lives in
// lib/spokenIngredients.ts; the queue in hooks/useSpokenIngredientQueue.ts.
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { explainNotYet } from '../lib/notYet';
import {
  findSpokenIngredients,
  nextCandidate,
  resolveSpokenRow,
  type SpokenIngredient,
  type SpokenIngredientRow,
} from '../lib/spokenIngredients';
import { AppTextInput } from './AppTextInput';
import { PopoverSelect } from './PopoverSelect';
import { useTabBandStyles } from './TabBand';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY, BUTTON_SECONDARY_TEXT } from '../constants/buttons';

function amountText(row: { quantity: number; unit: string }): string {
  const amount = Number.isInteger(row.quantity) ? String(row.quantity) : String(Math.round(row.quantity * 100) / 100);
  return row.unit === 'piece' ? amount : `${amount} ${row.unit}`;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function SpokenIngredientsPanel({
  tabColor,
  allowedCategories,
  onReady,
}: {
  tabColor: string;
  allowedCategories?: string[];
  onReady: (list: SpokenIngredient[]) => void;
}) {
  const band = useTabBandStyles(tabColor);
  const [text, setText] = useState('');
  const [rows, setRows] = useState<SpokenIngredientRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function find(spoken: string) {
    if (!spoken.trim()) {
      explainNotYet('Say or type the ingredients first, for example "two carrots, a cup of spinach and half an avocado".');
      return;
    }
    setBusy(true);
    try {
      setRows(await findSpokenIngredients(spoken, allowedCategories));
    } finally {
      setBusy(false);
    }
  }

  async function swap(key: string) {
    const row = rows?.find((item) => item.key === key);
    if (!row) return;
    const next = await nextCandidate(row);
    setRows((current) => current?.map((item) => (item.key === key ? next : item)) ?? null);
  }

  function remove(key: string) {
    setRows((current) => current?.filter((item) => item.key !== key) ?? null);
  }

  function pickPrep(key: string, prep: string) {
    setRows((current) => current?.map((item) => (item.key === key ? { ...item, prep } : item)) ?? null);
  }

  const matched = (rows ?? []).filter((row) => row.candidates.length > 0);

  async function addThese() {
    if (matched.length === 0) {
      explainNotYet(
        rows == null
          ? 'Say or type the ingredients, then press Find These.'
          : 'Nothing said has matched a food here yet. Try saying it another way, then press Find These.',
      );
      return;
    }
    const unprepared = matched.filter((row) => row.preps.length > 0 && !row.prep);
    if (unprepared.length > 0) {
      const names = unprepared.map((row) => row.candidates[row.candidateIndex].baseName);
      explainNotYet(`Pick how ${joinNames(names)} ${names.length === 1 ? 'is' : 'are'} prepared first.`);
      return;
    }
    setBusy(true);
    try {
      const list: SpokenIngredient[] = [];
      const failed: string[] = [];
      for (const row of matched) {
        const item = await resolveSpokenRow(row);
        if (item) list.push(item);
        else failed.push(row.candidates[row.candidateIndex].baseName);
      }
      if (failed.length > 0) {
        explainNotYet(`${joinNames(failed)} could not be found as prepared that way. Pick another preparation or remove it.`);
        return;
      }
      onReady(list);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[band.column, styles.content]}>
      <View style={band.box}>
        <Text style={styles.title}>Say Several Ingredients</Text>
        <Text style={styles.body}>
          Say each one with its amount. Each match is shown here first, and then they come one at a time so you can choose
          the cut and how it is cooked.
        </Text>
        <AppTextInput
          onVoiceResult={(spoken, isFinal) => {
            setText(spoken);
            if (isFinal) void find(spoken);
          }}
          micColor={tabColor}
          style={styles.input}
          multiline
          placeholder="Two carrots, a cup of spinach and half an avocado"
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => void find(text)}>
          <Text style={styles.secondaryButtonText}>Find These</Text>
        </TouchableOpacity>
      </View>

      {busy ? (
        <View style={band.boxMuted}>
          <ActivityIndicator color={tabColor} />
        </View>
      ) : null}

      {rows != null ? (
        <View style={band.box}>
          <Text style={styles.title}>What Was Heard</Text>
          {rows.length === 0 ? <Text style={styles.body}>Nothing was heard as an ingredient.</Text> : null}
          <View style={band.rows}>
            {rows.map((row) => {
              const match = row.candidates[row.candidateIndex];
              return (
                <View key={row.key} style={band.row}>
                  <Text style={styles.caption}>“{row.spokenText}”</Text>
                  {match ? (
                    <>
                      <Text style={styles.body}>
                        {match.baseName}, {amountText(row)}
                      </Text>
                      {row.preps.length > 1 ? (
                        <PopoverSelect
                          options={row.preps}
                          selected={row.prep}
                          onSelect={(value) => pickPrep(row.key, value)}
                          tabColor={tabColor}
                          placeholder="How it is prepared"
                        />
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.body}>Nothing here matched it. Remove it, or add it on its own afterwards.</Text>
                  )}
                  <View style={styles.rowButtons}>
                    {row.candidates.length > 1 ? (
                      <TouchableOpacity style={styles.smallButton} onPress={() => void swap(row.key)}>
                        <Text style={[styles.smallButtonText, { color: tabColor }]}>Not This One</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity style={styles.smallButton} onPress={() => remove(row.key)}>
                      <Text style={[styles.smallButtonText, { color: tabColor }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={() => void addThese()}>
            <Text style={styles.primaryButtonText}>
              {matched.length > 0 ? `Add These One at a Time (${matched.length})` : 'Add These One at a Time'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 280 },
  title: { ...typography.sectionTitle, color: colors.textPrimary, marginBottom: 6, ...textShadow },
  body: { ...typography.body, color: colors.textPrimary, marginBottom: 6, ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, marginBottom: 4, ...textShadow },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceMuted,
    ...typography.body,
    color: colors.textPrimary,
    ...textShadow,
    minHeight: 72,
  },
  secondaryButton: { ...BUTTON_SECONDARY, marginTop: 12 },
  secondaryButtonText: { ...BUTTON_SECONDARY_TEXT },
  rowButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  smallButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  smallButtonText: { ...typography.body, ...textShadow },
  primaryButton: { ...BUTTON_PRIMARY, marginTop: 14 },
  primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
});

// The line on a builder's pending card while spoken foods are waiting, with a
// way to stop taking the rest.
export function SpokenQueueNote({
  remaining,
  tabColor,
  onStop,
}: {
  remaining: number;
  tabColor: string;
  onStop: () => void;
}) {
  return (
    <View style={noteStyles.row}>
      <Text style={noteStyles.text}>
        {remaining === 0
          ? 'The last one from what you said.'
          : `${remaining} more from what you said after this one.`}
      </Text>
      {remaining > 0 ? (
        <TouchableOpacity onPress={onStop} style={noteStyles.button}>
          <Text style={[noteStyles.buttonText, { color: tabColor }]}>Stop After This</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const noteStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  text: { ...typography.caption, color: colors.textSecondary, flexShrink: 1, ...textShadow },
  button: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
  },
  buttonText: { ...typography.caption, ...textShadow },
});
